const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const port = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Estatehub API',
      version: '1.0.0',
      description: 'API documentation for the Estatehub platform.',
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_URL || `http://localhost:${port}/api`,
        description: 'Current environment',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../controllers/**/*.js'),
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../app.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

