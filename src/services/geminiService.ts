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

// Generate comprehensive game analysis for results page
export const generateGameAnalysis = async (gameState: GameState): Promise<string> => {
  try {
    const apiKey = gameState.config?.geminiApiKey;
    const ai = getClient(apiKey);
    if (!ai) {
      return "API 키가 설정되지 않았습니다. 관리자에게 문의하세요.";
    }

    // Sort players by score to determine rankings
    const rankedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const winner = rankedPlayers[0];

    // Build detailed team info
    const teamsInfo = rankedPlayers.map((p, rank) => {
      const sequences = findSequences(p.cards);
      return `${rank + 1}위 - ${p.colorIdx + 1}팀 (${p.members?.join(', ') || p.name}):
  - 최종 점수: ${p.score}억
  - 보유 자원: ${p.chips}억
  - 보유 프로젝트: [${p.cards.join(', ') || '없음'}]
  - 연속 시퀀스: ${sequences.length > 0 ? sequences.map(s => `[${s.join(', ')}]`).join(', ') : '없음'}`;
    }).join('\n\n');

    // Build game log summary
    const logSummary = gameState.logs
      .filter(log => log.message.includes('PASS') || log.message.includes('낙찰'))
      .slice(-20)
      .map(log => `Turn ${log.turn}: ${log.message}`)
      .join('\n');

    const prompt = `
당신은 경영전략 전문가이자 게임 분석가입니다. '마이너스 경매(Strategic Positioning)' 게임의 결과를 분석해주세요.

[게임 개요]
이 게임은 기업의 시장 포지셔닝 전략을 시뮬레이션합니다. 각 팀은 마이너스 프로젝트(-26억 ~ -50억)를 경매를 통해 획득하며, 연속된 숫자를 모으면 시너지 효과로 부채가 최소화됩니다.

[최종 결과]
${teamsInfo}

[주요 게임 로그]
${logSummary}

[분석 요청]
다음 형식으로 종합적인 분석을 제공해주세요:

## 🏆 게임 종합 평가
(전체 게임의 흐름과 특징적인 순간들을 분석)

## 📊 포지셔닝 맵 분석
(각 팀의 전략을 블루오션/레드오션/퍼플오션 관점에서 분석)
- X축: 리스크 수용도 (보수적 ↔ 공격적)
- Y축: 시너지 추구도 (개별 최적화 ↔ 연속 시퀀스 추구)

## 👥 팀별 전략 분석

### 우승팀 (${winner.colorIdx + 1}팀) 전략 분석
- 핵심 성공 요인
- 결정적 의사결정 순간
- 경영전략적 시사점

### 각 팀별 분석
(각 팀의 전략적 우수점과 아쉬운 점)

## 💡 Strategic Positioning 교훈
(이 게임에서 배울 수 있는 경영전략적 인사이트)

한국어로 작성하고, 경영전략 컨설턴트 톤으로 전문적이면서도 이해하기 쉽게 설명해주세요.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: prompt,
    });

    return response.text || "분석을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "게임 분석을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }
};

// Helper function to find sequences in cards
const findSequences = (cards: number[]): number[][] => {
  if (cards.length === 0) return [];

  const sorted = [...cards].sort((a, b) => a - b);
  const sequences: number[][] = [];
  let currentSeq: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentSeq.push(sorted[i]);
    } else {
      if (currentSeq.length >= 2) {
        sequences.push([...currentSeq]);
      }
      currentSeq = [sorted[i]];
    }
  }

  if (currentSeq.length >= 2) {
    sequences.push(currentSeq);
  }

  return sequences;
};

// Generate winner poster with uploaded photo using Gemini Imagen
export const generateWinnerPoster = async (
  gameState: GameState,
  imageBase64: string,
  mimeType: string
): Promise<string> => {
  try {
    const apiKey = gameState.config?.geminiApiKey;
    const ai = getClient(apiKey);
    if (!ai) {
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
    const memberNames = winner.members?.join(', ') || winner.name;

    // Use Gemini to generate image editing prompt and create poster
    const prompt = `
Create a dramatic movie poster in the style of the Korean Netflix drama "Casino" (starring Choi Min-sik).

Requirements:
- Style: Dark, noir, cinematic with gold and red accents
- Title: "STRATEGIC POSITIONING" in bold at the top
- Subtitle: "The Art of Calculated Risk"
- Winner team: "Team ${winner.colorIdx + 1}" prominently displayed
- Team members: ${memberNames}
- Score display: "Final Score: ${winner.score}억"
- Director credit style: "A JJ Creative Lab Production"
- Cast credits style listing the team members
- Dramatic lighting with shadows
- Casino/poker aesthetic elements
- Korean drama poster composition

Transform the uploaded team photo into this cinematic poster style while keeping the people recognizable.
`;

    // Note: Gemini's image generation capabilities vary by model
    // Using gemini-2.0-flash-exp for imagen capabilities
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ['image', 'text'],
      }
    });

    // Extract image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("이미지를 생성할 수 없습니다.");
  } catch (error) {
    console.error("Poster Generation Error:", error);
    throw error;
  }
};

// Generate poster description for manual creation
export const generatePosterDescription = async (
  gameState: GameState
): Promise<string> => {
  try {
    const apiKey = gameState.config?.geminiApiKey;
    const ai = getClient(apiKey);
    if (!ai) {
      return "API 키가 설정되지 않았습니다.";
    }

    const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
    const memberNames = winner.members?.join(', ') || winner.name;

    const prompt = `
한국 넷플릭스 드라마 "카지노" (최민식 주연) 스타일의 우승팀 포스터 설명을 작성해주세요.

우승팀 정보:
- 팀: ${winner.colorIdx + 1}팀
- 팀원: ${memberNames}
- 최종 점수: ${winner.score}억
- 보유 프로젝트: [${winner.cards.join(', ')}]

다음 요소를 포함한 포스터 컨셉을 상세히 설명해주세요:
1. 전체적인 분위기와 색감
2. 배경 디자인
3. 타이틀과 서브타이틀 배치
4. 팀원 이름 크레딧 스타일
5. 영화 포스터 특유의 태그라인

한국어로, 실제 포스터 디자이너에게 전달할 수 있을 정도로 구체적으로 작성해주세요.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: prompt,
    });

    return response.text || "포스터 설명을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "포스터 설명을 생성할 수 없습니다.";
  }
};
