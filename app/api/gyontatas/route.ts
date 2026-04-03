import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { confession, mode } = await req.json();
  // Mocked dark poetic Hungarian responses
  let response = '';
  switch (mode) {
    case 'feloldozas':
      response = 'Feloldozlak a digitális sötétségben. A bűnöd most már csak a bitek között él.';
      break;
    case 'itelet':
      response = 'Ítélet: A rendszer figyel, a vétked visszhangzik a hálózat mélyén.';
      break;
    case 'penitencia':
      response = 'Penitencia: Egy újabb éjszaka a nyúl üregében, gondolkodj el a sötétségen.';
      break;
    default:
      response = 'A rendszer nem értette a kérésed.';
  }
  // Add a disturbing poetic touch
  response += '\n\n"A bűn nem tűnik el, csak átalakul. A sötétben minden szó örök."';
  return NextResponse.json({ response });
}
