# OpenCode Backup Tool

Backup và restore tool cho OpenCode skills, MCP config, và plugin config.

## Tính năng

- Backup OpenCode skills
- Backup Agent skills
- Backup MCP config
- Backup Plugin config
- Upload lên Dropbox
- Restore từ Dropbox

## Cài đặt

```bash
npm install
```

## Cấu hình

Tạo file `.env`:

```env
DROPBOX_TOKEN=your_dropbox_access_token
DROPBOX_FOLDER=OpenCodeBackup
```

### Cách lấy Dropbox Token

1. Tạo app tại [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Chọn "Scoped access" và "App folder"
3. Generate access token từ Settings > Permissions > Generate

## Sử dụng

### Backup

```bash
npm run backup
```

### Restore

```bash
npm run restore
```

## Backup bao gồm

| Loại | Đường dẫn |
|------|------------|
| OpenCode Skills | `~/.config/opencode/skill/` |
| Agent Skills | `~/.agents/skills/` |
| MCP Config | `~/.config/opencode/opencode.json` |
| Plugin Config | `~/.config/opencode/opencode.json` |

## Notes

- Mỗi backup tạo file riêng với timestamp, không overwrite
- Restore sẽ lấy file mới nhất từ Dropbox
- MCP config sẽ được merge với config hiện tại
