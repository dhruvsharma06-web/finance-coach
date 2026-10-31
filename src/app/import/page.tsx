import { Suspense } from "react";
import { ImportView } from "@/components/views/import";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Import" };

export default function Page() {
  return (
    <PageTransition>
      <Suspense>
        <ImportView />
      </Suspense>
    </PageTransition>
  );
}
