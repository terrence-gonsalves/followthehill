/**
 * ingest-donations.ts
 * Streams the Elections Canada contributions CSV into Supabase.
 * Usage: pnpm ingest:donations
 * File expected at: scripts/data/od_cntrbtn_audt_e.csv
 */
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const CSV_PATH  = path.resolve(process.cwd(), "scripts/data/od_cntrbtn_audt_e.csv");
const BATCH_SIZE = 100;
const LOG_EVERY = 5000;

interface ECRow {
    "Political Entity":             string
    "Recipient":                    string
    "Political Party of Recipient": string
    "Electoral District":           string
    "Fiscal/Election date":         string
    "Contributor type":             string
    "Contributor name":             string
    "Contributor last name":        string
    "Contributor first name":       string
    "Contributor Province":         string
    "Monetary amount":              string
    "Non-Monetary amount":          string
}

function normalizeRecipientType(entityType: string): string {
    const val = entityType.toLowerCase().trim();

    if (val.includes("candidate")) return "candidate";
    if (val.includes("party")) return "party";
    if (val.includes("association")) return "association";
    if (val.includes("leadership")) return "leadership";

    return "candidate";
}

function parseAmount(raw: string): number {
    const cleaned = raw.replace(/[$,\s]/g, "").trim();
    const val = parseFloat(cleaned);

    return isNaN(val) ? 0 : val;
}

function extractYear(dateStr: string): number | null {
    if (!dateStr) return null;

    const match = dateStr.match(/(\d{4})/);

    return match ? parseInt(match[1], 10) : null;
}

function normalizeProvince(raw: string): string | null {
    const val = raw?.trim().toUpperCase();
    const valid = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];

    return valid.includes(val) ? val : null;
}

async function ingestDonations() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("❌ Missing Supabase environment variables in .env.local");

        process.exit(1);
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("💰 FollowTheHill — Elections Canada Donation Ingest");
    console.log(`   File: ${CSV_PATH}`);
    console.log(`   Batch size: ${BATCH_SIZE}\n`);

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ File not found: ${CSV_PATH}`);
        console.error("   Place od_cntrbtn_audt_e.csv in scripts/data/ and try again.");

        process.exit(1);
    }

    // load member name → id map for linking donations to MPs
    console.log("  Loading members for name matching...");
    const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id, name");

    if (membersError) {
        console.error("❌ Could not load members:", membersError.message);

        process.exit(1);
    }

    const memberMap = new Map<string, string>();
    
    for (const m of members ?? []) {
        memberMap.set(m.name.toLowerCase().trim(), m.id);
    }

    console.log(`  ✓ Loaded ${memberMap.size} members for matching\n`);

    let rowsRead = 0;
    let rowsInserted = 0;
    let rowsSkipped = 0;
    let batch: object[] = [];
    const startTime  = Date.now()

    const insertBatch = async (rows: object[]): Promise<number> => {
        const { data, error } = await supabase
            .from("donations")
            .insert(rows)
            .select("id");

        if (error) {
            console.error(`  ⚠ Batch insert error: ${error.message}`);
            return 0;
        }
        return data?.length ?? 0;
    }

    return new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(CSV_PATH, { encoding: "utf8" });

        const parser = parse({
            columns: (headers: string[]) =>
                headers.map((h, i) => (i === 0 ? h.replace(/^\uFEFF/, "") : h)),
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
            relax_column_count: true,
        });

      parser.on("readable", async () => {
          parser.pause();
          let record: ECRow;

          while ((record = parser.read()) !== null) {
              rowsRead++;

              const monetaryAmount    = parseAmount(record["Monetary amount"]     ?? "");
              const nonMonetaryAmount = parseAmount(record["Non-Monetary amount"] ?? "");
              const totalAmount       = monetaryAmount + nonMonetaryAmount;

              if (totalAmount <= 0) { rowsSkipped++; continue; }

              const year = extractYear(record["Fiscal/Election date"] ?? "");

              if (!year || year < 2004) { rowsSkipped++; continue; }

              const contributorName = (
                  record["Contributor name"] ||
                  [record["Contributor first name"], record["Contributor last name"]]
                      .filter(Boolean).join(" ")
              ).trim();

              if (!contributorName) { rowsSkipped++; continue };

              const recipientName = record["Recipient"]?.trim() ?? "";
              const memberId      = memberMap.get(recipientName.toLowerCase()) ?? null;

              batch.push({
                  contributor_name: contributorName,
                  contributor_type: record["Contributor type"]?.trim() || null,
                  recipient_type: normalizeRecipientType(record["Political Entity"] ?? ""),
                  recipient_name: recipientName,
                  member_id: memberId,
                  party: record["Political Party of Recipient"]?.trim() || null,
                  amount: totalAmount,
                  year,
                  riding: record["Electoral District"]?.trim() || null,
                  province: normalizeProvince(record["Contributor Province"] ?? ""),
                  source: "elections_canada",
              });

              if (batch.length >= BATCH_SIZE) {
                  const inserted = await insertBatch(batch);

                  rowsInserted += inserted;
                  batch = [];

                  await new Promise((r) => setTimeout(r, 50)); // small breathing room
              }

            if (rowsRead % LOG_EVERY === 0) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                const rate    = Math.round(rowsRead / ((Date.now() - startTime) / 1000));

                console.log(
                    `  ⏳ ${rowsRead.toLocaleString()} read | ` +
                    `${rowsInserted.toLocaleString()} inserted | ` +
                    `${rowsSkipped.toLocaleString()} skipped | ` +
                    `${rate.toLocaleString()} rows/sec | ${elapsed}s`
                );
            }
          }

          parser.resume();
      })

      parser.on("end", async () => {
          if (batch.length > 0) {
              const inserted = await insertBatch(batch);
              rowsInserted += inserted;
          }

          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

          console.log("\n✅ Ingest complete!");
          console.log(`   Rows read:     ${rowsRead.toLocaleString()}`);
          console.log(`   Rows inserted: ${rowsInserted.toLocaleString()}`);
          console.log(`   Rows skipped:  ${rowsSkipped.toLocaleString()}`);
          console.log(`   Time elapsed:  ${elapsed} minutes`);

          resolve();
      })

      parser.on("error", (err) => {
          console.error("❌ CSV parse error:", err.message);
          reject(err);
      })

      stream.pipe(parser);
    })
}

ingestDonations().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});