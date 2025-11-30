// ===========================================
// CONTACT SYNC UTILITIES
// Sync contacts from email provider
// ===========================================

import { db } from './db.js';
import * as nylasLib from './nylas.js';

// ===========================================
// TYPES
// ===========================================

export interface SyncedContact {
  id: string;
  providerId: string;
  email: string | null;
  givenName: string | null;
  surname: string | null;
  displayName: string | null;
  companyName: string | null;
  jobTitle: string | null;
  phoneNumbers: Array<{ number: string; type?: string }> | null;
  emails: Array<{ email: string; type?: string }> | null;
  addresses: Array<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    type?: string;
  }> | null;
  birthday: Date | null;
  notes: string | null;
  photoUrl: string | null;
  groups: string[];
  source: string | null;
  syncedAt: Date;
}

export interface ContactSyncResult {
  success: boolean;
  contacts: SyncedContact[];
  added: number;
  removed: number;
  updated: number;
}

// ===========================================
// SYNC CONTACTS FROM PROVIDER
// ===========================================

export async function syncContacts(tenantId: string): Promise<ContactSyncResult> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Fetch contacts from Nylas (paginate through all)
  const remoteContacts: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await nylasLib.listContacts(tenant.nylasGrantId, {
      limit: 100,
      pageToken,
    });
    remoteContacts.push(...response.data);
    pageToken = response.nextCursor;
  } while (pageToken);

  // Get existing synced contacts from database
  const existingContacts = await db.contact.findMany({
    where: { tenantId: tenant.id },
  });

  const existingMap = new Map(existingContacts.map(c => [c.providerId, c]));
  const remoteMap = new Map(remoteContacts.map((c: any) => [c.id, c]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  // Process remote contacts
  for (const remote of remoteContacts) {
    const existing = existingMap.get(remote.id);
    const primaryEmail = remote.emails?.[0]?.email || null;
    const displayName = remote.givenName && remote.surname
      ? `${remote.givenName} ${remote.surname}`.trim()
      : remote.givenName || remote.surname || primaryEmail || 'Unknown';

    const contactData = {
      providerId: remote.id,
      email: primaryEmail,
      givenName: remote.givenName || null,
      surname: remote.surname || null,
      displayName,
      companyName: remote.companyName || null,
      jobTitle: remote.jobTitle || null,
      phoneNumbers: remote.phoneNumbers || null,
      emails: remote.emails || null,
      addresses: remote.physicalAddresses || null,
      birthday: remote.birthday ? new Date(remote.birthday) : null,
      notes: remote.notes || null,
      photoUrl: remote.pictureUrl || null,
      groups: remote.groups || [],
      source: remote.source || null,
      syncedAt: new Date(),
    };

    if (existing) {
      // Update if changed
      await db.contact.update({
        where: { id: existing.id },
        data: contactData,
      });
      updated++;
    } else {
      // Add new contact
      await db.contact.create({
        data: {
          tenantId: tenant.id,
          ...contactData,
        },
      });
      added++;
    }
  }

  // Remove contacts that no longer exist remotely
  for (const existing of existingContacts) {
    if (!remoteMap.has(existing.providerId)) {
      await db.contact.delete({
        where: { id: existing.id },
      });
      removed++;
    }
  }

  // Fetch updated list
  const syncedContacts = await db.contact.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ displayName: 'asc' }],
  });

  return {
    success: true,
    contacts: syncedContacts as SyncedContact[],
    added,
    removed,
    updated,
  };
}

// ===========================================
// GET CACHED CONTACTS
// ===========================================

export async function getCachedContacts(
  tenantId: string,
  options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ contacts: SyncedContact[]; total: number }> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const where: any = { tenantId: tenant.id };

  // Add search filter
  if (options?.search) {
    where.OR = [
      { displayName: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
      { companyName: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: [{ displayName: 'asc' }],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.contact.count({ where }),
  ]);

  return {
    contacts: contacts as SyncedContact[],
    total,
  };
}

// ===========================================
// GET CONTACT BY ID
// ===========================================

export async function getContact(
  tenantId: string,
  contactId: string
): Promise<SyncedContact | null> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const contact = await db.contact.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: contactId }, { providerId: contactId }],
    },
  });

  return contact as SyncedContact | null;
}

// ===========================================
// CREATE CONTACT WITH SYNC
// ===========================================

