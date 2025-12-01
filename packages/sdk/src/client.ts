// ===========================================
// BOTMAKERS SDK CLIENT
// Main client for interacting with MCP Server
// ===========================================

import {
  BotMakersConfig,
  ApiResponse,
  PaginatedResponse,
  BotMakersError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  // Integration types
  Integration,
  CategoryInfo,
  ConnectionInfo,
  CreateConnectionParams,
  UpdateConnectionParams,
  ConnectionTestResult,
  ConnectionHealthCheck,
  // Email types
  Email,
  EmailFolder,
  ListEmailsParams,
  SendEmailParams,
  SearchEmailsParams,
  // Calendar types
  Calendar,
  CalendarEvent,
  ListEventsParams,
  CreateEventParams,
  CheckAvailabilityParams,
  FreeBusySlot,
  // Contact types
  Contact,
  ListContactsParams,
  CreateContactParams,
  SearchContactsParams,
  // AI types
  DraftReplyParams,
  DraftReplyResult,
  SummarizeThreadParams,
  SummarizeThreadResult,
  ExtractActionItemsParams,
  ActionItem,
  SmartComposeParams,
  SmartComposeResult,
  // Other types
  Tool,
  UsageSummary,
  HealthStatus,
} from './types.js';

// ===========================================
// HTTP CLIENT
// ===========================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

export class BotMakersClient {
  private config: Required<Omit<BotMakersConfig, 'apiKey' | 'fetch'>> & Pick<BotMakersConfig, 'apiKey' | 'fetch'>;

