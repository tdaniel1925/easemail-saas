import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  tenantId: string | null;
  tenantName: string | null;
  setTenant: (id: string, name: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: null,
      tenantName: null,
      setTenant: (id, name) => set({ tenantId: id, tenantName: name }),
      clearTenant: () => set({ tenantId: null, tenantName: null }),
    }),
    {
      name: 'botmakers-tenant',
    }
  )
);

interface ApiKeyState {
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      activeKey: null,
      setActiveKey: (key) => set({ activeKey: key }),
    }),
    {
      name: 'botmakers-apikey',
    }
  )
);
