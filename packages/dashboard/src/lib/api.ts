const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string | null = null;
  private tenantId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setTenantId(id: string) {
    this.tenantId = id;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  // Health
  async health() {
    return this.request<{ status: string; tools: string[] }>('/health');
  }

  // Tools
  async listTools() {
    return this.request<{ tools: Array<{ name: string; category: string; description: string }> }>('/tools');
  }

  async callTool(tool: string, params: Record<string, unknown>) {
    return this.request('/call', {
      method: 'POST',
      body: JSON.stringify({ tool, params: { ...params, tenant_id: this.tenantId } }),
    });
  }

  // Integrations
  async listIntegrations() {
    return this.request<{ integrations: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      configured: boolean;
      authType: string;
    }> }>('/integrations');
  }

  async getIntegrationStatus(integrationId: string, tenantId: string) {
    return this.request<{ connected: boolean; accounts: any[] }>(
      `/integrations/${integrationId}/status/${tenantId}`
    );
  }

  getConnectUrl(integrationId: string, tenantId: string) {
    return `${this.baseUrl}/integrations/${integrationId}/connect/${tenantId}`;
  }

  // Auth (Nylas)
  async getAuthStatus(tenantId: string) {
    return this.request<{ connected: boolean; accounts: any[]; email?: string; provider?: string }>(
      `/auth/status/${tenantId}`
    );
  }

  getAuthConnectUrl(tenantId: string) {
    return `${this.baseUrl}/auth/connect/${tenantId}`;
  }

  async listAccounts(tenantId: string) {
    return this.request<{ success: boolean; accounts: any[] }>(`/auth/accounts/${tenantId}`);
  }

  async disconnectAccount(tenantId: string, accountId: string) {
    return this.request(`/auth/accounts/${tenantId}/${accountId}`, {
      method: 'DELETE',
    });
  }

  // API Keys
  async listApiKeys(tenantId: string) {
    return this.request<{ success: boolean; keys: any[] }>(`/api-keys/${tenantId}`);
  }

  async createApiKey(tenantId: string, data: { name: string; scopes?: string[]; expiresAt?: string }) {
    return this.request<{ success: boolean; key: string; keyInfo: any }>(`/api-keys/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeApiKey(tenantId: string, keyId: string) {
    return this.request(`/api-keys/${tenantId}/${keyId}/revoke`, {
      method: 'POST',
    });
  }

  async deleteApiKey(tenantId: string, keyId: string) {
    return this.request(`/api-keys/${tenantId}/${keyId}`, {
      method: 'DELETE',
    });
  }

  async getScopes(tenantId: string) {
    return this.request<{ success: boolean; scopes: string[]; descriptions: Record<string, string> }>(
      `/api-keys/${tenantId}/scopes`
    );
  }

  // Usage
  async getUsage(tenantId: string, period?: string) {
    const params = period ? { period } : undefined;
    return this.request<{
      success: boolean;
      period: string;
      totalCalls: number;
      byIntegration: Record<string, number>;
      byTool: Record<string, number>;
    }>(`/api-keys/${tenantId}/usage`, { params });
  }

  async getUsageHistory(tenantId: string, months?: number) {
    const params = months ? { months: months.toString() } : undefined;
    return this.request<{ success: boolean; history: any[] }>(`/api-keys/${tenantId}/usage/history`, { params });
  }

  async getBilling(tenantId: string) {
    return this.request<{
      success: boolean;
      plan: string;
      period: string;
      usage: number;
      limit: number;
      percentUsed: number;
      isOverLimit: boolean;
    }>(`/api-keys/${tenantId}/billing`);
  }

  // Admin - Integration Configuration
  async getAdminIntegrations() {
    return this.request<{
      success: boolean;
      integrations: Array<{
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
        mode: 'INCLUDED' | 'BYOK' | 'DISABLED';
        hasCredentials: boolean;
        maskedCredentials: Record<string, string> | null;
        markupPercent: number;
        basePricePerUnit?: number;
        isActive: boolean;
        updatedAt?: string;
      }>;
      byCategory: Record<string, any[]>;
      categories: Array<{ id: string; name: string; icon: string }>;
    }>('/admin/integrations');
  }

  async getAdminIntegration(integrationId: string) {
    return this.request<{
      success: boolean;
      integration: any;
    }>(`/admin/integrations/${integrationId}`);
  }

  async updateAdminIntegration(
    integrationId: string,
    data: {
      mode?: 'INCLUDED' | 'BYOK' | 'DISABLED';
      credentials?: Record<string, string>;
      markupPercent?: number;
      basePricePerUnit?: number;
      setupInstructions?: string;
      isActive?: boolean;
    }
  ) {
    return this.request<{ success: boolean; message: string; integration: any }>(
      `/admin/integrations/${integrationId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async testAdminIntegration(integrationId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/admin/integrations/${integrationId}/test`,
      { method: 'POST' }
    );
  }

  async deleteAdminIntegrationCredentials(integrationId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/admin/integrations/${integrationId}/credentials`,
      { method: 'DELETE' }
    );
  }

  async getAdminUsageSummary(period?: string) {
    const params = period ? { period } : undefined;
    return this.request<{
      success: boolean;
      period: string;
      summary: Array<{
        integrationId: string;
        displayName: string;
        totalUnits: number;
        totalCost: number;
        callCount: number;
        markupPercent: number;
        revenue: number;
      }>;
      totals: {
        totalCost: number;
        totalRevenue: number;
        totalCalls: number;
      };
    }>('/admin/integrations/usage/summary', { params });
  }

  // Customer Connections
  async getConnections(tenantId: string) {
    return this.request<{
      success: boolean;
      integrations: Array<{
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
      }>;
      byCategory: Record<string, any[]>;
      stats: {
        total: number;
        connected: number;
        included: number;
        byok: number;
      };
      categories: Array<{ id: string; name: string; icon: string; description: string }>;
    }>(`/connections/${tenantId}`);
  }

  async createConnection(
    tenantId: string,
    integrationId: string,
    data: { name?: string; credentials?: Record<string, string>; accountEmail?: string }
  ) {
    return this.request<{ success: boolean; message: string; connection: any }>(
      `/connections/${tenantId}/${integrationId}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateConnection(
    tenantId: string,
    integrationId: string,
    connectionId: string,
    data: { name?: string; credentials?: Record<string, string> }
  ) {
    return this.request<{ success: boolean; message: string; connection: any }>(
      `/connections/${tenantId}/${integrationId}/${connectionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteConnection(tenantId: string, integrationId: string, connectionId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/connections/${tenantId}/${integrationId}/${connectionId}`,
      { method: 'DELETE' }
    );
  }

  async getConnectionUsage(tenantId: string, period?: string) {
    const params = period ? { period } : undefined;
    return this.request<{
      success: boolean;
      period: string;
      usage: Array<{
        integrationId: string;
        displayName: string;
        units: number;
        callCount: number;
        estimatedCost: number;
      }>;
      total: {
        estimatedCost: number;
        totalCalls: number;
      };
    }>(`/connections/${tenantId}/usage`, { params });
  }
}

export const api = new ApiClient(API_URL);
export type { ApiClient };
