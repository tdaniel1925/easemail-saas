// ===========================================
// WHATSAPP BUSINESS INTEGRATION
// WhatsApp Business API messaging
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class WhatsAppIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'WhatsApp Business API for messaging',
    category: 'communication',
    authType: 'api_key',
    requiredEnvVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
  };

  isConfigured(): boolean {
    return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'whatsapp_send_message',
        description: 'Send a WhatsApp message',
        category: 'communication',
        integration: 'whatsapp',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'to', type: 'string', description: 'Recipient phone number (with country code)', required: true },
          { name: 'message', type: 'string', description: 'Message text', required: true },
        ],
      },
      {
        name: 'whatsapp_send_template',
        description: 'Send a WhatsApp template message',
        category: 'communication',
        integration: 'whatsapp',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'to', type: 'string', description: 'Recipient phone number', required: true },
          { name: 'template_name', type: 'string', description: 'Template name', required: true },
          { name: 'language_code', type: 'string', description: 'Language code (e.g., en_US)', required: true },
          { name: 'components', type: 'array', description: 'Template components', required: false },
        ],
      },
      {
        name: 'whatsapp_get_message_status',
        description: 'Get message delivery status',
        category: 'communication',
        integration: 'whatsapp',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'message_id', type: 'string', description: 'Message ID', required: true },
        ],
      },
      {
        name: 'whatsapp_send_media',
        description: 'Send media (image, document, video)',
        category: 'communication',
        integration: 'whatsapp',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'to', type: 'string', description: 'Recipient phone number', required: true },
          { name: 'media_type', type: 'string', description: 'Type (image, document, video, audio)', required: true },
          { name: 'media_url', type: 'string', description: 'Media URL', required: true },
          { name: 'caption', type: 'string', description: 'Caption', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = credentials.metadata?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return { success: false, error: 'Missing WhatsApp credentials.' };
    }

    const baseUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'whatsapp_send_message': {
          const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: params.to,
              type: 'text',
              text: { body: params.message },
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'whatsapp_send_template': {
          const body: Record<string, unknown> = {
            messaging_product: 'whatsapp',
            to: params.to,
            type: 'template',
            template: {
              name: params.template_name,
              language: { code: params.language_code },
            },
          };
          if (params.components) {
            (body.template as Record<string, unknown>).components = params.components;
          }

          const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'whatsapp_get_message_status': {
          // WhatsApp uses webhooks for status updates, so we can only check if message exists
          return { success: true, data: { message: 'Use webhooks to track message status in real-time' } };
        }

        case 'whatsapp_send_media': {
          const mediaBody: Record<string, unknown> = {
            messaging_product: 'whatsapp',
            to: params.to,
            type: params.media_type,
          };

          const mediaObject: Record<string, string> = {
            link: params.media_url as string,
          };
          if (params.caption) mediaObject.caption = params.caption as string;

          mediaBody[params.media_type as string] = mediaObject;

          const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(mediaBody),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const whatsappIntegration = new WhatsAppIntegration();
