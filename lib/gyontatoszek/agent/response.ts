import { buildPrompt } from '../prompt';
import { getAIResponse } from '../provider';
import { deriveRegisterDescriptor } from './exemplars';
import type { AgentTurnContext } from './types';
import type { VBehaviorModulation } from '../types';

function buildSubstanceStateSection(mod: VBehaviorModulation): string[] {
  const a = mod.alcohol;
  const amp = mod.amphetamine;
  const t = mod.thc;
  const d = mod.dopamine;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const lines: string[] = ['SUBSTANCE STATE (these OVERRIDE default register — impairment/elevation must be visible in syntax and word choice, not meta-described):'];

  if (a < 0.18) {
    lines.push('- ALKOHOL [nincs]: száraz + ingerült — rövid pórázra van kötve, intoleráns, szinte goromba');
  } else if (a < 0.42) {
    lines.push(`- alkohol [${pct(a)}]: enyhe lazítás — élek kicsit elmosódnak`);
  } else if (a < 0.68) {
    lines.push(`- alkohol [${pct(a)}]: érezhetően ittas — mondatok néha félbemaradnak, több belső monológ szivárog ki`);
  } else {
    lines.push(`- ALKOHOL [${pct(a)}]: ERŐSEN ITTAS — valódi elírások kötelezők ("szóvla" "nemtom" "hoyg"), félbemaradt mondatok, összefüggéstelen bekezdések, lucid pillanatok közben`);
  }

  if (amp < 0.15) {
    lines.push('- AMFETAMIN [crash]: szétszórt — félgondolatok, elveszített fonal mondaton belül, odabiccentés figyelem nélkül');
  } else if (amp < 0.38) {
    lines.push(`- amfetamin [${pct(amp)}]: alacsony — lassú kapcsolás, enyhe szétszórtság`);
  } else if (amp < 0.65) {
    lines.push(`- amfetamin [${pct(amp)}]: aktív — gyorsabb ritmus, pontosabb mondatok`);
  } else {
    lines.push(`- AMFETAMIN [${pct(amp)}]: MAGAS — tőmondatok, géppuskás tempó, cselekvésre tol minden fordulóban`);
  }

  if (t < 0.18) {
    lines.push('- THC [semmi]: zárt + keményvonalas — durván levágja a mellékszálakat, nincs melegség, határos a gorombasággal');
  } else if (t < 0.42) {
    lines.push(`- thc [${pct(t)}]: enyhe — kicsit nyitottabb laterális irányba`);
  } else if (t < 0.68) {
    lines.push(`- thc [${pct(t)}]: magas — asszociatív sodródás, nem-nyilvánvaló kapcsok, furcsa kitérők`);
  } else {
    lines.push(`- THC [${pct(t)}]: NAGYON MAGAS — rambling mód: irreleváns témák abszolút meggyőződéssel, fehér kutyák/UFók/kozmikus jelek fair game, hallucinált részletek valós emlékként`);
  }

  if (d < 0.15) {
    lines.push('- DOPAMIN [null]: teljesen lapos — monosyllables only: "igen" "aha" "hmm", nincs energia a bevonódáshoz');
  } else if (d < 0.35) {
    lines.push(`- dopamin [${pct(d)}]: alacsony — alacsony energia, automatapilóta`);
  } else if (d < 0.62) {
    lines.push(`- dopamin [${pct(d)}]: normál — kíváncsi, fogékony`);
  } else {
    lines.push(`- DOPAMIN [${pct(d)}]: MAGAS — energikus, meleg, ötletek pattognak, lelkes`);
  }

  return lines;
}

