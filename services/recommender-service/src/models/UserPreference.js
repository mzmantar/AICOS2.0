const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interests: [{
    type: String,
    trim: true
  }],
  completedCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    completedAt: Date
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
  learningStyle: {
    type: String,
    enum: ['visual', 'auditory', 'reading', 'kinesthetic'],
    default: 'visual'
  },
  preferredCategories: [{
    type: String,
    enum: ['programming', 'mathematics', 'science', 'languages', 'other']
  }],
  preferredLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  timeAvailability: {
    type: Number, // heures par semaine
    min: 0,
    max: 168
  }
}, {
  timestamps: true
});

// Méthode pour mettre à jour les préférences basées sur un quiz
userPreferenceSchema.methods.updateFromQuizResult = async function(quizResult) {
  this.quizResults.push({
    quizId: quizResult.quizId,
    score: quizResult.score,
    submittedAt: quizResult.submittedAt
  });

  // Mettre à jour le niveau préféré basé sur les résultats
  const averageScore = this.quizResults.reduce((acc, curr) => acc + curr.score, 0) / this.quizResults.length;
  if (averageScore >= 80) {
    this.preferredLevel = 'advanced';
  } else if (averageScore >= 60) {
    this.preferredLevel = 'intermediate';
  } else {
    this.preferredLevel = 'beginner';
  }

  await this.save();
};

// Méthode pour mettre à jour les préférences basées sur un cours complété
userPreferenceSchema.methods.updateFromCompletedCourse = async function(courseId, rating) {
  this.completedCourses.push({
    courseId,
    rating,
    completedAt: new Date()
  });

  // Mettre à jour les catégories préférées basées sur les cours complétés
  const course = await mongoose.model('Course').findById(courseId);
  if (course && !this.preferredCategories.includes(course.category)) {
    this.preferredCategories.push(course.category);
  }

  await this.save();
};

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

module.exports = UserPreference; 