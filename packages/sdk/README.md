# @botmakers/sdk

Official SDK for BotMakers MCP Server - easily integrate email, calendar, contacts, and AI tools into your applications.

## Installation

```bash
npm install @botmakers/sdk
# or
yarn add @botmakers/sdk
# or
pnpm add @botmakers/sdk
```

## Quick Start

```typescript
import { createClient } from '@botmakers/sdk';

// Create a client instance
const client = createClient({
  baseUrl: 'https://api.yourcompany.com', // Your MCP server URL
  tenantId: 'your-tenant-id',              // Your tenant ID or slug
  apiKey: 'bm_live_xxxxx',                 // Optional: API key for auth
});

// List emails
const { emails } = await client.listEmails({ limit: 10 });
console.log('Recent emails:', emails);

// Send an email
await client.sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello from BotMakers!',
  body: '<p>This email was sent via the SDK.</p>',
});
```

## Configuration

```typescript
interface BotMakersConfig {
  /** Base URL of the MCP server */
  baseUrl: string;

  /** Your tenant ID or slug */
  tenantId: string;

  /** API key for authentication (optional) */
  apiKey?: string;

  /** Request timeout in ms (default: 30000) */
  timeout?: number;

  /** Enable debug logging */
  debug?: boolean;
}
```

## Features

### Integrations & Connections

```typescript
// List all available integrations
const { integrations, categories, stats } = await client.listIntegrations();
console.log(`${stats.connected} of ${stats.total} integrations connected`);

// Get specific integration details
const { integration, connection } = await client.getIntegration('openai');

// Create a new connection (BYOK mode)
await client.createConnection('openai', {
  name: 'My OpenAI Account',
  credentials: {
    apiKey: 'sk-xxx...',
  },
});

// Test a connection
const testResult = await client.testConnection('openai', connectionId);
if (!testResult.success) {
  console.error('Connection failed:', testResult.message);
}

// Check health of all connections
const { summary, connections } = await client.checkConnectionHealth();
console.log(`Healthy: ${summary.healthy}, Unhealthy: ${summary.unhealthy}`);
```

### Email Operations

```typescript
// List emails
const emails = await client.listEmails({
  folderId: 'inbox',
  limit: 20,
  unreadOnly: true,
});

// Get single email
const email = await client.getEmail('email-id');

// Send email
await client.sendEmail({
  to: ['alice@example.com', 'bob@example.com'],
  cc: 'manager@example.com',
  subject: 'Project Update',
  body: '<p>Here is the weekly update...</p>',
});

// Search emails
const results = await client.searchEmails({
  query: 'project report',
  from: 'team@company.com',
  hasAttachment: true,
  after: '2024-01-01',
});

// Email actions
await client.markEmailRead('email-id', true);
await client.starEmail('email-id', true);
await client.trashEmail('email-id');
await client.moveEmail('email-id', 'folder-id');
```

### Folder Management

```typescript
// List folders
const { folders } = await client.listFolders();

// Create folder
const { folder } = await client.createFolder('Project Archives', parentFolderId);

// Delete folder
await client.deleteFolder('folder-id');
```

### Calendar Operations

```typescript
// List calendars
const { calendars } = await client.listCalendars();

// List events
const { events } = await client.listEvents({
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z',
});

// Create event
await client.createEvent({
  title: 'Team Meeting',
  description: 'Weekly sync',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  participants: ['alice@company.com', 'bob@company.com'],
  conferencing: true,
});

// Check availability
const { slots } = await client.checkAvailability({
  emails: ['alice@company.com', 'bob@company.com'],
  startTime: '2024-01-15T09:00:00Z',
  endTime: '2024-01-15T17:00:00Z',
});
```

### Contact Operations

```typescript
// List contacts
const contacts = await client.listContacts({ limit: 50 });

// Search contacts
const { contacts } = await client.searchContacts({
  query: 'john smith',
});

// Create contact
await client.createContact({
  givenName: 'John',
  surname: 'Smith',
  emails: [{ email: 'john@example.com', type: 'work' }],
  phoneNumbers: [{ number: '+1234567890', type: 'mobile' }],
  companyName: 'Acme Corp',
});
```

