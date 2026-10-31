import { GoalsView } from "@/components/views/goals";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Money model" };

export default function Page() {
  return (
    <PageTransition>
      <GoalsView />
    </PageTransition>
  );
}
