// ===========================================
// INTEGRATION AUTH ROUTES
// OAuth flows for all integrations
// ===========================================

import { Router } from 'express';
import { db } from '../lib/db.js';
import { integrationRegistry } from '../integrations/index.js';
import 'dotenv/config';

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
// GET /integrations
// List all available integrations
// ===========================================
router.get('/', (req, res) => {
  const integrations = integrationRegistry.listIntegrations();
  res.json({ integrations });
});

// ===========================================
// GET /integrations/:integrationId/connect/:tenantId
// Start OAuth flow for an integration
// ===========================================
router.get('/:integrationId/connect/:tenantId', async (req, res) => {
  try {
    const { integrationId, tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const integration = integrationRegistry.get(integrationId);
    if (!integration) {
      return res.status(404).json({ error: `Unknown integration: ${integrationId}` });
    }

    if (!integration.isConfigured()) {
      return res.status(400).json({ error: `Integration ${integrationId} is not configured` });
    }

    if (!integration.getAuthUrl) {
      return res.status(400).json({ error: `Integration ${integrationId} does not support OAuth` });
    }

    // State includes both tenant ID and integration ID
    const state = JSON.stringify({ tenantId: tenant.id, integrationId });
    const authUrl = await integration.getAuthUrl(tenant.id, state);

    res.redirect(authUrl);
  } catch (error) {
    console.error('Integration connect error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start OAuth',
    });
  }
});

// ===========================================
// GET /integrations/callback/:integrationId
// Handle OAuth callback for specific integration
// ===========================================
router.get('/callback/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(
        `${process.env.APP_URL}/settings?error=oauth_failed&integration=${integrationId}&message=${encodeURIComponent(String(error))}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.APP_URL}/settings?error=missing_params&integration=${integrationId}`
      );
    }

    const integration = integrationRegistry.get(integrationId);
    if (!integration || !integration.handleCallback) {
      return res.redirect(
        `${process.env.APP_URL}/settings?error=unknown_integration&integration=${integrationId}`
      );
    }

    // Parse state
    let stateData: { tenantId: string; integrationId: string };
    try {
      stateData = JSON.parse(String(state));
    } catch {
      stateData = { tenantId: String(state), integrationId };
    }

    // Exchange code for credentials
    const credentials = await integration.handleCallback(String(code), stateData.tenantId);

    // Check if this is the first credential for this integration
    const existingCreds = await db.integrationCredential.count({
      where: {
        tenantId: stateData.tenantId,
        integrationId,
        isActive: true,
      },
    });
    const isFirst = existingCreds === 0;

    // Store credentials
    const accountEmail = credentials.metadata?.email as string || null;

    await db.integrationCredential.upsert({
      where: {
        tenantId_integrationId_accountEmail: {
          tenantId: stateData.tenantId,
          integrationId,
          accountEmail: accountEmail || '',
        },
      },
      update: {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        grantId: credentials.grantId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: credentials.metadata as any,
        isActive: true,
      },
      create: {
        tenantId: stateData.tenantId,
        integrationId,
        accountEmail: accountEmail || '',
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        grantId: credentials.grantId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: credentials.metadata as any,
        isPrimary: isFirst,
      },
    });

    console.log(`Integration connected: ${integrationId} for tenant ${stateData.tenantId}`);

    res.redirect(
      `${process.env.APP_URL}/settings?success=connected&integration=${integrationId}&email=${encodeURIComponent(accountEmail || '')}`
    );
  } catch (error) {
    console.error('Integration callback error:', error);
    res.redirect(
      `${process.env.APP_URL}/settings?error=callback_failed&message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error'
      )}`
    );
  }
});

// ===========================================
// GET /integrations/:integrationId/status/:tenantId
// Get connection status for an integration
// ===========================================
router.get('/:integrationId/status/:tenantId', async (req, res) => {
  try {
    const { integrationId, tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const credentials = await db.integrationCredential.findMany({
      where: {
        tenantId: tenant.id,
        integrationId,
        isActive: true,
      },
      select: {
        id: true,
        accountEmail: true,
        isPrimary: true,
        expiresAt: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({
      connected: credentials.length > 0,
      credentials: credentials.map(c => ({
        id: c.id,
        email: c.accountEmail,
        isPrimary: c.isPrimary,
        expiresAt: c.expiresAt,
        displayName: (c.metadata as Record<string, unknown>)?.displayName,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

// ===========================================
// DELETE /integrations/:integrationId/:tenantId/:credentialId
// Disconnect a specific credential
// ===========================================
router.delete('/:integrationId/:tenantId/:credentialId', async (req, res) => {
  try {
    const { integrationId, tenantId, credentialId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const credential = await db.integrationCredential.findFirst({
      where: {
        id: credentialId,
        tenantId: tenant.id,
        integrationId,
      },
    });

    if (!credential) {
      return res.status(404).json({ success: false, error: 'Credential not found' });
    }

    // Mark as inactive
    await db.integrationCredential.update({
      where: { id: credentialId },
      data: { isActive: false },
    });

    // If this was primary, set another as primary
    if (credential.isPrimary) {
      const next = await db.integrationCredential.findFirst({
        where: {
          tenantId: tenant.id,
          integrationId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (next) {
        await db.integrationCredential.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    res.json({ success: true, message: 'Disconnected' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    });
  }
});

// ===========================================
// GET /integrations/connected/:tenantId
// List all connected integrations for a tenant
// ===========================================
router.get('/connected/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const credentials = await db.integrationCredential.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        integrationId: true,
        accountEmail: true,
        isPrimary: true,
        metadata: true,
      },
    });

    // Group by integration
    const byIntegration: Record<string, unknown[]> = {};
    for (const cred of credentials) {
      if (!byIntegration[cred.integrationId]) {
        byIntegration[cred.integrationId] = [];
      }
      byIntegration[cred.integrationId].push({
        email: cred.accountEmail,
        isPrimary: cred.isPrimary,
        displayName: (cred.metadata as Record<string, unknown>)?.displayName,
      });
    }

    res.json({ integrations: byIntegration });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list integrations',
    });
  }
});

export default router;
