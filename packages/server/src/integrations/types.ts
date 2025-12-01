// ===========================================
// INTEGRATION TYPES
// Base types for all integrations
// ===========================================

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  authType: 'oauth2' | 'oauth1' | 'api_key' | 'basic';
  scopes?: string[];
  requiredEnvVars: string[];
}

export type IntegrationCategory =
  | 'email'
  | 'calendar'
  | 'contacts'
  | 'files'
  | 'communication'
  | 'crm'
  | 'voice'
  | 'ai'
  | 'productivity'
  | 'finance'
  | 'developer';

export interface IntegrationCredentials {
  integrationId: string;
  tenantId: string;
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  grantId?: string; // For Nylas
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  integration: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    integration: string;
    tool: string;
    duration?: number;
  };
}

// ===========================================
// BASE INTEGRATION INTERFACE
// ===========================================

export interface Integration {
  config: IntegrationConfig;

  // Initialization
  initialize(): Promise<void>;
  isConfigured(): boolean;

  // OAuth flow (for oauth2 auth type)
  getAuthUrl?(tenantId: string, state?: string): Promise<string>;
  handleCallback?(code: string, state: string): Promise<IntegrationCredentials>;
  refreshToken?(credentials: IntegrationCredentials): Promise<IntegrationCredentials>;

  // Tools
  getTools(): ToolDefinition[];
  executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult>;
}

// ===========================================
// PROVIDER-SPECIFIC TYPES
// ===========================================

// Email types (shared across Nylas, MS Graph, etc.)
export interface EmailMessage {
  id: string;
  threadId?: string;
  from: EmailParticipant;
  to: EmailParticipant[];
  cc?: EmailParticipant[];
  bcc?: EmailParticipant[];
  subject: string;
  body: string;
  snippet?: string;
  date: Date;
  unread: boolean;
  starred: boolean;
  folders: string[];
  attachments?: EmailAttachment[];
}

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

export interface EmailFolder {
  id: string;
  name: string;
  type?: string;
  unreadCount?: number;
  totalCount?: number;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  participants?: EventParticipant[];
  recurrence?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface EventParticipant {
  email: string;
  name?: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  readOnly?: boolean;
}

// Contact types
export interface Contact {
  id: string;
  givenName?: string;
  surname?: string;
  displayName?: string;
  emails?: { email: string; type?: string }[];
  phoneNumbers?: { number: string; type?: string }[];
  companyName?: string;
  jobTitle?: string;
}

// File types (for OneDrive, SharePoint)
export interface FileItem {
  id: string;
  name: string;
  path: string;
  mimeType?: string;
  size?: number;
  createdAt?: Date;
  modifiedAt?: Date;
  isFolder: boolean;
  webUrl?: string;
  downloadUrl?: string;
}

// Teams types
export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  teamId: string;
}

export interface TeamsMessage {
  id: string;
  content: string;
  from: { displayName: string; email?: string };
  createdAt: Date;
  channelId: string;
}
