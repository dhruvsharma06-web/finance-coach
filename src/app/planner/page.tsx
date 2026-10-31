import { Suspense } from "react";
import { PlannerView } from "@/components/views/planner";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "What if" };

export default function Page() {
  return (
    <PageTransition>
      <Suspense><PlannerView /></Suspense>
    </PageTransition>
  );
}
