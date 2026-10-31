import { OverviewView } from "@/components/views/overview";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <OverviewView />
    </PageTransition>
  );
}
