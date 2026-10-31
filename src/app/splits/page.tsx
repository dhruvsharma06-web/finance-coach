import { SplitsView } from "@/components/views/splits";
import { PageTransition } from "@/components/page-transition";

export const metadata = { title: "Splits" };

export default function Page() {
  return (
    <PageTransition>
      <SplitsView />
    </PageTransition>
  );
}
