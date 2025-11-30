export interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'communication' | 'productivity' | 'crm' | 'legal' | 'voice' | 'finance' | 'developer' | 'ai';
  icon: string;
  color: string;
  authType: 'oauth2' | 'api_key';
  status: 'available' | 'coming_soon' | 'beta';
  premium?: boolean;
}

export const integrations: Integration[] = [
  // Communication
  {
    id: 'nylas',
    name: 'Email (Gmail/Outlook)',
    description: 'Connect Gmail, Outlook, and other email providers via Nylas',
    category: 'communication',
    icon: 'Mail',
    color: '#4285F4',
    authType: 'oauth2',
    status: 'available',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, manage channels, and interact with Slack workspaces',
    category: 'communication',
    icon: 'MessageSquare',
    color: '#4A154B',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Send messages, manage teams, and schedule meetings',
    category: 'communication',
    icon: 'Users',
    color: '#6264A7',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Manage servers, send messages, and interact with Discord communities',
    category: 'communication',
    icon: 'Gamepad2',
    color: '#5865F2',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Schedule and manage Zoom meetings',
    category: 'communication',
    icon: 'Video',
    color: '#2D8CFF',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send and receive WhatsApp messages through Business API',
    category: 'communication',
    icon: 'MessageCircle',
    color: '#25D366',
    authType: 'api_key',
    status: 'coming_soon',
  },

  // Productivity
  {
    id: 'msgraph',
    name: 'Microsoft 365',
    description: 'Access OneDrive, SharePoint, Outlook Calendar, and more',
    category: 'productivity',
    icon: 'Building2',
    color: '#0078D4',
    authType: 'oauth2',
    status: 'available',
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Access Drive, Docs, Sheets, Calendar, and more',
    category: 'productivity',
    icon: 'FileText',
    color: '#4285F4',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read and write to Notion databases and pages',
    category: 'productivity',
    icon: 'BookOpen',
    color: '#000000',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Manage Airtable bases, tables, and records',
    category: 'productivity',
    icon: 'Table',
    color: '#18BFFF',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Manage boards, lists, and cards',
    category: 'productivity',
    icon: 'LayoutDashboard',
    color: '#0079BF',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Manage projects, tasks, and teams',
    category: 'productivity',
    icon: 'CheckSquare',
    color: '#F06A6A',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Manage workspaces, boards, and items',
    category: 'productivity',
    icon: 'Columns',
    color: '#FF3D57',
    authType: 'oauth2',
    status: 'coming_soon',
  },

  // CRM
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Manage contacts, deals, companies, and tickets',
    category: 'crm',
    icon: 'Target',
    color: '#FF7A59',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Access leads, opportunities, accounts, and more',
    category: 'crm',
    icon: 'Cloud',
    color: '#00A1E0',
    authType: 'oauth2',
    status: 'coming_soon',
    premium: true,
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Manage deals, contacts, and sales pipelines',
    category: 'crm',
    icon: 'GitBranch',
    color: '#1A1A1A',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'Access contacts, opportunities, and automations',
    category: 'crm',
    icon: 'Rocket',
    color: '#00BFA5',
    authType: 'api_key',
    status: 'coming_soon',
  },
  {
    id: 'close',
    name: 'Close',
    description: 'Manage leads, contacts, and sales activities',
    category: 'crm',
    icon: 'Phone',
    color: '#3FB6DC',
    authType: 'api_key',
    status: 'coming_soon',
  },

  // Legal
  {
    id: 'filevine',
    name: 'Filevine',
    description: 'Legal practice management - projects, contacts, tasks, documents',
    category: 'legal',
    icon: 'Scale',
    color: '#1E3A5F',
    authType: 'api_key',
    status: 'coming_soon',
    premium: true,
  },

  // Voice
  {
    id: 'vapi',
    name: 'Vapi',
    description: 'Voice AI platform - manage assistants, calls, and analytics',
    category: 'voice',
    icon: 'Mic',
    color: '#6366F1',
    authType: 'api_key',
    status: 'coming_soon',
  },

  // Finance
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Manage invoices, customers, and financial data',
    category: 'finance',
    icon: 'Calculator',
    color: '#2CA01C',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Manage invoices, contacts, and accounting',
    category: 'finance',
    icon: 'Receipt',
    color: '#13B5EA',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Access customers, payments, and subscriptions',
    category: 'finance',
    icon: 'CreditCard',
    color: '#635BFF',
    authType: 'api_key',
    status: 'coming_soon',
  },
  {
    id: 'plaid',
    name: 'Plaid',
    description: 'Access bank accounts, transactions, and financial data',
    category: 'finance',
    icon: 'Landmark',
    color: '#000000',
    authType: 'api_key',
    status: 'coming_soon',
  },

  // Developer
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repositories, issues, pull requests, and code',
    category: 'developer',
    icon: 'Github',
    color: '#181717',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Manage projects, issues, and merge requests',
    category: 'developer',
    icon: 'GitMerge',
    color: '#FC6D26',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Manage projects, issues, and sprints',
    category: 'developer',
    icon: 'Ticket',
    color: '#0052CC',
    authType: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Manage issues, projects, and cycles',
    category: 'developer',
    icon: 'Layers',
    color: '#5E6AD2',
    authType: 'api_key',
    status: 'coming_soon',
  },

  // AI
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Access GPT models, embeddings, and DALL-E',
    category: 'ai',
    icon: 'Brain',
    color: '#10A37F',
    authType: 'api_key',
    status: 'coming_soon',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Access Claude models and embeddings',
    category: 'ai',
    icon: 'Sparkles',
    color: '#D4A574',
    authType: 'api_key',
    status: 'available',
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    description: 'Vector database for semantic search and RAG',
    category: 'ai',
    icon: 'Database',
    color: '#000000',
    authType: 'api_key',
    status: 'coming_soon',
  },
];

export const categories = [
  { id: 'communication', name: 'Communication', icon: 'MessageSquare' },
  { id: 'productivity', name: 'Productivity', icon: 'Briefcase' },
  { id: 'crm', name: 'CRM & Sales', icon: 'Target' },
  { id: 'legal', name: 'Legal', icon: 'Scale' },
  { id: 'voice', name: 'Voice AI', icon: 'Mic' },
  { id: 'finance', name: 'Finance', icon: 'DollarSign' },
  { id: 'developer', name: 'Developer', icon: 'Code' },
  { id: 'ai', name: 'AI & ML', icon: 'Brain' },
];

export function getIntegrationsByCategory(category: string): Integration[] {
  return integrations.filter((i) => i.category === category);
}

export function getIntegration(id: string): Integration | undefined {
  return integrations.find((i) => i.id === id);
}

export function getAvailableIntegrations(): Integration[] {
  return integrations.filter((i) => i.status === 'available');
}
