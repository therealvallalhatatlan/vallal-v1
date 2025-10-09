import { describe, it, expect } from 'vitest'
import { fmtTime, bandAvg } from '../../utils/audio'

describe('fmtTime', () => {
  it('formats seconds under a minute', () => {
    expect(fmtTime(5)).toBe('0:05')
    expect(fmtTime(59)).toBe('0:59')
  })
  it('formats minutes and seconds', () => {
    expect(fmtTime(60)).toBe('1:00')
    expect(fmtTime(125)).toBe('2:05')
  })
  it('handles invalid/zero', () => {
    expect(fmtTime(0)).toBe('0:00')
    expect(fmtTime(-10 as any)).toBe('0:00')
  })
})

describe('bandAvg', () => {
  it('averages a numeric band', () => {
    const arr = new Uint8Array([0,10,20,30,40,50,60])
    expect(Math.round(bandAvg(arr, 2, 4))).toBe(30)
  })
  it('clamps ranges', () => {
    const arr = new Uint8Array([100,100,100])
    expect(bandAvg(arr, -5, 999)).toBe(100)
  })
})