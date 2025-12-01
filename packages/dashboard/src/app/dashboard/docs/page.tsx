'use client';

import { useState } from 'react';
import {
  Book,
  Copy,
  Check,
  ChevronRight,
  Code,
  Zap,
  Mail,
  Calendar,
  Users,
  Brain,
  Key,
  ExternalLink,
  Terminal,
  Package,
  FileCode,
  Play
} from 'lucide-react';
import { useTenantStore } from '@/lib/store';

// Code block with copy functionality
function CodeBlock({
  code,
  language = 'typescript',
  title,
  showLineNumbers = false
}: {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <span className="text-sm text-zinc-400 font-medium">{title}</span>
          <span className="text-xs text-zinc-500 uppercase">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className={`p-4 overflow-x-auto text-sm ${showLineNumbers ? 'pl-12' : ''}`}>
          <code className="text-zinc-300 font-mono whitespace-pre">{code}</code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>
    </div>
  );
}

// Navigation tabs
const tabs = [
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'installation', label: 'Installation', icon: Package },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'ai', label: 'AI Tools', icon: Brain },
  { id: 'api', label: 'API Reference', icon: Code },
];

export default function DocsPage() {
  const tenantId = useTenantStore((state) => state.tenantId) || 'your-tenant-id';
  const [activeTab, setActiveTab] = useState('quickstart');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host.replace('3000', '3001')}`
    : 'https://your-api-url.com';

  const copyField = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Book className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Developer Documentation</h1>
          </div>
          <p className="text-zinc-400 max-w-2xl">
            Integrate email, calendar, contacts, and AI-powered tools into your application
            with our official SDK and REST API.
          </p>

          {/* Quick config display */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <Key className="w-5 h-5 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500">Your Tenant ID</p>
                <p className="text-sm text-zinc-300 font-mono truncate">{tenantId}</p>
              </div>
              <button
                onClick={() => copyField(tenantId, 'tenantId')}
                className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
              >
                {copiedField === 'tenantId' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <Terminal className="w-5 h-5 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500">API Base URL</p>
                <p className="text-sm text-zinc-300 font-mono truncate">{baseUrl}</p>
              </div>
              <button
                onClick={() => copyField(baseUrl, 'baseUrl')}
                className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
              >
                {copiedField === 'baseUrl' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-48 flex-shrink-0">
            <ul className="space-y-1 sticky top-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'quickstart' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
                  <p className="text-zinc-400 mb-6">
                    Get up and running in under 5 minutes. Install the SDK and start making API calls.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm flex items-center justify-center">1</span>
                        Install the SDK
                      </h3>
                      <CodeBlock
                        code="npm install @botmakers/sdk"
                        language="bash"
                        title="Terminal"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm flex items-center justify-center">2</span>
                        Initialize the Client
                      </h3>
                      <CodeBlock
                        code={`import { createClient } from '@botmakers/sdk';

const client = createClient({
  baseUrl: '${baseUrl}',
  tenantId: '${tenantId}',
  apiKey: 'bm_live_xxxxx', // Get from API Keys page
});`}
                        language="typescript"
                        title="client.ts"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm flex items-center justify-center">3</span>
                        Make Your First API Call
                      </h3>
                      <CodeBlock
                        code={`// List recent emails
const { emails } = await client.listEmails({ limit: 10 });
console.log('Recent emails:', emails);

// Send an email
await client.sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello from BotMakers!',
  body: '<p>This email was sent via the SDK.</p>',
});`}
                        language="typescript"
                        title="example.ts"
                      />
                    </div>
                  </div>
                </section>

                <section className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h3 className="text-sm font-medium text-blue-400 mb-2">Need an API Key?</h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Generate an API key to authenticate your requests.
                  </p>
                  <a
                    href="/dashboard/api-keys"
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Go to API Keys <ChevronRight className="w-4 h-4" />
                  </a>
                </section>
              </div>
            )}

            {activeTab === 'installation' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Installation</h2>
                  <p className="text-zinc-400 mb-6">
                    Choose your preferred package manager to install the BotMakers SDK.
                  </p>

                  <div className="space-y-4">
                    <CodeBlock
                      code="npm install @botmakers/sdk"
                      language="bash"
                      title="npm"
                    />
                    <CodeBlock
                      code="yarn add @botmakers/sdk"
                      language="bash"
                      title="yarn"
                    />
                    <CodeBlock
                      code="pnpm add @botmakers/sdk"
                      language="bash"
                      title="pnpm"
                    />
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Configuration</h2>
                  <CodeBlock
                    code={`import { createClient } from '@botmakers/sdk';

