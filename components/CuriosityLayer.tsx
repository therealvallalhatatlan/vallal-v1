"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { track as vercelTrack } from "@vercel/analytics"

const SCORE_KEY = "vh_curiosity_score_v1"
const DISCOVERY_KEY = "vh_curiosity_discoveries_v1"
const MAX_SCORE = 300

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
]

function getStoredScore(): number {
  try {
    const value = Number(localStorage.getItem(SCORE_KEY) || "0")
    return Number.isFinite(value) ? Math.max(0, Math.min(MAX_SCORE, value)) : 0
  } catch {
    return 0
  }
}

function setStoredScore(score: number) {
  try {
    localStorage.setItem(SCORE_KEY, String(score))
  } catch {}
}

function rememberDiscovery(name: string): boolean {
  try {
    const current = JSON.parse(localStorage.getItem(DISCOVERY_KEY) || "[]")
    const discoveries = Array.isArray(current) ? current : []
    if (discoveries.includes(name)) return false
    discoveries.push(name)
    localStorage.setItem(DISCOVERY_KEY, JSON.stringify(discoveries.slice(-50)))
    return true
  } catch {
    return false
  }
}

function getDiscoveries(): string[] {
  try {
    const current = JSON.parse(localStorage.getItem(DISCOVERY_KEY) || "[]")
    return Array.isArray(current) ? current : []
  } catch {
    return []
  }
}

function getScore(): number {
  return getStoredScore()
}

function emitDiscovery(name: string, score: number, points = 0) {
  const isNew = rememberDiscovery(name)
  if (!isNew) return { isNew: false, score }

  try {
    vercelTrack("curiosity_easter_egg", {
      discovery: name,
      curiosity_score: score,
      points,
      path: window.location.pathname,
    })
  } catch {}

  return { isNew: true, score }
}

function banner(title: string, lines: string[]) {
  const styles = {
    title: [
      "color:#d9f99d",
      "background:#090909",
      "font-weight:800",
      "font-size:14px",
      "padding:4px 8px",
      "border:1px solid #3f6212",
    ].join(";"),
    body: "color:#a3a3a3;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6",
  }

  console.log(`%c ${title} `, styles.title)
  lines.forEach((line) => console.log(`%c${line}`, styles.body))
}

