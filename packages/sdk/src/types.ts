// ===========================================
// BOTMAKERS SDK TYPES
// Complete TypeScript types for the MCP Server API
// ===========================================

// ===========================================
// CONFIGURATION
// ===========================================

export interface BotMakersConfig {
  /** Base URL of the MCP server (e.g., "https://api.yourcompany.com" or "http://localhost:3050") */
  baseUrl: string;
  /** Your tenant ID or slug */
  tenantId: string;
  /** API key for authentication (optional - some endpoints are public) */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom fetch implementation (for Node.js < 18 or custom handling) */
  fetch?: typeof fetch;
  /** Enable debug logging */
  debug?: boolean;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pageToken?: string;
  hasMore?: boolean;
  total?: number;
}

// ===========================================
// INTEGRATION TYPES
// ===========================================

export type IntegrationMode = 'INCLUDED' | 'BYOK' | 'DISABLED';
export type AuthType = 'api_key' | 'oauth2';
export type IntegrationCategory =
  | 'ai'
  | 'communication'
  | 'email'
  | 'crm'
  | 'finance'
  | 'storage'
  | 'productivity';

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  placeholder?: string;
}

export interface Integration {
  id: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  iconUrl?: string;
  docsUrl?: string;
  mode: IntegrationMode;
  authType: AuthType;
  isConnected: boolean;
  credentialFields?: CredentialField[];
  oauthScopes?: string[];
  connection?: ConnectionInfo | null;
  setupInstructions?: string;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  accountEmail?: string | null;
  accountName?: string | null;
  status: ConnectionStatus;
  lastUsedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt?: string;
  maskedCredentials?: Record<string, string> | null;
}

export type ConnectionStatus = 'active' | 'expired' | 'error' | 'pending';

export interface CategoryInfo {
  id: IntegrationCategory;
  name: string;
  icon: string;
  description?: string;
}

// ===========================================
// CONNECTION MANAGEMENT
// ===========================================

export interface CreateConnectionParams {
  /** Optional display name for the connection */
  name?: string;
  /** Credentials for API key integrations */
  credentials?: Record<string, string>;
  /** Account email for OAuth integrations */
  accountEmail?: string;
}

export interface UpdateConnectionParams {
  name?: string;
  credentials?: Record<string, string>;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    latency?: number;
    accountInfo?: Record<string, unknown>;
  };
}

// ===========================================
// EMAIL TYPES
// ===========================================

export interface EmailParticipant {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Email {
  id: string;
  threadId?: string;
  from: EmailParticipant;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];
  replyTo?: EmailParticipant[];
  subject: string;
  body: string;
  snippet?: string;
  date: string;
  unread: boolean;
  starred: boolean;
  folders: string[];
  attachments?: EmailAttachment[];
}

export interface EmailFolder {
  id: string;
  name: string;
  type?: string;
  unreadCount?: number;
  totalCount?: number;
  parentId?: string;
  path?: string;
}

export interface ListEmailsParams {
  folderId?: string;
  limit?: number;
  pageToken?: string;
  unreadOnly?: boolean;
}

export interface SendEmailParams {
  to: string | string[] | EmailParticipant[];
  subject: string;
  body: string;
  cc?: string | string[] | EmailParticipant[];
  bcc?: string | string[] | EmailParticipant[];
  replyToMessageId?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: string; // base64 encoded
  }>;
}

export interface SearchEmailsParams {
  query: string;
  limit?: number;
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
  after?: string;
  before?: string;
}

// ===========================================
// CALENDAR TYPES
// ===========================================

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  isReadOnly?: boolean;
  timezone?: string;
  hexColor?: string;
}

export interface EventParticipant {
  email: string;
  name?: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  participants?: EventParticipant[];
  organizer?: EventParticipant;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string;
  conferencing?: {
    provider?: string;
    url?: string;
  };
}

export interface ListEventsParams {
  calendarId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  pageToken?: string;
}

export interface CreateEventParams {
  calendarId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  participants?: (string | EventParticipant)[];
  sendNotifications?: boolean;
  conferencing?: boolean;
}

export interface CheckAvailabilityParams {
  emails: string[];
  startTime: string;
  endTime: string;
  duration?: number; // minutes
}

export interface FreeBusySlot {
  email: string;
  busy: Array<{
    start: string;
    end: string;
  }>;
}

// ===========================================
// CONTACT TYPES
// ===========================================

export interface Contact {
  id: string;
  givenName?: string;
  surname?: string;
  displayName?: string;
  emails?: Array<{ email: string; type?: string }>;
  phoneNumbers?: Array<{ number: string; type?: string }>;
  companyName?: string;
  jobTitle?: string;
  birthday?: string;
  notes?: string;
  photoUrl?: string;
}

export interface ListContactsParams {
  limit?: number;
  pageToken?: string;
  source?: string;
}

export interface CreateContactParams {
  givenName?: string;
  surname?: string;
  displayName?: string;
  emails?: Array<{ email: string; type?: string }>;
  phoneNumbers?: Array<{ number: string; type?: string }>;
  companyName?: string;
  jobTitle?: string;
  notes?: string;
}

export interface SearchContactsParams {
  query: string;
  limit?: number;
}

// ===========================================
// AI TOOLS TYPES
// ===========================================

export interface DraftReplyParams {
  emailId: string;
  instructions?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  maxLength?: number;
}

export interface DraftReplyResult {
  draft: string;
  subject?: string;
  suggestedActions?: string[];
}

export interface SummarizeThreadParams {
  emailId: string;
  maxLength?: number;
  includeActionItems?: boolean;
}

export interface SummarizeThreadResult {
  summary: string;
  actionItems?: string[];
  keyPoints?: string[];
  participants?: string[];
}

export interface ExtractActionItemsParams {
  emailId: string;
}

export interface ActionItem {
  task: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface SmartComposeParams {
  prompt: string;
  context?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  maxLength?: number;
}

export interface SmartComposeResult {
  email: {
    subject: string;
    body: string;
  };
}

// ===========================================
// TOOL TYPES
// ===========================================

export interface Tool {
  name: string;
  category: string;
  description: string;
}

export interface CallToolParams {
  tool: string;
  params?: Record<string, unknown>;
}

// ===========================================
// USAGE & BILLING TYPES
// ===========================================

export interface UsageRecord {
  integrationId: string;
  displayName?: string;
  units: number;
  callCount: number;
  estimatedCost?: number;
}

export interface UsageSummary {
  period: string;
  usage: UsageRecord[];
  total: {
    estimatedCost: number;
    totalCalls: number;
  };
}

// ===========================================
// HEALTH CHECK TYPES
// ===========================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  uptime?: number;
  services?: Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck?: string;
  error?: string;
}

export interface ConnectionHealthCheck {
  integrationId: string;
  status: 'healthy' | 'unhealthy' | 'expired';
  latency?: number;
  message?: string;
  details?: {
    tokenExpiresAt?: string;
    lastUsed?: string;
    accountInfo?: Record<string, unknown>;
  };
}

// ===========================================
// ERROR TYPES
// ===========================================

export class BotMakersError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BotMakersError';
  }
}

export class AuthenticationError extends BotMakersError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends BotMakersError {
  constructor(message: string = 'Not authorized') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends BotMakersError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends BotMakersError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends BotMakersError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ConnectionError extends BotMakersError {
  constructor(integrationId: string, message: string) {
    super(message, 'CONNECTION_ERROR', 400, { integrationId });
    this.name = 'ConnectionError';
  }
}
