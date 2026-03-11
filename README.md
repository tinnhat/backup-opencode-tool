# Backup OpenCode

Backup tool cho opencode skills và MCP configuration với Google Drive sync.

## Features

- Backup skills từ `~/.opencode/skill/` và `~/.agents/skills/`
- Backup MCP config từ `~/.opencode/config.json`
- Upload lên Google Drive (Service Account)
- Restore từ Google Drive hoặc local backup
- Cross-platform: Mac và Windows

## Prerequisites

1. Node.js >= 18
2. Google Cloud Project với Drive API enabled
3. Service Account credentials

## Setup

### 1. Google Drive Setup

1. Tạo project trên [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Drive API
3. Tạo Service Account và download JSON credentials
4. Tạo folder trên Google Drive và share với service account email

### 2. Environment Variables

Tạo file `.env`:

```env
GOOGLE_CREDENTIALS_PATH=./your-credentials.json
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

### 3. Install Dependencies

```bash
npm install
```

## Usage

### Backup

```bash
npm run backup
```

Tạo backup và upload lên Google Drive.

### Restore

```bash
npm run restore
```

Download và restore từ Google Drive.

### Restore từ local file

```bash
npm run restore ./path/to/backup.zip
```

## Backup Contents

- `opencode-skill/` - Skills từ ~/.opencode/skill/
- `agent-skills/` - Skills từ ~/.agents/skills/
- `mcp-config.json` - MCP configuration
- `backup-info.json` - Metadata

## License

MIT
