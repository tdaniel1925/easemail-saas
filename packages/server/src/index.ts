import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import routes
import authRoutes from './routes/auth.js';
import integrationRoutes from './routes/integrations.js';
import apiKeyRoutes from './routes/apiKeys.js';
import folderRoutes from './routes/folders.js';
import contactRoutes from './routes/contacts.js';
import calendarRoutes from './routes/calendar.js';
import adminIntegrationsRoutes from './routes/admin/integrations.js';
import connectionsRoutes from './routes/connections.js';

// Import integrations
import { integrationRegistry } from './integrations/index.js';

// Import middleware
import { optionalApiKey } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';

// Import usage tracking
import { trackUsageAsync, trackPlatformUsageAsync } from './lib/usage.js';

// Import tools
import * as emailTools from './tools/emails.js';
import * as calendarTools from './tools/calendar.js';
import * as contactTools from './tools/contacts.js';
import * as aiTools from './tools/ai.js';
import * as googleCalendarTools from './tools/google-calendar.js';
import * as calComTools from './tools/cal-com.js';
import * as dialpadTools from './tools/dialpad.js';

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
// FOLDER SYNC ROUTES
// ===========================================
app.use('/folders', folderRoutes);

// ===========================================
// CONTACT SYNC ROUTES
// ===========================================
app.use('/contacts-sync', contactRoutes);

// ===========================================
// CALENDAR SYNC ROUTES
// ===========================================
app.use('/calendar-sync', calendarRoutes);

// ===========================================
// ADMIN ROUTES (Platform Configuration)
// ===========================================
app.use('/admin/integrations', adminIntegrationsRoutes);

