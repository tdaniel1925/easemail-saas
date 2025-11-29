import { Router } from 'express';
import { db } from '../lib/db.js';
import { nylas } from '../lib/nylas.js';
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
// GET /auth/connect/:tenantId
// Start OAuth flow for a tenant (add new account)
// ===========================================
router.get('/connect/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    // Build Nylas auth URL
    const authUrl = nylas.auth.urlForOAuth2({
      clientId: process.env.NYLAS_CLIENT_ID!,
      redirectUri: process.env.OAUTH_CALLBACK_URL!,
      state: tenant.id, // Pass tenant ID in state
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

    // Check if this is the first account for this tenant
    const existingAccounts = await db.account.count({
      where: { tenantId: String(tenantId), isActive: true },
    });
    const isFirstAccount = existingAccounts === 0;

    // Create or update account
    await db.account.upsert({
      where: {
        tenantId_email: {
          tenantId: String(tenantId),
          email: email,
        },
      },
      update: {
        nylasGrantId: grantId,
        provider: provider,
        isActive: true,
      },
      create: {
        tenantId: String(tenantId),
        email: email,
        provider: provider,
        nylasGrantId: grantId,
        isPrimary: isFirstAccount, // First account is primary
      },
    });

    // Also update legacy tenant fields for backward compatibility
    if (isFirstAccount) {
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
    }

    // Create sync state if doesn't exist
    await db.syncState.upsert({
      where: { tenantId: String(tenantId) },
      update: {},
      create: { tenantId: String(tenantId) },
    });

    console.log(`Account connected: ${email} (${provider}) for tenant ${tenantId}`);

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
// GET /auth/status/:tenantId
// Check connection status (returns all accounts)
// ===========================================
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    // Get all active accounts
    const accounts = await db.account.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        email: true,
        provider: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({
      connected: accounts.length > 0,
      accounts: accounts,
      // Legacy fields for backward compatibility
      email: accounts.find(a => a.isPrimary)?.email || accounts[0]?.email || null,
      provider: accounts.find(a => a.isPrimary)?.provider || accounts[0]?.provider || null,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

// ===========================================
// GET /auth/accounts/:tenantId
// List all accounts for a tenant
// ===========================================
router.get('/accounts/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    const accounts = await db.account.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        email: true,
        provider: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list accounts',
    });
  }
});

// ===========================================
// DELETE /auth/accounts/:tenantId/:accountId
// Disconnect a specific account
// ===========================================
router.delete('/accounts/:tenantId/:accountId', async (req, res) => {
  try {
    const { tenantId, accountId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    // Find the account
    const account = await db.account.findFirst({
      where: { id: accountId, tenantId: tenant.id },
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    // Revoke Nylas grant
    try {
      await nylas.grants.destroy({ grantId: account.nylasGrantId });
    } catch (e) {
      console.warn('Failed to revoke grant:', e);
    }

    // Mark account as inactive
    await db.account.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    // If this was the primary account, set another as primary
    if (account.isPrimary) {
      const nextAccount = await db.account.findFirst({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (nextAccount) {
        await db.account.update({
          where: { id: nextAccount.id },
          data: { isPrimary: true },
        });

        // Update legacy tenant fields
        await db.tenant.update({
          where: { id: tenant.id },
          data: {
            nylasGrantId: nextAccount.nylasGrantId,
            connectedEmail: nextAccount.email,
            provider: nextAccount.provider,
          },
        });
      } else {
        // No more accounts, clear legacy fields
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
      }
    }

    res.json({ success: true, message: 'Account disconnected' });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect account',
    });
  }
});

// ===========================================
// POST /auth/accounts/:tenantId/:accountId/primary
// Set an account as primary
// ===========================================
router.post('/accounts/:tenantId/:accountId/primary', async (req, res) => {
  try {
    const { tenantId, accountId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    // Find the account
    const account = await db.account.findFirst({
      where: { id: accountId, tenantId: tenant.id, isActive: true },
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    // Remove primary from all accounts
    await db.account.updateMany({
      where: { tenantId: tenant.id },
      data: { isPrimary: false },
    });

    // Set this one as primary
    await db.account.update({
      where: { id: accountId },
      data: { isPrimary: true },
    });

    // Update legacy tenant fields
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        nylasGrantId: account.nylasGrantId,
        connectedEmail: account.email,
        provider: account.provider,
        emailConnected: true,
        connectedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Primary account updated' });
  } catch (error) {
    console.error('Set primary error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set primary account',
    });
  }
});

// ===========================================
// POST /auth/disconnect/:tenantId (Legacy)
// Disconnect primary account (backward compatibility)
// ===========================================
router.post('/disconnect/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getOrCreateTenant(tenantId);

    // Find primary account
    const primaryAccount = await db.account.findFirst({
      where: { tenantId: tenant.id, isPrimary: true, isActive: true },
    });

    if (primaryAccount) {
      // Revoke Nylas grant
      try {
        await nylas.grants.destroy({ grantId: primaryAccount.nylasGrantId });
      } catch (e) {
        console.warn('Failed to revoke grant:', e);
      }

      // Mark as inactive
      await db.account.update({
        where: { id: primaryAccount.id },
        data: { isActive: false },
      });
    }

    // Also try legacy grant on tenant
    if (tenant.nylasGrantId && tenant.nylasGrantId !== primaryAccount?.nylasGrantId) {
      try {
        await nylas.grants.destroy({ grantId: tenant.nylasGrantId });
      } catch (e) {
        console.warn('Failed to revoke legacy grant:', e);
      }
    }

    // Find next account to be primary
    const nextAccount = await db.account.findFirst({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (nextAccount) {
      await db.account.update({
        where: { id: nextAccount.id },
        data: { isPrimary: true },
      });

      await db.tenant.update({
        where: { id: tenant.id },
        data: {
          nylasGrantId: nextAccount.nylasGrantId,
          connectedEmail: nextAccount.email,
          provider: nextAccount.provider,
        },
      });
    } else {
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
    }

    res.json({ success: true, message: 'Email disconnected' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    });
  }
});

export default router;
