// ===========================================
// CONTACT SYNC ROUTES
// API endpoints for contact synchronization
// ===========================================

import { Router } from 'express';
import {
  syncContacts,
  getCachedContacts,
  getContact,
  createAndSyncContact,
  updateAndSyncContact,
  deleteAndSyncContact,
  searchContacts,
  initialContactSync,
} from '../lib/contactSync.js';

const router = Router();

// ===========================================
// SYNC CONTACTS
// POST /contacts/:tenantId/sync
// Full sync of contacts from email provider
// ===========================================

router.post('/:tenantId/sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await syncContacts(tenantId);

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
// POST /contacts/:tenantId/initial-sync
// Run initial contact sync (after OAuth connection)
// ===========================================

router.post('/:tenantId/initial-sync', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await initialContactSync(tenantId);

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
// GET CACHED CONTACTS
// GET /contacts/:tenantId
// Returns contacts from local cache (fast)
// ===========================================

router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { search, limit, offset } = req.query;

    const result = await getCachedContacts(tenantId, {
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

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
// SEARCH CONTACTS
// GET /contacts/:tenantId/search
// Search contacts by name, email, company
// ===========================================

router.get('/:tenantId/search', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { q, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required',
      });
    }

    const contacts = await searchContacts(
      tenantId,
      q as string,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: { contacts },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// GET CONTACT
// GET /contacts/:tenantId/:contactId
// Get a single contact by ID
// ===========================================

router.get('/:tenantId/:contactId', async (req, res) => {
  try {
    const { tenantId, contactId } = req.params;
    const contact = await getContact(tenantId, contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    res.json({
      success: true,
      data: { contact },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// CREATE CONTACT
// POST /contacts/:tenantId/create
// Creates contact in provider and syncs to cache
// ===========================================

router.post('/:tenantId/create', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { givenName, surname, email, phoneNumber, companyName, jobTitle } = req.body;

    if (!givenName && !surname && !email) {
      return res.status(400).json({
        success: false,
        error: 'At least one of givenName, surname, or email is required',
      });
    }

    const contact = await createAndSyncContact(tenantId, {
      givenName,
      surname,
      email,
      phoneNumber,
      companyName,
      jobTitle,
    });

    res.json({
      success: true,
      data: { contact },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// UPDATE CONTACT
// PUT /contacts/:tenantId/:contactId
// Updates contact in provider and cache
// ===========================================

router.put('/:tenantId/:contactId', async (req, res) => {
  try {
    const { tenantId, contactId } = req.params;
    const { givenName, surname, email, phoneNumber, companyName, jobTitle } = req.body;

    const contact = await updateAndSyncContact(tenantId, contactId, {
      givenName,
      surname,
      email,
      phoneNumber,
      companyName,
      jobTitle,
    });

    res.json({
      success: true,
      data: { contact },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================================
// DELETE CONTACT
// DELETE /contacts/:tenantId/:contactId
// Deletes contact from provider and cache
// ===========================================

router.delete('/:tenantId/:contactId', async (req, res) => {
  try {
    const { tenantId, contactId } = req.params;

    await deleteAndSyncContact(tenantId, contactId);

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

export default router;
