
import React from 'react';

interface ChipProps {
  count: number;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({ count, className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Stack Effect for multiple chips */}
      {count > 1 && (
        <div className="absolute top-[-4px] left-[-2px] w-8 h-8 rounded-full bg-yellow-700 border border-yellow-800 shadow-sm z-0"></div>
      )}
      
      {/* Main Chip */}
      <div className="
        w-8 h-8 rounded-full z-10
        bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-yellow-500 via-yellow-200 to-yellow-600
        border-2 border-dashed border-yellow-800/60 shadow-lg
        flex items-center justify-center
      ">
        <div className="w-5 h-5 rounded-full bg-yellow-600 border border-yellow-400 flex items-center justify-center shadow-inner">
           <span className="text-[8px] font-black text-yellow-100 opacity-80">G</span>
        </div>
      </div>

      {count > 1 && (
        <span className="absolute -bottom-2 -right-2 bg-black/80 text-white text-[9px] font-bold px-1.5 rounded-full border border-white/20 z-20">
            x{count}
        </span>
      )}
    </div>
  );
};

export default Chip;
