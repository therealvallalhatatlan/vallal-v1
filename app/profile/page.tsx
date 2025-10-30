import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AuthHeader } from '@/components/AuthHeader'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Get user profile from public.users
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email)
    .single()

  // Get user orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-black">
      <AuthHeader />
      <main className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* User Info */}
            <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
              <h2 className="text-xl text-lime-300 mb-4">Fiók adatok</h2>
              <div className="space-y-2 text-zinc-300">
                <p><span className="text-zinc-400">Email:</span> {user.email}</p>
                <p><span className="text-zinc-400">Regisztráció:</span> {new Date(user.created_at).toLocaleDateString('hu-HU')}</p>
                {userProfile?.can_drop && (
                  <p><span className="text-zinc-400">Drop jogosultság:</span> <span className="text-lime-400">Igen</span></p>
                )}
              </div>
              
              {userProfile?.can_drop && (
                <div className="mt-4">
                  <Link 
                    href="/drop"
                    className="inline-block px-4 py-2 rounded-md bg-lime-600 hover:bg-lime-500 text-black font-semibold transition-colors"
                  >
                    Drop beküldése
                  </Link>
                </div>
              )}
            </div>

            {/* Orders */}
            <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
              <h2 className="text-xl text-lime-300 mb-4">Megrendelések</h2>
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 bg-black/30 rounded-lg border border-zinc-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-zinc-300">Rendelés #{order.id}</p>
                          <p className="text-sm text-zinc-400">
                            {new Date(order.created_at).toLocaleDateString('hu-HU')}
                          </p>
                          {order.sequence_number && (
                            <p className="text-sm text-lime-400">
                              Sorszám: #{order.sequence_number}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lime-300 font-semibold">
                            {order.amount ? `${order.amount} Ft` : 'N/A'}
                          </p>
                          <p className="text-xs text-zinc-400">{order.status || 'Pending'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400">Még nincs megrendelésed.</p>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
