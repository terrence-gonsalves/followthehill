/**
 * ingest-donations.ts
 * Ingests Elections Canada contribution CSV files into Supabase.
 *
 * Usage: pnpm ingest:donations -- --file=./scripts/data/contributions_2023.csv
 *
 * Download CSVs from:
 * https://www.elections.ca/content.aspx?section=fin&dir=oda&document=index&lang=e
 */
import { createClient } from "@supabase/supabase-js"
import { parseElectionsCanadaCSV } from "../lib/elections-canada/ingest"
import type { Database, Donation } from "../types"

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 500

async function ingestDonations() {
  const args = process.argv.slice(2)
  const fileArg = args.find((a) => a.startsWith("--file="))
  const filePath = fileArg?.replace("--file=", "")

  if (!filePath) {
    console.error("Usage: pnpm ingest:donations -- --file=./scripts/data/your-file.csv")
    process.exit(1)
  }

  console.log(`💰 Ingesting donations from: ${filePath}`)

  // Parse CSV
  const records = await parseElectionsCanadaCSV(filePath)
  console.log(`  ℹ️  Parsed ${records.length} records`)

  // Load member name → id map for linking donations to MPs
  const { data: members } = await supabase.from("members").select("id, name, riding")
  const memberMap = new Map(
    members?.map((m) => [m.name.toLowerCase(), m.id]) ?? []
  )

  // Attempt to match donations to members by recipient name
  const rows: Omit<Donation, "id" | "created_at">[] = records
    .filter((r) => r.amount && r.amount > 0 && r.contributor_name)
    .map((r) => {
      const recipientLower = (r.recipient_name ?? "").toLowerCase()
      const memberId = memberMap.get(recipientLower) ?? null

      return {
        contributor_name: r.contributor_name!,
        contributor_type: r.contributor_type ?? null,
        recipient_type:   r.recipient_type ?? "candidate",
        recipient_name:   r.recipient_name ?? "",
        member_id:        memberId,
        party:            null, // enriched in a later step
        amount:           r.amount!,
        year:             r.year!,
        riding:           r.riding ?? null,
        province:         r.province ?? null,
        source:           "elections_canada",
      }
    })

  // Insert in batches
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error, count } = await supabase
      .from("donations")
      .insert(batch)
      .select("id", { count: "exact" })

    if (error) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} error:`, error.message)
    } else {
      inserted += count ?? 0
      console.log(`  ✓ Batch ${i / BATCH_SIZE + 1}: inserted ${count}`)
    }
  }

  console.log(`\n✅ Done — total donations ingested: ${inserted} / ${rows.length}`)
}

ingestDonations().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
