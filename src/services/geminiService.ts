import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { CHIP_UNIT } from "../constants";

// Models to use
const GEMINI_TEXT_MODEL = "gemini-2.0-flash";  // For text analysis/reports
const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp";  // For image generation (Native Image-to-Image)

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

export interface AnalysisSection {
  title: string;
  content: string;
  type: 'summary' | 'team' | 'winner' | 'insight' | 'positioning';
}

export interface GameAnalysisResult {
  sections: AnalysisSection[];
  rawText: string;
}

export const generateGameAnalysis = async (gameState: GameState): Promise<GameAnalysisResult> => {
  try {
    const ai = getClient();
    if (!ai) {
      return {
        sections: [{
          title: "오류",
          content: "API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.",
          type: "summary"
        }],
        rawText: ""
      };
    }

    const rankedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const winner = rankedPlayers[0];
    const companyName = gameState.config?.roomName || "참여 기업";

    const teamsInfo = rankedPlayers.map((p, rank) => {
      const sequences = findSequences(p.cards);
      const cardSum = p.cards.reduce((sum, c) => sum + c, 0);
      const sequenceBonus = sequences.reduce((sum, seq) => {
        const saved = seq.slice(1).reduce((s, c) => s + c, 0);
        return sum + saved;
      }, 0);
      return `${rank + 1}위 - ${p.colorIdx + 1}팀 (${p.members?.join(', ') || p.name}):
  - 최종 점수: ${p.score}억
  - 보유 자원: ${p.chips}억
  - 보유 프로젝트: [${p.cards.join(', ') || '없음'}]
  - 프로젝트 총합: ${cardSum}억
  - 연속 시퀀스: ${sequences.length > 0 ? sequences.map(s => `[${s.join(', ')}]`).join(', ') : '없음'}
  - 시퀀스 절감액: ${sequenceBonus}억`;
    }).join('\n\n');

    const prompt = `
당신은 경영전략 전문가이자 게임 분석가입니다. 'Strategic Positioning(마이너스 경매)' 게임 결과를 매우 상세하고 풍부하게 분석해주세요.

[게임 규칙]
- 각 팀은 마이너스 프로젝트(-26억 ~ -50억)를 경매를 통해 획득합니다
- PASS: 자원 1억을 팟에 지불하고 다음 팀으로 넘김
- TAKE: 현재 프로젝트와 팟의 자원을 모두 획득
- 연속 숫자(예: -30, -31, -32)를 모으면 가장 작은 수(-30)만 부채로 계산되는 시너지 효과
- 최종 점수 = 보유 자원 + 프로젝트 점수(시퀀스 적용)

[게임 정보]
- 참여 회사/기관: ${companyName}
- 총 참여 팀 수: ${rankedPlayers.length}팀
- 총 진행 라운드: ${gameState.turnCount}

[최종 결과]
${teamsInfo}

다음 형식으로 매우 상세하게 분석해주세요. 각 섹션은 [SECTION:제목] 형식으로 시작하고 [/SECTION]으로 끝냅니다.

중요: 마크다운 기호를 절대 사용하지 마세요! *, **, #, ##, - 등의 기호를 텍스트에 포함하지 마세요. 순수한 텍스트만 작성하세요.

[SECTION:EXECUTIVE SUMMARY (경영 요약)]
이번 시뮬레이션의 핵심 인사이트를 3-4문장으로 요약해주세요. 어떤 전략이 효과적이었고, 어떤 팀이 왜 성공/실패했는지 한눈에 파악할 수 있도록 작성해주세요.
[/SECTION]

[SECTION:초반 전략 (Early Game Strategy)]
게임 초반(라운드 1-${Math.floor(gameState.turnCount / 3)}) 각 팀의 시장 진입 전략을 포지셔닝 관점에서 분석해주세요. 어떤 팀이 초반에 공격적으로 프로젝트를 확보하며 특정 영역에 포지셔닝했고, 어떤 팀이 자원을 축적하며 관망 전략을 택했는지 분석해주세요. 초기 시장 진입자(First Mover)와 후발 주자(Late Mover)의 전략적 차이를 구체적인 수치와 함께 설명해주세요.
[/SECTION]

[SECTION:중반 전략 (Mid Game Strategy)]
게임 중반의 경쟁 양상을 포지셔닝 관점에서 분석해주세요. 팀들 간의 자원 경쟁이 어떻게 전개되었는지, 각 팀이 어떤 숫자 영역(포지션)을 차지하기 위해 경쟁했는지 분석해주세요. 레드오션(경쟁이 치열한 영역)과 블루오션(미개척 영역)이 어떻게 형성되었는지 설명해주세요.
[/SECTION]

[SECTION:후반 전략 (Late Game Strategy)]
게임 후반에 각 팀이 차별화된 포지션을 어떻게 구축했는지 분석해주세요. 특정 숫자 영역을 독점하려는 시도(독점적 포지셔닝), 시퀀스 완성을 위한 전략적 움직임(시너지 포지셔닝), 그리고 최종 순위를 위한 마무리 전략을 설명해주세요.
[/SECTION]

[SECTION:팀별 포지셔닝 전략 분석 (Team Positioning Analysis)]
각 팀의 전략을 포지셔닝 관점에서 개별적으로 상세히 평가해주세요. 각 팀당 3-4문장으로 작성하고, 다음 관점에서 분석해주세요:
- 블루오션 전략: 경쟁을 피해 새로운 영역을 개척했는가?
- 레드오션 전략: 기존 경쟁 영역에서 우위를 점했는가?
- 퍼플오션 전략: 블루오션과 레드오션을 혼합한 전략을 사용했는가?
- 차별화 포지셔닝: 다른 팀과 어떻게 차별화된 포지션을 구축했는가?
${rankedPlayers.map((p, rank) => `
Team ${p.colorIdx + 1} (${rank + 1}위): 이 팀의 전략적 선택과 그 결과를 분석하세요.`).join('')}
[/SECTION]

[SECTION:STRATEGIC MVP TEAM (전략 MVP)]
가장 뛰어난 전략적 판단을 보여준 팀을 선정하고, 그 이유를 경영학적 관점에서 상세히 설명해주세요. 단순 점수 1위가 아닌, 가장 효율적인 자원 배분과 시기 적절한 의사결정을 한 팀을 선정해주세요. 구체적인 사례와 함께 설명해주세요.
[/SECTION]

[SECTION:FINAL CONCLUSION (최종 결론)]
이 게임에서 배울 수 있는 핵심 교훈을 정리해주세요:
1. 포지셔닝 전략 관점의 인사이트
2. 자원 배분(Resource Allocation)의 중요성
3. 타이밍과 의사결정의 관계
4. 경쟁과 협력의 균형
실제 비즈니스에 적용할 수 있는 시사점을 포함해주세요.
[/SECTION]

[SECTION:${companyName} 포지셔닝 전략 제안]
"${companyName}"이라는 회사/기관명을 분석하여, 이 회사가 실제로 적용할 수 있는 포지셔닝 전략을 제안해주세요:
1. 현재 시장에서의 추정 포지션 분석
2. 블루오션 전략 기회 탐색
3. 차별화 전략 제안
4. 리스크 관리 방안
5. 구체적인 실행 로드맵 제안
회사명에서 유추할 수 있는 산업/서비스 특성을 반영하여 맞춤형 전략을 제시해주세요. 만약 회사명이 일반적인 경우 IT/스타트업 관점에서 작성해주세요.
[/SECTION]

모든 내용을 한국어로, 전문적이면서도 이해하기 쉽게 작성해주세요. 분량을 아끼지 말고 풍성하게 작성해주세요.
`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    const rawText = response.text || "";

    // Parse sections from the response
    const sections: AnalysisSection[] = [];
    const sectionRegex = /\[SECTION:([^\]]+)\]([\s\S]*?)\[\/SECTION\]/g;
    let match;

    while ((match = sectionRegex.exec(rawText)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();

      let type: AnalysisSection['type'] = 'summary';
      if (title.includes('팀별') || title.includes('Team Strategy')) {
        type = 'team';
      } else if (title.includes('MVP') || title.includes('우승')) {
        type = 'winner';
      } else if (title.includes('포지셔닝 전략 제안')) {
        type = 'positioning';
      } else if (title.includes('CONCLUSION') || title.includes('교훈')) {
        type = 'insight';
      }

      sections.push({ title, content, type });
    }

    // If no sections found, return raw text as single section
    if (sections.length === 0) {
      sections.push({
        title: "게임 분석 결과",
        content: rawText,
        type: "summary"
      });
    }

    return { sections, rawText };
  } catch (error) {
    return {
      sections: [{
        title: "오류",
        content: handleApiError(error as Error),
        type: "summary"
      }],
      rawText: ""
    };
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

// Generate winner poster image using Gemini 2.0 Flash
export const generateWinnerPoster = async (
  gameState: GameState,
  teamPhotoBase64?: string
): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      throw new Error("API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인하세요.");
    }

    const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
    const memberNames = winner.members?.join(', ') || winner.name;

    // Build the prompt based on whether team photo is provided
    let imagePrompt: string;
    let contents: any;

    if (teamPhotoBase64) {
      // Extract base64 data from data URL
      const base64Data = teamPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = teamPhotoBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

      imagePrompt = `Edit this team photo to create an Olympic victory celebration scene.

CRITICAL - FACE PRESERVATION:
- You MUST keep the EXACT faces of every person in this photo
- Do NOT generate new faces or replace any person
- Each person's facial features, skin tone, hair style must remain IDENTICAL to the original
- The number of people must be exactly the same as the input photo

TRANSFORMATION:
- Keep the original people but change their setting to a victory celebration
- Add gold medals hanging around each person's neck
- Add a championship trophy that the team is holding together
- Change the background to a stadium with confetti and golden streamers
- Add dramatic celebration lighting
- Keep it realistic and photographic

TEXT OVERLAY:
- Top: "TEAM ${winner.colorIdx + 1} CHAMPIONS" in golden text
- Bottom: "${Math.abs(winner.score)} BILLION" and "STRATEGIC POSITIONING MASTERS"

The faces in the output MUST be recognizable as the same people from the input photo.`;

      contents = [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: imagePrompt }
      ];
    } else {
      // No team photo provided - generate without reference
      imagePrompt = `Create an epic Olympic-style victory celebration poster!

Design requirements:
- Championship trophy being held up high
- Gold medals displayed prominently
- Confetti and golden streamers in the background
- Stadium or award ceremony setting with dramatic lighting
- Silhouettes or abstract representation of a winning team celebrating
- Realistic, cinematic style

Text overlay:
- Top: "TEAM ${winner.colorIdx + 1} CHAMPIONS" in bold golden metallic text
- Center: Grand trophy with gold medals
- Bottom: "STRATEGIC POSITIONING MASTERS" in elegant white text
- Score: "${Math.abs(winner.score)} BILLION"
- Team: "${memberNames}"

Style: Celebratory, triumphant, like an official Olympic ceremony poster`;

      contents = imagePrompt;
    }

    // Use Gemini experimental model for image generation
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: contents,
      config: {
        responseModalities: ["image", "text"],
      }
    });

    // Extract image from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("이미지 생성 결과가 없습니다.");
  } catch (error: any) {
    console.error("Poster generation error:", error);

    // Check for billing/permission errors
    const errorMessage = error?.message || error?.toString() || "";
    if (errorMessage.includes("403") || errorMessage.includes("400") ||
        errorMessage.includes("billing") || errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("not enabled") || errorMessage.includes("quota")) {
      throw new Error("이미지 생성에 실패했습니다. API 키와 결제 설정을 확인해주세요.");
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
