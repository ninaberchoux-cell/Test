# Vacation Inbox Assistant

AI-powered email delegation system for Microsoft 365. Automatically delegates, triages, and tracks emails when employees are on vacation.

## Features

- **Vacation Setup** — Configure backup colleague, reminder schedule, and escalation rules
- **AI Email Triage** — GPT-4 powered classification, summarization, and draft generation
- **Auto Delegation** — Microsoft Graph webhook processes emails in real-time
- **Smart Reminders** — Escalating reminders via Teams, Outlook, and in-app
- **Return Summary** — AI briefing when you return from vacation
- **Analytics** — SLA compliance, response times, coverage performance
- **Enterprise Ready** — Multi-tenant, RBAC, GDPR, audit logs

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Queue | Bull + Redis |
| Auth | Microsoft SSO / NextAuth.js |
| AI | OpenAI GPT-4o-mini |
| Integration | Microsoft Graph API |

## Project Structure

```
apps/
  web/          # Next.js frontend
  api/          # Express REST API
packages/
  database/     # Prisma schema + client
nginx/          # Reverse proxy config
.github/        # CI/CD workflows
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Microsoft Azure AD app registration
- OpenAI API key

### 1. Clone and install

```bash
git clone <repo>
cd vacation-inbox-assistant
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start with Docker

```bash
docker-compose up -d
npm run db:migrate
npm run db:generate
```

### 4. Or run locally

```bash
# Start postgres + redis via docker
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate

# Start dev servers
npm run dev
```

App runs at:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. New registration → name it "Vacation Inbox Assistant"
3. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
4. API permissions: `Mail.ReadWrite`, `Mail.Send`, `Calendars.Read`, `offline_access`
5. Copy Client ID, Client Secret, Tenant ID to `.env`

## Microsoft Graph Webhooks

The API receives real-time notifications when emails arrive. For local development, use [ngrok](https://ngrok.com):

```bash
ngrok http 3001
# Copy the HTTPS URL to API_URL in .env
```

## Database Schema

Key models:
- **Organization** — Multi-tenant root
- **User** — Microsoft 365 users with encrypted OAuth tokens
- **VacationPeriod** — Vacation settings with delegation config
- **Email** — Incoming emails with AI analysis
- **Reminder** — Scheduled reminders via Bull queue
- **VacationSummary** — AI-generated return briefing

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/auth/microsoft` | Microsoft OAuth callback |
| GET/POST | `/vacation` | Vacation period management |
| GET | `/emails` | List user emails |
| GET | `/delegations` | Emails delegated to me |
| POST | `/ai/summarize/:id` | AI email analysis |
| POST | `/ai/vacation-summary/:id` | Generate return summary |
| GET | `/analytics/overview` | Dashboard stats |
| POST | `/webhooks/graph` | Microsoft Graph notifications |

## Deployment

### Production with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment variables for production

Set these in your hosting environment:
- `DATABASE_URL` — PostgreSQL connection string
- `AZURE_AD_CLIENT_ID/SECRET/TENANT_ID` — Azure credentials
- `OPENAI_API_KEY` — OpenAI key
- `NEXTAUTH_SECRET` — Random 32-char string
- `ENCRYPTION_KEY` — 32-byte hex for token encryption

## License

MIT
