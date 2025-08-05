# Relearn v2

A system that helps you rediscover valuable insights from your screenshot collection. It automatically processes screenshots stored in Google Drive using OCR, extracts text content, and sends daily reminders via Slack.

## 🚀 Features

- **Google Drive Integration**: Automatically fetches screenshots from your Google Drive folder
- **AI-Powered OCR**: Uses Google's Gemini API to extract text from images
- **Smart Storage**: Stores processed data in Cloudflare D1 database with Prisma ORM
- **Daily Reminders**: Sends random screenshots to your Slack channel
- **GitHub Actions**: Manual and scheduled execution support
- **TypeScript**: Fully typed with strict mode for reliability

## 📋 Prerequisites

- Node.js 22.0.0 or higher
- Google Cloud Platform account (for Drive API)
- Cloudflare account (for D1 database)
- Slack workspace (for notifications)
- Google AI Studio account (for Gemini API)

## 🛠️ Setup

For detailed setup instructions, see [docs/setup.md](./docs/setup.md).

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/relearn.git
   cd relearn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.sample .env
   # Edit .env with your credentials
   ```

4. **Set up the database**
   ```bash
   npm run db:create
   npm run db:migrate:dev
   npm run db:generate
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

## 🤖 GitHub Actions Setup

### Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `GOOGLE_SERVICE_ACCOUNT_KEY` - Google Cloud service account JSON key
- `GOOGLE_DRIVE_FOLDER_ID` - ID of your Google Drive folder containing screenshots
- `SLACK_WEBHOOK_URL` - Slack incoming webhook URL
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with D1 permissions
- `CLOUDFLARE_DATABASE_ID` - Your D1 database ID
- `GEMINI_API_KEY` - Google AI Studio API key for Gemini

### Manual Execution

1. Go to Actions tab in your GitHub repository
2. Select "Manual Relearn Execution" workflow
3. Click "Run workflow"
4. Choose options:
   - **Image count**: Number of images to process (1, 3, 5, or 10)
   - **Environment**: Production or Development
5. Click "Run workflow" button

### Scheduled Execution

The system automatically runs daily at 9:00 PM JST (12:00 PM UTC). You can modify the schedule in `.github/workflows/scheduled-relearn.yml`.

## 📁 Project Structure

```
relearn/
├── src/
│   ├── cloudflare/      # Cloudflare D1 and Workers integration
│   ├── googledrive/     # Google Drive API client
│   ├── llm/             # Gemini API integration for OCR
│   ├── relearn/         # Core business logic
│   ├── slack/           # Slack notification service
│   └── scripts/         # Utility scripts
├── prisma/              # Database schema and migrations
├── .github/workflows/   # GitHub Actions workflows
└── docs/                # Documentation
```

## 🔧 Development

### Commands

```bash
# Development
npm run dev              # Run the application
npm run dev:watch        # Run with file watching
npm run github:action    # Run GitHub Actions script locally

# Code Quality
npm run lint             # Run linter
npm run format           # Format code
npm run check            # Run linter and formatter
npm run type-check       # Check TypeScript types

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate:dev   # Run migrations (local)
npm run db:migrate:prod  # Run migrations (production)
npm run db:studio        # Open Prisma Studio
```

### Testing GitHub Actions Locally

You can test the GitHub Actions runner script locally:

```bash
# Set required environment variables
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
export GOOGLE_DRIVE_FOLDER_ID='your-folder-id'
# ... set other required variables

# Run the action script
npm run github:action
```

## 🔐 Security Notes

- Never commit `.env` files or secrets to the repository
- Use GitHub Secrets for all sensitive information
- Service account keys should have minimal required permissions
- Regularly rotate API keys and tokens

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request