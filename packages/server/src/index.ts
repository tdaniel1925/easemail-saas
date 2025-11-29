import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import routes
import authRoutes from './routes/auth.js';

// Import tools
import * as emailTools from './tools/emails.js';
import * as calendarTools from './tools/calendar.js';
import * as contactTools from './tools/contacts.js';
import * as aiTools from './tools/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ===========================================
// AUTH ROUTES (OAuth flow)
// ===========================================
app.use('/auth', authRoutes);

// ===========================================
// TOOL REGISTRY
// ===========================================
const tools: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
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

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║         EaseMail SaaS API Server                  ║
╠═══════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                  ║
║  Health:    http://localhost:${PORT}/health           ║
║  Tools:     http://localhost:${PORT}/tools            ║
║                                                   ║
║  OAuth:                                           ║
║  - Connect:    /auth/connect/:tenantId            ║
║  - Callback:   /auth/callback                     ║
║  - Status:     /auth/status/:tenantId             ║
║  - Disconnect: /auth/disconnect/:tenantId         ║
╚═══════════════════════════════════════════════════╝
  `);
});
