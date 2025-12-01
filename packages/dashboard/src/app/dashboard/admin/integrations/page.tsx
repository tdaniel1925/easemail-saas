'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Search,
  Settings,
  CheckCircle,
  XCircle,
  Key,
  Users,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertCircle,
  Zap,
  LayoutGrid,
  List,
  Brain,
  MessageSquare,
  Mail,
  CreditCard,
  FolderOpen,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

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
import { cn } from '@/lib/utils';

type IntegrationMode = 'INCLUDED' | 'BYOK' | 'DISABLED';

interface Integration {
  id: string;
  displayName: string;
  description: string;
  category: string;
  authType: string;
  iconUrl?: string;
  docsUrl?: string;
  credentialFields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  mode: IntegrationMode;
  hasCredentials: boolean;
  maskedCredentials: Record<string, string> | null;
  markupPercent: number;
  basePricePerUnit?: number;
  isActive: boolean;
  updatedAt?: string;
}

const modeLabels: Record<IntegrationMode, { label: string; description: string; color: string; icon: any }> = {
  INCLUDED: {
    label: 'Included',
    description: 'You provide the API key, customers use it automatically',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Zap,
  },
  BYOK: {
    label: 'BYOK',
    description: 'Customers bring their own API key',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Key,
  },
  DISABLED: {
    label: 'Disabled',
    description: 'Not available to customers',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: XCircle,
  },
};

