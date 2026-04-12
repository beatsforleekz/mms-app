'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) router.replace('/dashboard');
      else setChecking(false);
    });
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (signInError) throw signInError;
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="auth-shell"><div className="auth-card"><div className="loading-block">Loading…</div></div></div>;
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-head">
          <h1>Leah Operations Hub</h1>
          <p>Sign in to continue.</p>
        </div>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <div className="auth-error">{error}</div> : null}
        <button type="submit" className="shell-btn shell-btn-primary auth-submit" disabled={loading}>
          {loading ? 'Signing In…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
