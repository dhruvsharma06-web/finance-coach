import { ImportView } from "@/components/views/import";
import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <ImportView />
    </PageTransition>
  );
}
