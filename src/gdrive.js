import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { log, error, ensureDir } from './utils.js';
import os from 'os';
import readline from 'readline';

export class GoogleDriveService {
  constructor(credentialsPath, folderId) {
    this.folderId = folderId;
    this.credentialsPath = credentialsPath;
    this.drive = null;
    this.oauth2Client = null;
    this.tokenPath = path.join(os.homedir(), '.backup-opencode', 'token.json');
  }

  async authenticate() {
    const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8')).installed;
    
    this.oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      'http://localhost'
    );

    const token = await this.loadToken();
    
    if (token) {
      this.oauth2Client.setCredentials(token);
      log('Loaded existing token');
    } else {
      await this.getNewToken();
    }

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    log('Authenticated with Google Drive');
  }

  async loadToken() {
    if (fs.existsSync(this.tokenPath)) {
      return JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
    }
    return null;
  }

  async saveToken(token) {
    ensureDir(path.dirname(this.tokenPath));
    fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2));
    log('Token saved');
  }

  async getNewToken() {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file']
    });

    console.log('\n========================================');
    console.log('Authorize this app by visiting this URL:');
    console.log(authUrl);
    console.log('========================================\n');

    const code = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Enter the authorization code: ', (code) => {
        rl.close();
        resolve(code);
      });
    });

    const { tokens } = await this.oauth2Client.getToken(code);
    await this.saveToken(tokens);
    this.oauth2Client.setCredentials(tokens);
  }

  async uploadFile(filePath, fileName) {
    if (!this.drive) {
      await this.authenticate();
    }

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId]
        },
        media: {
          body: fs.createReadStream(filePath)
        }
      });

      log(`Uploaded: ${fileName} (ID: ${response.data.id})`);
      return response.data;
    } catch (err) {
      error(`Failed to upload ${fileName}: ${err.message}`);
      throw err;
    }
  }

  async deleteFile(fileId) {
    if (!this.drive) {
      await this.authenticate();
    }

    try {
      await this.drive.files.delete({ fileId });
      log(`Deleted file: ${fileId}`);
    } catch (err) {
      error(`Failed to delete ${fileId}: ${err.message}`);
    }
  }

  async listFiles() {
    if (!this.drive) {
      await this.authenticate();
    }

    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents`,
        fields: 'files(id, name, modifiedTime)'
      });

      return response.data.files || [];
    } catch (err) {
      error(`Failed to list files: ${err.message}`);
      throw err;
    }
  }

  async findFileByName(fileName) {
    const files = await this.listFiles();
    return files.find(f => f.name === fileName);
  }

  async downloadFile(fileId, destPath) {
    if (!this.drive) {
      await this.authenticate();
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(destPath);

      await new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            log(`Downloaded file to: ${destPath}`);
            resolve();
          })
          .on('error', (err) => {
            error(`Download error: ${err.message}`);
            reject(err);
          })
          .pipe(writer);
      });

      return destPath;
    } catch (err) {
      error(`Failed to download file: ${err.message}`);
      throw err;
    }
  }

  async getLatestBackup() {
    const files = await this.listFiles();
    
    if (files.length === 0) {
      return null;
    }

    const backupFiles = files
      .filter(f => f.name.startsWith('opencode-backup-') && f.name.endsWith('.zip'))
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

    return backupFiles[0] || null;
  }

  async uploadWithReplace(localPath, fileName) {
    const existingFile = await this.findFileByName(fileName);
    
    if (existingFile) {
      log(`Replacing existing file: ${fileName}`);
      await this.deleteFile(existingFile.id);
    }

    return this.uploadFile(localPath, fileName);
  }
}
