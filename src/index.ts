const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";

type PaidRoute = {
  path: string;
  method: string;
  price: string;
};

const paidRoutes: PaidRoute[] = [
  { method: "GET", path: "/v1/search", price: "0.001" },
  { method: "GET", path: "/v1/search/news", price: "0.001" },
  { method: "POST", path: "/v1/search/deep", price: "0.005" },
];

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function paymentRequired(route: PaidRoute): Response {
  const network = process.env.X402_NETWORK ?? "base";
  const recipient = process.env.X402_RECIPIENT_ADDRESS ?? "";

  return json(
    {
      error: "payment_required",
      message: "This Queryx endpoint requires an x402 USDC payment.",
      accepts: [
        {
          scheme: "exact",
          network,
          amount: route.price,
          asset: "USDC",
          payTo: recipient,
        },
      ],
    },
    {
      status: 402,
      headers: {
        "x-402-network": network,
        "x-402-price-usdc": route.price,
        "x-402-recipient": recipient,
      },
    },
  );
}

function findPaidRoute(request: Request): PaidRoute | undefined {
  const url = new URL(request.url);
  return paidRoutes.find(
    (route) => route.method === request.method && route.path === url.pathname,
  );
}

Bun.serve({
  port,
  hostname,
  fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    const paidRoute = findPaidRoute(request);
    if (paidRoute) {
      return paymentRequired(paidRoute);
    }

    return json({ error: "not_found" }, { status: 404 });
  },
});

console.log(`Queryx listening on http://${hostname}:${port}`);
