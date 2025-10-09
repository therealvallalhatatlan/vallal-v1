export function fmtTime(t: number) {
  if (!isFinite(t) || t <= 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function bandAvg(arr: Uint8Array, a: number, b: number) {
  const aa = Math.max(0, a)
  const bb = Math.min(arr.length - 1, b)
  let s = 0
  let n = 0
  for (let i = aa; i <= bb; i++) { s += arr[i]; n++ }
  return n ? s / n : 0
}