import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import routes
import authRoutes from './routes/auth.js';
import integrationRoutes from './routes/integrations.js';
import apiKeyRoutes from './routes/apiKeys.js';

// Import integrations
import { integrationRegistry } from './integrations/index.js';

// Import middleware
import { optionalApiKey } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';

// Import usage tracking
import { trackUsageAsync } from './lib/usage.js';

// Import tools
import * as emailTools from './tools/emails.js';
import * as calendarTools from './tools/calendar.js';
import * as contactTools from './tools/contacts.js';
import * as aiTools from './tools/ai.js';

const app = express();
const PORT = process.env.PORT || 3050;

app.use(cors());
app.use(express.json());

// Apply optional API key auth to all requests
app.use(optionalApiKey);

// Apply rate limiting to all requests
app.use(rateLimit());

// ===========================================
// AUTH ROUTES (OAuth flow)
// ===========================================
app.use('/auth', authRoutes);

// ===========================================
// INTEGRATION ROUTES (Multi-provider OAuth)
// ===========================================
app.use('/integrations', integrationRoutes);

// ===========================================
// API KEY MANAGEMENT ROUTES
// ===========================================
app.use('/api-keys', apiKeyRoutes);

// ===========================================
// TOOL REGISTRY
// ===========================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: Record<string, (params: any) => Promise<unknown>> = {
  // Email
  list_emails: emailTools.listEmails,
  get_email: emailTools.getEmail,
  send_email: emailTools.sendEmail,
  move_email: emailTools.moveEmail,
  mark_read: emailTools.markRead,
  star_email: emailTools.starEmail,
  trash_email: emailTools.trashEmail,
  search_emails: emailTools.searchEmails,
  list_folders: emailTools.listFolders,

  // Calendar
  list_calendars: calendarTools.listCalendars,
  list_events: calendarTools.listEvents,
  get_event: calendarTools.getEvent,
  create_event: calendarTools.createEvent,
  delete_event: calendarTools.deleteEvent,
  check_availability: calendarTools.checkAvailability,

  // Contacts
  list_contacts: contactTools.listContacts,
  get_contact: contactTools.getContact,
  create_contact: contactTools.createContact,
  search_contacts: contactTools.searchContacts,

  // AI
  draft_reply: aiTools.draftReply,
  summarize_thread: aiTools.summarizeThread,
  extract_action_items: aiTools.extractActionItems,
  smart_compose: aiTools.smartCompose,
};

// ===========================================
// API ENDPOINTS
// ===========================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tools: Object.keys(tools) });
});

// List tools
app.get('/tools', (req, res) => {
  const toolList = [
    // Email
    { name: 'list_emails', category: 'email', description: 'List emails from inbox or folder' },
    { name: 'get_email', category: 'email', description: 'Get single email with full body' },
    { name: 'send_email', category: 'email', description: 'Send new email or reply' },
    { name: 'move_email', category: 'email', description: 'Move email to folder' },
    { name: 'mark_read', category: 'email', description: 'Mark email as read/unread' },
    { name: 'star_email', category: 'email', description: 'Star/unstar email' },
    { name: 'trash_email', category: 'email', description: 'Move email to trash' },
    { name: 'search_emails', category: 'email', description: 'Search emails' },
    { name: 'list_folders', category: 'email', description: 'List email folders' },

    // Calendar
    { name: 'list_calendars', category: 'calendar', description: 'List calendars' },
    { name: 'list_events', category: 'calendar', description: 'List calendar events' },
    { name: 'get_event', category: 'calendar', description: 'Get single event' },
    { name: 'create_event', category: 'calendar', description: 'Create calendar event' },
    { name: 'delete_event', category: 'calendar', description: 'Delete event' },
    { name: 'check_availability', category: 'calendar', description: 'Check free/busy times' },

    // Contacts
    { name: 'list_contacts', category: 'contacts', description: 'List contacts' },
    { name: 'get_contact', category: 'contacts', description: 'Get single contact' },
    { name: 'create_contact', category: 'contacts', description: 'Create contact' },
    { name: 'search_contacts', category: 'contacts', description: 'Search contacts' },

    // AI
    { name: 'draft_reply', category: 'ai', description: 'AI drafts reply to email' },
    { name: 'summarize_thread', category: 'ai', description: 'AI summarizes email thread' },
    { name: 'extract_action_items', category: 'ai', description: 'AI extracts action items' },
    { name: 'smart_compose', category: 'ai', description: 'AI composes email from prompt' },
  ];

  res.json({ tools: toolList });
});

