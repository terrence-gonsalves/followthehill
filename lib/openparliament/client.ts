// OpenParliament.ca API client
// Docs: https://api.openparliament.ca/
import type { OPMember, OPVote, OPVoteBallot, OPPaginatedResponse } from "@/types"

const BASE_URL = "https://api.openparliament.ca"

const headers = {
  "Accept": "application/json",
  "User-Agent": "FollowTheHill/1.0 (followthehill.ca)",
}

async function fetchOP<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set("format", "json")
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), { headers, next: { revalidate: 3600 } })

  if (!res.ok) {
    throw new Error(`OpenParliament API error: ${res.status} ${res.statusText} for ${url}`)
  }

  return res.json()
}

export const openParliament = {
  /** Get all current MPs */
  getMembers(limit = 50, offset = 0) {
    return fetchOP<OPPaginatedResponse<OPMember>>("/politicians/", {
      limit: String(limit),
      offset: String(offset),
    })
  },

  /** Get a single MP by slug */
  getMember(slug: string) {
    return fetchOP<OPMember>(`/politicians/${slug}/`)
  },

  /** Get votes, optionally filtered by parliament/session */
  getVotes(parliament?: number, session?: number, limit = 50, offset = 0) {
    const params: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
    }
    if (parliament) params.parliament_number = String(parliament)
    if (session)    params.session_number    = String(session)
    return fetchOP<OPPaginatedResponse<OPVote>>("/votes/", params)
  },

  /** Get all ballots for a specific vote */
  getVoteBallots(parliament: number, session: number, voteNumber: number) {
    return fetchOP<OPPaginatedResponse<OPVoteBallot>>(
      `/votes/${parliament}-${session}/${voteNumber}/ballots/`,
      { limit: "350" } // max MPs in a parliament
    )
  },
}
