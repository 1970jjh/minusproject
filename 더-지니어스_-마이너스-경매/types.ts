
export interface Player {
  id: string; // socket/channel id
  name: string;
  colorIdx: number;
  chips: number;
  cards: number[]; // These are negative values now, representing projects
  score: number; 
  isOnline: boolean;
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
}

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
}

// Network Types
export type MessageType = 'JOIN' | 'START_GAME' | 'ACTION' | 'STATE_UPDATE' | 'RESET';

export interface GameMessage {
  type: MessageType;
  payload?: any;
}
