// Step 3: GET /api/members/[slug]/donors — MP's donation history
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  return Response.json({ message: `Donors for ${params.slug} — coming in Step 3` })
}
