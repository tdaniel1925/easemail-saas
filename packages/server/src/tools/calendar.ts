import { getTenantWithGrant, logActivity } from '../lib/db.js';
import * as nylasLib from '../lib/nylas.js';

// ===========================================
// LIST CALENDARS
// ===========================================
export async function listCalendars(params: { tenant_id: string }) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const calendars = await nylasLib.listCalendars(tenant.nylasGrantId!);

    return {
      success: true,
      data: {
        calendars: calendars.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isPrimary: c.isPrimary,
          isReadOnly: c.readOnly,
          timezone: c.timezone,
        })),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST EVENTS
// ===========================================
export async function listEvents(params: {
  tenant_id: string;
  calendar_id?: string;
  start_time?: string; // ISO string
  end_time?: string;   // ISO string
  limit?: number;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const response = await nylasLib.listEvents(tenant.nylasGrantId!, {
      calendarId: params.calendar_id,
      start: params.start_time ? Math.floor(new Date(params.start_time).getTime() / 1000) : undefined,
      end: params.end_time ? Math.floor(new Date(params.end_time).getTime() / 1000) : undefined,
      limit: params.limit || 50,
    });

    const events = response.data.map((e: any) => ({
      id: e.id,
      calendarId: e.calendarId,
      title: e.title,
      description: e.description,
      location: e.location,
      status: e.status,
      when: e.when,
      participants: e.participants?.map((p: any) => ({
        email: p.email,
        name: p.name,
        status: p.status,
      })),
      conferencing: e.conferencing,
    }));

    return {
      success: true,
      data: { events, nextPageToken: response.nextCursor },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET EVENT
// ===========================================
export async function getEvent(params: {
  tenant_id: string;
  event_id: string;
  calendar_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const event = await nylasLib.getEvent(
      tenant.nylasGrantId!,
      params.event_id,
      params.calendar_id
    );

    return {
      success: true,
      data: {
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        location: event.location,
        status: event.status,
        when: event.when,
        participants: event.participants?.map((p: any) => ({
          email: p.email,
          name: p.name,
          status: p.status,
        })),
        conferencing: event.conferencing,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CREATE EVENT
// ===========================================
export async function createEvent(params: {
  tenant_id: string;
  calendar_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  participants?: { email: string; name?: string }[];
}) {
  const startTime = Date.now();

  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const event = await nylasLib.createEvent(tenant.nylasGrantId!, {
      calendarId: params.calendar_id,
      title: params.title,
      description: params.description,
      location: params.location,
      when: {
        startTime: Math.floor(new Date(params.start_time).getTime() / 1000),
        endTime: Math.floor(new Date(params.end_time).getTime() / 1000),
      },
      participants: params.participants,
    });

    await logActivity({
      tenantId: tenant.id,
      action: 'create_event',
      status: 'success',
      input: { title: params.title, startTime: params.start_time },
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      data: { id: event.id, title: event.title },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// DELETE EVENT
// ===========================================
export async function deleteEvent(params: {
  tenant_id: string;
  event_id: string;
  calendar_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    await nylasLib.nylas.events.destroy({
      identifier: tenant.nylasGrantId!,
      eventId: params.event_id,
      queryParams: { calendarId: params.calendar_id },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CHECK AVAILABILITY
// ===========================================
export async function checkAvailability(params: {
  tenant_id: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    // Get events in the time range
    const response = await nylasLib.listEvents(tenant.nylasGrantId!, {
      start: Math.floor(new Date(params.start_time).getTime() / 1000),
      end: Math.floor(new Date(params.end_time).getTime() / 1000),
    });

    // Build busy times
    const busyTimes = response.data.map((e: any) => {
      const when = e.when as { startTime?: number; endTime?: number };
      return {
        start: when.startTime ? new Date(when.startTime * 1000).toISOString() : null,
        end: when.endTime ? new Date(when.endTime * 1000).toISOString() : null,
        title: e.title,
      };
    }).filter((t: any) => t.start && t.end);

    return {
      success: true,
      data: {
        busyTimes,
        eventCount: response.data.length,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