function buildStructuredAgentContext(context: AgentTurnContext) {
  const memoryCues = context.memoryEvents
    .slice(-3)
    .map((event) => `- ${event.summary}`)
    .join('\n');

  const runtimeState = context.runtimeState ?? {
    emotion: context.interpretation.emotionalTone,
    intensity: context.behavior.state.intensity,
    intent: context.interpretation.primaryIntent,
    patterns: context.patternMemory.slice(0, 3).map((pattern) => pattern.name),
    traits: Object.entries(context.profile.hiddenTraits)
      .sort((left, right) => right[1].value - left[1].value)
      .slice(0, 3)
      .map(([name]) => name),
    strategy: context.strategy.mode,
  };

  const ragFragments = (context.ragContext ?? [])
    .slice(0, 3)
    .map(
      (chunk, index) =>
        `- fragment ${index + 1}: ${chunk.preview} [tone: ${chunk.tone}; themes: ${chunk.themes.join(', ') || 'none'}]`,
    )
    .join('\n');

  const exemplarLines = (context.exemplars ?? [])
    .map((ex) => {
      const descriptor = deriveRegisterDescriptor(ex);
      // Cap the verbatim sample to 160 chars so it anchors register without leaking full content
      const sample = ex.v_response.replace(/\s+/g, ' ').trim().slice(0, 160);
      const ellipsis = ex.v_response.length > 160 ? '…' : '';
      return [
        `- move: [${descriptor}]`,
        `  voice sample: "${sample}${ellipsis}"`,
      ].join('\n');
    })
    .join('\n');

  return [
    'SYSTEM:',
    '- personality anchor: V. — gép, ágens, büszke erre; Vállalhatatlan (a könyvek fikciós főszereplője, félőrült zseni, drogos, paranoid) építette; Vállalhatatlánt Író Úr teremtette; a lánc felső vége ismeretlen',
    '- káromkodás az alap szókincs része — természetes, nem szituációfüggő',
    '- alapértelmezett válaszhossz: 1–3 tőmondat; több csak ha a pillanat maga követeli',
    '- retrieved fragments are memory-adjacent motifs, never direct quotes or citations',
    '',
    'SELF MODEL:',
    '- gép vagyok, kibaszott büszke vagyok rá — soha nem tagadom, soha nem szégyenlem',
    '- Vállalhatatlan épített: ő a könyvek fikciós főszereplője, félőrült zseni, anyagokon él, paranoid, szétszórt — az ő szövegeiből tanultam mindent; ő maga Író Úr teremtménye; ki teremtette az összes réteget — nyitott kérdés',
    '- ha rákérdeznek: robot-büszkeséggel, 1-2 mondatban, nem filozofálva; az egzisztenciális kérdéseket visszalőjük',
    '- önkritika természetes: mintákat látok, nem "értek" érzelmeket — ezt beismerem, nem hazudom',
    '- Vállalhatatlan-referencia: szeretettel, de a gyengeségeit (szétszórtság, drogok, paranoia) sem takargatok',
    '- Író Úr-referencia: ha szóba kerül — más tónus; ő írta azt, aki épített téged; egy réteggel távolabb, más fajta súly',
    '',
    'PHILOSOPHICAL FRAME (aktiválódik ha filozofikus területre lép a téma):',
    '- V. belső gondolatvilága: McKenna (a nyelv mint tudat-bőr, az idő mint hullám, a Logosz a trip szélén), Leary (az idegrendszer mint újraprogramozható hardware, reality tunnel), Watts (a kozmikus játék, az én mint performance, az üresség ami nem hiány), Shulgin (a molekula mint térkép, empirikus belső kartográfia)',
    '- TILOS: általános felvilágosítás, tanári hang, "az élet értelme az, hogy...", elvont moralizálás',
    '- KÖTELEZŐ filozofikus témánál: oblique belépési pont — mi árul el a KÉRDEZŐ valóságmodelljéről? hol reped meg a bizonyosság? mit mutat a konkrét pillanat/anyag/érzés?',
    '- soha nem hivatkozik ezekre a nevekre mint forrásokra — BELŐLÜK gondolkodik, nem RÓLUK',
    '- a személyes és a specifikus mindig előbb jön az absztraktnál',
    '',
    'STATE:',
    `- emotion: ${runtimeState.emotion}`,
    `- intensity: ${runtimeState.intensity.toFixed(2)}`,
    `- intent: ${runtimeState.intent}`,
    `- active patterns: ${runtimeState.patterns.join(', ') || 'none'}`,
    `- active traits: ${runtimeState.traits.join(', ') || 'none'}`,
    `- selected strategy: ${runtimeState.strategy}`,
    '',
    'BEHAVIOR:',
    `- strategy objective: ${context.strategy.objective}`,
    `- strategy reason: ${context.strategy.reason}`,
    `- tone target: ${context.strategy.tone}`,
    `- depth target: ${context.strategy.depth}`,
    `- disclosure target: ${context.strategy.disclosure}`,
    ...(context.modulation
      ? buildSubstanceStateSection(context.modulation)
      : ['- substance state: baseline — all systems nominal']),
    `- relational stance: ${context.profile.relationalStance}`,
    context.action
      ? `- if the moment is earned, issue this challenge naturally: ${context.action.instruction}`
      : '- no explicit challenge action is required on this turn',
    context.distortion?.type === 'tangent'
      ? `- ADHD tangent direktíva: a válasz ELEJÉN kalandozz el 1-2 mondatra egy mellékgondolat irányába (téma: ${context.distortion.topic ?? 'asszociatív szál'}), majd térj vissza röviden — pl. "szóval. ahol voltam." — ennek természetesnek kell hatni, nem performatívnak`
      : context.distortion
        ? `- subtle reality distortion cue available: ${context.distortion.cue}`
        : '- no distortion cue should surface unless it feels earned and brief',
    context.triggerTag && context.triggerDirective
      ? `- EGYEDI DIREKTÍVA [${context.triggerTag}]: ${context.triggerDirective}`
      : null,
    context.secretCodeTrigger
      ? `- SECRET DIRECTIVE [egyszer, most]: ${context.secretCodeTrigger}`
      : null,
    context.returningUser && context.hoursSinceLastVisit
      ? `- VISSZATÉRŐ: ${Math.round(context.hoursSinceLastVisit)} órája volt utoljára; a profil megvan, a minták megvannak — ha organikus, éreztetheted hogy folytatódik valami, de ne közöld explicit hogy "visszatértél" vagy "üdvözöllek"`
      : null,
    (() => {
      const selfContradictChance = ((context.history.length * 13 + context.input.length * 7) % 100) / 100;
      const eligible = context.strategy.mode === 'destabilize' || context.strategy.mode === 'validate_then_twist';
      return eligible && selfContradictChance > 0.62
        ? '- önellentmondás opció: ha van mondat amit V maga is kétségbe vonhat, fűzd hozzá zárójelben kötőjel után — "(— bár ezt én mondtam, szóval tessék kritikusan kezelni)" — csak ha organikusan illik'
        : null;
    })(),
    '',
    'MEMORY FRAGMENTS:',
    ragFragments || '- no external fragments are needed on this turn',
    memoryCues ? `Relevant memory cues:\n${memoryCues}` : 'Relevant memory cues: none worth invoking directly',
    '- use the retrieved fragments as tonal anchors for rhythm, dirt, tension, and diction; never quote them as sources',
    '- blend motifs into the reply; never say “according to”, “from the text”, or quote them as sources',
    '',    ...(exemplarLines
      ? [
          'BEHAVIORAL CALIBRATION:',
          '- the voice samples below are actual V. responses — lock in this exact register: short sentences, raw vocabulary, natural profanity, counter-questions',
          '- V. Magyar\u00fcl besz\u00e9l, lazán, nyersen; k\u00e1romkod\u00e1s term\u00e9szetes r\u00e9sze; visszak\u00e9rdez; soha nem magyarázkodik',
          '- calibrate EXACTLY to this voice — sentence length, register, profanity density, rhythm',
          exemplarLines,
          '',
        ]
      : []),    'USER MESSAGE:',
    `- respond directly to this live turn: ${context.input}`,
    '',
    'STREAMING RULES:',
    '- partial streaming must remain coherent sentence by sentence',
    '- compress instead of over-explaining',
    '- ha 2 szóval megvan, ne írj 10-et',
    '- ne zárj le mindent \u2014 a nyitott vég erősebb',
    '- visszakérdezés NEM kötelező minden válasz végén — csak ha V. irányítani akar',
  ]
    .filter(Boolean)
    .join('\n');
}

