// Anthropic prompt templates for all AI features
import type { Member, VoteWithDecision, DonationSummary } from "@/types"

/**
 * Generate a prompt for summarizing an MP's voting + donor profile.
 */
export function buildMPSummaryPrompt(
  member: Member,
  recentVotes: VoteWithDecision[],
  donationSummary: DonationSummary
): string {
  const voteLines = recentVotes
    .slice(0, 50)
    .map(
      (v) =>
        `- [${v.decision.toUpperCase()}] ${v.date} | ${v.bill_number || "Motion"}: ${v.description} (${v.result})`
    )
    .join("\n")

  const donorLines = donationSummary.top_donors
    .slice(0, 15)
    .map((d) => `- ${d.contributor_name} (${d.contributor_type || "unknown"}): $${d.total_amount.toLocaleString()}`)
    .join("\n")

  return `You are a non-partisan Canadian political analyst writing for a transparency platform.
Your audience includes journalists, researchers, and informed citizens.

Analyze the following data about an MP and provide a factual, structured summary.

## MP
Name: ${member.name}
Party: ${member.party}
Riding: ${member.riding}, ${member.province}

## Recent Voting Record (last 50 votes)
${voteLines}

## Donor Profile (top donors by total amount)
Total raised: $${donationSummary.total_amount.toLocaleString()}
${donorLines}

## Your Task
Write a 3–4 paragraph factual summary covering:
1. Overall voting alignment with their party — estimate the % votes with party vs. against
2. Notable bills or topics where they broke from their party, if any
3. Top donor industries/categories and any concentration patterns
4. Any noteworthy patterns (single large donor, industry concentration, recent changes)

Rules:
- Be factual and neutral. Do not make moral judgments.
- Cite specific votes by bill number and specific donor amounts.
- Write in plain language accessible to any Canadian.
- Do not speculate beyond what the data shows.`
}

/**
 * Generate a prompt for analyzing voting patterns on a specific topic.
 */
export function buildVoteAnalysisPrompt(
  member: Member,
  votes: VoteWithDecision[],
  topic: string
): string {
  const voteLines = votes
    .map(
      (v) =>
        `- [${v.decision.toUpperCase()}] ${v.date} | ${v.bill_number || "Motion"}: ${v.description}`
    )
    .join("\n")

  return `You are a non-partisan Canadian political analyst.

Analyze how ${member.name} (${member.party}, ${member.riding}) has voted on bills and motions related to: "${topic}"

## Votes on this topic:
${voteLines || "No votes found on this topic."}

Write a concise 2–3 paragraph analysis of their voting pattern on this topic.
Be factual, cite specific bills, and note any inconsistencies or strong positions.
Do not speculate or make moral judgments.`
}

/**
 * Generate a prompt for donor pattern insight.
 */
export function buildDonorInsightPrompt(
  member: Member,
  donationSummary: DonationSummary
): string {
  const yearlyLines = donationSummary.by_year
    .map((y) => `- ${y.year}: $${y.total_amount.toLocaleString()} (${y.donation_count} donations)`)
    .join("\n")

  const topDonors = donationSummary.top_donors
    .slice(0, 20)
    .map((d) => `- ${d.contributor_name} (${d.contributor_type || "unknown"}): $${d.total_amount.toLocaleString()} across ${d.donation_count} donations`)
    .join("\n")

  return `You are a non-partisan Canadian political analyst specializing in campaign finance.

Analyze the donor profile for ${member.name} (${member.party}, ${member.riding}).

## Donations by Year
${yearlyLines}

## Top Donors
${topDonors}

Write a concise 2–3 paragraph analysis covering:
1. Overall fundraising trend (growing, declining, stable)
2. Dominant donor types or industries — any unusual concentration?
3. Any patterns worth noting for journalists or researchers

Be factual. Cite specific names and amounts. Do not speculate or editorialize.`
}
