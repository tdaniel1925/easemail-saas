// ===========================================
// ADMIN INTEGRATION MANAGEMENT ROUTES
// Configure platform integrations (INCLUDED/BYOK/DISABLED)
// ===========================================

import { Router } from 'express';
import { db } from '../../lib/db.js';
import {
  encryptCredentials,
  getMaskedCredentials,
  storeIntegrationCredentials,
} from '../../lib/encryption.js';
import { IntegrationMode } from '@prisma/client';

const router = Router();

// ===========================================
// INTEGRATION CATALOG
// All available integrations and their configuration
// ===========================================

export interface IntegrationDefinition {
  id: string;
  displayName: string;
  description: string;
  category: 'ai' | 'communication' | 'email' | 'crm' | 'finance' | 'storage' | 'productivity';
  authType: 'api_key' | 'oauth2';
  iconUrl?: string;
  docsUrl?: string;
  credentialFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    required: boolean;
    placeholder?: string;
  }>;
  oauthScopes?: string[];
  defaultMode: IntegrationMode;
  suggestedPricePerUnit?: number;
}

export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  // AI Integrations
  {
    id: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4, DALL-E, Whisper, and Embeddings',
    category: 'ai',
    authType: 'api_key',
    iconUrl: '/icons/openai.svg',
    docsUrl: 'https://platform.openai.com/docs',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
      { key: 'orgId', label: 'Organization ID', type: 'text', required: false, placeholder: 'org-...' },
    ],
    defaultMode: 'INCLUDED',
    suggestedPricePerUnit: 0.002,
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic Claude',
    description: 'Claude AI for text generation and analysis',
    category: 'ai',
    authType: 'api_key',
    iconUrl: '/icons/anthropic.svg',
    docsUrl: 'https://docs.anthropic.com',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...' },
    ],
    defaultMode: 'INCLUDED',
    suggestedPricePerUnit: 0.003,
  },

  // Communication
  {
    id: 'twilio',
    displayName: 'Twilio',
    description: 'SMS, Voice, and WhatsApp messaging',
    category: 'communication',
    authType: 'api_key',
    iconUrl: '/icons/twilio.svg',
    docsUrl: 'https://www.twilio.com/docs',
    credentialFields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'AC...' },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'phoneNumber', label: 'Phone Number', type: 'text', required: false, placeholder: '+1...' },
    ],
    defaultMode: 'INCLUDED',
    suggestedPricePerUnit: 0.01,
  },
  {
    id: 'vapi',
    displayName: 'Vapi',
    description: 'AI voice agents and phone calls',
    category: 'communication',
    authType: 'api_key',
    iconUrl: '/icons/vapi.svg',
    docsUrl: 'https://docs.vapi.ai',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    defaultMode: 'INCLUDED',
    suggestedPricePerUnit: 0.05,
  },
  {
    id: 'resend',
    displayName: 'Resend',
    description: 'Transactional email sending',
    category: 'communication',
    authType: 'api_key',
    iconUrl: '/icons/resend.svg',
    docsUrl: 'https://resend.com/docs',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_...' },
    ],
    defaultMode: 'INCLUDED',
    suggestedPricePerUnit: 0.001,
  },
  {
    id: 'dialpad',
    displayName: 'Dialpad',
    description: 'Business phone system and contact center',
    category: 'communication',
    authType: 'oauth2',
    iconUrl: '/icons/dialpad.svg',
    docsUrl: 'https://developers.dialpad.com',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    oauthScopes: ['calls', 'contacts', 'users'],
    defaultMode: 'BYOK',
  },

  // Email/Calendar
  {
    id: 'nylas',
    displayName: 'Nylas',
    description: 'Email, Calendar, and Contacts API',
    category: 'email',
    authType: 'oauth2',
    iconUrl: '/icons/nylas.svg',
    docsUrl: 'https://developer.nylas.com',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    oauthScopes: ['email', 'calendar', 'contacts'],
    defaultMode: 'BYOK',
  },
  {
    id: 'msgraph',
    displayName: 'Microsoft 365',
    description: 'Outlook, Calendar, OneDrive, Teams',
    category: 'email',
    authType: 'oauth2',
    iconUrl: '/icons/microsoft.svg',
    docsUrl: 'https://docs.microsoft.com/graph',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: false, placeholder: 'common' },
    ],
    oauthScopes: ['Mail.Read', 'Mail.Send', 'Calendars.ReadWrite', 'Contacts.Read'],
    defaultMode: 'BYOK',
  },
  {
    id: 'google_calendar',
    displayName: 'Google Calendar',
    description: 'Calendar scheduling and event management',
    category: 'email',
    authType: 'oauth2',
    iconUrl: '/icons/google-calendar.svg',
    docsUrl: 'https://developers.google.com/calendar',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    oauthScopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    defaultMode: 'BYOK',
  },
  {
    id: 'cal_com',
    displayName: 'Cal.com',
    description: 'Open source scheduling and appointment booking',
    category: 'email',
    authType: 'api_key',
    iconUrl: '/icons/cal-com.svg',
    docsUrl: 'https://cal.com/docs/api-reference',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'cal_live_...' },
    ],
    defaultMode: 'BYOK',
  },

  // CRM
  {
    id: 'filevine',
    displayName: 'Filevine',
    description: 'Legal case management',
    category: 'crm',
    authType: 'api_key',
    iconUrl: '/icons/filevine.svg',
    docsUrl: 'https://developers.filevine.io',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', required: true, placeholder: 'https://api.filevine.io' },
    ],
    defaultMode: 'BYOK',
  },
  {
    id: 'hubspot',
    displayName: 'HubSpot',
    description: 'CRM and marketing automation',
    category: 'crm',
    authType: 'oauth2',
    iconUrl: '/icons/hubspot.svg',
    docsUrl: 'https://developers.hubspot.com',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    oauthScopes: ['contacts', 'content', 'automation'],
    defaultMode: 'BYOK',
  },
  {
    id: 'smartoffice',
    displayName: 'SmartOffice (Zinnia)',
    description: 'Insurance CRM and sales automation',
    category: 'crm',
    authType: 'api_key',
    iconUrl: '/icons/smartoffice.svg',
    docsUrl: 'https://www.zinnia.com/smartoffice',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'userId', label: 'User ID', type: 'text', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', required: true },
    ],
    defaultMode: 'BYOK',
  },

  // Finance
  {
    id: 'plaid',
    displayName: 'Plaid',
    description: 'Bank connections and financial data',
    category: 'finance',
    authType: 'api_key',
    iconUrl: '/icons/plaid.svg',
    docsUrl: 'https://plaid.com/docs',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'secret', label: 'Secret', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'text', required: true, placeholder: 'sandbox | development | production' },
    ],
    defaultMode: 'BYOK',
  },
  {
    id: 'quickbooks',
    displayName: 'QuickBooks',
    description: 'Accounting and invoicing',
    category: 'finance',
    authType: 'oauth2',
    iconUrl: '/icons/quickbooks.svg',
    docsUrl: 'https://developer.intuit.com',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    oauthScopes: ['com.intuit.quickbooks.accounting'],
    defaultMode: 'BYOK',
  },
  {
    id: 'stripe',
    displayName: 'Stripe',
    description: 'Payment processing',
    category: 'finance',
    authType: 'api_key',
    iconUrl: '/icons/stripe.svg',
    docsUrl: 'https://stripe.com/docs',
    credentialFields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_...' },
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', required: false, placeholder: 'pk_...' },
    ],
    defaultMode: 'BYOK',
  },
  {
    id: 'square',
    displayName: 'Square',
    description: 'Payment processing and POS',
    category: 'finance',
    authType: 'oauth2',
    iconUrl: '/icons/square.svg',
    docsUrl: 'https://developer.squareup.com',
    credentialFields: [
      { key: 'applicationId', label: 'Application ID', type: 'text', required: true },
      { key: 'applicationSecret', label: 'Application Secret', type: 'password', required: true },
    ],
    oauthScopes: ['PAYMENTS_READ', 'PAYMENTS_WRITE'],
    defaultMode: 'BYOK',
  },

  // Storage
  {
    id: 'google_drive',
    displayName: 'Google Drive',
    description: 'Cloud file storage',
    category: 'storage',
    authType: 'oauth2',
    iconUrl: '/icons/google-drive.svg',
    docsUrl: 'https://developers.google.com/drive',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    oauthScopes: ['https://www.googleapis.com/auth/drive.file'],
    defaultMode: 'BYOK',
  },
  {
    id: 'dropbox',
    displayName: 'Dropbox',
    description: 'Cloud file storage',
    category: 'storage',
    authType: 'oauth2',
    iconUrl: '/icons/dropbox.svg',
    docsUrl: 'https://www.dropbox.com/developers',
    credentialFields: [
      { key: 'appKey', label: 'App Key', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
    ],
    oauthScopes: ['files.content.read', 'files.content.write'],
    defaultMode: 'BYOK',
  },

  // Productivity
  {
    id: 'slack',
    displayName: 'Slack',
    description: 'Team messaging and notifications',
    category: 'productivity',
    authType: 'oauth2',
    iconUrl: '/icons/slack.svg',
    docsUrl: 'https://api.slack.com',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: false },
    ],
    oauthScopes: ['chat:write', 'channels:read'],
    defaultMode: 'BYOK',
  },
  {
    id: 'notion',
    displayName: 'Notion',
    description: 'Workspace and documentation',
    category: 'productivity',
    authType: 'oauth2',
    iconUrl: '/icons/notion.svg',
    docsUrl: 'https://developers.notion.com',
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    oauthScopes: [],
    defaultMode: 'BYOK',
  },
  {
    id: 'airtable',
    displayName: 'Airtable',
    description: 'Database and spreadsheet hybrid',
    category: 'productivity',
    authType: 'api_key',
    iconUrl: '/icons/airtable.svg',
    docsUrl: 'https://airtable.com/developers/web/api',
    credentialFields: [
      { key: 'apiKey', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'pat...' },
    ],
    defaultMode: 'BYOK',
  },
];

