import {
  ref,
  set,
  get,
  onValue,
  off,
  push,
  update,
  remove,
  serverTimestamp,
  DatabaseReference
} from 'firebase/database';
import { database } from '../config/firebase';
import { GameState, GamePhase, Player, GameConfig, MAX_TEAM_MEMBERS } from '../types';
import { createInitialGameState } from '../utils/gameLogic';
import { STARTING_CHIPS } from '../constants';

export interface Room {
  id: string;
  config: GameConfig;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  playerCount: number;
}

// Generate a unique player ID
export const generatePlayerId = (): string => {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new room
export const createRoom = async (config: GameConfig, hostId: string): Promise<string> => {
  const roomsRef = ref(database, 'rooms');
  const newRoomRef = push(roomsRef);
  const roomId = newRoomRef.key!;

  const initialGameState = createInitialGameState([], config);
  initialGameState.phase = GamePhase.LOBBY;

  await set(newRoomRef, {
    id: roomId,
    config,
    hostId,
    status: 'waiting',
    createdAt: serverTimestamp(),
    playerCount: 0,
    gameState: initialGameState
  });

  return roomId;
};

// Get all available rooms
export const subscribeToRooms = (callback: (rooms: Room[]) => void): (() => void) => {
  const roomsRef = ref(database, 'rooms');

  const unsubscribe = onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const rooms: Room[] = Object.entries(data).map(([id, room]: [string, any]) => ({
      id,
      config: room.config,
      hostId: room.hostId,
      status: room.status,
      createdAt: room.createdAt,
      playerCount: room.gameState?.players?.length || 0
    }));

    // Sort by creation time, newest first
    rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(rooms);
  });

  return () => off(roomsRef);
};

// Join a room as a player (join existing team or create new team)
export const joinRoom = async (
  roomId: string,
  playerInfo: { id: string; name: string; colorIdx: number }
): Promise<boolean> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    console.error('Room not found');
    return false;
  }

  const roomData = snapshot.val();
  const gameState: GameState = roomData.gameState || {};
  const players = gameState.players || [];
  const config = roomData.config || { maxTeams: 6 };

  // Find existing team with same colorIdx
  const existingTeamIndex = players.findIndex((p: Player) => p.colorIdx === playerInfo.colorIdx);

  if (existingTeamIndex >= 0) {
    // Join existing team
    const existingTeam = players[existingTeamIndex];
    const members = existingTeam.members || [existingTeam.name];
    const memberIds = existingTeam.memberIds || [existingTeam.id];

    // Check if team is full
    if (members.length >= MAX_TEAM_MEMBERS) {
      console.error('Team is full');
      return false;
    }

    // Check if member ID already exists in team (already joined)
    if (memberIds.includes(playerInfo.id)) {
      return true; // Already joined
    }

    // Add member to existing team (add both name and ID)
    const updatedTeam = {
      ...existingTeam,
      members: [...members, playerInfo.name],
      memberIds: [...memberIds, playerInfo.id]
    };

    const updatedPlayers = [...players];
    updatedPlayers[existingTeamIndex] = updatedTeam;

    await update(ref(database, `rooms/${roomId}/gameState`), {
      players: updatedPlayers,
      phase: GamePhase.LOBBY
    });

    return true;
  } else {
    // Create new team
    if (players.length >= config.maxTeams) {
      console.error('Room is full (max teams reached)');
      return false;
    }

    const newTeam: Player = {
      id: playerInfo.id,
      name: `팀 ${playerInfo.colorIdx + 1}`,
      colorIdx: playerInfo.colorIdx,
      chips: STARTING_CHIPS,
      cards: [],
      score: STARTING_CHIPS,
      isOnline: true,
      members: [playerInfo.name],
      memberIds: [playerInfo.id]
    };

    const updatedPlayers = [...players, newTeam];

    await update(ref(database, `rooms/${roomId}/gameState`), {
      players: updatedPlayers,
      phase: GamePhase.LOBBY
    });

    await update(ref(database, `rooms/${roomId}`), {
      playerCount: updatedPlayers.length
    });

    return true;
  }
};

// Subscribe to game state changes
export const subscribeToGameState = (
  roomId: string,
  callback: (gameState: GameState | null) => void
): (() => void) => {
  const gameStateRef = ref(database, `rooms/${roomId}/gameState`);

  const unsubscribe = onValue(gameStateRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || null);
  });

  return () => off(gameStateRef);
};

// Update game state (for admin/host)
export const updateGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  await set(ref(database, `rooms/${roomId}/gameState`), gameState);

  // Also update room status
  let status: 'waiting' | 'playing' | 'finished' = 'waiting';
  if (gameState.phase === GamePhase.PLAYING) status = 'playing';
  if (gameState.phase === GamePhase.FINISHED) status = 'finished';

  await update(ref(database, `rooms/${roomId}`), {
    status,
    playerCount: gameState.players.length
  });
};

// Start the game
export const startGame = async (roomId: string, currentPlayers: Player[], config: GameConfig): Promise<void> => {
  const newGameState = createInitialGameState(currentPlayers, config);
  await updateGameState(roomId, newGameState);
};

// Reset the game
export const resetGame = async (roomId: string, config: GameConfig): Promise<void> => {
  const resetState = createInitialGameState([], config);
  resetState.phase = GamePhase.LOBBY;
  await updateGameState(roomId, resetState);
};

// Delete a room
export const deleteRoom = async (roomId: string): Promise<void> => {
  await remove(ref(database, `rooms/${roomId}`));
};

// Get room info
export const getRoom = async (roomId: string): Promise<Room | null> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();
  return {
    id: roomId,
    config: data.config,
    hostId: data.hostId,
    status: data.status,
    createdAt: data.createdAt,
    playerCount: data.gameState?.players?.length || 0
  };
};

// Check if a player exists in a room (by checking memberIds)
export const checkPlayerInRoom = async (roomId: string, playerId: string): Promise<boolean> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    return false;
  }

  const data = snapshot.val();
  const players = data.gameState?.players || [];

  // Check if any team has this playerId in their memberIds
  return players.some((player: any) => {
    const memberIds = player.memberIds || [player.id];
    return memberIds.includes(playerId);
  });
};

// Update AI advice usage for a team
export const MAX_AI_ADVICE_PER_TEAM = 5;

export const updateAiAdviceUsage = async (roomId: string, teamId: string): Promise<{ success: boolean; currentUsage: number }> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    return { success: false, currentUsage: 0 };
  }

  const roomData = snapshot.val();
  const gameState: GameState = roomData.gameState || {};
  const currentUsage = gameState.aiAdviceUsage || {};
  const teamUsage = currentUsage[teamId] || 0;

  if (teamUsage >= MAX_AI_ADVICE_PER_TEAM) {
    return { success: false, currentUsage: teamUsage };
  }

  const newUsage = teamUsage + 1;
  const updatedAiAdviceUsage = {
    ...currentUsage,
    [teamId]: newUsage
  };

  await update(ref(database, `rooms/${roomId}/gameState`), {
    aiAdviceUsage: updatedAiAdviceUsage
  });

  return { success: true, currentUsage: newUsage };
};

// Get AI advice usage for a team
export const getAiAdviceUsage = async (roomId: string, teamId: string): Promise<number> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const roomData = snapshot.val();
  const gameState: GameState = roomData.gameState || {};
  const currentUsage = gameState.aiAdviceUsage || {};
  return currentUsage[teamId] || 0;
};
