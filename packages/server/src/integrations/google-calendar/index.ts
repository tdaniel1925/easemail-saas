// ===========================================
// GOOGLE CALENDAR INTEGRATION
// Direct Google Calendar API integration via OAuth
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class GoogleCalendarIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Calendar scheduling and event management via Google Calendar API',
    category: 'calendar',
    authType: 'oauth2',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  };

  isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  async initialize(): Promise<void> {
    // No initialization needed for Google Calendar
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.API_URL}/integrations/callback/google_calendar`,
      response_type: 'code',
      scope: this.config.scopes!.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state || tenantId,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<IntegrationCredentials> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.API_URL}/integrations/callback/google_calendar`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Get user info to determine email
    const userResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    let email = '';
    if (userResponse.ok) {
      const userData = await userResponse.json() as { items?: Array<{ id: string; primary?: boolean }> };
      const primaryCalendar = userData.items?.find(c => c.primary) || userData.items?.[0];
      email = primaryCalendar?.id || '';
    }

    return {
      integrationId: 'google_calendar',
      tenantId: state,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      metadata: {
        email,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    if (!credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: credentials.refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      expires_in: number;
    };

    return {
      ...credentials,
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'gcal_list_calendars',
        description: 'List available Google calendars',
        category: 'calendar',
        integration: 'google_calendar',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'gcal_list_events',
        description: 'List events from Google Calendar',
        category: 'calendar',
        integration: 'google_calendar',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID (default: primary)', required: false },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: false },
          { name: 'end_time', type: 'string', description: 'End time (ISO)', required: false },
          { name: 'limit', type: 'number', description: 'Max events', required: false, default: 50 },
        ],
      },
      {
        name: 'gcal_create_event',
        description: 'Create a Google Calendar event',
        category: 'calendar',
        integration: 'google_calendar',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID (default: primary)', required: false },
          { name: 'title', type: 'string', description: 'Event title', required: true },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: true },
          { name: 'end_time', type: 'string', description: 'End time (ISO)', required: true },
          { name: 'description', type: 'string', description: 'Event description', required: false },
          { name: 'location', type: 'string', description: 'Event location', required: false },
          { name: 'attendees', type: 'array', description: 'Attendees [{email}]', required: false },
        ],
      },
      {
        name: 'gcal_update_event',
        description: 'Update a Google Calendar event',
        category: 'calendar',
        integration: 'google_calendar',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'event_id', type: 'string', description: 'Event ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID (default: primary)', required: false },
          { name: 'title', type: 'string', description: 'New title', required: false },
          { name: 'start_time', type: 'string', description: 'New start time (ISO)', required: false },
          { name: 'end_time', type: 'string', description: 'New end time (ISO)', required: false },
          { name: 'description', type: 'string', description: 'New description', required: false },
          { name: 'location', type: 'string', description: 'New location', required: false },
        ],
      },
      {
        name: 'gcal_delete_event',
        description: 'Delete a Google Calendar event',
        category: 'calendar',
        integration: 'google_calendar',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'event_id', type: 'string', description: 'Event ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID (default: primary)', required: false },
        ],
      },
      {
        name: 'gcal_get_freebusy',
        description: 'Check free/busy times in Google Calendar',
        category: 'calendar',
        integration: 'google_calendar',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: true },
          { name: 'end_time', type: 'string', description: 'End time (ISO)', required: true },
          { name: 'calendars', type: 'array', description: 'Calendar IDs to check', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const accessToken = credentials.accessToken;
    if (!accessToken) {
      return { success: false, error: 'No access token available' };
    }

    const baseUrl = 'https://www.googleapis.com/calendar/v3';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'gcal_list_calendars': {
          const response = await fetch(`${baseUrl}/users/me/calendarList`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gcal_list_events': {
          const calendarId = (params.calendar_id as string) || 'primary';
          const queryParams = new URLSearchParams();
          if (params.start_time) queryParams.set('timeMin', params.start_time as string);
          if (params.end_time) queryParams.set('timeMax', params.end_time as string);
          queryParams.set('maxResults', String(params.limit || 50));
          queryParams.set('singleEvents', 'true');
          queryParams.set('orderBy', 'startTime');

          const response = await fetch(
            `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${queryParams}`,
            { headers }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gcal_create_event': {
          const calendarId = (params.calendar_id as string) || 'primary';
          const event = {
            summary: params.title,
            description: params.description,
            location: params.location,
            start: { dateTime: params.start_time, timeZone: 'UTC' },
            end: { dateTime: params.end_time, timeZone: 'UTC' },
            attendees: params.attendees,
          };

          const response = await fetch(
            `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(event),
            }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gcal_update_event': {
          const calendarId = (params.calendar_id as string) || 'primary';
          const eventId = params.event_id as string;
          const updates: Record<string, unknown> = {};
          if (params.title) updates.summary = params.title;
          if (params.description) updates.description = params.description;
          if (params.location) updates.location = params.location;
          if (params.start_time) updates.start = { dateTime: params.start_time, timeZone: 'UTC' };
          if (params.end_time) updates.end = { dateTime: params.end_time, timeZone: 'UTC' };

          const response = await fetch(
            `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updates),
            }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gcal_delete_event': {
          const calendarId = (params.calendar_id as string) || 'primary';
          const eventId = params.event_id as string;

          const response = await fetch(
            `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: 'DELETE',
              headers,
            }
          );
          if (!response.ok && response.status !== 204) {
            throw new Error(`API error: ${response.status}`);
          }
          return { success: true, data: { deleted: true } };
        }

        case 'gcal_get_freebusy': {
          const body = {
            timeMin: params.start_time,
            timeMax: params.end_time,
            items: (params.calendars as string[] || ['primary']).map(id => ({ id })),
          };

          const response = await fetch(`${baseUrl}/freeBusy`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const googleCalendarIntegration = new GoogleCalendarIntegration();
