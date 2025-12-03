import React, { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase, Player, MessageType, GameMessage, GameConfig } from './types';
import { createInitialGameState, processTurn } from './utils/gameLogic';
import { STARTING_CHIPS } from './constants';
import AdminView from './components/AdminView';
import PlayerView from './components/PlayerView';
import LandingPage from './components/LandingPage';
import Modal from './components/Modal';
import { HelpCircle } from 'lucide-react';

const CHANNEL_NAME = 'minus_auction_v1';

const App: React.FC = () => {
  const [role, setRole] = useState<'NONE' | 'ADMIN' | 'PLAYER'>('NONE');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  
  // Admin Logic: Tracking which player they are currently "spectating/controlling"
  const [adminViewingPlayerId, setAdminViewingPlayerId] = useState<string | null>(null);
  
  // Admin Authentication State (Persists even if returning to Landing Page)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // State is shared, but managed by Admin. Players just receive updates.
  const [gameState, setGameState] = useState<GameState>(createInitialGameState([]));
  const [showRules, setShowRules] = useState(false);
  
  const channelRef = useRef<BroadcastChannel | null>(null);

  // --- Network Logic ---

  useEffect(() => {
    // Initialize BroadcastChannel
    const bc = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = bc;

    bc.onmessage = (event) => {
      const msg: GameMessage = event.data;
      handleNetworkMessage(msg);
    };

    return () => {
      bc.close();
    };
  }, [role, myPlayerId]); // Re-bind if role changes

  const handleNetworkMessage = (msg: GameMessage) => {
    switch (msg.type) {
      case 'JOIN':
        if (role === 'ADMIN') {
          handlePlayerJoinRequest(msg.payload);
        }
        break;
      case 'START_GAME':
        if (role === 'PLAYER') {
          // Sync state
          setGameState(msg.payload);
        }
        break;
      case 'STATE_UPDATE':
        if (role === 'PLAYER') {
          setGameState(msg.payload);
        }
        break;
      case 'ACTION':
        if (role === 'ADMIN') {
          handlePlayerAction(msg.payload.playerId, msg.payload.action);
        }
        break;
      case 'RESET':
        setGameState(createInitialGameState([])); 
        if(role === 'PLAYER') setRole('NONE');
        break;
    }
  };

  const broadcast = (type: MessageType, payload?: any) => {
    channelRef.current?.postMessage({ type, payload });
  };

  // --- Admin Logic ---

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const handleCreateGame = (config: GameConfig) => {
    const newState = createInitialGameState([], config);
    setGameState(newState);
    setRole('ADMIN');
    setAdminViewingPlayerId(null);
    setIsAdminAuthenticated(true); // Ensure auth is set
    
    // Broadcast reset to clear any existing players on the channel
    broadcast('RESET');
    // Broadcast new state shortly after to establish config
    setTimeout(() => broadcast('STATE_UPDATE', newState), 100);
  };

  const handleAdminExit = () => {
    // Go back to landing page, but keep isAdminAuthenticated = true
    setRole('NONE');
    setAdminViewingPlayerId(null);
    // We do NOT reset gameState completely here to allow re-creating, 
    // but typically we stop being the host.
  };

  const handlePlayerJoinRequest = (playerInfo: { id: string, name: string, colorIdx: number }) => {
    setGameState(prev => {
      if (prev.players.find(p => p.id === playerInfo.id)) return prev;
      if (prev.players.length >= prev.config.maxTeams) return prev;

      const newPlayer: Player = {
        ...playerInfo,
        chips: STARTING_CHIPS,
        cards: [],
        score: STARTING_CHIPS,
        isOnline: true
      };

      const newState = {
        ...prev,
        players: [...prev.players, newPlayer],
        phase: GamePhase.LOBBY
      };
      
      setTimeout(() => broadcast('STATE_UPDATE', newState), 50);
      return newState;
    });
  };

  const handleStartGame = () => {
    const currentPlayers = gameState.players;
    const currentConfig = gameState.config;
    
    const newGame = createInitialGameState(currentPlayers, currentConfig);
    setGameState(newGame);
    broadcast('STATE_UPDATE', newGame);
  };

  const handleResetGame = () => {
    const resetState = createInitialGameState([], gameState.config);
    setGameState(resetState);
    setAdminViewingPlayerId(null);
    broadcast('STATE_UPDATE', resetState);
  };

  const handlePlayerAction = (playerId: string, action: 'pass' | 'take') => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Admin Override or Player Action
    // If admin is viewing a player, we allow the action even if the ID implies 'admin'
    // But logically, we pass the playerId of the *player* being controlled
    if (currentPlayer.id !== playerId) return;

    const nextState = processTurn(gameState, action);
    setGameState(nextState);
    broadcast('STATE_UPDATE', nextState);
  };

  // --- Player Logic ---

  const joinGame = (name: string, colorIdx: number) => {
    const id = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMyPlayerId(id);
    setRole('PLAYER');
    
    setTimeout(() => {
        broadcast('JOIN', { id, name, colorIdx });
    }, 100);
  };

  const sendAction = (action: 'pass' | 'take') => {
    if (myPlayerId) {
      broadcast('ACTION', { playerId: myPlayerId, action });
    }
  };

  // Admin controls a player
  const sendAdminAction = (action: 'pass' | 'take') => {
    if (role === 'ADMIN' && adminViewingPlayerId) {
        handlePlayerAction(adminViewingPlayerId, action);
    }
  }

  // --- Render ---

  if (role === 'NONE') {
    return <LandingPage 
      onJoinAsAdmin={handleCreateGame} 
      onJoinAsPlayer={joinGame}
      isAdminAuthenticated={isAdminAuthenticated}
      onAdminLoginSuccess={handleAdminAuthSuccess}
    />;
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