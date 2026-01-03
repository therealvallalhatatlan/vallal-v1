declare module 'gifenc' {
  export function GIFEncoder(): any;
  export function quantize(rgba: Uint8ClampedArray, maxColors: number, options?: { format?: string }): any;
  export function applyPalette(rgba: Uint8ClampedArray, palette: any, format?: string): Uint8Array;
}