import React from 'react';
import { GameState, GamePhase } from '../types';
import PlayerBoard from './PlayerBoard';
import GameCard from './GameCard';
import Chip from './Chip';
import { CHIP_UNIT, MIN_PLAYERS } from '../constants';
import { RefreshCw, Play, Trophy, Users, Monitor, Eye, LayoutGrid, LogOut, BarChart3, Zap, Database, Activity, TrendingUp } from 'lucide-react';

interface AdminViewProps {
  gameState: GameState;
  onStartGame: () => void;
  onReset: () => void;
  onViewPlayer: (playerId: string) => void;
  onExit: () => void;
  onShowResults?: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ gameState, onStartGame, onReset, onViewPlayer, onExit, onShowResults }) => {
  // Safety: ensure players is always an array
  const players = gameState.players || [];
  const config = gameState.config || { roomName: 'Game Room', maxTeams: 6 };

  const currentPlayer = players.length > 0
    ? players[gameState.currentPlayerIndex]
    : null;
  const winner = gameState.phase === GamePhase.FINISHED && players.length > 0
    ? [...players].sort((a, b) => b.score - a.score)[0]
    : null;

  // -- Lobby Mode (Silicon Valley Style) --
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 tech-grid pointer-events-none"></div>

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px]"></div>

        {/* Exit Button */}
        <button
          onClick={onExit}
          className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 glass rounded-full text-zinc-400 hover:text-white transition-all text-xs font-semibold hover:border-zinc-500"
        >
           <LogOut size={14} /> 나가기
        </button>

        {/* Room Info Header */}
        <div className="relative z-10 mb-12 text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2 glass-accent rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <Monitor size={14} className="text-indigo-400" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-indigo-300">Command Center</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
              {config.roomName}
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Users size={16} />
                <span className="font-mono">{players.length}</span>
                <span className="text-zinc-600">/</span>
                <span className="font-mono text-zinc-600">{config.maxTeams}</span>
              </div>
              <div className="w-px h-4 bg-zinc-700"></div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Teams Connected</span>
            </div>
        </div>

        {/* Teams Grid */}
        <div className="relative z-10 w-full max-w-7xl mb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...players].sort((a, b) => a.colorIdx - b.colorIdx).map(player => {
                const members = player.members || [player.name];
                return (
                  <div key={player.id} className="group relative glass rounded-2xl p-6 flex flex-col items-center transition-all duration-300 hover:bg-white/[0.08] hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]">
                     {/* Team Number Badge */}
                     <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg group-hover:shadow-indigo-500/30 transition-all group-hover:scale-110">
                       <span className="text-2xl font-bold text-white">{player.colorIdx + 1}</span>
                     </div>

                     {/* Team Name */}
                     <span className="font-semibold text-xl text-white mb-2">{player.name}</span>

                     {/* Member Count */}
                     <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                       <Activity size={12} className="text-emerald-400" />
                       <span className="text-xs font-mono text-emerald-400">{members.length} members</span>
                     </div>

                     {/* Member List */}
                     <div className="w-full mb-4 max-h-20 overflow-y-auto scrollbar-hide">
                       <div className="flex flex-wrap gap-1.5 justify-center">
                         {members.map((name, idx) => (
                           <span key={idx} className="px-2.5 py-1 glass rounded-lg text-[11px] text-zinc-400 font-medium">
                             {name}
                           </span>
                         ))}
                       </div>
                     </div>

                     {/* View Team Button */}
                     <button
                       onClick={() => onViewPlayer(player.id)}
                       className="w-full mt-auto py-3 glass-dark hover:bg-white/10 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white flex items-center justify-center gap-2 transition-all"
                     >
                        <Eye size={14} /> View Team Console
                     </button>
                  </div>
                );
            })}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, config.maxTeams - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="border-2 border-dashed border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center min-h-[260px] group hover:border-indigo-500/20 transition-colors">
                   <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center mb-3 group-hover:bg-indigo-900/20 transition-colors">
                     <span className="text-zinc-600 font-mono text-lg group-hover:text-indigo-400 transition-colors">{i + 1 + players.length}</span>
                   </div>
                   <span className="text-zinc-600 text-xs font-medium uppercase tracking-wider">Awaiting Connection</span>
                </div>
            ))}
            </div>
        </div>

        {/* Start Button */}
        <div className="relative z-10">
          <button
            onClick={onStartGame}
            disabled={players.length < MIN_PLAYERS}
            className={`
              group relative px-16 py-6 rounded-2xl font-bold text-xl flex items-center gap-4 transition-all duration-300
              ${players.length >= MIN_PLAYERS
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-right text-white shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] border border-indigo-400/30'
                : 'glass text-zinc-600 cursor-not-allowed'}
            `}
          >
            <Zap size={24} className={players.length >= MIN_PLAYERS ? 'animate-pulse' : ''} />
            <span className="uppercase tracking-wider">Initialize Game</span>
            {players.length >= MIN_PLAYERS && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </button>
          {players.length < MIN_PLAYERS && (
            <p className="text-center mt-4 text-zinc-500 text-sm">
              Minimum {MIN_PLAYERS} teams required to start
            </p>
          )}
        </div>
      </div>
    );
  }

  // -- Game Mode (Silicon Valley Command Center) --
  const getPlayerPosition = (index: number, total: number) => {
    const angleDeg = (360 / total) * index - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const rx = 42;
    const ry = 38;
    const left = 50 + rx * Math.cos(angleRad);
    const top = 50 + ry * Math.sin(angleRad);

    return {
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] text-gray-100 flex flex-col relative overflow-hidden font-sans select-none">

      {/* Background Effects */}
      <div className="absolute inset-0 tech-grid pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,rgba(0,0,0,0.9)_70%)] pointer-events-none z-0"></div>

      {/* Animated corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="glass rounded-xl p-4 flex items-center gap-4">
             <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Database size={18} className="text-white" />
             </div>
             <div>
                <h1 className="text-sm font-semibold text-white tracking-wide">{config.roomName}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-zinc-500 font-mono">ROUND {gameState.turnCount}</span>
                  <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                  <span className="text-[10px] text-zinc-500 font-mono">DECK {gameState.deck?.length || 0}</span>
                </div>
             </div>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-3">
          <button onClick={onReset} className="glass hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2">
            <RefreshCw size={14} /> Reset
          </button>
          <button onClick={onExit} className="glass hover:bg-white/10 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-8">

        {/* Subtle Table Ring */}
        <div className="absolute inset-16 rounded-full border border-zinc-800/30 pointer-events-none"></div>
        <div className="absolute inset-24 rounded-full border border-indigo-500/5 pointer-events-none"></div>

        <div className="w-full h-full max-w-[1600px] relative">

            {/* Center Area: Command Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] flex items-center justify-center z-20">

               {gameState.phase === GamePhase.FINISHED ? (
                  <div className="text-center animate-fade-in-up glass rounded-3xl p-10">
                     <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
                        <Trophy size={80} className="text-yellow-400 relative z-10" />
                     </div>
                     <h2 className="text-5xl font-bold mb-2 text-white">Victory</h2>
                     <div className="text-3xl font-semibold text-yellow-400 mb-6">{winner?.name}</div>
                     <div className="text-lg text-zinc-400 mb-6">Final Score: <span className="text-white font-mono">{winner?.score}억</span></div>

                     {/* Results Analysis Button */}
                     {onShowResults && (
                        <button
                           onClick={onShowResults}
                           className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 mx-auto transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-105"
                        >
                           <BarChart3 size={18} />
                           Strategic Analysis
                        </button>
                     )}

                     <div className="flex items-center gap-4 mt-6 glass-dark p-4 rounded-xl justify-center">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Hidden Project</span>
                        <GameCard value={gameState.hiddenCard!} isHidden={false} className="w-14 h-20 text-[10px]" />
                     </div>
                  </div>
               ) : (
                  <div className="flex items-center gap-16">
                     {/* Pot Display */}
                     <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -inset-8 bg-yellow-500/10 blur-3xl rounded-full"></div>
                            <div className="glass rounded-2xl p-6 relative">
                              <div className="flex flex-wrap justify-center gap-1.5 max-w-[180px]">
                                  {Array.from({ length: Math.min(gameState.pot, 15) }).map((_, i) => (
                                      <Chip key={i} count={1} className="scale-110" />
                                  ))}
                                  {gameState.pot > 15 && (
                                    <span className="text-xs text-yellow-500">+{gameState.pot - 15}</span>
                                  )}
                              </div>
                            </div>
                        </div>
                        <div className="mt-6 glass-dark px-6 py-3 rounded-xl">
                           <span className="text-yellow-400 font-mono font-bold text-3xl">{gameState.pot}{CHIP_UNIT}</span>
                        </div>
                        <span className="mt-2 text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Accumulated Resources</span>
                     </div>

                     {/* Current Project */}
                     <div className="flex flex-col items-center">
                         <div className="relative group">
                           <div className="absolute -inset-8 bg-red-500/10 blur-3xl rounded-full group-hover:bg-red-500/20 transition-colors"></div>
                           <div className="transform transition-transform duration-500 group-hover:scale-105">
                             <GameCard value={gameState.currentCard!} className="w-44 h-64 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-zinc-700/50" />
                           </div>
                         </div>
                         <span className="mt-6 text-[10px] text-red-400/60 font-medium tracking-wider uppercase">Current Project</span>
                     </div>
                  </div>
               )}
            </div>

            {/* Players distributed elliptically */}
            {players.map((player, index) => (
                <div
                    key={player.id}
                    className="absolute w-64 z-30 transition-all duration-500"
                    style={getPlayerPosition(index, players.length)}
                >
                    <PlayerBoard
                        player={player}
                        isActive={gameState.phase === GamePhase.PLAYING && currentPlayer?.id === player.id}
                        isWinner={winner?.id === player.id}
                        showPass={gameState.lastPassedPlayerIndex === index && gameState.phase === GamePhase.PLAYING}
                        onView={() => onViewPlayer(player.id)}
                    />
                </div>
            ))}

        </div>
      </div>
    </div>
  );
};

export default AdminView;
