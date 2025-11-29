// ===========================================
// AUTHENTICATION MIDDLEWARE
// API key validation and request authentication
// ===========================================

import { Request, Response, NextFunction } from 'express';
import { validateApiKey, hasScope, ValidatedApiKey } from '../lib/apiKey.js';

// Extend Express Request to include auth info
declare global {
  namespace Express {
    interface Request {
      apiKey?: ValidatedApiKey;
      tenantId?: string;
    }
  }
}

// ===========================================
// API KEY AUTHENTICATION
// ===========================================

export function requireApiKey(options?: { scopes?: string[] }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get API key from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing Authorization header',
        hint: 'Use: Authorization: Bearer bm_live_xxxxx',
      });
    }

    // Parse Bearer token
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Authorization header format',
        hint: 'Use: Authorization: Bearer bm_live_xxxxx',
      });
    }

    // Validate API key
    const apiKey = await validateApiKey(token);

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
      });
    }

    // Check required scopes
    if (options?.scopes) {
      for (const scope of options.scopes) {
        if (!hasScope(apiKey, scope)) {
          return res.status(403).json({
            success: false,
            error: `Missing required scope: ${scope}`,
            hint: `This API key needs the "${scope}" scope`,
          });
        }
      }
    }

    // Attach to request
    req.apiKey = apiKey;
    req.tenantId = apiKey.tenantId;

    next();
  };
}

// ===========================================
// OPTIONAL API KEY (for backward compatibility)
// ===========================================

export async function optionalApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');

    if (scheme === 'Bearer' && token) {
      const apiKey = await validateApiKey(token);
      if (apiKey) {
        req.apiKey = apiKey;
        req.tenantId = apiKey.tenantId;
      }
    }
  }

  next();
}

// ===========================================
// TENANT ID FROM PATH OR API KEY
// ===========================================

export function resolveTenantId(req: Request, res: Response, next: NextFunction) {
  // Priority: 1) URL param, 2) API key, 3) query param, 4) body
  const tenantId =
    req.params.tenantId ||
    req.params.tenant_id ||
    req.apiKey?.tenantId ||
    req.query.tenant_id as string ||
    req.body?.tenant_id;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Missing tenant_id',
      hint: 'Provide tenant_id in URL, query params, or use API key authentication',
    });
  }

  req.tenantId = tenantId;
  next();
}

// ===========================================
// SCOPE MIDDLEWARE HELPERS
// ===========================================

export const requireEmailRead = requireApiKey({ scopes: ['email:read'] });
export const requireEmailWrite = requireApiKey({ scopes: ['email:write'] });
export const requireCalendarRead = requireApiKey({ scopes: ['calendar:read'] });
export const requireCalendarWrite = requireApiKey({ scopes: ['calendar:write'] });
export const requireContactsRead = requireApiKey({ scopes: ['contacts:read'] });
export const requireContactsWrite = requireApiKey({ scopes: ['contacts:write'] });
export const requireFilesRead = requireApiKey({ scopes: ['files:read'] });
export const requireFilesWrite = requireApiKey({ scopes: ['files:write'] });
export const requireTeamsRead = requireApiKey({ scopes: ['teams:read'] });
export const requireTeamsWrite = requireApiKey({ scopes: ['teams:write'] });
export const requireAI = requireApiKey({ scopes: ['ai:*'] });
