import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBackup } from './backup.js';
import { restoreBackup } from './restore.js';
import { log, error, success } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const args = process.argv.slice(2);
const command = args[0];

const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;
const DROPBOX_FOLDER = process.env.DROPBOX_FOLDER || 'OpenCodeBackup';

async function main() {
  console.log(`
╔═══════════════════════════════════════════╗
║     OpenCode Backup Tool v1.0.0          ║
╚═══════════════════════════════════════════╝
  `);

  if (!command) {
    console.log(`
Usage:
  npm run backup    - Create backup and upload to Dropbox
  npm run restore   - Restore from Dropbox or local backup

Environment variables (copy from .env.example):
  DROPBOX_TOKEN=your_dropbox_access_token_here
  DROPBOX_FOLDER=OpenCodeBackup
    `);
    process.exit(1);
  }

  if (!DROPBOX_TOKEN) {
    error('DROPBOX_TOKEN not found. Copy .env.example to .env and add your token.');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'backup':
        log('=== BACKUP MODE ===');
        await createBackup(DROPBOX_TOKEN, DROPBOX_FOLDER);
        success('Backup completed successfully!');
        break;

      case 'restore':
        log('=== RESTORE MODE ===');
        const localPath = args[1] || null;
        await restoreBackup(DROPBOX_TOKEN, DROPBOX_FOLDER, localPath);
        success('Restore completed successfully!');
        break;

      default:
        error(`Unknown command: ${command}`);
        console.log('Use "backup" or "restore"');
        process.exit(1);
    }
  } catch (err) {
    error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
