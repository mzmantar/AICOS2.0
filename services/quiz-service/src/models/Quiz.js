const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'SHORT_ANSWER'],
    required: true
  },
  options: [{
    type: String
  }],
  correctAnswers: [{
    type: String
  }],
  points: {
    type: Number,
    required: true,
    min: 0
  }
});

const quizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number,
    required: true,
    min: 0
  },
  passingScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Méthode pour convertir en proto QuizResponse
quizSchema.methods.toProto = function() {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    title: this.title,
    description: this.description,
    questions: this.questions.map(q => ({
      id: q._id.toString(),
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswers: q.correctAnswers,
      points: q.points
    })),
    timeLimit: this.timeLimit,
    passingScore: this.passingScore,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz; 