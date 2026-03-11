import os from 'os';
import path from 'path';
import fs from 'fs-extra';

export function getHomeDir() {
  return os.homedir();
}

export function getOpencodeDirs() {
  const home = getHomeDir();
  return {
    opencodeSkill: path.join(home, '.opencode', 'skill'),
    agentsSkills: path.join(home, '.agents', 'skills'),
    opencodeConfig: path.join(home, '.opencode', 'config.json')
  };
}

export function getBackupDir() {
  const home = getHomeDir();
  return path.join(home, '.backup-opencode');
}

export function ensureDir(dirPath) {
  fs.ensureDirSync(dirPath);
}

export function dirExists(dirPath) {
  return fs.pathExistsSync(dirPath);
}

export function fileExists(filePath) {
  return fs.pathExistsSync(filePath);
}

export function readJson(filePath) {
  return fs.readJsonSync(filePath);
}

export function writeJson(filePath, data) {
  fs.writeJsonSync(filePath, data, { spaces: 2 });
}

export function copyDir(src, dest) {
  if (dirExists(src)) {
    fs.copySync(src, dest);
    return true;
  }
  return false;
}

export function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

export function error(message) {
  console.error(`[ERROR] ${message}`);
}

export function success(message) {
  console.log(`[SUCCESS] ${message}`);
}
