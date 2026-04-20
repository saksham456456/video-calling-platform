"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { PeerConnection } from '@/lib/webrtc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, MessageSquare, Users, Copy, ScreenShare, WifiOff, Wifi, X, LogOut } from 'lucide-react';
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

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

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

        const socket = io('http://localhost:3001', {
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 10000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          setConnectionStatus('connected');
          socket.emit('join-room', { roomId, userName: name });
          toast({ title: "Connected", description: "Successfully joined the meeting.", variant: "success" });
        });

        socket.on('disconnect', () => {
          setConnectionStatus('disconnected');
          toast({ title: "Disconnected", description: "Connection lost. Trying to reconnect...", variant: "destructive" });
        });

        socket.on('existing-participants', ids => ids.forEach((id: string) => createPC(id, stream, true)));

        socket.on('user-joined', ({ userId, userName: joinedName }) => {
          toast({ title: "User Joined", description: `${joinedName} joined the call.` });
          setParticipants(p => {
            const next = new Map(p);
            next.set(userId, { name: joinedName, status: 'connecting' });
            return next;
          });
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
          if (!showChatRef.current) toast({ title: m.userName, description: m.message });
        });

        socket.on('user-left', id => {
          const p = participantsRef.current.get(id);
          if (p) toast({ title: "User Left", description: `${p.name} left the call.` });
          pcs.current.get(id)?.close();
          pcs.current.delete(id);
          setParticipants(prev => { const n = new Map(prev); n.delete(id); return n; });
        });
      } catch (err) {
        console.error(err);
        toast({ title: "Media Error", description: "Could not access camera or microphone.", variant: "destructive" });
        setConnectionStatus('disconnected');
      }
    };

    initMedia();

    return () => {
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcs.current.forEach(pc => pc.close());
    };
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
      } catch (e) {
        toast({ title: "Screen Share Error", description: "Permission denied.", variant: "destructive" });
      }
    }
  };

  const handleLeave = () => {
    setIsLeaving(true);
    setTimeout(() => router.push('/'), 500);
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-slate-50 overflow-hidden select-none font-sans">
      <Toaster toasts={toasts} />
      {isLeaving && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
           <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"><LogOut className="h-8 w-8 text-red-500 animate-pulse" /></div>
           <h2 className="text-xl font-bold tracking-tight text-slate-200">Leaving meeting...</h2>
        </div>
      )}
      <div className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-slate-900 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center hidden sm:flex"><Video className="h-5 w-5 text-white" /></div>
          <div className="flex flex-col">
            <h1 className="font-bold text-[13px] tracking-tight text-slate-200 uppercase">Nexus Call</h1>
            <div className="flex items-center space-x-2">
               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{roomId}</span>
               <Badge variant={connectionStatus === 'connected' ? 'success' : 'destructive'} className="text-[8px] h-3.5 px-1 font-black">{connectionStatus.toUpperCase()}</Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied", description: "Invite link is on your clipboard.", variant: "success" }); }}><Copy className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-3 md:p-6 flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden">
          {connectionStatus === 'disconnected' && (
            <div className="absolute top-4 z-50 bg-red-500/20 border border-red-500/30 text-red-500 px-6 py-2.5 rounded-full flex items-center space-x-3 shadow-2xl backdrop-blur-md">
               <WifiOff className="h-4 w-4 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Network Interruption</span>
            </div>
          )}
          <div className={cn("w-full h-full max-w-6xl mx-auto grid gap-3 md:gap-5 content-center justify-items-center", participants.size === 0 ? "grid-cols-1 max-w-3xl" : participants.size === 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
            <div className="relative w-full rounded-2xl md:rounded-[2.5rem] bg-slate-900 border border-slate-800/50 overflow-hidden aspect-video shadow-2xl transition-all duration-500 hover:border-indigo-500/30">
              <video ref={localVideoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", !isScreenSharing && "scale-x-[-1]")} />
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-2xl px-3 py-1.5 rounded-2xl text-[10px] font-bold border border-white/10 flex items-center space-x-2 shadow-2xl">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {isMuted && <MicOff className="h-3 w-3 text-red-500" />}
                {isScreenSharing && <ScreenShare className="h-3 w-3 text-indigo-400" />}
                <span className="tracking-tight text-slate-300">{userName} (You)</span>
              </div>
            </div>
            {Array.from(participants.entries()).map(([id, p]) => (
              <div key={id} className="relative w-full rounded-2xl md:rounded-[2.5rem] bg-slate-900 border border-slate-800/50 overflow-hidden aspect-video shadow-2xl flex items-center justify-center transition-all duration-500 hover:border-indigo-500/30">
                {p.status === 'connecting' ? <div className="flex flex-col items-center space-y-3 text-slate-600 animate-pulse"><div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /><span className="text-[9px] font-black uppercase tracking-[0.3em]">Negotiating</span></div> : <video ref={v => { if (v) v.srcObject = p.stream }} autoPlay playsInline className="w-full h-full object-cover" />}
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-2xl px-3 py-1.5 rounded-2xl text-[10px] font-bold border border-white/10 shadow-2xl"><span className="tracking-tight text-slate-300">{p.name}</span></div>
              </div>
            ))}
            {participants.size === 0 && <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 opacity-[0.03]"><Users className="h-96 w-96" /></div>}
          </div>
        </div>
        {(showChat || showParticipants) && (
          <div className="w-full h-full md:w-80 border-l border-slate-900 bg-slate-950 flex flex-col absolute md:relative z-[60] inset-0 md:inset-auto animate-in slide-in-from-right duration-500">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-900 shrink-0">
              <h2 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">{showChat ? 'In-Call Chat' : 'Participants'}</h2>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => { setShowChat(false); setShowParticipants(false); }}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {showChat ? (
                <>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">
                      {messages.map((m, i) => (
                        <div key={i} className={cn("flex flex-col space-y-1.5", m.userId === socketRef.current?.id ? "items-end" : "items-start")}>
                          <div className="flex items-center space-x-2 px-1"><span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{m.userName}</span><span className="text-[8px] text-slate-700">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                          <div className={cn("text-xs px-4 py-2.5 rounded-2xl max-w-[90%] break-words shadow-sm font-medium leading-relaxed", m.userId === socketRef.current?.id ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10" : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none")}>{m.message}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-slate-900 bg-slate-950/50">
                    <form className="flex space-x-2" onSubmit={e => { e.preventDefault(); if(msgInput.trim()) { socketRef.current?.emit('chat-message', { roomId, message: msgInput, userName }); setMsgInput(''); } }}>
                      <Input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Type a message..." className="bg-slate-900 border-slate-800 text-xs rounded-2xl h-11 focus:ring-indigo-500/20" />
                      <Button type="submit" size="icon" className="bg-indigo-600 h-11 w-11 shrink-0 rounded-2xl shadow-xl shadow-indigo-600/20" disabled={!msgInput.trim()}><Send className="h-4 w-4" /></Button>
                    </form>
                  </div>
                </>
              ) : (
                <ScrollArea className="flex-1 p-4">
                   <div className="space-y-3">
                     <ParticipantRow name={userName + " (You)"} isMe isMuted={isMuted} isVideoOff={isVideoOff} />
                     {Array.from(participants.values()).map((p, i) => <ParticipantRow key={i} name={p.name} />)}
                   </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="h-24 md:h-28 px-4 md:px-10 bg-slate-950/80 border-t border-slate-900 flex items-center justify-between shrink-0 relative z-[70] safe-bottom backdrop-blur-3xl">
        <div className="hidden lg:flex w-40 flex-col"><span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Time Elapsed</span><span className="text-sm font-mono text-indigo-400 font-bold tabular-nums">00:42:15</span></div>
        <div className="flex items-center space-x-3 md:space-x-6 mx-auto">
          <Button size="icon" variant={isMuted ? "destructive" : "secondary"} className="rounded-2xl md:rounded-3xl w-12 h-12 md:w-16 md:h-16 transition-all shadow-xl active:scale-90 border border-white/5" onClick={() => { setIsMuted(!isMuted); localStreamRef.current!.getAudioTracks()[0].enabled = isMuted }}>{isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
          <Button size="icon" variant={isVideoOff ? "destructive" : "secondary"} className="rounded-2xl md:rounded-3xl w-12 h-12 md:w-16 md:h-16 transition-all shadow-xl active:scale-90 border border-white/5" onClick={() => { setIsVideoOff(!isVideoOff); localStreamRef.current!.getVideoTracks()[0].enabled = isVideoOff }}>{isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</Button>
          <Button size="icon" variant={isScreenSharing ? "secondary" : "ghost"} className="rounded-2xl md:rounded-3xl w-12 h-12 md:w-16 md:h-16 hidden sm:flex transition-all active:scale-90 border border-white/5" onClick={toggleScreen}><ScreenShare className="h-5 w-5" /></Button>
          <Button size="icon" variant="destructive" className="rounded-2xl md:rounded-3xl w-16 h-12 md:w-32 md:h-16 font-black shadow-xl active:scale-90 shadow-red-500/10" onClick={handleLeave}><PhoneOff className="h-5 w-5 md:mr-3" /><span className="hidden md:inline text-[10px] uppercase tracking-[0.2em]">End Call</span></Button>
        </div>
        <div className="flex items-center space-x-2 w-20 lg:w-40 justify-end">
          <Button variant="ghost" size="icon" className={cn("rounded-2xl w-12 h-12 transition-all hover:bg-slate-900", showParticipants && "text-indigo-400 bg-indigo-500/10")} onClick={() => { setShowParticipants(!showParticipants); setShowChat(false) }}><Users className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className={cn("rounded-2xl w-12 h-12 transition-all hover:bg-slate-900", showChat && "text-indigo-400 bg-indigo-500/10")} onClick={() => { setShowChat(!showChat); setShowParticipants(false) }}><MessageSquare className="h-5 w-5" /></Button>
        </div>
      </div>
      <style jsx global>{`.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }`}</style>
    </div>
  );
}

function ParticipantRow({ name, isMe, isMuted, isVideoOff }: { name: string, isMe?: boolean, isMuted?: boolean, isVideoOff?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/50 transition-all hover:border-slate-700 hover:bg-slate-900/60 group">
      <div className="flex items-center space-x-4">
        <Avatar className="h-10 w-10 border-2 border-white/5 shadow-xl transition-transform group-hover:scale-105"><AvatarFallback className={cn("text-[11px] font-black uppercase tracking-tighter", isMe ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500")}>{name.charAt(0)}</AvatarFallback></Avatar>
        <span className="text-[11px] font-black uppercase tracking-tight text-slate-400 group-hover:text-slate-200 transition-colors truncate max-w-[110px]">{name}</span>
      </div>
      <div className="flex items-center space-x-2 opacity-40 group-hover:opacity-100 transition-opacity">
        {isMuted && <MicOff className="h-3.5 w-3.5 text-red-500" />}
        {isVideoOff && <VideoOff className="h-3.5 w-3.5 text-red-500" />}
      </div>
    </div>
  );
}
