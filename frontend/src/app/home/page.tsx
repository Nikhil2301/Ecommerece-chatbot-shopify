// page.tsx - Enhanced Design Version
'use client';

import { useRouter } from 'next/navigation';
import ChatAssistant from '@/components/ChatAssistant';

export default function FullChatPage() {
  const router = useRouter();

  return <ChatAssistant mode="full" showHeader showThemeToggle showBackButton onClose={() => router.push('/')} />;
}