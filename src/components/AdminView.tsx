import React from 'react';
import { GameState, GamePhase } from '../types';
import PlayerBoard from './PlayerBoard';
import GameCard from './GameCard';
import Chip from './Chip';
import { CHIP_UNIT, MIN_PLAYERS } from '../constants';
import { RefreshCw, Play, Trophy, Users, Monitor, Eye, LayoutGrid, LogOut } from 'lucide-react';

interface AdminViewProps {
  gameState: GameState;
  onStartGame: () => void;
  onReset: () => void;
  onViewPlayer: (playerId: string) => void;
  onExit: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ gameState, onStartGame, onReset, onViewPlayer, onExit }) => {
  const currentPlayer = gameState.players.length > 0
    ? gameState.players[gameState.currentPlayerIndex]
    : null;
  const winner = gameState.phase === GamePhase.FINISHED && gameState.players.length > 0
    ? [...gameState.players].sort((a, b) => b.score - a.score)[0]
    : null;

  // -- Lobby Mode --
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-emerald-950 to-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>
        
        {/* Exit Button */}
        <button 
          onClick={onExit}
          className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors text-xs font-bold border border-zinc-700"
        >
           <LogOut size={14} /> 나가기
        </button>

        {/* Room Info Header */}
        <div className="relative z-10 mb-12 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full border border-emerald-500/30 text-emerald-400 backdrop-blur-sm">
                <Monitor size={14} />
                <span className="text-[10px] font-mono uppercase tracking-widest">Admin Control</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              {gameState.config.roomName}
            </h1>
            <p className="text-emerald-200/60 font-medium tracking-wide">
              WAITING FOR PLAYERS ({gameState.players.length} / {gameState.config.maxTeams})
            </p>
        </div>

        {/* Players Grid */}
        <div className="relative z-10 w-full max-w-7xl mb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {gameState.players.map(player => (
                <div key={player.id} className="group relative bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-2xl flex flex-col items-center backdrop-blur-sm transition-all hover:bg-emerald-900/60 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                   <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-xl border-4 border-zinc-800 group-hover:scale-110 transition-transform">
                     <Users size={32} className="text-zinc-400 group-hover:text-white transition-colors" />
                   </div>
                   <span className="font-bold text-xl text-white mb-1 tracking-tight">{player.name}</span>
                   <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-4 border border-emerald-500/20">
                     Connected
                   </span>
                   
                   <button 
                     onClick={() => onViewPlayer(player.id)}
                     className="w-full mt-auto py-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-2 transition-all border border-zinc-700 hover:border-zinc-500"
                   >
                      <Eye size={14} /> 팀 화면 보기
                   </button>
                </div>
            ))}
            {Array.from({ length: Math.max(0, gameState.config.maxTeams - gameState.players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-black/10 border-2 border-dashed border-emerald-500/10 rounded-2xl flex flex-col items-center justify-center min-h-[220px]">
                   <span className="text-emerald-500/20 font-black text-4xl mb-2 opacity-50">{i + 1 + gameState.players.length}</span>
                   <span className="text-emerald-500/30 text-xs font-bold uppercase tracking-widest">Open Seat</span>
                </div>
            ))}
            </div>
        </div>

        {/* Start Button */}
        <div className="relative z-10">
          <button
            onClick={onStartGame}
            disabled={gameState.players.length < MIN_PLAYERS}
            className={`
              px-12 py-6 rounded-full font-black text-2xl flex items-center gap-4 transition-all duration-300
              ${gameState.players.length >= MIN_PLAYERS 
                ? 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-[0_0_50px_rgba(220,38,38,0.4)] hover:scale-105 hover:shadow-[0_0_80px_rgba(220,38,38,0.6)] border-4 border-red-900' 
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border-4 border-zinc-900'}
            `}
          >
            <Play size={32} fill="currentColor" />
            GAME START
          </button>
        </div>
      </div>
    );
  }

  // -- Game Mode (Casino Table) --
  // Calculate positions for elliptical layout
  const getPlayerPosition = (index: number, total: number) => {
    // Start from -90deg (Top center)
    const angleDeg = (360 / total) * index - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Ellipse dimensions (percentage of container)
    // Adjust these to fit your aspect ratio and safe zones
    const rx = 42; // Radius X %
    const ry = 38; // Radius Y %

    const left = 50 + rx * Math.cos(angleRad);
    const top = 50 + ry * Math.sin(angleRad);

    return {
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="h-screen w-screen bg-[#0a1f13] text-gray-100 flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* 1. Environment & Lighting */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,rgba(0,0,0,0.8)_80%)] pointer-events-none z-0"></div>
      
      {/* 2. Top Bar (Minimal) */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
             <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-700 shadow-lg">
                <LayoutGrid size={20} className="text-zinc-400" />
             </div>
             <div>
                <h1 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{gameState.config.roomName}</h1>
                <span className="text-[10px] text-zinc-500 font-mono">ROUND {gameState.turnCount} / DECK {gameState.deck.length}</span>
             </div>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={onReset} className="bg-zinc-900/80 hover:bg-red-900/80 text-zinc-400 hover:text-white px-4 py-2 rounded-lg border border-zinc-700 text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-md">
            <RefreshCw size={14} /> RESET TABLE
          </button>
          <button onClick={onExit} className="bg-zinc-900/80 hover:bg-zinc-700 text-zinc-400 hover:text-white px-4 py-2 rounded-lg border border-zinc-700 text-xs font-bold transition-colors flex items-center gap-2 backdrop-blur-md">
            <LogOut size={14} /> 나가기
          </button>
        </div>
      </header>

      {/* 3. The Casino Table Surface */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-8">
        
        {/* Table Border (Visual only) */}
        <div className="absolute inset-8 rounded-[4rem] border-[20px] border-[#2a1a10] shadow-[inset_0_0_50px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none opacity-80"></div>
        
        <div className="w-full h-full max-w-[1600px] relative">
            
            {/* Center Area: Auction Pit */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] flex items-center justify-center z-20">
               {/* Center Glow */}
               <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full animate-pulse"></div>

               {gameState.phase === GamePhase.FINISHED ? (
                  <div className="text-center animate-fade-in-up scale-125">
                     <div className="relative inline-block">
                        <Trophy size={100} className="text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-2 bg-black/50 blur-sm rounded-full"></div>
                     </div>
                     <h2 className="text-6xl font-black mt-4 mb-2 text-white drop-shadow-xl font-serif">WINNER</h2>
                     <div className="text-4xl font-bold text-yellow-400 mb-8">{winner?.name}</div>
                     
                     <div className="flex items-center gap-4 bg-black/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                        <span className="text-xs text-zinc-400 uppercase font-bold">Hidden Project Revealed</span>
                        <GameCard value={gameState.hiddenCard!} isHidden={false} className="w-16 h-24 text-[10px]" />
                     </div>
                  </div>
               ) : (
                  <div className="flex items-center gap-12">
                     {/* Pot Area */}
                     <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-yellow-500/20 blur-xl rounded-full"></div>
                            <div className="flex flex-col-reverse items-center -space-y-4 filter drop-shadow-2xl transition-all duration-300 transform hover:scale-110">
                                {Array.from({ length: Math.min(5, Math.ceil(gameState.pot / 2)) }).map((_, i) => (
                                    <Chip key={i} count={1} className="scale-150" />
                                ))}
                            </div>
                        </div>
                        <div className="mt-8 bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-yellow-500/30 shadow-lg">
                           <span className="text-yellow-500 font-mono font-bold text-3xl">{gameState.pot}{CHIP_UNIT}</span>
                        </div>
                        <span className="mt-2 text-[10px] text-emerald-400/60 uppercase font-bold tracking-[0.3em]">Current Pot</span>
                     </div>

                     {/* Current Card Area */}
                     <div className="flex flex-col items-center">
                         <div className="relative group perspective-1000">
                           <div className="absolute -inset-4 bg-red-600/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="transform transition-all duration-500 group-hover:rotate-y-12 group-hover:scale-110">
                             <GameCard value={gameState.currentCard!} className="w-48 h-72 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/10" />
                           </div>
                         </div>
                         <span className="mt-6 text-[10px] text-red-400/60 uppercase font-bold tracking-[0.3em]">Auction Item</span>
                     </div>
                  </div>
               )}
            </div>

            {/* Players distributed elliptically */}
            {gameState.players.map((player, index) => (
                <div 
                    key={player.id}
                    className="absolute w-64 z-30 transition-all duration-500"
                    style={getPlayerPosition(index, gameState.players.length)}
                >
                    <PlayerBoard 
                        player={player} 
                        isActive={gameState.phase === GamePhase.PLAYING && currentPlayer?.id === player.id} 
                        isWinner={winner?.id === player.id} 
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