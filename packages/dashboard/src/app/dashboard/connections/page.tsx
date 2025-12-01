'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Search,
  Key,
  Zap,
  Eye,
  EyeOff,
  Plus,
  X,
  LayoutGrid,
  List,
  Brain,
  MessageSquare,
  Mail,
  Users,
  CreditCard,
  FolderOpen,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Brain,
  MessageSquare,
  Mail,
  Users,
  CreditCard,
  FolderOpen,
  BarChart3,
  Settings,
};

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Settings;
  return <Icon className={className} />;
}

interface Integration {
  id: string;
  displayName: string;
  description: string;
  category: string;
  iconUrl?: string;
  docsUrl?: string;
  mode: 'INCLUDED' | 'BYOK';
  authType: string;
  isConnected: boolean;
  connection: {
    id: string;
    name: string;
    accountEmail?: string;
    accountName?: string;
    status: string;
    lastUsedAt?: string;
    createdAt: string;
  } | null;
  credentialFields?: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  setupInstructions?: string;
}

export default function ConnectionsPage() {
  const { tenantId } = useTenantStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [connectingIntegration, setConnectingIntegration] = useState<Integration | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['connections', tenantId],
    queryFn: () => api.getConnections(tenantId!),
    enabled: !!tenantId,
  });

  const createConnectionMutation = useMutation({
    mutationFn: ({
      integrationId,
      data,
    }: {
      integrationId: string;
      data: { name?: string; credentials?: Record<string, string> };
    }) => api.createConnection(tenantId!, integrationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', tenantId] });
      setConnectingIntegration(null);
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: ({ integrationId, connectionId }: { integrationId: string; connectionId: string }) =>
      api.deleteConnection(tenantId!, integrationId, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', tenantId] });
    },
  });

  if (!tenantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        Please set a tenant ID in settings to view your connections.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load connections: {error.message}
      </div>
    );
  }

  const integrations = data?.integrations || [];
  const categories = data?.categories || [];
  const stats = data?.stats || { total: 0, connected: 0, included: 0, byok: 0 };

  // Filter integrations
  const filteredIntegrations = integrations.filter((integration) => {
    if (search && !integration.displayName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategory && integration.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Group by category
  const groupedIntegrations = filteredIntegrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  // Separate connected and available
  const connectedIntegrations = filteredIntegrations.filter((i) => i.isConnected);
  const availableIntegrations = filteredIntegrations.filter((i) => !i.isConnected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Connections</h1>
        <p className="text-gray-500 mt-1">
          Connect your apps and services to enable AI-powered automation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Available" value={stats.total} color="text-gray-600" />
        <StatCard label="Connected" value={stats.connected} color="text-green-600" />
        <StatCard label="Included (Free)" value={stats.included} color="text-blue-600" />
        <StatCard label="Your Keys" value={stats.byok} color="text-purple-600" />
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Connected Integrations */}
      {connectedIntegrations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Connected ({connectedIntegrations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map((integration) => (
              <ConnectedCard
                key={integration.id}
                integration={integration}
                onDisconnect={() =>
                  deleteConnectionMutation.mutate({
                    integrationId: integration.id,
                    connectionId: integration.connection!.id,
                  })
                }
                isDisconnecting={deleteConnectionMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations by Category */}
      {availableIntegrations.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-gray-400" />
            Available Integrations ({availableIntegrations.length})
          </h2>

          {Object.entries(groupedIntegrations)
            .filter(([_, ints]) => ints.some((i) => !i.isConnected))
            .map(([categoryId, categoryIntegrations]) => {
              const category = categories.find((c) => c.id === categoryId);
              const availableInCategory = categoryIntegrations.filter((i) => !i.isConnected);
              if (availableInCategory.length === 0) return null;

              return (
                <div key={categoryId}>
                  <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <CategoryIcon name={category?.icon || ''} className="w-4 h-4 text-gray-500" />
                    {category?.name || categoryId}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableInCategory.map((integration) => (
                      <AvailableCard
                        key={integration.id}
                        integration={integration}
                        onConnect={() => setConnectingIntegration(integration)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No integrations found matching your criteria</p>
        </div>
      )}

      {/* Connection Modal */}
      {connectingIntegration && (
        <ConnectionModal
          integration={connectingIntegration}
          onClose={() => setConnectingIntegration(null)}
          onConnect={(credentials) =>
            createConnectionMutation.mutate({
              integrationId: connectingIntegration.id,
              data: { credentials },
            })
          }
          isConnecting={createConnectionMutation.isPending}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
    </div>
  );
}

function ConnectedCard({
  integration,
  onDisconnect,
  isDisconnecting,
}: {
  integration: Integration;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
            {integration.iconUrl ? (
              <img src={integration.iconUrl} alt="" className="w-8 h-8" />
            ) : (
              integration.displayName.charAt(0)
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{integration.displayName}</h3>
            <p className="text-sm text-gray-500">{integration.connection?.accountEmail || 'Connected'}</p>
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            integration.mode === 'INCLUDED'
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          )}
        >
          {integration.mode === 'INCLUDED' ? 'Free' : 'Your Key'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
        <CheckCircle className="w-4 h-4" />
        Connected
        {integration.connection?.createdAt && (
          <span className="text-gray-400">
            - {new Date(integration.connection.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Disconnect
        </button>
        {integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function AvailableCard({
  integration,
  onConnect,
}: {
  integration: Integration;
  onConnect: () => void;
}) {
  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

  const handleConnect = () => {
    if (integration.mode === 'INCLUDED') {
      // Included integrations work automatically - no connection needed
      return;
    }

    if (integration.authType === 'oauth2') {
      // OAuth - redirect to auth flow
      const tenantId = useTenantStore.getState().tenantId;
      window.location.href = `${serverUrl}/integrations/${integration.id}/connect/${tenantId}`;
    } else {
      // API key - show modal
      onConnect();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
            {integration.iconUrl ? (
              <img src={integration.iconUrl} alt="" className="w-8 h-8" />
            ) : (
              integration.displayName.charAt(0)
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{integration.displayName}</h3>
            <p className="text-xs text-gray-500 capitalize">{integration.category}</p>
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1',
            integration.mode === 'INCLUDED'
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          )}
        >
          {integration.mode === 'INCLUDED' ? (
            <>
              <Zap className="w-3 h-3" />
              Included
            </>
          ) : (
            <>
              <Key className="w-3 h-3" />
              BYOK
            </>
          )}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{integration.description}</p>

      {integration.mode === 'INCLUDED' ? (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
          <CheckCircle className="w-4 h-4" />
          <span>Ready to use - included in your plan</span>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

function ConnectionModal({
  integration,
  onClose,
  onConnect,
  isConnecting,
}: {
  integration: Integration;
  onClose: () => void;
  onConnect: (credentials: Record<string, string>) => void;
  isConnecting: boolean;
}) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(credentials);
  };

  const isValid = integration.credentialFields?.every(
    (field) => !field.required || credentials[field.key]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
              {integration.displayName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connect {integration.displayName}</h2>
              <p className="text-sm text-gray-500">Enter your API credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {integration.setupInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              {integration.setupInstructions}
            </div>
          )}

          {integration.credentialFields?.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showCredentials[field.key] ? 'text' : field.type === 'password' ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ''}
                  onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                  required={field.required}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowCredentials({ ...showCredentials, [field.key]: !showCredentials[field.key] })
                    }
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCredentials[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
            >
              <ExternalLink className="w-4 h-4" />
              View setup documentation
            </a>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isConnecting}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
