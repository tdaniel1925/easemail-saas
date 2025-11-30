'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { integrations, categories, type Integration } from '@/lib/integrations';
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  Lock,
  ExternalLink,
  Star,
} from 'lucide-react';
import Link from 'next/link';

export default function IntegrationsPage() {
  const { tenantId } = useTenantStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  const { data: authStatus } = useQuery({
    queryKey: ['authStatus', tenantId],
    queryFn: () => api.getAuthStatus(tenantId!),
    enabled: !!tenantId,
  });

  // Filter integrations
  const filteredIntegrations = integrations.filter((integration) => {
    if (search && !integration.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategory && integration.category !== selectedCategory) {
      return false;
    }
    if (showAvailableOnly && integration.status !== 'available') {
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

  const isConnected = (integrationId: string) => {
    if (integrationId === 'nylas' && authStatus?.connected) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">
          Connect your favorite apps and services to enable AI-powered automation
        </p>
      </div>

      {/* Search and Filters */}
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
        <div className="flex gap-2">
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
          <button
            onClick={() => setShowAvailableOnly(!showAvailableOnly)}
            className={`px-4 py-2.5 border rounded-lg flex items-center gap-2 transition-colors ${
              showAvailableOnly
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Available Only
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm text-gray-500">
        <span>{integrations.filter(i => i.status === 'available').length} available</span>
        <span>{integrations.filter(i => i.status === 'coming_soon').length} coming soon</span>
        <span>{integrations.filter(i => isConnected(i.id)).length} connected</span>
      </div>

      {/* Integration Grid by Category */}
      <div className="space-y-8">
        {Object.entries(groupedIntegrations).map(([categoryId, categoryIntegrations]) => {
          const category = categories.find((c) => c.id === categoryId);
          return (
            <div key={categoryId}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {category?.icon && <span className="text-xl">{category.icon}</span>}
                {category?.name || categoryId}
                <span className="text-sm font-normal text-gray-400">
                  ({categoryIntegrations.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    isConnected={isConnected(integration.id)}
                    tenantId={tenantId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No integrations found matching your criteria</p>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  integration,
  isConnected,
  tenantId,
}: {
  integration: Integration;
  isConnected: boolean;
  tenantId: string | null;
}) {
  const getStatusBadge = () => {
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle className="w-3 h-3" />
          Connected
        </span>
      );
    }
    if (integration.status === 'coming_soon') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          <Clock className="w-3 h-3" />
          Coming Soon
        </span>
      );
    }
    return null;
  };

  const handleConnect = () => {
    if (!tenantId) return;
    if (integration.status !== 'available') return;

    // Redirect to OAuth flow
    const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
    window.location.href = `${serverUrl}/integrations/${integration.id}/connect/${tenantId}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
            {integration.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{integration.name}</h3>
              {integration.premium && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">{integration.provider}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{integration.description}</p>

      {/* Tools Preview */}
      {integration.tools && integration.tools.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Available Tools:</p>
          <div className="flex flex-wrap gap-1">
            {integration.tools.slice(0, 4).map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded"
              >
                {tool}
              </span>
            ))}
            {integration.tools.length > 4 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{integration.tools.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-2">
        {isConnected ? (
          <Link
            href={`/dashboard/connections/${integration.id}`}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-center text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Manage
          </Link>
        ) : integration.status === 'available' ? (
          <button
            onClick={handleConnect}
            disabled={!tenantId}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
        ) : (
          <button
            disabled
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Coming Soon
          </button>
        )}
        {integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
