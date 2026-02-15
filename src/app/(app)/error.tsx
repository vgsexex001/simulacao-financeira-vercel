"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="text-xl font-bold">Algo deu errado</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ocorreu um erro inesperado. Tente novamente ou volte para o dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline">
          Tentar novamente
        </Button>
        <Button onClick={() => (window.location.href = "/dashboard")}>
          Ir para Dashboard
        </Button>
      </div>
    </div>
  );
}
