function simpleParser(input) {
  const text = input.toLowerCase().trim();
  let match;

  // ==========================
  // INSERT (add/create)
  // ==========================

  match = text.match(/^add (\w+)(.*)/);

  if (match) {

    const firstValue = match[1];  
    const rest = match[2];

    const collectionMatch = rest.match(/in (\w+)/);

    if (!collectionMatch) {
      return { error: "Please specify collection using 'in <collection>'" };
    }

    const collection = collectionMatch[1];

    const data = { name: firstValue };

    const fieldMatches = [...rest.matchAll(/(\w+)\s+(\w+)/g)];

    fieldMatches.forEach(pair => {
      const key = pair[1];
      const value = pair[2];

      if (key !== "in") {
        data[key] = isNaN(value) ? value : Number(value);
      }
    });

    return {
      operations: [{
        collection,
        operation: "insert",
        data
      }]
    };
  }

  // ==========================
  // DELETE (delete/remove)
  // ==========================

  match = text.match(/^delete (.+)/);

  if (match) {

    const rest = match[1];

    const collectionMatch = rest.match(/in (\w+)/);

    if (!collectionMatch) {
      return { error: "Please specify collection using 'in <collection>'" };
    }

    const collection = collectionMatch[1];

    const names = rest
      .replace(/in \w+/, "")
      .trim()
      .split(" ");

    return {
      operations: [{
        collection,
        operation: "delete",
        filter: { name: { $in: names } }
      }]
    };
  }

  // ==========================
  // UPDATE (update/change)
  // ==========================

  match = text.match(/^update (\w+)(.*)/);

  if (match) {

    const name = match[1];
    const rest = match[2];

    const collectionMatch = rest.match(/in (\w+)/);

    if (!collectionMatch) {
      return { error: "Please specify collection using 'in <collection>'" };
    }

    const collection = collectionMatch[1];

    const updateData = {};

    const fieldMatches = [...rest.matchAll(/(\w+)\s+(\w+)/g)];

    fieldMatches.forEach(pair => {
      const key = pair[1];
      const value = pair[2];

      if (key !== "in") {
        updateData[key] = isNaN(value) ? value : Number(value);
      }
    });

    return {
      operations: [{
        collection,
        operation: "update",
        filter: { name },
        update: updateData
      }]
    };
  }

  return null;
}

module.exports = { simpleParser };