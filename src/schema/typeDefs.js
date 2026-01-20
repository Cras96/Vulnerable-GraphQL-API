const { gql } = require('apollo-server');

module.exports = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    role: Role!
    password: String
    ssn: String
    creditCard: String
    salary: Float
    department: String
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
    medicalRecords: [MedicalRecord]
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

  type MedicalRecord {
    id: ID!
    patient: Patient!
    type: RecordType!
    data: String!
    date: String!
    confidential: Boolean!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type SystemInfo {
    version: String!
    debugMode: Boolean!
    serverEnvironment: String!
    nodeVersion: String!
    platform: String!
    uptime: Float!
    memoryUsage: String!
    cpuInfo: String!
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

  enum RecordType {
    LAB_RESULT
    DIAGNOSIS
    IMAGING
    PROCEDURE
    NOTE
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

    medicalRecords: [MedicalRecord!]!
    medicalRecord(id: ID!): MedicalRecord

    systemInfo: SystemInfo!
    debugInfo: String!
    serverConfig: String!
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload
    register(username: String!, password: String!, email: String!): AuthPayload

    createUser(username: String!, password: String!, email: String!, role: Role!): User
    updateUser(id: ID!, username: String, email: String, role: Role, salary: Float): User
    deleteUser(id: ID!): Boolean

    createPatient(input: PatientInput!): Patient
    updatePatient(id: ID!, input: PatientInput!): Patient
    deletePatient(id: ID!): Boolean

    createAppointment(patientId: ID!, doctorId: ID!, date: String!, time: String!, reason: String!): Appointment
    updateAppointment(id: ID!, status: AppointmentStatus): Appointment
    deleteAppointment(id: ID!): Boolean

    createPrescription(patientId: ID!, medication: String!, dosage: String!, frequency: String!): Prescription
    deletePrescription(id: ID!): Boolean

    createMedicalRecord(patientId: ID!, type: RecordType!, data: String!): MedicalRecord
    updateMedicalRecord(id: ID!, data: String!): MedicalRecord
    deleteMedicalRecord(id: ID!): Boolean

    addComment(patientId: ID!, comment: String!): Patient
    updateBio(userId: ID!, bio: String!): User

    promoteToAdmin(userId: ID!, secretKey: String!): User
    transferBalance(fromPatientId: ID!, toPatientId: ID!, amount: Float!): Boolean
  }
`;
