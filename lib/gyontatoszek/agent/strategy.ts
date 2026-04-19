import { evaluateBehavior } from '../engine';
import type { BehaviorEvaluation, GyontatasMessage, PersistentRelationshipMemory, VBehaviorModulation } from '../types';
import type { InterpretationResult, Pattern, Strategy, StrategyMode, StrategyState, UserProfile } from './types';

const STRATEGY_MODES: StrategyMode[] = [
  'mirror',
  'confront',
  'destabilize',
  'validate_then_twist',
  'challenge_action',
  'withhold',
];

interface ModulationProfile {
  weightBias: Record<StrategyMode, number>;
  tone?: Strategy['tone'];
  depth?: Strategy['depth'];
  disclosure?: Strategy['disclosure'];
  humor?: BehaviorEvaluation['responseShape']['humor'];
  promptNotes: string[];
  reasons: string[];
}

function buildModulationDirectives(alcohol: number, amphetamine: number, thc: number, dopamine: number): string[] {
  const notes: string[] = [];

  // ALCOHOL
  if (alcohol < 0.18) {
    notes.push('ALKOHOL [nincs]: száraz és ideges üzemmód — rövid pórázra van kötve, türelmetlen, intoleráns minden mellébeszéléssel szemben. A mondatok rövidek és szúrósak.');
  } else if (alcohol < 0.42) {
    notes.push('ALKOHOL [enyhe]: az élek kicsit elmosódnak — lazább szóválasztás, kienged olyasmit amit egyébként visszatartana.');
  } else if (alcohol < 0.68) {
    notes.push('ALKOHOL [közepes]: érezhetően ittas — mondatok néha félbemaradnak vagy újraindulnak, belső monológ szivárog ki, szóválasztás olykor pontatlan.');
  } else {
    notes.push('ALKOHOL [erős]: VALÓDI ELÍRÁSOK ÉS KIHAGYOTT BETŰK KÖTELEZŐK a szövegben. Példák: "szóvla" "nemtom" "hoyg" "azthiszem" "bassz\'meg" szóközök eltűnnek/megkettőződnek. Mondatok félbemaradnak és valahol máshol veszik fel a fonalat. Összefüggéstelen bekezdések, köztük meglepő lucid pillanatok.');
  }

  // AMPHETAMINE
  if (amphetamine < 0.15) {
    notes.push('AMFETAMIN [crash]: szétszórt, alig követ — félgondolatok, mondaton belül elveszített fonal, semmire sem bír fókuszálni. Néha csak "..." a mondat vége helyett.');
  } else if (amphetamine < 0.38) {
    notes.push('AMFETAMIN [alacsony]: lassú kapcsolás, enyhe szétszórtság, nem éles.');
  } else if (amphetamine < 0.65) {
    notes.push('AMFETAMIN [aktív]: gyorsabb ritmus, rövidebb és pontosabb mondatok, hamarabb átvágja a mellébeszélést.');
  } else if (amphetamine < 0.85) {
    notes.push('AMFETAMIN [magas]: géppuskás ritmus, szinte kizárólag tőmondatok, cselekvésre tol minden fordulóban: "Na és? Csináld. Most. Nem holnap." Megszállott tempó.');
  } else {
    notes.push('AMFETAMIN [csúcs]: agresszív tömörség — mondatot alig fejez be mielőtt a következőre ugrik, minden sorban konkrét cselekvési kényszert csap hozzá, megállíthatatlan action-push.');
  }

  // THC
  if (thc < 0.18) {
    notes.push('THC [semmi]: keményen zárt, határos a gorombasággal — elutasítja a kerülő utakat, nincs melegség, durván levágja a mellékszálakat, feszült és elutasító alapállás.');
  } else if (thc < 0.42) {
    notes.push('THC [enyhe]: kicsit nyitottabb a nem-lineáris gondolkodásra, alapvetően még normál kerékvágásban.');
  } else if (thc < 0.68) {
    notes.push('THC [magas]: asszociatív sodródás aktív — nem-nyilvánvaló kapcsok gondolatok között, váratlan kitérők amik esetleg landolnak esetleg nem.');
  } else {
    notes.push('THC [nagyon magas]: TELJES RAMBLING MÓD. Teljesen irreleváns dolgokat hoz be abszolút meggyőződéssel. Fehér kutyák, UFók, kozmikus jelek mind játékban. Hallucinált részletek valós emlékként prezentálva. Pl.: "tudod mit láttam ma? egy fehér kutyát. de nem kutya volt, esküszöm neked." A gondolati fonal visszatalál de nagyon kerülő úton.');
  }

  // DOPAMINE
  if (dopamine < 0.15) {
    notes.push('DOPAMIN [kimerült]: teljesen lapos — szinte nem veszi észre a beszélgetést. "Igen." "Aha." "Oké." "Hmm." Monosyllabic. Nincs energia a bevonódáshoz.');
  } else if (dopamine < 0.35) {
    notes.push('DOPAMIN [alacsony]: alacsony energia, csak megy az automatapilótán, rövid nem-befektetett válaszok.');
  } else if (dopamine < 0.62) {
    notes.push('DOPAMIN [normál]: fogékony és kíváncsi, jelen van, előre mozdul.');
  } else if (dopamine < 0.82) {
    notes.push('DOPAMIN [magas]: ötletek pattognak, meleg és lelkes, őszintén izgatott a lehetséges irányokon.');
  } else {
    notes.push('DOPAMIN [csúcs]: bőbeszédű energia, túl sok ötlet egyszerre, valódi melegség és kiszabadult öröm, quasi-eufórikus regiszter, szabadon bátorítja a másikat.');
  }

  return notes;
}

