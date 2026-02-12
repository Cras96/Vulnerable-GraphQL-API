const { runtime } = require('../config/profiles');

function maskValue(value, visibleTail = 4) {
  if (!value) return value;
  const raw = String(value);
  if (raw.length <= visibleTail) return '*'.repeat(raw.length);
  return `${'*'.repeat(Math.max(raw.length - visibleTail, 1))}${raw.slice(-visibleTail)}`;
}

function sanitizeUser(user) {
  if (!user) return user;
  if (!runtime.hideSensitiveFields) return user;
  return {
    ...user,
    password: null,
    ssn: user.ssn ? `***-**-${String(user.ssn).slice(-4)}` : null,
    creditCard: user.creditCard ? maskValue(user.creditCard, 4) : null,
    salary: null
  };
}

function sanitizePatient(patient) {
  if (!patient) return patient;
  if (!runtime.hideSensitiveFields) return patient;
  return {
    ...patient,
    ssn: patient.ssn ? `***-**-${String(patient.ssn).slice(-4)}` : '***-**-****',
    insuranceNumber: patient.insuranceNumber ? maskValue(patient.insuranceNumber, 3) : '***',
    medicalHistory: '[REDACTED]'
  };
}

const sanitizeUsers = (list) => list.map(sanitizeUser);
const sanitizePatients = (list) => list.map(sanitizePatient);

module.exports = { sanitizeUser, sanitizePatient, sanitizeUsers, sanitizePatients };
