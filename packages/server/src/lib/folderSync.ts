// ===========================================
// FOLDER SYNC UTILITIES
// Sync email folders including custom folders
// ===========================================

import { db } from './db.js';
import * as nylasLib from './nylas.js';

// ===========================================
// TYPES
// ===========================================

export interface SyncedFolder {
  id: string;
  providerId: string; // Folder ID from email provider (Nylas)
  name: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';
  totalCount: number;
  unreadCount: number;
  parentId: string | null;
  path: string; // Full path like "Clients/Acme Corp"
  syncedAt: Date;
}

export interface FolderSyncResult {
  success: boolean;
  folders: SyncedFolder[];
  added: string[];
  removed: string[];
  updated: string[];
}

// ===========================================
// SYSTEM FOLDER MAPPING
// ===========================================

const SYSTEM_FOLDER_TYPES: Record<string, SyncedFolder['type']> = {
  inbox: 'inbox',
  sent: 'sent',
  'sent mail': 'sent',
  drafts: 'drafts',
  draft: 'drafts',
  trash: 'trash',
  deleted: 'trash',
  'deleted items': 'trash',
  spam: 'spam',
  junk: 'spam',
  'junk email': 'spam',
  archive: 'archive',
  'all mail': 'archive',
};

function getFolderType(name: string): SyncedFolder['type'] {
  const normalized = name.toLowerCase().trim();
  return SYSTEM_FOLDER_TYPES[normalized] || 'custom';
}

// ===========================================
// SYNC FOLDERS FROM PROVIDER
// ===========================================

export async function syncFolders(tenantId: string): Promise<FolderSyncResult> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Fetch current folders from Nylas
  const remoteFolders = await nylasLib.listFolders(tenant.nylasGrantId);

  // Get existing synced folders from database
  const existingFolders = await db.emailFolder.findMany({
    where: { tenantId: tenant.id },
  });

  const existingMap = new Map(existingFolders.map(f => [f.providerId, f]));
  const remoteMap = new Map(remoteFolders.map((f: any) => [f.id, f]));

  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];

  // Build folder path map for nested folders
  const pathMap = buildFolderPaths(remoteFolders);

  // Process remote folders
  for (const remote of remoteFolders) {
    const existing = existingMap.get(remote.id);
    const folderType = getFolderType(remote.name || '');
    const path = pathMap.get(remote.id) || remote.name || '';

    if (existing) {
      // Update if changed
      if (
        existing.name !== remote.name ||
        existing.totalCount !== (remote.totalCount || 0) ||
        existing.unreadCount !== (remote.unreadCount || 0)
      ) {
        await db.emailFolder.update({
          where: { id: existing.id },
          data: {
            name: remote.name,
            type: folderType,
            totalCount: remote.totalCount || 0,
            unreadCount: remote.unreadCount || 0,
            parentId: remote.parentId || null,
            path,
            syncedAt: new Date(),
          },
        });
        updated.push(remote.name);
      }
    } else {
      // Add new folder
      await db.emailFolder.create({
        data: {
          tenantId: tenant.id,
          providerId: remote.id,
          name: remote.name,
          type: folderType,
          totalCount: remote.totalCount || 0,
          unreadCount: remote.unreadCount || 0,
          parentId: remote.parentId || null,
          path,
          syncedAt: new Date(),
        },
      });
      added.push(remote.name);
    }
  }

  // Remove folders that no longer exist remotely
  for (const existing of existingFolders) {
    if (!remoteMap.has(existing.providerId)) {
      await db.emailFolder.delete({
        where: { id: existing.id },
      });
      removed.push(existing.name);
    }
  }

  // Fetch updated list
  const syncedFolders = await db.emailFolder.findMany({
    where: { tenantId: tenant.id },
    orderBy: [
      { type: 'asc' },
      { name: 'asc' },
    ],
  });

  // Sort with system folders first
  const sorted = sortFolders(syncedFolders);

  return {
    success: true,
    folders: sorted,
    added,
    removed,
    updated,
  };
}

// ===========================================
// BUILD FOLDER PATHS
// ===========================================

function buildFolderPaths(folders: any[]): Map<string, string> {
  const pathMap = new Map<string, string>();
  const folderMap = new Map(folders.map(f => [f.id, f]));

  function getPath(folder: any): string {
    if (!folder.parentId) {
      return folder.name || '';
    }
    const parent = folderMap.get(folder.parentId);
    if (!parent) {
      return folder.name || '';
    }
    return `${getPath(parent)}/${folder.name}`;
  }

  for (const folder of folders) {
    pathMap.set(folder.id, getPath(folder));
  }

  return pathMap;
}

// ===========================================
// SORT FOLDERS
// ===========================================

