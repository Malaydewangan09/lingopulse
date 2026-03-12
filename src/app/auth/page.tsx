import { redirect } from 'next/navigation';
import AuthPageClient from '@/app/auth/AuthPageClient';
import { getAuthenticatedUser } from '@/lib/auth';

interface AuthPageProps {
  searchParams?: Promise<{
    next?: string;
    error?: string;
  }>;
}

function getSafeNextPath(value?: string) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/connect';
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params?.next);
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(nextPath);
  }

  return <AuthPageClient nextPath={nextPath} initialError={params?.error} />;
}
