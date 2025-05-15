require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const winston = require('winston');
const path = require('path');

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

// Configuration Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Configuration Swagger
const swaggerDocs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AICOS Chatbot API',
      version: '1.0.0',
      description: 'API du service de chatbot AICOS utilisant Gemini'
    },
    servers: [{
      url: `http://localhost:${process.env.CHATBOT_SERVICE_PORT || 4001}`,
      description: 'Serveur de développement'
    }]
  },
  apis: ['./src/routes/*.js']
});

// Configuration du rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Système de chat avec historique
const chatSessions = new Map();

// Utilitaires
const createSystemPrompt = (context, history) => 
  `Vous êtes AICOS, un assistant éducatif intelligent. Votre rôle est d'aider les étudiants à comprendre leurs cours et à répondre à leurs questions de manière pédagogique.
  Contexte actuel: ${JSON.stringify(context)}
  Historique de la conversation: ${JSON.stringify(history)}`;

const updateSessionHistory = (session, message, response) => {
  session.history.push(
    { role: "user", content: message },
    { role: "assistant", content: response }
  );
  if (session.history.length > 10) {
    session.history = session.history.slice(-10);
  }
};

// Configuration de l'application
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(limiter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(express.static(path.join(__dirname, 'client')));

// Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Le message est requis' });
    }

    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, {
        history: [],
        context: context || {}
      });
    }

    const session = chatSessions.get(sessionId);
    const result = await model.generateContent([
      createSystemPrompt(session.context, session.history),
      message
    ]);

    const response = result.response.text();
    updateSessionHistory(session, message, response);

    res.json({
      response,
      sessionId,
      context: session.context,
      history: session.history
    });
  } catch (error) {
    logger.error('Erreur lors du traitement de la requête chat:', error);
    res.status(500).json({ error: 'Erreur lors du traitement de la requête' });
  }
});

app.delete('/api/chat/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (chatSessions.has(sessionId)) {
    chatSessions.delete(sessionId);
    res.json({ message: 'Session supprimée avec succès' });
  } else {
    res.status(404).json({ error: 'Session non trouvée' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Démarrage du serveur
const PORT = process.env.CHATBOT_SERVICE_PORT || 4001;
app.listen(PORT, () => {
  logger.info(`Service de chatbot démarré sur le port ${PORT}`);
  logger.info(`Documentation Swagger disponible sur http://localhost:${PORT}/api-docs`);
}); 