import { GoalsView } from "@/components/views/goals";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <GoalsView />
    </PageTransition>
  );
}
