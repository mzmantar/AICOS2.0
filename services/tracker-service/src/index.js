require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const winston = require('winston');
const Progress = require('./models/Progress');

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

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AICOS Tracker API',
      version: '1.0.0',
      description: 'API du service de suivi des progrès AICOS'
    },
    servers: [
      {
        url: `http://localhost:${process.env.TRACKER_SERVICE_PORT || 4003}`,
        description: 'Serveur de développement'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Configuration du rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par fenêtre
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(limiter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicos')
  .then(() => logger.info('Connecté à MongoDB'))
  .catch(err => logger.error('Erreur de connexion à MongoDB:', err));

/**
 * @swagger
 * /api/progress/{userId}:
 *   get:
 *     summary: Récupérer la progression d'un utilisateur
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des progressions
 *       404:
 *         description: Utilisateur non trouvé
 */
app.get('/api/progress/:userId', async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.params.userId });
    res.json(progress);
  } catch (error) {
    logger.error('Erreur lors de la récupération de la progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/progress/{userId}/course/{courseId}:
 *   get:
 *     summary: Récupérer la progression d'un cours spécifique
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression du cours
 *       404:
 *         description: Progression non trouvée
 */
app.get('/api/progress/:userId/course/:courseId', async (req, res) => {
  try {
    const progress = await Progress.findOne({
      userId: req.params.userId,
      courseId: req.params.courseId
    });

    if (!progress) {
      return res.status(404).json({ error: 'Progression non trouvée' });
    }

    res.json(progress);
  } catch (error) {
    logger.error('Erreur lors de la récupération de la progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/progress:
 *   post:
 *     summary: Mettre à jour la progression
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               lessonId:
 *                 type: string
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Progression mise à jour
 *       400:
 *         description: Données invalides
 */
app.post('/api/progress', async (req, res) => {
  try {
    const { userId, courseId, lessonId, completed } = req.body;

    let progress = await Progress.findOne({ userId, courseId });

    if (!progress) {
      progress = new Progress({
        userId,
        courseId,
        currentLesson: lessonId
      });
    }

    if (completed) {
      progress.completedLessons.push({
        lessonId,
        completedAt: new Date()
      });
    }

    progress.currentLesson = lessonId;
    progress.lastAccessed = new Date();

    await progress.calculateProgress();
    res.json(progress);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la progression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

const PORT = process.env.TRACKER_SERVICE_PORT || 4003;
app.listen(PORT, () => {
  logger.info(`Service de suivi démarré sur le port ${PORT}`);
  logger.info(`Documentation Swagger disponible sur http://localhost:${PORT}/api-docs`);
}); 