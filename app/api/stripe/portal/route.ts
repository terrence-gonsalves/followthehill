// Step 5: POST /api/stripe/portal — customer portal session
export async function POST(request: Request) {
  return Response.json({ message: "Stripe portal — coming in Step 5" }, { status: 501 })
}
