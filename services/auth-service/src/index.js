require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const winston = require('winston');
const User = require('./models/User');

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

// Configuration gRPC
const PROTO_PATH = path.join(__dirname, 'proto/auth.proto');
const protoDescriptor = grpc.loadPackageDefinition(
  protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
);

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicos')
  .then(() => logger.info('Connecté à MongoDB'))
  .catch(err => logger.error('Erreur de connexion à MongoDB:', err));

// Utilitaires
const generateTokens = (user) => ({
  accessToken: jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  ),
  refreshToken: jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
});

const handleError = (error, callback, message) => {
  logger.error(`${message}:`, error);
  callback({
    code: grpc.status.INTERNAL,
    message
  });
};

// Implémentation des méthodes gRPC
const authServiceImplementation = {
  register: async (call, callback) => {
    try {
      const { email, password, firstName, lastName, role } = call.request;
      
      if (await User.findOne({ email })) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }

      const user = await new User({ email, password, firstName, lastName, role }).save();
      const tokens = generateTokens(user);

      callback(null, {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user.toProto()
      });
    } catch (error) {
      handleError(error, callback, 'Erreur lors de l\'inscription');
    }
  },

  login: async (call, callback) => {
    try {
      const { email, password } = call.request;
      const user = await User.findOne({ email });

      if (!user || !(await user.comparePassword(password))) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const tokens = generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      callback(null, {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user.toProto()
      });
    } catch (error) {
      handleError(error, callback, 'Erreur lors de la connexion');
    }
  },

  validateToken: async (call, callback) => {
    try {
      const { token } = call.request;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      callback(null, {
        valid: !!user,
        user: user?.toProto()
      });
    } catch (error) {
      callback(null, { valid: false });
    }
  },

  refreshToken: async (call, callback) => {
    try {
      const { token } = call.request;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || user.refreshToken !== token) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Token de rafraîchissement invalide'
        });
      }

      const tokens = generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      callback(null, {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user.toProto()
      });
    } catch (error) {
      handleError(error, callback, 'Erreur lors du rafraîchissement du token');
    }
  }
};

// Démarrage du serveur gRPC
const server = new grpc.Server();
server.addService(protoDescriptor.auth.AuthService.service, authServiceImplementation);

const PORT = process.env.AUTH_SERVICE_PORT || 50051;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    logger.error('Erreur lors du démarrage du serveur gRPC:', error);
    process.exit(1);
  }
  server.start();
  logger.info(`Serveur gRPC démarré sur le port ${port}`);
}); 