// ===========================================
// CAL.COM TOOLS
// Tools for Cal.com scheduling integration
// ===========================================

import { db } from '../lib/db.js';
import { calComIntegration } from '../integrations/cal-com/index.js';
import { retrieveIntegrationCredentials } from '../lib/encryption.js';

// Helper to get credentials for a tenant
async function getCredentials(tenantId: string) {
  // First check IntegrationCredential table
  const creds = await db.integrationCredential.findFirst({
    where: {
      tenantId,
      integrationId: 'cal_com',
      isActive: true,
    },
    orderBy: { isPrimary: 'desc' },
  });

  if (creds?.accessToken) {
    return {
      integrationId: 'cal_com',
      tenantId,
      accessToken: creds.accessToken,
    };
  }

  // Fall back to Connection for BYOK credentials
  const connection = await db.connection.findFirst({
    where: {
      tenantId,
      integrationId: 'cal_com',
      isActive: true,
    },
  });

  if (connection?.credentialsEncrypted) {
    const decrypted = retrieveIntegrationCredentials(connection.credentialsEncrypted);
    if (decrypted.apiKey) {
      return {
        integrationId: 'cal_com',
        tenantId,
        accessToken: decrypted.apiKey,
      };
    }
  }

  // Also check if connection has accessToken directly
  if (connection?.accessToken) {
    return {
      integrationId: 'cal_com',
      tenantId,
      accessToken: connection.accessToken,
    };
  }

  throw new Error('Cal.com not connected. Please configure API key in settings.');
}

// ===========================================
// LIST EVENT TYPES
// ===========================================
export async function calcomListEventTypes(params: { tenant_id: string }) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_list_event_types', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST BOOKINGS
// ===========================================
export async function calcomListBookings(params: {
  tenant_id: string;
  status?: string;
  limit?: number;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_list_bookings', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET BOOKING
// ===========================================
export async function calcomGetBooking(params: {
  tenant_id: string;
  booking_id: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_get_booking', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CANCEL BOOKING
// ===========================================
export async function calcomCancelBooking(params: {
  tenant_id: string;
  booking_id: string;
  reason?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_cancel_booking', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET AVAILABILITY
// ===========================================
export async function calcomGetAvailability(params: {
  tenant_id: string;
  event_type_id: number;
  start_date: string;
  end_date: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_get_availability', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CREATE BOOKING
// ===========================================
export async function calcomCreateBooking(params: {
  tenant_id: string;
  event_type_id: number;
  start_time: string;
  name: string;
  email: string;
  notes?: string;
  timezone?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_create_booking', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// RESCHEDULE BOOKING
// ===========================================
export async function calcomRescheduleBooking(params: {
  tenant_id: string;
  booking_id: string;
  new_start_time: string;
  reason?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_reschedule_booking', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST SCHEDULES
// ===========================================
export async function calcomListSchedules(params: { tenant_id: string }) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await calComIntegration.executeTool('calcom_list_schedules', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
