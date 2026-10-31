import { Suspense } from "react";
import { CoachView } from "@/components/views/coach";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <Suspense><CoachView /></Suspense>
    </PageTransition>
  );
}
