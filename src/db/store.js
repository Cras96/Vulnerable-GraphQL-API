const bcrypt = require('bcryptjs');

const users = [
  {
    id: '1',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@hospital.local',
    role: 'ADMIN',
    ssn: '123-45-6789',
    creditCard: '4111111111111111',
    salary: 150000,
    department: 'Administration'
  },
  {
    id: '2',
    username: 'drsmith',
    password: bcrypt.hashSync('doctor123', 10),
    email: 'smith@hospital.local',
    role: 'DOCTOR',
    ssn: '987-65-4321',
    creditCard: '5500000000000004',
    salary: 250000,
    department: 'Cardiology'
  },
  {
    id: '3',
    username: 'nurse_jane',
    password: bcrypt.hashSync('nurse123', 10),
    email: 'jane@hospital.local',
    role: 'NURSE',
    ssn: '456-78-9012',
    creditCard: '340000000000009',
    salary: 75000,
    department: 'Emergency'
  },
  {
    id: '4',
    username: 'patient_john',
    password: bcrypt.hashSync('patient123', 10),
    email: 'john.doe@email.com',
    role: 'PATIENT',
    ssn: '111-22-3333',
    creditCard: '6011000000000004',
    salary: 0,
    department: null
  }
];

const patients = [
  {
    id: '1',
    name: 'John Doe',
    dateOfBirth: '1985-03-15',
    ssn: '111-22-3333',
    address: '123 Main St, New York, NY',
    phone: '555-0100',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    insuranceNumber: 'INS-12345',
    balance: 1500.00,
    primaryDoctorId: '2',
    medicalHistory: 'Diabetes Type 2, diagnosed 2020'
  },
  {
    id: '2',
    name: 'Jane Smith',
    dateOfBirth: '1990-07-22',
    ssn: '444-55-6666',
    address: '456 Oak Ave, Los Angeles, CA',
    phone: '555-0200',
    bloodType: 'A-',
    allergies: [],
    insuranceNumber: 'INS-67890',
    balance: 0,
    primaryDoctorId: '2',
    medicalHistory: 'Appendectomy 2018'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    dateOfBirth: '1975-11-08',
    ssn: '777-88-9999',
    address: '789 Pine Rd, Chicago, IL',
    phone: '555-0300',
    bloodType: 'B+',
    allergies: ['Aspirin'],
    insuranceNumber: 'INS-11111',
    balance: 3200.50,
    primaryDoctorId: '2',
    medicalHistory: 'Hypertension, Heart surgery 2019'
  }
];

const appointments = [
  { id: '1', patientId: '1', doctorId: '2', date: '2024-01-15', time: '09:00', reason: 'Annual checkup', status: 'SCHEDULED' },
  { id: '2', patientId: '2', doctorId: '2', date: '2024-01-16', time: '10:30', reason: 'Follow-up', status: 'SCHEDULED' },
  { id: '3', patientId: '3', doctorId: '2', date: '2024-01-17', time: '14:00', reason: 'Heart monitoring', status: 'SCHEDULED' }
];

const prescriptions = [
  { id: '1', patientId: '1', doctorId: '2', medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', date: '2024-01-01' },
  { id: '2', patientId: '3', doctorId: '2', medication: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', date: '2024-01-05' }
];

const medicalRecords = [
  { id: '1', patientId: '1', type: 'LAB_RESULT', data: 'Blood glucose: 126 mg/dL', date: '2024-01-10', confidential: true },
  { id: '2', patientId: '1', type: 'DIAGNOSIS', data: 'Type 2 Diabetes - well controlled', date: '2024-01-10', confidential: true },
  { id: '3', patientId: '3', type: 'IMAGING', data: 'ECG shows normal sinus rhythm', date: '2024-01-12', confidential: true }
];

const systemConfig = {
  debugMode: true,
  maintenanceMode: false,
  apiVersion: '1.0.0',
  serverInfo: process.env,
  webhookUrl: null
};

const files = [];

module.exports = {
  users,
  patients,
  appointments,
  prescriptions,
  medicalRecords,
  systemConfig,
  files
};
