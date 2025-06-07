'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { OrganizationSetup } from '@/components/auth/OrganizationSetup';

export default function SetupOrganizationPage() {
  useRequireAuth({ requireOrganization: false });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <OrganizationSetup />
    </div>
  );
}