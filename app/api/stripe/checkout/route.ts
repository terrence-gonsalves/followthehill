// Step 5: POST /api/stripe/checkout — create subscription checkout session
export async function POST(request: Request) {
  return Response.json({ message: "Stripe checkout — coming in Step 5" }, { status: 501 })
}
