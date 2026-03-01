const axios = require("axios");

const AI_URL = "http://127.0.0.1:8000/translate";

async function translateToMongoQuery(naturalLanguageQuery) {
  try {
    const response = await axios.post(AI_URL, {
      query: naturalLanguageQuery,
    });

    return response.data;

  } catch (error) {

    if (!error.response) {
      return {
        error: true,
        type: "AI_SERVER_DOWN",
        message: "FastAPI server is not running."
      };
    }

    if (error.response.status === 429) {
      return {
        error: true,
        type: "QUOTA_EXCEEDED",
        message: "AI quota exceeded."
      };
    }

    return {
      error: true,
      type: "AI_ERROR",
      message: "AI service unavailable."
    };
  }
}

module.exports = {
  translateToMongoQuery,
};