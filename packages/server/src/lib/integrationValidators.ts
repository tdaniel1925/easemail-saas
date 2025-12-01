// ===========================================
// INTEGRATION VALIDATORS
// Test and validate connections to external APIs
// ===========================================

import { retrieveIntegrationCredentials } from './encryption.js';

export interface ValidationResult {
  success: boolean;
  message: string;
  latency?: number;
  details?: {
    accountInfo?: Record<string, unknown>;
    tokenExpiresAt?: string;
    scopes?: string[];
    limits?: Record<string, unknown>;
  };
  error?: string;
  errorCode?: string;
}

export interface IntegrationValidator {
  validate(credentials: Record<string, string>): Promise<ValidationResult>;
}

// ===========================================
// VALIDATOR IMPLEMENTATIONS
// ===========================================

/**
 * OpenAI API Validator
 */
export async function validateOpenAI(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const apiKey = credentials.apiKey;

  if (!apiKey) {
    return { success: false, message: 'API key is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { data: Array<{ id: string }> };
      return {
        success: true,
        message: 'OpenAI connection successful',
        latency,
        details: {
          accountInfo: {
            modelsAvailable: data.data?.length || 0,
          },
        },
      };
    }

    const error = await response.json() as { error?: { message: string; code?: string } };
    return {
      success: false,
      message: error.error?.message || 'OpenAI API error',
      latency,
      errorCode: error.error?.code || 'API_ERROR',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Anthropic API Validator
 */
export async function validateAnthropic(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const apiKey = credentials.apiKey;

  if (!apiKey) {
    return { success: false, message: 'API key is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    // Anthropic doesn't have a simple test endpoint, so we'll just validate the key format
    // and make a minimal request
    if (!apiKey.startsWith('sk-ant-')) {
      return {
        success: false,
        message: 'Invalid API key format. Anthropic keys should start with "sk-ant-"',
        errorCode: 'INVALID_KEY_FORMAT',
      };
    }

    // Make a minimal completion request to verify the key works
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    const latency = Date.now() - start;

    if (response.ok || response.status === 200) {
      return {
        success: true,
        message: 'Anthropic connection successful',
        latency,
      };
    }

    const error = await response.json() as { error?: { message: string; type?: string } };
    return {
      success: false,
      message: error.error?.message || 'Anthropic API error',
      latency,
      errorCode: error.error?.type || 'API_ERROR',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Twilio API Validator
 */
export async function validateTwilio(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const { accountSid, authToken } = credentials;

  if (!accountSid || !authToken) {
    return { success: false, message: 'Account SID and Auth Token are required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { friendly_name?: string; status?: string; type?: string };
      return {
        success: true,
        message: 'Twilio connection successful',
        latency,
        details: {
          accountInfo: {
            friendlyName: data.friendly_name,
            status: data.status,
            type: data.type,
          },
        },
      };
    }

    return {
      success: false,
      message: 'Invalid Twilio credentials',
      latency,
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Resend API Validator
 */
export async function validateResend(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const apiKey = credentials.apiKey;

  if (!apiKey) {
    return { success: false, message: 'API key is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { data?: Array<{ name: string }> };
      return {
        success: true,
        message: 'Resend connection successful',
        latency,
        details: {
          accountInfo: {
            domainsConfigured: data.data?.length || 0,
          },
        },
      };
    }

    return {
      success: false,
      message: 'Invalid Resend API key',
      latency,
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Stripe API Validator
 */
export async function validateStripe(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const secretKey = credentials.secretKey;

  if (!secretKey) {
    return { success: false, message: 'Secret key is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { livemode?: boolean };
      return {
        success: true,
        message: 'Stripe connection successful',
        latency,
        details: {
          accountInfo: {
            liveMode: data.livemode,
          },
        },
      };
    }

    const error = await response.json() as { error?: { message: string } };
    return {
      success: false,
      message: error.error?.message || 'Invalid Stripe API key',
      latency,
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Airtable API Validator
 */
export async function validateAirtable(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const apiKey = credentials.apiKey;

  if (!apiKey) {
    return { success: false, message: 'Personal Access Token is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://api.airtable.com/v0/meta/whoami', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { id?: string; scopes?: string[] };
      return {
        success: true,
        message: 'Airtable connection successful',
        latency,
        details: {
          accountInfo: { userId: data.id },
          scopes: data.scopes,
        },
      };
    }

    return {
      success: false,
      message: 'Invalid Airtable Personal Access Token',
      latency,
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Cal.com API Validator
 */
export async function validateCalCom(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const apiKey = credentials.apiKey;

  if (!apiKey) {
    return { success: false, message: 'API key is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://api.cal.com/v1/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { user?: { id: number; email: string; name: string } };
      return {
        success: true,
        message: 'Cal.com connection successful',
        latency,
        details: {
          accountInfo: {
            userId: data.user?.id,
            email: data.user?.email,
            name: data.user?.name,
          },
        },
      };
    }

    const error = await response.json() as { message?: string };
    return {
      success: false,
      message: error.message || 'Invalid Cal.com API key',
      latency,
      errorCode: 'INVALID_CREDENTIALS',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Google Calendar OAuth Validator
 * Validates access token by fetching calendar list
 */
export async function validateGoogleCalendar(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const accessToken = credentials.accessToken;

  if (!accessToken) {
    return { success: false, message: 'Access token is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { items?: Array<{ id: string; summary: string }> };
      return {
        success: true,
        message: 'Google Calendar connection successful',
        latency,
        details: {
          accountInfo: {
            calendarsAvailable: data.items?.length || 0,
            primaryCalendar: data.items?.[0]?.summary,
          },
        },
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        message: 'Access token expired or invalid. Please reconnect.',
        latency,
        errorCode: 'TOKEN_EXPIRED',
      };
    }

    const error = await response.json() as { error?: { message: string } };
    return {
      success: false,
      message: error.error?.message || 'Google Calendar API error',
      latency,
      errorCode: 'API_ERROR',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Dialpad OAuth Validator
 * Validates access token by fetching user info
 */
export async function validateDialpad(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const accessToken = credentials.accessToken;

  if (!accessToken) {
    return { success: false, message: 'Access token is required', errorCode: 'MISSING_CREDENTIALS' };
  }

  try {
    const response = await fetch('https://dialpad.com/api/v2/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = await response.json() as { id?: string; email?: string; first_name?: string; last_name?: string };
      return {
        success: true,
        message: 'Dialpad connection successful',
        latency,
        details: {
          accountInfo: {
            userId: data.id,
            email: data.email,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          },
        },
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        message: 'Access token expired or invalid. Please reconnect.',
        latency,
        errorCode: 'TOKEN_EXPIRED',
      };
    }

    const error = await response.json() as { error?: string; message?: string };
    return {
      success: false,
      message: error.message || error.error || 'Dialpad API error',
      latency,
      errorCode: 'API_ERROR',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Plaid API Validator
 */
export async function validatePlaid(credentials: Record<string, string>): Promise<ValidationResult> {
  const start = Date.now();
  const { clientId, secret, environment } = credentials;

  if (!clientId || !secret) {
    return { success: false, message: 'Client ID and Secret are required', errorCode: 'MISSING_CREDENTIALS' };
  }

  const baseUrl = environment === 'production'
    ? 'https://production.plaid.com'
    : environment === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

  try {
    const response = await fetch(`${baseUrl}/institutions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        secret: secret,
        count: 1,
        offset: 0,
        country_codes: ['US'],
      }),
    });

    const latency = Date.now() - start;

    if (response.ok) {
      return {
        success: true,
        message: 'Plaid connection successful',
        latency,
        details: {
          accountInfo: { environment },
        },
      };
    }

    const error = await response.json() as { error_message?: string; error_code?: string };
    return {
      success: false,
      message: error.error_message || 'Invalid Plaid credentials',
      latency,
      errorCode: error.error_code || 'INVALID_CREDENTIALS',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

/**
 * Generic OAuth Token Validator
 * For integrations that use OAuth2 tokens
 */
export async function validateOAuthToken(
  accessToken: string,
  refreshToken: string | undefined,
  tokenExpiresAt: Date | undefined,
  integrationId: string
): Promise<ValidationResult> {
  // Check if token is expired
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
    if (refreshToken) {
      return {
        success: false,
        message: 'Access token expired. Token refresh required.',
        errorCode: 'TOKEN_EXPIRED',
        details: {
          tokenExpiresAt: tokenExpiresAt.toISOString(),
        },
      };
    }
    return {
      success: false,
      message: 'Access token expired and no refresh token available. Reconnection required.',
      errorCode: 'TOKEN_EXPIRED_NO_REFRESH',
    };
  }

  // Token appears valid (not expired)
  return {
    success: true,
    message: `OAuth token for ${integrationId} is valid`,
    details: {
      tokenExpiresAt: tokenExpiresAt?.toISOString(),
    },
  };
}

// ===========================================
// VALIDATOR REGISTRY
// ===========================================

const validators: Record<string, (credentials: Record<string, string>) => Promise<ValidationResult>> = {
  openai: validateOpenAI,
  anthropic: validateAnthropic,
  twilio: validateTwilio,
  resend: validateResend,
  stripe: validateStripe,
  airtable: validateAirtable,
  plaid: validatePlaid,
  cal_com: validateCalCom,
  google_calendar: validateGoogleCalendar,
  dialpad: validateDialpad,
};

/**
 * Validate credentials for any integration
 */
export async function validateIntegration(
  integrationId: string,
  credentialsEncrypted?: string | null,
  accessToken?: string | null,
  refreshToken?: string | null,
  tokenExpiresAt?: Date | null
): Promise<ValidationResult> {
  // If we have OAuth tokens, validate those
  if (accessToken) {
    return validateOAuthToken(
      accessToken,
      refreshToken || undefined,
      tokenExpiresAt || undefined,
      integrationId
    );
  }

  // If we have encrypted credentials, decrypt and validate
  if (credentialsEncrypted) {
    const rawCredentials = retrieveIntegrationCredentials(credentialsEncrypted);
    // Filter out undefined values to get Record<string, string>
    const credentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawCredentials)) {
      if (value !== undefined) {
        credentials[key] = value;
      }
    }
    const validator = validators[integrationId];

    if (validator) {
      return validator(credentials);
    }

    // No specific validator, just check credentials exist
    const hasCredentials = Object.keys(credentials).length > 0;
    return {
      success: hasCredentials,
      message: hasCredentials
        ? `Credentials configured for ${integrationId} (no automated validation available)`
        : 'No credentials configured',
    };
  }

  return {
    success: false,
    message: 'No credentials or tokens configured',
    errorCode: 'NO_CREDENTIALS',
  };
}

/**
 * Check if a validator exists for an integration
 */
export function hasValidator(integrationId: string): boolean {
  return integrationId in validators;
}

/**
 * Get list of integrations with automated validation
 */
export function getValidatableIntegrations(): string[] {
  return Object.keys(validators);
}
