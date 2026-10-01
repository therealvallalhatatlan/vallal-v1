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

function preferredProduct(context: HomepageContext) {
  if (context.ownership.book1 && !context.ownership.book2) {
    return (
      context.products.find((product) => product.id === "book-2") ??
      context.products.find((product) => product.type !== "book")
    )
  }

  if (!context.ownership.merch) {
    return context.products.find((product) => product.type !== "book")
  }

  return context.products[0] ?? null
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

  const product = preferredProduct(context)

  if (product && !blocks.some((block) => block.type === "product")) {
    blocks.push({
      type: "product",
      productId: product.id,
      headline:
        product.id === "book-2"
          ? "AZ ELSŐ MÁR NÁLAD VAN."
          : context.ownership.merch
            ? "EZT MOST FELTENNÉM ELÉD."
            : "A KÖNYV MELLÉ EZ IS ÉRDEKELHET.",
      body:
        product.id === "book-2"
          ? "A második kötetet még nem láttam nálad."
          : "Egy konkrét tárgyat választottam neked az elérhető dolgok közül.",
      cta: "MEGNÉZEM",
    })
  }

  const story = context.stories[0]

  if (story) {
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
  return {
    greeting:
      context.visit.daysSinceLastVisit !== null &&
      context.visit.daysSinceLastVisit >= 8
        ? "Szia " +
          context.identity.firstName +
          ", több mint egy hete nem láttalak. Minden oké?"
        : getHomepageMood(
              context.visit.hour,
              context.visit.daysSinceLastVisit,
            ) === "late_night"
          ? "Hát te mit csinálsz ilyen késői órán, " +
            context.identity.firstName +
            "?"
          : getHomepageMood(
                context.visit.hour,
                context.visit.daysSinceLastVisit,
              ) === "morning"
            ? "Jó reggelt, " + context.identity.firstName + "."
            : "Szia " + context.identity.firstName + ".",
    mood: getHomepageMood(
      context.visit.hour,
      context.visit.daysSinceLastVisit,
    ),
    blocks: getCoreHomepageBlocks(context),
  }
}