// Call a tool
app.post('/call', async (req, res) => {
  const { tool, params } = req.body;

  if (!tool || !tools[tool]) {
    return res.status(400).json({
      success: false,
      error: `Unknown tool: ${tool}`,
    });
  }

  try {
    const result = await tools[tool](params || {});

    // Track usage if tenant is known
    const tenantId = req.tenantId || params?.tenant_id;
    if (tenantId) {
      // Determine integration from tool name
      const integration = tool.startsWith('msgraph_') ? 'msgraph' : 'nylas';
      trackUsageAsync({ tenantId, integrationId: integration, tool });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// CONVENIENCE ENDPOINTS
// ===========================================

// Emails
app.get('/emails/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { folder, limit, pageToken, unreadOnly } = req.query;

  const result = await emailTools.listEmails({
    tenant_id: tenantId,
    folder_id: folder as string,
    limit: limit ? parseInt(limit as string) : undefined,
    page_token: pageToken as string,
    unread_only: unreadOnly === 'true',
  });

  res.json(result);
});

app.get('/emails/:tenantId/:emailId', async (req, res) => {
  const { tenantId, emailId } = req.params;
  const result = await emailTools.getEmail({ tenant_id: tenantId, email_id: emailId });
  res.json(result);
});

// Folders
app.get('/folders/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const result = await emailTools.listFolders({ tenant_id: tenantId });
  res.json(result);
});

// Calendar
app.get('/calendars/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const result = await calendarTools.listCalendars({ tenant_id: tenantId });
  res.json(result);
});

app.get('/events/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { calendarId, startTime, endTime, limit } = req.query;

  const result = await calendarTools.listEvents({
    tenant_id: tenantId,
    calendar_id: calendarId as string,
    start_time: startTime as string,
    end_time: endTime as string,
    limit: limit ? parseInt(limit as string) : undefined,
  });

  res.json(result);
});

// Contacts
app.get('/contacts/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { limit, pageToken } = req.query;

  const result = await contactTools.listContacts({
    tenant_id: tenantId,
    limit: limit ? parseInt(limit as string) : undefined,
    page_token: pageToken as string,
  });

  res.json(result);
});

// ===========================================
// START SERVER
// ===========================================

const HOST = '0.0.0.0';

async function startServer() {
  // Initialize all integrations
  await integrationRegistry.initializeAll();

  app.listen(Number(PORT), HOST, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           BotMakers MCP SaaS Platform                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server:       http://${HOST}:${PORT}                          ║
║  Health:       /health                                    ║
║  Tools:        /tools                                     ║
║                                                           ║
║  Nylas OAuth (Email/Calendar/Contacts):                   ║
║  - Connect:    /auth/connect/:tenantId                    ║
║  - Status:     /auth/status/:tenantId                     ║
║                                                           ║
║  Multi-Integration OAuth:                                 ║
║  - List:       /integrations                              ║
║  - Connect:    /integrations/:id/connect/:tenant          ║
║  - Status:     /integrations/:id/status/:tenant           ║
║                                                           ║
║  API Keys & Usage:                                        ║
║  - Keys:       /api-keys/:tenant                          ║
║  - Usage:      /api-keys/:tenant/usage                    ║
║  - Billing:    /api-keys/:tenant/billing                  ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
