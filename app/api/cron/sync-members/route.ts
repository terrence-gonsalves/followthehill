// Step 8: GET /api/cron/sync-members — weekly member sync (Vercel cron)
export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return Response.json({ message: "Sync members cron — coming in Step 8" })
}
