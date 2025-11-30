'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore, useApiKeyStore } from '@/lib/store';
import {
  Copy,
  Check,
  Key,
  Link2,
  Terminal,
  Code,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export default function McpConfigPage() {
  const { tenantId } = useTenantStore();
  const { selectedApiKey } = useApiKeyStore();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: authStatus } = useQuery({
    queryKey: ['authStatus', tenantId],
    queryFn: () => api.getAuthStatus(tenantId!),
    enabled: !!tenantId,
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['apiKeys', tenantId],
    queryFn: () => api.listApiKeys(tenantId!),
    enabled: !!tenantId,
  });

  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
  const apiKey = selectedApiKey || apiKeys?.keys?.[0]?.key || 'YOUR_API_KEY';

  const mcpUrl = `${serverUrl}`;
  const mcpUrlWithAuth = `${serverUrl}?api_key=${apiKey}`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const claudeDesktopConfig = {
    mcpServers: {
      botmakers: {
        command: 'npx',
        args: ['-y', '@anthropic-ai/claude-code-mcp'],
        env: {
          MCP_SERVER_URL: serverUrl,
          API_KEY: apiKey,
          TENANT_ID: tenantId || 'YOUR_TENANT_ID',
        },
      },
    },
  };

  const curlExample = `curl -X POST ${serverUrl}/call \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "tool": "list_emails",
    "params": {
      "tenant_id": "${tenantId || 'YOUR_TENANT_ID'}",
      "limit": 5
    }
  }'`;

  const pythonExample = `import requests

response = requests.post(
    "${serverUrl}/call",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "${apiKey}"
    },
    json={
        "tool": "list_emails",
        "params": {
            "tenant_id": "${tenantId || 'YOUR_TENANT_ID'}",
            "limit": 5
        }
    }
)
print(response.json())`;

  const jsExample = `const response = await fetch("${serverUrl}/call", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
  },
  body: JSON.stringify({
    tool: "list_emails",
    params: {
      tenant_id: "${tenantId || 'YOUR_TENANT_ID'}",
      limit: 5
    }
  })
});
const data = await response.json();
console.log(data);`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MCP Configuration</h1>
        <p className="text-gray-500 mt-1">
          Connect your AI applications to the MCP server
        </p>
      </div>

      {/* Status Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup Checklist</h2>
        <div className="space-y-3">
          <ChecklistItem
            done={!!tenantId}
            label="Tenant ID configured"
            value={tenantId || 'Not set'}
          />
          <ChecklistItem
            done={!!authStatus?.connected}
            label="Integration connected"
            value={authStatus?.connected ? authStatus.email : 'No connection'}
          />
          <ChecklistItem
            done={!!(apiKeys?.keys?.length > 0)}
            label="API key created"
            value={apiKeys?.keys?.length ? `${apiKeys.keys.length} key(s)` : 'No keys'}
          />
        </div>
      </div>

      {/* MCP Server URL */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Link2 className="w-5 h-5 inline-block mr-2 text-brand-600" />
          MCP Server URL
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Server URL</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-900 text-green-400 rounded-lg font-mono text-sm">
                {mcpUrl}
              </code>
              <button
                onClick={() => handleCopy(mcpUrl, 'url')}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied === 'url' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Tenant ID</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-900 text-green-400 rounded-lg font-mono text-sm">
                {tenantId || 'YOUR_TENANT_ID'}
              </code>
              <button
                onClick={() => handleCopy(tenantId || '', 'tenant')}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied === 'tenant' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">API Key</label>
            <div className="flex gap-2">
              <code className="flex-1 px-4 py-3 bg-gray-900 text-green-400 rounded-lg font-mono text-sm truncate">
                {apiKey}
              </code>
              <button
                onClick={() => handleCopy(apiKey, 'apikey')}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied === 'apikey' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Claude Desktop Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Terminal className="w-5 h-5 inline-block mr-2 text-brand-600" />
          Claude Desktop Configuration
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Add this to your Claude Desktop config file (~/.claude/claude_desktop_config.json):
        </p>
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto">
            {JSON.stringify(claudeDesktopConfig, null, 2)}
          </pre>
          <button
            onClick={() => handleCopy(JSON.stringify(claudeDesktopConfig, null, 2), 'claude')}
            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            {copied === 'claude' ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Code className="w-5 h-5 inline-block mr-2 text-brand-600" />
          Code Examples
        </h2>

        <div className="space-y-6">
          {/* cURL */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">cURL</h3>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto">
                {curlExample}
              </pre>
              <button
                onClick={() => handleCopy(curlExample, 'curl')}
                className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                {copied === 'curl' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* JavaScript */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">JavaScript / TypeScript</h3>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto">
                {jsExample}
              </pre>
              <button
                onClick={() => handleCopy(jsExample, 'js')}
                className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                {copied === 'js' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Python */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Python</h3>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto">
                {pythonExample}
              </pre>
              <button
                onClick={() => handleCopy(pythonExample, 'python')}
                className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                {copied === 'python' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints Reference */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Endpoint</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4"><code className="text-green-600">GET</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/health</td>
                <td className="py-3 px-4 text-gray-500">Health check</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code className="text-green-600">GET</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/tools</td>
                <td className="py-3 px-4 text-gray-500">List available tools</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code className="text-blue-600">POST</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/call</td>
                <td className="py-3 px-4 text-gray-500">Execute a tool</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code className="text-green-600">GET</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/auth/status/:tenantId</td>
                <td className="py-3 px-4 text-gray-500">Check auth status</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code className="text-green-600">GET</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/emails/:tenantId</td>
                <td className="py-3 px-4 text-gray-500">List emails</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code className="text-green-600">GET</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/events/:tenantId</td>
                <td className="py-3 px-4 text-gray-500">List calendar events</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code className="text-green-600">GET</code></td>
                <td className="py-3 px-4 font-mono text-gray-600">/contacts/:tenantId</td>
                <td className="py-3 px-4 text-gray-500">List contacts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  value,
}: {
  done: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <AlertCircle className="w-5 h-5 text-yellow-500" />
      )}
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-400">{value}</p>
      </div>
    </div>
  );
}
