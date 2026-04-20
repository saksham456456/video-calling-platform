"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { PeerConnection } from '@/lib/webrtc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, MessageSquare, Users, Copy, ScreenShare, WifiOff, Wifi, X, LogOut, Share } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function Room() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const { toast, toasts } = useToast();

  const [userName, setUserName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgInput, setMsgInput] = useState('');
  const [participants, setParticipants] = useState<Map<string, any>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isLeaving, setIsLeaving] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pcs = useRef<Map<string, PeerConnection>>(new Map());
  const participantsRef = useRef<Map<string, any>>(new Map());
  const showChatRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { showChatRef.current = showChat; if (showChat) setUnreadCount(0); }, [showChat]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const name = sessionStorage.getItem('nexus_userName');
    if (!name) return router.push(`/lobby?roomId=${roomId}`);
    setUserName(name);
    setIsMuted(sessionStorage.getItem('nexus_initialAudio') === 'false');
    setIsVideoOff(sessionStorage.getItem('nexus_initialVideo') === 'false');

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getAudioTracks()[0].enabled = sessionStorage.getItem('nexus_initialAudio') !== 'false';
        stream.getVideoTracks()[0].enabled = sessionStorage.getItem('nexus_initialVideo') !== 'false';

        const socket = io('http://localhost:3001', { reconnectionAttempts: 10 });
        socketRef.current = socket;

        socket.on('connect', () => {
          setConnectionStatus('connected');
          socket.emit('join-room', { roomId, userName: name });
        });

        socket.on('existing-participants', (existing: any[]) => {
          existing.forEach(p => {
            setParticipants(prev => new Map(prev).set(p.id, { name: p.name, status: 'connecting' }));
            createPC(p.id, stream, true);
          });
        });

        socket.on('user-joined', ({ userId, userName: joinedName }) => {
          toast({ title: "User Joined", description: `${joinedName} joined the call.` });
          setParticipants(p => new Map(p).set(userId, { name: joinedName, status: 'connecting' }));
          createPC(userId, stream, false);
        });

        socket.on('signal', async ({ senderId, signal }) => {
          let pc = pcs.current.get(senderId);
          if (!pc) pc = createPC(senderId, stream, false);
          if (signal.type === 'offer') {
            const a = await pc.createAnswer(signal);
            socket.emit('signal', { targetId: senderId, signal: a });
          } else if (signal.type === 'answer') await pc.setRemoteDescription(signal);
          else if (signal.candidate) await pc.addIceCandidate(signal.candidate);
        });

        socket.on('chat-message', m => {
          setMessages(prev => [...prev, m]);
          if (!showChatRef.current) {
            setUnreadCount(c => c + 1);
            toast({ title: m.userName, description: m.message });
          }
        });

        socket.on('user-left', id => {
          const p = participantsRef.current.get(id);
          if (p) toast({ title: "User Left", description: `${p.name} left the call.` });
          pcs.current.get(id)?.close();
          pcs.current.delete(id);
          setParticipants(prev => { const n = new Map(prev); n.delete(id); return n; });
        });
      } catch (err) {
        toast({ title: "Media Error", description: "Could not access camera or microphone.", variant: "destructive" });
        setConnectionStatus('disconnected');
      }
    };
    initMedia();
    return () => { socketRef.current?.disconnect(); localStreamRef.current?.getTracks().forEach(t => t.stop()); pcs.current.forEach(pc => pc.close()); };
  }, [roomId]);

  const createPC = (id: string, stream: MediaStream, isInit: boolean) => {
    const pc = new PeerConnection(
      s => setParticipants(p => {
        const next = new Map(p);
        const current = next.get(id) || { name: 'Remote User' };
        next.set(id, { ...current, stream: s, status: 'connected' });
        return next;
      }),
      c => socketRef.current?.emit('signal', { targetId: id, signal: { candidate: c } })
    );
    pc.addTrack(stream);
    pcs.current.set(id, pc);
    if (isInit) pc.createOffer().then(o => socketRef.current?.emit('signal', { targetId: id, signal: o }));
    return pc;
  };

  const toggleScreen = async () => {
    if (!isScreenSharing) {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const nt = s.getVideoTracks()[0];
        const ot = localStreamRef.current!.getVideoTracks()[0];
        pcs.current.forEach(pc => pc.replaceTrack(ot, nt));
        if (localVideoRef.current) localVideoRef.current.srcObject = s;
        setIsScreenSharing(true);
        toast({ title: "Screen Sharing", description: "Sharing started successfully.", variant: "success" });
        nt.onended = () => {
          pcs.current.forEach(pc => pc.replaceTrack(nt, ot));
          if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          setIsScreenSharing(false);
        };
      } catch (e) {}
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my Nexus Meeting', url }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Copied!", description: "Meeting link copied to clipboard.", variant: "success" });
    }
  };

  const leave = () => {
    setIsLeaving(true);
    setTimeout(() => router.push('/'), 500);
  };

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col text-slate-50 overflow-hidden select-none touch-none">
      <Toaster toasts={toasts} />
      {isLeaving && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
           <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><LogOut className="h-8 w-8 text-red-500 animate-pulse" /></div>
           <h2 className="text-xl font-bold tracking-tight text-slate-200">Leaving meeting...</h2>
        </div>
      )}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/50 backdrop-blur-xl shrink-0 z-[100]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center hidden sm:flex"><Video className="h-5 w-5 text-white" /></div>
          <div className="flex flex-col">
            <h1 className="font-bold text-[11px] tracking-widest text-slate-400 uppercase leading-none mb-1">NEXUS</h1>
            <div className="flex items-center space-x-2">
               <span className="text-[10px] font-mono text-indigo-400 uppercase leading-none">{roomId}</span>
               <Badge variant={connectionStatus === 'connected' ? 'success' : 'destructive'} className="text-[7px] h-3 px-1 leading-none uppercase">{connectionStatus}</Badge>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider" onClick={handleShare}><Share className="h-3 w-3 mr-2" /> Invite</Button>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-2 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className={cn("w-full h-full max-w-6xl mx-auto grid gap-2 md:gap-5 content-center justify-items-center touch-auto", participants.size === 0 ? "grid-cols-1 max-w-2xl" : participants.size === 1 ? "grid-cols-1 md:grid-cols-2" : participants.size === 2 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
            <div className="relative w-full rounded-xl md:rounded-[2rem] bg-slate-900 border border-slate-800/50 overflow-hidden aspect-video shadow-2xl transition-all duration-500">
              <video ref={localVideoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", !isScreenSharing && "scale-x-[-1]")} />
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-2xl px-2 py-1 rounded-xl text-[8px] font-bold border border-white/10 flex items-center space-x-1.5 shadow-2xl">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                {isMuted && <MicOff className="h-2.5 w-2.5 text-red-500" />}
                <span className="tracking-tight text-slate-300">{userName} (You)</span>
              </div>
            </div>
            {Array.from(participants.entries()).map(([id, p]) => (
              <div key={id} className="relative w-full rounded-xl md:rounded-[2rem] bg-slate-900 border border-slate-800/50 overflow-hidden aspect-video shadow-2xl flex items-center justify-center transition-all duration-500">
                {p.status === 'connecting' ? <div className="flex flex-col items-center space-y-2 text-slate-600 animate-pulse"><div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /><span className="text-[7px] font-black uppercase tracking-widest">Joining</span></div> : <video ref={v => { if (v) v.srcObject = p.stream }} autoPlay playsInline className="w-full h-full object-cover" />}
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-2xl px-2 py-1 rounded-xl text-[8px] font-bold border border-white/10 shadow-2xl"><span className="tracking-tight text-slate-300">{p.name}</span></div>
              </div>
            ))}
          </div>
        </div>
        {(showChat || showParticipants) && (
          <div className="w-full h-full md:w-80 border-l border-slate-900 bg-slate-950/95 backdrop-blur-2xl flex flex-col absolute md:relative z-[200] inset-0 md:inset-auto animate-in slide-in-from-right duration-300 shadow-2xl touch-auto">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-900 shrink-0">
              <h2 className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-500">{showChat ? 'Chat' : 'Participants'}</h2>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-slate-900" onClick={() => { setShowChat(false); setShowParticipants(false); }}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {showChat ? (
                <>
                  <ScrollArea ref={scrollRef} className="flex-1 p-4"><div className="space-y-4">{messages.map((m, i) => (<div key={i} className={cn("flex flex-col space-y-1", m.userId === socketRef.current?.id ? "items-end" : "items-start")}><div className="flex items-center space-x-2 px-1"><span className="text-[8px] font-black text-slate-600 uppercase">{m.userName}</span></div><div className={cn("text-xs px-3 py-2 rounded-xl max-w-[90%] break-words shadow-sm font-medium", m.userId === socketRef.current?.id ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none")}>{m.message}</div></div>))}</div></ScrollArea>
                  <div className="p-3 border-t border-slate-900 bg-slate-950/50"><form className="flex space-x-2" onSubmit={e => { e.preventDefault(); if(msgInput.trim()) { socketRef.current?.emit('chat-message', { roomId, message: msgInput, userName }); setMsgInput(''); } }}><Input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Message..." className="bg-slate-900 border-slate-800 text-xs rounded-xl h-10" /><Button type="submit" size="icon" className="bg-indigo-600 h-10 w-10 shrink-0 rounded-xl" disabled={!msgInput.trim()}><Send className="h-4 w-4" /></Button></form></div>
                </>
              ) : (
                <ScrollArea className="flex-1 p-4"><div className="space-y-2"><ParticipantRow name={userName + " (You)"} isMe isMuted={isMuted} isVideoOff={isVideoOff} />{Array.from(participants.values()).map((p, i) => <ParticipantRow key={i} name={p.name} />)}</div></ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="h-20 md:h-24 px-4 md:px-8 bg-slate-950 border-t border-slate-900 flex items-center justify-between shrink-0 relative z-[300] safe-bottom backdrop-blur-3xl touch-auto">
        <div className="hidden lg:flex w-40 flex-col"><span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Elapsed</span><span className="text-xs font-mono text-indigo-400 font-bold">00:12:45</span></div>
        <div className="flex items-center space-x-3 md:space-x-6 mx-auto">
          <Button size="icon" variant={isMuted ? "destructive" : "secondary"} className="rounded-xl w-10 h-10 md:w-14 md:h-14 transition-all shadow-xl active:scale-95" onClick={() => { setIsMuted(!isMuted); localStreamRef.current!.getAudioTracks()[0].enabled = isMuted }}>{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
          <Button size="icon" variant={isVideoOff ? "destructive" : "secondary"} className="rounded-xl w-10 h-10 md:w-14 md:h-14 transition-all shadow-xl active:scale-95" onClick={() => { setIsVideoOff(!isVideoOff); localStreamRef.current!.getVideoTracks()[0].enabled = isVideoOff }}>{isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}</Button>
          <Button size="icon" variant={isScreenSharing ? "secondary" : "ghost"} className="rounded-xl w-10 h-10 md:w-14 md:h-14 hidden sm:flex transition-all" onClick={toggleScreen}><ScreenShare className="h-4 w-4" /></Button>
          <Button size="icon" variant="destructive" className="rounded-xl w-14 h-10 md:w-28 md:h-14 font-black shadow-xl active:scale-95 transition-all" onClick={leave}><PhoneOff className="h-4 w-4 md:mr-2" /><span className="hidden md:inline text-[9px] uppercase tracking-widest">End</span></Button>
        </div>
        <div className="flex items-center space-x-2 w-20 lg:w-40 justify-end">
          <Button variant="ghost" size="icon" className={cn("rounded-xl w-10 h-10", showParticipants && "text-indigo-400 bg-indigo-500/10")} onClick={() => { setShowParticipants(!showParticipants); setShowChat(false) }}><Users className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className={cn("rounded-xl w-10 h-10 relative", showChat && "text-indigo-400 bg-indigo-500/10")} onClick={() => { setShowChat(!showChat); setShowParticipants(false) }}>
            <MessageSquare className="h-4 w-4" />
            {unreadCount > 0 && !showChat && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-slate-950" />}
          </Button>
        </div>
      </div>
      <style jsx global>{`.safe-bottom { padding-bottom: env(safe-area-inset-bottom); } .touch-none { touch-action: none; } .touch-auto { touch-action: auto; }`}</style>
    </div>
  );
}

function ParticipantRow({ name, isMe, isMuted, isVideoOff }: { name: string, isMe?: boolean, isMuted?: boolean, isVideoOff?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 transition-all hover:bg-slate-900/60 group">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8 border border-white/5 shadow-xl"><AvatarFallback className={cn("text-[10px] font-black uppercase", isMe ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500")}>{name.charAt(0)}</AvatarFallback></Avatar>
        <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 group-hover:text-slate-200 transition-colors truncate max-w-[110px]">{name}</span>
      </div>
      <div className="flex items-center space-x-2 opacity-40 group-hover:opacity-100 transition-opacity">{isMuted && <MicOff className="h-3 w-3 text-red-500" />}{isVideoOff && <VideoOff className="h-3 w-3 text-red-500" />}</div>
    </div>
  );
}
