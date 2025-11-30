'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import {
  Play,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Tool {
  name: string;
  category: string;
  description: string;
}

const toolParams: Record<string, { name: string; type: string; required: boolean; description: string }[]> = {
  list_emails: [
    { name: 'folder_id', type: 'string', required: false, description: 'Folder to list emails from (default: INBOX)' },
    { name: 'limit', type: 'number', required: false, description: 'Max emails to return (default: 10)' },
    { name: 'unread_only', type: 'boolean', required: false, description: 'Only show unread emails' },
  ],
  get_email: [
    { name: 'email_id', type: 'string', required: true, description: 'ID of the email to retrieve' },
  ],
  send_email: [
    { name: 'to', type: 'string[]', required: true, description: 'Recipient email addresses' },
    { name: 'subject', type: 'string', required: true, description: 'Email subject' },
    { name: 'body', type: 'string', required: true, description: 'Email body (HTML supported)' },
    { name: 'reply_to_message_id', type: 'string', required: false, description: 'Message ID to reply to' },
  ],
  search_emails: [
    { name: 'query', type: 'string', required: true, description: 'Search query' },
    { name: 'limit', type: 'number', required: false, description: 'Max results to return' },
  ],
  list_events: [
    { name: 'calendar_id', type: 'string', required: false, description: 'Calendar ID (default: primary)' },
    { name: 'start_time', type: 'string', required: false, description: 'Start time (ISO format)' },
    { name: 'end_time', type: 'string', required: false, description: 'End time (ISO format)' },
    { name: 'limit', type: 'number', required: false, description: 'Max events to return' },
  ],
  create_event: [
    { name: 'title', type: 'string', required: true, description: 'Event title' },
    { name: 'start_time', type: 'string', required: true, description: 'Start time (ISO format)' },
    { name: 'end_time', type: 'string', required: true, description: 'End time (ISO format)' },
    { name: 'description', type: 'string', required: false, description: 'Event description' },
    { name: 'location', type: 'string', required: false, description: 'Event location' },
    { name: 'participants', type: 'string[]', required: false, description: 'Participant emails' },
  ],
  list_contacts: [
    { name: 'limit', type: 'number', required: false, description: 'Max contacts to return' },
  ],
  draft_reply: [
    { name: 'email_id', type: 'string', required: true, description: 'ID of email to reply to' },
    { name: 'instructions', type: 'string', required: false, description: 'Instructions for the AI' },
    { name: 'tone', type: 'string', required: false, description: 'Tone: professional, casual, formal' },
  ],
  summarize_thread: [
    { name: 'thread_id', type: 'string', required: true, description: 'Thread ID to summarize' },
  ],
  smart_compose: [
    { name: 'prompt', type: 'string', required: true, description: 'What to write about' },
    { name: 'tone', type: 'string', required: false, description: 'Tone: professional, casual, formal' },
    { name: 'length', type: 'string', required: false, description: 'Length: short, medium, long' },
  ],
};

export default function ToolsPage() {
  const { tenantId } = useTenantStore();
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  const { data: tools, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.getTools(),
  });

  const { data: authStatus } = useQuery({
    queryKey: ['authStatus', tenantId],
    queryFn: () => api.getAuthStatus(tenantId!),
    enabled: !!tenantId,
  });

  const callMutation = useMutation({
    mutationFn: ({ tool, params }: { tool: string; params: Record<string, unknown> }) =>
      api.callTool(tool, { ...params, tenant_id: tenantId }),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    },
  });

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setParams({});
    setResult(null);
  };

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecute = () => {
    if (!selectedTool) return;

    // Parse params
    const parsedParams: Record<string, unknown> = {};
    const toolParamDefs = toolParams[selectedTool.name] || [];

    for (const param of toolParamDefs) {
      const value = params[param.name];
      if (!value && param.required) {
        setResult({ error: `Missing required parameter: ${param.name}` });
        return;
      }
      if (value) {
        if (param.type === 'number') {
          parsedParams[param.name] = parseInt(value);
        } else if (param.type === 'boolean') {
          parsedParams[param.name] = value === 'true';
        } else if (param.type === 'string[]') {
          parsedParams[param.name] = value.split(',').map(s => s.trim());
        } else {
          parsedParams[param.name] = value;
        }
      }
    }

    callMutation.mutate({ tool: selectedTool.name, params: parsedParams });
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Group tools by category
  const toolsByCategory = (tools?.tools || []).reduce((acc: Record<string, Tool[]>, tool: Tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    email: '📧 Email',
    calendar: '📅 Calendar',
    contacts: '👥 Contacts',
    ai: '🤖 AI Tools',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tool Browser</h1>
        <p className="text-gray-500 mt-1">
          Explore and test available MCP tools with your connected integrations
        </p>
      </div>

      {/* Connection Warning */}
      {!authStatus?.connected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">No Integration Connected</p>
            <p className="text-sm text-yellow-700">
              Connect an integration first to test tools with real data.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Available Tools</h2>
            <p className="text-sm text-gray-500">{tools?.tools?.length || 0} tools</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                <div key={category}>
                  <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                    {categoryLabels[category] || category}
                  </div>
                  {categoryTools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => handleToolSelect(tool)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedTool?.name === tool.name ? 'bg-brand-50' : ''
                      }`}
                    >
                      <p className="font-mono text-sm text-gray-900">{tool.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tool Details & Execution */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTool ? (
            <>
              {/* Tool Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 font-mono">
                      {selectedTool.name}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedTool.description}</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                    {selectedTool.category}
                  </span>
                </div>

                {/* Parameters */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Parameters</h3>
                  {(toolParams[selectedTool.name] || []).length > 0 ? (
                    <div className="space-y-3">
                      {(toolParams[selectedTool.name] || []).map((param) => (
                        <div key={param.name}>
                          <label className="block text-sm text-gray-700 mb-1">
                            <span className="font-mono">{param.name}</span>
                            {param.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            <span className="text-gray-400 ml-2 text-xs">
                              ({param.type})
                            </span>
                          </label>
                          <input
                            type="text"
                            value={params[param.name] || ''}
                            onChange={(e) => handleParamChange(param.name, e.target.value)}
                            placeholder={param.description}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No parameters required</p>
                  )}
                </div>

                {/* Execute Button */}
                <button
                  onClick={handleExecute}
                  disabled={!authStatus?.connected || callMutation.isPending}
                  className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {callMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Execute Tool
                    </>
                  )}
                </button>
              </div>

              {/* Result */}
              {result && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Result
                    </h3>
                    <button
                      onClick={handleCopyResult}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-gray-900 text-green-400 text-sm overflow-x-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Code className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a Tool
              </h3>
              <p className="text-gray-500">
                Choose a tool from the list to view its parameters and test it
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
