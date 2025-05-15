const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedLessons: [{
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  quizResults: [{
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    submittedAt: Date
  }],
  currentLesson: {
    type: mongoose.Schema.Types.ObjectId
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Méthode pour calculer la progression
progressSchema.methods.calculateProgress = function() {
  const Course = mongoose.model('Course');
  return Course.findById(this.courseId).then(course => {
    if (!course) return 0;

    const totalLessons = course.lessons.length;
    const completedLessons = this.completedLessons.length;
    this.progress = Math.round((completedLessons / totalLessons) * 100);

    // Mettre à jour le statut
    if (this.progress === 0) {
      this.status = 'not_started';
    } else if (this.progress === 100) {
      this.status = 'completed';
    } else {
      this.status = 'in_progress';
    }

    return this.save();
  });
};

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress; 