import { getTenantWithGrant, logActivity } from '../lib/db.js';
import * as nylasLib from '../lib/nylas.js';

// ===========================================
// LIST CONTACTS
// ===========================================
export async function listContacts(params: {
  tenant_id: string;
  limit?: number;
  page_token?: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const response = await nylasLib.listContacts(tenant.nylasGrantId!, {
      limit: params.limit || 50,
      pageToken: params.page_token,
    });

    const contacts = response.data.map(c => ({
      id: c.id,
      givenName: c.givenName,
      surname: c.surname,
      displayName: [c.givenName, c.surname].filter(Boolean).join(' ') || c.emails?.[0]?.email || 'Unknown',
      emails: c.emails?.map(e => ({ email: e.email, type: e.type })) || [],
      phoneNumbers: c.phoneNumbers?.map(p => ({ number: p.number, type: p.type })) || [],
      companyName: c.companyName,
      jobTitle: c.jobTitle,
    }));

    return {
      success: true,
      data: { contacts, nextPageToken: response.nextCursor },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET CONTACT
// ===========================================
export async function getContact(params: {
  tenant_id: string;
  contact_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const contact = await nylasLib.getContact(tenant.nylasGrantId!, params.contact_id);

    return {
      success: true,
      data: {
        id: contact.id,
        givenName: contact.givenName,
        surname: contact.surname,
        displayName: [contact.givenName, contact.surname].filter(Boolean).join(' ') || 'Unknown',
        emails: contact.emails?.map(e => ({ email: e.email, type: e.type })) || [],
        phoneNumbers: contact.phoneNumbers?.map(p => ({ number: p.number, type: p.type })) || [],
        companyName: contact.companyName,
        jobTitle: contact.jobTitle,
        notes: contact.notes,
        birthday: contact.birthday,
        websiteUrl: contact.websiteUrl,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CREATE CONTACT
// ===========================================
export async function createContact(params: {
  tenant_id: string;
  given_name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
}) {
  const startTime = Date.now();

  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const contact = await nylasLib.createContact(tenant.nylasGrantId!, {
      givenName: params.given_name,
      surname: params.surname,
      emails: params.email ? [{ email: params.email, type: 'work' }] : undefined,
      phoneNumbers: params.phone ? [{ number: params.phone, type: 'work' }] : undefined,
      companyName: params.company,
      jobTitle: params.job_title,
    });

    await logActivity({
      tenantId: tenant.id,
      action: 'create_contact',
      status: 'success',
      input: { givenName: params.given_name, email: params.email },
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      data: { id: contact.id },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SEARCH CONTACTS
// ===========================================
export async function searchContacts(params: {
  tenant_id: string;
  query: string;
  limit?: number;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    // Search by email
    const response = await nylasLib.listContacts(tenant.nylasGrantId!, {
      limit: params.limit || 20,
      email: params.query,
    });

    const contacts = response.data.map(c => ({
      id: c.id,
      displayName: [c.givenName, c.surname].filter(Boolean).join(' ') || c.emails?.[0]?.email || 'Unknown',
      emails: c.emails?.map(e => e.email) || [],
      companyName: c.companyName,
    }));

    return { success: true, data: { contacts } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
