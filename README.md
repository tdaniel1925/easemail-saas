# EaseMail SaaS

Multi-tenant email, calendar, and contacts API powered by Nylas.

## Architecture

```
┌─────────────────────────┐
│   Your Frontend App     │
└───────────┬─────────────┘
            │ HTTP
┌───────────▼─────────────┐
│   EaseMail API Server   │  ← This project
│   (Multi-tenant)        │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│      Nylas API          │
│  Email│Calendar│Contacts│
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ Gmail│Outlook│Yahoo│etc │
└─────────────────────────┘
```

## Features

- **Multi-tenant**: Each customer gets their own email connection
- **Email**: List, read, send, reply, search, folders
- **Calendar**: List events, create events, check availability
- **Contacts**: List, create, search contacts
- **AI**: Draft replies, summarize threads, extract action items

---

# STEP-BY-STEP SETUP GUIDE

## Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL** database (local or Railway)
3. **Nylas account** (free to start): https://dashboard.nylas.com
4. **GitHub account**
5. **Railway account** (for deployment): https://railway.com

---

## STEP 1: Create Nylas Application

1. Go to https://dashboard.nylas.com
2. Sign up / Log in
3. Create a new application
4. Note down:
   - **Client ID**
   - **API Key** (create one in API Keys section)
5. Go to "Hosted Authentication" settings
6. Add callback URL: `http://localhost:3001/auth/callback`

---

## STEP 2: Clone and Setup Project

```bash
# Clone the repo (after you push it)
git clone https://github.com/YOUR_USERNAME/easemail-saas.git
cd easemail-saas

# Install dependencies
npm install
```

---

## STEP 3: Configure Environment

```bash
cd packages/server
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/easemail_saas"

NYLAS_CLIENT_ID="your-client-id-from-step-1"
NYLAS_API_KEY="your-api-key-from-step-1"
NYLAS_API_URI="https://api.us.nylas.com"

ANTHROPIC_API_KEY="your-anthropic-key"

PORT=3001
APP_URL="http://localhost:3000"
SERVER_URL="http://localhost:3001"
OAUTH_CALLBACK_URL="http://localhost:3001/auth/callback"
```

---

## STEP 4: Setup Database

```bash
# From root directory
npm run db:generate
npm run db:push
npm run db:seed
```

This creates a test tenant with slug `test-tenant`.

---

## STEP 5: Start the Server

```bash
npm run dev:server
```

You should see:

```
╔═══════════════════════════════════════════════════╗
║         EaseMail SaaS API Server                  ║
╠═══════════════════════════════════════════════════╣
║  Server:    http://localhost:3001                 ║
║  Health:    http://localhost:3001/health          ║
║  Tools:     http://localhost:3001/tools           ║
╚═══════════════════════════════════════════════════╝
```

---

## STEP 6: Connect Your Email (Test It!)

1. Open browser: `http://localhost:3001/auth/connect/test-tenant`
2. You'll see Google/Microsoft login screen
3. Authorize access
4. You'll be redirected back (to APP_URL with success message)

Check it worked:

```bash
curl http://localhost:3001/auth/status/test-tenant
```

Should return:

```json
{
  "connected": true,
  "email": "your-email@gmail.com",
  "provider": "google"
}
```

---

## STEP 7: Test the API

```bash
# List emails
curl http://localhost:3001/emails/test-tenant

# Get folders
curl http://localhost:3001/folders/test-tenant

# List calendars
curl http://localhost:3001/calendars/test-tenant

# List contacts
curl http://localhost:3001/contacts/test-tenant

# Call any tool
curl -X POST http://localhost:3001/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_emails", "params": {"tenant_id": "test-tenant", "limit": 10}}'
```

---

## STEP 8: Deploy to Railway

### 8.1 Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 8.2 Create Railway Project

1. Go to https://railway.com
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your easemail-saas repo

### 8.3 Add PostgreSQL

1. In Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Wait for it to provision

### 8.4 Configure Server Service

1. Click on your service (the GitHub one)
2. Go to "Settings" tab
3. Set:
   - **Root Directory**: `packages/server`
   - **Build Command**: `npm install && npm run db:generate && npm run build`
   - **Start Command**: `npm run start`

### 8.5 Add Environment Variables

In Railway, go to "Variables" tab and add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NYLAS_CLIENT_ID=your-client-id
NYLAS_API_KEY=your-api-key
NYLAS_API_URI=https://api.us.nylas.com
ANTHROPIC_API_KEY=your-key
PORT=3001
APP_URL=https://your-frontend-url.com
SERVER_URL=https://your-railway-url.up.railway.app
OAUTH_CALLBACK_URL=https://your-railway-url.up.railway.app/auth/callback
```

### 8.6 Update Nylas Callback URL

Go back to Nylas dashboard and add your Railway URL to allowed callbacks:

```
https://your-railway-url.up.railway.app/auth/callback
```

### 8.7 Deploy

Railway auto-deploys on push. Check the deployment logs.

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/connect/:tenantId` | GET | Start OAuth flow |
| `/auth/callback` | GET | OAuth callback (Nylas redirects here) |
| `/auth/status/:tenantId` | GET | Check connection status |
| `/auth/disconnect/:tenantId` | POST | Disconnect email |

### Tools (via POST /call)

```json
{
  "tool": "tool_name",
  "params": { ... }
}
```

#### Email Tools
- `list_emails` - List emails
- `get_email` - Get single email
- `send_email` - Send email
- `move_email` - Move to folder
- `mark_read` - Mark read/unread
- `star_email` - Star/unstar
- `trash_email` - Delete
- `search_emails` - Search
- `list_folders` - List folders

#### Calendar Tools
- `list_calendars` - List calendars
- `list_events` - List events
- `get_event` - Get event
- `create_event` - Create event
- `delete_event` - Delete event
- `check_availability` - Check free/busy

#### Contact Tools
- `list_contacts` - List contacts
- `get_contact` - Get contact
- `create_contact` - Create contact
- `search_contacts` - Search

#### AI Tools
- `draft_reply` - AI drafts reply
- `summarize_thread` - AI summarizes thread
- `extract_action_items` - AI extracts todos
- `smart_compose` - AI writes email

---

## Adding New Tenants

```bash
# Via Prisma Studio
npm run db:studio

# Or via API (you'd need to build this endpoint)
# Or directly in database
```

---

## Project Structure

```
easemail-saas/
├── packages/
│   └── server/
│       ├── src/
│       │   ├── index.ts          # Main server
│       │   ├── routes/
│       │   │   └── auth.ts       # OAuth routes
│       │   ├── tools/
│       │   │   ├── emails.ts     # Email tools
│       │   │   ├── calendar.ts   # Calendar tools
│       │   │   ├── contacts.ts   # Contact tools
│       │   │   └── ai.ts         # AI tools
│       │   └── lib/
│       │       ├── db.ts         # Database client
│       │       ├── nylas.ts      # Nylas client
│       │       └── ai.ts         # Anthropic client
│       └── prisma/
│           └── schema.prisma
├── package.json
└── turbo.json
```

---

## Next Steps

1. **Build Frontend**: Create Next.js app that calls this API
2. **Add Auth**: Protect endpoints with JWT or session auth
3. **Add Webhooks**: Receive real-time updates from Nylas
4. **Add Caching**: Cache emails locally for faster loading

---

## License

Proprietary - BotMakers Inc.
