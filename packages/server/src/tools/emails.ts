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

    const emails = response.data.map((msg: any) => ({
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
        attachments: message.attachments?.map((a: any) => ({
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

    const emails = response.data.map((msg: any) => ({
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

    const mappedFolders = folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      type: typeMap[f.name?.toLowerCase() || ''] || 'custom',
      totalCount: f.totalCount || 0,
      unreadCount: f.unreadCount || 0,
      parentId: f.parentId || null,
    }));

    // Sort: system folders first
    const systemOrder = ['inbox', 'sent', 'drafts', 'archive', 'spam', 'trash'];
    mappedFolders.sort((a: any, b: any) => {
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

// ===========================================
// GET FOLDER
// ===========================================
export async function getFolder(params: {
  tenant_id: string;
  folder_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const folder = await nylasLib.getFolder(tenant.nylasGrantId!, params.folder_id);

    return {
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        totalCount: folder.totalCount || 0,
        unreadCount: folder.unreadCount || 0,
        parentId: folder.parentId || null,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// CREATE FOLDER
// ===========================================
export async function createFolder(params: {
  tenant_id: string;
  name: string;
  parent_id?: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const folder = await nylasLib.createFolder(tenant.nylasGrantId!, params.name, params.parent_id);

    await logActivity({
      tenantId: tenant.id,
      action: 'create_folder',
      status: 'success',
      input: { name: params.name },
    });

    return {
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId || null,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// UPDATE FOLDER
// ===========================================
export async function updateFolder(params: {
  tenant_id: string;
  folder_id: string;
  name: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const folder = await nylasLib.updateFolder(tenant.nylasGrantId!, params.folder_id, params.name);

    return {
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// DELETE FOLDER
// ===========================================
export async function deleteFolder(params: {
  tenant_id: string;
  folder_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    await nylasLib.deleteFolder(tenant.nylasGrantId!, params.folder_id);

    await logActivity({
      tenantId: tenant.id,
      action: 'delete_folder',
      status: 'success',
      input: { folderId: params.folder_id },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// MOVE EMAIL TO FOLDER BY NAME
// Allows moving email using folder name instead of ID
// Creates the folder if it doesn't exist
// ===========================================
export async function moveEmailToFolder(params: {
  tenant_id: string;
  email_id: string;
  folder_name: string;
  create_if_missing?: boolean;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    // Find folder by name
    let folder = await nylasLib.findFolderByName(tenant.nylasGrantId!, params.folder_name);

    // Create folder if it doesn't exist and create_if_missing is true
    if (!folder && params.create_if_missing) {
      folder = await nylasLib.createFolder(tenant.nylasGrantId!, params.folder_name);
    }

    if (!folder) {
      return {
        success: false,
        error: `Folder "${params.folder_name}" not found. Set create_if_missing=true to create it.`,
      };
    }

    // Move the email
    await nylasLib.updateMessage(tenant.nylasGrantId!, params.email_id, {
      folders: [folder.id],
    });

    await logActivity({
      tenantId: tenant.id,
      action: 'move_email_to_folder',
      status: 'success',
      input: { emailId: params.email_id, folderName: params.folder_name },
    });

    return {
      success: true,
      data: {
        folderId: folder.id,
        folderName: folder.name,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// ADD EMAIL TO FOLDERS
// Add email to multiple folders (labels in Gmail)
// ===========================================
export async function addEmailToFolders(params: {
  tenant_id: string;
  email_id: string;
  folder_ids: string[];
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    // Get current folders
    const message = await nylasLib.getMessage(tenant.nylasGrantId!, params.email_id);
    const currentFolders = message.folders || [];

    // Merge with new folders (remove duplicates)
    const allFolders = [...new Set([...currentFolders, ...params.folder_ids])];

    await nylasLib.updateMessage(tenant.nylasGrantId!, params.email_id, {
      folders: allFolders,
    });

    return {
      success: true,
      data: { folders: allFolders },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// REMOVE EMAIL FROM FOLDER
// ===========================================
export async function removeEmailFromFolder(params: {
  tenant_id: string;
  email_id: string;
  folder_id: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);

    // Get current folders
    const message = await nylasLib.getMessage(tenant.nylasGrantId!, params.email_id);
    const currentFolders = message.folders || [];

    // Remove the specified folder
    const newFolders = currentFolders.filter((f: string) => f !== params.folder_id);

    if (newFolders.length === 0) {
      return {
        success: false,
        error: 'Cannot remove email from all folders. At least one folder is required.',
      };
    }

    await nylasLib.updateMessage(tenant.nylasGrantId!, params.email_id, {
      folders: newFolders,
    });

    return {
      success: true,
      data: { folders: newFolders },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ===========================================
// GET FOLDER BY NAME
// Helper to get folder ID from name
// ===========================================
export async function getFolderByName(params: {
  tenant_id: string;
  folder_name: string;
}) {
  try {
    const tenant = await getTenantWithGrant(params.tenant_id);
    const folder = await nylasLib.findFolderByName(tenant.nylasGrantId!, params.folder_name);

    if (!folder) {
      return {
        success: false,
        error: `Folder "${params.folder_name}" not found`,
      };
    }

    return {
      success: true,
      data: {
        id: folder.id,
        name: folder.name,
        totalCount: folder.totalCount || 0,
        unreadCount: folder.unreadCount || 0,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
