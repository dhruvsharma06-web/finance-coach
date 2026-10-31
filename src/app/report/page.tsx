import { ReportView } from "@/components/views/report";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Monthly review" };

export default function Page() {
  return (
    <PageTransition>
      <ReportView />
    </PageTransition>
  );
}
