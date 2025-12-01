'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart3, DollarSign, Zap, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUsagePage() {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsageSummary', period],
    queryFn: () => api.getAdminUsageSummary(period),
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
        Failed to load usage data: {error.message}
      </div>
    );
  }

  const summary = data?.summary || [];
  const totals = data?.totals || { totalCost: 0, totalRevenue: 0, totalCalls: 0 };
  const profit = totals.totalRevenue - totals.totalCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Usage</h1>
          <p className="text-gray-500 mt-1">
            Track usage and revenue for included (platform-paid) integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Calls"
          value={totals.totalCalls.toLocaleString()}
          icon={Zap}
          color="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          label="Provider Cost"
          value={`$${totals.totalCost.toFixed(2)}`}
          icon={DollarSign}
          color="bg-red-100 text-red-600"
        />
        <SummaryCard
          label="Customer Revenue"
          value={`$${totals.totalRevenue.toFixed(2)}`}
          icon={TrendingUp}
          color="bg-green-100 text-green-600"
        />
        <SummaryCard
          label="Net Profit"
          value={`$${profit.toFixed(2)}`}
          icon={BarChart3}
          color={profit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}
        />
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Usage by Integration</h2>
        </div>

        {summary.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No usage data for this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integration
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Calls
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Markup
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summary.map((row) => {
                  const rowProfit = row.revenue - row.totalCost;
                  return (
                    <tr key={row.integrationId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                            {row.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{row.displayName}</div>
                            <div className="text-sm text-gray-500">{row.integrationId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {row.callCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {row.totalUnits.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        ${row.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                        {row.markupPercent}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        ${row.revenue.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 whitespace-nowrap text-right font-medium',
                          rowProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        ${rowProfit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="px-6 py-4 text-gray-900">Total</td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {totals.totalCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">-</td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    ${totals.totalCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">-</td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    ${totals.totalRevenue.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      'px-6 py-4 text-right font-bold',
                      profit >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    ${profit.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How Platform Usage Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            When integrations are set to <strong>Included</strong>, you pay the provider costs.
          </li>
          <li>The markup percentage you set determines how much you charge customers.</li>
          <li>
            Revenue = Provider Cost × (1 + Markup %) — this is what you bill customers.
          </li>
          <li>Profit = Revenue - Provider Cost — your earnings after costs.</li>
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
