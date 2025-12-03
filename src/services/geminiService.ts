import { GoogleGenerativeAI } from "@google/generative-ai";
import { GameState } from "../types";
import { CHIP_UNIT } from "../constants";

// Models to use
const GEMINI_TEXT_MODEL = "gemini-2.5-pro-preview-05-06";  // For text analysis/reports (latest)
const GEMINI_VISION_MODEL = "gemini-2.5-flash-preview-05-20";  // For image analysis

// Get Gemini API client with API key from environment variable
const getClient = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Gemini API key is not configured. Set VITE_GEMINI_API_KEY in .env");
        return null;
    }
    return new GoogleGenerativeAI(apiKey);
};

export const getStrategicAdvice = async (gameState: GameState, myTeamId: string): Promise<string> => {
  try {
    const genAI = getClient();
    if (!genAI) {
        return "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.";
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "조언을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "전략 분석 중 오류가 발생했습니다. API 키를 확인해주세요.";
  }
};

export const generateGameAnalysis = async (gameState: GameState): Promise<string> => {
  try {
    const genAI = getClient();
    if (!genAI) {
      return "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.";
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

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

## 🏆 게임 종합 평가
(전체 게임 흐름 분석)

## 📊 전략 분석
(각 팀의 전략을 블루오션/레드오션/퍼플오션 관점에서)

## 👥 우승팀 (${winner.colorIdx + 1}팀) 성공 요인
- 핵심 성공 요인
- 경영전략적 시사점

## 💡 교훈
(이 게임에서 배울 수 있는 인사이트)

한국어로 전문적이면서 이해하기 쉽게 작성해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "분석을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "게임 분석 중 오류가 발생했습니다. API 키를 확인해주세요.";
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

// Generate winner poster - Note: Gemini API cannot generate images directly
// This function analyzes the uploaded image and returns a description for manual poster creation
export const generateWinnerPoster = async (
  gameState: GameState,
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  try {
    const genAI = getClient();
    if (!genAI) {
      throw new Error("API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.");
    }

    // Use gemini-1.5-flash for image analysis (multimodal)
    const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });
    const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
    const memberNames = winner.members?.join(', ') || winner.name;

    const prompt = `
당신은 게임 우승팀 포스터 디자인 전문가입니다.

[우승팀 정보]
- 팀: ${winner.colorIdx + 1}팀
- 팀원: ${memberNames}
- 최종 점수: ${winner.score}억

업로드된 팀 사진을 분석하여, Netflix "카지노" 스타일의 드라마틱한 포스터 컨셉을 제안해주세요.
사진 속 인물들의 특징, 분위기를 활용한 구체적인 디자인 방향을 제시해주세요.

형식:
## 📸 사진 분석
(사진 속 인물/분위기 설명)

## 🎬 포스터 컨셉
(구체적인 디자인 방향)

## 📝 추천 태그라인
(3-5개의 태그라인 제안)
`;

    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text() || "포스터 컨셉을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Poster generation error:", error);
    throw error;
  }
};

export const generatePosterDescription = async (gameState: GameState): Promise<string> => {
  try {
    const genAI = getClient();
    if (!genAI) {
      return "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.";
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "포스터 설명을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "포스터 설명 생성 중 오류가 발생했습니다.";
  }
};
