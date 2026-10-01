import type { HomepageContext, HomepageProductCandidate } from "./types"

function isBook(product: HomepageProductCandidate) {
  return product.type === "book"
}

function isShirt(product: HomepageProductCandidate) {
  return product.type === "men-shirt" || product.type === "women-shirt"
}

function isMerch(product: HomepageProductCandidate) {
  return !isBook(product) && !["software", "event", "digital"].includes(product.type)
}

export function getRecommendedProducts(
  context: HomepageContext,
): HomepageProductCandidate[] {
  const purchased = new Set(context.purchases.productIds)

  const hasShirt = context.purchases.productIds.some((id) =>
    context.products.some((product) => product.id === id && isShirt(product)),
  )
  const hasBothBooks = context.ownership.book1 && context.ownership.book2
  const hasAnyBook = context.ownership.book1 || context.ownership.book2
  const hasMerch = context.ownership.merch

  return context.products
    .filter((product) => !purchased.has(product.id))
    .map((product, index) => {
      let score = product.recommendationPriority ?? 0

      // A catalogue that is explicitly ordered is still meaningful.
      score += Math.max(0, context.products.length - index)

      // Complement the things the member already owns.
      if (hasBothBooks) {
        score += isBook(product) ? -500 : 800
        score += isShirt(product) ? 180 : 0
      } else if (hasShirt) {
        score += isBook(product) ? 850 : 120
      } else if (context.ownership.book1 && !context.ownership.book2) {
        score += product.id === "book-2" ? 1100 : isMerch(product) ? 240 : 0
      } else if (hasAnyBook) {
        score += isMerch(product) ? 420 : 0
      } else if (hasMerch) {
        score += isBook(product) ? 700 : 80
      } else {
        // New/unknown members see the catalogue's intentional order.
        score += isBook(product) ? 120 : 20
      }

      // Avoid showing a same-type repeat when a useful complementary type exists.
      if (context.purchases.productIds.length > 0) {
        const sameTypePurchase = context.purchases.productIds.some((id) =>
          context.products.some(
            (candidate) => candidate.id === id && candidate.type === product.type,
          ),
        )
        if (sameTypePurchase) score -= 90
      }

      return { product, score, index }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ product }) => product)
    .slice(0, 6)
}
