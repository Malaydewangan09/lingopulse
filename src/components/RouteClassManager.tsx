'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteClassManager() {
  const pathname = usePathname();

  useEffect(() => {
    const productRoute = pathname?.startsWith('/repo/') || pathname === '/connect' || pathname?.startsWith('/auth');
    document.body.classList.toggle('app-product', !!productRoute);
  }, [pathname]);

  return null;
}
