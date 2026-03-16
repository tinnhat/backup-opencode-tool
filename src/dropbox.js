import { Dropbox } from 'dropbox';
import fs from 'fs';
import { log, error } from './utils.js';

export class DropboxService {
  constructor(accessToken, folderPath) {
    this.accessToken = accessToken;
    this.folderPath = folderPath;
    this.dbx = new Dropbox({ accessToken });
  }

  async uploadFile(filePath, fileName) {
    try {
      const folderPath = this.folderPath || '';
      if (folderPath) {
        try {
          await this.dbx.filesCreateFolderV2({ path: `/${folderPath}` });
        } catch (folderErr) {
          // Folder may already exist
        }
      }
      
      const fileContent = fs.readFileSync(filePath);
      const uploadPath = folderPath ? `/${folderPath}/${fileName}` : `/${fileName}`;
      
      const response = await this.dbx.filesUpload({
        path: uploadPath,
        contents: fileContent,
        mode: 'overwrite',
        autorename: false,
        mute: false
      });

      log(`Uploaded: ${fileName}`);
      return response.result;
    } catch (err) {
      error(`Failed to upload ${fileName}: ${err.message || err.error?.error_summary}`);
      throw err;
    }
  }

  async deleteFile(fileName) {
    try {
      const path = this.folderPath ? `/${this.folderPath}/${fileName}` : `/${fileName}`;
      await this.dbx.filesDelete({ path });
      log(`Deleted: ${fileName}`);
    } catch (err) {
      error(`Failed to delete ${fileName}: ${err.message}`);
    }
  }

  async listFiles() {
    try {
      const folderPath = this.folderPath || '';
      const path = folderPath ? `/${folderPath}` : '';
      const response = await this.dbx.filesListFolder({ path });
      return response.result.entries || [];
    } catch (err) {
      error(`Failed to list files: ${err.message}`);
      throw err;
    }
  }

  async findFileByName(fileName) {
    try {
      const path = this.folderPath ? `/${this.folderPath}/${fileName}` : `/${fileName}`;
      await this.dbx.filesGetMetadata({ path });
      return { name: fileName };
    } catch (err) {
      if (err.status === 404 || (err.error && err.error['.tag'] === 'path_not_found')) {
        return null;
      }
      if (err.status === 409) {
        return { name: fileName };
      }
      return null;
    }
  }

  async downloadFile(fileName, destPath) {
    try {
      const folderPath = this.folderPath || '';
      const path = folderPath ? `/${folderPath}/${fileName}` : `/${fileName}`;
      const response = await this.dbx.filesDownload({ path });
      const fileBinary = response.result.fileBinary;
      fs.writeFileSync(destPath, Buffer.from(fileBinary));
      log(`Downloaded: ${fileName}`);
      return destPath;
    } catch (err) {
      error(`Failed to download ${fileName}: ${err.message}`);
      throw err;
    }
  }

  async getLatestBackup() {
    const files = await this.listFiles();
    if (files.length === 0) {
      return null;
    }
    const backupFiles = files
      .filter(f => f['.tag'] === 'file' && f.name.startsWith('opencode-backup-') && f.name.endsWith('.zip'))
      .sort((a, b) => new Date(b.server_modified) - new Date(a.server_modified));
    return backupFiles[0] || null;
  }

  async uploadWithReplace(localPath, fileName) {
    return this.uploadFile(localPath, fileName);
  }
}
