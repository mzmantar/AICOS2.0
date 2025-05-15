const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Lesson {
    id: ID!
    title: String!
    content: String!
    duration: Int!
    order: Int!
  }

  type Course {
    id: ID!
    title: String!
    description: String!
    instructor: ID!
    category: String!
    level: String!
    lessons: [Lesson!]!
    duration: Int!
    price: Float!
    rating: Float!
    enrolledStudents: [ID!]!
    tags: [String!]!
    isPublished: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input LessonInput {
    title: String!
    content: String!
    duration: Int!
    order: Int!
  }

  input CourseInput {
    title: String!
    description: String!
    instructor: ID!
    category: String!
    level: String!
    lessons: [LessonInput!]!
    duration: Int!
    price: Float!
    tags: [String!]!
  }

  type Query {
    courses(
      category: String
      level: String
      search: String
      instructor: ID
      isPublished: Boolean
    ): [Course!]!
    course(id: ID!): Course
    instructorCourses(instructorId: ID!): [Course!]!
    studentCourses(studentId: ID!): [Course!]!
  }

  type Mutation {
    createCourse(input: CourseInput!): Course!
    updateCourse(id: ID!, input: CourseInput!): Course!
    deleteCourse(id: ID!): Boolean!
    publishCourse(id: ID!): Course!
    enrollStudent(courseId: ID!, studentId: ID!): Course!
    unenrollStudent(courseId: ID!, studentId: ID!): Course!
    updateCourseRating(courseId: ID!, rating: Float!): Course!
  }
`;

module.exports = typeDefs; 