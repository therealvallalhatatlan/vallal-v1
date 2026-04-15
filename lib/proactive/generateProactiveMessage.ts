import type { ProactiveMessageBuildInput } from './types';

function pickTone(memory: ProactiveMessageBuildInput['relationshipMemory']) {
  const trust = memory?.trust ?? 0;
  const irritation = memory?.irritation ?? 0;

  if (irritation >= 3) return 'sharp';
  if (trust >= 4) return 'warm';
  return 'neutral';
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function buildProactiveMessage(input: ProactiveMessageBuildInput) {
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

  const selected = messages[trigger.type]?.[tone] ?? messages.inactivity.neutral;
  const closing = hasVulnerability && tone !== 'sharp' ? 'Elbírom, ha most egyenesebb leszel.' : '';

  return collapseWhitespace(`${selected} ${closing}`);
}
