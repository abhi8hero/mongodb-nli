const mongoose = require("mongoose");

exports.executeMongoQuery = async (mongoQuery) => {
    const {
        collection,
        operation = "find",
        filter = {},
        sort = {},
        projection = {},
        limit = null,
        data = {},
        multi = false // optional flag from AI
    } = mongoQuery;

    const db = mongoose.connection.db;

    if (!collection) {
        throw new Error("Collection name required");
    }

    // ==========================
    // FIND
    // ==========================
    if (operation === "find") {
        let query = db.collection(collection).find(filter);

        if (projection && Object.keys(projection).length > 0) {
            query = query.project(projection);
        }

        if (sort && Object.keys(sort).length > 0) {
            query = query.sort(sort);
        }

        if (limit && Number.isInteger(limit) && limit > 0) {
            query = query.limit(limit);
        }

        return await query.toArray();
    }

    // ==========================
    // COUNT
    // ==========================
    if (operation === "count") {
        return await db.collection(collection).countDocuments(filter);
    }

    // ==========================
    // INSERT (Single + Many)
    // ==========================
    if (operation === "insert") {

        if (!data || 
            (Array.isArray(data) && data.length === 0) ||
            (!Array.isArray(data) && Object.keys(data).length === 0)
        ) {
            throw new Error("Insert requires data");
        }

        // MULTIPLE INSERT
        if (Array.isArray(data)) {
            const result = await db.collection(collection).insertMany(data);

            return {
                message: "Multiple documents inserted",
                insertedCount: result.insertedCount,
                insertedIds: result.insertedIds
            };
        }

        // SINGLE INSERT
        const result = await db.collection(collection).insertOne(data);

        return {
            message: "Inserted",
            insertedId: result.insertedId
        };
    }

    // ==========================
    // UPDATE (One + Many)
    // ==========================
    if (operation === "update") {

        if (!filter || Object.keys(filter).length === 0) {
            throw new Error("Unsafe update: empty filter not allowed");
        }

        if (!data || Object.keys(data).length === 0) {
            throw new Error("Update requires data");
        }

        let updateDoc = data;

        // Wrap in $set if no operator present
        const hasOperator = Object.keys(updateDoc).some(key => key.startsWith("$"));
        if (!hasOperator) {
            updateDoc = { $set: updateDoc };
        }

        // MULTI UPDATE
        if (multi === true) {
            const result = await db.collection(collection)
                .updateMany(filter, updateDoc);

            return {
                message: "Multiple documents updated",
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            };
        }

        // SINGLE UPDATE
        const result = await db.collection(collection)
            .updateOne(filter, updateDoc);

        return {
            message: "Updated",
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        };
    }

    // ==========================
    // DELETE (One + Many)
    // ==========================
    if (operation === "delete") {

        if (!filter || Object.keys(filter).length === 0) {
            throw new Error("Unsafe delete: empty filter not allowed");
        }

        // MULTI DELETE
        if (multi === true) {
            const result = await db.collection(collection)
                .deleteMany(filter);

            return {
                message: "Multiple documents deleted",
                deletedCount: result.deletedCount
            };
        }

        // SINGLE DELETE
        const result = await db.collection(collection)
            .deleteOne(filter);

        return {
            message: "Deleted",
            deletedCount: result.deletedCount
        };
    }

    throw new Error("Unsupported operation");
};