### AI Tools

```typescript
// Draft a reply to an email
const { draft } = await client.draftReply({
  emailId: 'email-id',
  instructions: 'Politely decline the meeting request',
  tone: 'professional',
});

// Summarize an email thread
const { summary, actionItems, keyPoints } = await client.summarizeThread({
  emailId: 'email-id',
  includeActionItems: true,
});

// Extract action items
const { actionItems } = await client.extractActionItems({
  emailId: 'email-id',
});

// AI-powered email composition
const { email } = await client.smartCompose({
  prompt: 'Write a follow-up email about the Q4 sales report',
  tone: 'friendly',
});
```

### Usage & Billing

```typescript
// Get usage for current period
const { usage, total } = await client.getUsage();
console.log(`Total cost: $${total.estimatedCost}`);

// Get usage for specific period
const usage = await client.getUsage('2024-01');
```

### Generic Tool Calling

For advanced use cases, you can call any tool directly:

```typescript
const result = await client.callTool('custom_tool', {
  param1: 'value1',
  param2: 'value2',
});
```

## Error Handling

The SDK throws typed errors for different scenarios:

```typescript
import {
  BotMakersError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ConnectionError,
} from '@botmakers/sdk';

try {
  await client.sendEmail({ /* ... */ });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry later');
  } else if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.details);
  } else if (error instanceof ConnectionError) {
    console.error('Integration connection failed:', error.message);
  } else if (error instanceof BotMakersError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```

## OAuth Integration Flow

For integrations that use OAuth (Nylas, Microsoft 365, Google, etc.):

```typescript
// 1. Get the OAuth authorization URL
const { authUrl } = await client.getOAuthUrl('nylas');

// 2. Redirect user to authUrl for authentication
// User completes OAuth flow and is redirected back

// 3. Check connection status
const status = await client.getOAuthStatus('nylas');
if (status.connected) {
  console.log(`Connected as ${status.email}`);
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  Email,
  Calendar,
  CalendarEvent,
  Contact,
  Integration,
  ConnectionInfo,
  Tool,
} from '@botmakers/sdk';
```

## API Reference

### Client Methods

| Method | Description |
|--------|-------------|
| `health()` | Check server health |
| `getTools()` | List available tools |
| `listIntegrations()` | List all integrations |
| `getIntegration(id)` | Get integration details |
| `createConnection(id, params)` | Create new connection |
| `updateConnection(id, connId, params)` | Update connection |
| `deleteConnection(id, connId)` | Delete connection |
| `testConnection(id, connId)` | Test connection |
| `checkConnectionHealth()` | Health check all connections |
| `getOAuthUrl(id?)` | Get OAuth URL |
| `getOAuthStatus(id?)` | Check OAuth status |
| `listEmails(params?)` | List emails |
| `getEmail(id)` | Get single email |
| `sendEmail(params)` | Send email |
| `searchEmails(params)` | Search emails |
| `markEmailRead(id, read)` | Mark read/unread |
| `starEmail(id, starred)` | Star/unstar |
| `trashEmail(id)` | Move to trash |
| `moveEmail(id, folderId)` | Move to folder |
| `listFolders()` | List folders |
| `createFolder(name, parentId?)` | Create folder |
| `deleteFolder(id)` | Delete folder |
| `listCalendars()` | List calendars |
| `listEvents(params?)` | List events |
| `getEvent(id)` | Get event |
| `createEvent(params)` | Create event |
| `deleteEvent(id)` | Delete event |
| `checkAvailability(params)` | Free/busy check |
| `listContacts(params?)` | List contacts |
| `getContact(id)` | Get contact |
| `createContact(params)` | Create contact |
| `searchContacts(params)` | Search contacts |
| `draftReply(params)` | AI draft reply |
| `summarizeThread(params)` | AI summarize |
| `extractActionItems(params)` | AI extract items |
| `smartCompose(params)` | AI compose |
| `getUsage(period?)` | Get usage |
| `callTool(name, params)` | Generic tool call |

## License

MIT
