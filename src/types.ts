
export interface Player {
  id: string; // team id
  name: string; // team name (first member's name or custom)
  colorIdx: number;
  chips: number;
  cards: number[]; // These are negative values now, representing projects
  score: number;
  isOnline: boolean;
  members: string[]; // Array of member names in this team
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface LogEntry {
  turn: number;
  message: string;
}

export interface GameConfig {
  roomName: string;
  maxTeams: number;
  geminiApiKey?: string; // Optional API key for AI advice feature
}

export const MAX_TEAM_MEMBERS = 20;

export interface GameState {
  config: GameConfig;
  players: Player[];
  deck: number[];
  currentCard: number | null;
  hiddenCard: number | null;
  pot: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  logs: LogEntry[];
  turnCount: number;
  lastPassedPlayerIndex: number | null; // Track which player just passed
  aiAdviceUsage: { [teamId: string]: number }; // Track AI advice usage per team (max 5)
}

// Network Types
export type MessageType = 'JOIN' | 'START_GAME' | 'ACTION' | 'STATE_UPDATE' | 'RESET';

export interface GameMessage {
  type: MessageType;
  payload?: any;
}
