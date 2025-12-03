import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { CHIP_UNIT } from "../constants";

// Models to use
const GEMINI_TEXT_MODEL = "gemini-1.5-pro";  // For text analysis/reports
const IMAGEN_MODEL = "imagen-3.0-generate-001";  // For image generation

// Get Gemini API client with API key from environment variable
const getClient = (): GoogleGenAI | null => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Gemini API key is not configured. Set VITE_GEMINI_API_KEY in .env");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

// Helper to check for billing errors
const handleApiError = (error: any): string => {
    const errorMessage = error?.message || error?.toString() || "";
    const statusCode = error?.status || error?.statusCode || 0;

    console.error("API Error:", error);

    // Check for billing/quota errors
    if (statusCode === 403 || statusCode === 400 ||
        errorMessage.includes("403") || errorMessage.includes("400") ||
        errorMessage.includes("billing") || errorMessage.includes("quota") ||
        errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        return "API 키의 결제 설정(Billing)을 확인해주세요. Imagen 3 이미지 생성은 Google Cloud 결제가 연결된 프로젝트에서만 작동합니다.";
    }

    // Check for model not found errors
    if (statusCode === 404 || errorMessage.includes("404") || errorMessage.includes("not found")) {
        return "모델을 찾을 수 없습니다. API 키와 모델 접근 권한을 확인해주세요.";
    }

    return "API 호출 중 오류가 발생했습니다. API 키를 확인해주세요.";
};

export const getStrategicAdvice = async (gameState: GameState, myTeamId: string): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
        return "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.";
    }

    // Find team by ID
    const me = gameState.players.find(p => p.id === myTeamId);
    if (!me) return "팀 정보를 찾을 수 없습니다.";

    const myIndex = gameState.players.findIndex(p => p.id === myTeamId);
    const currentTurnIndex = gameState.currentPlayerIndex;
    const totalTeams = gameState.players.length;
    const playersUntilMyTurn = (myIndex - currentTurnIndex + totalTeams) % totalTeams;

    const allPlayersInfo = gameState.players
        .map((p, idx) => {
            const isMe = p.id === myTeamId;
            const isCurrentTurn = idx === currentTurnIndex;
            const turnOrderFromNow = (idx - currentTurnIndex + totalTeams) % totalTeams;
            return `- ${p.colorIdx + 1}팀${isMe ? ' (우리팀)' : ''}${isCurrentTurn ? ' [현재 차례]' : ''}: 자원 ${p.chips}억, 프로젝트 [${p.cards.join(', ') || '없음'}], 현재 수익 ${p.score}억, 순서 ${turnOrderFromNow + 1}번째`;
        })
        .join('\n');

    const prompt = `
당신은 '마이너스 경매(Minus Auction)' 게임의 전문 전략가입니다.

[게임 개요]
- 총 참여 팀 수: ${totalTeams}팀
- 현재 라운드: ${gameState.turnCount}

[현재 경매 상황]
- 경매 중인 프로젝트: ${gameState.currentCard}억 (이 프로젝트를 가져오면 이만큼의 부채)
- 팟에 쌓인 자원: ${gameState.pot}${CHIP_UNIT}
- 덱에 남은 프로젝트: ${gameState.deck?.length || 0}개

[우리 팀 (${me.colorIdx + 1}팀)]
- 현재 자원: ${me.chips}${CHIP_UNIT}
- 보유 프로젝트: [${me.cards.join('억, ') || '없음'}]
- 현재 점수: ${me.score}억
- 순서: ${playersUntilMyTurn === 0 ? '현재 우리 차례' : `${playersUntilMyTurn}번째 후 우리 차례`}

[전체 팀 현황]
${allPlayersInfo}

[규칙]
1. 프로젝트 카드는 -26억 ~ -50억
2. 연속 숫자(예: -30, -31, -32)를 모으면 가장 작은 수(-30)만 부채로 계산
3. PASS하면 자원 1억을 내야 함
4. TAKE하면 현재 프로젝트와 쌓인 자원을 모두 획득

현재 상황을 분석하여 PASS vs TAKE 전략을 3-4문장으로 조언해주세요.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    return response.text || "조언을 생성할 수 없습니다.";
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateGameAnalysis = async (gameState: GameState): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      return "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.";
    }

    const rankedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const winner = rankedPlayers[0];

    const teamsInfo = rankedPlayers.map((p, rank) => {
      const sequences = findSequences(p.cards);
      return `${rank + 1}위 - ${p.colorIdx + 1}팀 (${p.members?.join(', ') || p.name}):
  - 최종 점수: ${p.score}억
  - 보유 자원: ${p.chips}억
  - 보유 프로젝트: [${p.cards.join(', ') || '없음'}]
  - 연속 시퀀스: ${sequences.length > 0 ? sequences.map(s => `[${s.join(', ')}]`).join(', ') : '없음'}`;
    }).join('\n\n');

    const prompt = `
