'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useTenantStore } from '@/lib/store';
import { generateTenantId } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { tenantId, setTenant } = useTenantStore();

  useEffect(() => {
    // Auto-create tenant if not exists (for demo purposes)
    if (!tenantId) {
      const newTenantId = generateTenantId();
      setTenant(newTenantId, 'My Organization');
    }
  }, [tenantId, setTenant]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
