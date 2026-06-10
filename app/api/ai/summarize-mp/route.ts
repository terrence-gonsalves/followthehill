// Step 6: POST /api/ai/summarize-mp — AI summary (requires subscription)
export async function POST(request: Request) {
  return Response.json({ message: "AI summarize-mp — coming in Step 6" }, { status: 501 })
}
