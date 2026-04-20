"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Join() {
  const [id, setId] = useState('');
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-6">
      <h1 className="text-3xl font-bold">Join a Meeting</h1>
      <Input placeholder="Meeting ID" value={id} onChange={e => setId(e.target.value)} className="max-w-sm h-14 bg-slate-900 border-slate-800" />
      <Button onClick={() => router.push(`/lobby?roomId=${id}`)} disabled={!id} className="w-full max-w-sm h-14 bg-indigo-600">Join</Button>
    </div>
  );
}
