'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { integrations, getAvailableIntegrations } from '@/lib/integrations';
import { formatNumber } from '@/lib/utils';
import {
  Puzzle,
  Link2,
  Key,
  BarChart3,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { tenantId } = useTenantStore();

  const { data: authStatus } = useQuery({
    queryKey: ['authStatus', tenantId],
    queryFn: () => api.getAuthStatus(tenantId!),
    enabled: !!tenantId,
  });

  const { data: billing } = useQuery({
    queryKey: ['billing', tenantId],
    queryFn: () => api.getBilling(tenantId!),
    enabled: !!tenantId,
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['apiKeys', tenantId],
    queryFn: () => api.listApiKeys(tenantId!),
    enabled: !!tenantId,
  });

  const availableIntegrations = getAvailableIntegrations();
  const connectedCount = authStatus?.connected ? 1 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Manage your integrations and connect AI agents to your business tools
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Puzzle}
          label="Available Integrations"
          value={integrations.length.toString()}
          subtext={`${availableIntegrations.length} ready to use`}
          color="brand"
        />
        <StatCard
          icon={Link2}
          label="Connected Apps"
          value={connectedCount.toString()}
          subtext={connectedCount > 0 ? 'Active connections' : 'No connections yet'}
          color="green"
        />
        <StatCard
          icon={Key}
          label="API Keys"
          value={(apiKeys?.keys?.length || 0).toString()}
          subtext="Active keys"
          color="purple"
        />
        <StatCard
          icon={BarChart3}
          label="API Calls"
          value={formatNumber(billing?.usage || 0)}
          subtext={`of ${formatNumber(billing?.limit || 1000)} limit`}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h2>

          {authStatus?.connected ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Email Connected</p>
                <p className="text-sm text-green-700">{authStatus.email}</p>
                <p className="text-xs text-green-600 mt-1">Provider: {authStatus.provider}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">No Connections</p>
                <p className="text-sm text-yellow-700">Connect your first app to get started</p>
                <Link
                  href="/dashboard/integrations"
                  className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-2"
                >
                  Browse Integrations <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Start */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h2>
          <div className="space-y-3">
            <QuickAction
              href="/dashboard/integrations"
              icon={Puzzle}
              title="Connect an Integration"
              description="Browse and connect to 25+ business tools"
            />
            <QuickAction
              href="/dashboard/api-keys"
              icon={Key}
              title="Create API Key"
              description="Generate keys for your applications"
            />
            <QuickAction
              href="/dashboard/mcp-config"
              icon={Link2}
              title="Get MCP URL"
              description="Connect Claude Desktop or custom apps"
            />
          </div>
        </div>
      </div>

      {/* Recent Activity / Tools Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Tools</h2>
          <Link
            href="/dashboard/tools"
            className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['list_emails', 'send_email', 'list_events', 'create_event', 'list_contacts', 'draft_reply', 'summarize_thread', 'smart_compose'].map((tool) => (
            <div key={tool} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-mono text-gray-700">{tool}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subtext: string;
  color: 'brand' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    brand: 'bg-brand-100 text-brand-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">{subtext}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
        <Icon className="w-5 h-5 text-gray-600 group-hover:text-brand-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
    </Link>
  );
}
