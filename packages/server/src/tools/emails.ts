import { getTenantWithGrant, logActivity } from '../lib/db.js';
import * as nylasLib from '../lib/nylas.js';

// ===========================================
// LIST EMAILS
// ===========================================
export async function listEmails(params: {
  tenant_id: string;
  folder_id?: string;
  limit?: number;
  page_token?: string;
  unread_only?: boolean;
}) {
  const startTime = Date.now();

  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const response = await nylasLib.listMessages(tenant.nylasGrantId!, {
      limit: params.limit || 50,
      pageToken: params.page_token,
      folderId: params.folder_id,
      unread: params.unread_only,
    });

    const emails = response.data.map(msg => ({
      id: msg.id,
      threadId: msg.threadId,
      subject: msg.subject,
      from: msg.from?.[0] || { email: 'unknown' },
      to: msg.to || [],
      snippet: msg.snippet,
      isRead: !msg.unread,
      isStarred: msg.starred || false,
      hasAttachments: (msg.attachments?.length || 0) > 0,
      receivedAt: msg.date ? new Date(msg.date * 1000).toISOString() : null,
      folders: msg.folders || [],
    }));

    await logActivity({
      tenantId: tenant.id,
      action: 'list_emails',
      status: 'success',
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      data: { emails, nextPageToken: response.nextCursor },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET EMAIL
// ===========================================
export async function getEmail(params: {
  tenant_id: string;
  email_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const message = await nylasLib.getMessage(tenant.nylasGrantId!, params.email_id);

    return {
      success: true,
      data: {
        id: message.id,
        threadId: message.threadId,
        subject: message.subject,
        from: message.from?.[0] || { email: 'unknown' },
        to: message.to || [],
        cc: message.cc || [],
        body: message.body,
        snippet: message.snippet,
        isRead: !message.unread,
        isStarred: message.starred || false,
        hasAttachments: (message.attachments?.length || 0) > 0,
        attachments: message.attachments?.map(a => ({
          id: a.id,
          filename: a.filename,
          contentType: a.contentType,
          size: a.size,
        })) || [],
        receivedAt: message.date ? new Date(message.date * 1000).toISOString() : null,
        folders: message.folders || [],
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SEND EMAIL
// ===========================================
export async function sendEmail(params: {
  tenant_id: string;
  to: { email: string; name?: string }[];
  subject: string;
  body: string;
  cc?: { email: string; name?: string }[];
  reply_to_message_id?: string;
}) {
  const startTime = Date.now();

  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const message = await nylasLib.sendMessage(tenant.nylasGrantId!, {
      to: params.to,
      subject: params.subject,
      body: params.body,
      cc: params.cc,
      replyToMessageId: params.reply_to_message_id,
    });

    await logActivity({
      tenantId: tenant.id,
      action: 'send_email',
      status: 'success',
      input: { to: params.to, subject: params.subject },
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      data: { id: message.id, threadId: message.threadId },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// MOVE EMAIL
// ===========================================
export async function moveEmail(params: {
  tenant_id: string;
  email_id: string;
  folder_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    await nylasLib.updateMessage(tenant.nylasGrantId!, params.email_id, {
      folders: [params.folder_id],
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// MARK READ
// ===========================================
export async function markRead(params: {
  tenant_id: string;
  email_id: string;
  is_read: boolean;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    await nylasLib.updateMessage(tenant.nylasGrantId!, params.email_id, {
      unread: !params.is_read,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// STAR EMAIL
// ===========================================
export async function starEmail(params: {
  tenant_id: string;
  email_id: string;
  is_starred: boolean;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    await nylasLib.updateMessage(tenant.nylasGrantId!, params.email_id, {
      starred: params.is_starred,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// TRASH EMAIL
// ===========================================
export async function trashEmail(params: {
  tenant_id: string;
  email_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    await nylasLib.trashMessage(tenant.nylasGrantId!, params.email_id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// SEARCH EMAILS
// ===========================================
export async function searchEmails(params: {
  tenant_id: string;
  query: string;
  limit?: number;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    const response = await nylasLib.nylas.messages.list({
      identifier: tenant.nylasGrantId!,
      queryParams: {
        limit: params.limit || 20,
        searchQueryNative: params.query,
      },
    });

    const emails = response.data.map(msg => ({
      id: msg.id,
      threadId: msg.threadId,
      subject: msg.subject,
      from: msg.from?.[0] || { email: 'unknown' },
      snippet: msg.snippet,
      isRead: !msg.unread,
      receivedAt: msg.date ? new Date(msg.date * 1000).toISOString() : null,
    }));

    return { success: true, data: { emails } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// LIST FOLDERS
// ===========================================
export async function listFolders(params: { tenant_id: string }) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const folders = await nylasLib.listFolders(tenant.nylasGrantId!);

    const typeMap: Record<string, string> = {
      inbox: 'inbox', sent: 'sent', drafts: 'drafts',
      trash: 'trash', spam: 'spam', archive: 'archive',
    };

    const mappedFolders = folders.map(f => ({
      id: f.id,
      name: f.name,
      type: typeMap[f.name?.toLowerCase() || ''] || 'custom',
      totalCount: f.totalCount || 0,
      unreadCount: f.unreadCount || 0,
    }));

    // Sort: system folders first
    const systemOrder = ['inbox', 'sent', 'drafts', 'archive', 'spam', 'trash'];
    mappedFolders.sort((a, b) => {
      const aIndex = systemOrder.indexOf(a.type);
      const bIndex = systemOrder.indexOf(b.type);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, data: { folders: mappedFolders } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
