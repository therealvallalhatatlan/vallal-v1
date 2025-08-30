import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Timeline } from "@/components/Timeline"
import { formatCurrency, formatSequence } from "@/lib/format"
import { mockData, ORDER_MOCK } from "@/lib/mocks"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySessionToken } from "@/lib/auth"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | Next.js App",
  description: "Your personal dashboard",
  robots: "noindex",
}

export default async function DashboardPage() {
  // read session cookie
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get("session")?.value
  if (!cookieVal) return redirect("/login")

  try {
    const { userId } = await verifySessionToken(cookieVal)
    if (!userId) return redirect("/login")

    return (
      <Container className="py-12">
        <div className="space-y-8">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 text-center font-medium">Demo mode – no login required</p>
          </div>

          <Card>
            <h1 className="text-3xl font-bold text-green-400 mb-6">Dashboard</h1>

            {/* Order Details */}
            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-green-400">Order {ORDER_MOCK.orderId}</h2>
                    <p className="text-green-300/60">Sequence #{ORDER_MOCK.sequenceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(ORDER_MOCK.amount)} {ORDER_MOCK.currency}
                    </p>
                    <span className="inline-block px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm font-medium capitalize">
                      {ORDER_MOCK.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-green-300">Order Status</h3>
                  <Timeline steps={ORDER_MOCK.timeline} />
                </div>

                {/* Email confirmation stub */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-sm">✉️ Order confirmation sent by email</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <h2 className="text-2xl font-bold text-green-400 mb-4">Order History</h2>
                <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-400 font-mono">{formatSequence(ORDER_MOCK.sequenceNumber)}</p>
                      <p className="text-green-300/60 text-sm capitalize">{ORDER_MOCK.status}</p>
                    </div>
                    <p className="text-green-400 font-bold">
                      {formatCurrency(ORDER_MOCK.amount)} {ORDER_MOCK.currency}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Card>
                <h3 className="text-xl font-bold text-green-400 mb-4">Community support so far</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{mockData.totalPreorders}</div>
                    <div className="text-green-300/60 text-sm">Preorders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{mockData.totalGoal}</div>
                    <div className="text-green-300/60 text-sm">Goal</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-green-300/80">
                      <span>{mockData.progressPercent}% funded</span>
                    </div>
                    <div className="w-full bg-green-900/30 rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${mockData.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    )
  } catch (err) {
    console.warn("[AUTH] session verify failed:", err)
    return redirect("/login")
  }
}