// Get definition by ID
export function getIntegrationDefinition(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_CATALOG.find(i => i.id === id);
}

// ===========================================
// GET /admin/integrations
// List all integrations with their current config
// ===========================================
router.get('/', async (req, res) => {
  try {
    // Get all configs from database
    const configs = await db.integrationConfig.findMany({
      orderBy: { displayName: 'asc' },
    });

    const configMap = new Map(configs.map(c => [c.integrationId, c]));

    // Merge catalog with configs
    const integrations = INTEGRATION_CATALOG.map(def => {
      const config = configMap.get(def.id);

      return {
        id: def.id,
        displayName: def.displayName,
        description: def.description,
        category: def.category,
        authType: def.authType,
        iconUrl: def.iconUrl,
        docsUrl: def.docsUrl,
        credentialFields: def.credentialFields,
        oauthScopes: def.oauthScopes,

        // Current configuration
        mode: config?.mode || def.defaultMode,
        hasCredentials: !!config?.credentialsEncrypted,
        maskedCredentials: config?.credentialsEncrypted
          ? getMaskedCredentials(config.credentialsEncrypted)
          : null,
        markupPercent: config?.markupPercent || 0,
        basePricePerUnit: config?.basePricePerUnit || def.suggestedPricePerUnit,
        isActive: config?.isActive ?? true,
        updatedAt: config?.updatedAt,
      };
    });

    // Group by category for easier display
    const byCategory = integrations.reduce((acc, int) => {
      if (!acc[int.category]) acc[int.category] = [];
      acc[int.category].push(int);
      return acc;
    }, {} as Record<string, typeof integrations>);

    res.json({
      success: true,
      integrations,
      byCategory,
      categories: [
        { id: 'ai', name: 'AI & Machine Learning', icon: 'Brain' },
        { id: 'communication', name: 'Communication', icon: 'MessageSquare' },
        { id: 'email', name: 'Email & Calendar', icon: 'Mail' },
        { id: 'crm', name: 'CRM', icon: 'Users' },
        { id: 'finance', name: 'Finance', icon: 'CreditCard' },
        { id: 'storage', name: 'Storage', icon: 'FolderOpen' },
        { id: 'productivity', name: 'Productivity', icon: 'BarChart3' },
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list integrations',
    });
  }
});

// ===========================================
// GET /admin/integrations/usage/summary
// Get usage summary for all INCLUDED integrations
// NOTE: This route MUST be defined BEFORE /:id to avoid conflicts
// ===========================================
router.get('/usage/summary', async (req, res) => {
  try {
    const { period } = req.query;
    const currentPeriod = period as string || new Date().toISOString().slice(0, 7);

    // Get all INCLUDED integrations
    const includedIntegrations = await db.integrationConfig.findMany({
      where: { mode: 'INCLUDED' },
    });

    // Get usage for current period
    const usage = await db.platformUsage.groupBy({
      by: ['integrationId'],
      where: {
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

    const usageMap = new Map(usage.map(u => [u.integrationId, u]));

    const summary = includedIntegrations.map(int => {
      const u = usageMap.get(int.integrationId);
      return {
        integrationId: int.integrationId,
        displayName: int.displayName,
        totalUnits: u?._sum.units || 0,
        totalCost: u?._sum.cost || 0,
        callCount: u?._count || 0,
        markupPercent: int.markupPercent,
        revenue: (u?._sum.cost || 0) * (1 + (int.markupPercent || 0) / 100),
      };
    });

    res.json({
      success: true,
      period: currentPeriod,
      summary,
      totals: {
        totalCost: summary.reduce((acc, s) => acc + s.totalCost, 0),
        totalRevenue: summary.reduce((acc, s) => acc + s.revenue, 0),
        totalCalls: summary.reduce((acc, s) => acc + s.callCount, 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage summary',
    });
  }
});

// ===========================================
// GET /admin/integrations/:id
// Get single integration config
// ===========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const definition = getIntegrationDefinition(id);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Unknown integration: ${id}`,
      });
    }

    const config = await db.integrationConfig.findUnique({
      where: { integrationId: id },
    });

    res.json({
      success: true,
      integration: {
        ...definition,
        mode: config?.mode || definition.defaultMode,
        hasCredentials: !!config?.credentialsEncrypted,
        maskedCredentials: config?.credentialsEncrypted
          ? getMaskedCredentials(config.credentialsEncrypted)
          : null,
        markupPercent: config?.markupPercent || 0,
        basePricePerUnit: config?.basePricePerUnit || definition.suggestedPricePerUnit,
        isActive: config?.isActive ?? true,
        setupInstructions: config?.setupInstructions,
        updatedAt: config?.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get integration',
    });
  }
});

// ===========================================
// PUT /admin/integrations/:id
// Update integration configuration
// ===========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, credentials, markupPercent, basePricePerUnit, setupInstructions, isActive } = req.body;

    const definition = getIntegrationDefinition(id);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Unknown integration: ${id}`,
      });
    }

    // Validate mode
    if (mode && !['INCLUDED', 'BYOK', 'DISABLED'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be INCLUDED, BYOK, or DISABLED',
      });
    }

    // Encrypt credentials if provided
    let credentialsEncrypted: string | undefined;
    if (credentials && Object.keys(credentials).length > 0) {
      credentialsEncrypted = storeIntegrationCredentials(credentials);
    }

    // Upsert the config
    const config = await db.integrationConfig.upsert({
      where: { integrationId: id },
      create: {
        integrationId: id,
        displayName: definition.displayName,
        description: definition.description,
        category: definition.category,
        authType: definition.authType,
        mode: mode || definition.defaultMode,
        credentialsEncrypted,
        markupPercent: markupPercent || 0,
        basePricePerUnit: basePricePerUnit || definition.suggestedPricePerUnit,
        iconUrl: definition.iconUrl,
        docsUrl: definition.docsUrl,
        setupInstructions,
        oauthScopes: definition.oauthScopes || [],
        isActive: isActive ?? true,
      },
      update: {
        mode: mode || undefined,
        credentialsEncrypted: credentialsEncrypted || undefined,
        markupPercent: markupPercent !== undefined ? markupPercent : undefined,
        basePricePerUnit: basePricePerUnit !== undefined ? basePricePerUnit : undefined,
        setupInstructions: setupInstructions !== undefined ? setupInstructions : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({
      success: true,
      message: `Integration "${definition.displayName}" updated`,
      integration: {
        id: config.integrationId,
        displayName: config.displayName,
        mode: config.mode,
        hasCredentials: !!config.credentialsEncrypted,
        maskedCredentials: config.credentialsEncrypted
          ? getMaskedCredentials(config.credentialsEncrypted)
          : null,
        markupPercent: config.markupPercent,
        isActive: config.isActive,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update integration',
    });
  }
});

// ===========================================
// POST /admin/integrations/:id/test
// Test integration credentials
// ===========================================
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const definition = getIntegrationDefinition(id);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Unknown integration: ${id}`,
      });
    }

    // TODO: Implement actual credential testing per integration
    // For now, just verify credentials exist
    const config = await db.integrationConfig.findUnique({
      where: { integrationId: id },
    });

    if (!config?.credentialsEncrypted) {
      return res.status(400).json({
        success: false,
        error: 'No credentials configured for this integration',
      });
    }

    // Placeholder: In real implementation, call the integration's API
    res.json({
      success: true,
      message: `Credentials for "${definition.displayName}" are configured. Connection test not yet implemented.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test integration',
    });
  }
});

// ===========================================
// DELETE /admin/integrations/:id/credentials
// Remove integration credentials
// ===========================================
router.delete('/:id/credentials', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await db.integrationConfig.findUnique({
      where: { integrationId: id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Integration not configured',
      });
    }

    await db.integrationConfig.update({
      where: { integrationId: id },
      data: {
        credentialsEncrypted: null,
        mode: 'DISABLED',
      },
    });

    res.json({
      success: true,
      message: 'Credentials removed and integration disabled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove credentials',
    });
  }
});

export default router;
