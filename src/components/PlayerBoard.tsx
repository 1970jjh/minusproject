
import React from 'react';
import { Player } from '../types';
import { TEAM_COLORS } from '../constants';
import Chip from './Chip';
import { Users, Crown, Eye, TrendingUp, TrendingDown } from 'lucide-react';

interface PlayerBoardProps {
  player: Player;
  isActive: boolean;
  isWinner?: boolean;
  showPass?: boolean;
  onView?: () => void;
}

const PlayerBoard: React.FC<PlayerBoardProps> = ({ player, isActive, isWinner = false, showPass = false, onView }) => {
  const sortedCards = [...player.cards].sort((a, b) => a - b);
  const colorTheme = TEAM_COLORS[player.colorIdx % TEAM_COLORS.length];

  return (
    <div className={`
      relative rounded-2xl transition-all duration-500 ease-out flex flex-col overflow-visible group backdrop-blur-xl
      ${isActive
        ? 'bg-white/[0.08] border-2 border-indigo-400/60 shadow-[0_0_50px_rgba(99,102,241,0.4)] scale-110 z-40'
        : 'bg-white/[0.03] border border-white/10 opacity-90 hover:opacity-100 hover:bg-white/[0.06] hover:border-white/20 hover:scale-105 z-20'
      }
      ${isWinner ? 'border-2 border-yellow-400/80 ring-2 ring-yellow-500/30 shadow-[0_0_60px_rgba(250,204,21,0.4)] z-50' : ''}
    `}>
      {/* Turn Indicator Glow */}
      {isActive && (
         <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none animate-pulse"></div>
      )}

      {/* View Button */}
      {onView && (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onView();
            }}
            className="absolute -top-2 -right-2 z-30 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            title="View Team Console"
        >
            <Eye size={14} />
        </button>
      )}

      {isWinner && (
        <div className="absolute -top-5 -left-3 bg-gradient-to-br from-yellow-400 to-amber-600 text-black p-2.5 rounded-xl shadow-lg z-30 animate-bounce">
          <Crown size={22} />
        </div>
      )}

      {/* PASS Indicator */}
      {showPass && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <div className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-sm rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.5)] tracking-wider">
            PASS
          </div>
        </div>
      )}

      {/* Player Header */}
      <div className={`p-3 rounded-t-2xl flex items-center gap-3 border-b border-white/5 ${isActive ? 'bg-indigo-500/10' : 'bg-transparent'}`}>
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-bold text-lg">{player.colorIdx + 1}</span>
         </div>
         <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${isActive ? 'text-indigo-300' : 'text-zinc-300'}`}>
                Team {player.colorIdx + 1}
            </h3>
            {player.members && player.members.length > 0 && (
               <div className="flex flex-wrap gap-1 mt-1">
                  {player.members.slice(0, 3).map((name, idx) => (
                     <span key={idx} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-zinc-500 truncate max-w-[50px]">
                        {name}
                     </span>
                  ))}
                  {player.members.length > 3 && (
                     <span className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-zinc-500">
                        +{player.members.length - 3}
                     </span>
                  )}
               </div>
            )}
         </div>
      </div>

      {/* Main Stats Row */}
      <div className="p-3 grid grid-cols-2 gap-2">
         {/* Resources (Chips) */}
         <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[9px] text-zinc-500 tracking-wider mb-1 font-medium uppercase">Resources</span>
            <div className="flex items-center gap-2">
               <Chip count={1} className="scale-90" />
               <span className="font-mono font-bold text-xl text-yellow-400">{player.chips}</span>
            </div>
         </div>
         {/* Score */}
         <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[9px] text-zinc-500 tracking-wider mb-1 font-medium uppercase">Net Score</span>
            <div className="flex items-center gap-1">
               {player.score >= 0 ? (
                  <TrendingUp size={14} className="text-emerald-400" />
               ) : (
                  <TrendingDown size={14} className="text-red-400" />
               )}
               <span className={`font-mono font-bold text-xl ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {player.score > 0 ? '+' : ''}{player.score}
               </span>
            </div>
         </div>
      </div>

      {/* Projects Area (Mini Cards) */}
      <div className="px-3 pb-3">
         <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2 font-medium text-center">Projects</p>
            <div className="flex flex-wrap gap-1.5 justify-center min-h-[2.5rem]">
            {sortedCards.length === 0 ? (
               <div className="w-full flex items-center justify-center py-1">
                  <span className="text-[10px] text-zinc-700 font-medium">None</span>
               </div>
            ) : (
                sortedCards.map((card, idx) => {
                    // Visual check: Does this card count?
                    // It counts if the "next" card (value + 1) is NOT in the hand.
                    const isCounted = !player.cards.includes(card + 1);

                    return (
                        <div key={card} className={`
                            relative w-9 h-11 rounded-lg flex items-center justify-center border transition-all
                            ${isCounted
                                ? 'bg-gradient-to-b from-zinc-100 to-zinc-200 border-red-500/50 text-red-700 z-10 scale-105 shadow-lg'
                                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-600 opacity-50 scale-95'
                            }
                        `}>
                            {/* Mini "Project" header */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-lg ${isCounted ? 'bg-red-500' : 'bg-zinc-700'}`}></div>
                            <span className="font-bold font-mono text-[10px] mt-1">{card}</span>
                        </div>
                    );
                })
            )}
            </div>
         </div>
      </div>

    </div>
  );
};

export default PlayerBoard;
