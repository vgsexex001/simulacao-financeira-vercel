import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="text-7xl font-bold text-muted-foreground/30">404</div>
      <h2 className="mt-4 text-xl font-bold">Página não encontrada</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        A página que você procura não existe ou foi movida.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
