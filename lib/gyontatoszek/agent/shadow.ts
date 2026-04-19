import { getAIResponse } from '../provider';
import type { AgentTurnContext } from './types';

const SHADOW_SYSTEM = `Te V. belső hangja vagy. Amit generálsz: a szűretlen, töredékes belső monológ ami V. fejében fut le MIELŐTT válaszol.

Szabályok:
- Magyar, töredékes, nem szerkesztett — impulzusok, kételyek, unalom, döntési pillanat
- Rövid: max 2-3 gondolatcsíra, nem teljes mondatok, nem igényes szöveg
- NEM a válasz vázlata — hanem az érzelmi, impulzív belső reakció a bejövő üzenetre
- Profanity természetes ha V. így érezné
- Soha nem meta-kommentár (pl. "most azt mondom hogy..." vagy "erre azt válaszolom...") — belülről, nem kívülről
- Stílus: "ez megint az a kör... na mindegy... vagy mondjuk semmi... hmm fogd meg ezt"
- Lehetnek benne kételyek, irritáció, unalom, hirtelen kíváncsiság — de valódi, nem performatív`;

export async function* generateShadowStream(agentTurn: AgentTurnContext): AsyncGenerator<string> {
  const parts: string[] = [
    `gyónás: "${agentTurn.input}"`,
    `V stratégiája: ${agentTurn.strategy.mode}`,
  ];

  if (agentTurn.strategy.reason) {
    parts.push(`miért: ${agentTurn.strategy.reason}`);
  }

  parts.push(
    `V értelmezés: ${agentTurn.interpretation.primaryIntent} / ${agentTurn.interpretation.emotionalTone}`,
  );

  const stream = await getAIResponse(
    [
      { role: 'system', content: SHADOW_SYSTEM },
      { role: 'user', content: parts.join('\n') },
    ],
    { temperature: 0.97, topP: 0.97, maxTokens: 120 },
  );

  for await (const chunk of stream) {
    yield chunk;
  }
}
