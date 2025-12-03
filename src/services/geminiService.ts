import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { CHIP_UNIT } from "../constants";

// Get Gemini API client with API key (from config or environment variable)
const getClient = (apiKeyFromConfig?: string) => {
    // Prefer API key from config, fallback to environment variable
    const apiKey = apiKeyFromConfig || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API key is not configured");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const getStrategicAdvice = async (gameState: GameState, myPlayerId: string): Promise<string> => {
  try {
    // Get API key from game config
    const apiKey = gameState.config?.geminiApiKey;
    const ai = getClient(apiKey);
    if (!ai) {
        return "API 키가 설정되지 않았습니다. 관리자에게 문의하세요.";
    }

    const me = gameState.players.find(p => p.id === myPlayerId);

    if (!me) return "플레이어 정보를 찾을 수 없습니다.";

    // Calculate my position in turn order
    const myIndex = gameState.players.findIndex(p => p.id === myPlayerId);
    const currentTurnIndex = gameState.currentPlayerIndex;
    const totalTeams = gameState.players.length;

    // Calculate how many players until my turn (should be 0 if it's my turn)
    const playersUntilMyTurn = (myIndex - currentTurnIndex + totalTeams) % totalTeams;

    // Build all players info with their turn order
    const allPlayersInfo = gameState.players
        .map((p, idx) => {
            const isMe = p.id === myPlayerId;
            const isCurrentTurn = idx === currentTurnIndex;
            const turnOrderFromNow = (idx - currentTurnIndex + totalTeams) % totalTeams;
            return `- ${p.colorIdx + 1}팀${isMe ? ' (우리팀)' : ''}${isCurrentTurn ? ' [현재 차례]' : ''}: 자원 ${p.chips}억, 프로젝트 [${p.cards.join(', ') || '없음'}], 현재 수익 ${p.score}억, 순서 ${turnOrderFromNow + 1}번째`;
        })
        .join('\n');

    const prompt = `
      당신은 '마이너스 경매(Minus Auction)' 게임의 전문 전략가입니다.
      이번 게임은 기업 간의 프로젝트 입찰 경쟁 컨셉입니다.

      [게임 개요]
      - 총 참여 팀 수: ${totalTeams}팀
      - 현재 라운드: ${gameState.turnCount}

      [현재 경매 상황]
      - 경매 중인 프로젝트: ${gameState.currentCard}억 (이 프로젝트를 가져오면 이만큼의 부채가 생깁니다)
      - 팟(Pot)에 쌓인 지원금: ${gameState.pot}${CHIP_UNIT}
      - 덱에 남은 프로젝트 수: ${gameState.deck?.length || 0}개

      [우리 팀 상세 (${me.colorIdx + 1}팀)]
      - 현재 자원: ${me.chips}${CHIP_UNIT}
      - 보유 프로젝트: [${me.cards.join('억, ') || '없음'}]
      - 현재 수익(점수): ${me.score}억
      - 순서: ${playersUntilMyTurn === 0 ? '현재 우리 차례' : `${playersUntilMyTurn}번째 후 우리 차례`}

      [전체 팀 현황 및 순서]
      ${allPlayersInfo}

      [규칙]
      1. 프로젝트 카드는 -26억 ~ -50억입니다.
      2. 자원(칩) 1개는 1억의 가치를 가집니다.
      3. 연속된 숫자(예: -30, -31, -32)를 모으면 절대값이 가장 작은 수(-30)만 부채로 계산됩니다.
      4. PASS하면 자원 1억을 내야 합니다.
      5. TAKE하면 현재 프로젝트와 쌓인 자원을 모두 가져옵니다.
      6. 게임 종료 시 점수 = 보유 자원 - 부채(연속 규칙 적용)

      [분석 요청]
      현재 상황을 종합적으로 분석하여 전략적 조언을 해주세요:
      1. 현재 프로젝트가 우리팀 연속 숫자 전략에 도움이 되는지
      2. 다른 팀들의 자원 상황과 그들이 PASS할 가능성
      3. 팟에 쌓인 자원 대비 프로젝트 부담
      4. 남은 게임 진행 상황

      PASS해야 할까요, 아니면 TAKE해야 할까요?
      한국어로, 비즈니스 전략가 톤으로 3-4문장으로 핵심 근거와 함께 명확하게 조언해주세요.
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
