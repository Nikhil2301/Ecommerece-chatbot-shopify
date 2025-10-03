// components/RequireEmail.tsx
'use client';
import React, { useEffect, useState } from 'react';
import EmailGate from './EmailGate';

export default function RequireEmail({ children }:{ children: React.ReactNode }) {
  const [ready, setReady] = useState<boolean>(false);
  useEffect(() => {
    const hasEmail = typeof window !== 'undefined' && !!localStorage.getItem('chatEmail');
    setReady(hasEmail);
  }, []);
  if (!ready) return <EmailGate onReady={() => setReady(true)} />;
  return <>{children}</>;
}