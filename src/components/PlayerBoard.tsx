
import React from 'react';
import { Player } from '../types';
import { TEAM_COLORS } from '../constants';
import Chip from './Chip';
import { Users, Crown, Eye } from 'lucide-react';

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
      relative rounded-xl transition-all duration-500 ease-out flex flex-col overflow-visible group
      ${isActive 
        ? 'bg-black/80 border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.4)] scale-110 z-40' 
        : 'bg-black/70 border border-white/10 opacity-90 hover:opacity-100 hover:border-white/30 hover:scale-105 z-20'
      }
      ${isWinner ? 'border-4 border-yellow-400 ring-4 ring-yellow-500/50 shadow-[0_0_60px_rgba(250,204,21,0.6)] z-50' : ''}
    `}>
      {/* Turn Indicator Spotlight */}
      {isActive && (
         <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-white/10 blur-[50px] rounded-full pointer-events-none animate-pulse"></div>
      )}

      {/* View Button */}
      {onView && (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onView();
            }}
            className="absolute -top-3 -right-3 z-30 bg-zinc-800 hover:bg-red-600 text-white p-2 rounded-full border border-zinc-600 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            title="상세 화면 보기"
        >
            <Eye size={16} />
        </button>
      )}

      {isWinner && (
        <div className="absolute -top-6 -left-4 bg-gradient-to-br from-yellow-300 to-yellow-600 text-black p-2 rounded-full shadow-lg z-30 animate-bounce">
          <Crown size={28} />
        </div>
      )}

      {/* PASS Indicator */}
      {showPass && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <div className="px-4 py-2 bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-lg rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.6)] border-2 border-red-400">
            PASS
          </div>
        </div>
      )}

      {/* Player Header */}
      <div className={`p-3 rounded-t-xl flex items-center gap-3 border-b border-white/5 ${isActive ? 'bg-white/10' : 'bg-transparent'}`}>
         <div className={`w-8 h-8 rounded-full ${colorTheme.bg} flex items-center justify-center shadow-inner ring-1 ring-white/20 flex-shrink-0`}>
            <span className="text-white font-bold text-sm">{player.colorIdx + 1}</span>
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
               <h3 className={`font-bold text-sm ${isActive ? 'text-yellow-400' : 'text-zinc-300'}`}>
                   {player.colorIdx + 1}팀
               </h3>
               {player.members && player.members.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                     {player.members.map((name, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-zinc-400 truncate max-w-[60px]">
                           {name}
                        </span>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* Main Stats Row */}
      <div className="p-3 grid grid-cols-2 gap-2">
         {/* Resources (Chips) */}
         <div className="bg-black/40 rounded p-2 border border-white/5 flex flex-col items-center justify-center min-h-[4rem]">
            <span className="text-[9px] text-zinc-500 tracking-wider mb-1 font-bold">현재 자원</span>
            <div className="flex items-center gap-2">
               <Chip count={1} className="scale-100" />
               <span className="font-mono font-bold text-2xl text-emerald-400">{player.chips}</span>
            </div>
         </div>
         {/* Score */}
         <div className="bg-black/40 rounded p-2 border border-white/5 flex flex-col items-center justify-center min-h-[4rem]">
            <span className="text-[9px] text-zinc-500 tracking-wider mb-1 font-bold">현재 수익</span>
            <span className={`font-mono font-bold text-2xl ${player.score < 0 ? 'text-red-400' : 'text-blue-400'}`}>
               {player.score > 0 ? '+' : ''}{player.score}
            </span>
         </div>
      </div>

      {/* Projects Area (Mini Cards) */}
      <div className="px-3 pb-3">
         <div className="bg-black/30 rounded p-2 min-h-[4.5rem] border border-white/5">
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2 font-bold text-center">Minus Projects</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
            {sortedCards.length === 0 ? (
               <div className="w-full flex items-center justify-center py-2">
                  <span className="text-[9px] text-zinc-700 italic">No Projects</span>
               </div>
            ) : (
                sortedCards.map((card, idx) => {
                    // Check if card is effectively counted (start of sequence or isolated)
                    // In negative sorting: -30, -29, -28.
                    // Wait, logic says: Sequence like -30, -31, -32. -30 is the "smallest absolute value" (highest number).
                    // sortedCards is typically sorted ascending: -32, -31, -30.
                    // If -31 is present, -32 is discounted?
                    // Rule: "Continuous numbers... only the one with smallest absolute value counts".
                    // E.g. -30, -31, -32. Smallest abs is |-30|=30. So -30 counts.
                    // So -32 and -31 are "ignored" for score, but still held.
                    
                    // Visual check: Does this card count?
                    // It counts if the "next" card (value + 1) is NOT in the hand? No.
                    // It counts if the "previous" card (value + 1) is NOT in the hand.
                    // Since we have negative numbers: -30 + 1 = -29.
                    // If I have -30, do I have -29? If yes, -30 doesn't count. If no, -30 counts.
                    
                    const isCounted = !player.cards.includes(card + 1);

                    return (
                        <div key={card} className={`
                            relative w-8 h-10 rounded-[4px] flex items-center justify-center border shadow-sm
                            ${isCounted 
                                ? 'bg-zinc-200 border-red-500 text-red-900 z-10 scale-105' 
                                : 'bg-zinc-800 border-zinc-600 text-zinc-500 opacity-60 scale-95 grayscale'
                            }
                        `}>
                            {/* Mini "Project" look */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-800/80"></div>
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
