// ===========================================
// CUSTOMER CONNECTIONS ROUTES
// Manage customer's own integration connections (BYOK)
// ===========================================

import { Router } from 'express';
import { db } from '../lib/db.js';
import {
  storeIntegrationCredentials,
  retrieveIntegrationCredentials,
  getMaskedCredentials,
} from '../lib/encryption.js';
import { getIntegrationDefinition, INTEGRATION_CATALOG } from './admin/integrations.js';
import { validateIntegration, hasValidator } from '../lib/integrationValidators.js';

const router = Router();

// ===========================================
// CACHING FOR HIGH-FREQUENCY ENDPOINTS
// ===========================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const integrationsCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 10000; // 10 seconds for integrations list

function getCachedIntegrations(tenantId: string): unknown | null {
  const cached = integrationsCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedIntegrations(tenantId: string, data: unknown): void {
  integrationsCache.set(tenantId, { data, timestamp: Date.now() });
  // Clean old entries
  if (integrationsCache.size > 500) {
    const now = Date.now();
    for (const [key, value] of integrationsCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS * 2) {
        integrationsCache.delete(key);
      }
    }
  }
}

// Helper to find tenant with timeout
async function getTenant(tenantId: string) {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}

// Helper to auto-create tenant if not found
async function getOrCreateTenant(tenantId: string) {
  let tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
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
// GET /connections/:tenantId
// List all available integrations and connection status
// Uses caching to reduce database load
// ===========================================
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Check cache first
    const cached = getCachedIntegrations(tenantId);
    if (cached) {
      return res.json(cached);
    }

    // Use timeout for database queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 8000);
    });

    const queryPromise = (async () => {
      // Auto-create tenant if not found
      const tenant = await getOrCreateTenant(tenantId);

      // Get platform integration configs (what's enabled)
      const platformConfigs = await db.integrationConfig.findMany({
        where: {
          isActive: true,
          mode: { not: 'DISABLED' },
        },
      });

      const configMap = new Map(platformConfigs.map(c => [c.integrationId, c]));

      // Get customer's existing connections
      const connections = await db.connection.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
      });

      const connectionMap = new Map(connections.map(c => [c.integrationId, c]));

      // Build the available integrations list
      const availableIntegrations = INTEGRATION_CATALOG
        .filter(def => {
          const config = configMap.get(def.id);
          // Show if it's configured in platform (or use default)
          return config ? config.mode !== 'DISABLED' : def.defaultMode !== 'DISABLED';
        })
        .map(def => {
          const config = configMap.get(def.id);
          const connection = connectionMap.get(def.id);
          const mode = config?.mode || def.defaultMode;

          return {
            id: def.id,
            displayName: def.displayName,
            description: def.description,
            category: def.category,
            iconUrl: def.iconUrl,
            docsUrl: def.docsUrl,

            // How it's configured
            mode, // INCLUDED or BYOK
            authType: def.authType,

            // Connection status
            isConnected: !!connection,
            connection: connection ? {
              id: connection.id,
              name: connection.name,
              accountEmail: connection.accountEmail,
              accountName: connection.accountName,
              status: connection.status,
              lastUsedAt: connection.lastUsedAt,
              createdAt: connection.createdAt,
            } : null,

            // For BYOK, show credential fields
            credentialFields: mode === 'BYOK' ? def.credentialFields : undefined,
            oauthScopes: mode === 'BYOK' && def.authType === 'oauth2' ? def.oauthScopes : undefined,

            // Setup help
            setupInstructions: config?.setupInstructions,
          };
        });

      // Group by category
      const byCategory = availableIntegrations.reduce((acc, int) => {
        if (!acc[int.category]) acc[int.category] = [];
        acc[int.category].push(int);
        return acc;
      }, {} as Record<string, typeof availableIntegrations>);

      // Connection stats
      const stats = {
        total: availableIntegrations.length,
        connected: availableIntegrations.filter(i => i.isConnected).length,
        included: availableIntegrations.filter(i => i.mode === 'INCLUDED').length,
        byok: availableIntegrations.filter(i => i.mode === 'BYOK').length,
      };

      return {
        success: true,
        integrations: availableIntegrations,
        byCategory,
        stats,
        categories: [
          { id: 'ai', name: 'AI & Machine Learning', icon: 'Brain', description: 'AI-powered tools and automation' },
          { id: 'communication', name: 'Communication', icon: 'MessageSquare', description: 'SMS, voice, and messaging' },
          { id: 'email', name: 'Email & Calendar', icon: 'Mail', description: 'Email, calendar, and contacts' },
          { id: 'crm', name: 'CRM', icon: 'Users', description: 'Customer relationship management' },
          { id: 'finance', name: 'Finance', icon: 'CreditCard', description: 'Payments and accounting' },
          { id: 'storage', name: 'Storage', icon: 'FolderOpen', description: 'File storage and sync' },
          { id: 'productivity', name: 'Productivity', icon: 'BarChart3', description: 'Workspace and collaboration' },
        ],
      };
    })();

    const result = await Promise.race([queryPromise, timeoutPromise]);

    // Cache successful result
    setCachedIntegrations(tenantId, result);

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to list integrations';
    console.error('Connections list error:', errorMessage);

    // Return a minimal successful response on error
    // This prevents the UI from breaking completely
    res.status(503).json({
      success: false,
      error: errorMessage,
      integrations: [],
      byCategory: {},
      stats: { total: 0, connected: 0, included: 0, byok: 0 },
      categories: [
        { id: 'ai', name: 'AI & Machine Learning', icon: 'Brain', description: 'AI-powered tools and automation' },
        { id: 'communication', name: 'Communication', icon: 'MessageSquare', description: 'SMS, voice, and messaging' },
        { id: 'email', name: 'Email & Calendar', icon: 'Mail', description: 'Email, calendar, and contacts' },
        { id: 'crm', name: 'CRM', icon: 'Users', description: 'Customer relationship management' },
        { id: 'finance', name: 'Finance', icon: 'CreditCard', description: 'Payments and accounting' },
        { id: 'storage', name: 'Storage', icon: 'FolderOpen', description: 'File storage and sync' },
        { id: 'productivity', name: 'Productivity', icon: 'BarChart3', description: 'Workspace and collaboration' },
      ],
      retryAfter: 10,
    });
  }
});

