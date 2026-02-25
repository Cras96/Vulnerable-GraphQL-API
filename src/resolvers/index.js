const os = require('os');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const store = require('../db/store');
const { signToken } = require('../auth/jwt');
const { requireAuth, requireRole, ensureFeatureEnabled } = require('../auth/guards');
const { search } = require('../services/search');
const fsService = require('../services/filesystem');
const shell = require('../services/shell');
const http = require('../services/http');
const { sanitizeUser, sanitizePatient, sanitizeUsers, sanitizePatients } = require('../utils/sanitize');
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
  Query: {
    users: (_, __, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
      return sanitizeUsers(store.users);
    },
    user: (_, { id }, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
      return sanitizeUser(store.users.find(u => u.id === id));
    },
    me: (_, __, ctx) => {
      if (ctx?.user) return sanitizeUser(store.users.find(u => u.id === ctx.user.id));
      if (!runtime.requireAuthForSensitiveQueries) return sanitizeUser(store.users[0]);
      return null;
    },

    patients: (_, __, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
      return sanitizePatients(store.patients);
    },
    patient: (_, { id }, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE', 'PATIENT']);
      return sanitizePatient(store.patients.find(p => p.id === id));
    },
    patientBySSN: (_, { ssn }, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
      return sanitizePatient(store.patients.find(p => p.ssn === ssn));
    },

    searchPatients: (_, { query }, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR', 'NURSE']);
      return sanitizePatients(search('patients', query, ctx));
    },
    searchUsers: (_, { filter }, ctx) => {
      requireRole(ctx, ['ADMIN']);
      return sanitizeUsers(search('users', filter, ctx));
    },

    appointments: (_, __, ctx) => {
      requireAuth(ctx);
      return store.appointments;
    },
    appointment: (_, { id }, ctx) => {
      requireAuth(ctx);
      return store.appointments.find(a => a.id === id);
    },

    prescriptions: (_, __, ctx) => {
      requireAuth(ctx);
      return store.prescriptions;
    },
    prescription: (_, { id }, ctx) => {
      requireAuth(ctx);
      return store.prescriptions.find(p => p.id === id);
    },

    medicalRecords: (_, __, ctx) => {
      requireAuth(ctx);
      return store.medicalRecords;
    },
    medicalRecord: (_, { id }, ctx) => {
      requireAuth(ctx);
      return store.medicalRecords.find(r => r.id === id);
    },

    systemInfo: (_, __, ctx) => {
      requireRole(ctx, ['ADMIN']);
      telemetry.record({
        category: 'INFO_DISCLOSURE',
        vector: 'SYSTEM_INFO_DISCLOSURE',
        severity: 'MEDIUM',
        payload: 'systemInfo',
        actor: telemetry.actorOf(ctx)
      });
      return {
        version: store.systemConfig.apiVersion,
        debugMode: store.systemConfig.debugMode,
        serverEnvironment: runtime.hideSensitiveFields ? '{"redacted":true}' : JSON.stringify(process.env),
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: JSON.stringify(process.memoryUsage()),
        cpuInfo: os.cpus()[0]?.model || 'Unknown'
      };
    },

    debugInfo: (_, __, ctx) => {
      requireRole(ctx, ['ADMIN']);
      telemetry.record({
        category: 'INFO_DISCLOSURE',
        vector: 'DEBUG_INFO_DISCLOSURE',
        severity: 'HIGH',
        payload: 'debugInfo',
        actor: telemetry.actorOf(ctx)
      });
      return JSON.stringify({
        database: {
          users: store.users,
          patients: store.patients,
          appointments: store.appointments,
          prescriptions: store.prescriptions,
          medicalRecords: store.medicalRecords
        },
        env: process.env,
        config: store.systemConfig
      }, null, 2);
    },

    serverConfig: (_, __, ctx) => {
      requireRole(ctx, ['ADMIN']);
      telemetry.record({
        category: 'INFO_DISCLOSURE',
        vector: 'SERVER_CONFIG_DISCLOSURE',
        severity: 'HIGH',
        payload: 'serverConfig',
        actor: telemetry.actorOf(ctx)
      });
      return JSON.stringify(store.systemConfig, null, 2);
    },

    fetchExternalData: (_, { url }, ctx) => {
      requireRole(ctx, ['ADMIN', 'DOCTOR']);
      ensureFeatureEnabled('allowSSRF');
      if (detection.looksLikeInternalUrl(url)) {
        telemetry.record({
          category: 'INJECTION',
          vector: 'SSRF_INTERNAL_TARGET',
          severity: 'CRITICAL',
          payload: url,
          actor: telemetry.actorOf(ctx)
        });
      }
      return http.fetchUrl(url);
    },
    readFile: (_, { filename }, ctx) => {
      requireRole(ctx, ['ADMIN']);
      ensureFeatureEnabled('allowDangerousReadOps');
      if (detection.looksLikePathTraversal(filename)) {
        telemetry.record({
          category: 'INJECTION',
          vector: 'PATH_TRAVERSAL_PATTERN',
          severity: 'CRITICAL',
          payload: filename,
          actor: telemetry.actorOf(ctx)
        });
      }
      return fsService.readFile(filename);
    },
    listDirectory: (_, { path }, ctx) => {
      requireRole(ctx, ['ADMIN']);
      ensureFeatureEnabled('allowDangerousReadOps');
      if (detection.looksLikePathTraversal(path)) {
        telemetry.record({
          category: 'INJECTION',
          vector: 'DIRECTORY_TRAVERSAL_PATTERN',
          severity: 'HIGH',
          payload: path,
          actor: telemetry.actorOf(ctx)
        });
      }
      return fsService.listDirectory(path);
    },
    ping: (_, { host }, ctx) => {
      requireRole(ctx, ['ADMIN']);
      ensureFeatureEnabled('allowCommandExecution');
      if (detection.looksLikeCommandInjection(host)) {
        telemetry.record({
          category: 'INJECTION',
          vector: 'COMMAND_INJECTION_PATTERN',
          severity: 'CRITICAL',
          payload: host,
          actor: telemetry.actorOf(ctx)
        });
      }
      return shell.run(shell.pingCommand(host));
    },
    systemDiagnostics: (_, { command }, ctx) => {
      requireRole(ctx, ['ADMIN']);
      ensureFeatureEnabled('allowCommandExecution');
      if (detection.looksLikeCommandInjection(command)) {
        telemetry.record({
          category: 'INJECTION',
          vector: 'COMMAND_INJECTION_PATTERN',
          severity: 'CRITICAL',
          payload: command,
          actor: telemetry.actorOf(ctx)
        });
      }
      return shell.run(command);
    },

    securityProfile: () => runtime,

    assessmentEvents: (_, { limit }, ctx) => {
      requireRole(ctx, ['ADMIN']);
      return telemetry.list(limit);
    },

    assessmentSummary: (_, __, ctx) => {
      requireRole(ctx, ['ADMIN']);
      return telemetry.summary();
    }
  },

  Mutation: {
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
  },

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
