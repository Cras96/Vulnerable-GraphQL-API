const { gql } = require('apollo-server');

module.exports = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    role: Role!
    password: String
  }

  type Patient {
    id: ID!
    name: String!
    dateOfBirth: String!
    ssn: String!
    address: String!
    phone: String!
    bloodType: String!
    allergies: [String]!
    insuranceNumber: String!
    balance: Float!
    medicalHistory: String!
    primaryDoctor: User
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

  input PatientInput {
    name: String
    dateOfBirth: String
    ssn: String
    address: String
    phone: String
    bloodType: String
    allergies: [String]
    insuranceNumber: String
    balance: Float
    medicalHistory: String
    primaryDoctorId: ID
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    me: User

    patients: [Patient!]!
    patient(id: ID!): Patient
    patientBySSN(ssn: String!): Patient
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload
    register(username: String!, password: String!, email: String!): AuthPayload

    createPatient(input: PatientInput!): Patient
    updatePatient(id: ID!, input: PatientInput!): Patient
    deletePatient(id: ID!): Boolean
  }
`;
