const { translateToMongoQuery } = require("../services/nlpService");
const mongoService = require("../services/mongoService");
const { simpleParser } = require("../services/simpleOperationService");

/**
 * SIMPLE REGEX PARSER (Hybrid Mode)
 */
function regexParser(input) {
  const text = input.toLowerCase().trim();

  let match;

  // FIND ALL
  match = text.match(/^find all (\w+)/);
  if (match) {
    return {
      operations: [{
        collection: match[1],
        operation: "find",
        filter: {}
      }]
    };
  }

  // INSERT
  match = text.match(/^add (\w+) with (\d+) in (\w+)/);
  if (match) {
    return {
      operations: [{
        collection: match[3],
        operation: "insert",
        data: {
          name: match[1],
          amount: Number(match[2])
        }
      }]
    };
  }

  // DELETE ALL
  match = text.match(/^delete all (\w+)/);
  if (match) {
    return {
      operations: [{
        collection: match[1],
        operation: "delete",
        filter: { _confirmAll: true }, // safe flag
        multi: true
      }]
    };
  }

  return null;
}

/**
 * HYBRID QUERY HANDLER
 */
exports.handleQuery = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        message: "Query must be a non-empty string.",
      });
    }

    // Try SIMPLE parser first
    let translated = simpleParser(query);
    let source = "SIMPLE";

    // If simple fails → try REGEX
    if (!translated) {
      translated = regexParser(query);
      source = "REGEX";
    }

    // If regex fails → AI fallback
    if (!translated) {
      translated = await translateToMongoQuery(query);
      source = "AI";
    }

    // Handle AI errors safely
    if (translated?.error) {
      return res.status(429).json({
        success: false,
        message: translated.message,
        errorType: translated.type
      });
    }

    if (!translated.operations || !Array.isArray(translated.operations)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query structure."
      });
    }

    const results = [];

    // Execute Mongo operations safely
    for (const op of translated.operations) {

      // Safety for delete-all
      if (op.operation === "delete" && op.filter?._confirmAll) {
        op.filter = {};
        op.multi = true;
      }

      const executionResult = await mongoService.executeMongoQuery(op);

      results.push({
        operation: op.operation,
        collection: op.collection,
        result: executionResult
      });
    }

    // Final Response (Clean + Predictable)
    return res.status(200).json({
      success: true,
      source,                 // REGEX or AI
      mongoQuery: translated, // structured query
      operations: results     // execution result
    });

  } catch (error) {
    console.error("Hybrid Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};