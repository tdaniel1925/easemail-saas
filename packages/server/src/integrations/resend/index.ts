// ===========================================
// RESEND INTEGRATION
// Email API for developers
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class ResendIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'resend',
    name: 'Resend',
    description: 'Email API for developers - send transactional and marketing emails',
    category: 'email',
    authType: 'api_key',
    requiredEnvVars: ['RESEND_API_KEY'],
  };

  private apiKey = process.env.RESEND_API_KEY;
  private baseUrl = 'https://api.resend.com';

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      // Email - Sending
      {
        name: 'resend_send_email',
        description: 'Send an email',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'from', type: 'string', description: 'Sender email address', required: true },
          { name: 'to', type: 'array', description: 'Recipient email addresses', required: true },
          { name: 'subject', type: 'string', description: 'Email subject', required: true },
          { name: 'html', type: 'string', description: 'HTML content', required: false },
          { name: 'text', type: 'string', description: 'Plain text content', required: false },
          { name: 'cc', type: 'array', description: 'CC recipients', required: false },
          { name: 'bcc', type: 'array', description: 'BCC recipients', required: false },
          { name: 'reply_to', type: 'array', description: 'Reply-to addresses', required: false },
          { name: 'scheduled_at', type: 'string', description: 'Schedule send time (ISO 8601)', required: false },
        ],
      },
      {
        name: 'resend_send_batch',
        description: 'Send up to 100 emails in a batch',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'emails', type: 'array', description: 'Array of email objects [{from, to, subject, html}]', required: true },
        ],
      },
      {
        name: 'resend_list_emails',
        description: 'List sent emails',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'resend_get_email',
        description: 'Get email details',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email ID', required: true },
        ],
      },
      {
        name: 'resend_cancel_email',
        description: 'Cancel a scheduled email',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email_id', type: 'string', description: 'Email ID', required: true },
        ],
      },
      // Domains
      {
        name: 'resend_create_domain',
        description: 'Create a new domain',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Domain name', required: true },
          { name: 'region', type: 'string', description: 'Region (us-east-1, eu-west-1, sa-east-1)', required: false },
        ],
      },
      {
        name: 'resend_verify_domain',
        description: 'Verify a domain',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'domain_id', type: 'string', description: 'Domain ID', required: true },
        ],
      },
      {
        name: 'resend_list_domains',
        description: 'List all domains',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'resend_get_domain',
        description: 'Get domain details',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'domain_id', type: 'string', description: 'Domain ID', required: true },
        ],
      },
      {
        name: 'resend_delete_domain',
        description: 'Delete a domain',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'domain_id', type: 'string', description: 'Domain ID', required: true },
        ],
      },
      // Contacts
      {
        name: 'resend_create_contact',
        description: 'Create a contact',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'audience_id', type: 'string', description: 'Audience ID', required: true },
          { name: 'email', type: 'string', description: 'Contact email', required: true },
          { name: 'first_name', type: 'string', description: 'First name', required: false },
          { name: 'last_name', type: 'string', description: 'Last name', required: false },
          { name: 'unsubscribed', type: 'boolean', description: 'Unsubscribed status', required: false },
        ],
      },
      {
        name: 'resend_list_contacts',
        description: 'List contacts in an audience',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'audience_id', type: 'string', description: 'Audience ID', required: true },
        ],
      },
      {
        name: 'resend_get_contact',
        description: 'Get contact details',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'audience_id', type: 'string', description: 'Audience ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
        ],
      },
      {
        name: 'resend_update_contact',
        description: 'Update a contact',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'audience_id', type: 'string', description: 'Audience ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
          { name: 'first_name', type: 'string', description: 'First name', required: false },
          { name: 'last_name', type: 'string', description: 'Last name', required: false },
          { name: 'unsubscribed', type: 'boolean', description: 'Unsubscribed status', required: false },
        ],
      },
      {
        name: 'resend_delete_contact',
        description: 'Delete a contact',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'audience_id', type: 'string', description: 'Audience ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
        ],
      },
      // Broadcasts
      {
        name: 'resend_create_broadcast',
        description: 'Create a broadcast',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'audience_id', type: 'string', description: 'Audience ID', required: true },
          { name: 'from', type: 'string', description: 'Sender email', required: true },
          { name: 'subject', type: 'string', description: 'Subject line', required: true },
          { name: 'html', type: 'string', description: 'HTML content', required: false },
          { name: 'text', type: 'string', description: 'Plain text content', required: false },
          { name: 'name', type: 'string', description: 'Broadcast name', required: false },
        ],
      },
      {
        name: 'resend_send_broadcast',
        description: 'Send a broadcast',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'broadcast_id', type: 'string', description: 'Broadcast ID', required: true },
          { name: 'scheduled_at', type: 'string', description: 'Schedule time (ISO 8601)', required: false },
        ],
      },
      {
        name: 'resend_list_broadcasts',
        description: 'List broadcasts',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'resend_get_broadcast',
        description: 'Get broadcast details',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'broadcast_id', type: 'string', description: 'Broadcast ID', required: true },
        ],
      },
      {
        name: 'resend_delete_broadcast',
        description: 'Delete a broadcast',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'broadcast_id', type: 'string', description: 'Broadcast ID', required: true },
        ],
      },
      // Templates
      {
        name: 'resend_create_template',
        description: 'Create an email template',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Template name', required: true },
          { name: 'html', type: 'string', description: 'HTML content', required: true },
          { name: 'subject', type: 'string', description: 'Default subject', required: false },
        ],
      },
      {
        name: 'resend_list_templates',
        description: 'List templates',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'resend_get_template',
        description: 'Get template details',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'template_id', type: 'string', description: 'Template ID', required: true },
        ],
      },
      {
        name: 'resend_update_template',
        description: 'Update a template',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'template_id', type: 'string', description: 'Template ID', required: true },
          { name: 'name', type: 'string', description: 'Template name', required: false },
          { name: 'html', type: 'string', description: 'HTML content', required: false },
          { name: 'subject', type: 'string', description: 'Default subject', required: false },
        ],
      },
      {
        name: 'resend_delete_template',
        description: 'Delete a template',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'template_id', type: 'string', description: 'Template ID', required: true },
        ],
      },
      // API Keys
      {
        name: 'resend_create_api_key',
        description: 'Create an API key',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'API key name', required: true },
          { name: 'permission', type: 'string', description: 'Permission (full_access, sending_access)', required: false },
          { name: 'domain_id', type: 'string', description: 'Restrict to domain', required: false },
        ],
      },
      {
        name: 'resend_list_api_keys',
        description: 'List API keys',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'resend_delete_api_key',
        description: 'Delete an API key',
        category: 'email',
        integration: 'resend',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'api_key_id', type: 'string', description: 'API Key ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || this.apiKey;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure Resend.' };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        // Email - Sending
        case 'resend_send_email': {
          const body: Record<string, unknown> = {
            from: params.from,
            to: params.to,
            subject: params.subject,
          };
          if (params.html) body.html = params.html;
          if (params.text) body.text = params.text;
          if (params.cc) body.cc = params.cc;
          if (params.bcc) body.bcc = params.bcc;
          if (params.reply_to) body.reply_to = params.reply_to;
          if (params.scheduled_at) body.scheduled_at = params.scheduled_at;

          const response = await fetch(`${this.baseUrl}/emails`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_send_batch': {
          const response = await fetch(`${this.baseUrl}/emails/batch`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params.emails),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_list_emails': {
          const response = await fetch(`${this.baseUrl}/emails`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_get_email': {
          const response = await fetch(`${this.baseUrl}/emails/${params.email_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_cancel_email': {
          const response = await fetch(`${this.baseUrl}/emails/${params.email_id}/cancel`, {
            method: 'POST',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        // Domains
        case 'resend_create_domain': {
          const body: Record<string, unknown> = { name: params.name };
          if (params.region) body.region = params.region;

          const response = await fetch(`${this.baseUrl}/domains`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_verify_domain': {
          const response = await fetch(`${this.baseUrl}/domains/${params.domain_id}/verify`, {
            method: 'POST',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_list_domains': {
          const response = await fetch(`${this.baseUrl}/domains`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_get_domain': {
          const response = await fetch(`${this.baseUrl}/domains/${params.domain_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_delete_domain': {
          const response = await fetch(`${this.baseUrl}/domains/${params.domain_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // Contacts
        case 'resend_create_contact': {
          const body: Record<string, unknown> = {
            email: params.email,
            audience_id: params.audience_id,
          };
          if (params.first_name) body.first_name = params.first_name;
          if (params.last_name) body.last_name = params.last_name;
          if (params.unsubscribed !== undefined) body.unsubscribed = params.unsubscribed;

          const response = await fetch(`${this.baseUrl}/audiences/${params.audience_id}/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_list_contacts': {
          const response = await fetch(`${this.baseUrl}/audiences/${params.audience_id}/contacts`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_get_contact': {
          const response = await fetch(`${this.baseUrl}/audiences/${params.audience_id}/contacts/${params.contact_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_update_contact': {
          const body: Record<string, unknown> = {};
          if (params.first_name) body.first_name = params.first_name;
          if (params.last_name) body.last_name = params.last_name;
          if (params.unsubscribed !== undefined) body.unsubscribed = params.unsubscribed;

          const response = await fetch(`${this.baseUrl}/audiences/${params.audience_id}/contacts/${params.contact_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_delete_contact': {
          const response = await fetch(`${this.baseUrl}/audiences/${params.audience_id}/contacts/${params.contact_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // Broadcasts
        case 'resend_create_broadcast': {
          const body: Record<string, unknown> = {
            audience_id: params.audience_id,
            from: params.from,
            subject: params.subject,
          };
          if (params.html) body.html = params.html;
          if (params.text) body.text = params.text;
          if (params.name) body.name = params.name;

          const response = await fetch(`${this.baseUrl}/broadcasts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_send_broadcast': {
          const body: Record<string, unknown> = {};
          if (params.scheduled_at) body.scheduled_at = params.scheduled_at;

          const response = await fetch(`${this.baseUrl}/broadcasts/${params.broadcast_id}/send`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_list_broadcasts': {
          const response = await fetch(`${this.baseUrl}/broadcasts`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_get_broadcast': {
          const response = await fetch(`${this.baseUrl}/broadcasts/${params.broadcast_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_delete_broadcast': {
          const response = await fetch(`${this.baseUrl}/broadcasts/${params.broadcast_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // Templates
        case 'resend_create_template': {
          const body: Record<string, unknown> = {
            name: params.name,
            html: params.html,
          };
          if (params.subject) body.subject = params.subject;

          const response = await fetch(`${this.baseUrl}/templates`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_list_templates': {
          const response = await fetch(`${this.baseUrl}/templates`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_get_template': {
          const response = await fetch(`${this.baseUrl}/templates/${params.template_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_update_template': {
          const body: Record<string, unknown> = {};
          if (params.name) body.name = params.name;
          if (params.html) body.html = params.html;
          if (params.subject) body.subject = params.subject;

          const response = await fetch(`${this.baseUrl}/templates/${params.template_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_delete_template': {
          const response = await fetch(`${this.baseUrl}/templates/${params.template_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // API Keys
        case 'resend_create_api_key': {
          const body: Record<string, unknown> = { name: params.name };
          if (params.permission) body.permission = params.permission;
          if (params.domain_id) body.domain_id = params.domain_id;

          const response = await fetch(`${this.baseUrl}/api-keys`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_list_api_keys': {
          const response = await fetch(`${this.baseUrl}/api-keys`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'resend_delete_api_key': {
          const response = await fetch(`${this.baseUrl}/api-keys/${params.api_key_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const resendIntegration = new ResendIntegration();
