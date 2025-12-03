import React, { useState, useEffect } from 'react';
import { GameState, GamePhase, Player } from '../types';
import { CHIP_UNIT, TEAM_COLORS } from '../constants';
import Chip from './Chip';
import { getStrategicAdvice } from '../services/geminiService';
import { updateAiAdviceUsage, MAX_AI_ADVICE_PER_TEAM } from '../services/roomService';
import { playVoiceEffect, initializeSpeech } from '../services/soundService';
import { Cpu, XCircle, CheckCircle, Home, Loader2, LogOut, Eye, Zap, TrendingUp, Database, Activity, Sparkles } from 'lucide-react';

interface PlayerViewProps {
  gameState: GameState;
  playerId: string;
  roomId: string | null;
  onAction: (action: 'pass' | 'take') => void;
  isAdmin?: boolean;
  onReturnToAdmin?: () => void;
}

const PlayerView: React.FC<PlayerViewProps> = ({ gameState, playerId, roomId, onAction, isAdmin, onReturnToAdmin }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [connectionTime, setConnectionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setConnectionTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    initializeSpeech();
  }, []);

  // Handle action with sound effect
  const handleActionWithSound = (action: 'pass' | 'take') => {
    playVoiceEffect(action === 'pass' ? 'PASS' : 'TAKE');
    onAction(action);
  };

  const players = gameState.players || [];
  const me = players.find(p => p.id === playerId);

  // -- Error / Loading States --
  if (!me) {
    if (connectionTime < 5) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-8 space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 tech-grid pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[150px]"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-6 animate-pulse">
                        <Database size={28} className="text-white" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Connecting to Server...</h2>
                    <p className="text-zinc-500 text-sm">Establishing secure connection</p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-8 space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 tech-grid pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-6">
                    <XCircle size={40} className="text-zinc-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Connection Lost</h2>
                <p className="text-zinc-500 mb-8 text-center">Game has been reset or<br/>room is no longer available.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 glass hover:bg-white/10 rounded-xl font-semibold flex items-center gap-2 transition-all"
                >
                    <Home size={18} /> Return to Home
                </button>
                {isAdmin && onReturnToAdmin && (
                    <button onClick={onReturnToAdmin} className="text-sm text-indigo-400 hover:text-indigo-300 mt-4 transition-colors">
                        Return to Admin View
                    </button>
                )}
            </div>
        </div>
    );
  }

  const isMyTurn = players[gameState.currentPlayerIndex]?.id === playerId && gameState.phase === GamePhase.PLAYING;
  const colorTheme = TEAM_COLORS[me.colorIdx % TEAM_COLORS.length];

  // Get current AI advice usage for this team
  const currentAiUsage = gameState.aiAdviceUsage?.[playerId] || 0;
  const remainingAdvice = MAX_AI_ADVICE_PER_TEAM - currentAiUsage;
  const canUseAdvice = remainingAdvice > 0 && gameState.phase === GamePhase.PLAYING;

  const handleGetAdvice = async () => {
    if (!roomId || !canUseAdvice) {
      setShowAdviceModal(true);
      if (remainingAdvice <= 0) {
        setAdvice(`AI 조언 사용 횟수를 모두 소진했습니다. (${currentAiUsage}/${MAX_AI_ADVICE_PER_TEAM})`);
      } else {
        setAdvice('게임이 진행 중일 때만 AI 조언을 받을 수 있습니다.');
      }
      return;
    }

    setLoadingAdvice(true);
    setShowAdviceModal(true);

    // Update usage in Firebase first
    const usageResult = await updateAiAdviceUsage(roomId, playerId);
    if (!usageResult.success) {
      setAdvice(`AI 조언 사용 횟수를 모두 소진했습니다. (${usageResult.currentUsage}/${MAX_AI_ADVICE_PER_TEAM})`);
      setLoadingAdvice(false);
      return;
    }

    const result = await getStrategicAdvice(gameState, playerId);
    setAdvice(result);
    setLoadingAdvice(false);
  };

  // -- Admin Spectator Controls --
  const AdminControls = () => (
      isAdmin && onReturnToAdmin ? (
        <>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-semibold text-center py-2 uppercase tracking-[0.2em] sticky top-0 z-50 flex items-center justify-center gap-2">
            <Eye size={12} /> Admin Spectator Mode
          </div>
          <button
            onClick={onReturnToAdmin}
            className="fixed top-12 right-4 z-50 glass text-white px-4 py-2 rounded-full shadow-lg font-semibold text-xs flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <LogOut size={14} /> Exit View
          </button>
        </>
      ) : null
  );

  // -- Lobby State --
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 tech-grid pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px]"></div>

        <AdminControls />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-8 animate-pulse shadow-[0_0_60px_rgba(99,102,241,0.3)]">
             <Loader2 size={40} className="text-white animate-spin" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Awaiting Launch</h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
              The administrator is preparing the game.<br/>
              Discuss strategies with your team.
          </p>
          <div className="glass rounded-2xl p-6 min-w-[200px]">
             <p className="text-xs text-zinc-500 tracking-widest mb-2 uppercase">Your Team</p>
             <p className="text-3xl font-bold text-white">Team {me.colorIdx + 1}</p>
          </div>
        </div>
      </div>
    );
  }

  // -- Playing State (Glassmorphism UI) --
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 tech-grid pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <AdminControls />

      {/* Header Panel (My Status) */}
      <div className="relative z-10 p-6 pb-16">
        <div className="glass rounded-3xl p-6 relative overflow-hidden">
          {/* Accent gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                   <span className="text-xl font-bold text-white">{me.colorIdx + 1}</span>
                 </div>
                 <div>
                   <h1 className="text-2xl font-bold text-white">Team {me.colorIdx + 1}</h1>
                   <span className="text-xs text-zinc-500">Strategic Operations</span>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="glass-dark px-4 py-2.5 rounded-xl flex items-center gap-2">
                    <Chip count={1} className="scale-75" />
                    <span className="text-xl font-mono font-bold text-yellow-400">{me.chips}{CHIP_UNIT}</span>
                 </div>
                 <span className="text-xs text-zinc-500">Resources</span>
               </div>
            </div>
            <div className="text-right glass-dark rounded-xl p-4">
               <div className="text-[10px] text-zinc-500 tracking-widest mb-1 uppercase">Net Score</div>
               <div className={`text-3xl font-bold font-mono ${me.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                 {me.score > 0 ? '+' : ''}{me.score}억
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 -mt-8 relative z-20 flex flex-col gap-5 pb-6">

        {/* Current Auction Info */}
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent pointer-events-none"></div>

           <div className="relative z-10">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-red-400" />
                  <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Current Auction</span>
                </div>
                <div className="flex items-center gap-2 glass-dark px-3 py-1.5 rounded-lg">
                   <span className="text-[10px] text-zinc-500 uppercase">Pot</span>
                   <span className="text-yellow-400 font-bold font-mono">{gameState.pot}{CHIP_UNIT}</span>
                </div>
             </div>

             <div className="flex justify-center items-center py-8 glass-dark rounded-2xl">
                <div className="text-center">
                   <div className="text-6xl font-bold text-white mb-3 font-mono">{gameState.currentCard}억</div>
                   <span className="text-xs text-red-400 font-semibold uppercase tracking-[0.2em] glass px-3 py-1 rounded-full">Minus Project</span>
                </div>
             </div>
           </div>
        </div>

        {/* My Projects (Small view) */}
        {me.cards.length > 0 && (
            <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={12} className="text-zinc-500" />
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">My Projects</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[...me.cards].sort((a,b)=>a-b).map(c => (
                        <span key={c} className="text-xs font-mono font-semibold px-3 py-1.5 glass-dark rounded-lg text-zinc-300">{c}</span>
                    ))}
                </div>
            </div>
        )}

        {/* Other Teams' Status */}
        <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={12} className="text-zinc-500" />
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Other Teams Status</p>
            </div>
            <div className="space-y-2">
                {[...players]
                    .filter(p => p.id !== playerId)
                    .sort((a, b) => a.colorIdx - b.colorIdx)
                    .map(player => {
                        const isCurrentTurn = players[gameState.currentPlayerIndex]?.id === player.id;
                        return (
                            <div key={player.id} className={`flex items-center gap-3 p-3 glass-dark rounded-xl transition-all ${isCurrentTurn ? 'ring-1 ring-indigo-500/50' : ''}`}>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">{player.colorIdx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-zinc-300 font-semibold">Team {player.colorIdx + 1}</span>
                                        {isCurrentTurn && (
                                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px] font-semibold animate-pulse">
                                            ACTIVE
                                          </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                                        <span className="text-yellow-400 font-mono">{player.chips}억</span>
                                        <span className="text-zinc-600">•</span>
                                        <span className={`font-mono ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {player.score > 0 ? '+' : ''}{player.score}
                                        </span>
                                        {player.cards.length > 0 && (
                                          <>
                                            <span className="text-zinc-600">•</span>
                                            <span className="text-zinc-500">{player.cards.length} projects</span>
                                          </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>

        {/* AI Advice Button - Always Available */}
        <button
          onClick={handleGetAdvice}
          disabled={!canUseAdvice}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all
            ${canUseAdvice
              ? 'glass-accent hover:bg-indigo-500/20 text-indigo-300'
              : 'glass text-zinc-600 cursor-not-allowed'}
          `}
        >
           <Sparkles size={18} className={canUseAdvice ? 'animate-pulse' : ''} />
           AI Strategic Advice
           <span className={`px-2.5 py-1 rounded-lg text-xs font-mono ${canUseAdvice ? 'bg-indigo-900/50 text-indigo-300' : 'bg-zinc-800 text-zinc-600'}`}>
             {currentAiUsage}/{MAX_AI_ADVICE_PER_TEAM}
           </span>
        </button>

        {/* Action Buttons */}
        <div className="flex-1 flex flex-col justify-end gap-4 pb-4">
           {isMyTurn ? (
             <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 text-sm font-semibold">Your Turn - Make Your Move</span>
                </div>
                <div className="flex gap-4 h-32">
                   <button
                     onClick={() => handleActionWithSound('pass')}
                     disabled={me.chips <= 0}
                     className={`flex-1 rounded-2xl font-bold text-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2
                       ${me.chips > 0
                         ? 'glass hover:bg-red-500/10 hover:border-red-500/30 text-red-400'
                         : 'glass text-zinc-700 opacity-50 cursor-not-allowed'}
                     `}
                   >
                     <div className="p-3 glass-dark rounded-xl">
                        <XCircle size={28} />
                     </div>
                     <div className="text-center">
                        <span className="block text-[10px] text-zinc-500 mb-1">Pay 1 Resource</span>
                        <span className="uppercase tracking-wider">Pass</span>
                     </div>
                   </button>

                   <button
                     onClick={() => handleActionWithSound('take')}
                     className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
                   >
                     <div className="p-3 bg-white/20 rounded-xl">
                        <CheckCircle size={28} />
                     </div>
                     <div className="text-center">
                        <span className="block text-[10px] text-white/70 mb-1">Claim Project & Pot</span>
                        <span className="uppercase tracking-wider">Take</span>
                     </div>
                   </button>
                </div>
             </>
           ) : (
             <div className="h-32 flex items-center justify-center glass-dark rounded-2xl">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping delay-100"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping delay-200"></div>
                    </div>
                    <p className="text-zinc-400 text-sm font-semibold mb-1">
                       Waiting for Team {players[gameState.currentPlayerIndex]?.colorIdx + 1}
                    </p>
                    <p className="text-zinc-600 text-xs">
                       Analyze the situation while waiting
                    </p>
                </div>
             </div>
           )}
        </div>
      </div>

       {/* Advice Modal */}
       {showAdviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-sm rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center gap-2"><Sparkles size={18} className="text-indigo-400"/> AI Strategic Analysis</h3>
              <button onClick={() => setShowAdviceModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><XCircle className="text-zinc-400" size={18}/></button>
            </div>
            <div className="p-6 text-sm leading-relaxed text-zinc-200 overflow-y-auto flex-1">
               {loadingAdvice ? (
                 <div className="flex flex-col items-center justify-center py-8 gap-4 text-zinc-500">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      <Loader2 size={24} className="text-white animate-spin" />
                    </div>
                    <span className="text-sm">Analyzing strategic options...</span>
                 </div>
               ) : (
                 <div className="prose prose-invert prose-sm">
                    <p className="whitespace-pre-wrap">{advice}</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerView;
