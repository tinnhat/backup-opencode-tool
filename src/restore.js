import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import {
  getOpencodeDirs,
  getBackupDir,
  ensureDir,
  dirExists,
  fileExists,
  readJson,
  writeJson,
  getTimestamp,
  log,
  error,
  success
} from './utils.js';
import { DropboxService } from './dropbox.js';

export async function restoreBackup(accessToken, folderPath, localZipPath) {
  const dirs = getOpencodeDirs();
  const backupDir = getBackupDir();
  const extractDir = path.join(backupDir, 'restore', getTimestamp());

  ensureDir(backupDir);
  ensureDir(extractDir);

  log('Starting restore...');

  let zipPath = localZipPath;

  if (!zipPath && accessToken && folderPath) {
    log('Downloading latest backup from Dropbox...');
    const dropbox = new DropboxService(accessToken, folderPath);

    const latestBackup = await dropbox.getLatestBackup();
    if (!latestBackup) {
      error('No backup found on Dropbox');
      process.exit(1);
    }

    log(`Found latest backup: ${latestBackup.name} (${latestBackup.server_modified})`);

    zipPath = path.join(backupDir, latestBackup.name);
    await dropbox.downloadFile(latestBackup.name, zipPath);
  }

  if (!zipPath || !fileExists(zipPath)) {
    error('No backup file found');
    process.exit(1);
  }

  log(`Extracting: ${zipPath}`);
  await extractZip(zipPath, extractDir);

  const backupInfoPath = path.join(extractDir, 'backup-info.json');
  let backupInfo = null;
  if (fileExists(backupInfoPath)) {
    backupInfo = readJson(backupInfoPath);
    log(`Backup from: ${backupInfo.timestamp}`);
  } else {
    log('Warning: backup-info.json not found, restoring available files...');
  }

  log('Restoring opencode skills...');
  const opencodeSkillSrc = path.join(extractDir, 'opencode-skill');
  if (dirExists(opencodeSkillSrc)) {
    ensureDir(dirs.opencodeSkill);
    fse.copySync(opencodeSkillSrc, dirs.opencodeSkill, { overwrite: true });
    log(`  - Restored to: ${dirs.opencodeSkill}`);
  }

  log('Restoring agent skills...');
  const agentSkillsSrc = path.join(extractDir, 'agent-skills');
  if (dirExists(agentSkillsSrc)) {
    ensureDir(dirs.agentsSkills);
    fse.copySync(agentSkillsSrc, dirs.agentsSkills, { overwrite: true });
    log(`  - Restored to: ${dirs.agentsSkills}`);
  }

  log('Restoring MCP config...');
  const mcpConfigSrc = path.join(extractDir, 'mcp-config.json');
  if (fileExists(mcpConfigSrc)) {
    const backupMcp = readJson(mcpConfigSrc).mcp;
    const configDir = path.dirname(dirs.opencodeConfig);
    ensureDir(configDir);
    
    if (fileExists(dirs.opencodeConfig)) {
      const currentConfig = readJson(dirs.opencodeConfig);
      currentConfig.mcp = { ...currentConfig.mcp, ...backupMcp };
      writeJson(dirs.opencodeConfig, currentConfig);
      log('  - Merged MCP config');
    } else {
      writeJson(dirs.opencodeConfig, { mcp: backupMcp });
      log('  - Restored MCP config');
    }
  } else {
    log('  - No MCP config in backup');
  }

  log('Cleaning up temp files...');
  fse.removeSync(extractDir);

  success('Restore completed!');
  
  return { backupInfo };
}

function extractZip(zipPath, destDir) {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
}
