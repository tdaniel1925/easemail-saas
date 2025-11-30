// ===========================================
// CALENDAR SYNC UTILITIES
// Sync calendars and events from email provider
// ===========================================

import { db } from './db.js';
import * as nylasLib from './nylas.js';

// ===========================================
// TYPES
// ===========================================

export interface SyncedCalendar {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  location: string | null;
  timezone: string | null;
  isPrimary: boolean;
  isReadOnly: boolean;
  hexColor: string | null;
  syncedAt: Date;
}

export interface SyncedCalendarEvent {
  id: string;
  calendarId: string;
  providerId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  status: string | null;
  busy: boolean;
  recurrence: any | null;
  participants: Array<{ email: string; name?: string; status?: string }> | null;
  organizer: { email: string; name?: string } | null;
  reminders: any | null;
  conferencing: any | null;
  masterEventId: string | null;
  syncedAt: Date;
}

export interface CalendarSyncResult {
  success: boolean;
  calendars: SyncedCalendar[];
  added: number;
  removed: number;
  updated: number;
}

export interface EventSyncResult {
  success: boolean;
  events: SyncedCalendarEvent[];
  added: number;
  removed: number;
  updated: number;
}

// ===========================================
// SYNC CALENDARS FROM PROVIDER
// ===========================================

export async function syncCalendars(tenantId: string): Promise<CalendarSyncResult> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Fetch calendars from Nylas
  const remoteCalendars = await nylasLib.listCalendars(tenant.nylasGrantId);

  // Get existing synced calendars from database
  const existingCalendars = await db.calendar.findMany({
    where: { tenantId: tenant.id },
  });

  const existingMap = new Map(existingCalendars.map(c => [c.providerId, c]));
  const remoteMap = new Map(remoteCalendars.map((c: any) => [c.id, c]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  // Process remote calendars
  for (const remote of remoteCalendars) {
    const existing = existingMap.get(remote.id);

    const calendarData = {
      providerId: remote.id,
      name: remote.name || 'Unnamed Calendar',
      description: remote.description || null,
      location: remote.location || null,
      timezone: remote.timezone || null,
      isPrimary: remote.isPrimary || false,
      isReadOnly: remote.readOnly || false,
      hexColor: remote.hexColor || null,
      syncedAt: new Date(),
    };

    if (existing) {
      // Update if changed
      await db.calendar.update({
        where: { id: existing.id },
        data: calendarData,
      });
      updated++;
    } else {
      // Add new calendar
      await db.calendar.create({
        data: {
          tenantId: tenant.id,
          ...calendarData,
        },
      });
      added++;
    }
  }

  // Remove calendars that no longer exist remotely
  for (const existing of existingCalendars) {
    if (!remoteMap.has(existing.providerId)) {
      // Delete associated events first
      await db.calendarEvent.deleteMany({
        where: { calendarId: existing.id },
      });
      await db.calendar.delete({
        where: { id: existing.id },
      });
      removed++;
    }
  }

  // Fetch updated list
  const syncedCalendars = await db.calendar.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  return {
    success: true,
    calendars: syncedCalendars as SyncedCalendar[],
    added,
    removed,
    updated,
  };
}

// ===========================================
// SYNC EVENTS FOR A CALENDAR
// ===========================================

export async function syncCalendarEvents(
  tenantId: string,
  calendarId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
): Promise<EventSyncResult> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the calendar
  const calendar = await db.calendar.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: calendarId }, { providerId: calendarId }],
    },
  });

  if (!calendar) {
    throw new Error('Calendar not found');
  }

  // Default date range: 30 days before to 90 days after
  const now = new Date();
  const startDate = options?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Fetch events from Nylas
  const response = await nylasLib.listEvents(tenant.nylasGrantId, {
    calendarId: calendar.providerId,
    start: Math.floor(startDate.getTime() / 1000),
    end: Math.floor(endDate.getTime() / 1000),
    limit: 200,
  });

  const remoteEvents = response.data;

  // Get existing synced events from database for this calendar
  const existingEvents = await db.calendarEvent.findMany({
    where: {
      tenantId: tenant.id,
      calendarId: calendar.id,
    },
  });

  const existingMap = new Map(existingEvents.map(e => [e.providerId, e]));
  const remoteMap = new Map(remoteEvents.map((e: any) => [e.id, e]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  // Process remote events
  for (const remote of remoteEvents) {
    const existing = existingMap.get(remote.id);

    // Parse start and end times
    let startTime: Date;
    let endTime: Date;
    let allDay = false;

    if (remote.when?.startTime) {
      startTime = new Date(remote.when.startTime * 1000);
      endTime = new Date(remote.when.endTime * 1000);
    } else if (remote.when?.startDate) {
      // All-day event
      startTime = new Date(remote.when.startDate);
      endTime = new Date(remote.when.endDate);
      allDay = true;
    } else {
      // Skip invalid events
      continue;
    }

    const eventData = {
      providerId: remote.id,
      calendarId: calendar.id,
      title: remote.title || 'Untitled Event',
      description: remote.description || null,
      location: remote.location || null,
      startTime,
      endTime,
      allDay,
      status: remote.status || null,
      busy: remote.busy !== false,
      recurrence: remote.recurrence || null,
      participants: remote.participants || null,
      organizer: remote.organizer || null,
      reminders: remote.reminders || null,
      conferencing: remote.conferencing || null,
      masterEventId: remote.masterEventId || null,
      syncedAt: new Date(),
    };

    if (existing) {
      // Update if changed
      await db.calendarEvent.update({
        where: { id: existing.id },
        data: eventData,
      });
      updated++;
    } else {
      // Add new event
      await db.calendarEvent.create({
        data: {
          tenantId: tenant.id,
          ...eventData,
        },
      });
      added++;
    }
  }

  // Remove events that no longer exist remotely (within date range)
  for (const existing of existingEvents) {
    if (!remoteMap.has(existing.providerId)) {
      await db.calendarEvent.delete({
        where: { id: existing.id },
      });
      removed++;
    }
  }

  // Fetch updated list
  const syncedEvents = await db.calendarEvent.findMany({
    where: {
      tenantId: tenant.id,
      calendarId: calendar.id,
    },
    orderBy: [{ startTime: 'asc' }],
  });

  return {
    success: true,
    events: syncedEvents as SyncedCalendarEvent[],
    added,
    removed,
    updated,
  };
}

// ===========================================
// GET CACHED CALENDARS
// ===========================================

export async function getCachedCalendars(tenantId: string): Promise<SyncedCalendar[]> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const calendars = await db.calendar.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  return calendars as SyncedCalendar[];
}

