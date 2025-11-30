'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { integrations } from '@/lib/integrations';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Settings,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function ConnectionsPage() {
  const { tenantId } = useTenantStore();
  const queryClient = useQueryClient();

  const { data: authStatus, isLoading } = useQuery({
    queryKey: ['authStatus', tenantId],
    queryFn: () => api.getAuthStatus(tenantId!),
    enabled: !!tenantId,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.disconnect(tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authStatus', tenantId] });
    },
  });

  // Get connected integrations
  const connectedIntegrations = [];
  if (authStatus?.connected) {
    const nylasIntegration = integrations.find((i) => i.id === 'nylas');
    if (nylasIntegration) {
      connectedIntegrations.push({
        ...nylasIntegration,
        email: authStatus.email,
        provider: authStatus.provider,
        connectedAt: new Date().toISOString(),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-gray-500 mt-1">
            Manage your connected apps and services
          </p>
        </div>
        <Link
          href="/dashboard/integrations"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Add Connection
        </Link>
      </div>

      {/* Connection List */}
      {connectedIntegrations.length > 0 ? (
        <div className="space-y-4">
          {connectedIntegrations.map((connection) => (
            <div
              key={connection.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">
                    {connection.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {connection.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{connection.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Provider: {connection.provider}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const serverUrl =
                        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
                      window.location.href = `${serverUrl}/integrations/${connection.id}/connect/${tenantId}`;
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Reconnect"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Disconnect"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Available Tools */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Available Tools ({connection.tools?.length || 0})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {connection.tools?.map((tool) => (
                    <div
                      key={tool}
                      className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-600"
                    >
                      {tool}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex gap-3">
                <Link
                  href="/dashboard/tools"
                  className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  Test Tools <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href="/dashboard/mcp-config"
                  className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  Get MCP URL <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Connections Yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Connect your first app to start using AI-powered automation tools.
            We support 25+ integrations including email, calendar, CRM, and more.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            Browse Integrations
          </Link>
        </div>
      )}

      {/* Pending/Failed Connections Warning */}
      {!authStatus?.connected && tenantId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Connection Required</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Connect at least one integration to start using the MCP tools.
              Your AI agents need access to your apps to function properly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
