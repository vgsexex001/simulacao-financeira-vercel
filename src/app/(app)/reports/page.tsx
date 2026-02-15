import { getMonthlyReport } from "@/actions/report-actions";
import { ReportViewer } from "@/components/reports/report-viewer";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  const now = new Date();
  const initialReport = await getMonthlyReport(
    now.getMonth() + 1,
    now.getFullYear()
  );

  return (
    <div className="space-y-6">
      <ReportViewer initialReport={initialReport} />
    </div>
  );
}