// ===========================================
// GET CACHED EVENTS
// ===========================================

export async function getCachedEvents(
  tenantId: string,
  options?: {
    calendarId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<SyncedCalendarEvent[]> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const where: any = { tenantId: tenant.id };

  if (options?.calendarId) {
    const calendar = await db.calendar.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ id: options.calendarId }, { providerId: options.calendarId }],
      },
    });
    if (calendar) {
      where.calendarId = calendar.id;
    }
  }

  if (options?.startDate) {
    where.startTime = { gte: options.startDate };
  }

  if (options?.endDate) {
    where.endTime = { ...(where.endTime || {}), lte: options.endDate };
  }

  const events = await db.calendarEvent.findMany({
    where,
    orderBy: [{ startTime: 'asc' }],
    take: options?.limit || 100,
  });

  return events as SyncedCalendarEvent[];
}

// ===========================================
// GET EVENT BY ID
// ===========================================

export async function getEvent(
  tenantId: string,
  eventId: string
): Promise<SyncedCalendarEvent | null> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const event = await db.calendarEvent.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: eventId }, { providerId: eventId }],
    },
  });

  return event as SyncedCalendarEvent | null;
}

// ===========================================
// CREATE EVENT WITH SYNC
// ===========================================

export async function createAndSyncEvent(
  tenantId: string,
  params: {
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    participants?: { email: string; name?: string }[];
  }
): Promise<SyncedCalendarEvent> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the calendar
  const calendar = await db.calendar.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: params.calendarId }, { providerId: params.calendarId }],
    },
  });

  if (!calendar) {
    throw new Error('Calendar not found');
  }

  // Create event in provider
  const remoteEvent = await nylasLib.createEvent(tenant.nylasGrantId, {
    calendarId: calendar.providerId,
    title: params.title,
    description: params.description,
    location: params.location,
    when: {
      startTime: Math.floor(params.startTime.getTime() / 1000),
      endTime: Math.floor(params.endTime.getTime() / 1000),
    },
    participants: params.participants,
  });

  // Save to database
  const event = await db.calendarEvent.create({
    data: {
      tenantId: tenant.id,
      calendarId: calendar.id,
      providerId: remoteEvent.id,
      title: params.title,
      description: params.description || null,
      location: params.location || null,
      startTime: params.startTime,
      endTime: params.endTime,
      allDay: false,
      participants: params.participants || undefined,
      syncedAt: new Date(),
    },
  });

  return event as SyncedCalendarEvent;
}