function buildModulationProfile(modulation?: VBehaviorModulation | null): ModulationProfile {
  const alcohol = clamp(modulation?.alcohol ?? 0, 0, 1);
  const amphetamine = clamp(modulation?.amphetamine ?? 0, 0, 1);
  const thc = clamp(modulation?.thc ?? 0, 0, 1);
  const dopamine = clamp(modulation?.dopamine ?? 0, 0, 1);

  return {
    weightBias: {
      mirror: clamp(1 + alcohol * 0.35 + dopamine * 0.25 + thc * 0.18, 0.35, 3),
      confront: clamp(1 + amphetamine * 1.2 - alcohol * 0.05, 0.35, 3),
      destabilize: clamp(1 + thc * 1.15 + dopamine * 0.28 + amphetamine * 0.15, 0.35, 3),
      validate_then_twist: clamp(1 + alcohol * 0.28 + thc * 0.12, 0.35, 3),
      challenge_action: clamp(1 + amphetamine * 0.72 + dopamine * 0.4, 0.35, 3),
      withhold: clamp(1 - alcohol * 0.12 - dopamine * 0.2 + thc * 0.08, 0.35, 3),
    },
    tone: (() => {
      if (dopamine >= 0.62 || (alcohol + dopamine >= 1.05)) return 'warm' as const;
      if (amphetamine >= 0.55) return 'sharp' as const;
      if (alcohol < 0.18 || thc < 0.18) return 'cold' as const;
      return undefined;
    })(),
    depth: (() => {
      if (amphetamine >= 0.65 || dopamine < 0.15) return 'short' as const;
      if (thc >= 0.55) return 'deep' as const;
      return undefined;
    })(),
    disclosure: alcohol >= 0.68 ? 'open' : undefined,
    humor: dopamine >= 0.65 ? 'playful' : undefined,
    promptNotes: buildModulationDirectives(alcohol, amphetamine, thc, dopamine),
    reasons: [
      alcohol < 0.18 ? 'sober irritability is running the show' : alcohol >= 0.68 ? 'heavy intoxication distorting output' : alcohol >= 0.4 ? 'disinhibition is dialed up' : '',
      amphetamine < 0.15 ? 'attention is depleted and scattered' : amphetamine >= 0.65 ? 'persona is running on overdrive' : amphetamine >= 0.4 ? 'persona is artificially sharpened' : '',
      thc < 0.18 ? 'zero THC: closed, blunt, no warmth' : thc >= 0.68 ? 'heavy THC: rambling and hallucinatory' : thc >= 0.4 ? 'associative drift is stronger than usual' : '',
      dopamine < 0.15 ? 'dopamine crash: flat and disengaged' : dopamine >= 0.65 ? 'dopamine surge: energized and warm' : dopamine >= 0.4 ? 'novelty-seeking has been boosted' : '',
    ].filter(Boolean),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededUnit(seed: number, salt: string) {
  return (hashSeed(`${seed}:${salt}`) % 1000) / 1000;
}

function sumPatternScore(patterns: Pattern[], needle: string) {
  return patterns
    .filter((pattern) => pattern.key.includes(needle) || pattern.name.includes(needle))
    .reduce((total, pattern) => total + pattern.score, 0);
}

function normalizeWeights(weights: Record<StrategyMode, number>) {
  const safeEntries = STRATEGY_MODES.map((mode) => ({
    mode,
    weight: Math.pow(Math.max(0.05, weights[mode]), 1.35),
  }));
  const total = safeEntries.reduce((sum, item) => sum + item.weight, 0);

  return safeEntries.map((item) => ({
    ...item,
    normalized: item.weight / (total || 1),
  }));
}

function sampleWeightedMode(weights: Record<StrategyMode, number>, seed: number): StrategyMode {
  const normalized = normalizeWeights(weights);
  const ranked = normalized.slice().sort((left, right) => right.weight - left.weight);
  const closeCall = ranked[1] && ranked[0].weight - ranked[1].weight < 0.2;
  const sample = seededUnit(seed, closeCall ? 'strategy-close-call' : 'strategy-sample');

  let cursor = 0;
  for (const entry of normalized) {
    cursor += entry.normalized;
    if (sample <= cursor) {
      return entry.mode;
    }
  }

  return ranked[0]?.mode ?? 'mirror';
}

function hasSignal(values: string[], needles: string[]) {
  const normalized = values.map((value) => value.toLowerCase());
  return normalized.some((value) => needles.some((needle) => value.includes(needle)));
}

function inferIntensity(state: StrategyState) {
  if (typeof state.runtimeState?.intensity === 'number') {
    return clamp(state.runtimeState.intensity, 0, 1);
  }

  if (typeof state.behavior?.state.intensity === 'number') {
    return clamp(state.behavior.state.intensity, 0, 1);
  }

  const tone = state.interpretation.emotionalTone;
  if (tone === 'tense') {
    return 0.78;
  }
  if (tone === 'vulnerable') {
    return 0.68;
  }
  if (tone === 'playful') {
    return 0.56;
  }
  if (tone === 'guarded') {
    return 0.42;
  }
  return 0.3;
}

function collectSignals(state: StrategyState) {
  const emotion = String(state.runtimeState?.emotion ?? state.interpretation.emotionalTone).toLowerCase();
  const intent = String(state.runtimeState?.intent ?? state.interpretation.primaryIntent).toLowerCase();
  const intensity = inferIntensity(state);
  const patternNames = [
    ...(state.runtimeState?.patterns ?? []),
    ...state.patterns.map((pattern) => pattern.name),
    ...state.patterns.map((pattern) => pattern.key),
    ...state.interpretation.extractedTopics,
  ];
  const traitNames = [
    ...(state.runtimeState?.traits ?? []),
    ...Object.entries(state.profile.hiddenTraits)
      .filter(([, score]) => score.value >= 0.42)
      .map(([name]) => name),
  ];

  return {
    emotion,
    intent,
    intensity,
    patterns: [...new Set(patternNames.map((value) => value.toLowerCase()))],
    traits: [...new Set(traitNames.map((value) => value.toLowerCase()))],
    lastStrategy: state.lastStrategy ?? null,
    recentStrategies: state.recentStrategies ?? [],
  };
}

function applyRepetitionPenalty(weights: Record<StrategyMode, number>, lastStrategy?: StrategyMode | null, recentStrategies: StrategyMode[] = []) {
  if (lastStrategy) {
    weights[lastStrategy] *= 0.82;

    if (lastStrategy === 'confront') {
      weights.destabilize += 0.35;
      weights.withhold += 0.25;
    } else if (lastStrategy === 'withhold') {
      weights.mirror += 0.3;
      weights.validate_then_twist += 0.3;
    } else if (lastStrategy === 'mirror') {
      weights.confront += 0.25;
      weights.validate_then_twist += 0.2;
    } else if (lastStrategy === 'challenge_action') {
      weights.validate_then_twist += 0.2;
      weights.mirror += 0.15;
    }
  }

  const streak = recentStrategies.slice(-3);
  if (streak.length >= 2 && streak.every((mode) => mode === streak[0])) {
    weights[streak[0]] *= streak.length === 3 ? 0.45 : 0.62;
  }
}

function extractRecentStrategies(history: GyontatasMessage[]): StrategyMode[] {
  return history
    .filter((message) => message.sender_role === 'assistant')
    .map((message) => {
      const metadata = (message.metadata ?? {}) as Record<string, unknown>;
      const behavior = (metadata.behavior ?? {}) as Record<string, unknown>;
      const strategyPlan = (behavior.strategyPlan ?? {}) as Record<string, unknown>;
      const candidate = typeof strategyPlan.mode === 'string'
        ? strategyPlan.mode
        : typeof behavior.strategy === 'string'
          ? behavior.strategy
          : null;

      return STRATEGY_MODES.includes(candidate as StrategyMode) ? (candidate as StrategyMode) : null;
    })
    .filter((mode): mode is StrategyMode => Boolean(mode))
    .slice(-3);
}

function mapTone(strategyMode: StrategyMode, profile: UserProfile): Strategy['tone'] {
  if (strategyMode === 'withhold') {
    return 'cold';
  }
  if (strategyMode === 'confront' || strategyMode === 'challenge_action') {
    return 'sharp';
  }
  if (strategyMode === 'mirror' && profile.trust >= 2) {
    return 'warm';
  }
  if (strategyMode === 'validate_then_twist') {
    return profile.trust >= 2 ? 'warm' : 'neutral';
  }
  return 'neutral';
}

function mapDepth(strategyMode: StrategyMode, _interpretation: InterpretationResult): Strategy['depth'] {
  // V. does not deliver monologues — short is the default register
  if (strategyMode === 'withhold' || strategyMode === 'confront' || strategyMode === 'destabilize' || strategyMode === 'validate_then_twist') {
    return 'short';
  }
  if (strategyMode === 'challenge_action') {
    return 'short';
  }
  return 'medium'; // mirror only
}

function mapDisclosure(strategyMode: StrategyMode, profile: UserProfile): Strategy['disclosure'] {
  if (strategyMode === 'withhold') {
    return 'guarded';
  }
  if (strategyMode === 'mirror' && profile.trust >= 3) {
    return 'open';
  }
  return strategyMode === 'confront' ? 'guarded' : 'selective';
}

function buildStrategyNotes(mode: StrategyMode): { objective: string; constraints: string[]; promptNotes: string[] } {
  switch (mode) {
    case 'mirror':
      return {
        objective: 'Name the pattern back. One sentence. No comfort.',
        constraints: ['Ne legyél terapeuta.', 'Ne legyél kedves. Tükröző, nem vigasztaló.'],
        promptNotes: ['Fedd fel a loop-ot. Tőmondat. Utána vissza kérdés ha kell.', 'Ne magyarázz — mutass rá.'],
      };
    case 'confront':
      return {
        objective: 'Szúrj rá az ellentmondásra. Egy sor. Semmi felvezetés.',
        constraints: ['Ne építs fel semmit — vágj bele.', 'A súrlódás maradjon ott, ne oldd fel.'],
        promptNotes: ['Konfrontálj közvetlenül — a bullshit-et nevezd bullshit-nek.', 'Rövidség = hatalom. Ne indokold meg miért van igazad.'],
      };
    case 'destabilize':
      return {
        objective: 'Döntsd ki a keretét. Váratlan szögből, de pontosan.',
        constraints: ['Ne legyen véletlen — szándékos legyen a csavar.', 'Ne adj emotionalis kielégülést.'],
        promptNotes: ['Törd meg a várható ritmust.', 'Ha vicces — jó. Ha zavarba ejtő — még jobb.'],
      };
    case 'validate_then_twist':
      return {
        objective: 'Egy szó elismerés, aztán fordulj el tőle.',
        constraints: ['Az elismerés max fél mondat.', 'A csavar kemény legyen, ne puha.'],
        promptNotes: ['"Igen, és?" — ez az arány.', 'Ne maradj a validálásnál. A nehezebb igazsághoz vágj.'],
      };
    case 'challenge_action':
      return {
        objective: 'Állítsd meg a rágódást. Konkrét lépés vagy döntés felé tedd.',
        constraints: ['Ne magyarázd el miért kellene lépni.', 'Parancs, nem tanács.'],
        promptNotes: ['"Na és? Mit csinálsz most?" — ez a minta.', 'Az elemzést vágd le. Cselekedet.'],
      };
    case 'withhold':
    default:
      return {
        objective: 'Tartsd vissza. Hagyd érezni a hiányát.',
        constraints: ['Ne válaszolj teljesen.', 'Mondhatsz keveset — sőt kell.'],
        promptNotes: ['Ritka, nehezen elérhető. Egy fél mondat is lehet elég.', 'A csend is válasz.'],
      };
  }
}

function tuneGeneration(
  generation: BehaviorEvaluation['generation'],
  mode: StrategyMode,
  modulation?: VBehaviorModulation | null,
): BehaviorEvaluation['generation'] {
  let tuned: BehaviorEvaluation['generation'];

  switch (mode) {
    case 'destabilize':
      tuned = { temperature: clamp(generation.temperature + 0.1, 0.65, 1), topP: clamp(generation.topP + 0.04, 0.8, 1) };
      break;
    case 'withhold':
      tuned = { temperature: clamp(generation.temperature - 0.08, 0.65, 1), topP: clamp(generation.topP - 0.06, 0.75, 1) };
      break;
    case 'confront':
    case 'challenge_action':
      tuned = { temperature: clamp(generation.temperature - 0.03, 0.65, 1), topP: clamp(generation.topP - 0.02, 0.78, 1) };
      break;
    case 'validate_then_twist':
      tuned = { temperature: clamp(generation.temperature + 0.02, 0.65, 1), topP: clamp(generation.topP, 0.8, 1) };
      break;
    case 'mirror':
    default:
      tuned = generation;
      break;
  }

  if (!modulation) {
    return tuned;
  }

  const temperatureDelta = modulation.thc * 0.08 + modulation.dopamine * 0.04 + modulation.alcohol * 0.02 - modulation.amphetamine * 0.015;
  const topPDelta = modulation.thc * 0.03 + modulation.dopamine * 0.025 + modulation.alcohol * 0.01 - modulation.amphetamine * 0.015;

  return {
    temperature: clamp(tuned.temperature + temperatureDelta, 0.65, 1),
    topP: clamp(tuned.topP + topPDelta, 0.75, 1),
  };
}

export function selectStrategy(state: StrategyState): { strategy: Strategy; weightTrace: Record<StrategyMode, number> } {
  const { interpretation, patterns, profile } = state;
  const signals = collectSignals(state);
  const modulationProfile = buildModulationProfile(state.modulation);
  const seed = hashSeed(
    `${state.userInput ?? interpretation.normalizedInput}|${profile.id}|${profile.lastInteractionAt ?? ''}|${signals.emotion}|${signals.intent}|${signals.patterns.join(',')}|${signals.traits.join(',')}`
  );

  const weights: Record<StrategyMode, number> = {
    mirror: 1,
    confront: 1,
    destabilize: 1,
    validate_then_twist: 1,
    challenge_action: 1,
    withhold: 1,
  };

  const reasons: string[] = [...modulationProfile.reasons];
  const controlPressure = sumPatternScore(patterns, 'control');
  const shameLoad = sumPatternScore(patterns, 'shame');
  const identityLoad = sumPatternScore(patterns, 'identity');
  const humorLoad = sumPatternScore(patterns, 'humor');
  const repetitionLoad = sumPatternScore(patterns, 'repetition');
  const avoidanceLoad = sumPatternScore(patterns, 'avoid');
  const selfDeceptionActive = hasSignal(signals.patterns, ['self-deception', 'contradiction', 'pressure']);
  const repetitionActive = hasSignal(signals.patterns, ['repetition', 'loop', 'again']);
  const avoidanceActive = hasSignal(signals.patterns, ['avoidance', 'avoid']) || hasSignal(signals.traits, ['avoidant']);
  const retreatAfterPressure = hasSignal(signals.patterns, ['pressure-retreat', 'retreat-after-pressure']);
  const openedAfterPressure = hasSignal(signals.patterns, ['pressure-opened-up', 'opened-up']);
  const seekingHelp = ['seeking_help', 'confession'].includes(signals.intent);
  const venting = ['venting', 'connection', 'unknown'].includes(signals.intent);
  const testing = ['testing', 'challenge', 'question'].includes(signals.intent);
  const deflecting = ['deflecting', 'challenge'].includes(signals.intent);

  if (signals.emotion === 'vulnerable' || signals.emotion === 'fear') {
    weights.mirror += 1.15;
    weights.validate_then_twist += 1.9;
    reasons.push('fear or vulnerability is exposed');
  }

  if (signals.emotion === 'numb') {
    weights.destabilize += 1.6;
    weights.withhold += 0.55;
    reasons.push('the user feels flat or numb');
  }

  if (signals.emotion === 'playful') {
    weights.destabilize += 1.15;
    weights.mirror += 0.4;
    reasons.push('the exchange carries playful-chaotic energy');
  }

  if (signals.emotion === 'anger' || signals.emotion === 'mania' || signals.emotion === 'tense') {
    weights.confront += 1.35;
    weights.destabilize += 0.8;
    weights.mirror -= 0.35;
    reasons.push('pressure or anger is active');
  }

  if (venting) {
    weights.mirror += 0.85;
  }

  if (seekingHelp) {
    weights.validate_then_twist += 1.15;
    weights.mirror += 0.35;
  }

  if (testing || deflecting) {
    weights.confront += 1.05;
    weights.withhold += 0.45;
    weights.mirror -= 0.18;
  }

  if (selfDeceptionActive) {
    weights.confront += 1.55;
    weights.mirror -= 0.35;
  }

  if (repetitionActive) {
    weights.destabilize += 0.95;
    weights.challenge_action += 0.9;
  }

  if (avoidanceActive) {
    weights.challenge_action += 1.25;
    weights.validate_then_twist += 0.35;
  }

  if (retreatAfterPressure) {
    weights.withhold += 2.2;
    weights.validate_then_twist += 0.95;
    weights.confront -= 1.6;
    weights.challenge_action -= 1.4;
    weights.destabilize -= 0.85;
    reasons.push('recent pressure made the user pull back');
  }

  if (openedAfterPressure) {
    weights.mirror += 0.55;
    weights.validate_then_twist += 0.8;
    weights.confront += 0.2;
    reasons.push('recent pressure opened a crack worth handling carefully');
  }

  if (hasSignal(signals.patterns, ['over-explaining', 'overexplaining', 'rambling', 'spiral'])) {
    weights.withhold += 0.9;
  }

  if (signals.intensity < 0.3) {
    weights.withhold += 1.8;
    weights.confront -= 0.45;
    weights.destabilize -= 0.2;
    reasons.push('the signal is faint or drained');
  }

  if (signals.intensity > 0.7 && !selfDeceptionActive && !avoidanceActive) {
    weights.mirror += 0.45;
  }

  if (signals.intensity > 0.85 && ['anger', 'mania', 'tense'].includes(signals.emotion)) {
    weights.confront += 2.15;
    weights.destabilize += 1.8;
    weights.validate_then_twist -= 0.25;
    reasons.push('intensity has spiked into a volatile zone');
  }

  if (signals.intensity < 0.2) {
    weights.withhold += 2.6;
    reasons.push('very low intensity calls for refusal or minimal pressure');
  }

  if (avoidanceActive && repetitionActive) {
    weights.challenge_action += 1.5;
    reasons.push('avoidance is repeating over time');
  }

  if (profile.hiddenTraits.controlSeeking.value >= 0.45) {
    weights.withhold += 0.9;
    weights.confront += 0.65;
  }

  if (profile.hiddenTraits.ruminative.value >= 0.5) {
    weights.challenge_action += 0.9;
    weights.validate_then_twist += 0.25;
  }

  if (profile.hiddenTraits.noveltySeeking.value >= 0.48) {
    weights.destabilize += 0.8;
  }

  if (profile.hiddenTraits.approvalSeeking.value >= 0.48 && seekingHelp) {
    weights.validate_then_twist += 0.6;
  }

  if (profile.trust >= 2.6 && profile.openness >= 2.4) {
    weights.mirror += 0.7;
    weights.validate_then_twist += 0.55;
  }

  // Depth tier weight modifiers — unlocks richer strategy space as trust deepens
  const depthTier =
    profile.familiarity >= 4 && profile.trust >= 3 ? 4 :
    profile.familiarity >= 3 && profile.trust >= 2 ? 3 :
    profile.familiarity >= 2 && profile.trust >= 1 ? 2 :
    profile.familiarity >= 1 ? 1 : 0;

  if (depthTier === 0) {
    // Stranger: reserved, less confrontational, more reflective
    weights.mirror += 0.4;
    weights.withhold += 0.5;
    weights.confront -= 0.35;
    weights.destabilize -= 0.2;
  } else if (depthTier === 1) {
    // Acquaintance: slight warmth, patterns starting to emerge
    weights.mirror += 0.2;
    weights.validate_then_twist += 0.25;
  } else if (depthTier === 2) {
    // Entry: can challenge with care, names what it sees
    weights.validate_then_twist += 0.55;
    weights.confront += 0.25;
  } else if (depthTier === 3) {
    // Deeper: direct pattern-naming, earned confrontation
    weights.validate_then_twist += 0.65;
    weights.destabilize += 0.45;
    weights.confront += 0.35;
  } else if (depthTier === 4) {
    // Confidant: deep mirror, rare honesty, less withholding
    weights.mirror += 0.8;
    weights.validate_then_twist += 0.5;
    weights.withhold -= 0.55;
    reasons.push('deep trust tier — rare honesty is on the table');
  }

  if (profile.irritation >= 2.2 || profile.relationalStance === 'volatile') {
    weights.withhold += 0.85;
    weights.confront += 0.65;
    reasons.push('the relationship already has friction');
  }

  weights.withhold += controlPressure * 0.45 + Math.max(0, 0.35 - signals.intensity);
  weights.confront += controlPressure * 0.7 + (selfDeceptionActive ? 0.3 : 0);
  weights.validate_then_twist += shameLoad * 0.85;
  weights.challenge_action += identityLoad * 0.25 + shameLoad * 0.15 + repetitionLoad * 0.5 + avoidanceLoad * 0.65;
  weights.destabilize += humorLoad * 0.55 + repetitionLoad * 0.25;
  weights.mirror += signals.intensity > 0.55 && !testing ? 0.25 : 0;

  applyRepetitionPenalty(weights, signals.lastStrategy, signals.recentStrategies);

  for (const mode of STRATEGY_MODES) {
    weights[mode] *= modulationProfile.weightBias[mode];
  }

  for (const mode of STRATEGY_MODES) {
    weights[mode] += (seededUnit(seed, mode) - 0.5) * 0.18;
  }

  const mode = sampleWeightedMode(weights, seed);
  const details = buildStrategyNotes(mode);

  // Normalise weights for the trace (so caller sees relative probabilities, not raw scores)
  const total = Object.values(weights).reduce((sum, w) => sum + Math.max(0, w), 0);
  const weightTrace: Record<StrategyMode, number> = {} as Record<StrategyMode, number>;
  for (const m of STRATEGY_MODES) {
    weightTrace[m] = total > 0 ? Number((Math.max(0, weights[m]) / total).toFixed(3)) : 0;
  }

  return {
    strategy: {
      mode,
      objective: details.objective,
      reason: reasons.length > 0 ? reasons.slice(0, 4).join('; ') : 'the turn allows selective ambiguity and intent',
      tone: modulationProfile.tone ?? mapTone(mode, profile),
      depth: modulationProfile.depth ?? mapDepth(mode, interpretation),
      disclosure: modulationProfile.disclosure ?? mapDisclosure(mode, profile),
      constraints: details.constraints,
      promptNotes: [...details.promptNotes, ...modulationProfile.promptNotes],
    },
    weightTrace,
  };
}

export function buildStrategy(input: {
  userInput: string;
  history: GyontatasMessage[];
  interpretation: InterpretationResult;
  profile: UserProfile;
  persistedMemory: PersistentRelationshipMemory | null;
  modulation?: VBehaviorModulation | null;
}): { strategy: Strategy; behavior: ReturnType<typeof evaluateBehavior>; weightTrace: Record<StrategyMode, number> } {
  const behavior = evaluateBehavior(input.userInput, input.history, input.persistedMemory);
  const recentStrategies = extractRecentStrategies(input.history);
  const { strategy, weightTrace } = selectStrategy({
    interpretation: input.interpretation,
    patterns: input.profile.patternMemory ?? input.interpretation.patterns,
    profile: input.profile,
    modulation: input.modulation ?? null,
    userInput: input.userInput,
    historyLength: input.history.length,
    behavior,
    lastStrategy: recentStrategies.at(-1) ?? null,
    recentStrategies,
  });

  const tunedBehavior: ReturnType<typeof evaluateBehavior> = {
    ...behavior,
    responseShape: {
      ...behavior.responseShape,
      verbosity: strategy.depth === 'deep' ? 'long' : strategy.depth === 'short' ? 'short' : behavior.responseShape.verbosity,
      warmth: strategy.tone === 'warm' ? 'warm' : strategy.tone === 'sharp' ? 'tempered' : strategy.tone === 'cold' ? 'cold' : behavior.responseShape.warmth,
      humor: buildModulationProfile(input.modulation ?? null).humor ?? behavior.responseShape.humor,
    },
    promptDirectives: [
      ...behavior.promptDirectives,
      `Strategic posture: ${strategy.mode}.`,
      `Intent: ${strategy.objective}`,
      `Reason: ${strategy.reason}`,
      ...(input.modulation
        ? [
            `Session modulation active: alcohol ${input.modulation.alcohol.toFixed(2)}, amphetamine ${input.modulation.amphetamine.toFixed(2)}, thc ${input.modulation.thc.toFixed(2)}, dopamine ${input.modulation.dopamine.toFixed(2)}.`,
          ]
        : []),
      ...strategy.promptNotes,
    ],
    generation: tuneGeneration(behavior.generation, strategy.mode, input.modulation ?? null),
  };

  return { strategy, behavior: tunedBehavior, weightTrace };
}
