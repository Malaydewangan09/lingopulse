import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import LandingPage from './landing/page';

export default async function Home() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return <LandingPage />;
  }

  const db = supabaseAdmin();
  const { data: repos } = await db
    .from('repos')
    .select('id')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (repos && repos.length > 0) {
    redirect(`/repo/${repos[0].id}`);
  }

  redirect('/connect');
}
