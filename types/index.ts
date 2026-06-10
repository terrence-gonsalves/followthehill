// ============================================================
// FollowTheHill — Shared TypeScript Types
// ============================================================

// ── Database schema types (mirrors Supabase tables) ──────────

export type Party =
  | "Liberal"
  | "Conservative"
  | "NDP"
  | "Bloc Québécois"
  | "Green"
  | "Independent"
  | "Other"

export type Province =
  | "AB" | "BC" | "MB" | "NB" | "NL"
  | "NS" | "NT" | "NU" | "ON" | "PE"
  | "QC" | "SK" | "YT"

export type VoteDecision = "yea" | "nay" | "paired" | "absent"
export type VoteResult = "passed" | "failed"
export type SubscriptionStatus = "free" | "active" | "past_due" | "canceled"
export type RecipientType = "party" | "candidate" | "association" | "leadership"

// ── Member ───────────────────────────────────────────────────

export interface Member {
  id: string
  slug: string
  name: string
  party: Party
  riding: string
  province: Province
  photo_url: string | null
  email: string | null
  website: string | null
  parliament_url: string | null
  is_active: boolean
  parliament_num: number | null
  created_at: string
  updated_at: string
}

export interface MemberSummary {
  id: string
  slug: string
  name: string
  party: Party
  riding: string
  province: Province
  photo_url: string | null
  is_active: boolean
}

// ── Vote ─────────────────────────────────────────────────────

export interface Vote {
  id: string
  vote_number: number
  parliament_num: number
  session_num: number
  date: string
  bill_number: string | null
  description: string
  result: VoteResult
  yeas: number
  nays: number
  paired: number
  open_parliament_url: string | null
  created_at: string
}

export interface MemberVote {
  id: string
  member_id: string
  vote_id: string
  decision: VoteDecision
  created_at: string
}

// Vote with member decision attached (for MP profile page)
export interface VoteWithDecision extends Vote {
  decision: VoteDecision
}

// Vote with all members' decisions (for vote detail page)
export interface VoteWithBreakdown extends Vote {
  member_votes: Array<{
    decision: VoteDecision
    member: MemberSummary
  }>
}

// ── Donation ─────────────────────────────────────────────────

export interface Donation {
  id: string
  contributor_name: string
  contributor_type: string | null
  recipient_type: RecipientType
  recipient_name: string
  member_id: string | null
  party: Party | null
  amount: number
  year: number
  riding: string | null
  province: Province | null
  source: string
  created_at: string
}

export interface DonationSummary {
  total_amount: number
  total_count: number
  top_donors: TopDonor[]
  by_year: YearlyDonation[]
  by_type: TypeDonation[]
}

export interface TopDonor {
  contributor_name: string
  contributor_type: string | null
  total_amount: number
  donation_count: number
}

export interface YearlyDonation {
  year: number
  total_amount: number
  donation_count: number
}

export interface TypeDonation {
  contributor_type: string
  total_amount: number
  donation_count: number
}

// ── User ─────────────────────────────────────────────────────

export interface AppUser {
  id: string
  email: string
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  subscription_id: string | null
  plan_id: string | null
  created_at: string
  updated_at: string
}

// ── Supabase Database interface ───────────────────────────────
// Used to type the Supabase client: createClient<Database>()

export interface Database {
  public: {
    Tables: {
      members: {
        Row: Member
        Insert: Omit<Member, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Member, "id" | "created_at">>
      }
      votes: {
        Row: Vote
        Insert: Omit<Vote, "id" | "created_at">
        Update: Partial<Omit<Vote, "id" | "created_at">>
      }
      member_votes: {
        Row: MemberVote
        Insert: Omit<MemberVote, "id" | "created_at">
        Update: Partial<Omit<MemberVote, "id" | "created_at">>
      }
      donations: {
        Row: Donation
        Insert: Omit<Donation, "id" | "created_at">
        Update: Partial<Omit<Donation, "id" | "created_at">>
      }
      users: {
        Row: AppUser
        Insert: Omit<AppUser, "created_at" | "updated_at">
        Update: Partial<Omit<AppUser, "id" | "created_at">>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ── API response wrappers ─────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  error: string
  code?: string
}

// ── Filter/query param types ──────────────────────────────────

export interface MemberFilters {
  search?: string
  party?: Party
  province?: Province
  is_active?: boolean
  page?: number
  per_page?: number
}

export interface VoteFilters {
  parliament?: number
  session?: number
  bill?: string
  result?: VoteResult
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

export interface DonorFilters {
  name?: string
  party?: Party
  year?: number
  min_amount?: number
  max_amount?: number
  contributor_type?: string
  page?: number
  per_page?: number
}

// ── AI feature types ──────────────────────────────────────────

export interface AISummaryRequest {
  member_slug: string
}

export interface AIAnalysisRequest {
  member_slug: string
  topic?: string
  bill_prefix?: string
}

export interface AIDonorInsightRequest {
  member_slug?: string
  party?: Party
}

export interface AIStreamChunk {
  type: "text" | "error" | "done"
  content?: string
  error?: string
}

// ── OpenParliament API types ──────────────────────────────────

export interface OPMember {
  name: string
  slug: string
  current_party: {
    short_name: { en: string }
  }
  current_riding: {
    name: { en: string }
    province: string
  }
  image: string
  url: string
}

export interface OPVote {
  bill: { number: string; session: string } | null
  date: string
  description: { en: string }
  number: number
  parliament_number: number
  result: string
  session_number: number
  url: string
  yea_total: number
  nay_total: number
  paired_total: number
}

export interface OPVoteBallot {
  vote_url: string
  politician_url: string
  ballot: "Y" | "N" | "P" | "A"
}

export interface OPPaginatedResponse<T> {
  objects: T[]
  meta: {
    next: string | null
    previous: string | null
    total_count: number
    limit: number
    offset: number
  }
}
