const express = require('express');
const router = express.Router();
const { handleQuery } = require('../controllers/queryController');

/**
 * @swagger
 * /api/query:
 *   post:
 *     summary: Process Natural Language Query
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully processed query
 */

router.post('/', handleQuery);

module.exports = router;