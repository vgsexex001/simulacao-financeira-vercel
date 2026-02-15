import { getSettings } from "@/actions/settings-actions";
import { getUserCurrency } from "@/actions/currency-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { DangerZone } from "@/components/settings/danger-zone";
import { ImportData } from "@/components/settings/import-data";
import { CurrencySelector } from "@/components/settings/currency-selector";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [data, currency] = await Promise.all([
    getSettings(),
    getUserCurrency(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie seu perfil, preferências e categorias.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="danger">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm profile={data.profile} />
        </TabsContent>

        <TabsContent value="preferences">
          <div className="space-y-6">
            <PreferencesForm settings={data.settings} />
            <CurrencySelector currentCurrency={currency} />
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesManager
            categories={data.categories}
            incomeSources={data.incomeSources}
          />
        </TabsContent>

        <TabsContent value="import">
          <ImportData />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
