const os = require('os');
const store = require('../db/store');
const { requireAuth, requireRole, ensureFeatureEnabled } = require('../auth/guards');
const { search } = require('../services/search');
const fsService = require('../services/filesystem');
const shell = require('../services/shell');
const http = require('../services/http');
const { sanitizeUser, sanitizePatient, sanitizeUsers, sanitizePatients } = require('../utils/sanitize');
const { runtime } = require('../config/profiles');
const telemetry = require('../telemetry/events');
const detection = require('../telemetry/detection');

module.exports = {
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
};
