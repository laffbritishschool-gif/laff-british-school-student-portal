import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function readDefaultJson(key: string): string {
  const raw = Deno.env.get(key) || '';
  if (!raw) return '';
  try { return String(JSON.parse(raw).default || ''); } catch { return ''; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST is required.' }, 405);

  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ ok: false, error: 'Your session has expired. Please sign in again.' }, 401);

    const url = Deno.env.get('SUPABASE_URL') || '';
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || readDefaultJson('SUPABASE_SECRET_KEYS');
    const publishable = Deno.env.get('SUPABASE_ANON_KEY') ||
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || readDefaultJson('SUPABASE_PUBLISHABLE_KEYS');
    if (!url || !service || !publishable) return json({ ok: false, error: 'Password service is not configured.' }, 500);

    const userClient = createClient(url, publishable, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ ok: false, error: 'Your session is invalid. Please sign in again.' }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid password request.' }, 400); }
    const password = String(body.new_password || '');
    if (password.length < 10 || password.length > 200 ||
        !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
        !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return json({ ok: false, error: 'Use at least 10 characters, including uppercase and lowercase letters, a number and a symbol.' }, 400);
    }

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profileError || !profile || profile.role !== 'STUDENT') {
      return json({ ok: false, error: 'Only a student account can change its password here.' }, 403);
    }
    const { data: student, error: studentError } = await admin
      .from('students').select('id').eq('user_id', user.id).maybeSingle();
    if (studentError || !student) {
      return json({ ok: false, error: 'No student record is linked to this account.' }, 403);
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password });
    if (passwordError) return json({ ok: false, error: 'The password could not be updated. Please try again.' }, 400);

    const { error: flagError } = await admin.from('profiles')
      .update({ must_change_password: false }).eq('id', user.id);
    if (flagError) {
      console.error('Password changed but the first-login flag was not cleared:', flagError.message);
      return json({ ok: false, error: 'Password updated, but the account setup is incomplete. Sign in again or contact the school.' }, 500);
    }

    return json({ ok: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Student password update failed:', error instanceof Error ? error.message : 'Unknown error');
    return json({ ok: false, error: 'Unable to update your password right now.' }, 500);
  }
});