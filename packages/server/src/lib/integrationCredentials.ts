// ===========================================
// INTEGRATION CREDENTIALS HELPER
// Resolves credentials based on integration mode
// ===========================================

import { db } from './db.js';
import { retrieveIntegrationCredentials } from './encryption.js';
import { IntegrationMode } from '@prisma/client';

export interface ResolvedCredentials {
  mode: IntegrationMode;
  credentials: Record<string, string>;
  connectionId?: string;
  accountEmail?: string;
}

export interface CredentialResolutionResult {
  success: boolean;
  data?: ResolvedCredentials;
  error?: string;
  errorCode?: 'NOT_CONFIGURED' | 'DISABLED' | 'NO_CONNECTION' | 'NO_CREDENTIALS';
}

/**
 * Get credentials for an integration based on its mode
 * - INCLUDED: Returns platform credentials from IntegrationConfig
 * - BYOK: Returns customer's credentials from Connection
 * - DISABLED: Returns error
 */
export async function getIntegrationCredentials(
  integrationId: string,
  tenantId: string,
  accountEmail?: string
): Promise<CredentialResolutionResult> {
  // First, check the platform configuration
  const config = await db.integrationConfig.findUnique({
    where: { integrationId },
    select: {
      mode: true,
      credentialsEncrypted: true,
    },
  });

  // If not configured at all, treat as disabled
  if (!config) {
    return {
      success: false,
      error: `Integration "${integrationId}" is not configured`,
      errorCode: 'NOT_CONFIGURED',
    };
  }

  // Check mode
  if (config.mode === 'DISABLED') {
    return {
      success: false,
      error: `Integration "${integrationId}" is disabled`,
      errorCode: 'DISABLED',
    };
  }

  // INCLUDED mode - use platform credentials
  if (config.mode === 'INCLUDED') {
    if (!config.credentialsEncrypted) {
      return {
        success: false,
        error: `Platform credentials not configured for "${integrationId}"`,
        errorCode: 'NO_CREDENTIALS',
      };
    }

    const rawCredentials = retrieveIntegrationCredentials(config.credentialsEncrypted);
    // Filter out undefined values
    const credentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawCredentials)) {
      if (value !== undefined) {
        credentials[key] = value;
      }
    }
    return {
      success: true,
      data: {
        mode: 'INCLUDED',
        credentials,
      },
    };
  }

  // BYOK mode - get customer's connection
  const connection = await db.connection.findFirst({
    where: {
      tenantId,
      integrationId,
      isActive: true,
      ...(accountEmail ? { accountEmail } : {}),
    },
    orderBy: { lastUsedAt: 'desc' }, // Use most recently used connection
  });

  if (!connection) {
    return {
      success: false,
      error: `No connection found for "${integrationId}". Please connect your account.`,
      errorCode: 'NO_CONNECTION',
    };
  }

  // Get credentials from connection
  if (!connection.credentialsEncrypted && !connection.accessToken) {
    return {
      success: false,
      error: `Connection credentials missing for "${integrationId}"`,
      errorCode: 'NO_CREDENTIALS',
    };
  }

  // Build credentials object
  const credentials: Record<string, string> = {};

  if (connection.credentialsEncrypted) {
    const rawCredentials = retrieveIntegrationCredentials(connection.credentialsEncrypted);
    for (const [key, value] of Object.entries(rawCredentials)) {
      if (value !== undefined) {
        credentials[key] = value;
      }
    }
  }

  // Add OAuth tokens if present
  if (connection.accessToken) {
    credentials.accessToken = connection.accessToken;
  }
  if (connection.refreshToken) {
    credentials.refreshToken = connection.refreshToken;
  }

  // Update last used timestamp
  await db.connection.update({
    where: { id: connection.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {}); // Don't fail if update fails

  return {
    success: true,
    data: {
      mode: 'BYOK',
      credentials,
      connectionId: connection.id,
      accountEmail: connection.accountEmail || undefined,
    },
  };
}

/**
 * Quick check if an integration is available for a tenant
 */
export async function checkIntegrationAvailability(
  integrationId: string,
  tenantId: string
): Promise<{ available: boolean; mode: IntegrationMode | null; reason?: string }> {
  const config = await db.integrationConfig.findUnique({
    where: { integrationId },
    select: { mode: true, credentialsEncrypted: true },
  });

  if (!config || config.mode === 'DISABLED') {
    return { available: false, mode: config?.mode || null, reason: 'Integration is disabled' };
  }

  if (config.mode === 'INCLUDED') {
    if (!config.credentialsEncrypted) {
      return { available: false, mode: 'INCLUDED', reason: 'Platform credentials not configured' };
    }
    return { available: true, mode: 'INCLUDED' };
  }

  // BYOK - check for active connection
  const connectionCount = await db.connection.count({
    where: {
      tenantId,
      integrationId,
      isActive: true,
    },
  });

  if (connectionCount === 0) {
    return { available: false, mode: 'BYOK', reason: 'No connection configured' };
  }

  return { available: true, mode: 'BYOK' };
}

/**
 * Get the mode for an integration
 */
export async function getIntegrationModeFromDb(
  integrationId: string
): Promise<IntegrationMode | null> {
  const config = await db.integrationConfig.findUnique({
    where: { integrationId },
    select: { mode: true },
  });
  return config?.mode || null;
}
