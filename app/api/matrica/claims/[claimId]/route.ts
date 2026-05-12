import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/matrica/claims/[claimId]
 * Deletes a user's claim (only own claims)
 *
 * Requires: Bearer token
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const client = await createClient()
  const { data: authData, error: authError } = await client.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const userId = authData.user.id
  const { claimId } = await params

  if (!claimId) {
    return NextResponse.json({ error: 'invalid_claim_id' }, { status: 400 })
  }

  // Verify claim belongs to user
  const { data: claim, error: fetchError } = await client
    .from('claims')
    .select('id, user_id')
    .eq('id', claimId)
    .single()

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'claim_not_found' }, { status: 404 })
  }

  if (claim.user_id !== userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  // Delete the claim
  const { error: deleteError } = await client
    .from('claims')
    .delete()
    .eq('id', claimId)

  if (deleteError) {
    console.error('[matrica/claims] delete error', deleteError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * PATCH /api/matrica/claims/[claimId]
 * Updates a user's claim status (e.g., active/inactive)
 * 
 * Requires: Bearer token
 * Body: { status: 'pending' | 'accepted' | 'rejected' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const client = await createClient()
  const { data: authData, error: authError } = await client.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const userId = authData.user.id
  const { claimId } = await params

  if (!claimId) {
    return NextResponse.json({ error: 'invalid_claim_id' }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { status } = body
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  // Verify claim belongs to user
  const { data: claim, error: fetchError } = await client
    .from('claims')
    .select('id, user_id')
    .eq('id', claimId)
    .single()

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'claim_not_found' }, { status: 404 })
  }

  if (claim.user_id !== userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  // Update the claim
  const { data: updated, error: updateError } = await client
    .from('claims')
    .update({ status })
    .eq('id', claimId)
    .select()

  if (updateError) {
    console.error('[matrica/claims] update error', updateError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, claim: updated?.[0] ?? null })
}