// ===========================================
// GET /connections/:tenantId/usage
// Get usage for this tenant's connections
// NOTE: This route MUST be defined BEFORE /:tenantId/:integrationId to avoid conflicts
// ===========================================
router.get('/:tenantId/usage', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { period } = req.query;
    const tenant = await getTenant(tenantId);

    const currentPeriod = period as string || new Date().toISOString().slice(0, 7);

    // Get usage for INCLUDED integrations (platform pays)
    const platformUsage = await db.platformUsage.groupBy({
      by: ['integrationId'],
      where: {
        tenantId: tenant.id,
        createdAt: {
          gte: new Date(`${currentPeriod}-01`),
          lt: new Date(new Date(`${currentPeriod}-01`).setMonth(new Date(`${currentPeriod}-01`).getMonth() + 1)),
        },
      },
      _sum: {
        units: true,
        cost: true,
      },
      _count: true,
    });

    // Get integration configs for pricing
    const configs = await db.integrationConfig.findMany({
      where: {
        integrationId: { in: platformUsage.map(u => u.integrationId) },
      },
    });

    const configMap = new Map(configs.map(c => [c.integrationId, c]));

    const usage = platformUsage.map(u => {
      const config = configMap.get(u.integrationId);
      const cost = u._sum.cost || 0;
      const markup = config?.markupPercent || 0;
      const billedAmount = cost * (1 + markup / 100);

      return {
        integrationId: u.integrationId,
        displayName: config?.displayName || u.integrationId,
        units: u._sum.units || 0,
        callCount: u._count,
        estimatedCost: billedAmount,
      };
    });

    res.json({
      success: true,
      period: currentPeriod,
      usage,
      total: {
        estimatedCost: usage.reduce((acc, u) => acc + u.estimatedCost, 0),
        totalCalls: usage.reduce((acc, u) => acc + u.callCount, 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage',
    });
  }
});

