const { gql } = require('apollo-server');

module.exports = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    role: Role!
    password: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  enum Role {
    ADMIN
    DOCTOR
    NURSE
    PATIENT
    GUEST
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    me: User
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload
    register(username: String!, password: String!, email: String!): AuthPayload
  }
`;
