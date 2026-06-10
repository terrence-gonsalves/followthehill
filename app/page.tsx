export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-hill-hero">
      <div className="text-center max-w-2xl px-6">
        <h1 className="font-display text-display-xl text-hill-ink mb-4">
          FollowTheHill
        </h1>
        <div className="w-10 h-[3px] bg-hill-red mx-auto mb-6" />
        <p className="font-sans text-xl text-hill-slate">
          Follow the money. Follow the votes. Follow the Hill.
        </p>
        <p className="font-sans text-sm text-hill-slate mt-8 opacity-60">
          Step 1 complete — foundation scaffolded ✓
        </p>
      </div>
    </main>
  )
}
