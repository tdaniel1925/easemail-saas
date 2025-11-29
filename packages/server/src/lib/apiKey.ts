// ===========================================
// API KEY AUTHENTICATION
// Generate, validate, and manage API keys
// ===========================================

import { createHash, randomBytes } from 'crypto';
import { db } from './db.js';

// API key format: bm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 random chars)
const KEY_PREFIX_LIVE = 'bm_live_';
const KEY_PREFIX_TEST = 'bm_test_';
const KEY_LENGTH = 32;

export interface ApiKeyInfo {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ValidatedApiKey extends ApiKeyInfo {
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    isActive: boolean;
  };
}

// ===========================================
// KEY GENERATION
// ===========================================

function generateRandomKey(): string {
  return randomBytes(KEY_LENGTH / 2).toString('hex');
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(params: {
  tenantId: string;
  name: string;
  scopes?: string[];
  expiresAt?: Date;
  isTest?: boolean;
}): Promise<{ key: string; keyInfo: ApiKeyInfo }> {
  const { tenantId, name, scopes = ['*'], expiresAt, isTest = false } = params;

  // Generate the key
  const prefix = isTest ? KEY_PREFIX_TEST : KEY_PREFIX_LIVE;
  const randomPart = generateRandomKey();
  const fullKey = `${prefix}${randomPart}`;
  const keyHash = hashKey(fullKey);

  // Store in database
  const apiKey = await db.apiKey.create({
    data: {
      tenantId,
      name,
      keyHash,
      keyPrefix: fullKey.substring(0, 12), // Store first 12 chars for identification
      scopes,
      expiresAt,
    },
  });

  return {
    key: fullKey, // Only returned once at creation!
    keyInfo: {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    },
  };
}

// ===========================================
// KEY VALIDATION
// ===========================================

export async function validateApiKey(key: string): Promise<ValidatedApiKey | null> {
  // Check format
  if (!key.startsWith(KEY_PREFIX_LIVE) && !key.startsWith(KEY_PREFIX_TEST)) {
    return null;
  }

  const keyHash = hashKey(key);

  // Find the key
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          plan: true,
          isActive: true,
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  // Check if active
  if (!apiKey.isActive) {
    return null;
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Check tenant is active
  if (!apiKey.tenant.isActive) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    id: apiKey.id,
    tenantId: apiKey.tenantId,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    tenant: apiKey.tenant,
  };
}

// ===========================================
// KEY MANAGEMENT
// ===========================================

export async function listApiKeys(tenantId: string): Promise<ApiKeyInfo[]> {
  const keys = await db.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map(k => ({
    id: k.id,
    tenantId: k.tenantId,
    name: k.name,
    keyPrefix: k.keyPrefix,
    scopes: k.scopes,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
    isActive: k.isActive,
    createdAt: k.createdAt,
  }));
}

export async function revokeApiKey(keyId: string, tenantId: string): Promise<boolean> {
  const result = await db.apiKey.updateMany({
    where: { id: keyId, tenantId },
    data: { isActive: false },
  });
  return result.count > 0;
}

export async function deleteApiKey(keyId: string, tenantId: string): Promise<boolean> {
  const result = await db.apiKey.deleteMany({
    where: { id: keyId, tenantId },
  });
  return result.count > 0;
}

// ===========================================
// SCOPE CHECKING
// ===========================================

export function hasScope(apiKey: ValidatedApiKey, requiredScope: string): boolean {
  // Wildcard grants all permissions
  if (apiKey.scopes.includes('*')) {
    return true;
  }

  // Check for exact match
  if (apiKey.scopes.includes(requiredScope)) {
    return true;
  }

  // Check for category wildcard (e.g., "email:*" grants "email:read")
  const [category] = requiredScope.split(':');
  if (apiKey.scopes.includes(`${category}:*`)) {
    return true;
  }

  return false;
}

// Available scopes
export const AVAILABLE_SCOPES = [
  '*',                    // All permissions
  'email:*',              // All email permissions
  'email:read',           // Read emails
  'email:write',          // Send/modify emails
  'calendar:*',           // All calendar permissions
  'calendar:read',        // Read calendar
  'calendar:write',       // Create/modify events
  'contacts:*',           // All contacts permissions
  'contacts:read',        // Read contacts
  'contacts:write',       // Create/modify contacts
  'files:*',              // All file permissions
  'files:read',           // Read files
  'files:write',          // Upload/modify files
  'teams:*',              // All Teams permissions
  'teams:read',           // Read Teams messages
  'teams:write',          // Send Teams messages
  'ai:*',                 // All AI features
];
