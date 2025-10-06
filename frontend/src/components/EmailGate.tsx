
// components/EmailGate.tsx
'use client';
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export default function EmailGate({ onReady }:{ onReady:()=>void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|undefined>();

  // Ensure localStorage is available and hooks are always called in the same order
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('chatEmail')) {
      onReady();
    }
  }, [onReady]);

  async function identify(email: string, newSession = false) {
    const res = await fetch(`${API_BASE}/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), new_session: newSession, metadata: { source: 'chat-widget' } }),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ user_id:number; email:string; session_id:string; reused:boolean }>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    setBusy(true);
    try {
      const { email: savedEmail, session_id } = await identify(email, false); // reuse last session by default
      localStorage.setItem('chatEmail', savedEmail);
      localStorage.setItem('chatSessionId', session_id);
      onReady();
    } catch (e:any) {
      setErr(e?.message ?? 'Failed to start session');
    } finally {
      setBusy(false);
    }
  }

  return (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
      <h3 className="font-semibold text-lg mb-2">Enter your email to continue</h3>
      <p className="text-sm text-gray-600 mb-4">We use it to restore your conversation across devices.</p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-black text-white"
        >
          {busy ? 'Starting…' : 'Continue'}
        </button>
      </form>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  </div>
);
}
