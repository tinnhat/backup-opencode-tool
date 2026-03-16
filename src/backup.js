import archiver from 'archiver';
import fse from 'fs-extra';
import fs from 'fs';
import path from 'path';
import {
  getOpencodeDirs,
  getBackupDir,
  ensureDir,
  dirExists,
  fileExists,
  readJson,
  getTimestamp,
  log,
  error,
  success
} from './utils.js';
import { DropboxService } from './dropbox.js';

export async function createBackup(accessToken, folderPath) {
  const dirs = getOpencodeDirs();
  const backupDir = getBackupDir();
  const timestamp = getTimestamp();
  
  const tempBackupDir = path.join(backupDir, 'temp', timestamp);
  const zipPath = path.join(backupDir, `opencode-backup-${timestamp}.zip`);

  log('Starting backup...');

  ensureDir(tempBackupDir);
  ensureDir(backupDir);

  let backupInfo = {
    timestamp,
    opencodeVersion: 'unknown',
    skills: [],
    mcp: null
  };

  log('Backing up opencode skills...');
  if (dirExists(dirs.opencodeSkill)) {
    const skillDest = path.join(tempBackupDir, 'opencode-skill');
    fse.copySync(dirs.opencodeSkill, skillDest);
    backupInfo.skills.push({ source: 'opencode-skill', path: dirs.opencodeSkill });
    log(`  - Copied: ${dirs.opencodeSkill}`);
  } else {
    log('  - No opencode skills found');
  }

  log('Backing up agent skills...');
  if (dirExists(dirs.agentsSkills)) {
    const skillDest = path.join(tempBackupDir, 'agent-skills');
    fse.copySync(dirs.agentsSkills, skillDest);
    backupInfo.skills.push({ source: 'agent-skills', path: dirs.agentsSkills });
    log(`  - Copied: ${dirs.agentsSkills}`);
  } else {
    log('  - No agent skills found');
  }

  log('Backing up MCP config...');
  if (fileExists(dirs.opencodeConfig)) {
    const config = readJson(dirs.opencodeConfig);
    if (config.mcp) {
      const mcpConfig = { mcp: config.mcp };
      fse.writeJsonSync(path.join(tempBackupDir, 'mcp-config.json'), mcpConfig, { spaces: 2 });
      backupInfo.mcp = mcpConfig;
      log('  - Copied MCP config');
    } else {
      log('  - No MCP config found');
    }
    
    if (config.plugin) {
      const pluginConfig = { plugin: config.plugin };
      fse.writeJsonSync(path.join(tempBackupDir, 'plugin-config.json'), pluginConfig, { spaces: 2 });
      backupInfo.plugin = pluginConfig;
      log('  - Copied plugin config');
    } else {
      log('  - No plugin config found');
    }
  } else {
    log('  - No config file found');
  }

  fse.writeJsonSync(path.join(tempBackupDir, 'backup-info.json'), backupInfo, { spaces: 2 });

  await createZip(tempBackupDir, zipPath);

  log('Cleaning up temp files...');
  fse.removeSync(path.join(backupDir, 'temp'));

  log(`Backup created: ${zipPath}`);

  if (accessToken) {
    log('Uploading to Dropbox...');
    const dropbox = new DropboxService(accessToken, folderPath);
    
    const fileName = `opencode-backup-${timestamp}.zip`;
    await dropbox.uploadWithReplace(zipPath, fileName);
    
    success('Backup uploaded to Dropbox!');
  } else {
    log('Dropbox credentials not provided, skipping upload');
  }

  return { zipPath, backupInfo };
}

function createZip(sourceDir, destPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      log(`Archive created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      error(`Archiver error: ${err.message}`);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}
