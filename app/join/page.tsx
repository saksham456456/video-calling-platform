"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Video } from 'lucide-react';
import Link from 'next/link';

export default function Join() {
  const [id, setId] = useState('');
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-50">
      <div className="absolute top-8 left-8">
        <Link href="/">
           <Button variant="ghost" className="text-slate-500 hover:text-white">
             <ArrowLeft className="mr-2 h-4 w-4" /> Back
           </Button>
        </Link>
      </div>

      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/20">
          <Video className="h-8 w-8 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Join Meeting</h1>
          <p className="text-slate-500 text-sm font-medium">Enter the unique code to step inside.</p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Meeting ID (e.g. x1y2z3)"
            value={id}
            onChange={e => setId(e.target.value)}
            className="h-14 bg-slate-900 border-slate-800 rounded-2xl text-center text-lg font-mono focus:ring-indigo-500/20"
            onKeyDown={e => e.key === 'Enter' && id && router.push(`/lobby?roomId=${id}`)}
          />
          <Button
            onClick={() => router.push(`/lobby?roomId=${id}`)}
            disabled={!id}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-600/10 transition-all"
          >
            Join Now
          </Button>
        </div>
      </div>
    </div>
  );
}
