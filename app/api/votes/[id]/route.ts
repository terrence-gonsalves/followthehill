// Step 3: GET /api/votes/[id] — single vote with breakdown
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return Response.json({ message: `Vote ${params.id} — coming in Step 3` })
}
