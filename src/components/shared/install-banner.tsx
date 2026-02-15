"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export function InstallBanner() {
  const { isInstallable, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-20 inset-x-4 z-40 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-semibold">Instalar FinPulse</p>
          <p className="text-xs text-muted-foreground">
            Acesse rapidamente pela tela inicial
          </p>
        </div>
        <Button size="sm" onClick={install}>
          <Download className="mr-1 h-4 w-4" />
          Instalar
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
