import { Router } from 'express';
import { db } from '../lib/db.js';
import { nylas } from '../lib/nylas.js';
import 'dotenv/config';

const router = Router();

// ===========================================
// GET /auth/connect/:tenantId
// Start OAuth flow for a tenant
// ===========================================
router.get('/connect/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Find existing tenant by id or slug
    let tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { id: tenantId },
          { slug: tenantId },
        ],
      },
    });

    // Create if doesn't exist
    if (!tenant) {
      tenant = await db.tenant.create({
        data: {
          id: tenantId,
          name: tenantId,
          slug: tenantId,
        },
      });
    }

    // Build Nylas auth URL
    const authUrl = nylas.auth.urlForOAuth2({
      clientId: process.env.NYLAS_CLIENT_ID!,
      redirectUri: process.env.OAUTH_CALLBACK_URL!,
      state: tenant.id, // Pass tenant ID in state
      loginHint: tenant.connectedEmail || undefined,
    });

    // Redirect to Nylas (user will see Google/Microsoft login)
    res.redirect(authUrl);
  } catch (error) {
    console.error('OAuth connect error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start OAuth',
    });
  }
});

// ===========================================
// GET /auth/callback
// Handle OAuth callback from Nylas
// ===========================================
router.get('/callback', async (req, res) => {
  try {
    const { code, state: tenantId, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(
        `${process.env.APP_URL}/settings?error=oauth_failed&message=${encodeURIComponent(String(error))}`
      );
    }

    if (!code || !tenantId) {
      return res.redirect(
        `${process.env.APP_URL}/settings?error=missing_params`
      );
    }

    // Exchange code for grant
    const response = await nylas.auth.exchangeCodeForToken({
      clientId: process.env.NYLAS_CLIENT_ID!,
      clientSecret: process.env.NYLAS_API_KEY!,
      redirectUri: process.env.OAUTH_CALLBACK_URL!,
      code: String(code),
    });

    const grantId = response.grantId;
    const email = response.email;

    // Get provider info
    const grantInfo = await nylas.grants.find({ grantId });
    const provider = grantInfo.data.provider || 'unknown';

    // Update tenant with Nylas connection
    await db.tenant.update({
      where: { id: String(tenantId) },
      data: {
        nylasGrantId: grantId,
        emailConnected: true,
        connectedEmail: email,
        provider: provider,
        connectedAt: new Date(),
      },
    });

    // Create sync state if doesn't exist
    await db.syncState.upsert({
      where: { tenantId: String(tenantId) },
      update: {},
      create: { tenantId: String(tenantId) },
    });

    console.log(`Tenant ${tenantId} connected: ${email} (${provider})`);

    // Redirect back to app
    res.redirect(
      `${process.env.APP_URL}/settings?success=connected&email=${encodeURIComponent(email || '')}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(
      `${process.env.APP_URL}/settings?error=callback_failed&message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error'
      )}`
    );
  }
});

// ===========================================
// POST /auth/disconnect/:tenantId
// Disconnect a tenant's email
// ===========================================
router.post('/disconnect/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Find existing tenant by id or slug
    let tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { id: tenantId },
          { slug: tenantId },
        ],
      },
    });

    // Create if doesn't exist
    if (!tenant) {
      tenant = await db.tenant.create({
        data: {
          id: tenantId,
          name: tenantId,
          slug: tenantId,
        },
      });
    }

    // Revoke Nylas grant if exists
    if (tenant.nylasGrantId) {
      try {
        await nylas.grants.destroy({ grantId: tenant.nylasGrantId });
      } catch (e) {
        // Grant might already be revoked, continue
        console.warn('Failed to revoke grant:', e);
      }
    }

    // Clear tenant's Nylas connection
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        nylasGrantId: null,
        emailConnected: false,
        connectedEmail: null,
        provider: null,
        connectedAt: null,
      },
    });

    res.json({ success: true, message: 'Email disconnected' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    });
  }
});

// ===========================================
// GET /auth/status/:tenantId
// Check connection status
// ===========================================
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Find existing tenant by id or slug
    let tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { id: tenantId },
          { slug: tenantId },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        emailConnected: true,
        connectedEmail: true,
        provider: true,
        connectedAt: true,
      },
    });

    // Create if doesn't exist
    if (!tenant) {
      tenant = await db.tenant.create({
        data: {
          id: tenantId,
          name: tenantId,
          slug: tenantId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          emailConnected: true,
          connectedEmail: true,
          provider: true,
          connectedAt: true,
        },
      });
    }

    res.json({
      connected: tenant.emailConnected,
      email: tenant.connectedEmail,
      provider: tenant.provider,
      connectedAt: tenant.connectedAt,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

export default router;
