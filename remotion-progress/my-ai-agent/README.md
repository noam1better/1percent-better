# 1% Better — AI Agent Bot

Telegram bot that uses Puppeteer to automate browser walkthroughs of the 1% Better app, capture screenshot sequences, and deliver them as Telegram media groups.

## Commands

| Command | Action |
|---|---|
| `Generate video` | Full automated walkthrough → screenshot album |
| Any `https://` URL | Open URL, screenshot, send to chat |

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `telegraf` | 4.16.3 | Telegram Bot API client |
| `puppeteer` | 25.1.0 | Headless Chromium browser automation |
| `fluent-ffmpeg` | 2.1.3 | Video encoding (optional, unused in current mode) |

## Security & Privacy

### Data handling
- **No persistent storage.** Screenshots are written to the OS temp directory (`/tmp`) only for the duration of a single request.
- **Secure deletion.** Every screenshot file is overwritten with zero bytes before being unlinked from disk. This prevents forensic recovery of sensitive screen content on shared or regulated infrastructure.
- **No database.** No user messages, URLs, or captured images are logged to any database or external service.

### AI training
- **Zero data retention for training.** Captured screenshots and user inputs are never sent to any AI training pipeline, third-party analytics service, or cloud storage bucket. They exist in memory and on disk only for the seconds required to send them via the Telegram API.

### Secrets
- The bot token is supplied via the `BOT_TOKEN` environment variable and is never hardcoded or committed to source control.

### Dependency audit
Run at any time:
```sh
npm audit
```
Current status: **0 vulnerabilities** (audited 2026-06-16).

### Recommendations for financial firm deployment
1. Run the bot inside a private VPC with no public ingress beyond the Telegram webhook.
2. Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) to inject `BOT_TOKEN` at runtime.
3. Mount `/tmp` as a `tmpfs` (RAM disk) so screenshot bytes never touch persistent storage.
4. Enable OS-level audit logging (`auditd`) on the host for compliance traceability.
5. Restrict egress to Telegram API IPs only (`149.154.160.0/20`, `91.108.4.0/22`).
