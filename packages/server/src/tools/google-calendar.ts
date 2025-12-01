// ===========================================
// GOOGLE CALENDAR TOOLS
// Tools for Google Calendar integration
// ===========================================

import { db } from '../lib/db.js';
import { googleCalendarIntegration } from '../integrations/google-calendar/index.js';

// Helper to get credentials for a tenant
async function getCredentials(tenantId: string) {
  const creds = await db.integrationCredential.findFirst({
    where: {
      tenantId,
      integrationId: 'google_calendar',
      isActive: true,
    },
    orderBy: { isPrimary: 'desc' },
  });

  if (!creds || !creds.accessToken) {
    throw new Error('Google Calendar not connected. Please connect in settings.');
  }

  // Check if token is expired and needs refresh
  if (creds.expiresAt && creds.expiresAt < new Date() && creds.refreshToken) {
    try {
      const refreshed = await googleCalendarIntegration.refreshToken({
        integrationId: 'google_calendar',
        tenantId,
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken,
        expiresAt: creds.expiresAt,
      });

      // Update in database
      await db.integrationCredential.update({
        where: { id: creds.id },
        data: {
          accessToken: refreshed.accessToken,
          expiresAt: refreshed.expiresAt,
        },
      });

      return refreshed;
    } catch {
      throw new Error('Google Calendar token expired. Please reconnect.');
    }
  }

  return {
    integrationId: 'google_calendar',
    tenantId,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken || undefined,
    expiresAt: creds.expiresAt || undefined,
  };
}

// ===========================================
// LIST CALENDARS
// ===========================================
export async function gcalListCalendars(params: { tenant_id: string }) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await googleCalendarIntegration.executeTool('gcal_list_calendars', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST EVENTS
// ===========================================
export async function gcalListEvents(params: {
  tenant_id: string;
  calendar_id?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await googleCalendarIntegration.executeTool('gcal_list_events', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CREATE EVENT
// ===========================================
export async function gcalCreateEvent(params: {
  tenant_id: string;
  calendar_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  location?: string;
  attendees?: { email: string }[];
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await googleCalendarIntegration.executeTool('gcal_create_event', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// UPDATE EVENT
// ===========================================
export async function gcalUpdateEvent(params: {
  tenant_id: string;
  event_id: string;
  calendar_id?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  location?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await googleCalendarIntegration.executeTool('gcal_update_event', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// DELETE EVENT
// ===========================================
export async function gcalDeleteEvent(params: {
  tenant_id: string;
  event_id: string;
  calendar_id?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await googleCalendarIntegration.executeTool('gcal_delete_event', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET FREE/BUSY
// ===========================================
export async function gcalGetFreeBusy(params: {
  tenant_id: string;
  start_time: string;
  end_time: string;
  calendars?: string[];
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await googleCalendarIntegration.executeTool('gcal_get_freebusy', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
