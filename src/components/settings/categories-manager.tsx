"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createIncomeSource,
  deleteIncomeSource,
} from "@/actions/settings-actions";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Tag,
  Wallet,
} from "lucide-react";

interface CategoriesManagerProps {
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    isDefault: boolean;
  }>;
  incomeSources: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  }>;
}

export function CategoriesManager({
  categories,
  incomeSources,
}: CategoriesManagerProps) {
  const router = useRouter();

  // Category state
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#3b82f6");
  const [catLoading, setCatLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");
  const [editCatLoading, setEditCatLoading] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCatLoading, setDeleteCatLoading] = useState(false);

  // Income source state
  const [newSourceName, setNewSourceName] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const [deleteSourceLoading, setDeleteSourceLoading] = useState(false);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }

    setCatLoading(true);
    try {
      const result = await createCategory({
        name: newCatName.trim(),
        color: newCatColor,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Categoria criada");
        setNewCatName("");
        setNewCatColor("#3b82f6");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao criar categoria");
    } finally {
      setCatLoading(false);
    }
  }

  function startEditCategory(cat: { id: string; name: string; color: string | null }) {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color || "#3b82f6");
  }

  async function handleSaveEditCategory() {
    if (!editingCatId || !editCatName.trim()) return;

    setEditCatLoading(true);
    try {
      const result = await updateCategory(editingCatId, {
        name: editCatName.trim(),
        color: editCatColor,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Categoria atualizada");
        setEditingCatId(null);
        router.refresh();
      }
    } catch {
      toast.error("Erro ao atualizar categoria");
    } finally {
      setEditCatLoading(false);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteCatId) return;

    setDeleteCatLoading(true);
    try {
      const result = await deleteCategory(deleteCatId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Categoria removida");
        setDeleteCatId(null);
        router.refresh();
      }
    } catch {
      toast.error("Erro ao remover categoria");
    } finally {
      setDeleteCatLoading(false);
    }
  }

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim()) {
      toast.error("Informe o nome da fonte");
      return;
    }

    setSourceLoading(true);
    try {
      const result = await createIncomeSource({ name: newSourceName.trim() });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Fonte de renda criada");
        setNewSourceName("");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao criar fonte de renda");
    } finally {
      setSourceLoading(false);
    }
  }

  async function handleDeleteSource() {
    if (!deleteSourceId) return;

    setDeleteSourceLoading(true);
    try {
      const result = await deleteIncomeSource(deleteSourceId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Fonte de renda removida");
        setDeleteSourceId(null);
        router.refresh();
      }
    } catch {
      toast.error("Erro ao remover fonte de renda");
    } finally {
      setDeleteSourceLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Categorias de despesa</CardTitle>
              <CardDescription>
                Gerencie suas categorias para organizar gastos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category list */}
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                {editingCatId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="color"
                      value={editCatColor}
                      onChange={(e) => setEditCatColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border-0"
                    />
                    <Input
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveEditCategory}
                      disabled={editCatLoading}
                    >
                      {editCatLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingCatId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: cat.color || "#64748b" }}
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditCategory(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteCatId(cat.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Add new category */}
          <form onSubmit={handleAddCategory} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Nova categoria</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border-0"
                />
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1"
                />
              </div>
            </div>
            <Button type="submit" size="icon" disabled={catLoading}>
              {catLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Income Sources */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Fontes de renda</CardTitle>
              <CardDescription>
                Gerencie suas fontes de receita.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sources list */}
          <div className="space-y-2">
            {incomeSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <span className="text-sm font-medium">{source.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteSourceId(source.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Add new source */}
          <form onSubmit={handleAddSource} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Nova fonte de renda</Label>
              <Input
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="Ex: Freelance, Aluguel..."
              />
            </div>
            <Button type="submit" size="icon" disabled={sourceLoading}>
              {sourceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Category Confirmation */}
      <Dialog open={!!deleteCatId} onOpenChange={(open) => !open && setDeleteCatId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover categoria</DialogTitle>
            <DialogDescription>
              A categoria será desativada. Despesas existentes com essa categoria
              não serão afetadas, mas você não poderá usá-la para novas despesas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCatId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={deleteCatLoading}
            >
              {deleteCatLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Source Confirmation */}
      <Dialog
        open={!!deleteSourceId}
        onOpenChange={(open) => !open && setDeleteSourceId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover fonte de renda</DialogTitle>
            <DialogDescription>
              A fonte será desativada. Receitas existentes com essa fonte
              não serão afetadas, mas você não poderá usá-la para novas receitas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSourceId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSource}
              disabled={deleteSourceLoading}
            >
              {deleteSourceLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
