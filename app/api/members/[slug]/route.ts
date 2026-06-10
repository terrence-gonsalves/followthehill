// Step 3: GET /api/members/[slug] — single MP profile
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  return Response.json({ message: `Member ${params.slug} — coming in Step 3` })
}
