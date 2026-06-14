/**
 * seed-members.ts
 * Seeds the members table from openparliament.ca
 * Usage: pnpm seed:members
 */
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = "https://api.openparliament.ca";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchMembers(limit: number, offset: number) {
    const url = `${BASE_URL}/politicians/?format=json&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "FollowTheHill/1.0 (followthehill.ca)",
        },
    });

    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);

    return res.json();
}

function extractSlug(url: string): string {

    // "/politicians/pierre-poilievre/" → "pierre-poilievre"
    return url.replace("/politicians/", "").replace(/\/$/, "").trim();
}

async function seedMembers() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("❌ Missing Supabase environment variables in .env.local");
        process.exit(1);
    }

    console.log("🏛️  Seeding members from openparliament.ca...");

    let offset = 0;
    const limit = 50;
    let totalInserted = 0;
    let hasMore = true;

    while (hasMore) {
        const response = await fetchMembers(limit, offset);
        const objects = response.objects ?? [];
        const pagination = response.pagination ?? {};

        if (objects.length === 0) break;

        const rows = objects
            .filter((mp: any) => mp.url && mp.name)
            .map((mp: any) => ({
                slug:           extractSlug(mp.url),
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
                parliament_num: 45,
            }))

        if (rows.length === 0) {
            console.log(`  ⚠ No valid rows at offset ${offset}, skipping`);
        } else {
            const { data, error } = await supabase
              .from("members")
              .upsert(rows, { onConflict: "slug" })
              .select("id");

            if (error) {
                console.error(`❌ Error at offset ${offset}:`, error.message);
                process.exit(1);
            }

            totalInserted += data?.length ?? 0;
            console.log(`  ✓ Offset ${offset}: inserted/updated ${data?.length ?? 0} members`);
        }

        hasMore = !!pagination.next_url;
        offset += limit;

        await sleep(300);
    }

    console.log(`\n✅ Done — total members seeded: ${totalInserted}`);
}

seedMembers().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
})