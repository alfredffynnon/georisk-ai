import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-6xl">
            GeoRisk AI — coming soon
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Mapping tomorrow&apos;s geopolitical and climate risk signals with
            clarity, speed, and rigor.
          </p>
        </div>
        <Button variant="secondary" disabled>
          Private preview
        </Button>
      </section>
    </main>
  );
}
