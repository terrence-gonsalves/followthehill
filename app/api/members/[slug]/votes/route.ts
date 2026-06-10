// Step 3: GET /api/members/[slug]/votes — MP's voting record
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  return Response.json({ message: `Member votes for ${params.slug} — coming in Step 3` })
}
