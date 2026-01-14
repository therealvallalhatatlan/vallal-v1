import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': AFrameSceneAttributes;
      'a-marker': AFrameMarkerAttributes;
      'a-entity': AFrameEntityAttributes;
      'a-text': AFrameTextAttributes;
      'a-animation': AFrameAnimationAttributes;
    }
  }
}

interface AFrameSceneAttributes extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  embedded?: boolean;
  arjs?: string;
  'vr-mode-ui'?: string;
  renderer?: string;
  'gesture-detector'?: boolean;
}

interface AFrameMarkerAttributes extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  preset?: 'hiro' | 'kanji' | 'custom';
  type?: 'pattern' | 'barcode';
  url?: string;
  value?: string | number;
  smooth?: boolean;
  smoothCount?: number;
  smoothTolerance?: number;
  smoothThreshold?: number;
  emitevents?: boolean;
  raycaster?: string;
}

interface AFrameEntityAttributes extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  position?: string;
  rotation?: string;
  scale?: string;
  visible?: boolean;
  geometry?: string;
  material?: string;
  light?: string;
  camera?: string;
  sound?: string;
  text?: string;
  gltf?: string;
  'gltf-model'?: string;
  obj?: string;
  'obj-model'?: string;
}

interface AFrameTextAttributes extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  value?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
  'wrap-count'?: number;
  'letter-spacing'?: number;
  'line-height'?: number;
  font?: string;
  'font-image'?: string;
  shader?: string;
  side?: 'front' | 'back' | 'double';
  opacity?: number;
  transparent?: boolean;
  position?: string;
  rotation?: string;
  scale?: string;
}

interface AFrameAnimationAttributes extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  attribute?: string;
  from?: string;
  to?: string;
  dur?: number | string;
  delay?: number | string;
  easing?: string;
  loop?: boolean | number;
  repeat?: 'indefinite' | number;
  direction?: 'normal' | 'alternate' | 'reverse';
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
  begin?: string;
  end?: string;
}

export {}
