"use client";
import { useToast, Toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export function Toaster({ toasts }: { toasts: any[] }) {
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 w-full max-w-[320px] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto p-4 rounded-xl border shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-full duration-300",
            t.variant === 'destructive' ? "bg-red-500/10 border-red-500/20 text-red-500" :
            t.variant === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
            "bg-slate-900 border-slate-800 text-slate-200"
          )}
        >
          {t.variant === 'destructive' ? <AlertCircle className="h-5 w-5 shrink-0" /> :
           t.variant === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> :
           <Info className="h-5 w-5 shrink-0 text-indigo-400" />}
          <div className="flex-1">
            <h3 className="text-sm font-bold leading-none mb-1">{t.title}</h3>
            {t.description && <p className="text-[11px] opacity-80 leading-tight">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
