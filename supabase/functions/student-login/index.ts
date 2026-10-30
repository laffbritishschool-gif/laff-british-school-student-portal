import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST is required.' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    let service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
    if (secretKeys) {
      try { service = JSON.parse(secretKeys).default || service; } catch {}
    }
    let publishable = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
    if (publishableKeys) {
      try { publishable = JSON.parse(publishableKeys).default || publishable; } catch {}
    }
    if (!url || !service || !publishable) {
      return json({ ok: false, error: 'The login service is temporarily unavailable.' }, 500);
    }

    let body: any;
    try { body = await req.json(); } catch {
      return json({ ok: false, error: 'Invalid login request.' }, 400);
    }

    const registrationNumber = String(body.registration_number || '').trim().replace(/\s+/g, '').toUpperCase();
    const password = String(body.password || '');
    if (!registrationNumber || !password) {
      return json({ ok: false, error: 'Enter your registration number and password.' }, 400);
    }
    if (registrationNumber.length > 80 || password.length > 200) {
      return json({ ok: false, error: 'Invalid registration number or password.' }, 400);
    }

    const admin = createClient(url, service);
    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id,user_id,student_id,school_email')
      .eq('student_id', registrationNumber)
      .maybeSingle();

    if (studentError || !student || !student.user_id) {
      return json({ ok: false, error: 'Invalid registration number or password.' }, 401);
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role,must_change_password')
      .eq('id', student.user_id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'STUDENT') {
      return json({ ok: false, error: 'Invalid registration number or password.' }, 401);
    }

    // Authenticate only against the account linked to this student record.
    const { data: linkedAccount, error: linkedAccountError } = await admin.auth.admin.getUserById(student.user_id);
    const loginEmail = linkedAccount?.user?.email || student.school_email;
    if (linkedAccountError || !loginEmail) {
      return json({ ok: false, error: 'Invalid registration number or password.' }, 401);
    }

    const authClient = createClient(url, publishable);
    const { data: auth, error: authError } = await authClient.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (authError || !auth.session || !auth.user || auth.user.id !== student.user_id) {
      return json({ ok: false, error: 'Invalid registration number or password.' }, 401);
    }

    return json({
      ok: true,
      session: {
        access_token: auth.session.access_token,
        refresh_token: auth.session.refresh_token,
        expires_at: auth.session.expires_at,
        expires_in: auth.session.expires_in,
        token_type: auth.session.token_type
      },
      student: {
        registration_number: student.student_id
      }
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'Unable to sign in right now. Please try again.' }, 500);
  }
});