
import React from 'react';

interface GameCardProps {
  value: number;
  className?: string;
  isHidden?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ value, className = '', isHidden = false }) => {
  return (
    <div className={`
      relative w-36 h-52 select-none perspective-1000
      ${className}
    `}>
      {/* Outer glow */}
      <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 blur-xl rounded-3xl"></div>

      {/* Main card body - thick acrylic effect */}
      <div className={`
        relative w-full h-full rounded-2xl overflow-hidden
        transform transition-all duration-300 hover:scale-105 hover:-rotate-1
        ${isHidden
          ? 'bg-gradient-to-br from-zinc-800/90 via-zinc-900/95 to-black/90'
          : 'bg-gradient-to-br from-white/20 via-white/10 to-white/5'
        }
      `}
      style={{
        boxShadow: isHidden
          ? '0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)'
          : `
            0 25px 50px -12px rgba(0,0,0,0.5),
            0 0 0 1px rgba(255,255,255,0.1),
            inset 0 1px 1px rgba(255,255,255,0.3),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        backdropFilter: 'blur(20px)',
      }}>

        {/* Glass reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60"></div>

        {/* Top edge highlight - simulates glass thickness */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

        {/* Left edge highlight */}
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-white/30 via-white/10 to-transparent"></div>

        {isHidden ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 relative z-10">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shadow-lg border border-zinc-600/50">
              <span className="text-3xl">🔒</span>
            </div>
            <span className="text-zinc-400 font-mono text-xs tracking-[0.3em] uppercase">Hidden</span>
            <div className="absolute bottom-4 w-full text-center">
              <span className="text-[8px] text-zinc-600 tracking-widest">STRATEGIC POSITIONING</span>
            </div>
          </div>
        ) : (
          <div className="relative h-full flex flex-col">
            {/* Top accent bar - frosted glass effect */}
            <div className="relative h-12 bg-gradient-to-r from-rose-600/90 via-red-500/90 to-rose-600/90 flex items-center justify-center overflow-hidden">
              {/* Shine animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
              <span className="text-white/90 text-[10px] font-bold tracking-[0.2em] uppercase drop-shadow-lg relative z-10">
                Minus Project
              </span>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {/* Inner glass panel effect */}
              <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10"></div>

              {/* Main number */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-6xl font-black bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                  {value}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-red-400/50"></div>
                  <span className="text-lg font-bold text-red-400/90 tracking-wider">억</span>
                  <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-red-400/50"></div>
                </div>
              </div>

              {/* Corner decorations */}
              <span className="absolute top-6 left-6 text-sm font-bold text-white/30">{value}</span>
              <span className="absolute bottom-8 right-6 text-sm font-bold text-white/30 rotate-180">{value}</span>
            </div>

            {/* Bottom info bar */}
            <div className="h-10 flex items-center justify-center bg-black/20 border-t border-white/5">
              <span className="text-[8px] text-white/40 uppercase tracking-[0.2em]">Debenture Bond</span>
            </div>

            {/* Bottom right corner accent */}
            <div className="absolute bottom-0 right-0 w-8 h-8 overflow-hidden">
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-gradient-to-tl from-indigo-500/30 to-transparent rotate-45"></div>
            </div>
          </div>
        )}

        {/* Glass edge effect - bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-black/20 to-transparent"></div>

        {/* Subtle noise texture for realism */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
