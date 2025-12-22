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
    appointments: [Appointment]
    prescriptions: [Prescription]
  }

  type Appointment {
    id: ID!
    patient: Patient!
    doctor: User!
    date: String!
    time: String!
    reason: String!
    status: AppointmentStatus!
  }

  type Prescription {
    id: ID!
    patient: Patient!
    doctor: User!
    medication: String!
    dosage: String!
    frequency: String!
    date: String!
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

  enum AppointmentStatus {
    SCHEDULED
    COMPLETED
    CANCELLED
    NO_SHOW
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

    searchPatients(query: String!): [Patient]
    searchUsers(filter: String!): [User]

    appointments: [Appointment!]!
    appointment(id: ID!): Appointment

    prescriptions: [Prescription!]!
    prescription(id: ID!): Prescription
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload
    register(username: String!, password: String!, email: String!): AuthPayload

    createPatient(input: PatientInput!): Patient
    updatePatient(id: ID!, input: PatientInput!): Patient
    deletePatient(id: ID!): Boolean

    createAppointment(patientId: ID!, doctorId: ID!, date: String!, time: String!, reason: String!): Appointment
    updateAppointment(id: ID!, status: AppointmentStatus): Appointment
    deleteAppointment(id: ID!): Boolean

    createPrescription(patientId: ID!, medication: String!, dosage: String!, frequency: String!): Prescription
    deletePrescription(id: ID!): Boolean
  }
`;
