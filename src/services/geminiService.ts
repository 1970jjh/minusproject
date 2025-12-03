import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { CHIP_UNIT } from "../constants";

// Get Gemini API client with Vite environment variable
const getClient = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("VITE_GEMINI_API_KEY is not set in environment variables");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const getStrategicAdvice = async (gameState: GameState, myPlayerId: string): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
        return "API 키가 설정되지 않았습니다. 관리자에게 문의하세요.";
    }

    const me = gameState.players.find(p => p.id === myPlayerId);

    if (!me) return "플레이어 정보를 찾을 수 없습니다.";

    // Build other players info
    const otherPlayers = gameState.players
        .filter(p => p.id !== myPlayerId)
        .map(p => `- ${p.colorIdx + 1}팀: 자원 ${p.chips}억, 프로젝트 [${p.cards.join(', ')}]`)
        .join('\n');

    const prompt = `
      당신은 '마이너스 경매(Minus Auction)' 게임의 전문 전략가입니다.
      이번 게임은 기업 간의 프로젝트 입찰 경쟁 컨셉입니다.

      [현재 상황]
      - 현재 경매 중인 프로젝트: ${gameState.currentCard}억 (이 프로젝트를 가져오면 이만큼의 부채가 생깁니다)
      - 팟(Pot)에 쌓인 지원금: ${gameState.pot}${CHIP_UNIT}
      - 우리 팀(${me.colorIdx + 1}팀) 자원: ${me.chips}${CHIP_UNIT}
      - 우리 팀 보유 프로젝트: [${me.cards.join('억, ')}억]
      - 우리 팀 현재 점수: ${me.score}억
      - 덱에 남은 프로젝트 수: ${gameState.deck?.length || 0}개

      [다른 팀 현황]
      ${otherPlayers}

      [규칙]
      1. 프로젝트 카드는 -26억 ~ -50억입니다.
      2. 자원(칩) 1개는 1억의 가치를 가집니다.
      3. 연속된 숫자(예: -30, -31, -32)를 모으면 절대값이 가장 작은 수(-30)만 부채로 계산됩니다.
      4. PASS하면 자원 1억을 내야 합니다.
      5. TAKE하면 현재 프로젝트와 쌓인 자원을 모두 가져옵니다.
      6. 게임 종료 시 점수 = 보유 자원 - 부채(연속 규칙 적용)

      전략적 조언을 해주세요: PASS해야 할까요, 아니면 TAKE해야 할까요?
      한국어로, 비즈니스 전략가 톤으로 3문장 이내로 핵심만 설명해주세요.
      다른 팀의 상황도 고려해서 조언해주세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: prompt,
    });

    return response.text || "조언을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "현재 전략을 분석할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }
};
