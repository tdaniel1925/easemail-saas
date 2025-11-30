// ===========================================
// FOLDER SYNC ROUTES
// API endpoints for folder synchronization
// ===========================================

import { Router } from 'express';
import {
  syncFolders,
  getCachedFolders,
  createAndSyncFolder,
  deleteAndSyncFolder,
  findOrCreateFolder,
  moveEmailToSyncedFolder,
  initialFolderSync,
} from '../lib/folderSync.js';

const router = Router();

// ===========================================
// SYNC FOLDERS
// POST /folders/:tenantId/sync
// Full sync of folders from email provider
// ===========================================

router.post('/:tenantId/sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await syncFolders(tenantId);

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
// POST /folders/:tenantId/initial-sync
// Run initial folder sync (after OAuth connection)
// ===========================================

router.post('/:tenantId/initial-sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await initialFolderSync(tenantId);

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
// GET CACHED FOLDERS
// GET /folders/:tenantId
// Returns folders from local cache (fast)
// ===========================================

router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const folders = await getCachedFolders(tenantId);

    res.json({
      success: true,
      data: { folders },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// CREATE FOLDER
// POST /folders/:tenantId/create
// Creates folder in provider and syncs to cache
// ===========================================

router.post('/:tenantId/create', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required',
      });
    }

    const folder = await createAndSyncFolder(tenantId, name, parentId);

    res.json({
      success: true,
      data: { folder },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// DELETE FOLDER
// DELETE /folders/:tenantId/:folderId
// Deletes folder from provider and cache
// ===========================================

router.delete('/:tenantId/:folderId', async (req, res) => {
  try {
    const { tenantId, folderId } = req.params;

    await deleteAndSyncFolder(tenantId, folderId);

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

// ===========================================
// FIND OR CREATE FOLDER
// POST /folders/:tenantId/find-or-create
// Finds folder by name, creates if missing
// ===========================================

router.post('/:tenantId/find-or-create', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, createIfMissing = true } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required',
      });
    }

    const folder = await findOrCreateFolder(tenantId, name, createIfMissing);

    res.json({
      success: true,
      data: { folder },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// MOVE EMAIL TO FOLDER
// POST /folders/:tenantId/move-email
// Moves email to folder by name (creates if missing)
// ===========================================

router.post('/:tenantId/move-email', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { emailId, folderName, createIfMissing = true } = req.body;

    if (!emailId || !folderName) {
      return res.status(400).json({
        success: false,
        error: 'emailId and folderName are required',
      });
    }

    const result = await moveEmailToSyncedFolder(
      tenantId,
      emailId,
      folderName,
      createIfMissing
    );

    res.json({
      success: result.success,
      data: { folder: result.folder },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