export default function CuriosityLayer() {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const scoreRef = useRef(0)
  const konamiIndexRef = useRef(0)
  const rightClickCountRef = useRef(0)

  useEffect(() => {
    scoreRef.current = getStoredScore()

    const award = (discovery: string, points: number) => {
      const currentDiscoveries = getDiscoveries()
      if (currentDiscoveries.includes(discovery)) return { score: scoreRef.current, awarded: 0 }

      const next = Math.min(scoreRef.current + points, MAX_SCORE)
      const result = emitDiscovery(discovery, next, points)
      if (!result.isNew) return { score: scoreRef.current, awarded: 0 }

      scoreRef.current = next
      setStoredScore(next)
      return { score: next, awarded: points }
    }

    const score = () => {
      const current = getScore()
      const remaining = Math.max(0, MAX_SCORE - current)
      banner("SCOREBOARD", [
        `CURRENT SCORE: ${current}`,
        `MAXIMUM SCORE: ${MAX_SCORE}`,
        `REMAINING: ${remaining}`,
        "",
        current >= MAX_SCORE
          ? "MAXIMUM ACCESS ACHIEVED."
          : current >= 150
            ? "DEEP RABBIT HOLE ACCESS."
            : "THERE ARE MORE POINTS TO FIND.",
      ])
      return { score: current, max: MAX_SCORE, remaining }
    }

    const openUnknown = () => {
      const result = award("route:unknown", 50)
      banner("NODE 07", [
        "ROUTE DISCOVERED: /unknown",
        result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED",
        `SCORE: ${result.score}/${MAX_SCORE}`,
        "",
        "THE RABBIT HOLE CONTINUES.",
      ])
      router.push("/unknown")
    }

    const help = () => {
      const result = award("console:help", 10)
      banner("VÁLLALHATATLAN / INTERNAL NODE", [
        "AVAILABLE COMMANDS",
        "",
        "  whoami()       identify the observer   [+15]",
        "  where()        locate the node         [+15]",
        "  remember()     list your discoveries    [+10]",
        "  scan()         inspect this node       [+25]",
        "  score()        show the scoreboard      [+0]",
        "  coffee()       probably nothing         [+5]",
        "  sudo()         absolutely nothing        [+5]",
        "  open(\"unknown\")  follow the signal   [+50]",
        "",
        result.awarded ? `+${result.awarded} POINTS  SCORE: ${result.score}/${MAX_SCORE}` : `ALREADY FOUND  SCORE: ${result.score}/${MAX_SCORE}`,
        "",
        "Hint: some doors only open when you stop looking for doors.",
      ])
      return "help loaded"
    }

    const whoami = () => {
      const result = award("console:whoami", 15)
      banner("IDENTITY UNKNOWN", [
        `CURIOSITY SCORE: ${result.score}/${MAX_SCORE}`,
        "TECHNICAL CONFIDENCE: UNCALIBRATED",
        "SOURCE INSPECTION: POSSIBLE",
        "",
        "You came looking for a backdoor.",
        "You found a mirror.",
        result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED",
      ])
      return "observer detected"
    }

    const where = () => {
      const result = award("console:where", 15)
      banner("NODE LOCATION", [
        "NETWORK: VALLALHATATLAN",
        "NODE: 07",
        `PATH: ${pathname}`,
        "STATUS: STILL RUNNING",
        `SCORE: ${result.score}/${MAX_SCORE}`,
        "",
        "There is no map for this one.",
      ])
      return "/NODE-07"
    }

    const remember = () => {
      const discoveries = getDiscoveries()
      const result = award("console:remember", 10)
      const updated = getDiscoveries()
      banner("MEMORY", [
        updated.length ? updated.map((item) => `  ${item}`).join("\n") : "  nothing yet",
        "",
        result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED",
        `SCORE: ${result.score}/${MAX_SCORE}`,
        "",
        discoveries.length >= 3 || updated.length >= 3
          ? "You have been here longer than you think."
          : "Keep looking.",
      ])
      return updated
    }

    const scan = () => {
      const result = award("console:scan", 25)
      banner("NODE SCAN", [
        `TARGET: ${pathname}`,
        `CURIOSITY SCORE: ${result.score}/${MAX_SCORE}`,
        "PUBLIC SURFACE: ONLINE",
        "HIDDEN SURFACE: YES",
        "NODE 07: LISTENING",
        "",
        result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED",
        result.score >= 100 ? "DEEP SCAN AVAILABLE." : "SCAN DEPTH: SHALLOW",
      ])
      return { path: pathname, score: result.score }
    }

    const coffee = () => {
      const result = award("console:coffee", 5)
      console.log(
        `%ccoffee.exe was never installed%c${result.awarded ? `\n+${result.awarded} POINTS` : "\nALREADY DISCOVERED"}\nSCORE: ${result.score}/${MAX_SCORE}`,
        "color:#a3a3a3;font-family:monospace",
        "color:#d9f99d;font-family:monospace;font-weight:800",
      )
      return "404: caffeine not found"
    }

    const sudo = () => {
      const result = award("console:sudo", 5)
      console.warn("permission denied")
      console.log(`root is not a role. root is a personality disorder.\n${result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED"}\nSCORE: ${result.score}/${MAX_SCORE}`)
      return false
    }

    const open = (target: string) => {
      if (String(target).toLowerCase() === "unknown") {
        openUnknown()
        return "/unknown"
      }

      console.warn("unknown target")
      return null
    }

    const clear = () => {
      console.clear()
      banner("VÁLLALHATATLAN / INTERNAL NODE", [
        "You cleared the evidence.",
        "Cute.",
        `SCORE: ${scoreRef.current}/${MAX_SCORE}`,
      ])
    }

    const target = window as Window & Record<string, unknown>
    target.v = {
      help,
      whoami,
      where,
      remember,
      scan,
      score,
      coffee,
      sudo,
      open,
      clear,
    }
    target.help = help
    target.whoami = whoami
    target.where = where
    target.remember = remember
    target.scan = scan
    target.score = score
    target.coffee = coffee
    target.sudo = sudo
    target.open = open

    const consoleOpened = award("console:opened", 20)

    banner("VÁLLALHATATLAN / CONSOLE CHANNEL", [
      "TE MEGNYITOTTAD A KONZOLT.",
      "",
      "Ez nem hiba.",
      "Ez kíváncsiság.",
      "",
      "NODE STATUS: COMPROMISED",
      "OBSERVER: DETECTED",
      "",
      consoleOpened.awarded ? `+${consoleOpened.awarded} POINTS` : "CONSOLE ALREADY DISCOVERED",
      `SCORE: ${consoleOpened.score}/${MAX_SCORE}`,
      "",
      "Írd be: help()",
    ])

    const onContextMenu = () => {
      rightClickCountRef.current += 1
      const count = rightClickCountRef.current
      const rewards = [10, 15, 20]
      const points = rewards[Math.min(count, 3) - 1]
      const result = award(`right-click:${Math.min(count, 3)}`, points)

      if (count === 1) {
        console.log(`%cYOU CLICKED RIGHT.%c\nGOOD.\nMOST PEOPLE DO.\n+${result.awarded} POINTS\nSCORE: ${result.score}/${MAX_SCORE}`, "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      } else if (count === 2) {
        console.log(`%cYOU CAME BACK.%c\nTHAT'S MORE INTERESTING.\n+${result.awarded} POINTS\nSCORE: ${result.score}/${MAX_SCORE}`, "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      } else {
        console.log(`%cSOURCE IS NEVER THE WHOLE STORY.%c\n+${result.awarded} POINTS\nSCORE: ${result.score}/${MAX_SCORE}`, "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[konamiIndexRef.current]
      const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (pressed === expected) {
        konamiIndexRef.current += 1
      } else {
        konamiIndexRef.current = pressed === KONAMI_SEQUENCE[0] ? 1 : 0
      }

      if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
        konamiIndexRef.current = 0
        const result = award("keyboard:konami", 50)
        banner("ACCESS PATTERN ACCEPTED", [
          "YOU HAVE UNLOCKED:",
          "NOTHING.",
          "",
          "BUT THAT WAS FUN.",
          "",
          result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED",
          `SCORE: ${result.score}/${MAX_SCORE}`,
          "NODE 07 ONLINE",
          "",
          "Try scan().",
        ])
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) return
      if (scoreRef.current >= 50) {
        console.log(`%cYOU CAME BACK.%c\nWE NOTICED.\nSCORE: ${scoreRef.current}/${MAX_SCORE}`, "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      }
    }

    const onCopy = () => {
      if (scoreRef.current >= 20) {
        console.log(`%cCOPYING IS ALSO A FORM OF RESEARCH.%c\nSCORE: ${scoreRef.current}/${MAX_SCORE}`, "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      }
    }

    window.addEventListener("contextmenu", onContextMenu)
    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("visibilitychange", onVisibilityChange)
    document.addEventListener("copy", onCopy)

    const params = new URLSearchParams(window.location.search)
    const triggerMap: Record<string, string> = {
      debug: "url:debug",
      admin: "url:admin",
      root: "url:root",
      dev: "url:dev",
    }

    for (const key of Object.keys(triggerMap)) {
      if (params.get(key) === "1" || params.get(key) === "true") {
        const result = award(triggerMap[key], 5)
        const messages: Record<string, string[]> = {
          debug: ["DEBUG MODE", "you asked for it.", "nothing is debugged."],
          admin: ["NICE TRY.", "WHO GAVE YOU THE KEYBOARD?"],
          root: ["ROOT ACCESS", "██████████████████", "just kidding."],
          dev: ["DEVELOPER MODE ENABLED", "please develop something."],
        }
        banner(messages[key][0], [
          ...messages[key].slice(1),
          result.awarded ? `+${result.awarded} POINTS` : "ALREADY DISCOVERED",
          `SCORE: ${result.score}/${MAX_SCORE}`,
        ])
        break
      }
    }

    return () => {
      window.removeEventListener("contextmenu", onContextMenu)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      document.removeEventListener("copy", onCopy)
    }
  }, [pathname, router])

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        width: 1,
        height: 1,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      {/*
        You are reading the DOM.

        Good.

        01: YOU
        02: CAME
        03: LOOKING
        04: FOR
        05: SOMETHING
        06: HIDDEN

        07: YOU
        08: FOUND
        09: IT

        NODE 07 IS STILL ACTIVE.
      */}
    </div>
  )
}
