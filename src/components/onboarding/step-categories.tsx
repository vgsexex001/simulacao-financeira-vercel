"use client";

import { useOnboarding } from "@/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tags, Plus, X } from "lucide-react";
import { useState } from "react";

export function StepCategories() {
  const { categories, setCategories } = useOnboarding();
  const [newCat, setNewCat] = useState("");

  function addCategory() {
    if (newCat.trim() && !categories.some((c) => c.name === newCat.trim())) {
      setCategories([
        ...categories,
        { name: newCat.trim(), icon: "Tag", color: "#6366f1" },
      ]);
      setNewCat("");
    }
  }

  function removeCategory(name: string) {
    setCategories(categories.filter((c) => c.name !== name));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-primary" />
          Categorias de despesa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Categorias padrão já inclusas. Adicione ou remova conforme precisar.
        </p>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat.name}
              variant="secondary"
              className="gap-1 px-3 py-1.5 text-sm"
              style={{ borderColor: cat.color, borderWidth: 1 }}
            >
              {cat.name}
              <button
                onClick={() => removeCategory(cat.name)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Nova categoria"
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <Button variant="outline" onClick={addCategory}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
