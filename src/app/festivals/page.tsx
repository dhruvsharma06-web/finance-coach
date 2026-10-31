import { FestivalsView } from "@/components/views/festivals";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Festivals" };

export default function Page() {
  return (
    <PageTransition>
      <FestivalsView />
    </PageTransition>
  );
}
