import { Suspense } from "react";
import { TransactionsView } from "@/components/views/transactions";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <Suspense><TransactionsView /></Suspense>
    </PageTransition>
  );
}
