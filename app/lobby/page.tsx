"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Mic, MicOff, VideoOff, User, ArrowRight, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const rId = searchParams.get('roomId') || Math.random().toString(36).substring(7);
    setRoomId(rId);

    const startPreview = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = s;
        setIsPermissionError(false);
      } catch (err) {
        console.error(err);
        setIsPermissionError(true);
      }
    };

    startPreview();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [searchParams]);

  const join = () => {
    sessionStorage.setItem('nexus_userName', userName);
    sessionStorage.setItem('nexus_initialVideo', isVideoOn.toString());
    sessionStorage.setItem('nexus_initialAudio', isAudioOn.toString());
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6 text-slate-50">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Preview Side */}
        <div className="space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {isVideoOn && !isPermissionError ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                  <User className="w-10 h-10 text-slate-600" />
                </div>
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Camera is off</span>
              </div>
            )}

            {isPermissionError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-8 space-y-4 backdrop-blur-sm">
                <Settings className="w-12 h-12 text-indigo-500 animate-spin-slow" />
                <h3 className="font-bold text-lg">Camera Access Denied</h3>
                <p className="text-sm text-slate-400 max-w-[280px]">Please enable camera and microphone permissions in your browser settings to continue.</p>
              </div>
            )}

            <div className="absolute bottom-6 flex space-x-3 transition-transform group-hover:scale-105">
              <Button size="icon" variant={isAudioOn ? "secondary" : "destructive"} onClick={() => setIsAudioOn(!isAudioOn)} className="rounded-full w-12 h-12 shadow-2xl backdrop-blur-md">
                {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant={isVideoOn ? "secondary" : "destructive"} onClick={() => setIsVideoOn(!isVideoOn)} className="rounded-full w-12 h-12 shadow-2xl backdrop-blur-md">
                {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-slate-500">
             <ShieldCheck className="h-4 w-4 text-emerald-500" />
             <span className="text-[10px] font-bold uppercase tracking-widest">End-to-end encrypted</span>
          </div>
        </div>

        {/* Form Side */}
        <div className="space-y-10 max-w-sm mx-auto lg:mx-0 w-full">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Step inside.</h1>
            <p className="text-slate-400 text-sm">Meeting ID: <span className="font-mono text-indigo-400 font-bold">{roomId}</span></p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Your display name</label>
              <Input
                placeholder="How should we call you?"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                className="h-14 bg-slate-900 border-slate-800 rounded-2xl text-lg px-6 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && userName && join()}
              />
            </div>

            <Button
              onClick={join}
              disabled={!userName}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
            >
              Join Meeting
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="pt-8 border-t border-slate-900">
             <p className="text-[10px] text-slate-600 leading-relaxed text-center lg:text-left">
               By joining this Nexus meeting, you agree to our
               <span className="text-slate-500 hover:underline cursor-pointer px-1">Privacy Policy</span> and
               <span className="text-slate-500 hover:underline cursor-pointer pl-1">Terms of Service</span>.
             </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function Lobby() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <LobbyContent />
    </Suspense>
  );
}