// Full configuration options
const client = createClient({
  // Required
  baseUrl: '${baseUrl}',
  tenantId: '${tenantId}',

  // Optional
  apiKey: 'bm_live_xxxxx',    // For authenticated endpoints
  timeout: 30000,             // Request timeout in ms (default: 30000)
  debug: false,               // Enable debug logging
});`}
                    language="typescript"
                    title="Configuration Options"
                  />
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">TypeScript Support</h2>
                  <p className="text-zinc-400 mb-4">
                    The SDK is written in TypeScript and includes full type definitions.
                  </p>
                  <CodeBlock
                    code={`import type {
  Email,
  Calendar,
  CalendarEvent,
  Contact,
  Integration,
  ConnectionInfo,
  Tool,
} from '@botmakers/sdk';`}
                    language="typescript"
                    title="Type Imports"
                  />
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Error Handling</h2>
                  <CodeBlock
                    code={`import {
  BotMakersError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ConnectionError,
} from '@botmakers/sdk';

try {
  await client.sendEmail({ /* ... */ });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry later');
  } else if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.details);
  } else if (error instanceof ConnectionError) {
    console.error('Integration connection failed:', error.message);
  } else if (error instanceof BotMakersError) {
    console.error(\`Error \${error.code}: \${error.message}\`);
  }
}`}
                    language="typescript"
                    title="Error Handling"
                  />
                </section>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Email Operations</h2>
                  <p className="text-zinc-400 mb-6">
                    Send, receive, search, and manage emails programmatically.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">List Emails</h3>
                      <CodeBlock
                        code={`const { emails, pageToken } = await client.listEmails({
  folderId: 'inbox',    // Optional: specific folder
  limit: 20,            // Number of emails (default: 10)
  unreadOnly: true,     // Only unread emails
  pageToken: '...',     // For pagination
});

emails.forEach(email => {
  console.log(\`\${email.subject} from \${email.from.email}\`);
});`}
                        language="typescript"
                        title="List Emails"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Send Email</h3>
                      <CodeBlock
                        code={`await client.sendEmail({
  to: ['alice@example.com', 'bob@example.com'],
  cc: 'manager@example.com',
  subject: 'Project Update',
  body: '<p>Here is the weekly update...</p>',
  attachments: [
    {
      filename: 'report.pdf',
      contentType: 'application/pdf',
      content: base64EncodedContent,
    }
  ],
});`}
                        language="typescript"
                        title="Send Email"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Search Emails</h3>
                      <CodeBlock
                        code={`const { emails } = await client.searchEmails({
  query: 'project report',
  from: 'team@company.com',
  hasAttachment: true,
  after: '2024-01-01',
  before: '2024-12-31',
  limit: 50,
});`}
                        language="typescript"
                        title="Search Emails"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Email Actions</h3>
                      <CodeBlock
                        code={`// Mark as read/unread
await client.markEmailRead('email-id', true);

// Star/unstar
await client.starEmail('email-id', true);

// Move to trash
await client.trashEmail('email-id');

// Move to folder
await client.moveEmail('email-id', 'folder-id');`}
                        language="typescript"
                        title="Email Actions"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Calendar Operations</h2>
                  <p className="text-zinc-400 mb-6">
                    Create events, check availability, and manage calendars.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">List Events</h3>
                      <CodeBlock
                        code={`const { events } = await client.listEvents({
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z',
  calendarId: 'primary',  // Optional
  limit: 50,
});

events.forEach(event => {
  console.log(\`\${event.title} at \${event.startTime}\`);
});`}
                        language="typescript"
                        title="List Events"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Create Event</h3>
                      <CodeBlock
                        code={`const { event } = await client.createEvent({
  title: 'Team Meeting',
  description: 'Weekly sync',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  participants: [
    'alice@company.com',
    'bob@company.com'
  ],
  conferencing: true,  // Auto-add video link
  sendNotifications: true,
});

console.log('Meeting created:', event.id);
console.log('Video link:', event.conferencing?.url);`}
                        language="typescript"
                        title="Create Event"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Check Availability</h3>
                      <CodeBlock
                        code={`const { slots } = await client.checkAvailability({
  emails: ['alice@company.com', 'bob@company.com'],
  startTime: '2024-01-15T09:00:00Z',
  endTime: '2024-01-15T17:00:00Z',
  duration: 30,  // minutes
});

slots.forEach(slot => {
  console.log(\`Free slot: \${slot.start} - \${slot.end}\`);
});`}
                        language="typescript"
                        title="Check Availability"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Contact Operations</h2>
                  <p className="text-zinc-400 mb-6">
                    Access and manage contacts from connected email accounts.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">List Contacts</h3>
                      <CodeBlock
                        code={`const { contacts } = await client.listContacts({
  limit: 50,
  source: 'address_book',  // Optional filter
});

contacts.forEach(contact => {
  console.log(\`\${contact.displayName}: \${contact.emails?.[0]?.email}\`);
});`}
                        language="typescript"
                        title="List Contacts"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Search Contacts</h3>
                      <CodeBlock
                        code={`const { contacts } = await client.searchContacts({
  query: 'john smith',
  limit: 20,
});`}
                        language="typescript"
                        title="Search Contacts"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Create Contact</h3>
                      <CodeBlock
                        code={`const { contact } = await client.createContact({
  givenName: 'John',
  surname: 'Smith',
  emails: [
    { email: 'john@example.com', type: 'work' }
  ],
  phoneNumbers: [
    { number: '+1234567890', type: 'mobile' }
  ],
  companyName: 'Acme Corp',
  jobTitle: 'Software Engineer',
});`}
                        language="typescript"
                        title="Create Contact"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">AI-Powered Tools</h2>
                  <p className="text-zinc-400 mb-6">
                    Use AI to draft replies, summarize threads, and compose emails intelligently.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Draft Reply</h3>
                      <CodeBlock
                        code={`const { draft, subject, suggestedActions } = await client.draftReply({
  emailId: 'email-id',
  instructions: 'Politely decline the meeting request',
  tone: 'professional',  // 'professional' | 'friendly' | 'formal' | 'casual'
  maxLength: 200,
});

console.log('Draft:', draft);
console.log('Suggested actions:', suggestedActions);`}
                        language="typescript"
                        title="AI Draft Reply"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Summarize Thread</h3>
                      <CodeBlock
                        code={`const { summary, actionItems, keyPoints, participants } =
  await client.summarizeThread({
    emailId: 'email-id',
    includeActionItems: true,
    maxLength: 500,
  });

console.log('Summary:', summary);
console.log('Action items:', actionItems);
console.log('Key points:', keyPoints);`}
                        language="typescript"
                        title="AI Summarize Thread"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Smart Compose</h3>
                      <CodeBlock
                        code={`const { email } = await client.smartCompose({
  prompt: 'Write a follow-up email about the Q4 sales report',
  context: 'We discussed this in last week\\'s meeting',
  tone: 'friendly',
  maxLength: 300,
});

console.log('Subject:', email.subject);
console.log('Body:', email.body);`}
                        language="typescript"
                        title="AI Smart Compose"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Extract Action Items</h3>
                      <CodeBlock
                        code={`const { actionItems } = await client.extractActionItems({
  emailId: 'email-id',
});

actionItems.forEach(item => {
  console.log(\`Task: \${item.task}\`);
  console.log(\`Assignee: \${item.assignee}\`);
  console.log(\`Due: \${item.dueDate}\`);
  console.log(\`Priority: \${item.priority}\`);
});`}
                        language="typescript"
                        title="AI Extract Action Items"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">REST API Reference</h2>
                  <p className="text-zinc-400 mb-6">
                    All SDK methods are backed by REST endpoints. Use these directly if you prefer.
                  </p>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900">
                          <tr>
                            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Method</th>
                            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Endpoint</th>
                            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GET</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/emails</td>
                            <td className="px-4 py-3 text-zinc-400">List emails</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">POST</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/emails/send</td>
                            <td className="px-4 py-3 text-zinc-400">Send email</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GET</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/calendar/events</td>
                            <td className="px-4 py-3 text-zinc-400">List calendar events</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">POST</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/calendar/events</td>
                            <td className="px-4 py-3 text-zinc-400">Create event</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GET</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/contacts</td>
                            <td className="px-4 py-3 text-zinc-400">List contacts</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">POST</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/ai/draft-reply</td>
                            <td className="px-4 py-3 text-zinc-400">AI draft reply</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">POST</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/api/ai/summarize</td>
                            <td className="px-4 py-3 text-zinc-400">AI summarize thread</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GET</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/connections/:tenantId</td>
                            <td className="px-4 py-3 text-zinc-400">List integrations</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GET</span></td>
                            <td className="px-4 py-3 text-zinc-300 font-mono text-xs">/auth/status/:tenantId</td>
                            <td className="px-4 py-3 text-zinc-400">Check auth status</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Authentication</h2>
                  <p className="text-zinc-400 mb-4">
                    Include your API key in the <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-sm">Authorization</code> header:
                  </p>
                  <CodeBlock
                    code={`curl -X GET '${baseUrl}/api/emails' \\
  -H 'Authorization: Bearer bm_live_xxxxx' \\
  -H 'X-Tenant-ID: ${tenantId}' \\
  -H 'Content-Type: application/json'`}
                    language="bash"
                    title="cURL Example"
                  />
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Rate Limits</h2>
                  <div className="rounded-lg border border-zinc-800 p-4">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-zinc-800">
                        <tr>
                          <td className="py-2 text-zinc-400">Free Tier</td>
                          <td className="py-2 text-zinc-300 text-right">100 requests/minute</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-zinc-400">Pro Tier</td>
                          <td className="py-2 text-zinc-300 text-right">1,000 requests/minute</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-zinc-400">Enterprise</td>
                          <td className="py-2 text-zinc-300 text-right">Custom limits</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
