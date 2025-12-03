
import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { CHIP_UNIT } from "../constants";

// Determine API Key source
const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    return new GoogleGenAI({ apiKey });
};

export const getStrategicAdvice = async (gameState: GameState, myPlayerId: string): Promise<string> => {
  try {
    const ai = getClient();
    const me = gameState.players.find(p => p.id === myPlayerId);
    
    if (!me) return "플레이어 정보를 찾을 수 없습니다.";

    const prompt = `
      당신은 '마이너스 경매(Minus Auction)' 게임의 전문 전략가입니다.
      이번 게임은 기업 간의 프로젝트 입찰 경쟁 컨셉입니다.
      
      [현재 상황]
      - 현재 경매 중인 프로젝트: ${gameState.currentCard}억 (이 프로젝트를 가져오면 이만큼의 부채가 생깁니다)
      - 팟(Pot)에 쌓인 지원금: ${gameState.pot}${CHIP_UNIT}
      - 우리 팀 자원: ${me.chips}${CHIP_UNIT}
      - 우리 팀 보유 프로젝트: [${me.cards.join('억, ')}억]
      - 덱에 남은 프로젝트 수: ${gameState.deck.length}개
      
      [규칙]
      1. 프로젝트 카드는 -26억 ~ -50억입니다.
      2. 자원(칩) 1개는 1억의 가치를 가집니다.
      3. 연속된 숫자(예: -30, -31, -32)를 모으면 절대값이 가장 작은 수(-30)만 부채로 계산됩니다.
      4. PASS하면 자원 1억을 내야 합니다.
      5. TAKE하면 현재 프로젝트와 쌓인 자원을 모두 가져옵니다.

      전략적 조언을 해주세요: PASS해야 할까요, 아니면 TAKE해야 할까요? 
      한국어로, 비즈니스 전략가 톤으로 2문장 이내로 핵심만 설명해주세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "조언을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "현재 전략을 분석할 수 없습니다.";
  }
};
