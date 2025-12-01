// ===========================================
// CAL.COM INTEGRATION
// Open source scheduling and appointment booking
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class CalComIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'cal_com',
    name: 'Cal.com',
    description: 'Open source scheduling and appointment booking',
    category: 'calendar',
    authType: 'api_key',
    requiredEnvVars: [], // API key provided per-tenant
  };

  isConfigured(): boolean {
    // Cal.com uses per-tenant API keys, so always "configured"
    return true;
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'calcom_list_event_types',
        description: 'List available Cal.com event types (booking links)',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'calcom_list_bookings',
        description: 'List Cal.com bookings/appointments',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'status', type: 'string', description: 'Filter by status (upcoming, past, cancelled)', required: false },
          { name: 'limit', type: 'number', description: 'Max bookings', required: false, default: 50 },
        ],
      },
      {
        name: 'calcom_get_booking',
        description: 'Get details of a specific Cal.com booking',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'booking_id', type: 'string', description: 'Booking ID', required: true },
        ],
      },
      {
        name: 'calcom_cancel_booking',
        description: 'Cancel a Cal.com booking',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'booking_id', type: 'string', description: 'Booking ID', required: true },
          { name: 'reason', type: 'string', description: 'Cancellation reason', required: false },
        ],
      },
      {
        name: 'calcom_get_availability',
        description: 'Get available time slots for an event type',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'event_type_id', type: 'number', description: 'Event type ID', required: true },
          { name: 'start_date', type: 'string', description: 'Start date (YYYY-MM-DD)', required: true },
          { name: 'end_date', type: 'string', description: 'End date (YYYY-MM-DD)', required: true },
        ],
      },
      {
        name: 'calcom_create_booking',
        description: 'Create a new Cal.com booking',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'event_type_id', type: 'number', description: 'Event type ID', required: true },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: true },
          { name: 'name', type: 'string', description: 'Attendee name', required: true },
          { name: 'email', type: 'string', description: 'Attendee email', required: true },
          { name: 'notes', type: 'string', description: 'Additional notes', required: false },
          { name: 'timezone', type: 'string', description: 'Timezone', required: false },
        ],
      },
      {
        name: 'calcom_reschedule_booking',
        description: 'Reschedule a Cal.com booking',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'booking_id', type: 'string', description: 'Booking ID', required: true },
          { name: 'new_start_time', type: 'string', description: 'New start time (ISO)', required: true },
          { name: 'reason', type: 'string', description: 'Reschedule reason', required: false },
        ],
      },
      {
        name: 'calcom_list_schedules',
        description: 'List availability schedules',
        category: 'calendar',
        integration: 'cal_com',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken;
    if (!apiKey) {
      return { success: false, error: 'No API key available. Please configure Cal.com integration.' };
    }

    const baseUrl = 'https://api.cal.com/v1';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'calcom_list_event_types': {
          const response = await fetch(`${baseUrl}/event-types`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'calcom_list_bookings': {
          const queryParams = new URLSearchParams();
          if (params.status) queryParams.set('status', params.status as string);
          if (params.limit) queryParams.set('take', String(params.limit));

          const response = await fetch(`${baseUrl}/bookings?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'calcom_get_booking': {
          const response = await fetch(`${baseUrl}/bookings/${params.booking_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'calcom_cancel_booking': {
          const response = await fetch(`${baseUrl}/bookings/${params.booking_id}/cancel`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ reason: params.reason }),
          });
          if (!response.ok && response.status !== 204) {
            throw new Error(`API error: ${response.status}`);
          }
          return { success: true, data: { cancelled: true } };
        }

        case 'calcom_get_availability': {
          const queryParams = new URLSearchParams({
            eventTypeId: String(params.event_type_id),
            startTime: params.start_date as string,
            endTime: params.end_date as string,
          });

          const response = await fetch(`${baseUrl}/availability?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'calcom_create_booking': {
          const body = {
            eventTypeId: params.event_type_id,
            start: params.start_time,
            responses: {
              name: params.name,
              email: params.email,
              notes: params.notes,
            },
            timeZone: params.timezone || 'UTC',
            language: 'en',
          };

          const response = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'calcom_reschedule_booking': {
          const body = {
            start: params.new_start_time,
            reason: params.reason,
          };

          const response = await fetch(`${baseUrl}/bookings/${params.booking_id}/reschedule`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'calcom_list_schedules': {
          const response = await fetch(`${baseUrl}/schedules`, { headers });
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

export const calComIntegration = new CalComIntegration();
