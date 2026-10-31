import { FamilyView } from "@/components/views/family";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Family" };

export default function Page() {
  return (
    <PageTransition>
      <FamilyView />
    </PageTransition>
  );
}