export default function AdminIntegrationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminIntegrations'],
    queryFn: () => api.getAdminIntegrations(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateAdminIntegration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminIntegrations'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load integrations: {error.message}
      </div>
    );
  }

  const integrations = data?.integrations || [];
  const categories = data?.categories || [];

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

  // Stats
  const stats = {
    total: integrations.length,
    included: integrations.filter(i => i.mode === 'INCLUDED').length,
    byok: integrations.filter(i => i.mode === 'BYOK').length,
    disabled: integrations.filter(i => i.mode === 'DISABLED').length,
    configured: integrations.filter(i => i.hasCredentials || i.mode !== 'DISABLED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure which integrations are available to your customers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={Settings}
          color="bg-gray-100 text-gray-600"
        />
        <StatCard
          label="Included (You Pay)"
          value={stats.included}
          icon={Zap}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          label="BYOK (Customer Pays)"
          value={stats.byok}
          icon={Key}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Disabled"
          value={stats.disabled}
          icon={XCircle}
          color="bg-gray-100 text-gray-400"
        />
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
        {/* View Toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-2.5 flex items-center gap-2 transition-colors',
              viewMode === 'list'
                ? 'bg-brand-50 text-brand-600'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'px-3 py-2.5 flex items-center gap-2 transition-colors border-l border-gray-200',
              viewMode === 'grid'
                ? 'bg-brand-50 text-brand-600'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
            Included
          </span>
          <span className="text-sm text-gray-600">You pay, rebill customers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            BYOK
          </span>
          <span className="text-sm text-gray-600">Customer provides their own key</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            Disabled
          </span>
          <span className="text-sm text-gray-600">Not available</span>
        </div>
      </div>

      {/* Integration List by Category */}
      <div className="space-y-8">
        {Object.entries(groupedIntegrations).map(([categoryId, categoryIntegrations]) => {
          const category = categories.find((c) => c.id === categoryId);
          return (
            <div key={categoryId}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CategoryIcon name={category?.icon || ''} className="w-5 h-5 text-gray-600" />
                {category?.name || categoryId}
                <span className="text-sm font-normal text-gray-400">
                  ({categoryIntegrations.length})
                </span>
              </h2>
              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {categoryIntegrations.map((integration) => (
                    <IntegrationRow
                      key={integration.id}
                      integration={integration}
                      isExpanded={expandedIntegration === integration.id}
                      onToggle={() =>
                        setExpandedIntegration(
                          expandedIntegration === integration.id ? null : integration.id
                        )
                      }
                      onUpdate={(data) => updateMutation.mutate({ id: integration.id, data })}
                      isUpdating={updateMutation.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onToggle={() =>
                        setExpandedIntegration(
                          expandedIntegration === integration.id ? null : integration.id
                        )
                      }
                      onUpdate={(data) => updateMutation.mutate({ id: integration.id, data })}
                      isUpdating={updateMutation.isPending}
                    />
                  ))}
                </div>
              )}
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({
  integration,
  isExpanded,
  onToggle,
  onUpdate,
  isUpdating,
}: {
  integration: Integration;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: any) => void;
  isUpdating: boolean;
}) {
  const [mode, setMode] = useState<IntegrationMode>(integration.mode);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [markupPercent, setMarkupPercent] = useState(integration.markupPercent || 0);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    const data: any = { mode };

    if (mode === 'INCLUDED' && Object.keys(credentials).length > 0) {
      data.credentials = credentials;
    }

    if (mode === 'INCLUDED') {
      data.markupPercent = markupPercent;
    }

    onUpdate(data);
    setHasChanges(false);
    setCredentials({});
  };

  const modeInfo = modeLabels[mode];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Icon */}
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
          {integration.iconUrl ? (
            <img src={integration.iconUrl} alt="" className="w-8 h-8" />
          ) : (
            integration.displayName.charAt(0)
          )}
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{integration.displayName}</h3>
            {integration.hasCredentials && mode === 'INCLUDED' && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{integration.description}</p>
        </div>

        {/* Mode Badge */}
        <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', modeInfo.color)}>
          {modeInfo.label}
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Integration Mode
            </label>
            <div className="flex gap-2">
              {(['INCLUDED', 'BYOK', 'DISABLED'] as IntegrationMode[]).map((m) => {
                const info = modeLabels[m];
                const Icon = info.icon;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setHasChanges(true);
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
                      mode === m
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{info.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-gray-500">{modeLabels[mode].description}</p>
          </div>

          {/* Credentials Section (for INCLUDED mode) */}
          {mode === 'INCLUDED' && (
            <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Key className="w-4 h-4" />
                Platform Credentials
              </div>

              {integration.hasCredentials && integration.maskedCredentials && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Credentials configured
                  </div>
                  <div className="mt-2 space-y-1">
                    {Object.entries(integration.maskedCredentials).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {integration.credentialFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={
                          showCredentials[field.key] ? 'text' : field.type === 'password' ? 'password' : 'text'
                        }
                        placeholder={
                          integration.hasCredentials
                            ? 'Enter new value to update'
                            : field.placeholder || `Enter ${field.label}`
                        }
                        value={credentials[field.key] || ''}
                        onChange={(e) => {
                          setCredentials({ ...credentials, [field.key]: e.target.value });
                          setHasChanges(true);
                        }}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowCredentials({
                              ...showCredentials,
                              [field.key]: !showCredentials[field.key],
                            })
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCredentials[field.key] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Markup Settings */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Markup Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={markupPercent}
                    onChange={(e) => {
                      setMarkupPercent(Number(e.target.value));
                      setHasChanges(true);
                    }}
                    className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-gray-500">%</span>
                  <span className="text-sm text-gray-500 ml-4">
                    (Applied to usage costs when billing customers)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Docs Link */}
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
            >
              <ExternalLink className="w-4 h-4" />
              View Documentation
            </a>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {integration.updatedAt && (
                <>Last updated: {new Date(integration.updatedAt).toLocaleDateString()}</>
              )}
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  integration,
  onToggle,
  onUpdate,
  isUpdating,
}: {
  integration: Integration;
  onToggle: () => void;
  onUpdate: (data: any) => void;
  isUpdating: boolean;
}) {
  const modeInfo = modeLabels[integration.mode];
  const ModeIcon = modeInfo.icon;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onToggle}
    >
      {/* Header with icon and mode badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {integration.iconUrl ? (
            <img src={integration.iconUrl} alt="" className="w-8 h-8" />
          ) : (
            <span className="text-xl font-semibold text-gray-600">
              {integration.displayName.charAt(0)}
            </span>
          )}
        </div>
        <div className={cn('px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1', modeInfo.color)}>
          <ModeIcon className="w-3 h-3" />
          {modeInfo.label}
        </div>
      </div>

      {/* Name and description */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{integration.displayName}</h3>
          {integration.hasCredentials && integration.mode === 'INCLUDED' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{integration.description}</p>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <span className="capitalize">{integration.authType}</span>
        {integration.mode === 'INCLUDED' && integration.markupPercent > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {integration.markupPercent}% markup
          </span>
        )}
      </div>
    </div>
  );
}
