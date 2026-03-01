const express = require('express');
const cors = require('cors');
require('dotenv').config();

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const queryRoutes = require('./routes/queryRoutes');
const updateRoutes = require('./routes/updateRoutes');

const app = express();

app.use(cors());
app.use(express.json());

/* Swagger Setup */
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MongoDB NLI API",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api/query', queryRoutes);
app.use('/api/update', updateRoutes);

module.exports = app;