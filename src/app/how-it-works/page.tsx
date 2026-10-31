import { HowItWorksView } from "@/components/views/how-it-works";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "How Kosh works" };

export default function Page() {
  return (
    <PageTransition>
      <HowItWorksView />
    </PageTransition>
  );
}
