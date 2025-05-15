require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { json } = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const winston = require('winston');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

// Configuration du logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Configuration de la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicos');
    logger.info('Connecté à MongoDB');
  } catch (err) {
    logger.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  }
};

// Configuration du serveur Apollo
const createApolloServer = () => new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => ({})
});

// Configuration de l'application Express
const createExpressApp = (apolloServer) => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(morgan('combined'));
  app.use(json());
  
  app.use('/graphql', expressMiddleware(apolloServer));
  app.get('/health', (_, res) => res.status(200).json({ status: 'UP' }));
  
  return app;
};

// Démarrage du serveur
const startServer = async () => {
  await connectDB();
  
  const apolloServer = createApolloServer();
  await apolloServer.start();
  
  const app = createExpressApp(apolloServer);
  const PORT = process.env.COURSE_SERVICE_PORT || 4002;
  
  app.listen(PORT, () => {
    logger.info(`Service de cours démarré sur le port ${PORT}`);
    logger.info(`GraphQL Playground disponible sur http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((error) => {
  logger.error('Erreur lors du démarrage du serveur:', error);
  process.exit(1);
}); 