// ===========================================
// UPDATE EVENT WITH SYNC
// ===========================================

export async function updateAndSyncEvent(
  tenantId: string,
  eventId: string,
  params: {
    title?: string;
    description?: string;
    location?: string;
    startTime?: Date;
    endTime?: Date;
    participants?: { email: string; name?: string }[];
  }
): Promise<SyncedCalendarEvent> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the event
  const event = await db.calendarEvent.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: eventId }, { providerId: eventId }],
    },
    include: { calendar: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Update in provider
  const updateBody: any = {};
  if (params.title) updateBody.title = params.title;
  if (params.description) updateBody.description = params.description;
  if (params.location) updateBody.location = params.location;
  if (params.startTime && params.endTime) {
    updateBody.when = {
      startTime: Math.floor(params.startTime.getTime() / 1000),
      endTime: Math.floor(params.endTime.getTime() / 1000),
    };
  }
  if (params.participants) {
    updateBody.participants = params.participants;
  }

  await nylasLib.nylas.events.update({
    identifier: tenant.nylasGrantId,
    eventId: event.providerId,
    queryParams: { calendarId: event.calendar.providerId },
    requestBody: updateBody,
  });

  // Update in database
  const updatedEvent = await db.calendarEvent.update({
    where: { id: event.id },
    data: {
      title: params.title ?? event.title,
      description: params.description ?? event.description,
      location: params.location ?? event.location,
      startTime: params.startTime ?? event.startTime,
      endTime: params.endTime ?? event.endTime,
      participants: params.participants ?? event.participants ?? undefined,
      syncedAt: new Date(),
    },
  });

  return updatedEvent as SyncedCalendarEvent;
}

// ===========================================
// DELETE EVENT WITH SYNC
// ===========================================

export async function deleteAndSyncEvent(
  tenantId: string,
  eventId: string
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the event
  const event = await db.calendarEvent.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: eventId }, { providerId: eventId }],
    },
    include: { calendar: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Delete from provider
  await nylasLib.nylas.events.destroy({
    identifier: tenant.nylasGrantId,
    eventId: event.providerId,
    queryParams: { calendarId: event.calendar.providerId },
  });

  // Delete from database
  await db.calendarEvent.delete({
    where: { id: event.id },
  });
}

// ===========================================
// GET UPCOMING EVENTS
// ===========================================

export async function getUpcomingEvents(
  tenantId: string,
  days = 7,
  limit = 20
): Promise<SyncedCalendarEvent[]> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = await db.calendarEvent.findMany({
    where: {
      tenantId: tenant.id,
      startTime: { gte: now, lte: endDate },
    },
    orderBy: [{ startTime: 'asc' }],
    take: limit,
  });

  return events as SyncedCalendarEvent[];
}

// ===========================================
// INITIAL CALENDAR SYNC (CALENDARS + EVENTS)
// ===========================================

export async function initialCalendarSync(tenantId: string): Promise<{
  calendars: CalendarSyncResult;
  events: EventSyncResult[];
}> {
  // Sync calendars first
  const calendarResult = await syncCalendars(tenantId);

  // Sync events for each calendar
  const eventResults: EventSyncResult[] = [];
  for (const calendar of calendarResult.calendars) {
    const eventResult = await syncCalendarEvents(tenantId, calendar.id);
    eventResults.push(eventResult);
  }

  // Log the sync
  const totalEvents = eventResults.reduce((sum, r) => sum + r.events.length, 0);
  await db.activityLog.create({
    data: {
      tenantId,
      action: 'calendar_sync',
      status: 'success',
      input: {
        calendars: {
          added: calendarResult.added,
          removed: calendarResult.removed,
          updated: calendarResult.updated,
          total: calendarResult.calendars.length,
        },
        events: {
          total: totalEvents,
        },
      },
    },
  });

  return {
    calendars: calendarResult,
    events: eventResults,
  };
}
