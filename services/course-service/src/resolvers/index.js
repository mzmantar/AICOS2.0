const Course = require('../models/Course');

const resolvers = {
  Query: {
    courses: async (_, { category, level, search, instructor, isPublished }) => {
      const query = {};

      if (category) query.category = category;
      if (level) query.level = level;
      if (instructor) query.instructor = instructor;
      if (isPublished !== undefined) query.isPublished = isPublished;
      if (search) {
        query.$text = { $search: search };
      }

      return Course.find(query).sort({ createdAt: -1 });
    },

    course: async (_, { id }) => {
      return Course.findById(id);
    },

    instructorCourses: async (_, { instructorId }) => {
      return Course.find({ instructor: instructorId }).sort({ createdAt: -1 });
    },

    studentCourses: async (_, { studentId }) => {
      return Course.find({ enrolledStudents: studentId }).sort({ createdAt: -1 });
    }
  },

  Mutation: {
    createCourse: async (_, { input }) => {
      const course = new Course(input);
      return course.save();
    },

    updateCourse: async (_, { id, input }) => {
      return Course.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true }
      );
    },

    deleteCourse: async (_, { id }) => {
      const result = await Course.findByIdAndDelete(id);
      return !!result;
    },

    publishCourse: async (_, { id }) => {
      return Course.findByIdAndUpdate(
        id,
        { $set: { isPublished: true } },
        { new: true }
      );
    },

    enrollStudent: async (_, { courseId, studentId }) => {
      return Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledStudents: studentId } },
        { new: true }
      );
    },

    unenrollStudent: async (_, { courseId, studentId }) => {
      return Course.findByIdAndUpdate(
        courseId,
        { $pull: { enrolledStudents: studentId } },
        { new: true }
      );
    },

    updateCourseRating: async (_, { courseId, rating }) => {
      const course = await Course.findById(courseId);
      if (!course) throw new Error('Cours non trouvé');

      // Calcul de la nouvelle note moyenne
      const newRating = (course.rating + rating) / 2;
      course.rating = newRating;

      return course.save();
    }
  }
};

module.exports = resolvers; 