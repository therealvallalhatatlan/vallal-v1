import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getAllStories, type Story } from "@/lib/content"
import { getDeterministicHomepageFallback } from "./rules"
import { buildHomepagePrompt, HOMEPAGE_SYSTEM_PROMPT } from "./prompt"
import type { HomepageBlock, HomepageContext, HomepagePlan } from "./types"

function cleanJson(text: string) {
  const trimmed = text.trim()

  if (trimmed.startsWith("```json")) {
    return trimmed.slice(7).replace(/```$/, "").trim()
  }

  if (trimmed.startsWith("```")) {
    return trimmed.slice(3).replace(/```$/, "").trim()
  }

  return trimmed
}

function isAllowedProduct(context: HomepageContext, productId: string) {
  return context.products.some((product) => product.id === productId)
}

function isAllowedStory(context: HomepageContext, slug: string) {
  return context.stories.some((story) => story.slug === slug)
}

function isAllowedOrder(context: HomepageContext, id: string) {
  return context.orders.some((order) => order.id === id)
}

function validatePlan(value: unknown, context: HomepageContext): HomepagePlan | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Record<string, unknown>
  const greeting = typeof raw.greeting === "string" ? raw.greeting.trim() : ""
  if (!greeting) return null

  const moods = ["morning", "day", "evening", "late_night", "returning", "quiet"] as const
  const mood = moods.includes(raw.mood as (typeof moods)[number])
    ? (raw.mood as HomepagePlan["mood"])
    : "quiet"

  const blocks: HomepageBlock[] = []
  const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : []

  for (const item of rawBlocks.slice(0, 3)) {
    if (!item || typeof item !== "object") continue

    const block = item as Record<string, unknown>
    const type = block.type

    if (type === "badges") {
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
      continue
    }

    if (type === "product") {
      const productId = typeof block.productId === "string" ? block.productId : ""
      if (!isAllowedProduct(context, productId)) continue

      const product = context.products.find((candidate) => candidate.id === productId)

      blocks.push({
        type: "product",
        productId,
        headline:
          typeof block.headline === "string"
            ? block.headline.slice(0, 180)
            : "Ezt neked tenném ide.",
        body:
          typeof block.body === "string"
            ? block.body.slice(0, 420)
            : "",
        cta:
          typeof block.cta === "string"
            ? block.cta.slice(0, 40)
            : "MEGNÉZEM",
        productName: product?.name,
        productImage: product?.images?.[0],
        productPrice: product?.price,
      })
      continue
    }

    if (type === "story") {
      const storySlug = typeof block.storySlug === "string" ? block.storySlug : ""
      if (!isAllowedStory(context, storySlug)) continue

      blocks.push({
        type: "story",
        storySlug,
        headline:
          typeof block.headline === "string"
            ? block.headline.slice(0, 180)
            : "Ezt most neked tenném ide.",
        cta:
          typeof block.cta === "string"
            ? block.cta.slice(0, 40)
            : "ELOLVASOM",
      })
      continue
    }

    if (type === "order_status") {
      const orderId = typeof block.orderId === "string" ? block.orderId : ""
      const order = context.orders.find((candidate) => candidate.id === orderId)
      if (!order || order.userReceivedAt) continue

      blocks.push({
        type: "order_status",
        orderId,
        headline:
          typeof block.headline === "string"
            ? block.headline.slice(0, 180)
            : "A RENDELÉSED",
        body:
          typeof block.body === "string"
            ? block.body.slice(0, 420)
            : "A rendelésed folyamatban van.",
        cta:
          typeof block.cta === "string"
            ? block.cta.slice(0, 40)
            : "RENDELÉSEM",
      })
      continue
    }

    if (type === "network") {
      blocks.push({
        type: "network",
        headline:
          typeof block.headline === "string"
            ? block.headline.slice(0, 180)
            : "A HÁLÓZAT",
        body:
          typeof block.body === "string"
            ? block.body.slice(0, 420)
            : "",
        cta:
          typeof block.cta === "string"
            ? block.cta.slice(0, 40)
            : "HÁLÓZAT",
      })
    }
  }

  return {
    greeting: greeting.slice(0, 500),
    mood,
    blocks: blocks.slice(0, 3),
  }
}

function enrichStoryBlocks(plan: HomepagePlan, stories: Story[]): HomepagePlan {
  const storyBySlug = new Map(stories.map((story) => [story.id, story]))

  return {
    ...plan,
    blocks: plan.blocks.map((block) => {
      if (block.type !== "story") return block

      const story = storyBySlug.get(block.storySlug)
      if (!story) return block

      return {
        ...block,
        storyTitle: story.title,
        storyText: story.text,
      }
    }),
  }
}

export async function prepareHomepagePlan(context: HomepageContext) {
  const fallback = getDeterministicHomepageFallback(context)
  const stories = await getAllStories().catch(() => [] as Story[])

  if (!process.env.OPENAI_API_KEY) {
    return enrichStoryBlocks(fallback, stories)
  }

  try {
    const result = await generateText({
      model: openai("gpt-5.4"),
      system: HOMEPAGE_SYSTEM_PROMPT,
      prompt: buildHomepagePrompt(context),
      maxRetries: 0,
    })

    const parsed = JSON.parse(cleanJson(result.text))
    const validated = validatePlan(parsed, context)
    if (!validated) return enrichStoryBlocks(fallback, stories)

    return enrichStoryBlocks(validated, stories)
  } catch (error) {
    console.error("[homepage-ai] planner failed", error)
    return enrichStoryBlocks(fallback, stories)
  }
}
