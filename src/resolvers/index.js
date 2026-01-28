const os = require('os');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const store = require('../db/store');
const { signToken } = require('../auth/jwt');
const { search } = require('../services/search');
const fsService = require('../services/filesystem');
const shell = require('../services/shell');
const http = require('../services/http');
const { ADMIN_SECRET_KEY } = require('../config/secrets');

module.exports = {
  Query: {
    users: () => store.users,
    user: (_, { id }) => store.users.find(u => u.id === id),
    me: (_, __, ctx) => ctx?.user ? store.users.find(u => u.id === ctx.user.id) : null,

    patients: () => store.patients,
    patient: (_, { id }) => store.patients.find(p => p.id === id),
    patientBySSN: (_, { ssn }) => store.patients.find(p => p.ssn === ssn),

    searchPatients: (_, { query }) => search('patients', query),
    searchUsers: (_, { filter }) => search('users', filter),

    appointments: () => store.appointments,
    appointment: (_, { id }) => store.appointments.find(a => a.id === id),

    prescriptions: () => store.prescriptions,
    prescription: (_, { id }) => store.prescriptions.find(p => p.id === id),

    medicalRecords: () => store.medicalRecords,
    medicalRecord: (_, { id }) => store.medicalRecords.find(r => r.id === id),

    systemInfo: () => ({
      version: store.systemConfig.apiVersion,
      debugMode: store.systemConfig.debugMode,
      serverEnvironment: JSON.stringify(process.env),
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: JSON.stringify(process.memoryUsage()),
      cpuInfo: os.cpus()[0]?.model || 'Unknown'
    }),

    debugInfo: () => JSON.stringify({
      database: {
        users: store.users,
        patients: store.patients,
        appointments: store.appointments,
        prescriptions: store.prescriptions,
        medicalRecords: store.medicalRecords
      },
      env: process.env,
      config: store.systemConfig
    }, null, 2),

    serverConfig: () => JSON.stringify(store.systemConfig, null, 2),

    fetchExternalData: (_, { url }) => http.fetchUrl(url),
    readFile: (_, { filename }) => fsService.readFile(filename),
    listDirectory: (_, { path }) => fsService.listDirectory(path),
    ping: (_, { host }) => shell.run(shell.pingCommand(host)),
    systemDiagnostics: (_, { command }) => shell.run(command)
  },

  Mutation: {
    login: async (_, { username, password }) => {
      const user = store.users.find(u => u.username === username);
      if (!user) throw new Error('User not found');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid password');

      return { token: signToken(user), user };
    },

    register: async (_, { username, password, email }) => {
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
      return { token: signToken(newUser), user: newUser };
    },

    createUser: async (_, { username, password, email, role }) => {
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
      return newUser;
    },

    updateUser: (_, { id, ...updates }) => {
      const user = store.users.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      Object.assign(user, updates);
      return user;
    },

    deleteUser: (_, { id }) => {
      const idx = store.users.findIndex(u => u.id === id);
      if (idx === -1) return false;
      store.users.splice(idx, 1);
      return true;
    },

    createPatient: (_, { input }) => {
      const newPatient = {
        id: uuidv4(),
        ...input,
        allergies: input.allergies || [],
        balance: input.balance || 0
      };
      store.patients.push(newPatient);
      return newPatient;
    },

    updatePatient: (_, { id, input }) => {
      const patient = store.patients.find(p => p.id === id);
      if (!patient) throw new Error('Patient not found');
      Object.assign(patient, input);
      return patient;
    },

    deletePatient: (_, { id }) => {
      const idx = store.patients.findIndex(p => p.id === id);
      if (idx === -1) return false;
      store.patients.splice(idx, 1);
      return true;
    },

    createAppointment: (_, { patientId, doctorId, date, time, reason }) => {
      const appt = {
        id: uuidv4(),
        patientId,
        doctorId,
        date,
        time,
        reason,
        status: 'SCHEDULED'
      };
      store.appointments.push(appt);
      return appt;
    },

    updateAppointment: (_, { id, status }) => {
      const appt = store.appointments.find(a => a.id === id);
      if (!appt) throw new Error('Appointment not found');
      if (status) appt.status = status;
      return appt;
    },

    deleteAppointment: (_, { id }) => {
      const idx = store.appointments.findIndex(a => a.id === id);
      if (idx === -1) return false;
      store.appointments.splice(idx, 1);
      return true;
    },

    createPrescription: (_, { patientId, medication, dosage, frequency }) => {
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

    deletePrescription: (_, { id }) => {
      const idx = store.prescriptions.findIndex(p => p.id === id);
      if (idx === -1) return false;
      store.prescriptions.splice(idx, 1);
      return true;
    },

    createMedicalRecord: (_, { patientId, type, data }) => {
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

    updateMedicalRecord: (_, { id, data }) => {
      const record = store.medicalRecords.find(r => r.id === id);
      if (!record) throw new Error('Record not found');
      record.data = data;
      return record;
    },

    deleteMedicalRecord: (_, { id }) => {
      const idx = store.medicalRecords.findIndex(r => r.id === id);
      if (idx === -1) return false;
      store.medicalRecords.splice(idx, 1);
      return true;
    },

    addComment: (_, { patientId, comment }) => {
      const patient = store.patients.find(p => p.id === patientId);
      if (!patient) throw new Error('Patient not found');
      patient.medicalHistory += `\nComment: ${comment}`;
      return patient;
    },

    updateBio: (_, { userId, bio }) => {
      const user = store.users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');
      user.bio = bio;
      return user;
    },

    promoteToAdmin: (_, { userId, secretKey }) => {
      if (secretKey !== ADMIN_SECRET_KEY) {
        throw new Error('Invalid secret key');
      }
      const user = store.users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');
      user.role = 'ADMIN';
      return user;
    },

    transferBalance: (_, { fromPatientId, toPatientId, amount }) => {
      const from = store.patients.find(p => p.id === fromPatientId);
      const to = store.patients.find(p => p.id === toPatientId);
      if (!from || !to) throw new Error('Patient not found');
      if (from.balance < amount) throw new Error('Insufficient balance');
      from.balance -= amount;
      to.balance += amount;
      return true;
    },

    uploadFile: (_, { filename, content }) => {
      const info = fsService.writeUpload(filename, content);
      store.files.push(info);
      return info;
    },

    backupDatabase: (_, { destination }) => {
      const summary = `backup users=${store.users.length} patients=${store.patients.length} ts=${new Date().toISOString()}`;
      return shell.run(shell.backupCommand(destination, summary));
    },

    restoreDatabase: (_, { source }) => shell.run(shell.readFileCommand(source)),

    setWebhook: (_, { url }) => {
      store.systemConfig.webhookUrl = url;
      return true;
    },

    triggerWebhook: (_, { data }) => {
      const url = store.systemConfig.webhookUrl;
      if (!url) throw new Error('Webhook not configured');
      return http.postUrl(url, data);
    },

    executeDebugCommand: (_, { cmd }) => shell.run(cmd)
  },

  Patient: {
    primaryDoctor: (parent) => store.users.find(u => u.id === parent.primaryDoctorId),
    appointments: (parent) => store.appointments.filter(a => a.patientId === parent.id),
    prescriptions: (parent) => store.prescriptions.filter(p => p.patientId === parent.id),
    medicalRecords: (parent) => store.medicalRecords.filter(r => r.patientId === parent.id)
  },

  Appointment: {
    patient: (parent) => store.patients.find(p => p.id === parent.patientId),
    doctor: (parent) => store.users.find(u => u.id === parent.doctorId)
  },

  Prescription: {
    patient: (parent) => store.patients.find(p => p.id === parent.patientId),
    doctor: (parent) => store.users.find(u => u.id === parent.doctorId)
  },

  MedicalRecord: {
    patient: (parent) => store.patients.find(p => p.id === parent.patientId)
  }
};
