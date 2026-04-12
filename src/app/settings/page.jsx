'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScreenHeader from '@/components/ScreenHeader';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    getSupabaseClient().auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email || '');
    });
    return () => { active = false; };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await getSupabaseClient().auth.signOut();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!newPassword) {
      setError('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen">
      <ScreenHeader title="Settings" subtitle="Account and security controls." />
      <div className="detail-layout">
        <div className="detail-card">
          <div className="detail-card-head"><h3>Account</h3></div>
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            <div>
              <div className="detail-label">User Email</div>
              <strong>{email || '—'}</strong>
            </div>
            <div>
              <button type="button" className="shell-btn" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing Out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-head"><h3>Security</h3></div>
          <form onSubmit={handlePasswordUpdate} style={{ padding: 18, display: 'grid', gap: 12 }}>
            <label className="auth-field">
              <span>New Password</span>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Confirm Password</span>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
            {message ? <div className="auth-success">{message}</div> : null}
            {error ? <div className="auth-error">{error}</div> : null}
            <div>
              <button type="submit" className="shell-btn shell-btn-primary" disabled={saving}>
                {saving ? 'Updating…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
