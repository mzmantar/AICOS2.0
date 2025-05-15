require('dotenv').config();
const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const winston = require('winston');
const UserPreference = require('./models/UserPreference');

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

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'recommender-service',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'recommender-group' });

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicos')
  .then(() => logger.info('Connecté à MongoDB'))
  .catch(err => logger.error('Erreur de connexion à MongoDB:', err));

// Fonction pour générer des recommandations
async function generateRecommendations(userId) {
  try {
    const userPreference = await UserPreference.findOne({ userId });
    if (!userPreference) return [];

    // Récupérer les cours disponibles
    const Course = mongoose.model('Course');
    const courses = await Course.find({
      isPublished: true,
      level: userPreference.preferredLevel,
      category: { $in: userPreference.preferredCategories }
    });

    // Calculer le score de recommandation pour chaque cours
    const recommendations = courses.map(course => {
      let score = 0;

      // Score basé sur la catégorie
      if (userPreference.preferredCategories.includes(course.category)) {
        score += 2;
      }

      // Score basé sur le niveau
      if (course.level === userPreference.preferredLevel) {
        score += 2;
      }

      // Score basé sur la durée
      if (course.duration <= userPreference.timeAvailability) {
        score += 1;
      }

      // Score basé sur la note moyenne
      score += course.rating;

      return {
        courseId: course._id,
        score
      };
    });

    // Trier les recommandations par score
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Retourner les 5 meilleures recommandations
  } catch (error) {
    logger.error('Erreur lors de la génération des recommandations:', error);
    return [];
  }
}

// Fonction pour traiter les événements Kafka
async function processEvent(topic, message) {
  try {
    const data = JSON.parse(message.value.toString());

    switch (topic) {
      case 'quiz-submitted':
        const userPreference = await UserPreference.findOne({ userId: data.studentId });
        if (userPreference) {
          await userPreference.updateFromQuizResult(data);
          logger.info(`Préférences mises à jour pour l'utilisateur ${data.studentId} après un quiz`);
        }
        break;

      case 'course-completed':
        const preference = await UserPreference.findOne({ userId: data.studentId });
        if (preference) {
          await preference.updateFromCompletedCourse(data.courseId, data.rating);
          logger.info(`Préférences mises à jour pour l'utilisateur ${data.studentId} après un cours complété`);
        }
        break;

      default:
        logger.warn(`Topic non géré: ${topic}`);
    }
  } catch (error) {
    logger.error(`Erreur lors du traitement de l'événement ${topic}:`, error);
  }
}

// Démarrage du consommateur Kafka
async function startConsumer() {
  try {
    await consumer.connect();
    logger.info('Connecté à Kafka');

    // S'abonner aux topics
    await consumer.subscribe({ topics: ['quiz-submitted', 'course-completed'], fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processEvent(topic, message);
      }
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du consommateur Kafka:', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  logger.info('Arrêt du service de recommandation...');
  await consumer.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});

// Démarrage du service
startConsumer().catch((error) => {
  logger.error('Erreur lors du démarrage du service:', error);
  process.exit(1);
}); 