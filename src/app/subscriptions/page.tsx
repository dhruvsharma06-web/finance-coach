import { RecurringView } from "@/components/views/recurring";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <RecurringView />
    </PageTransition>
  );
}
