const PROFILES = {
  LAB_FULLY_VULNERABLE: {
    mode: 'LAB_FULLY_VULNERABLE',
    description: 'Maximum exposure for guided exploitation labs.',
    introspectionEnabled: true,
    playgroundEnabled: true,
    debugEnabled: true,
    verboseErrors: true,
    requireAuthForSensitiveQueries: false,
    enforceRoleChecks: false,
    allowDangerousReadOps: true,
    allowCommandExecution: true,
    allowSSRF: true,
    allowMassAssignment: true,
    weakPasswordPolicy: true,
    rateLimitLogin: false,
    maxLoginAttemptsPerMinute: Infinity,
    tokenExpiresIn: null,
    strictTokenValidation: false,
    hideSensitiveFields: false
  },

  PENTEST_REALISTIC: {
    mode: 'PENTEST_REALISTIC',
    description: 'Production-like configuration with common misconfigurations left in place.',
    introspectionEnabled: false,
    playgroundEnabled: false,
    debugEnabled: false,
    verboseErrors: false,
    requireAuthForSensitiveQueries: true,
    enforceRoleChecks: true,
    allowDangerousReadOps: false,
    allowCommandExecution: false,
    allowSSRF: false,
    allowMassAssignment: false,
    weakPasswordPolicy: false,
    rateLimitLogin: true,
    maxLoginAttemptsPerMinute: 10,
    tokenExpiresIn: '1h',
    strictTokenValidation: true,
    hideSensitiveFields: true
  },

  BASELINE_HARDENED: {
    mode: 'BASELINE_HARDENED',
    description: 'Baseline hardened configuration. All optional dangerous features disabled.',
    introspectionEnabled: false,
    playgroundEnabled: false,
    debugEnabled: false,
    verboseErrors: false,
    requireAuthForSensitiveQueries: true,
    enforceRoleChecks: true,
    allowDangerousReadOps: false,
    allowCommandExecution: false,
    allowSSRF: false,
    allowMassAssignment: false,
    weakPasswordPolicy: false,
    rateLimitLogin: true,
    maxLoginAttemptsPerMinute: 5,
    tokenExpiresIn: '15m',
    strictTokenValidation: true,
    hideSensitiveFields: true
  }
};

function loadProfile(mode) {
  const requested = mode || process.env.TEST_MODE || 'PENTEST_REALISTIC';
  if (PROFILES[requested]) {
    return { ...PROFILES[requested] };
  }
  return { ...PROFILES.PENTEST_REALISTIC };
}

const runtime = loadProfile();

module.exports = { PROFILES, loadProfile, runtime };
