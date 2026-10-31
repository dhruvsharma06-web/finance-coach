# Kosh landing and entry flow

Scope: new landing at `/`, existing overview at `/dashboard`, existing passcode login extended with explicit shared-demo entry and sign-out. No financial model or dashboard redesign.

Skills applied: Taste, Impeccable, Emil Design Engineering. Taste direction: The printed annual, seed 1808790480; incumbent palette and typography retained. Idea: scattered statements become a three-dimensional ledger as the visitor scrolls. Live interaction: deterministic contribution-to-goal slider. Product examples are illustrative and labelled; no sourced photographs, stock footage, or generated bitmap assets.

Design authority: `src/app/globals.css` remains unchanged. The landing uses the existing Instrument Serif/Geist families and paper, ink, marigold tokens. New CSS is prefixed `koshLanding_` because the existing Tailwind Turbopack rule emits global CSS. No dependencies added.

Validation:
- Final `npm run build`: passed.
- Focused ESLint and `git diff --check`: passed.
- Impeccable detector: no findings.
- Browser: demo entry, dashboard, signed session, sign-out, protected redirect, external redirect rejection, range calculation and reduced motion passed; recorded runtime exceptions: none.
- Isolated production server: invalid and valid passcodes, plus protection after logout passed with a temporary verification passcode.
- Responsive inspector: zero failures at 1440/768/390px, with explicit allowances for product diagrams instead of photography/footage, preserved brand palette, and the editorial text axis. Three nonblocking warnings: mixed numeric/unit typography in the interactive calculator, type scale count, and deliberately left-aligned closing statement.
- Phone story start/midpoint/end at 390×844 and 390×667: chapter and rear sheet separated, no horizontal overflow. Reduced-motion/light and mobile login captures inspected.
- Independent reviewer: ship for the corrected mobile overlap; responsive composition 8/10, overall craft 8/10 at reviewed scope.

Authentication preserves the existing single shared workspace and passcode system. With no passcode configured, the entry screen explicitly offers a shared demo, rather than a personal account. Existing no-key demo APIs remain usable.
