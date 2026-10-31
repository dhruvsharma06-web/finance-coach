import { ViewTransition } from "react";

/**
 * Wrap every page.tsx in this. Nav links tag navigations as `nav-forward` (moving down the
 * sidebar) or `nav-back` (moving up), and the page rises in / drops back accordingly.
 * Must live in page.tsx — layouts persist, so enter/exit never fire there.
 */
const MAP = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={MAP} exit={MAP} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
