/**
 * seed-votes.ts
 * Seeds votes + member_votes from openparliament.ca
 * WARNING: This takes a while for historical data — run once per parliament.
 *
 * Usage: pnpm seed:votes
 */
import { createClient } from "@supabase/supabase-js"
import { openParliament } from "../lib/openparliament/client"
import type { Database, Vote, MemberVote } from "../types"

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate limit helper — be polite to openparliament.ca
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function seedVotes() {
  console.log("🗳️  Seeding votes from openparliament.ca...")

  // 1. Get all member slugs → id map
  const { data: members } = await supabase
    .from("members")
    .select("id, slug")
  const memberMap = new Map(members?.map((m) => [m.slug, m.id]) ?? [])
  console.log(`  ℹ️  Loaded ${memberMap.size} members`)

  let offset = 0
  const limit = 50
  let totalVotes = 0

  while (true) {
    const response = await openParliament.getVotes(undefined, undefined, limit, offset)
    const { objects, meta } = response

    if (objects.length === 0) break

    // Insert votes
    const voteRows: Omit<Vote, "id" | "created_at">[] = objects.map((v) => ({
      vote_number:         v.number,
      parliament_num:      v.parliament_number,
      session_num:         v.session_number,
      date:                v.date,
      bill_number:         v.bill?.number ?? null,
      description:         v.description?.en ?? "",
      result:              v.result?.toLowerCase().includes("agreed") ? "passed" : "failed",
      yeas:                v.yea_total,
      nays:                v.nay_total,
      paired:              v.paired_total,
      open_parliament_url: `https://openparliament.ca${v.url}`,
    }))

    const { data: insertedVotes, error: voteError } = await supabase
      .from("votes")
      .upsert(voteRows, { onConflict: "vote_number,parliament_num,session_num" })
      .select("id, vote_number, parliament_num, session_num")

    if (voteError) {
      console.error("❌ Vote insert error:", voteError.message)
      continue
    }

    totalVotes += insertedVotes?.length ?? 0

    // Fetch ballots for each vote and insert member_votes
    for (const vote of objects) {
      const dbVote = insertedVotes?.find(
        (v) =>
          v.vote_number === vote.number &&
          v.parliament_num === vote.parliament_number &&
          v.session_num === vote.session_number
      )
      if (!dbVote) continue

      await sleep(200) // polite delay
      const { objects: ballots } = await openParliament.getVoteBallots(
        vote.parliament_number,
        vote.session_number,
        vote.number
      )

      const ballotRows: Omit<MemberVote, "id" | "created_at">[] = ballots
        .map((b) => {
          const slug = b.politician_url.replace("/politicians/", "").replace("/", "")
          const memberId = memberMap.get(slug)
          if (!memberId) return null

          const decision =
            b.ballot === "Y" ? "yea" :
            b.ballot === "N" ? "nay" :
            b.ballot === "P" ? "paired" : "absent"

          return { member_id: memberId, vote_id: dbVote.id, decision }
        })
        .filter((r): r is Omit<MemberVote, "id" | "created_at"> => r !== null)

      if (ballotRows.length > 0) {
        await supabase
          .from("member_votes")
          .upsert(ballotRows, { onConflict: "member_id,vote_id" })
      }
    }

    console.log(`  ✓ Offset ${offset}: seeded ${objects.length} votes`)

    if (!meta.next) break
    offset += limit
    await sleep(500) // polite delay between pages
  }

  console.log(`\n✅ Done — total votes seeded: ${totalVotes}`)
}

seedVotes().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
