# Follow The Hill

> Follow the money. Follow the votes. Follow the Hill.

Canadian federal political transparency platform — track how every MP votes and who funds their campaigns.

**Live**: [followthehill.ca](https://followthehill.ca)  
**Stack**: Next.js 15 · Supabase · Stripe · Anthropic · Vercel

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/followthehill.git
cd followthehill
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query**
3. Paste and run `supabase/migrations/001_initial_schema.sql`
4. Copy your project URL and keys into `.env.local`

### 4. Seed initial data

```bash
# Seed all current federal MPs
pnpm seed:members

# Seed vote history (takes ~20–30 min for full history — be patient)
pnpm seed:votes

# Ingest Elections Canada donation CSVs
# Download from: https://www.elections.ca/content.aspx?section=fin&dir=oda&document=index&lang=e
mkdir -p scripts/data
pnpm ingest:donations -- --file=./scripts/data/contributions_2023.csv
```

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Data Sources

| Source | What | Format |
|---|---|---|
| [openparliament.ca](https://api.openparliament.ca/) | Votes, MPs, bills | JSON REST API |
| [Elections Canada](https://www.elections.ca/content.aspx?section=fin&dir=oda&document=index&lang=e) | Political contributions 2004+ | CSV bulk download |
| [represent.opennorth.ca](https://represent.opennorth.ca/) | Riding / postal code lookup | JSON REST API |

---

## Build Roadmap

- [x] **Step 1** — Foundation: project setup, schema, env config
- [ ] **Step 2** — Data pipeline: ETL scripts, seed MPs, votes, donations
- [ ] **Step 3** — Core pages: MP directory, profiles, vote explorer, donor explorer
- [ ] **Step 4** — Auth: magic link login, user table, session middleware
- [ ] **Step 5** — Stripe: subscription checkout, webhooks
- [ ] **Step 6** — AI features: gated summaries and analysis
- [ ] **Step 7** — Support flow: "Buy me a coffee" one-time payments
- [ ] **Step 8** — Cron jobs: daily/weekly sync

---

## Architecture

See [followthehill-architecture.md](./followthehill-architecture.md) for the complete system design.

---

## Environment Variables

See `.env.example` for all required variables.

---

## License

MIT
