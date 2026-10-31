import { ReportView } from "@/components/views/report";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <ReportView />
    </PageTransition>
  );
}
