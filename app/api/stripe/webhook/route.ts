// Step 5: POST /api/stripe/webhook — Stripe webhook handler
export async function POST(request: Request) {
  return Response.json({ message: "Stripe webhook — coming in Step 5" }, { status: 501 })
}