  constructor(config: BotMakersConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      tenantId: config.tenantId,
      apiKey: config.apiKey,
      timeout: config.timeout ?? 30000,
      fetch: config.fetch,
      debug: config.debug ?? false,
    };
  }

  // ===========================================
  // HTTP REQUEST HELPER
  // ===========================================

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = options;

    // Build URL with query params
    let url = `${this.config.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.config.apiKey) {
      requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Debug logging
    if (this.config.debug) {
      console.log(`[BotMakers SDK] ${method} ${url}`);
      if (body) console.log('[BotMakers SDK] Body:', JSON.stringify(body, null, 2));
    }

    // Make request with timeout
    const fetchFn = this.config.fetch ?? fetch;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetchFn(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data = await response.json() as ApiResponse<T>;

      if (this.config.debug) {
        console.log('[BotMakers SDK] Response:', response.status, JSON.stringify(data, null, 2));
      }

      // Handle errors
      if (!response.ok) {
        this.handleError(response.status, data);
      }

      // Return data or the full response depending on shape
      if ('data' in data && data.data !== undefined) {
        return data.data as T;
      }
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof BotMakersError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new BotMakersError('Request timeout', 'TIMEOUT', 408);
        }
        throw new BotMakersError(error.message, 'NETWORK_ERROR', 0);
      }

      throw new BotMakersError('Unknown error', 'UNKNOWN_ERROR', 0);
    }
  }

  private handleError(status: number, data: ApiResponse): never {
    const message = data.error || data.message || 'Unknown error';
    const code = data.errorCode || 'UNKNOWN';

    switch (status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new AuthorizationError(message);
      case 404:
        throw new NotFoundError(message);
      case 400:
        throw new ValidationError(message, data as Record<string, unknown>);
      case 429:
        throw new RateLimitError();
      default:
        throw new BotMakersError(message, code, status);
    }
  }

  // ===========================================
  // HEALTH & STATUS
  // ===========================================

  /**
   * Check server health
   */
  async health(): Promise<HealthStatus & { tools: string[] }> {
    return this.request('/health');
  }

  /**
   * Get list of available tools
   */
  async getTools(): Promise<{ tools: Tool[] }> {
    return this.request('/tools');
  }

  // ===========================================
  // INTEGRATIONS
  // ===========================================

  /**
   * List all available integrations and their connection status
   */
  async listIntegrations(): Promise<{
    integrations: Integration[];
    byCategory: Record<string, Integration[]>;
    stats: { total: number; connected: number; included: number; byok: number };
    categories: CategoryInfo[];
  }> {
    return this.request(`/connections/${this.config.tenantId}`);
  }

  /**
   * Get details for a specific integration
   */
  async getIntegration(integrationId: string): Promise<{
    integration: Integration;
    connection: ConnectionInfo | null;
  }> {
    return this.request(`/connections/${this.config.tenantId}/${integrationId}`);
  }

  // ===========================================
  // CONNECTION MANAGEMENT
  // ===========================================

  /**
   * Create a new connection to an integration (BYOK mode)
   */
  async createConnection(
    integrationId: string,
    params: CreateConnectionParams
  ): Promise<{
    connection: ConnectionInfo;
    message: string;
  }> {
    return this.request(`/connections/${this.config.tenantId}/${integrationId}`, {
      method: 'POST',
      body: params,
    });
  }

  /**
   * Update an existing connection
   */
  async updateConnection(
    integrationId: string,
    connectionId: string,
    params: UpdateConnectionParams
  ): Promise<{
    connection: ConnectionInfo;
    message: string;
  }> {
    return this.request(`/connections/${this.config.tenantId}/${integrationId}/${connectionId}`, {
      method: 'PUT',
      body: params,
    });
  }

  /**
   * Delete/disconnect a connection
   */
  async deleteConnection(
    integrationId: string,
    connectionId: string
  ): Promise<{ message: string }> {
    return this.request(`/connections/${this.config.tenantId}/${integrationId}/${connectionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Test a connection
   */
  async testConnection(
    integrationId: string,
    connectionId: string
  ): Promise<ConnectionTestResult> {
    return this.request(`/connections/${this.config.tenantId}/${integrationId}/${connectionId}/test`, {
      method: 'POST',
    });
  }

  /**
   * Get health status for all connections
   */
  async checkConnectionHealth(): Promise<ConnectionHealthCheck[]> {
    return this.request(`/connections/${this.config.tenantId}/health`);
  }

  // ===========================================
  // OAUTH FLOW
  // ===========================================

  /**
   * Get OAuth authorization URL for an integration
   */
  async getOAuthUrl(integrationId?: string): Promise<{ authUrl: string }> {
    const path = integrationId
      ? `/integrations/${integrationId}/auth/${this.config.tenantId}`
      : `/auth/connect/${this.config.tenantId}`;
    return this.request(path);
  }

  /**
   * Check OAuth connection status
   */
  async getOAuthStatus(integrationId?: string): Promise<{
    connected: boolean;
    email?: string;
    provider?: string;
    grantId?: string;
    connectedAt?: string;
  }> {
    const path = integrationId
      ? `/integrations/${integrationId}/status/${this.config.tenantId}`
      : `/auth/status/${this.config.tenantId}`;
    return this.request(path);
  }

  // ===========================================
  // EMAILS
  // ===========================================

  /**
   * List emails from inbox or folder
   */
  async listEmails(params: ListEmailsParams = {}): Promise<PaginatedResponse<Email>> {
    return this.request(`/emails/${this.config.tenantId}`, {
      params: {
        folder: params.folderId,
        limit: params.limit,
        pageToken: params.pageToken,
        unreadOnly: params.unreadOnly,
      },
    });
  }

  /**
   * Get a single email with full body
   */
  async getEmail(emailId: string): Promise<Email> {
    return this.request(`/emails/${this.config.tenantId}/${emailId}`);
  }

  /**
   * Send a new email
   */
  async sendEmail(params: SendEmailParams): Promise<{ messageId: string; success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'send_email',
        params: {
          tenant_id: this.config.tenantId,
          to: params.to,
          subject: params.subject,
          body: params.body,
          cc: params.cc,
          bcc: params.bcc,
          reply_to_message_id: params.replyToMessageId,
        },
      },
    });
  }

  /**
   * Search emails
   */
  async searchEmails(params: SearchEmailsParams): Promise<PaginatedResponse<Email>> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'search_emails',
        params: {
          tenant_id: this.config.tenantId,
          query: params.query,
          limit: params.limit,
          from: params.from,
          to: params.to,
          subject: params.subject,
          has_attachment: params.hasAttachment,
          is_unread: params.isUnread,
          after: params.after,
          before: params.before,
        },
      },
    });
  }

  /**
   * Mark email as read or unread
   */
  async markEmailRead(emailId: string, read: boolean = true): Promise<{ success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'mark_read',
        params: {
          tenant_id: this.config.tenantId,
          email_id: emailId,
          read,
        },
      },
    });
  }

  /**
   * Star or unstar an email
   */
  async starEmail(emailId: string, starred: boolean = true): Promise<{ success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'star_email',
        params: {
          tenant_id: this.config.tenantId,
          email_id: emailId,
          starred,
        },
      },
    });
  }

  /**
   * Move email to trash
   */
  async trashEmail(emailId: string): Promise<{ success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'trash_email',
        params: {
          tenant_id: this.config.tenantId,
          email_id: emailId,
        },
      },
    });
  }

  /**
   * Move email to a folder
   */
  async moveEmail(emailId: string, folderId: string): Promise<{ success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'move_email',
        params: {
          tenant_id: this.config.tenantId,
          email_id: emailId,
          folder_id: folderId,
        },
      },
    });
  }

  // ===========================================
  // FOLDERS
  // ===========================================

  /**
   * List email folders
   */
  async listFolders(): Promise<{ folders: EmailFolder[] }> {
    return this.request(`/folders/${this.config.tenantId}`);
  }

  /**
   * Create a new folder
   */
  async createFolder(name: string, parentId?: string): Promise<{ folder: EmailFolder }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'create_folder',
        params: {
          tenant_id: this.config.tenantId,
          name,
          parent_id: parentId,
        },
      },
    });
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderId: string): Promise<{ success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'delete_folder',
        params: {
          tenant_id: this.config.tenantId,
          folder_id: folderId,
        },
      },
    });
  }

  // ===========================================
  // CALENDARS
  // ===========================================

  /**
   * List calendars
   */
  async listCalendars(): Promise<{ calendars: Calendar[] }> {
    return this.request(`/calendars/${this.config.tenantId}`);
  }

  /**
   * List calendar events
   */
  async listEvents(params: ListEventsParams = {}): Promise<{ events: CalendarEvent[] }> {
    return this.request(`/events/${this.config.tenantId}`, {
      params: {
        calendarId: params.calendarId,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit,
      },
    });
  }

  /**
   * Get a single event
   */
  async getEvent(eventId: string): Promise<CalendarEvent> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'get_event',
        params: {
          tenant_id: this.config.tenantId,
          event_id: eventId,
        },
      },
    });
  }

  /**
   * Create a calendar event
   */
  async createEvent(params: CreateEventParams): Promise<{ event: CalendarEvent }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'create_event',
        params: {
          tenant_id: this.config.tenantId,
          calendar_id: params.calendarId,
          title: params.title,
          description: params.description,
          location: params.location,
          start_time: params.startTime,
          end_time: params.endTime,
          all_day: params.allDay,
          participants: params.participants,
          send_notifications: params.sendNotifications,
          conferencing: params.conferencing,
        },
      },
    });
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'delete_event',
        params: {
          tenant_id: this.config.tenantId,
          event_id: eventId,
        },
      },
    });
  }

  /**
   * Check availability (free/busy)
   */
  async checkAvailability(params: CheckAvailabilityParams): Promise<{ slots: FreeBusySlot[] }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'check_availability',
        params: {
          tenant_id: this.config.tenantId,
          emails: params.emails,
          start_time: params.startTime,
          end_time: params.endTime,
          duration: params.duration,
        },
      },
    });
  }

  // ===========================================
  // CONTACTS
  // ===========================================

  /**
   * List contacts
   */
  async listContacts(params: ListContactsParams = {}): Promise<PaginatedResponse<Contact>> {
    return this.request(`/contacts/${this.config.tenantId}`, {
      params: {
        limit: params.limit,
        pageToken: params.pageToken,
        source: params.source,
      },
    });
  }

  /**
   * Get a single contact
   */
  async getContact(contactId: string): Promise<Contact> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'get_contact',
        params: {
          tenant_id: this.config.tenantId,
          contact_id: contactId,
        },
      },
    });
  }

  /**
   * Create a contact
   */
  async createContact(params: CreateContactParams): Promise<{ contact: Contact }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'create_contact',
        params: {
          tenant_id: this.config.tenantId,
          ...params,
        },
      },
    });
  }

  /**
   * Search contacts
   */
  async searchContacts(params: SearchContactsParams): Promise<{ contacts: Contact[] }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'search_contacts',
        params: {
          tenant_id: this.config.tenantId,
          query: params.query,
          limit: params.limit,
        },
      },
    });
  }

  // ===========================================
  // AI TOOLS
  // ===========================================

  /**
   * Draft a reply to an email using AI
   */
  async draftReply(params: DraftReplyParams): Promise<DraftReplyResult> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'draft_reply',
        params: {
          tenant_id: this.config.tenantId,
          email_id: params.emailId,
          instructions: params.instructions,
          tone: params.tone,
          max_length: params.maxLength,
        },
      },
    });
  }

  /**
   * Summarize an email thread using AI
   */
  async summarizeThread(params: SummarizeThreadParams): Promise<SummarizeThreadResult> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'summarize_thread',
        params: {
          tenant_id: this.config.tenantId,
          email_id: params.emailId,
          max_length: params.maxLength,
          include_action_items: params.includeActionItems,
        },
      },
    });
  }

  /**
   * Extract action items from an email
   */
  async extractActionItems(params: ExtractActionItemsParams): Promise<{ actionItems: ActionItem[] }> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'extract_action_items',
        params: {
          tenant_id: this.config.tenantId,
          email_id: params.emailId,
        },
      },
    });
  }

  /**
   * Compose an email using AI
   */
  async smartCompose(params: SmartComposeParams): Promise<SmartComposeResult> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool: 'smart_compose',
        params: {
          tenant_id: this.config.tenantId,
          prompt: params.prompt,
          context: params.context,
          tone: params.tone,
          max_length: params.maxLength,
        },
      },
    });
  }

  // ===========================================
  // USAGE & BILLING
  // ===========================================

  /**
   * Get usage summary for the tenant
   */
  async getUsage(period?: string): Promise<UsageSummary> {
    return this.request(`/connections/${this.config.tenantId}/usage`, {
      params: { period },
    });
  }

  // ===========================================
  // GENERIC TOOL CALL
  // ===========================================

  /**
   * Call any tool by name with parameters
   */
  async callTool<T = unknown>(tool: string, params: Record<string, unknown> = {}): Promise<T> {
    return this.request('/call', {
      method: 'POST',
      body: {
        tool,
        params: {
          tenant_id: this.config.tenantId,
          ...params,
        },
      },
    });
  }
}