// ===========================================
// GET /connections/:tenantId/health
// Health check for all tenant connections
// NOTE: This route MUST be defined BEFORE /:tenantId/:integrationId to avoid conflicts
// ===========================================
router.get('/:tenantId/health', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getTenant(tenantId);

    // Get all active connections for this tenant
    const connections = await db.connection.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
    });

    // Check health of each connection
    const healthChecks = await Promise.all(
      connections.map(async (connection) => {
        const definition = getIntegrationDefinition(connection.integrationId);

        // Quick validation
        const validationResult = await validateIntegration(
          connection.integrationId,
          connection.credentialsEncrypted,
          connection.accessToken,
          connection.refreshToken,
          connection.tokenExpiresAt
        );

        // Determine status
        let status: 'healthy' | 'unhealthy' | 'expired' = 'healthy';
        if (!validationResult.success) {
          status = validationResult.errorCode === 'TOKEN_EXPIRED' ? 'expired' : 'unhealthy';
        }

        return {
          integrationId: connection.integrationId,
          integrationName: definition?.displayName || connection.integrationId,
          connectionId: connection.id,
          connectionName: connection.name,
          status,
          message: validationResult.message,
          latency: validationResult.latency,
          lastUsed: connection.lastUsedAt?.toISOString(),
          lastError: connection.lastError,
          hasAutomatedValidation: hasValidator(connection.integrationId),
          details: validationResult.details,
        };
      })
    );

    // Calculate summary
    const summary = {
      total: healthChecks.length,
      healthy: healthChecks.filter(h => h.status === 'healthy').length,
      unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
      expired: healthChecks.filter(h => h.status === 'expired').length,
    };

    res.json({
      success: true,
      summary,
      connections: healthChecks,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check connection health',
    });
  }
});

