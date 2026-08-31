"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { track as vercelTrack } from "@vercel/analytics"

const STORAGE_KEY = "vh_curiosity_level_v1"
const DISCOVERY_KEY = "vh_curiosity_discoveries_v1"

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

function getStoredLevel(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY) || "0")
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function setStoredLevel(level: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(level))
  } catch {}
}

function rememberDiscovery(name: string) {
  try {
    const current = JSON.parse(localStorage.getItem(DISCOVERY_KEY) || "[]")
    const discoveries = Array.isArray(current) ? current : []
    if (!discoveries.includes(name)) {
      discoveries.push(name)
      localStorage.setItem(DISCOVERY_KEY, JSON.stringify(discoveries.slice(-30)))
    }
  } catch {}
}

function getDiscoveries(): string[] {
  try {
    const current = JSON.parse(localStorage.getItem(DISCOVERY_KEY) || "[]")
    return Array.isArray(current) ? current : []
  } catch {
    return []
  }
}

function emitDiscovery(name: string, level: number) {
  rememberDiscovery(name)
  try {
    vercelTrack("curiosity_easter_egg", {
      discovery: name,
      curiosity_level: level,
      path: window.location.pathname,
    })
  } catch {}
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
  const levelRef = useRef(0)
  const konamiIndexRef = useRef(0)
  const rightClickCountRef = useRef(0)

  useEffect(() => {
    levelRef.current = getStoredLevel()

    const bump = (amount: number, reason: string) => {
      const next = Math.min(levelRef.current + amount, 99)
      levelRef.current = next
      setStoredLevel(next)
      emitDiscovery(reason, next)
      return next
    }

    const openUnknown = () => {
      emitDiscovery("console:unknown", levelRef.current)
      router.push("/unknown")
    }

    const help = () => {
      banner("VÁLLALHATATLAN / INTERNAL NODE", [
        "AVAILABLE COMMANDS",
        "",
        "  whoami()    identify the observer",
        "  where()     locate the node",
        "  remember()  list your discoveries",
        "  scan()      inspect this node",
        "  coffee()    probably nothing",
        "  sudo()      absolutely nothing",
        "  open(\"unknown\")  follow the signal",
        "",
        "Hint: some doors only open when you stop looking for doors.",
      ])
      return "help loaded"
    }

    const whoami = () => {
      emitDiscovery("console:whoami", levelRef.current)
      banner("IDENTITY UNKNOWN", [
        `CURIOSITY LEVEL: ${levelRef.current}`,
        "TECHNICAL CONFIDENCE: UNCALIBRATED",
        "SOURCE INSPECTION: POSSIBLE",
        "",
        "You came looking for a backdoor.",
        "You found a mirror.",
      ])
      return "observer detected"
    }

    const where = () => {
      emitDiscovery("console:where", levelRef.current)
      banner("NODE LOCATION", [
        "NETWORK: VALLALHATATLAN",
        "NODE: 07",
        `PATH: ${pathname}`,
        "STATUS: STILL RUNNING",
        "",
        "There is no map for this one.",
      ])
      return "/NODE-07"
    }

    const remember = () => {
      const discoveries = getDiscoveries()
      banner("MEMORY", [
        discoveries.length ? discoveries.map((item) => `  ${item}`).join("\n") : "  nothing yet",
        "",
        discoveries.length >= 3
          ? "You have been here longer than you think."
          : "Keep looking.",
      ])
      return discoveries
    }

    const scan = () => {
      emitDiscovery("console:scan", levelRef.current)
      const next = bump(2, "console:scan:used")
      banner("NODE SCAN", [
        `TARGET: ${pathname}`,
        `CURIOSITY LEVEL: ${next}`,
        "PUBLIC SURFACE: ONLINE",
        "HIDDEN SURFACE: YES",
        "NODE 07: LISTENING",
        "",
        next >= 8 ? "DEEP SCAN AVAILABLE." : "SCAN DEPTH: SHALLOW",
      ])
      return { path: pathname, curiosity: next }
    }

    const coffee = () => {
      emitDiscovery("console:coffee", levelRef.current)
      console.log("%ccoffee.exe was never installed", "color:#a3a3a3;font-family:monospace")
      return "404: caffeine not found"
    }

    const sudo = () => {
      emitDiscovery("console:sudo", levelRef.current)
      console.warn("permission denied")
      console.log("root is not a role. root is a personality disorder.")
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
      ])
    }

    const target = window as Window & Record<string, unknown>
    target.v = {
      help,
      whoami,
      where,
      remember,
      scan,
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
    target.coffee = coffee
    target.sudo = sudo
    target.open = open

    banner("VÁLLALHATATLAN / CONSOLE CHANNEL", [
      "TE MEGNYITOTTAD A KONZOLT.",
      "",
      "Ez nem hiba.",
      "Ez kíváncsiság.",
      "",
      "NODE STATUS: COMPROMISED",
      "OBSERVER: DETECTED",
      "",
      "Írd be: help()",
    ])

    emitDiscovery("console:opened", levelRef.current)

    const onContextMenu = () => {
      rightClickCountRef.current += 1
      const count = rightClickCountRef.current
      const next = bump(1, `right-click:${count}`)

      if (count === 1) {
        console.log("%cYOU CLICKED RIGHT.%c\nGOOD.\nMOST PEOPLE DO.", "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      } else if (count === 2) {
        console.log("%cYOU CAME BACK.%c\nTHAT'S MORE INTERESTING.", "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      } else if (count >= 3) {
        console.log("%cSOURCE IS NEVER THE WHOLE STORY.%c\nCURIOUSITY LEVEL: %d", "color:#d9f99d;font-weight:800", "color:#a3a3a3", next)
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
        const next = bump(5, "keyboard:konami")
        banner("ACCESS PATTERN ACCEPTED", [
          "YOU HAVE UNLOCKED:",
          "NOTHING.",
          "",
          "BUT THAT WAS FUN.",
          "",
          `CURIOSITY LEVEL: ${next}`,
          "NODE 07 ONLINE",
          "",
          "Try scan().",
        ])
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) return
      if (levelRef.current >= 5) {
        console.log("%cYOU CAME BACK.%c\nWE NOTICED.", "color:#d9f99d;font-weight:800", "color:#a3a3a3")
      }
    }

    const onCopy = () => {
      if (levelRef.current >= 3) {
        console.log("%cCOPYING IS ALSO A FORM OF RESEARCH.", "color:#d9f99d;font-weight:800")
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
        const next = bump(2, triggerMap[key])
        const messages: Record<string, string[]> = {
          debug: ["DEBUG MODE", "you asked for it.", "nothing is debugged."],
          admin: ["NICE TRY.", "WHO GAVE YOU THE KEYBOARD?", `CURIOSITY LEVEL: ${next}`],
          root: ["ROOT ACCESS", "██████████████████", "just kidding."],
          dev: ["DEVELOPER MODE ENABLED", "please develop something."],
        }
        banner(messages[key][0], messages[key].slice(1))
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
