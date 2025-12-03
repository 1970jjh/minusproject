
import React from 'react';

interface GameCardProps {
  value: number;
  className?: string;
  isHidden?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ value, className = '', isHidden = false }) => {
  return (
    <div className={`
      relative w-32 h-48 rounded-lg shadow-2xl flex items-center justify-center select-none overflow-hidden
      transition-transform hover:scale-105 duration-200
      ${isHidden 
        ? 'bg-zinc-900 border-2 border-zinc-700' 
        : 'bg-zinc-200 border-4 border-white'
      }
      ${className}
    `}>
      {isHidden ? (
        <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">🔒</span>
            <span className="text-zinc-500 font-mono text-xs tracking-widest">HIDDEN</span>
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-red-600 flex items-center justify-center">
             <span className="text-white text-[10px] font-bold tracking-widest uppercase">Minus Project</span>
          </div>

          {/* Main Number */}
          <div className="flex flex-col items-center z-10">
            <span className="text-5xl font-black text-zinc-800 tracking-tighter">
                {value}
            </span>
            <span className="text-lg font-bold text-red-600">억</span>
          </div>
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')]"></div>
          
          {/* Corner Numbers */}
          <span className="absolute top-10 left-2 text-sm font-bold text-zinc-400">{value}</span>
          <span className="absolute bottom-2 right-2 text-sm font-bold text-zinc-400 transform rotate-180">{value}</span>
          
          {/* Footer Info */}
          <div className="absolute bottom-6 w-full text-center">
             <div className="h-[1px] w-16 bg-zinc-400 mx-auto mb-1"></div>
             <span className="text-[8px] text-zinc-500 uppercase">Debenture Bond</span>
          </div>
        </>
      )}
    </div>
  );
};

export default GameCard;
