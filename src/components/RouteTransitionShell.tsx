'use client';

import { usePathname } from 'next/navigation';

export default function RouteTransitionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="route-stage animate-route-enter">
      {children}
    </div>
  );
}