function sortFolders(folders: any[]): SyncedFolder[] {
  const systemOrder = ['inbox', 'sent', 'drafts', 'archive', 'spam', 'trash'];

  return folders.sort((a, b) => {
    const aIndex = systemOrder.indexOf(a.type);
    const bIndex = systemOrder.indexOf(b.type);

    // System folders first
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // Then by path (alphabetically)
    return (a.path || a.name).localeCompare(b.path || b.name);
  });
}

// ===========================================
// GET CACHED FOLDERS
// ===========================================

export async function getCachedFolders(tenantId: string): Promise<SyncedFolder[]> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const folders = await db.emailFolder.findMany({
    where: { tenantId: tenant.id },
  });

  return sortFolders(folders);
}

// ===========================================
// CREATE CUSTOM FOLDER WITH SYNC
// ===========================================

export async function createAndSyncFolder(
  tenantId: string,
  name: string,
  parentId?: string
): Promise<SyncedFolder> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Create folder in provider
  const remoteFolder = await nylasLib.createFolder(
    tenant.nylasGrantId,
    name,
    parentId
  );

  // Calculate path
  let path = name;
  if (parentId) {
    const parentFolder = await db.emailFolder.findFirst({
      where: { tenantId: tenant.id, providerId: parentId },
    });
    if (parentFolder) {
      path = `${parentFolder.path}/${name}`;
    }
  }

  // Save to database
  const folder = await db.emailFolder.create({
    data: {
      tenantId: tenant.id,
      providerId: remoteFolder.id,
      name: remoteFolder.name,
      type: 'custom',
      totalCount: 0,
      unreadCount: 0,
      parentId: remoteFolder.parentId || null,
      path,
      syncedAt: new Date(),
    },
  });

  return folder as SyncedFolder;
}

// ===========================================
// DELETE FOLDER WITH SYNC
// ===========================================

export async function deleteAndSyncFolder(
  tenantId: string,
  folderId: string
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find the folder
  const folder = await db.emailFolder.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ id: folderId }, { providerId: folderId }],
    },
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  // Prevent deletion of system folders
  if (folder.type !== 'custom') {
    throw new Error('Cannot delete system folders');
  }

  // Delete from provider
  await nylasLib.deleteFolder(tenant.nylasGrantId, folder.providerId);

  // Delete from database (including child folders)
  await db.emailFolder.deleteMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { id: folder.id },
        { path: { startsWith: `${folder.path}/` } },
      ],
    },
  });
}

// ===========================================
// FIND OR CREATE FOLDER
// ===========================================

export async function findOrCreateFolder(
  tenantId: string,
  folderName: string,
  createIfMissing = true
): Promise<SyncedFolder | null> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // First check database cache
  let folder = await db.emailFolder.findFirst({
    where: {
      tenantId: tenant.id,
      name: { equals: folderName, mode: 'insensitive' },
    },
  });

  if (folder) {
    return folder as SyncedFolder;
  }

  // Check provider directly
  const remoteFolder = await nylasLib.findFolderByName(
    tenant.nylasGrantId,
    folderName
  );

  if (remoteFolder) {
    // Add to cache
    folder = await db.emailFolder.create({
      data: {
        tenantId: tenant.id,
        providerId: remoteFolder.id,
        name: remoteFolder.name,
        type: getFolderType(remoteFolder.name),
        totalCount: remoteFolder.totalCount || 0,
        unreadCount: remoteFolder.unreadCount || 0,
        parentId: remoteFolder.parentId || null,
        path: remoteFolder.name,
        syncedAt: new Date(),
      },
    });
    return folder as SyncedFolder;
  }

  // Create if requested
  if (createIfMissing) {
    return createAndSyncFolder(tenantId, folderName);
  }

  return null;
}

// ===========================================
// MOVE EMAIL TO FOLDER (WITH AUTO-CREATE)
// ===========================================

export async function moveEmailToSyncedFolder(
  tenantId: string,
  emailId: string,
  folderName: string,
  createIfMissing = true
): Promise<{ success: boolean; folder: SyncedFolder | null }> {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant?.nylasGrantId) {
    throw new Error('Tenant not connected to email provider');
  }

  // Find or create folder
  const folder = await findOrCreateFolder(tenantId, folderName, createIfMissing);

  if (!folder) {
    return { success: false, folder: null };
  }

  // Move email
  await nylasLib.updateMessage(tenant.nylasGrantId, emailId, {
    folders: [folder.providerId],
  });

  return { success: true, folder };
}

// ===========================================
// BATCH SYNC (FOR INITIAL SETUP)
// ===========================================

export async function initialFolderSync(tenantId: string): Promise<FolderSyncResult> {
  // Full sync
  const result = await syncFolders(tenantId);

  // Log the sync
  await db.activityLog.create({
    data: {
      tenantId,
      action: 'folder_sync',
      status: 'success',
      input: {
        added: result.added.length,
        removed: result.removed.length,
        updated: result.updated.length,
        total: result.folders.length,
      },
    },
  });

  return result;
}
