const { execSync } = require('child_process');

function run(command) {
  try {
    const output = execSync(command, { encoding: 'utf-8', timeout: 5000 });
    return { output, error: null };
  } catch (err) {
    return { output: '', error: err.message };
  }
}

function pingCommand(host) {
  const flag = process.platform === 'win32' ? '-n' : '-c';
  return `ping ${flag} 1 ${host}`;
}

function readFileCommand(source) {
  return process.platform === 'win32' ? `type ${source}` : `cat ${source}`;
}

function backupCommand(destination, summary) {
  return process.platform === 'win32'
    ? `echo ${summary} > ${destination}`
    : `echo "${summary}" > ${destination}`;
}

module.exports = { run, pingCommand, readFileCommand, backupCommand };
