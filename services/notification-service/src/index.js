require('dotenv').config();
const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const winston = require('winston');
const sgMail = require('@sendgrid/mail');
const Notification = require('./models/Notification');

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

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configuration Kafka
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicos')
  .then(() => logger.info('Connecté à MongoDB'))
  .catch(err => logger.error('Erreur de connexion à MongoDB:', err));

// Fonction pour envoyer un email
async function sendEmail(to, subject, content) {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text: content,
      html: content
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
}

// Fonction pour traiter les événements Kafka
async function processEvent(topic, message) {
  try {
    const data = JSON.parse(message.value.toString());

    // Créer une notification
    const notification = new Notification({
      userId: data.userId,
      type: data.notificationType || 'email',
      title: data.title,
      content: data.content,
      metadata: data.metadata || {}
    });

    await notification.save();

    // Envoyer la notification selon son type
    if (notification.type === 'email' || notification.type === 'both') {
      const success = await sendEmail(
        data.email,
        notification.title,
        notification.content
      );

      notification.status = success ? 'sent' : 'failed';
      await notification.save();
    }

    // Pour les notifications in-app, elles seront récupérées par l'API
    logger.info(`Notification traitée pour l'utilisateur ${data.userId}`);
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
    await consumer.subscribe({ 
      topics: [
        'user-registered',
        'course-enrolled',
        'quiz-completed',
        'course-completed',
        'certificate-earned'
      ],
      fromBeginning: true 
    });

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
  logger.info('Arrêt du service de notification...');
  await consumer.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});

// Démarrage du service
startConsumer().catch((error) => {
  logger.error('Erreur lors du démarrage du service:', error);
  process.exit(1);
}); 