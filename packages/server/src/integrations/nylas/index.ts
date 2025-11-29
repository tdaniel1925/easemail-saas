// ===========================================
// NYLAS INTEGRATION
// Wraps existing Nylas functionality as an integration
// ===========================================

import Nylas from 'nylas';
import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

// Re-export existing Nylas helpers for backward compatibility
export * from '../../lib/nylas.js';

class NylasIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'nylas',
    name: 'Nylas',
    description: 'Email, calendar, and contacts via Nylas Universal API',
    category: 'email',
    authType: 'oauth2',
    scopes: ['email', 'calendar', 'contacts'],
    requiredEnvVars: ['NYLAS_CLIENT_ID', 'NYLAS_API_KEY'],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  isConfigured(): boolean {
    return !!(process.env.NYLAS_CLIENT_ID && process.env.NYLAS_API_KEY);
  }

  async initialize(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client = new (Nylas as any)({
      apiKey: process.env.NYLAS_API_KEY!,
      apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
    });
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    return this.client.auth.urlForOAuth2({
      clientId: process.env.NYLAS_CLIENT_ID!,
      redirectUri: process.env.OAUTH_CALLBACK_URL!,
      state: state || tenantId,
    });
  }

  async handleCallback(code: string, state: string): Promise<IntegrationCredentials> {
    const response = await this.client.auth.exchangeCodeForToken({
      clientId: process.env.NYLAS_CLIENT_ID!,
      clientSecret: process.env.NYLAS_API_KEY!,
      redirectUri: process.env.OAUTH_CALLBACK_URL!,
      code,
    });

    return {
      integrationId: 'nylas',
      tenantId: state,
      grantId: response.grantId,
      accessToken: response.accessToken,
      metadata: {
        email: response.email,
        provider: response.provider,
      },
    };
  }

  getTools(): ToolDefinition[] {
    return [
      // Email tools
      {
        name: 'list_emails',
        description: 'List emails from inbox or folder',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
          { name: 'folder_id', type: 'string', description: 'Folder ID to filter by', required: false },
          { name: 'limit', type: 'number', description: 'Max emails to return', required: false, default: 50 },
          { name: 'page_token', type: 'string', description: 'Pagination token', required: false },
          { name: 'unread_only', type: 'boolean', description: 'Only unread emails', required: false },
        ],
      },
      {
        name: 'get_email',
        description: 'Get single email with full body',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email message ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'send_email',
        description: 'Send a new email or reply',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'to', type: 'array', description: 'Recipients [{email, name?}]', required: true },
          { name: 'subject', type: 'string', description: 'Email subject', required: true },
          { name: 'body', type: 'string', description: 'Email body (HTML)', required: true },
          { name: 'reply_to_message_id', type: 'string', description: 'Message ID to reply to', required: false },
          { name: 'cc', type: 'array', description: 'CC recipients', required: false },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'move_email',
        description: 'Move email to a folder',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email message ID', required: true },
          { name: 'folder_id', type: 'string', description: 'Target folder ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'mark_read',
        description: 'Mark email as read or unread',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email message ID', required: true },
          { name: 'read', type: 'boolean', description: 'Mark as read (true) or unread (false)', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'star_email',
        description: 'Star or unstar an email',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email message ID', required: true },
          { name: 'starred', type: 'boolean', description: 'Star (true) or unstar (false)', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'trash_email',
        description: 'Move email to trash',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email message ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'search_emails',
        description: 'Search emails by query',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 25 },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'list_folders',
        description: 'List email folders/labels',
        category: 'email',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      // Calendar tools
      {
        name: 'list_calendars',
        description: 'List available calendars',
        category: 'calendar',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'list_events',
        description: 'List calendar events',
        category: 'calendar',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID', required: false },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: false },
          { name: 'end_time', type: 'string', description: 'End time (ISO)', required: false },
          { name: 'limit', type: 'number', description: 'Max events', required: false, default: 50 },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'get_event',
        description: 'Get single calendar event',
        category: 'calendar',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'event_id', type: 'string', description: 'Event ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'create_event',
        description: 'Create a calendar event',
        category: 'calendar',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID', required: true },
          { name: 'title', type: 'string', description: 'Event title', required: true },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: true },
          { name: 'end_time', type: 'string', description: 'End time (ISO)', required: true },
          { name: 'description', type: 'string', description: 'Event description', required: false },
          { name: 'location', type: 'string', description: 'Event location', required: false },
          { name: 'participants', type: 'array', description: 'Participants [{email, name?}]', required: false },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event',
        category: 'calendar',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'event_id', type: 'string', description: 'Event ID', required: true },
          { name: 'calendar_id', type: 'string', description: 'Calendar ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'check_availability',
        description: 'Check free/busy times',
        category: 'calendar',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'emails', type: 'array', description: 'Email addresses to check', required: true },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: true },
          { name: 'end_time', type: 'string', description: 'End time (ISO)', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      // Contact tools
      {
        name: 'list_contacts',
        description: 'List contacts',
        category: 'contacts',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max contacts', required: false, default: 50 },
          { name: 'page_token', type: 'string', description: 'Pagination token', required: false },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'get_contact',
        description: 'Get single contact',
        category: 'contacts',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'create_contact',
        description: 'Create a contact',
        category: 'contacts',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'given_name', type: 'string', description: 'First name', required: false },
          { name: 'surname', type: 'string', description: 'Last name', required: false },
          { name: 'emails', type: 'array', description: 'Emails [{email, type?}]', required: false },
          { name: 'phone_numbers', type: 'array', description: 'Phones [{number, type?}]', required: false },
          { name: 'company_name', type: 'string', description: 'Company', required: false },
          { name: 'job_title', type: 'string', description: 'Job title', required: false },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
      {
        name: 'search_contacts',
        description: 'Search contacts',
        category: 'contacts',
        integration: 'nylas',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query (name or email)', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 25 },
          { name: 'account_id', type: 'string', description: 'Account ID (optional)', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    // Tools are executed via the existing tool functions in /tools/*.ts
    // This method is for the new unified execution path
    throw new Error(`Use existing tool functions for ${toolName}`);
  }

  // Get the Nylas client for direct access
  getClient() {
    return this.client;
  }
}

export const nylasIntegration = new NylasIntegration();
