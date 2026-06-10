/**
 * seed-members.ts
 * Seeds the members table from openparliament.ca
 *
 * Usage: pnpm seed:members
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js"
import { openParliament } from "../lib/openparliament/client"
import type { Database, Member } from "../types"

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role bypasses RLS for seeding
)

async function seedMembers() {
  console.log("🏛️  Seeding members from openparliament.ca...")

  let offset = 0
  const limit = 50
  let totalInserted = 0

  while (true) {
    const response = await openParliament.getMembers(limit, offset)
    const { objects, meta } = response

    if (objects.length === 0) break

    const rows: Omit<Member, "id" | "created_at" | "updated_at">[] = objects.map((mp) => ({
      slug:           mp.slug,
      name:           mp.name,
      party:          mp.current_party?.short_name?.en ?? "Independent",
      riding:         mp.current_riding?.name?.en ?? "",
      province:       mp.current_riding?.province ?? "",
      photo_url:      mp.image
        ? `https://www.ourcommons.ca${mp.image}`
        : null,
      email:          null,
      website:        null,
      parliament_url: `https://www.ourcommons.ca${mp.url}`,
      is_active:      true,
      parliament_num: 45, // Update this to current parliament
    }))

    const { error, count } = await supabase
      .from("members")
      .upsert(rows, { onConflict: "slug" })
      .select("id", { count: "exact" })

    if (error) {
      console.error("❌ Error inserting members:", error.message)
      process.exit(1)
    }

    totalInserted += count ?? 0
    console.log(`  ✓ Offset ${offset}: inserted/updated ${count} members`)

    if (!meta.next) break
    offset += limit
  }

  console.log(`\n✅ Done — total members seeded: ${totalInserted}`)
}

seedMembers().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