export async function createAndSyncContact(
  tenantId: string,
  params: {
    givenName?: string;
    surname?: string;
    email?: string;
    phoneNumber?: string;
    companyName?: string;
    jobTitle?: string;
  }
): Promise<SyncedContact> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Create contact in provider
  const remoteContact = await nylasLib.createContact(tenant.nylasGrantId, {
    givenName: params.givenName,
    surname: params.surname,
    emails: params.email ? [{ email: params.email, type: 'work' }] : undefined,
    phoneNumbers: params.phoneNumber ? [{ number: params.phoneNumber, type: 'work' }] : undefined,
    companyName: params.companyName,
    jobTitle: params.jobTitle,
  });

  const displayName = params.givenName && params.surname
    ? `${params.givenName} ${params.surname}`.trim()
    : params.givenName || params.surname || params.email || 'Unknown';

  // Save to database
  const contact = await db.contact.create({
    data: {
      tenantId: tenant.id,
      providerId: remoteContact.id,
      email: params.email || null,
      givenName: params.givenName || null,
      surname: params.surname || null,
      displayName,
      companyName: params.companyName || null,
      jobTitle: params.jobTitle || null,
      phoneNumbers: params.phoneNumber ? [{ number: params.phoneNumber, type: 'work' }] : undefined,
      emails: params.email ? [{ email: params.email, type: 'work' }] : undefined,
      syncedAt: new Date(),
    },
  });

  return contact as SyncedContact;
}

// ===========================================
// UPDATE CONTACT WITH SYNC
// ===========================================

export async function updateAndSyncContact(
  tenantId: string,
  contactId: string,
  params: {
    givenName?: string;
    surname?: string;
    email?: string;
    phoneNumber?: string;
    companyName?: string;
    jobTitle?: string;
  }
): Promise<SyncedContact> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the contact
  const contact = await db.contact.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: contactId }, { providerId: contactId }],
    },
  });

  if (!contact) {
    throw new Error('Contact not found');
  }

  // Update in provider
  await nylasLib.nylas.contacts.update({
    identifier: tenant.nylasGrantId,
    contactId: contact.providerId,
    requestBody: {
      givenName: params.givenName,
      surname: params.surname,
      emails: params.email ? [{ email: params.email, type: 'work' }] : undefined,
      phoneNumbers: params.phoneNumber ? [{ number: params.phoneNumber, type: 'work' }] : undefined,
      companyName: params.companyName,
      jobTitle: params.jobTitle,
    },
  });

  const displayName = params.givenName && params.surname
    ? `${params.givenName} ${params.surname}`.trim()
    : params.givenName || params.surname || params.email || contact.displayName || 'Unknown';

  // Update in database
  const updatedContact = await db.contact.update({
    where: { id: contact.id },
    data: {
      givenName: params.givenName ?? contact.givenName,
      surname: params.surname ?? contact.surname,
      displayName,
      email: params.email ?? contact.email,
      companyName: params.companyName ?? contact.companyName,
      jobTitle: params.jobTitle ?? contact.jobTitle,
      phoneNumbers: params.phoneNumber
        ? [{ number: params.phoneNumber, type: 'work' }]
        : contact.phoneNumbers ?? undefined,
      emails: params.email
        ? [{ email: params.email, type: 'work' }]
        : contact.emails ?? undefined,
      syncedAt: new Date(),
    },
  });

  return updatedContact as SyncedContact;
}

// ===========================================
// DELETE CONTACT WITH SYNC
// ===========================================

export async function deleteAndSyncContact(
  tenantId: string,
  contactId: string
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the contact
  const contact = await db.contact.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: contactId }, { providerId: contactId }],
    },
  });

  if (!contact) {
    throw new Error('Contact not found');
  }

  // Delete from provider
  await nylasLib.nylas.contacts.destroy({
    identifier: tenant.nylasGrantId,
    contactId: contact.providerId,
  });

  // Delete from database
  await db.contact.delete({
    where: { id: contact.id },
  });
}

// ===========================================
// SEARCH CONTACTS
// ===========================================

export async function searchContacts(
  tenantId: string,
  query: string,
  limit = 20
): Promise<SyncedContact[]> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const contacts = await db.contact.findMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { displayName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { companyName: { contains: query, mode: 'insensitive' } },
        { givenName: { contains: query, mode: 'insensitive' } },
        { surname: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ displayName: 'asc' }],
    take: limit,
  });

  return contacts as SyncedContact[];
}

// ===========================================
// INITIAL CONTACT SYNC
// ===========================================

export async function initialContactSync(tenantId: string): Promise<ContactSyncResult> {
  const result = await syncContacts(tenantId);

  // Log the sync
  await db.activityLog.create({
    data: {
      tenantId,
      action: 'contact_sync',
      status: 'success',
      input: {
        added: result.added,
        removed: result.removed,
        updated: result.updated,
        total: result.contacts.length,
      },
    },
  });

  return result;
}
