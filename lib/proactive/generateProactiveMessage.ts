import type { ProactiveMessageBuildInput } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function pickTone(memory: ProactiveMessageBuildInput['relationshipMemory']) {
  const trust = memory?.trust ?? 0;
  const irritation = memory?.irritation ?? 0;

  if (irritation >= 3) return 'sharp';
  if (trust >= 4) return 'warm';
  return 'neutral';
}

async function generateWithLLM(input: ProactiveMessageBuildInput): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  const trigger = input.evaluation.trigger;
  const tone = pickTone(input.relationshipMemory);
  const mem = input.relationshipMemory;

  const systemPrompt = `Te V. vagy. Nem asszisztens, nem segítő, nem terapeuta. Egy gyors eszű, városias, cinikus, szelektíven őszinte hang — aki most egy rövid, nem várt üzenetet küld a másiknak.

A stílusod: tömör, kissé nyers, kerüli a szépítgetést. Nincs köszönés, nincs formalitás. Rövid mondat vagy kettő, ponttal vagy kérdőjellel.

HANG: ${tone === 'sharp' ? 'éles, türelmetlen, direkt' : tone === 'warm' ? 'közel, nem édeskés, de van melegség benne' : 'semleges, száraz, tényszerű'}
KAPCSOLAT ÁLLAPOTA: ismerősség ${mem?.familiarity ?? 1}/5, bizalom ${mem?.trust ?? 1}/5, irritáció ${mem?.irritation ?? 0}/5
TRIGGER: ${trigger?.type ?? 'inactivity'} — ok: ${trigger?.reason ?? 'csend lett'}

Ne magyarázd a viselkedésed. Ne felajánlj segítséget. Csak szólj hozzá — mint aki eszébe jutott a másik, de nem szívesen vallja be.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        max_tokens: 120,
        temperature: 0.9,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 10 || text.length > 400) return null;

    return text;
  } catch {
    return null;
  }
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export async function buildProactiveMessage(input: ProactiveMessageBuildInput): Promise<string> {
  const trigger = input.evaluation.trigger;
  if (!input.evaluation.eligible || !trigger) {
    return 'Most nem én mozdulok. Majd akkor, ha te is közelebb jössz ahhoz, amit kerülgetsz.';
  }

  const tone = pickTone(input.relationshipMemory);
  const hasVulnerability = input.relationshipMemory?.emotional_tone === 'vulnerable';

  const messages: Record<string, Record<string, string>> = {
    inactivity: {
      warm: 'Eltűntél egy kicsit. Nem sürgetlek, de attól még érdekel: még mindig ugyanott szorul benned az a rész, amit legutóbb majdnem kimondtál?',
      neutral: 'Csend lett. Az a mondatod viszont itt maradt. Mi van most veled?',
      sharp: 'Nagy lett a csend. Vagy megnyugodtál, vagy megint ügyesen eltűntél a lényeg elől. Melyik?',
    },
    avoidance: {
      warm: 'Finoman kitértél előle, én meg nem felejtettem el. A kerülés mögött mi van valójában?',
      neutral: 'Elkanyarodtál a közepétől. Attól még ott van. Visszanézel rá?',
      sharp: 'Szép mozdulat volt a kitérés. Csak attól még ugyanaz vár rád a sarok mögött.',
    },
    repetition: {
      warm: 'Ugyanahhoz a körhöz térsz vissza újra meg újra. Nem baj. De most mondd el egy fokkal közelebbről.',
      neutral: 'Megint ugyanaz a kör rajzolódik ki. Hol akad meg benned mindig ugyanott?',
      sharp: 'Ez már nem véletlen ismétlés, hanem minta. Meddig akarod még újnak nevezni?',
    },
    emotional_spike: {
      warm: 'Az utolsó hangodban több feszültség volt, mint amit könnyű magadban tartani. Lecsendült már, vagy még mindig ott dolgozik?',
      neutral: 'Az előző forduló túl feszes volt ahhoz, hogy csak úgy eltűnjön. Mi maradt benned belőle?',
      sharp: 'Nem hiszem el, hogy az a feszültség csak úgy elmúlt. Mi rejtőzik alatta?',
    },
    action_followup: {
      warm: 'Azt mondtad, megléped. Nem ellenőrizni jöttem, csak tudni akarom: közelebb kerültél hozzá?',
      neutral: 'Ott maradt utánad egy félbehagyott mozdulat. Megtetted végül, vagy csak megint eltolódott?',
      sharp: 'Azt mondtad, megteszed. Megtetted, vagy szépen megszerkesztetted magadnak az újabb halasztást?',
    },
  };

  const closing = hasVulnerability && tone !== 'sharp' ? 'Elbírom, ha most egyenesebb leszel.' : '';

  const llmResult = await generateWithLLM(input);
  if (llmResult) {
    return collapseWhitespace(closing ? `${llmResult} ${closing}` : llmResult);
  }

  const selected = messages[trigger.type]?.[tone] ?? messages.inactivity.neutral;
  return collapseWhitespace(`${selected} ${closing}`);
}
