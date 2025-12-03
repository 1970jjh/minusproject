# 더 지니어스: 마이너스 경매

> AI vs 집단지성 - 전략적 프로젝트 경매 게임

TV 프로그램 "더 지니어스"의 마이너스 경매 게임을 웹으로 구현한 멀티플레이어 전략 게임입니다.

## 게임 규칙

### 목표
게임 종료 시 **최종 자산(자원 - 부채)**이 가장 많은 팀이 승리합니다.

### 설정
- 프로젝트 카드: -26억 ~ -50억 (총 25장, 1장은 히든)
- 초기 자원: 각 팀 9억
- 플레이어: 4~12팀

### 행동
- **PASS**: 자원 1억을 팟에 내고 턴을 넘김 (자원이 없으면 불가)
- **TAKE**: 현재 프로젝트 + 팟의 모든 자원 획득

### 히든 룰: 연속 숫자
연속된 숫자의 프로젝트를 모으면, **절대값이 가장 작은 숫자**만 부채로 계산됩니다.

예시: -30, -31, -32 보유 시 → -30만 계산 (-31, -32는 무효화)

## 기술 스택

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **AI**: Google Gemini API (전략 조언)
- **Communication**: BroadcastChannel API

## 로컬 개발

### 사전 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 GEMINI_API_KEY 추가

# 개발 서버 실행
npm run dev
```

### 빌드

```bash
npm run build
```

## Vercel 배포

### 1. Vercel 프로젝트 설정

1. [Vercel](https://vercel.com)에서 새 프로젝트 생성
2. GitHub 레포지토리 연결
3. Framework Preset: **Vite** 선택

### 2. 환경 변수 설정

Vercel 프로젝트 설정 > Environment Variables에서:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 배포

```bash
# Vercel CLI 사용
npx vercel

# 또는 GitHub에 push하면 자동 배포
git push origin main
```

## 프로젝트 구조

```
├── src/
│   ├── components/       # React 컴포넌트
│   │   ├── AdminView.tsx     # 관리자 화면
│   │   ├── PlayerView.tsx    # 플레이어 화면
│   │   ├── LandingPage.tsx   # 랜딩 페이지
│   │   ├── PlayerBoard.tsx   # 플레이어 보드
│   │   ├── GameCard.tsx      # 게임 카드
│   │   ├── Chip.tsx          # 칩 컴포넌트
│   │   └── Modal.tsx         # 모달
│   ├── services/
│   │   └── geminiService.ts  # AI 전략 조언
│   ├── utils/
│   │   └── gameLogic.ts      # 게임 로직
│   ├── styles/
│   │   └── index.css         # 글로벌 스타일
│   ├── App.tsx               # 메인 앱
│   ├── main.tsx              # 엔트리 포인트
│   ├── types.ts              # 타입 정의
│   └── constants.ts          # 상수
├── public/                   # 정적 파일
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

## 라이선스

MIT License

---

Made with ❤️ by JJ CREATIVE LAB
