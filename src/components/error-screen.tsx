"use client";
import { Button } from "@/components/ui";
export function ErrorScreen({ missing = false }: { missing?: boolean }) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col justify-center px-6 py-20 text-ink">
      <p className="mb-12 font-display text-3xl">Kosh.</p>
      <h1 className="font-display text-5xl leading-tight sm:text-6xl">
        {missing ? "This page wandered off" : "Something went wrong"}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">
        {missing
          ? "Let’s get you back to your money model."
          : "Your request could not be completed. Head home and try again."}
      </p>
      <form action="/" method="get" className="mt-8 self-start">
        <Button type="submit" variant="primary" size="lg">
          Back to Kosh
        </Button>
      </form>
    </main>
  );
}
