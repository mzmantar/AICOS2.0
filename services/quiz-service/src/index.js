require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');
const winston = require('winston');
const Quiz = require('./models/Quiz');
const QuizResult = require('./models/QuizResult');

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
  clientId: 'quiz-service',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const producer = kafka.producer();

// Chargement du proto
const PROTO_PATH = path.join(__dirname, 'proto/quiz.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const quizService = protoDescriptor.quiz;

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicos')
  .then(() => logger.info('Connecté à MongoDB'))
  .catch(err => logger.error('Erreur de connexion à MongoDB:', err));

// Implémentation des méthodes gRPC
const quizServiceImplementation = {
  createQuiz: async (call, callback) => {
    try {
      const { courseId, title, description, questions, timeLimit, passingScore } = call.request;

      const quiz = new Quiz({
        courseId,
        title,
        description,
        questions,
        timeLimit,
        passingScore
      });

      await quiz.save();

      // Publier un événement de création de quiz
      await producer.send({
        topic: 'quiz-created',
        messages: [
          { value: JSON.stringify(quiz.toProto()) }
        ]
      });

      callback(null, quiz.toProto());
    } catch (error) {
      logger.error('Erreur lors de la création du quiz:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Erreur lors de la création du quiz'
      });
    }
  },

  getQuiz: async (call, callback) => {
    try {
      const { quizId } = call.request;
      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Quiz non trouvé'
        });
      }

      callback(null, quiz.toProto());
    } catch (error) {
      logger.error('Erreur lors de la récupération du quiz:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Erreur lors de la récupération du quiz'
      });
    }
  },

  submitQuiz: async (call, callback) => {
    try {
      const { quizId, studentId, answers } = call.request;

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Quiz non trouvé'
        });
      }

      // Calculer le score
      let totalPoints = 0;
      let earnedPoints = 0;
      const questionResults = [];

      for (const question of quiz.questions) {
        totalPoints += question.points;
        const answer = answers.find(a => a.questionId === question._id.toString());
        
        if (answer) {
          const isCorrect = JSON.stringify(answer.selectedAnswers.sort()) === 
                          JSON.stringify(question.correctAnswers.sort());
          const pointsEarned = isCorrect ? question.points : 0;
          earnedPoints += pointsEarned;

          questionResults.push({
            questionId: question._id,
            correct: isCorrect,
            pointsEarned,
            correctAnswers: question.correctAnswers,
            studentAnswers: answer.selectedAnswers
          });
        }
      }

      const score = (earnedPoints / totalPoints) * 100;
      const passed = score >= quiz.passingScore;

      const quizResult = new QuizResult({
        quizId,
        studentId,
        score,
        passed,
        questionResults
      });

      await quizResult.save();

      // Publier un événement de soumission de quiz
      await producer.send({
        topic: 'quiz-submitted',
        messages: [
          { value: JSON.stringify(quizResult.toProto()) }
        ]
      });

      callback(null, quizResult.toProto());
    } catch (error) {
      logger.error('Erreur lors de la soumission du quiz:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Erreur lors de la soumission du quiz'
      });
    }
  },

  getQuizResults: async (call, callback) => {
    try {
      const { quizId, studentId } = call.request;
      const query = {};

      if (quizId) query.quizId = quizId;
      if (studentId) query.studentId = studentId;

      const results = await QuizResult.find(query);
      callback(null, {
        results: results.map(result => result.toProto())
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des résultats:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Erreur lors de la récupération des résultats'
      });
    }
  }
};

// Démarrage du serveur gRPC
const server = new grpc.Server();
server.addService(quizService.QuizService.service, quizServiceImplementation);

const PORT = process.env.QUIZ_SERVICE_PORT || 50052;
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), async (error, port) => {
  if (error) {
    logger.error('Erreur lors du démarrage du serveur gRPC:', error);
    process.exit(1);
  }

  // Connexion au producteur Kafka
  await producer.connect();
  logger.info('Connecté à Kafka');

  server.start();
  logger.info(`Serveur gRPC démarré sur le port ${port}`);
}); 