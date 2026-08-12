"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed inset-x-4 bottom-16 z-40 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-slate-800 px-4 py-3 shadow-lg md:bottom-4">
      <div className="text-sm">
        <div className="font-medium text-white">Pasang Taskflow</div>
        <div className="text-xs text-slate-400">Akses cepat dari layar utama HP</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setVisible(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700"
        >
          Nanti
        </button>
        <button
          onClick={async () => {
            await deferred.prompt();
            setVisible(false);
          }}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Pasang
        </button>
      </div>
    </div>
  );
}
