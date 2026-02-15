import { getJarData } from "@/actions/jar-actions";
import { JarGrid } from "@/components/jars/jar-grid";
import { RulesEditor } from "@/components/jars/rules-editor";
import { AllocationModal } from "@/components/jars/allocation-modal";

export const metadata = { title: "Jarros" };

export default async function JarsPage() {
  const data = await getJarData();

  return (
    <div className="space-y-6">
      <JarGrid
        jarRules={data.jarRules}
        jarBalances={data.jarBalances}
        totalIncome={data.totalIncome}
      />

      <RulesEditor jarRules={data.jarRules} />

      <AllocationModal
        jarRules={data.jarRules}
        totalIncome={data.totalIncome}
      />
    </div>
  );
}
