import type { HomepageContext, HomepagePlan } from "./types"

export function getHomepageMood(
  hour: number,
  daysSinceLastVisit: number | null,
): HomepagePlan["mood"] {
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= 8) return "returning"
  if (hour >= 0 && hour < 6) return "late_night"
  if (hour >= 6 && hour < 11) return "morning"
  if (hour >= 11 && hour < 18) return "day"
  return "evening"
}

function activeOrderStatus(status: HomepageContext["orders"][number]["status"]) {
  return ["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(status)
}

function badgeCodes(context: HomepageContext) {
  const map = [
    ["book1", "first_book"],
    ["book2", "second_book"],
    ["mecenas", "mecenas"],
    ["founder", "founder"],
    ["merch", "merch"],
  ] as const

  return map
    .filter(([key]) => context.ownership[key])
    .map(([, code]) => code)
}

function preferredProducts(context: HomepageContext) {
  const selected: HomepageContext["products"] = []

  if (context.ownership.book1 && !context.ownership.book2) {
    const secondBook = context.products.find((product) => product.id === "book-2")
    if (secondBook) selected.push(secondBook)
  }

  if (!context.ownership.merch) {
    const merch = context.products.find((product) => product.type !== "book")
    if (merch && !selected.some((product) => product.id === merch.id)) {
      selected.push(merch)
    }
  }

  if (selected.length === 0 && context.products[0]) {
    selected.push(context.products[0])
  }

  return selected.slice(0, 2)
}

export function getCoreHomepageBlocks(
  context: HomepageContext,
): HomepagePlan["blocks"] {
  const blocks: HomepagePlan["blocks"] = []

  const pendingOrder = context.orders.find(
    (order) => !order.userReceivedAt && activeOrderStatus(order.status),
  )

  if (pendingOrder) {
    blocks.push({
      type: "order_status",
      orderId: pendingOrder.id,
      headline:
        pendingOrder.status === "dispatched"
          ? "MÁR ÚTON VAN"
          : pendingOrder.status === "fulfilled"
            ? "MÁR NÁLAD KELL LENNIE"
            : "MÉG FOLYAMATBAN",
      body:
        pendingOrder.status === "dispatched"
          ? "Úgy látom, a csomagod már úton van. Ha megérkezett, ne felejtsd el megnyomni az „Átvettem” gombot."
          : pendingOrder.status === "fulfilled"
            ? "A rendelésed teljesített állapotban van. Ha már átvetted, jelezd itt."
            : "A rendelésed még folyamatban van. Egy kis türelmet kérünk.",
      cta: "RENDELÉSEM",
    })
  }

  for (const product of preferredProducts(context)) {
    if (blocks.length >= 3) break

    blocks.push({
      type: "product",
      productId: product.id,
      headline:
        product.id === "book-2"
          ? "AZ ELSŐ MÁR NÁLAD VAN."
          : "A KÖNYV MELLÉ EZ IS ÉRDEKELHET.",
      body:
        product.id === "book-2"
          ? "A második kötetet még nem láttam nálad."
          : "Egy konkrét tárgyat választottam neked az elérhető dolgok közül.",
      cta: "MEGNÉZEM",
    })
  }

  const story = context.stories[0]
  if (story && blocks.length < 3) {
    blocks.push({
      type: "story",
      storySlug: story.slug,
      headline: "EGY SZTORI, AMIT MOST IDE TENNÉK.",
      cta: "ELOLVASOM",
    })
  }

  if (
    blocks.length < 3 &&
    (context.network.acceptedClaims > 0 ||
      context.network.activeSpots > 0 ||
      blocks.length === 0)
  ) {
    blocks.push({
      type: "network",
      headline:
        context.network.acceptedClaims > 0 || context.network.activeSpots > 0
          ? "KÖZBEN A HÁLÓZAT SEM ÁLLT MEG."
          : "MÉG NINCS NYOMOD A HÁLÓZATBAN.",
      body:
        context.network.acceptedClaims > 0 || context.network.activeSpots > 0
          ? "Nézd meg, mi történt, amíg nem figyeltél."
          : "Van még egy hely, ahol bekerülhetsz ebbe az egészbe.",
      cta: "HÁLÓZAT",
    })
  }

  if (blocks.length === 0 && badgeCodes(context).length > 0) {
    blocks.push({
      type: "badges",
      codes: badgeCodes(context),
    })
  }

  return blocks.slice(0, 3)
}

export function getDeterministicHomepageFallback(
  context: HomepageContext,
): HomepagePlan {
  const mood = getHomepageMood(
    context.visit.hour,
    context.visit.daysSinceLastVisit,
  )

  const firstName = context.identity.firstName

  const greeting =
    context.visit.daysSinceLastVisit !== null &&
    context.visit.daysSinceLastVisit >= 8
      ? "Szia " + firstName + ", több mint egy hete nem láttalak. Minden oké?"
      : context.visit.source === "facebook"
        ? "Na, mi volt a Facebookon, " + firstName + "?"
        : context.visit.source === "instagram"
          ? "Csak nem az Instáról estél be, " + firstName + "?"
          : context.visit.source === "reddit"
            ? "Megint a Redditről jössz, " + firstName + "?"
            : context.visit.source === "substack"
              ? "Te még mindig olvasod a leveleimet, " + firstName + "?"
              : context.visit.source === "qr"
                ? "Megint egy QR-nyom vezetett ide, " + firstName + "?"
                : mood === "late_night"
                  ? "Hát te mit csinálsz ilyen késői órán, " + firstName + "?"
                  : mood === "morning"
                    ? "Jó reggelt, " + firstName + "."
                    : "Szia " + firstName + "."

  return {
    greeting,
    mood,
    blocks: getCoreHomepageBlocks(context),
  }
}
