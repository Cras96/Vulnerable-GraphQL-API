const COMMAND_PATTERNS = [/[;&|]/, /`[^`]+`/, /\$\([^)]+\)/, />\s*\/dev\//, /\bnc\b/i];
const PATH_PATTERNS = [/\.\./, /^\//, /^[a-zA-Z]:[\\/]/];
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i
];

function looksLikeCommandInjection(input) {
  if (!input || typeof input !== 'string') return false;
  return COMMAND_PATTERNS.some(p => p.test(input));
}

function looksLikePathTraversal(input) {
  if (!input || typeof input !== 'string') return false;
  return PATH_PATTERNS.some(p => p.test(input));
}

function looksLikeInternalUrl(input) {
  if (!input || typeof input !== 'string') return false;
  try {
    const url = new URL(input);
    const host = url.hostname;
    return PRIVATE_HOST_PATTERNS.some(p => p.test(host));
  } catch {
    return false;
  }
}

function looksLikeXss(input) {
  if (!input || typeof input !== 'string') return false;
  return /<script|onerror=|onload=|javascript:/i.test(input);
}

function looksLikeSqli(input) {
  if (!input || typeof input !== 'string') return false;
  return input.includes("'") || input.includes('"') || /\bor\b/i.test(input) || input.includes('--');
}

module.exports = {
  looksLikeCommandInjection,
  looksLikePathTraversal,
  looksLikeInternalUrl,
  looksLikeXss,
  looksLikeSqli
};
