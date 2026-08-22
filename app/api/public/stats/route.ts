import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin()
      .from("users")
      .select("id", { count: "exact", head: true })

    if (error) {
      console.error("Failed to fetch registered user count:", error)

      return NextResponse.json(
        { users: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      users: count ?? 0,
    })
  } catch (error) {
    console.error("Public stats API error:", error)

    return NextResponse.json(
      { users: null },
      { status: 500 }
    )
  }
}