import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    const correctPassword = process.env.DROP_PASSWORD
    if (!correctPassword) {
      return NextResponse.json({ allowed: false }, { status: 500 })
    }

    const allowed = password === correctPassword

    return NextResponse.json({ allowed })
  } catch (error) {
    return NextResponse.json({ allowed: false }, { status: 400 })
  }
}
