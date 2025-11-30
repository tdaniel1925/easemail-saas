'use client';

import { useState } from 'react';
import { useTenantStore } from '@/lib/store';
import {
  User,
  Building,
  Bell,
  Shield,
  Key,
  Trash2,
  Save,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { tenantId, setTenantId } = useTenantStore();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    email: '',
    notifications: {
      usageAlerts: true,
      securityAlerts: true,
      productUpdates: false,
    },
  });

  const handleSave = () => {
    // Save settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tenant Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Tenant Configuration</h2>
            <p className="text-sm text-gray-500">Your unique tenant identifier</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tenant ID
            </label>
            <input
              type="text"
              value={tenantId || ''}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Enter your tenant ID"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-2">
              This ID is used to identify your account across all integrations
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) =>
                setSettings({ ...settings, companyName: e.target.value })
              }
              placeholder="Your company name"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              placeholder="admin@company.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">Manage email notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Usage Alerts</p>
              <p className="text-sm text-gray-500">
                Get notified when approaching usage limits
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.usageAlerts}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    usageAlerts: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Security Alerts</p>
              <p className="text-sm text-gray-500">
                Get notified of unusual activity or security events
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.securityAlerts}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    securityAlerts: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Product Updates</p>
              <p className="text-sm text-gray-500">
                Get notified about new features and integrations
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.productUpdates}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    productUpdates: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
            />
          </label>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500">Manage security settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">API Keys</p>
                <p className="text-sm text-gray-500">Manage your API keys</p>
              </div>
            </div>
            <a
              href="/dashboard/api-keys"
              className="px-4 py-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Manage →
            </a>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Add an extra layer of security</p>
              </div>
            </div>
            <button className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-red-900">Danger Zone</h2>
            <p className="text-sm text-red-600">Irreversible actions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Delete All Connections</p>
              <p className="text-sm text-gray-500">
                Remove all connected integrations
              </p>
            </div>
            <button className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              Delete All
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          {saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
