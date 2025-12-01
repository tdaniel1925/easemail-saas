// ===========================================
// DIALPAD TOOLS
// Tools for Dialpad phone/communication integration
// ===========================================

import { db } from '../lib/db.js';
import { dialpadIntegration } from '../integrations/dialpad/index.js';

// Helper to get credentials for a tenant
async function getCredentials(tenantId: string) {
  const creds = await db.integrationCredential.findFirst({
    where: {
      tenantId,
      integrationId: 'dialpad',
      isActive: true,
    },
    orderBy: { isPrimary: 'desc' },
  });

  if (!creds || !creds.accessToken) {
    throw new Error('Dialpad not connected. Please connect in settings.');
  }

  // Check if token is expired and needs refresh
  if (creds.expiresAt && creds.expiresAt < new Date() && creds.refreshToken) {
    try {
      const refreshed = await dialpadIntegration.refreshToken({
        integrationId: 'dialpad',
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
      throw new Error('Dialpad token expired. Please reconnect.');
    }
  }

  return {
    integrationId: 'dialpad',
    tenantId,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken || undefined,
    expiresAt: creds.expiresAt || undefined,
  };
}

// ===========================================
// LIST CALLS
// ===========================================
export async function dialpadListCalls(params: {
  tenant_id: string;
  limit?: number;
  start_date?: string;
  end_date?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_list_calls', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET CALL
// ===========================================
export async function dialpadGetCall(params: {
  tenant_id: string;
  call_id: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_get_call', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST CONTACTS
// ===========================================
export async function dialpadListContacts(params: {
  tenant_id: string;
  limit?: number;
  search?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_list_contacts', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CREATE CONTACT
// ===========================================
export async function dialpadCreateContact(params: {
  tenant_id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  company?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_create_contact', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SEARCH CONTACTS
// ===========================================
export async function dialpadSearchContacts(params: {
  tenant_id: string;
  query: string;
  limit?: number;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_search_contacts', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST USERS
// ===========================================
export async function dialpadListUsers(params: {
  tenant_id: string;
  limit?: number;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_list_users', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET USER
// ===========================================
export async function dialpadGetUser(params: {
  tenant_id: string;
  user_id: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_get_user', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST RECORDINGS
// ===========================================
export async function dialpadListRecordings(params: {
  tenant_id: string;
  limit?: number;
  start_date?: string;
  end_date?: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_list_recordings', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET CALL STATS
// ===========================================
export async function dialpadGetCallStats(params: {
  tenant_id: string;
  start_date: string;
  end_date: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_get_call_stats', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SEND SMS
// ===========================================
export async function dialpadSendSms(params: {
  tenant_id: string;
  to: string;
  message: string;
}) {
  try {
    const creds = await getCredentials(params.tenant_id);
    return await dialpadIntegration.executeTool('dialpad_send_sms', params, creds);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
