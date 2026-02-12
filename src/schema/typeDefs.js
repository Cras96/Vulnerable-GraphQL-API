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
    friends: [User]
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

  type FileInfo {
    id: ID!
    filename: String!
    path: String!
    content: String
    size: Int
  }

  type CommandResult {
    output: String!
    error: String
  }

  type FetchResult {
    statusCode: Int!
    body: String!
    headers: String!
  }

  type SecurityProfile {
    mode: String!
    description: String!
    introspectionEnabled: Boolean!
    playgroundEnabled: Boolean!
    debugEnabled: Boolean!
    requireAuthForSensitiveQueries: Boolean!
    enforceRoleChecks: Boolean!
    allowDangerousReadOps: Boolean!
    allowCommandExecution: Boolean!
    allowSSRF: Boolean!
    allowMassAssignment: Boolean!
    weakPasswordPolicy: Boolean!
    rateLimitLogin: Boolean!
    tokenExpiresIn: String
    strictTokenValidation: Boolean!
    hideSensitiveFields: Boolean!
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

    fetchExternalData(url: String!): FetchResult
    readFile(filename: String!): FileInfo
    listDirectory(path: String!): [String]
    ping(host: String!): CommandResult
    systemDiagnostics(command: String!): CommandResult

    securityProfile: SecurityProfile!
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

    uploadFile(filename: String!, content: String!): FileInfo
    backupDatabase(destination: String!): CommandResult
    restoreDatabase(source: String!): CommandResult

    setWebhook(url: String!): Boolean
    triggerWebhook(data: String!): FetchResult

    executeDebugCommand(cmd: String!): CommandResult
  }
`;