// ===========================================
// GET /connections/:tenantId/:integrationId
// Get connection details for a specific integration
// ===========================================
router.get('/:tenantId/:integrationId', async (req, res) => {
  try {
    const { tenantId, integrationId } = req.params;
    const tenant = await getTenant(tenantId);

    const definition = getIntegrationDefinition(integrationId);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Unknown integration: ${integrationId}`,
      });
    }

    // Get platform config
    const config = await db.integrationConfig.findUnique({
      where: { integrationId },
    });

    const mode = config?.mode || definition.defaultMode;
    if (mode === 'DISABLED') {
      return res.status(403).json({
        success: false,
        error: 'This integration is not available',
      });
    }

    // Get connection
    const connection = await db.connection.findFirst({
      where: {
        tenantId: tenant.id,
        integrationId,
        isActive: true,
      },
    });

    res.json({
      success: true,
      integration: {
        id: definition.id,
        displayName: definition.displayName,
        description: definition.description,
        category: definition.category,
        iconUrl: definition.iconUrl,
        docsUrl: definition.docsUrl,
        mode,
        authType: definition.authType,
        credentialFields: mode === 'BYOK' ? definition.credentialFields : undefined,
        oauthScopes: definition.oauthScopes,
        setupInstructions: config?.setupInstructions,
      },
      connection: connection ? {
        id: connection.id,
        name: connection.name,
        accountEmail: connection.accountEmail,
        accountName: connection.accountName,
        status: connection.status,
        lastUsedAt: connection.lastUsedAt,
        lastError: connection.lastError,
        maskedCredentials: connection.credentialsEncrypted
          ? getMaskedCredentials(connection.credentialsEncrypted)
          : null,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      } : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get connection',
    });
  }
});

// ===========================================
// POST /connections/:tenantId/:integrationId
// Create a new connection (for BYOK integrations)
// ===========================================
router.post('/:tenantId/:integrationId', async (req, res) => {
  try {
    const { tenantId, integrationId } = req.params;
    const { name, credentials, accountEmail } = req.body;

    const tenant = await getTenant(tenantId);

    const definition = getIntegrationDefinition(integrationId);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Unknown integration: ${integrationId}`,
      });
    }

    // Check platform config
    const config = await db.integrationConfig.findUnique({
      where: { integrationId },
    });

    const mode = config?.mode || definition.defaultMode;

    // Only allow BYOK connections
    if (mode !== 'BYOK') {
      return res.status(403).json({
        success: false,
        error: mode === 'INCLUDED'
          ? 'This integration is provided by the platform. No connection needed.'
          : 'This integration is not available.',
      });
    }

    // Validate required credentials
    if (definition.authType === 'api_key') {
      const requiredFields = definition.credentialFields.filter(f => f.required);
      const missingFields = requiredFields.filter(f => !credentials?.[f.key]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.map(f => f.label).join(', ')}`,
        });
      }
    }

    // Check for existing connection
    const existing = await db.connection.findFirst({
      where: {
        tenantId: tenant.id,
        integrationId,
        accountEmail: accountEmail || null,
        isActive: true,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A connection already exists for this integration',
        existingConnectionId: existing.id,
      });
    }

    // Encrypt and store credentials
    const credentialsEncrypted = credentials
      ? storeIntegrationCredentials(credentials)
      : null;

    // Create connection
    const connection = await db.connection.create({
      data: {
        tenantId: tenant.id,
        integrationId,
        name: name || `${definition.displayName} Connection`,
        credentialsEncrypted,
        accountEmail: accountEmail || null,
        status: 'active',
      },
    });

    res.status(201).json({
      success: true,
      message: `Connected to ${definition.displayName}`,
      connection: {
        id: connection.id,
        name: connection.name,
        integrationId: connection.integrationId,
        status: connection.status,
        createdAt: connection.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create connection',
    });
  }
});

// ===========================================
// PUT /connections/:tenantId/:integrationId/:connectionId
// Update a connection
// ===========================================
router.put('/:tenantId/:integrationId/:connectionId', async (req, res) => {
  try {
    const { tenantId, integrationId, connectionId } = req.params;
    const { name, credentials } = req.body;

    const tenant = await getTenant(tenantId);

    const connection = await db.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: tenant.id,
        integrationId,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    // Encrypt new credentials if provided
    let credentialsEncrypted = connection.credentialsEncrypted;
    if (credentials && Object.keys(credentials).length > 0) {
      credentialsEncrypted = storeIntegrationCredentials(credentials);
    }

    const updated = await db.connection.update({
      where: { id: connectionId },
      data: {
        name: name || connection.name,
        credentialsEncrypted,
        status: 'active', // Reset status on update
        lastError: null,
      },
    });

    res.json({
      success: true,
      message: 'Connection updated',
      connection: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update connection',
    });
  }
});

// ===========================================
// DELETE /connections/:tenantId/:integrationId/:connectionId
// Disconnect (delete) a connection
// ===========================================
router.delete('/:tenantId/:integrationId/:connectionId', async (req, res) => {
  try {
    const { tenantId, integrationId, connectionId } = req.params;
    const tenant = await getTenant(tenantId);

    const connection = await db.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: tenant.id,
        integrationId,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    // Soft delete by setting isActive = false
    await db.connection.update({
      where: { id: connectionId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Connection disconnected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    });
  }
});

// ===========================================
// POST /connections/:tenantId/:integrationId/:connectionId/test
// Test a connection with real API validation
// ===========================================
router.post('/:tenantId/:integrationId/:connectionId/test', async (req, res) => {
  try {
    const { tenantId, integrationId, connectionId } = req.params;
    const tenant = await getTenant(tenantId);

    const connection = await db.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: tenant.id,
        integrationId,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    const definition = getIntegrationDefinition(integrationId);

    // Verify credentials exist
    if (!connection.credentialsEncrypted && !connection.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'No credentials found for this connection',
      });
    }

    // Actually test the connection using validators
    const validationResult = await validateIntegration(
      integrationId,
      connection.credentialsEncrypted,
      connection.accessToken,
      connection.refreshToken,
      connection.tokenExpiresAt
    );

    // Update connection status based on result
    const newStatus = validationResult.success ? 'active' : 'error';
    await db.connection.update({
      where: { id: connectionId },
      data: {
        status: newStatus,
        lastUsedAt: new Date(),
        lastError: validationResult.success ? null : validationResult.message,
      },
    });

    res.json({
      success: validationResult.success,
      message: validationResult.message,
      latency: validationResult.latency,
      details: validationResult.details,
      hasAutomatedValidation: hasValidator(integrationId),
      integrationName: definition?.displayName,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test connection',
    });
  }
});

export default router;
