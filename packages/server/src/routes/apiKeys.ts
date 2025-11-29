// ===========================================
// API KEY MANAGEMENT ROUTES
// Create, list, revoke API keys
// ===========================================

import { Router } from 'express';
import { db } from '../lib/db.js';
import { createApiKey, listApiKeys, revokeApiKey, deleteApiKey, AVAILABLE_SCOPES } from '../lib/apiKey.js';
import { getUsage, getUsageHistory, getBillingInfo } from '../lib/usage.js';
import { authRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Helper to find or create tenant
async function getOrCreateTenant(tenantId: string) {
  let tenant = await db.tenant.findFirst({
    where: {
      OR: [
        { id: tenantId },
        { slug: tenantId },
      ],
    },
  });

  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        id: tenantId,
        name: tenantId,
        slug: tenantId,
      },
    });
  }

  return tenant;
}

// ===========================================
// GET /api-keys/:tenantId
// List all API keys for a tenant
// ===========================================
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const keys = await listApiKeys(tenant.id);

    res.json({
      success: true,
      keys: keys.map(k => ({
        ...k,
        // Mask the key prefix for security
        keyHint: k.keyPrefix + '...',
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list API keys',
    });
  }
});

// ===========================================
// POST /api-keys/:tenantId
// Create a new API key
// ===========================================
router.post('/:tenantId', authRateLimit(), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, scopes, expiresAt, isTest } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: name',
      });
    }

    const tenant = await getOrCreateTenant(tenantId);

    // Validate scopes if provided
    if (scopes && Array.isArray(scopes)) {
      const invalidScopes = scopes.filter(s => !AVAILABLE_SCOPES.includes(s));
      if (invalidScopes.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid scopes: ${invalidScopes.join(', ')}`,
          availableScopes: AVAILABLE_SCOPES,
        });
      }
    }

    const { key, keyInfo } = await createApiKey({
      tenantId: tenant.id,
      name,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isTest,
    });

    res.status(201).json({
      success: true,
      message: 'API key created. Save this key - it will not be shown again!',
      key, // Only shown once!
      keyInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create API key',
    });
  }
});

// ===========================================
// POST /api-keys/:tenantId/:keyId/revoke
// Revoke an API key (soft delete)
// ===========================================
router.post('/:tenantId/:keyId/revoke', async (req, res) => {
  try {
    const { tenantId, keyId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const success = await revokeApiKey(keyId, tenant.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      message: 'API key revoked',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke API key',
    });
  }
});

// ===========================================
// DELETE /api-keys/:tenantId/:keyId
// Permanently delete an API key
// ===========================================
router.delete('/:tenantId/:keyId', async (req, res) => {
  try {
    const { tenantId, keyId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const success = await deleteApiKey(keyId, tenant.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      message: 'API key deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete API key',
    });
  }
});

// ===========================================
// GET /api-keys/:tenantId/scopes
// List available scopes
// ===========================================
router.get('/:tenantId/scopes', (req, res) => {
  res.json({
    success: true,
    scopes: AVAILABLE_SCOPES,
    descriptions: {
      '*': 'Full access to all features',
      'email:*': 'Full email access (read and write)',
      'email:read': 'Read emails and folders',
      'email:write': 'Send and modify emails',
      'calendar:*': 'Full calendar access',
      'calendar:read': 'Read calendar events',
      'calendar:write': 'Create and modify events',
      'contacts:*': 'Full contacts access',
      'contacts:read': 'Read contacts',
      'contacts:write': 'Create and modify contacts',
      'files:*': 'Full file access (OneDrive/SharePoint)',
      'files:read': 'Read files',
      'files:write': 'Upload and modify files',
      'teams:*': 'Full Teams access',
      'teams:read': 'Read Teams messages',
      'teams:write': 'Send Teams messages',
      'ai:*': 'AI features (draft, summarize, etc.)',
    },
  });
});

// ===========================================
// USAGE ENDPOINTS
// ===========================================

// GET /api-keys/:tenantId/usage
// Get current month usage
router.get('/:tenantId/usage', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { period } = req.query;
    const tenant = await getOrCreateTenant(tenantId);

    const usage = await getUsage(tenant.id, period as string);

    res.json({
      success: true,
      ...usage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage',
    });
  }
});

// GET /api-keys/:tenantId/usage/history
// Get usage history
router.get('/:tenantId/usage/history', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { months } = req.query;
    const tenant = await getOrCreateTenant(tenantId);

    const history = await getUsageHistory(tenant.id, months ? parseInt(months as string) : 6);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage history',
    });
  }
});

// GET /api-keys/:tenantId/billing
// Get billing info (plan, usage, limits)
router.get('/:tenantId/billing', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const billing = await getBillingInfo(tenant.id);

    res.json({
      success: true,
      ...billing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get billing info',
    });
  }
});

export default router;
