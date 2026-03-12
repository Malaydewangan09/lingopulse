import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server';

function unauthorizedApiResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createMiddlewareSupabaseClient(req, res);
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const pathname = req.nextUrl.pathname;
  const isApiRequest = pathname.startsWith('/api/');
  const requiresAuth = pathname.startsWith('/connect')
    || pathname.startsWith('/repo')
    || pathname.startsWith('/api/repos')
    || pathname.startsWith('/api/debug')
    || pathname === '/api/analyze';

  if (!requiresAuth) return res;

  if (!user) {
    if (isApiRequest) return unauthorizedApiResponse();

    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/connect', '/repo/:path*', '/api/repos/:path*', '/api/debug/:path*', '/api/analyze'],
};
