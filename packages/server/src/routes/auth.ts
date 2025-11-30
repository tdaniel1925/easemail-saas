import { Router } from 'express';
import { db } from '../lib/db.js';
import { nylas } from '../lib/nylas.js';
import 'dotenv/config';

const router = Router();

// ===========================================
// HTML PAGE TEMPLATES
// ===========================================

function renderSuccessPage(email: string, tenantId: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Connected - BotMakers</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 40px; height: 40px; color: white; }
    h1 { color: #1f2937; margin-bottom: 12px; font-size: 24px; }
    .email {
      color: #6b7280;
      font-size: 16px;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .email strong { color: #374151; }
    .info {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 14px;
      color: #4b5563;
    }
    .close-hint {
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>Account Connected!</h1>
    <p class="email"><strong>${email}</strong> has been connected successfully.</p>
    <div class="info">
      <p>Your email account is now linked to tenant: <strong>${tenantId}</strong></p>
      <p style="margin-top: 8px;">You can now use all email, calendar, and contact features.</p>
    </div>
    <p class="close-hint">You can close this window now.</p>
  </div>
</body>
</html>
`;
}

function renderErrorPage(error: string, message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed - BotMakers</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 40px; height: 40px; color: white; }
    h1 { color: #1f2937; margin-bottom: 12px; font-size: 24px; }
    .error-type {
      color: #ef4444;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 14px;
      color: #991b1b;
      word-break: break-word;
    }
    .retry-btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .retry-btn:hover { background: #5a67d8; }
    .close-hint {
      color: #9ca3af;
      font-size: 14px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
    <h1>Connection Failed</h1>
    <p class="error-type">${error}</p>
    <div class="message">
      <p>${message}</p>
    </div>
    <p class="close-hint">Please close this window and try again.</p>
  </div>
</body>
</html>
`;
}

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
      return res.send(renderErrorPage('OAuth Error', String(error)));
    }

    if (!code || !tenantId) {
      return res.send(renderErrorPage('Missing Parameters', 'Authorization code or tenant ID is missing. Please try connecting again.'));
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

    // Check if account with this grantId already exists (could be from reconnect)
    const existingByGrantId = await db.account.findFirst({
      where: { nylasGrantId: grantId },
    });

    if (existingByGrantId) {
      // Account with this grantId exists - update it
      await db.account.update({
        where: { id: existingByGrantId.id },
        data: {
          tenantId: String(tenantId),
          email: email,
          provider: provider,
          isActive: true,
          isPrimary: isFirstAccount || existingByGrantId.isPrimary,
        },
      });
    } else {
      // Check if account with same tenant+email exists
      const existingByEmail = await db.account.findFirst({
        where: {
          tenantId: String(tenantId),
          email: email,
        },
      });

      if (existingByEmail) {
        // Update existing account with new grantId
        await db.account.update({
          where: { id: existingByEmail.id },
          data: {
            nylasGrantId: grantId,
            provider: provider,
            isActive: true,
          },
        });
      } else {
        // Create new account
        await db.account.create({
          data: {
            tenantId: String(tenantId),
            email: email,
            provider: provider,
            nylasGrantId: grantId,
            isPrimary: isFirstAccount,
          },
        });
      }
    }

    // Also update legacy tenant fields for backward compatibility
    if (isFirstAccount) {
      // First, clear this grantId from any other tenant that might have it
      await db.tenant.updateMany({
        where: {
          nylasGrantId: grantId,
          id: { not: String(tenantId) },
        },
        data: {
          nylasGrantId: null,
        },
      });

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

    // Render success page
    res.send(renderSuccessPage(email || 'Unknown email', String(tenantId)));
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.send(renderErrorPage('Connection Failed', errorMessage));
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