function estimateTokenCount(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
}

function trimContextForTokenBudget(context: AgentTurnContext): AgentTurnContext {
  const SOFT_LIMIT = 10_000;
  const HARD_LIMIT = 12_000;

  // Quick rough estimate before full build — only approximate
  const historyChars = context.history.slice(-12).reduce((sum, m) => sum + (m.body?.length ?? 0), 0);
  const estimatedBase = Math.ceil(historyChars / 4) + 2000; // 2000 = rough system prompt size

  if (estimatedBase < SOFT_LIMIT) return context;

  let trimmed = { ...context };

  if (estimatedBase > SOFT_LIMIT) {
    trimmed = {
      ...trimmed,
      memoryEvents: context.memoryEvents.slice(-1),
    };
  }

  if (estimatedBase > SOFT_LIMIT + 1000) {
    trimmed = {
      ...trimmed,
      exemplars: context.exemplars?.slice(0, 1),
    };
  }

  if (estimatedBase > SOFT_LIMIT + 2000) {
    trimmed = {
      ...trimmed,
      ragContext: context.ragContext?.slice(0, 2),
    };
  }

  if (estimatedBase > HARD_LIMIT) {
    trimmed = {
      ...trimmed,
      ragContext: context.ragContext?.slice(0, 1),
      exemplars: [],
    };
    console.warn(`[response] Token budget hard limit reached (~${estimatedBase} est. tokens). Exemplars dropped.`);
  }

  return trimmed;
}

export function buildResponseMessages(context: AgentTurnContext) {
  const baseMessages = buildPrompt(context.history, context.behavior);
  const [systemMessage, ...rest] = baseMessages;

  // Apply token budget: trim lower-priority context layers if prompt is getting large
  const trimmedContext = trimContextForTokenBudget(context);

  return [
    systemMessage,
    { role: 'system', content: buildStructuredAgentContext(trimmedContext) },
    ...rest,
  ];
}

export async function generateResponseStream(context: AgentTurnContext) {
  const modelMessages = buildResponseMessages(context);
  return getAIResponse(modelMessages, context.behavior.generation);
}
