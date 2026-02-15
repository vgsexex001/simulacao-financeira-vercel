"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold">Sem conexão</h1>
      <p className="mt-2 text-muted-foreground max-w-sm">
        Você está offline. Verifique sua conexão com a internet e tente
        novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-lg bg-primary px-6 py-2 text-primary-foreground font-medium"
      >
        Tentar novamente
      </button>
    </div>
  );
}
