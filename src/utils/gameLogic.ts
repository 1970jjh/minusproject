
import { GameState, Player, GamePhase, LogEntry, GameConfig } from '../types';
import { STARTING_CHIPS, MIN_CARD_VALUE, MAX_CARD_VALUE, CHIP_UNIT, MAX_PLAYERS } from '../constants';

export const AI_DECISION_DELAY_MS = 1500;

// Helper to calculate score based on sequence rules
export const calculateScore = (player: Player): number => {
  const cards = player.cards || [];
  if (cards.length === 0) return player.chips || 0;

  // Sort cards ascending (e.g. -50, -49, ... -26)
  const sortedCards = [...cards].sort((a, b) => a - b);

  let cardSum = 0;
  
  for (let i = 0; i < sortedCards.length; i++) {
    const current = sortedCards[i];
    
    // Check if this card is part of a sequence
    // In our negative logic: -49 follows -50. (-49 is 1 greater than -50)
    
    const isEndOfSequence = 
      i === sortedCards.length - 1 || // Last card
      sortedCards[i + 1] !== current + 1; // Next card is not consecutive

    if (isEndOfSequence) {
      cardSum += current;
    }
  }

  return cardSum + (player.chips || 0);
};

// Initialize with empty players list (Lobby mode)
export const createInitialGameState = (
  players: Player[] = [], 
  config: GameConfig = { roomName: 'Default Room', maxTeams: MAX_PLAYERS }
): GameState => {
  // 1. Create Deck (-26 to -50)
  const fullDeck: number[] = [];
  for (let i = MIN_CARD_VALUE; i <= MAX_CARD_VALUE; i++) {
    fullDeck.push(-i);
  }

  // 2. Shuffle
  for (let i = fullDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
  }

  // 3. Remove one card (Hidden)
  const hiddenCard = fullDeck.pop() || null;
  const currentCard = fullDeck.pop() || null;

  // Reset players for new game (preserve team members)
  const resetPlayers = players.map(p => ({
    ...p,
    chips: STARTING_CHIPS,
    cards: [],
    score: STARTING_CHIPS,
    members: p.members || [p.name]
  }));

  return {
    config,
    players: resetPlayers,
    deck: fullDeck,
    currentCard,
    hiddenCard,
    pot: 0,
    currentPlayerIndex: Math.floor(Math.random() * (resetPlayers.length || 1)),
    phase: GamePhase.PLAYING,
    logs: [{ turn: 0, message: "게임이 시작되었습니다! -26억 ~ -50억 프로젝트 경매가 진행됩니다." }],
    turnCount: 1
  };
};

export const isGameFinished = (state: GameState): boolean => {
  return state.currentCard === null && state.deck.length === 0;
};

export const processTurn = (
  currentState: GameState,
  action: 'pass' | 'take'
): GameState => {
  const state = { ...currentState };
  const players = state.players || [];
  const playerIndex = state.currentPlayerIndex || 0;
  const player = { ...players[playerIndex] };

  // Ensure player.cards is always an array
  player.cards = player.cards || [];
  player.chips = player.chips || 0;

  const logMessagePrefix = `[${player.name}] 팀`;
  let newLog: LogEntry;

  // Validation: Must take if 0 chips
  if (action === 'pass' && player.chips <= 0) {
    action = 'take'; // Force take
  }

  if (action === 'pass') {
    // Logic: Pay 1 chip
    player.chips -= 1;
    player.score = calculateScore(player);
    state.pot = (state.pot || 0) + 1;

    state.players[playerIndex] = player;
    state.currentPlayerIndex = (playerIndex + 1) % players.length;

    newLog = { turn: state.turnCount || 1, message: `${logMessagePrefix}이(가) PASS 했습니다. (자원 -1${CHIP_UNIT})` };
  } else {
    // Logic: Take card + pot
    player.chips += state.pot || 0;
    player.cards = [...player.cards, state.currentCard!].sort((a, b) => a - b);
    player.score = calculateScore(player);
    
    state.pot = 0;
    state.players[playerIndex] = player;
    
    const takenCard = state.currentCard;
    
    // Deal next card or End Game
    if (state.deck.length > 0) {
      state.currentCard = state.deck.pop() || null;
      newLog = { turn: state.turnCount, message: `${logMessagePrefix}이(가) ${takenCard}억 프로젝트를 낙찰받았습니다.` };
    } else {
      state.currentCard = null;
      state.phase = GamePhase.FINISHED;
      newLog = { turn: state.turnCount, message: `${logMessagePrefix}이(가) 마지막 프로젝트(${takenCard}억)를 가져갔습니다. 경매 종료!` };
    }
  }

  state.logs = [...state.logs, newLog];
  state.turnCount += 1;

  return state;
};
