// ===========================================
// CALENDAR SYNC ROUTES
// API endpoints for calendar synchronization
// ===========================================

import { Router } from 'express';
import {
  syncCalendars,
  syncCalendarEvents,
  getCachedCalendars,
  getCachedEvents,
  getEvent,
  createAndSyncEvent,
  updateAndSyncEvent,
  deleteAndSyncEvent,
  getUpcomingEvents,
  initialCalendarSync,
} from '../lib/calendarSync.js';

const router = Router();

// ===========================================
// SYNC CALENDARS
// POST /calendar/:tenantId/sync
// Full sync of calendars from email provider
// ===========================================

router.post('/:tenantId/sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await syncCalendars(tenantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// INITIAL SYNC
// POST /calendar/:tenantId/initial-sync
// Run initial calendar + events sync
// ===========================================

router.post('/:tenantId/initial-sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await initialCalendarSync(tenantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// SYNC EVENTS FOR A CALENDAR
// POST /calendar/:tenantId/:calendarId/sync-events
// Sync events for a specific calendar
// ===========================================

router.post('/:tenantId/:calendarId/sync-events', async (req, res) => {
  try {
    const { tenantId, calendarId } = req.params;
    const { startDate, endDate } = req.body;

    const result = await syncCalendarEvents(tenantId, calendarId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// GET CACHED CALENDARS
// GET /calendar/:tenantId
// Returns calendars from local cache (fast)
// ===========================================

router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const calendars = await getCachedCalendars(tenantId);

    res.json({
      success: true,
      data: { calendars },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// GET UPCOMING EVENTS
// GET /calendar/:tenantId/upcoming
// Get upcoming events across all calendars
// ===========================================

router.get('/:tenantId/upcoming', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { days, limit } = req.query;

    const events = await getUpcomingEvents(
      tenantId,
      days ? parseInt(days as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// GET EVENTS
// GET /calendar/:tenantId/events
// Get events with optional filters
// ===========================================

router.get('/:tenantId/events', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { calendarId, startDate, endDate, limit } = req.query;

    const events = await getCachedEvents(tenantId, {
      calendarId: calendarId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// GET CALENDAR EVENTS
// GET /calendar/:tenantId/:calendarId/events
// Get events for a specific calendar
// ===========================================

router.get('/:tenantId/:calendarId/events', async (req, res) => {
  try {
    const { tenantId, calendarId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const events = await getCachedEvents(tenantId, {
      calendarId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// GET EVENT
// GET /calendar/:tenantId/event/:eventId
// Get a single event by ID
// ===========================================

router.get('/:tenantId/event/:eventId', async (req, res) => {
  try {
    const { tenantId, eventId } = req.params;
    const event = await getEvent(tenantId, eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: { event },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// CREATE EVENT
// POST /calendar/:tenantId/events/create
// Creates event in provider and syncs to cache
// ===========================================

router.post('/:tenantId/events/create', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { calendarId, title, description, location, startTime, endTime, participants } = req.body;

    if (!calendarId || !title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'calendarId, title, startTime, and endTime are required',
      });
    }

    const event = await createAndSyncEvent(tenantId, {
      calendarId,
      title,
      description,
      location,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      participants,
    });

    res.json({
      success: true,
      data: { event },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// UPDATE EVENT
// PUT /calendar/:tenantId/event/:eventId
// Updates event in provider and cache
// ===========================================

router.put('/:tenantId/event/:eventId', async (req, res) => {
  try {
    const { tenantId, eventId } = req.params;
    const { title, description, location, startTime, endTime, participants } = req.body;

    const event = await updateAndSyncEvent(tenantId, eventId, {
      title,
      description,
      location,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      participants,
    });

    res.json({
      success: true,
      data: { event },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// DELETE EVENT
// DELETE /calendar/:tenantId/event/:eventId
// Deletes event from provider and cache
// ===========================================

router.delete('/:tenantId/event/:eventId', async (req, res) => {
  try {
    const { tenantId, eventId } = req.params;

    await deleteAndSyncEvent(tenantId, eventId);

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
