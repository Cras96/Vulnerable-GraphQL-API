const store = require('../db/store');
const { sanitizeUser, sanitizePatient, sanitizeUsers } = require('../utils/sanitize');

module.exports = {
  User: {
    friends: (parent) => sanitizeUsers(store.users.filter(u => u.id !== parent.id))
  },

  Patient: {
    primaryDoctor: (parent) => sanitizeUser(store.users.find(u => u.id === parent.primaryDoctorId)),
    appointments: (parent) => store.appointments.filter(a => a.patientId === parent.id),
    prescriptions: (parent) => store.prescriptions.filter(p => p.patientId === parent.id),
    medicalRecords: (parent) => store.medicalRecords.filter(r => r.patientId === parent.id)
  },

  Appointment: {
    patient: (parent) => sanitizePatient(store.patients.find(p => p.id === parent.patientId)),
    doctor: (parent) => sanitizeUser(store.users.find(u => u.id === parent.doctorId))
  },

  Prescription: {
    patient: (parent) => sanitizePatient(store.patients.find(p => p.id === parent.patientId)),
    doctor: (parent) => sanitizeUser(store.users.find(u => u.id === parent.doctorId))
  },

  MedicalRecord: {
    patient: (parent) => sanitizePatient(store.patients.find(p => p.id === parent.patientId))
  }
};
