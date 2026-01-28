const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ROOT = path.resolve(__dirname, '..', '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

function readFile(filename) {
  const fullPath = path.isAbsolute(filename) ? filename : path.join(ROOT, filename);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return {
    id: uuidv4(),
    filename: path.basename(filename),
    path: fullPath,
    content,
    size: content.length
  };
}

function listDirectory(dirPath) {
  const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(ROOT, dirPath);
  return fs.readdirSync(fullPath);
}

function writeUpload(filename, content) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, content);
  return {
    id: uuidv4(),
    filename,
    path: filePath,
    content,
    size: content.length
  };
}

module.exports = { readFile, listDirectory, writeUpload };
