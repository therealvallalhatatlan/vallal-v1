type SenderRole = 'viewer' | 'broadcaster'

const PRIVATE_ROOM_PREFIX = 'pm:'

function normalizeParticipantId(value: string): string {
  return value.trim().toLowerCase()
}

export function buildPrivateRoomId(firstUserId: string, secondUserId: string): string {
  const participants = [normalizeParticipantId(firstUserId), normalizeParticipantId(secondUserId)].sort()
  return `${PRIVATE_ROOM_PREFIX}${participants[0]}:${participants[1]}`
}

export function parsePrivateRoomId(roomId: string): [string, string] | null {
  if (!roomId.startsWith(PRIVATE_ROOM_PREFIX)) return null

  const parts = roomId.slice(PRIVATE_ROOM_PREFIX.length).split(':').map(normalizeParticipantId)
  if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0] === parts[1]) {
    return null
  }

  return parts[0] <= parts[1] ? [parts[0], parts[1]] : [parts[1], parts[0]]
}

export function isPrivateRoomId(roomId: string): boolean {
  return parsePrivateRoomId(roomId) !== null
}

export function isPrivateRoomParticipant(roomId: string, userId: string): boolean {
  const participants = parsePrivateRoomId(roomId)
  if (!participants) return false
  const normalizedUserId = normalizeParticipantId(userId)
  return participants[0] === normalizedUserId || participants[1] === normalizedUserId
}

export function getPrivateRoomSenderRole(roomId: string, userId: string): SenderRole | null {
  const participants = parsePrivateRoomId(roomId)
  if (!participants) return null
  const normalizedUserId = normalizeParticipantId(userId)
  if (participants[0] === normalizedUserId) return 'viewer'
  if (participants[1] === normalizedUserId) return 'broadcaster'
  return null
}