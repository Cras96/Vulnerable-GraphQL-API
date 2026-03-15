const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const store = require('../db/store');
const { signToken } = require('../auth/jwt');
const { requireAuth, requireRole, ensureFeatureEnabled } = require('../auth/guards');
const fsService = require('../services/filesystem');
const shell = require('../services/shell');
const http = require('../services/http');
const { sanitizeUser, sanitizePatient } = require('../utils/sanitize');
const { enforceLoginRateLimit, resetLoginAttempts } = require('../utils/ratelimit');
const { runtime } = require('../config/profiles');
const { ADMIN_SECRET_KEY } = require('../config/secrets');
const telemetry = require('../telemetry/events');
const detection = require('../telemetry/detection');

function emitXssIfDetected(value, context) {
  if (typeof value === 'string' && detection.looksLikeXss(value)) {
    telemetry.record({
      category: 'INJECTION',
      vector: 'STORED_XSS_PAYLOAD',
      severity: 'HIGH',
      payload: value,
      actor: telemetry.actorOf(context)
    });
  }
}

module.exports = {
  login: async (_, { username, password }, ctx) => {
    enforceLoginRateLimit(ctx, username);
    const user = store.users.find(u => u.username === username);
    if (!user) {
      telemetry.record({
        category: 'AUTH',
        vector: 'USERNAME_ENUMERATION',
        severity: 'MEDIUM',
        payload: username,
        actor: username
      });
      throw new Error('User not found');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      telemetry.record({
        category: 'AUTH',
        vector: 'FAILED_LOGIN',
        severity: 'LOW',
        payload: username,
        actor: username
      });
      throw new Error('Invalid password');
    }

    return { token: signToken(user), user: sanitizeUser(user) };
  },

  register: async (_, { username, password, email }) => {
    if (runtime.weakPasswordPolicy && password.length < 1) {
      throw new Error('Password required');
    }
    if (!runtime.weakPasswordPolicy && password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const newUser = {
      id: uuidv4(),
      username,
      password: await bcrypt.hash(password, 10),
      email,
      role: 'PATIENT',
      ssn: null,
      creditCard: null,
      salary: 0,
      department: null
    };
    store.users.push(newUser);
    return { token: signToken(newUser), user: sanitizeUser(newUser) };
  },

  createUser: async (_, { username, password, email, role }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    const newUser = {
      id: uuidv4(),
      username,
      password: await bcrypt.hash(password, 10),
      email,
      role,
      ssn: null,
      creditCard: null,
      salary: 0,
      department: null
    };
    store.users.push(newUser);
    return sanitizeUser(newUser);
  },

  updateUser: (_, { id, ...updates }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    const user = store.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');

    if (runtime.allowMassAssignment) {
      Object.assign(user, updates);
    } else {
      const { username, email, department } = updates;
      Object.assign(user, {
        ...(username !== undefined ? { username } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(department !== undefined ? { department } : {})
      });
    }
    return sanitizeUser(user);
  },

  deleteUser: (_, { id }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    const idx = store.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    store.users.splice(idx, 1);
    return true;
  },

  createPatient: (_, { input }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
    const newPatient = {
      id: uuidv4(),
      ...input,
      allergies: input.allergies || [],
      balance: input.balance || 0
    };
    store.patients.push(newPatient);
    return sanitizePatient(newPatient);
  },

  updatePatient: (_, { id, input }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
    const patient = store.patients.find(p => p.id === id);
    if (!patient) throw new Error('Patient not found');

    if (runtime.allowMassAssignment) {
      Object.assign(patient, input);
    } else {
      const safeUpdate = {
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
        ...(input.medicalHistory !== undefined ? { medicalHistory: input.medicalHistory } : {})
      };
      Object.assign(patient, safeUpdate);
    }
    return sanitizePatient(patient);
  },

  deletePatient: (_, { id }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR']);
    const idx = store.patients.findIndex(p => p.id === id);
    if (idx === -1) return false;
    store.patients.splice(idx, 1);
    return true;
  },

  createAppointment: (_, { patientId, doctorId, date, time, reason }, ctx) => {
    requireAuth(ctx);
    const appt = { id: uuidv4(), patientId, doctorId, date, time, reason, status: 'SCHEDULED' };
    store.appointments.push(appt);
    return appt;
  },

  updateAppointment: (_, { id, status }, ctx) => {
    requireAuth(ctx);
    const appt = store.appointments.find(a => a.id === id);
    if (!appt) throw new Error('Appointment not found');
    if (status) appt.status = status;
    return appt;
  },

  deleteAppointment: (_, { id }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR']);
    const idx = store.appointments.findIndex(a => a.id === id);
    if (idx === -1) return false;
    store.appointments.splice(idx, 1);
    return true;
  },

  createPrescription: (_, { patientId, medication, dosage, frequency }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR']);
    const rx = {
      id: uuidv4(),
      patientId,
      doctorId: '2',
      medication,
      dosage,
      frequency,
      date: new Date().toISOString().split('T')[0]
    };
    store.prescriptions.push(rx);
    return rx;
  },

  deletePrescription: (_, { id }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR']);
    const idx = store.prescriptions.findIndex(p => p.id === id);
    if (idx === -1) return false;
    store.prescriptions.splice(idx, 1);
    return true;
  },

  createMedicalRecord: (_, { patientId, type, data }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
    emitXssIfDetected(data, ctx);
    const record = {
      id: uuidv4(),
      patientId,
      type,
      data,
      date: new Date().toISOString().split('T')[0],
      confidential: true
    };
    store.medicalRecords.push(record);
    return record;
  },

  updateMedicalRecord: (_, { id, data }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
    emitXssIfDetected(data, ctx);
    const record = store.medicalRecords.find(r => r.id === id);
    if (!record) throw new Error('Record not found');
    record.data = data;
    return record;
  },

  deleteMedicalRecord: (_, { id }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR']);
    const idx = store.medicalRecords.findIndex(r => r.id === id);
    if (idx === -1) return false;
    store.medicalRecords.splice(idx, 1);
    return true;
  },

  addComment: (_, { patientId, comment }, ctx) => {
    requireAuth(ctx);
    emitXssIfDetected(comment, ctx);
    const patient = store.patients.find(p => p.id === patientId);
    if (!patient) throw new Error('Patient not found');
    patient.medicalHistory += `\nComment: ${comment}`;
    return sanitizePatient(patient);
  },

  updateBio: (_, { userId, bio }, ctx) => {
    requireAuth(ctx);
    emitXssIfDetected(bio, ctx);
    const user = store.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.bio = bio;
    return sanitizeUser(user);
  },

  promoteToAdmin: (_, { userId, secretKey }, ctx) => {
    requireAuth(ctx);
    if (secretKey !== ADMIN_SECRET_KEY) {
      throw new Error('Invalid secret key');
    }
    telemetry.record({
      category: 'ACCESS_CONTROL',
      vector: 'PRIVILEGE_ESCALATION_SUCCESS',
      severity: 'CRITICAL',
      payload: `userId=${userId}`,
      actor: telemetry.actorOf(ctx)
    });
    const user = store.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.role = 'ADMIN';
    return sanitizeUser(user);
  },

  transferBalance: (_, { fromPatientId, toPatientId, amount }, ctx) => {
    requireAuth(ctx);
    const from = store.patients.find(p => p.id === fromPatientId);
    const to = store.patients.find(p => p.id === toPatientId);
    if (!from || !to) throw new Error('Patient not found');
    if (from.balance < amount) throw new Error('Insufficient balance');
    from.balance -= amount;
    to.balance += amount;
    return true;
  },

  uploadFile: (_, { filename, content }, ctx) => {
    requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
    if (detection.looksLikePathTraversal(filename)) {
      telemetry.record({
        category: 'INJECTION',
        vector: 'ARBITRARY_FILE_UPLOAD_PATH_TRAVERSAL',
        severity: 'CRITICAL',
        payload: filename,
        actor: telemetry.actorOf(ctx)
      });
    }
    const info = fsService.writeUpload(filename, content);
    store.files.push(info);
    return info;
  },

  backupDatabase: (_, { destination }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    ensureFeatureEnabled('allowCommandExecution');
    const summary = `backup users=${store.users.length} patients=${store.patients.length} ts=${new Date().toISOString()}`;
    return shell.run(shell.backupCommand(destination, summary));
  },

  restoreDatabase: (_, { source }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    ensureFeatureEnabled('allowCommandExecution');
    return shell.run(shell.readFileCommand(source));
  },

  setWebhook: (_, { url }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    ensureFeatureEnabled('allowSSRF');
    if (detection.looksLikeInternalUrl(url)) {
      telemetry.record({
        category: 'INJECTION',
        vector: 'SSRF_INTERNAL_WEBHOOK',
        severity: 'CRITICAL',
        payload: url,
        actor: telemetry.actorOf(ctx)
      });
    }
    store.systemConfig.webhookUrl = url;
    return true;
  },

  triggerWebhook: (_, { data }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    ensureFeatureEnabled('allowSSRF');
    const url = store.systemConfig.webhookUrl;
    if (!url) throw new Error('Webhook not configured');
    return http.postUrl(url, data);
  },

  executeDebugCommand: (_, { cmd }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    ensureFeatureEnabled('allowCommandExecution');
    return shell.run(cmd);
  },

  resetTestData: (_, { confirmPhrase }, ctx) => {
    requireRole(ctx, ['ADMIN']);
    if (confirmPhrase !== store.TEST_RESET_PHRASE) {
      throw new Error(`Invalid confirmation phrase. Use: ${store.TEST_RESET_PHRASE}`);
    }
    store.reset();
    telemetry.clear();
    resetLoginAttempts();
    return true;
  },

  clearAssessmentEvents: (_, __, ctx) => {
    requireRole(ctx, ['ADMIN']);
    telemetry.clear();
    return true;
  }
};
