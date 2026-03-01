const mongoose = require("mongoose");

exports.saveDocuments = async (req, res) => {
  try {
    const { collection, documents } = req.body;

    if (!collection || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload"
      });
    }

    const db = mongoose.connection.db;

    // Get existing documents
    const existingDocs = await db.collection(collection).find({}).toArray();
    const existingIds = existingDocs.map(doc => doc._id.toString());

    // Collect incoming valid ObjectIds
    const incomingIds = documents
      .filter(doc => doc._id && mongoose.Types.ObjectId.isValid(doc._id))
      .map(doc => doc._id);

    // DELETE removed documents
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

    if (idsToDelete.length > 0) {
      await db.collection(collection).deleteMany({
        _id: { 
          $in: idsToDelete.map(id => new mongoose.Types.ObjectId(id)) 
        }
      });
    }

    // INSERT or UPDATE
    for (const doc of documents) {
      const { _id, ...rest } = doc;

      // Insert new document
      if (!_id || (typeof _id === "string" && _id.startsWith("temp_"))) {
        await db.collection(collection).insertOne(rest);
        continue;
      }

      // Update existing document
      if (mongoose.Types.ObjectId.isValid(_id)) {
        await db.collection(collection).updateOne(
          { _id: new mongoose.Types.ObjectId(_id) },
          { $set: rest }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Database synced successfully"
    });

  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};