// ===========================================
// CUSTOMER CONNECTIONS ROUTES (BYOK)
// ===========================================
app.use('/connections', connectionsRoutes);

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

  // Folder Management
  get_folder: emailTools.getFolder,
  create_folder: emailTools.createFolder,
  update_folder: emailTools.updateFolder,
  delete_folder: emailTools.deleteFolder,
  get_folder_by_name: emailTools.getFolderByName,
  move_email_to_folder: emailTools.moveEmailToFolder,
  add_email_to_folders: emailTools.addEmailToFolders,
  remove_email_from_folder: emailTools.removeEmailFromFolder,

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

  // Google Calendar
  gcal_list_calendars: googleCalendarTools.gcalListCalendars,
  gcal_list_events: googleCalendarTools.gcalListEvents,
  gcal_create_event: googleCalendarTools.gcalCreateEvent,
  gcal_update_event: googleCalendarTools.gcalUpdateEvent,
  gcal_delete_event: googleCalendarTools.gcalDeleteEvent,
  gcal_get_freebusy: googleCalendarTools.gcalGetFreeBusy,

  // Cal.com
  calcom_list_event_types: calComTools.calcomListEventTypes,
  calcom_list_bookings: calComTools.calcomListBookings,
  calcom_get_booking: calComTools.calcomGetBooking,
  calcom_cancel_booking: calComTools.calcomCancelBooking,
  calcom_get_availability: calComTools.calcomGetAvailability,
  calcom_create_booking: calComTools.calcomCreateBooking,
  calcom_reschedule_booking: calComTools.calcomRescheduleBooking,
  calcom_list_schedules: calComTools.calcomListSchedules,

  // Dialpad
  dialpad_list_calls: dialpadTools.dialpadListCalls,
  dialpad_get_call: dialpadTools.dialpadGetCall,
  dialpad_list_contacts: dialpadTools.dialpadListContacts,
  dialpad_create_contact: dialpadTools.dialpadCreateContact,
  dialpad_search_contacts: dialpadTools.dialpadSearchContacts,
  dialpad_list_users: dialpadTools.dialpadListUsers,
  dialpad_get_user: dialpadTools.dialpadGetUser,
  dialpad_list_recordings: dialpadTools.dialpadListRecordings,
  dialpad_get_call_stats: dialpadTools.dialpadGetCallStats,
  dialpad_send_sms: dialpadTools.dialpadSendSms,
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

    // Folder Management
    { name: 'get_folder', category: 'folders', description: 'Get folder details by ID' },
    { name: 'create_folder', category: 'folders', description: 'Create a new custom folder' },
    { name: 'update_folder', category: 'folders', description: 'Rename a folder' },
    { name: 'delete_folder', category: 'folders', description: 'Delete a folder' },
    { name: 'get_folder_by_name', category: 'folders', description: 'Get folder ID by name' },
    { name: 'move_email_to_folder', category: 'folders', description: 'Move email to folder by name (creates if missing)' },
    { name: 'add_email_to_folders', category: 'folders', description: 'Add email to multiple folders/labels' },
    { name: 'remove_email_from_folder', category: 'folders', description: 'Remove email from a folder' },

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

    // Google Calendar
    { name: 'gcal_list_calendars', category: 'google_calendar', description: 'List Google calendars' },
    { name: 'gcal_list_events', category: 'google_calendar', description: 'List Google Calendar events' },
    { name: 'gcal_create_event', category: 'google_calendar', description: 'Create Google Calendar event' },
    { name: 'gcal_update_event', category: 'google_calendar', description: 'Update Google Calendar event' },
    { name: 'gcal_delete_event', category: 'google_calendar', description: 'Delete Google Calendar event' },
    { name: 'gcal_get_freebusy', category: 'google_calendar', description: 'Check free/busy times' },

    // Cal.com
    { name: 'calcom_list_event_types', category: 'cal_com', description: 'List Cal.com event types' },
    { name: 'calcom_list_bookings', category: 'cal_com', description: 'List Cal.com bookings' },
    { name: 'calcom_get_booking', category: 'cal_com', description: 'Get Cal.com booking details' },
    { name: 'calcom_cancel_booking', category: 'cal_com', description: 'Cancel a Cal.com booking' },
    { name: 'calcom_get_availability', category: 'cal_com', description: 'Get availability slots' },
    { name: 'calcom_create_booking', category: 'cal_com', description: 'Create a Cal.com booking' },
    { name: 'calcom_reschedule_booking', category: 'cal_com', description: 'Reschedule a booking' },
    { name: 'calcom_list_schedules', category: 'cal_com', description: 'List availability schedules' },

    // Dialpad
    { name: 'dialpad_list_calls', category: 'dialpad', description: 'List Dialpad calls' },
    { name: 'dialpad_get_call', category: 'dialpad', description: 'Get call details' },
    { name: 'dialpad_list_contacts', category: 'dialpad', description: 'List Dialpad contacts' },
    { name: 'dialpad_create_contact', category: 'dialpad', description: 'Create Dialpad contact' },
    { name: 'dialpad_search_contacts', category: 'dialpad', description: 'Search Dialpad contacts' },
    { name: 'dialpad_list_users', category: 'dialpad', description: 'List Dialpad users' },
    { name: 'dialpad_get_user', category: 'dialpad', description: 'Get Dialpad user details' },
    { name: 'dialpad_list_recordings', category: 'dialpad', description: 'List call recordings' },
    { name: 'dialpad_get_call_stats', category: 'dialpad', description: 'Get call statistics' },
    { name: 'dialpad_send_sms', category: 'dialpad', description: 'Send SMS via Dialpad' },
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
      let integrationId = 'nylas';
      if (tool.startsWith('msgraph_')) integrationId = 'msgraph';
      else if (tool.startsWith('gcal_')) integrationId = 'google_calendar';
      else if (tool.startsWith('calcom_')) integrationId = 'cal_com';
      else if (tool.startsWith('dialpad_')) integrationId = 'dialpad';

      // Track general usage
      trackUsageAsync({ tenantId, integrationId, tool });

      // Track platform usage for INCLUDED integrations (with cost calculation)
      trackPlatformUsageAsync({
        tenantId,
        integrationId,
        operation: tool,
        units: 1,
        metadata: { tool, timestamp: new Date().toISOString() },
      });
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
║  Admin (Platform Configuration):                          ║
║  - Integrations:   /admin/integrations                    ║
║  - Usage:          /admin/integrations/usage/summary      ║
║                                                           ║
║  Customer Connections (BYOK):                             ║
║  - List:       /connections/:tenantId                     ║
║  - Connect:    /connections/:tenantId/:integrationId      ║
║  - Usage:      /connections/:tenantId/usage               ║
║                                                           ║
║  Nylas OAuth (Email/Calendar/Contacts):                   ║
║  - Connect:    /auth/connect/:tenantId                    ║
║  - Status:     /auth/status/:tenantId                     ║
║                                                           ║
║  API Keys & Usage:                                        ║
║  - Keys:       /api-keys/:tenant                          ║
║  - Usage:      /api-keys/:tenant/usage                    ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
