"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAccount } from "@/actions/settings-actions";
import { logoutUser } from "@/actions/auth-actions";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Download, Trash2 } from "lucide-react";

export function DangerZone() {
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  async function handleExportData() {
    setExportLoading(true);
    try {
      // Fetch all settings data as a simple export
      const response = await fetch("/api/export", { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finpulse-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Dados exportados com sucesso");
      } else {
        toast.error("Erro ao exportar dados");
      }
    } catch {
      toast.error("Erro ao exportar dados");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmText !== "EXCLUIR") {
      toast.error("Digite EXCLUIR para confirmar");
      return;
    }

    setDeleteLoading(true);
    try {
      const result = await deleteAccount();
      if (result.error) {
        toast.error(result.error);
      } else {
        await logoutUser();
        toast.success("Conta excluída com sucesso");
        router.push("/login");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao excluir conta");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Exportar dados</CardTitle>
              <CardDescription>
                Baixe uma cópia de todos os seus dados em formato JSON.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar todos os dados
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam permanentemente sua conta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Ao excluir sua conta, todos os seus dados serão permanentemente
            removidos, incluindo transações, categorias, metas e configurações.
            Esta ação não pode ser desfeita.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir minha conta
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Excluir conta permanentemente
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os seus dados serão permanentemente
              excluídos. Digite <strong>EXCLUIR</strong> abaixo para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirmDelete">Confirmação</Label>
            <Input
              id="confirmDelete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Digite "EXCLUIR"'
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmText("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading || confirmText !== "EXCLUIR"}
            >
              {deleteLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
