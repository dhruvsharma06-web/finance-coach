import { Suspense } from "react";
import { WrappedView } from "@/components/views/wrapped";

export const metadata = { title: "Your month, wrapped" };

export default function Page() {
  return (
    <Suspense>
      <WrappedView />
    </Suspense>
  );
}