'마이너스 경매(Strategic Positioning)' 게임 결과를 분석해주세요.

[게임 규칙]
- 마이너스 프로젝트(-26억 ~ -50억) 경매
- 연속 숫자를 모으면 가장 작은 수만 부채로 계산 (시너지 효과)

[최종 결과]
${teamsInfo}

다음 형식으로 분석해주세요:

## 게임 종합 평가
(전체 게임 흐름 분석)

## 전략 분석
(각 팀의 전략을 블루오션/레드오션/퍼플오션 관점에서)

## 우승팀 (${winner.colorIdx + 1}팀) 성공 요인
- 핵심 성공 요인
- 경영전략적 시사점

## 교훈
(이 게임에서 배울 수 있는 인사이트)

한국어로 전문적이면서 이해하기 쉽게 작성해주세요.
`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    return response.text || "분석을 생성할 수 없습니다.";
  } catch (error) {
    return handleApiError(error);
  }
};

const findSequences = (cards: number[]): number[][] => {
  if (cards.length === 0) return [];
  const sorted = [...cards].sort((a, b) => a - b);
  const sequences: number[][] = [];
  let currentSeq: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentSeq.push(sorted[i]);
    } else {
      if (currentSeq.length >= 2) sequences.push([...currentSeq]);
      currentSeq = [sorted[i]];
    }
  }
  if (currentSeq.length >= 2) sequences.push(currentSeq);
  return sequences;
};

// Generate winner poster image using Imagen 3
export const generateWinnerPoster = async (
  gameState: GameState
): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      throw new Error("API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.");
    }

    const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
    const memberNames = winner.members?.join(', ') || winner.name;

    // Imagen 3 image generation prompt
    const imagePrompt = `Create a dramatic Netflix Korean drama "Casino" style winner poster.
Dark cinematic atmosphere with neon purple and gold lighting.
Text overlay: "TEAM ${winner.colorIdx + 1} - WINNER" in bold metallic gold font.
"Strategic Positioning Champion" subtitle.
Score: "${winner.score} Billion" displayed prominently.
Members: "${memberNames}" in elegant white text.
Background: luxurious casino/auction house with dramatic shadows.
Style: high contrast, cinematic color grading, premium quality, dramatic lighting.
Mood: triumphant, prestigious, exclusive.`;

    // Use Imagen 3 generateImages method
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL,
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "9:16",  // Portrait for poster
      }
    });

    // Get the generated image as base64
    if (response.generatedImages && response.generatedImages.length > 0) {
      const imageBytes = response.generatedImages[0].image?.imageBytes;
      if (imageBytes) {
        // Return as data URL for display in browser
        return `data:image/png;base64,${imageBytes}`;
      }
    }

    throw new Error("이미지 생성 결과가 없습니다.");
  } catch (error: any) {
    console.error("Poster generation error:", error);

    // Check for billing/permission errors specifically for Imagen
    const errorMessage = error?.message || error?.toString() || "";
    if (errorMessage.includes("403") || errorMessage.includes("400") ||
        errorMessage.includes("billing") || errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("not enabled") || errorMessage.includes("quota")) {
      throw new Error("API 키의 결제 설정(Billing)을 확인해주세요. Imagen 3 이미지 생성은 Google Cloud 결제가 연결된 프로젝트에서만 작동합니다.");
    }

    throw error;
  }
};

export const generatePosterDescription = async (gameState: GameState): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      return "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.";
    }

    const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
    const memberNames = winner.members?.join(', ') || winner.name;

    const prompt = `
한국 넷플릭스 드라마 "카지노" 스타일의 우승팀 포스터 설명을 작성해주세요.

우승팀: ${winner.colorIdx + 1}팀
팀원: ${memberNames}
최종 점수: ${winner.score}억

포스터 컨셉을 상세히 설명해주세요:
1. 전체적인 분위기와 색감
2. 배경 디자인
3. 타이틀과 서브타이틀
4. 태그라인

한국어로 구체적으로 작성해주세요.
`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    return response.text || "포스터 설명을 생성할 수 없습니다.";
  } catch (error) {
    return handleApiError(error);
  }
};
