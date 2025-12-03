import React, { useState, useEffect } from 'react';
import { GameState, GamePhase, GameConfig } from './types';
import { createInitialGameState, processTurn } from './utils/gameLogic';
import AdminView from './components/AdminView';
import PlayerView from './components/PlayerView';
import LandingPage from './components/LandingPage';
import Modal from './components/Modal';
import { HelpCircle } from 'lucide-react';
import {
  createRoom,
  joinRoom,
  subscribeToGameState,
  updateGameState,
  startGame,
  resetGame,
  generatePlayerId,
  Room
} from './services/roomService';

const App: React.FC = () => {
  const [role, setRole] = useState<'NONE' | 'ADMIN' | 'PLAYER'>('NONE');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Admin Logic: Tracking which player they are currently "spectating/controlling"
  const [adminViewingPlayerId, setAdminViewingPlayerId] = useState<string | null>(null);

  // Admin Authentication State (Persists even if returning to Landing Page)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // State is shared via Firebase
  const [gameState, setGameState] = useState<GameState>(createInitialGameState([]));
  const [showRules, setShowRules] = useState(false);

  // Subscribe to game state changes when in a room
  useEffect(() => {
    if (!currentRoomId) return;

    const unsubscribe = subscribeToGameState(currentRoomId, (newGameState) => {
      if (newGameState) {
        // Ensure each player has valid arrays (Firebase converts empty arrays to null)
        const safePlayers = (newGameState.players || []).map((p: any) => ({
          ...p,
          cards: p.cards || [],
          chips: p.chips ?? 0,
          score: p.score ?? 0,
          members: p.members || [p.name],
        }));

        // Ensure gameState always has valid structure
        const safeGameState: GameState = {
          ...newGameState,
          players: safePlayers,
          deck: newGameState.deck || [],
          config: newGameState.config || { roomName: 'Game Room', maxTeams: 6 },
          logs: newGameState.logs || [],
          pot: newGameState.pot || 0,
          turnCount: newGameState.turnCount || 1,
          currentPlayerIndex: newGameState.currentPlayerIndex || 0,
          phase: newGameState.phase || GamePhase.LOBBY,
        };
        setGameState(safeGameState);
      }
    });

    return () => unsubscribe();
  }, [currentRoomId]);

  // --- Admin Logic ---

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const handleCreateGame = async (config: GameConfig) => {
    try {
      const hostId = generatePlayerId();
      const roomId = await createRoom(config, hostId);

      setCurrentRoomId(roomId);
      setMyPlayerId(hostId);
      setRole('ADMIN');
      setAdminViewingPlayerId(null);
      setIsAdminAuthenticated(true);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('방 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleJoinRoom = async (roomId: string, room: Room) => {
    // This will be called from LandingPage when selecting a room
    setCurrentRoomId(roomId);
  };

  const handleAdminExit = () => {
    setRole('NONE');
    setCurrentRoomId(null);
    setAdminViewingPlayerId(null);
    // Admin stays authenticated even after exiting a room
  };

  // Admin enters an existing room as admin (not as player)
  const handleEnterRoomAsAdmin = (roomId: string) => {
    setCurrentRoomId(roomId);
    setRole('ADMIN');
    setAdminViewingPlayerId(null);
  };

  const handleStartGame = async () => {
    if (!currentRoomId) return;

    try {
      const players = gameState.players || [];
      const config = gameState.config || { roomName: 'Game Room', maxTeams: 6 };
      await startGame(currentRoomId, players, config);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleResetGame = async () => {
    if (!currentRoomId) return;

    try {
      const config = gameState.config || { roomName: 'Game Room', maxTeams: 6 };
      await resetGame(currentRoomId, config);
      setAdminViewingPlayerId(null);
    } catch (error) {
      console.error('Failed to reset game:', error);
    }
  };

  const handlePlayerAction = async (playerId: string, action: 'pass' | 'take') => {
    if (!currentRoomId) return;

    const players = gameState.players || [];
    if (players.length === 0) return;

    const currentPlayer = players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;

    const nextState = processTurn(gameState, action);

    try {
      await updateGameState(currentRoomId, nextState);
    } catch (error) {
      console.error('Failed to update game state:', error);
    }
  };

  // --- Player Logic ---

  const handleJoinAsPlayer = async (name: string, colorIdx: number, roomId: string) => {
    try {
      const id = generatePlayerId();
      const success = await joinRoom(roomId, { id, name, colorIdx });

      if (success) {
        setMyPlayerId(id);
        setCurrentRoomId(roomId);
        setRole('PLAYER');
      } else {
        alert('방에 입장할 수 없습니다. 방이 가득 찼거나 존재하지 않습니다.');
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('방 입장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const sendAction = async (action: 'pass' | 'take') => {
    if (myPlayerId) {
      await handlePlayerAction(myPlayerId, action);
    }
  };

  // Admin controls a player
  const sendAdminAction = async (action: 'pass' | 'take') => {
    if (role === 'ADMIN' && adminViewingPlayerId) {
      await handlePlayerAction(adminViewingPlayerId, action);
    }
  };

  // --- Render ---

  if (role === 'NONE') {
    return (
      <LandingPage
        onJoinAsAdmin={handleCreateGame}
        onJoinAsPlayer={handleJoinAsPlayer}
        onEnterRoomAsAdmin={handleEnterRoomAsAdmin}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLoginSuccess={handleAdminAuthSuccess}
      />
    );
  }

  return (
    <>
      {role === 'ADMIN' && (
        adminViewingPlayerId ? (
          <PlayerView
            gameState={gameState}
            playerId={adminViewingPlayerId}
            onAction={sendAdminAction}
            isAdmin={true}
            onReturnToAdmin={() => setAdminViewingPlayerId(null)}
          />
        ) : (
          <AdminView
            gameState={gameState}
            onStartGame={handleStartGame}
            onReset={handleResetGame}
            onViewPlayer={(id) => setAdminViewingPlayerId(id)}
            onExit={handleAdminExit}
          />
        )
      )}

      {role === 'PLAYER' && myPlayerId && (
        <PlayerView
          gameState={gameState}
          playerId={myPlayerId}
          onAction={sendAction}
        />
      )}

      {/* Floating Rules Button */}
      <button
        onClick={() => setShowRules(true)}
        className="fixed bottom-4 right-4 z-50 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-3 rounded-full shadow-lg border border-zinc-600 transition-all"
        title="게임 규칙"
      >
        <HelpCircle size={24} />
      </button>

      {showRules && (
        <Modal title="규칙: 마이너스 프로젝트 경매" onClose={() => setShowRules(false)}>
          <div className="space-y-6 text-zinc-300 leading-relaxed font-light">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🎯 목표</h3>
                <p>게임 종료 시 <strong className="text-yellow-400">최종 자산(자원 - 부채)</strong>이 가장 많은 팀이 승리합니다.</p>
                <p className="mt-2 text-sm text-zinc-400">부채(마이너스 프로젝트)를 최소화하고, 자원(칩)을 확보하세요.</p>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-700">
                <h3 className="text-xl font-bold text-white mb-4">🕹️ 행동</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong className="text-white">PASS:</strong> 자원(칩) 1개를 내고 턴을 넘깁니다. (자원이 없으면 불가)</li>
                  <li><strong className="text-white">TAKE:</strong> 현재 프로젝트와 쌓인 자원을 모두 가져옵니다.</li>
                </ul>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-700">
              <h3 className="text-xl font-bold text-white mb-4">🌟 히든 룰: 연속 숫자</h3>
              <p className="mb-2">연속된 숫자의 프로젝트를 모으면, <strong className="text-green-400">절대값이 가장 작은 숫자</strong>만 부채로 계산됩니다.</p>
              <div className="bg-black/40 p-3 rounded text-sm font-mono text-zinc-400">
                예시: <span className="text-red-400">-30, -31, -32</span> 보유 시 <br/>
                → <span className="text-white">-30</span>만 계산 (-31, -32는 무효화되어 부채 감소)
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default App;
