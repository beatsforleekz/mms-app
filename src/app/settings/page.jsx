'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [opsMessage, setOpsMessage] = useState('');
  const [opsError, setOpsError] = useState('');
  const importRef = useRef(null);

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

  function handleExportLocalSettings() {
    setOpsMessage('');
    setOpsError('');
    try {
      const payload = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        payload[key] = localStorage.getItem(key);
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mms-local-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpsMessage('Local settings exported.');
    } catch (err) {
      setOpsError(err.message || 'Failed to export local settings.');
    }
  }

  async function handleImportLocalSettings(event) {
    setOpsMessage('');
    setOpsError('');
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid settings file.');
      Object.keys(payload).forEach((key) => {
        const value = payload[key];
        if (typeof value === 'string') localStorage.setItem(key, value);
      });
      setOpsMessage('Local settings imported. Refresh the app to apply all changes.');
    } catch (err) {
      setOpsError(err.message || 'Failed to import local settings.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  function handleResetOperationalLocalSettings() {
    setOpsMessage('');
    setOpsError('');
    try {
      const keysToClear = [
        'pipeline_release_meta_v1',
        'statement_entries_v1',
        'statement_period_v1',
        'workflow_suite_v1'
      ];
      keysToClear.forEach((key) => localStorage.removeItem(key));
      setOpsMessage('Operational local settings reset.');
    } catch (err) {
      setOpsError(err.message || 'Failed to reset local settings.');
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

        <div className="detail-card">
          <div className="detail-card-head"><h3>Operational Settings</h3></div>
          <div style={{ padding: 18, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="shell-btn" onClick={handleExportLocalSettings}>Export Local Settings</button>
              <button type="button" className="shell-btn" onClick={() => importRef.current?.click()}>Import Local Settings</button>
              <button type="button" className="shell-btn" onClick={handleResetOperationalLocalSettings}>Reset Local Operational Cache</button>
              <input ref={importRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportLocalSettings} />
            </div>
            {opsMessage ? <div className="auth-success">{opsMessage}</div> : null}
            {opsError ? <div className="auth-error">{opsError}</div> : null}
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-head"><h3>App Info</h3></div>
          <div style={{ padding: 18, display: 'grid', gap: 6 }}>
            <div><span className="detail-label">Build</span><strong>MMS Next.js + Legacy Hybrid</strong></div>
            <div><span className="detail-label">Runtime</span><strong>{typeof window !== 'undefined' && window.location ? window.location.origin : '—'}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
