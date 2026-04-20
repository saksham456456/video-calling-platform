import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Video, ArrowRight, Shield, Share2, Users, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      <header className="px-6 md:px-10 h-20 flex items-center border-b border-slate-900 sticky top-0 z-50 bg-slate-950/50 backdrop-blur-xl">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Video className="h-6 w-6 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase">Nexus</span>
        </Link>
        <nav className="ml-auto hidden md:flex gap-8">
          <Link className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors" href="#">Features</Link>
          <Link className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors" href="#">Security</Link>
          <Link className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors" href="#">Enterprise</Link>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] animate-pulse" />
             <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px] animate-pulse delay-1000" />
          </div>

          <div className="max-w-5xl mx-auto text-center relative space-y-12">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-4">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Next-Gen Video Experience</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500">
              Meetings evolved <br className="hidden md:block" /> for the modern era.
            </h1>

            <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
              Experience crystal-clear video conferencing with Nexus.
              Minimal, secure, and built for high-performance teams.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/lobby" className="w-full sm:w-auto">
                <Button className="w-full h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-lg font-black rounded-2xl shadow-2xl shadow-indigo-600/30 transition-all hover:translate-y-[-4px] active:translate-y-0 uppercase tracking-widest">
                  Start Meeting
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/join" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full h-16 px-10 border-slate-800 text-lg font-black rounded-2xl transition-all hover:bg-slate-900 uppercase tracking-widest">
                  Join with Code
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="max-w-7xl mx-auto px-6 pb-48">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-10 rounded-[3rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm group hover:border-indigo-500/30 transition-all">
              <Users className="h-10 w-10 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black uppercase tracking-tight mb-3">Seamless Teams</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Scale your meetings from 1-on-1s to team huddles with zero friction.</p>
            </div>
            <div className="p-10 rounded-[3rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm group hover:border-indigo-500/30 transition-all">
              <Share2 className="h-10 w-10 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black uppercase tracking-tight mb-3">HD Performance</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Lossless screen sharing and high-fidelity audio, standard on every call.</p>
            </div>
            <div className="p-10 rounded-[3rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm group hover:border-indigo-500/30 transition-all">
              <Shield className="h-10 w-10 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black uppercase tracking-tight mb-3">Privacy First</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Peer-to-Peer architecture ensures your data never touches our servers.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-32 border-t border-slate-900 flex items-center justify-center px-10">
        <div className="max-w-7xl w-full flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2 opacity-50">
            <Video className="h-4 w-4" />
            <span className="font-black text-xs uppercase tracking-widest">Nexus © 2024</span>
          </div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Crafted for the modern web</p>
        </div>
      </footer>
    </div>
  );
}
