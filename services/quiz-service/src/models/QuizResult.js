const mongoose = require('mongoose');

const questionResultSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  correct: {
    type: Boolean,
    required: true
  },
  pointsEarned: {
    type: Number,
    required: true,
    min: 0
  },
  correctAnswers: [{
    type: String
  }],
  studentAnswers: [{
    type: String
  }]
});

const quizResultSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    required: true
  },
  questionResults: [questionResultSchema]
}, {
  timestamps: true
});

// Méthode pour convertir en proto QuizResult
quizResultSchema.methods.toProto = function() {
  return {
    quizId: this.quizId.toString(),
    studentId: this.studentId.toString(),
    score: this.score,
    passed: this.passed,
    questionResults: this.questionResults.map(qr => ({
      questionId: qr.questionId.toString(),
      correct: qr.correct,
      pointsEarned: qr.pointsEarned,
      correctAnswers: qr.correctAnswers,
      studentAnswers: qr.studentAnswers
    })),
    submittedAt: this.createdAt.toISOString()
  };
};

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = QuizResult; 