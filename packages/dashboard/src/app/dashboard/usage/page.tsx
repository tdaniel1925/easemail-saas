'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';

export default function UsagePage() {
  const { tenantId } = useTenantStore();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', tenantId],
    queryFn: () => api.getUsage(tenantId!),
    enabled: !!tenantId,
  });

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ['billing', tenantId],
    queryFn: () => api.getBilling(tenantId!),
    enabled: !!tenantId,
  });

  const isLoading = usageLoading || billingLoading;

  const usagePercent = billing ? (billing.usage / billing.limit) * 100 : 0;
  const isNearLimit = usagePercent >= 80;
  const isOverLimit = usagePercent >= 100;

  // Mock historical data for chart
  const chartData = [
    { month: 'Jun', calls: 245 },
    { month: 'Jul', calls: 389 },
    { month: 'Aug', calls: 567 },
    { month: 'Sep', calls: 421 },
    { month: 'Oct', calls: 634 },
    { month: 'Nov', calls: billing?.usage || 0 },
  ];
  const maxCalls = Math.max(...chartData.map(d => d.calls), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage & Billing</h1>
        <p className="text-gray-500 mt-1">
          Monitor your API usage and manage your subscription
        </p>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-xs text-gray-400">{billing?.period || 'This month'}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(billing?.usage || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">API Calls</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <span className={`text-xs font-medium ${isNearLimit ? 'text-yellow-600' : 'text-gray-400'}`}>
              {usagePercent.toFixed(1)}% used
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(billing?.limit || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Monthly Limit</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 capitalize">
            {billing?.plan || 'Free'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Current Plan</p>
        </div>
      </div>

      {/* Usage Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Usage This Period</h2>
          <span className="text-sm text-gray-500">
            {formatNumber(billing?.usage || 0)} / {formatNumber(billing?.limit || 0)} calls
          </span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-brand-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        {isNearLimit && !isOverLimit && (
          <div className="mt-3 flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">You're approaching your usage limit</span>
          </div>
        )}
        {isOverLimit && (
          <div className="mt-3 flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">You've exceeded your usage limit. Upgrade to continue.</span>
          </div>
        )}
      </div>

      {/* Usage Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Usage History</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4" />
            Last 6 months
          </div>
        </div>
        <div className="flex items-end gap-4 h-40">
          {chartData.map((data, i) => (
            <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-lg transition-all ${
                  i === chartData.length - 1 ? 'bg-brand-500' : 'bg-gray-200'
                }`}
                style={{ height: `${(data.calls / maxCalls) * 100}%`, minHeight: '4px' }}
              />
              <span className="text-xs text-gray-500">{data.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage by Tool */}
      {usage?.byTool && Object.keys(usage.byTool).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Usage by Tool</h2>
          <div className="space-y-3">
            {Object.entries(usage.byTool)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([tool, count]) => (
                <div key={tool} className="flex items-center gap-4">
                  <div className="w-32 font-mono text-sm text-gray-600 truncate">
                    {tool}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full"
                        style={{
                          width: `${((count as number) / (usage.totalCalls || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-gray-500">
                    {formatNumber(count as number)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Upgrade Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard
            name="Free"
            price="$0"
            features={['1,000 API calls/month', '1 integration', 'Community support']}
            current={billing?.plan === 'free'}
          />
          <PlanCard
            name="Pro"
            price="$99"
            features={['50,000 API calls/month', 'Unlimited integrations', 'Email support', 'AI tools included']}
            current={billing?.plan === 'pro'}
            highlighted
          />
          <PlanCard
            name="Enterprise"
            price="$299"
            features={['500,000 API calls/month', 'All integrations', 'Priority support', 'Custom tools', 'SLA guarantee']}
            current={billing?.plan === 'enterprise'}
          />
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  current,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  current?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        highlighted
          ? 'border-brand-500 bg-brand-50'
          : current
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        {current && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            Current
          </span>
        )}
        {highlighted && !current && (
          <span className="px-2 py-1 bg-brand-100 text-brand-700 text-xs font-medium rounded">
            Popular
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-4">
        {price}
        <span className="text-sm font-normal text-gray-500">/mo</span>
      </p>
      <ul className="space-y-2 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-green-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      {current ? (
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : (
        <button
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            highlighted
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {name === 'Enterprise' ? 'Contact Sales' : 'Upgrade'}
        </button>
      )}
    </div>
  );
}
