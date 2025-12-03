import React, { useState, useEffect } from 'react';
import { GameState, GamePhase, Player } from '../types';
import { CHIP_UNIT, TEAM_COLORS } from '../constants';
import Chip from './Chip';
import { getStrategicAdvice } from '../services/geminiService';
import { updateAiAdviceUsage, MAX_AI_ADVICE_PER_TEAM } from '../services/roomService';
import { playVoiceEffect, initializeSpeech } from '../services/soundService';
import { Cpu, XCircle, CheckCircle, Home, Loader2, LogOut, Eye } from 'lucide-react';

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
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 space-y-6">
                <Loader2 size={48} className="text-red-600 animate-spin" />
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">게임 서버 접속 중...</h2>
                    <p className="text-zinc-500 text-sm">잠시만 기다려주세요.</p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 space-y-6">
            <XCircle size={64} className="text-zinc-700" />
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">접속 정보 없음</h2>
                <p className="text-zinc-500 mb-6">게임이 초기화되었거나,<br/>방에 입장할 수 없습니다.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold flex items-center gap-2 mx-auto transition-colors"
                >
                    <Home size={18} /> 홈으로 돌아가기
                </button>
                {isAdmin && onReturnToAdmin && (
                    <button onClick={onReturnToAdmin} className="text-sm text-red-500 underline mt-4 block">
                        관리자 뷰로 복귀
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
  const canUseAdvice = remainingAdvice > 0;

  const handleGetAdvice = async () => {
    if (!roomId || !canUseAdvice) {
      setShowAdviceModal(true);
      setAdvice(`AI 조언 사용 횟수를 모두 소진했습니다. (${currentAiUsage}/${MAX_AI_ADVICE_PER_TEAM})`);
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
          <div className="bg-red-600/90 backdrop-blur text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest sticky top-0 z-50 flex items-center justify-center gap-2">
            <Eye size={12} /> Administrator Spectator Mode
          </div>
          <button 
            onClick={onReturnToAdmin}
            className="fixed top-8 right-4 z-50 bg-zinc-900 text-white px-4 py-2 rounded-full shadow-lg border border-zinc-700 font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={14} /> 나가기
          </button>
        </>
      ) : null
  );

  // -- Lobby State --
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center relative">
        <AdminControls />
        <div className={`w-28 h-28 rounded-full ${colorTheme.bg} flex items-center justify-center mb-8 animate-bounce shadow-lg ring-4 ring-white/10`}>
           <span className="text-5xl">⏳</span>
        </div>
        <h2 className="text-3xl font-bold mb-3">대기 중...</h2>
        <p className="text-zinc-400 leading-relaxed mb-8">
            관리자가 게임을 시작할 때까지<br/>
            팀원들과 전략을 상의하세요.
        </p>
        <div className="w-full max-w-xs p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
           <p className="text-xs text-zinc-500 tracking-widest mb-2">나의 팀</p>
           <p className={`text-2xl font-bold ${colorTheme.text}`}>{me.colorIdx + 1}팀</p>
        </div>
      </div>
    );
  }

  // -- Playing State --
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative">
      <AdminControls />
      
      {/* Header Panel (My Status) */}
      <div className={`p-6 ${colorTheme.bg} pb-12 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden transition-colors duration-500`}>
         <div className="absolute inset-0 bg-black/10"></div>
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/40 to-transparent"></div>
         
         <div className="relative z-10 flex justify-between items-start">
            <div>
               <h1 className="text-3xl font-black flex items-center gap-2 tracking-tight">
                 {me.colorIdx + 1}팀
               </h1>
               <div className="mt-4 flex items-center gap-3">
                 <div className="bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-2 border border-white/10">
                    <Chip count={1} className="scale-90" />
                    <span className="text-2xl font-mono font-bold text-white">{me.chips}{CHIP_UNIT}</span>
                 </div>
                 <span className="text-xs text-white/60">현재 자원</span>
               </div>
            </div>
            <div className="text-right">
               <div className="text-[10px] text-white/80 tracking-widest mb-1 font-bold">현재 수익</div>
               <div className={`text-3xl font-black ${me.score < 0 ? 'text-white' : 'text-white'} drop-shadow-md`}>
                 {me.score}억
               </div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 -mt-8 relative z-20 flex flex-col gap-6">
        
        {/* Current Auction Info */}
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
           <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Current Auction</span>
              <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700">
                 <span className="text-[10px] text-zinc-400 font-bold">POT</span>
                 <span className="text-yellow-500 font-bold font-mono">{gameState.pot}{CHIP_UNIT}</span>
              </div>
           </div>
           
           <div className="flex justify-center items-center py-6 bg-zinc-950 rounded-2xl border border-zinc-800/50">
              <div className="text-center">
                 <div className="text-6xl font-black text-white mb-2 tracking-tighter">{gameState.currentCard}억</div>
                 <span className="text-xs text-red-500 font-bold uppercase tracking-[0.3em] bg-red-900/20 px-2 py-1 rounded">Minus Project</span>
              </div>
           </div>
        </div>

        {/* My Cards (Small view) */}
        {me.cards.length > 0 && (
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">My Projects</p>
                <div className="flex flex-wrap gap-2">
                    {[...me.cards].sort((a,b)=>a-b).map(c => (
                        <span key={c} className="text-xs font-bold px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-400">{c}</span>
                    ))}
                </div>
            </div>
        )}

        {/* Other Teams' Projects */}
        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">다른 팀 현황</p>
            <div className="space-y-2">
                {[...players]
                    .filter(p => p.id !== playerId)
                    .sort((a, b) => a.colorIdx - b.colorIdx)
                    .map(player => {
                        const teamColor = TEAM_COLORS[player.colorIdx % TEAM_COLORS.length];
                        return (
                            <div key={player.id} className="flex items-center gap-3 p-2 bg-black/30 rounded-lg">
                                <div className={`w-6 h-6 rounded-full ${teamColor.bg} flex items-center justify-center`}>
                                    <span className="text-white text-xs font-bold">{player.colorIdx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-zinc-400 font-bold">{player.colorIdx + 1}팀</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-emerald-400 font-mono">{player.chips}억</span>
                                        <span className="text-zinc-600">|</span>
                                        <span className={`font-mono ${player.score < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                            {player.score > 0 ? '+' : ''}{player.score}
                                        </span>
                                    </div>
                                    {player.cards.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {[...player.cards].sort((a,b)=>a-b).map(c => (
                                                <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-1 flex flex-col justify-end gap-4 pb-8">
           {isMyTurn ? (
             <>
                <div className="flex gap-4 h-36">
                   <button
                     onClick={() => handleActionWithSound('pass')}
                     disabled={me.chips <= 0}
                     className={`flex-1 rounded-2xl font-bold text-xl shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-3 border-b-4
                       ${me.chips > 0
                         ? 'bg-zinc-800 hover:bg-zinc-700 text-red-400 border-zinc-950'
                         : 'bg-zinc-900 text-zinc-700 border-zinc-950 opacity-50 cursor-not-allowed'}
                     `}
                   >
                     <div className="p-3 bg-red-900/20 rounded-full">
                        <XCircle size={32} />
                     </div>
                     <div>
                        <span className="block text-sm opacity-80 mb-0.5">자원 1개 지불</span>
                        PASS
                     </div>
                   </button>

                   <button
                     onClick={() => handleActionWithSound('take')}
                     className="flex-1 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-2xl font-bold text-xl shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-3 border-b-4 border-green-900"
                   >
                     <div className="p-3 bg-white/20 rounded-full">
                        <CheckCircle size={32} />
                     </div>
                     <div>
                        <span className="block text-sm opacity-80 mb-0.5">프로젝트 & 팟 수령</span>
                        TAKE
                     </div>
                   </button>
                </div>
                <button
                  onClick={handleGetAdvice}
                  disabled={!canUseAdvice}
                  className={`w-full py-4 border rounded-xl font-bold flex items-center justify-center gap-2 transition-colors
                    ${canUseAdvice
                      ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/20'
                      : 'bg-zinc-800/50 text-zinc-600 border-zinc-700 cursor-not-allowed'}
                  `}
                >
                   <Cpu size={20} /> AI 전략 조언 받기
                   <span className={`ml-2 px-2 py-0.5 rounded text-xs font-mono ${canUseAdvice ? 'bg-indigo-900/50 text-indigo-300' : 'bg-zinc-700 text-zinc-500'}`}>
                     {currentAiUsage}/{MAX_AI_ADVICE_PER_TEAM}
                   </span>
                </button>
             </>
           ) : (
             <div className="h-full flex items-center justify-center bg-zinc-900/30 rounded-3xl border-2 border-zinc-800 border-dashed p-8">
                <div className="text-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-4 animate-ping"></div>
                    <p className="text-zinc-400 text-lg font-bold mb-1">
                       다른 팀이 고민 중입니다
                    </p>
                    <p className="text-zinc-600 text-sm">
                       현재 차례: <span className="text-zinc-300 font-bold">{players[gameState.currentPlayerIndex]?.colorIdx + 1}팀</span>
                    </p>
                </div>
             </div>
           )}
        </div>
      </div>

       {/* Advice Modal */}
       {showAdviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-800 w-full max-w-sm rounded-2xl border border-zinc-600 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-zinc-700 bg-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2"><Cpu size={18} className="text-indigo-400"/> AI 전략 분석</h3>
              <button onClick={() => setShowAdviceModal(false)} className="p-1 hover:bg-zinc-800 rounded-full"><XCircle className="text-zinc-400" size={20}/></button>
            </div>
            <div className="p-6 text-sm leading-relaxed text-zinc-200 overflow-y-auto flex-1">
               {loadingAdvice ? (
                 <div className="flex flex-col items-center justify-center py-8 gap-4 text-zinc-500">
                    <Loader2 size={32} className="text-indigo-500 animate-spin" />
                    <span className="animate-pulse">데이터 분석 및 전략 수립 중...</span>
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