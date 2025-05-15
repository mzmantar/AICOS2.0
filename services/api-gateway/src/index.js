require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { json } = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const winston = require("winston");

// Configuration du logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AICOS API Documentation",
      version: "1.0.0",
      description: "Documentation de l'API AICOS",
    },
    servers: [
      {
        url: `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`,
        description: "Serveur de développement",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Configuration des proxies
const services = {
  auth: {
    target: `http://auth-service:${process.env.AUTH_SERVICE_PORT || 50051}`,
    pathRewrite: { "^/api/auth": "" },
  },
  chatbot: {
    target: `http://chatbot-service:${
      process.env.CHATBOT_SERVICE_PORT || 4001
    }`,
    pathRewrite: { "^/api/chatbot": "" },
  },
  course: {
    target: `http://course-service:${process.env.COURSE_SERVICE_PORT || 4002}`,
    pathRewrite: { "^/api/courses": "" },
  },
  quiz: {
    target: `http://quiz-service:${process.env.QUIZ_SERVICE_PORT || 50052}`,
    pathRewrite: { "^/api/quiz": "" },
  },
  tracker: {
    target: `http://tracker-service:${
      process.env.TRACKER_SERVICE_PORT || 4003
    }`,
    pathRewrite: { "^/api/tracker": "" },
  },
};

// Configuration Apollo Server
const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => "Bienvenue sur AICOS API Gateway",
  },
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(morgan("combined"));
  app.use(json());

  // Configuration des proxies
  Object.entries(services).forEach(([service, config]) => {
    app.use(`/api/${service}`, createProxyMiddleware(config));
  });

  // Configuration Apollo Server
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use("/graphql", expressMiddleware(apolloServer));

  // Route de santé
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "UP" });
  });

  const PORT = process.env.API_GATEWAY_PORT || 4000;
  httpServer.listen(PORT, () => {
    logger.info(`API Gateway démarré sur le port ${PORT}`);
    logger.info(
      `Documentation Swagger disponible sur http://localhost:${PORT}/api-docs`
    );
    logger.info(
      `GraphQL Playground disponible sur http://localhost:${PORT}/graphql`
    );
  });
}

startServer().catch((error) => {
  logger.error("Erreur lors du démarrage du serveur:", error);
  process.exit(1);
});
