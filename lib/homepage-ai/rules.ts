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

export function getDeterministicHomepageFallback(
  context: HomepageContext,
): HomepagePlan {
  const mood = getHomepageMood(
    context.visit.hour,
    context.visit.daysSinceLastVisit,
  )

  const greeting =
    context.visit.daysSinceLastVisit !== null &&
    context.visit.daysSinceLastVisit >= 8
      ? "Szia " +
        context.identity.firstName +
        ", több mint egy hete nem láttalak. Minden oké?"
      : mood === "late_night"
        ? "Hát te mit csinálsz ilyen késői órán, " +
          context.identity.firstName +
          "?"
        : mood === "morning"
          ? "Jó reggelt, " + context.identity.firstName + "."
          : "Szia " + context.identity.firstName + "."

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
          : "MÉG FOLYAMATBAN",
      body:
        pendingOrder.status === "dispatched"
          ? "Úgy látom, a csomagod már úton van. Ha megérkezett, ne felejtsd el megnyomni az „Átvettem” gombot."
          : "A rendelésed még folyamatban van. Egy kis türelmet kérünk.",
      cta: "RENDELÉSEM",
    })
  }

  const preferredProduct =
    context.ownership.book1 && !context.ownership.book2
      ? context.products.find((product) => product.id === "book-2")
      : !context.ownership.merch
        ? context.products.find((product) => product.type !== "book")
        : null

  if (preferredProduct && blocks.length < 2) {
    blocks.push({
      type: "product",
      productId: preferredProduct.id,
      headline:
        preferredProduct.id === "book-2"
          ? "AZ ELSŐ MÁR NÁLAD VAN."
          : "EZ MÉG HIÁNYZIK.",
      body:
        preferredProduct.id === "book-2"
          ? "Azt hiszem, a könyv mellé ez is érdekelhet."
          : "Azt hiszem, a könyv mellé ez is érdekelhet.",
      cta: "MEGNÉZEM",
    })
  }

  if (blocks.length === 0 && context.stories.length > 0) {
    const story = context.stories[0]
    blocks.push({
      type: "story",
      storySlug: story.slug,
      headline: "Ezt most neked tenném ide.",
      cta: "ELOLVASOM",
    })
  }

  if (
    blocks.length < 3 &&
    context.network.acceptedClaims === 0 &&
    context.network.activeSpots === 0
  ) {
    blocks.push({
      type: "network",
      headline: "MÉG NINCS NYOMOD A HÁLÓZATBAN.",
      body: "Talán ideje lenne hagyni egyet.",
      cta: "HÁLÓZAT",
    })
  }

  if (blocks.length === 0 && Object.values(context.ownership).some(Boolean)) {
    const codeMap = [
      ["book1", "first_book"],
      ["book2", "second_book"],
      ["mecenas", "mecenas"],
      ["founder", "founder"],
      ["merch", "merch"],
    ] as const

    blocks.push({
      type: "badges",
      codes: codeMap
        .filter(([key]) => context.ownership[key])
        .map(([, code]) => code),
    })
  }

  return {
    greeting,
    mood,
    blocks: blocks.slice(0, 3),
  }
}
