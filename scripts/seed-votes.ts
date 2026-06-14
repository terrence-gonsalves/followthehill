/**
 * seed-votes.ts
 * Seeds votes table from openparliament.ca (full history)
 * Note: member_votes (individual ballots) are not seeded in MVP.
 * Usage: pnpm seed:votes
 */
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = "https://api.openparliament.ca";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchVotes(limit: number, offset: number) {
    const url = `${BASE_URL}/votes/?format=json&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "FollowTheHill/1.0 (followthehill.ca)",
        },
    });

    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);

    return res.json();
}

function parseBillNumber(billUrl: string | null | undefined): string | null {
    if (!billUrl) return null;

    const parts = billUrl.split("/").filter(Boolean);

    return parts[parts.length - 1] ?? null;
}

async function seedVotes() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("❌ Missing Supabase environment variables in .env.local");
        process.exit(1);
    }

    console.log("🗳️  Seeding votes from openparliament.ca (full history)...");
    console.log("   Individual MP ballots will be added in a future step.\n");

    let offset = 0;
    const limit = 50;
    let totalVotes = 0;
    let hasMore = true;

    while (hasMore) {
        const response   = await fetchVotes(limit, offset);
        const objects    = response.objects   ?? [];
        const pagination = response.pagination ?? {};

        if (objects.length === 0) break;

        const voteRows = objects.map((v: any) => {
            const [parliamentNum, sessionNum] = (v.session ?? "45-1").split("-").map(Number);

            return {
                vote_number:         v.number,
                parliament_num:      parliamentNum,
                session_num:         sessionNum,
                date:                v.date,
                bill_number:         parseBillNumber(v.bill_url),
                description:         v.description?.en ?? v.description ?? "",
                result:              v.result?.toLowerCase() === "passed" ? "passed" : "failed",
                yeas:                v.yea_total    ?? 0,
                nays:                v.nay_total    ?? 0,
                paired:              v.paired_total ?? 0,
                open_parliament_url: `https://openparliament.ca${v.url}`,
            };
        });

        const { data: insertedVotes, error: voteError } = await supabase
            .from("votes")
            .upsert(voteRows, { onConflict: "vote_number,parliament_num,session_num" })
            .select("id");

        if (voteError) {
            console.error(`  ⚠ Vote insert error at offset ${offset}:`, voteError.message);
        } else {
            totalVotes += insertedVotes?.length ?? 0;
            console.log(`  ✓ Offset ${offset}: ${insertedVotes?.length ?? 0} votes | ${totalVotes.toLocaleString()} total`);
        }

        hasMore = !!pagination.next_url;
        offset += limit;
        await sleep(300);
    }

    console.log(`\n✅ Done! Total votes seeded: ${totalVotes.toLocaleString()}`);
}

seedVotes().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
})