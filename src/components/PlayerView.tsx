import React, { useState, useEffect } from 'react';
import { GameState, GamePhase, Player } from '../types';
import { CHIP_UNIT, TEAM_COLORS } from '../constants';
import Chip from './Chip';
import { getStrategicAdvice } from '../services/geminiService';
import { updateAiAdviceUsage, MAX_AI_ADVICE_PER_TEAM } from '../services/roomService';
import { playVoiceEffect, initializeSpeech } from '../services/soundService';
import { XCircle, CheckCircle, Home, Loader2, LogOut, Eye, Zap, Database, Activity, Sparkles, ChevronDown, ChevronUp, Trophy, Medal, Crown, TrendingUp, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PlayerViewProps {
  gameState: GameState;
  playerId: string;
  roomId: string | null;
  onAction: (action: 'pass' | 'take') => void;
  isAdmin?: boolean;
  onReturnToAdmin?: () => void;
}

const PlayerView: React.FC<PlayerViewProps> = ({ gameState, playerId, roomId, onAction, isAdmin, onReturnToAdmin }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [connectionTime, setConnectionTime] = useState(0);
  const [showOtherTeams, setShowOtherTeams] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setConnectionTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeSpeech();
  }, []);

  const handleActionWithSound = (action: 'pass' | 'take') => {
    playVoiceEffect(action === 'pass' ? 'PASS' : 'TAKE');
    onAction(action);
  };

  const players = gameState.players || [];
  const me = players.find(p => {
    const memberIds = p.memberIds || [p.id];
    return memberIds.includes(playerId);
  });

  // -- Error / Loading States --
  if (!me) {
    if (connectionTime < 5) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 tech-grid pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-4 animate-pulse">
                        <Database size={24} className="text-white" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">연결 중...</h2>
                    <p className="text-zinc-500 text-sm">서버 접속 중입니다</p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 tech-grid pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl glass flex items-center justify-center mb-4">
                    <XCircle size={32} className="text-zinc-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">접속 정보 없음</h2>
                <p className="text-zinc-500 mb-6 text-center text-sm">게임이 초기화되었거나,<br/>방에 입장할 수 없습니다.</p>
                <button
                  onClick={() => {
                    localStorage.removeItem('playerSession');
                    window.location.reload();
                  }}
                  className="px-6 py-2.5 glass hover:bg-white/10 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm"
                >
                    <Home size={16} /> 홈으로 돌아가기
                </button>
                {isAdmin && onReturnToAdmin && (
                    <button onClick={onReturnToAdmin} className="text-sm text-indigo-400 hover:text-indigo-300 mt-3 transition-colors">
                        관리자 뷰로 복귀
                    </button>
                )}
            </div>
        </div>
    );
  }

  const isMyTurn = me && players[gameState.currentPlayerIndex]?.id === me.id && gameState.phase === GamePhase.PLAYING;
  const teamId = me.id;
  const currentAiUsage = gameState.aiAdviceUsage?.[teamId] || 0;
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

    const usageResult = await updateAiAdviceUsage(roomId, teamId);
    if (!usageResult.success) {
      setAdvice(`AI 조언 사용 횟수를 모두 소진했습니다. (${usageResult.currentUsage}/${MAX_AI_ADVICE_PER_TEAM})`);
      setLoadingAdvice(false);
      return;
    }

    const result = await getStrategicAdvice(gameState, teamId);
    setAdvice(result);
    setLoadingAdvice(false);
  };

  const AdminControls = () => (
      isAdmin && onReturnToAdmin ? (
        <>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[9px] font-semibold text-center py-1.5 uppercase tracking-wider sticky top-0 z-50 flex items-center justify-center gap-2">
            <Eye size={10} /> 관리자 관전 모드
          </div>
          <button
            onClick={onReturnToAdmin}
            className="fixed top-10 right-3 z-50 glass text-white px-3 py-1.5 rounded-full shadow-lg font-semibold text-[10px] flex items-center gap-1 hover:bg-white/10 transition-colors"
          >
            <LogOut size={12} /> 나가기
          </button>
        </>
      ) : null
  );

  // Find sequences helper
  const findSequences = (cards: number[]): number[][] => {
    if (cards.length === 0) return [];
    const sorted = [...cards].sort((a, b) => a - b);
    const sequences: number[][] = [];
    let currentSeq: number[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentSeq.push(sorted[i]);
      } else {
        if (currentSeq.length >= 2) sequences.push([...currentSeq]);
        currentSeq = [sorted[i]];
      }
    }
    if (currentSeq.length >= 2) sequences.push(currentSeq);
    return sequences;
  };

  // -- Results/Finished State (Mobile) --
  if (gameState.phase === GamePhase.FINISHED) {
    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = rankedPlayers[0];

    const getRankIcon = (rank: number) => {
      switch (rank) {
        case 0: return <Trophy className="text-yellow-400" size={20} />;
        case 1: return <Medal className="text-gray-300" size={18} />;
        case 2: return <Medal className="text-amber-600" size={16} />;
        default: return <span className={`font-bold text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{rank + 1}</span>;
      }
    };

    return (
      <div className={`min-h-screen flex flex-col relative overflow-auto ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-gray-900'}`}>
        <div className={`absolute inset-0 tech-grid pointer-events-none ${!isDark && 'opacity-30'}`}></div>
        <AdminControls />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`fixed top-4 left-4 z-50 p-2 rounded-lg transition-all ${isDark ? 'glass text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900'}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Header */}
        <div className="relative z-10 p-4 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full mb-3 ${isDark ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-100 border border-yellow-300'}`}>
            <Crown size={14} className="text-yellow-500" />
            <span className={`text-xs font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>게임 종료</span>
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent">
            최종 결과
          </h1>
        </div>

        {/* Winner Section */}
        <div className="relative z-10 px-4 mb-4">
          <div className={`rounded-xl p-4 text-center ${isDark ? 'glass bg-gradient-to-br from-yellow-900/20 to-transparent border border-yellow-500/20' : 'bg-white/80 shadow-lg border border-yellow-200'}`}>
            <Trophy size={32} className="text-yellow-500 mx-auto mb-2" />
            <p className={`text-[10px] uppercase tracking-wider mb-1 ${isDark ? 'text-yellow-400/80' : 'text-yellow-600'}`}>우승</p>
            <h2 className={`text-3xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{winner.colorIdx + 1}팀</h2>
            <p className={`text-xs mb-3 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{winner.members?.join(' • ') || winner.name}</p>
            <div className="flex justify-center gap-4">
              <div>
                <p className="text-2xl font-black text-yellow-500">{winner.score}억</p>
                <p className={`text-[9px] uppercase ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>점수</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-500">{winner.chips}억</p>
                <p className={`text-[9px] uppercase ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>자원</p>
              </div>
              <div>
                <p className="text-2xl font-black text-red-500">{winner.cards.length}</p>
                <p className={`text-[9px] uppercase ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>프로젝트</p>
              </div>
            </div>
          </div>
        </div>

        {/* All Team Rankings */}
        <div className="relative z-10 px-4 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-cyan-500" />
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>전체 팀 순위</h3>
          </div>

          <div className="space-y-3 pb-6">
            {rankedPlayers.map((player, rank) => {
              const sequences = findSequences(player.cards);
              const isWinner = rank === 0;

              return (
                <div
                  key={player.id}
                  className={`rounded-xl p-3 ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'} ${isWinner ? (isDark ? 'border border-yellow-500/30 bg-yellow-900/10' : 'border-yellow-300 bg-yellow-50') : ''}`}
                >
                  {/* Team Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{player.colorIdx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.colorIdx + 1}팀</h4>
                      <p className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        {player.members?.join(', ') || player.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${player.score >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {player.score}억
                      </p>
                    </div>
                  </div>

                  {/* Team Details */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-lg p-2 ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
                      <p className={`text-[8px] mb-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>보유 자원</p>
                      <p className="text-sm font-bold text-emerald-500">{player.chips}억</p>
                    </div>
                    <div className={`rounded-lg p-2 ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
                      <p className={`text-[8px] mb-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>프로젝트</p>
                      <p className={`text-[10px] font-mono truncate ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                        {player.cards.length > 0 ? player.cards.sort((a,b)=>a-b).join(', ') : '없음'}
                      </p>
                    </div>
                    <div className={`rounded-lg p-2 ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
                      <p className={`text-[8px] mb-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>시퀀스</p>
                      <p className="text-[10px] font-mono text-purple-500 truncate">
                        {sequences.length > 0
                          ? sequences.map(s => `[${s.join(',')}]`).join(' ')
                          : '없음'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-4 text-center">
          <p className={`text-[9px] ${isDark ? 'text-zinc-700' : 'text-gray-400'}`}>© Copyright Reserved by JJ Creative 교육연구소</p>
        </div>
      </div>
    );
  }

  // -- Lobby State --
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-gray-900'}`}>
        <div className={`absolute inset-0 tech-grid pointer-events-none ${!isDark && 'opacity-30'}`}></div>
        <AdminControls />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`absolute top-4 left-4 z-50 p-2 rounded-lg transition-all ${isDark ? 'glass text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900'}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Exit Button (for non-admin players) */}
        {!isAdmin && (
          <button
            onClick={() => {
              localStorage.removeItem('playerSession');
              window.location.reload();
            }}
            className={`absolute top-4 right-4 z-50 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${isDark ? 'glass hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900'}`}
          >
            <LogOut size={14} /> 나가기
          </button>
        )}

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-6 animate-pulse shadow-lg">
             <Loader2 size={32} className="text-white animate-spin" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>게임 대기 중</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>관리자가 게임을 시작할 때까지<br/>팀원들과 전략을 상의하세요.</p>
          <div className={`rounded-xl p-4 min-w-[160px] ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
             <p className={`text-[10px] tracking-widest mb-1 uppercase ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>나의 팀</p>
             <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{me.colorIdx + 1}팀</p>
          </div>
        </div>
        <p className={`absolute bottom-4 text-[9px] ${isDark ? 'text-zinc-700' : 'text-gray-400'}`}>© Copyright Reserved by JJ Creative 교육연구소</p>
      </div>
    );
  }

  // -- Playing State (Compact Mobile UI) --
  return (
    <div className={`min-h-screen flex flex-col relative ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-gray-900'}`}>
      <div className={`absolute inset-0 tech-grid pointer-events-none ${!isDark && 'opacity-30'}`}></div>
      <AdminControls />

      {/* Theme Toggle - Fixed position */}
      <button
        onClick={toggleTheme}
        className={`fixed top-3 left-3 z-50 p-2 rounded-lg transition-all ${isDark ? 'glass text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900'}`}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* Compact Header */}
      <div className="relative z-10 p-3 pl-14">
        <div className={`rounded-xl p-3 ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{me.colorIdx + 1}</span>
              </div>
              <div>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{me.colorIdx + 1}팀</h1>
                <div className={`flex items-center gap-2 text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  <span className="flex items-center gap-1">
                    <Chip count={1} className="scale-50" />
                    <span className="text-yellow-500 font-mono font-bold">{me.chips}</span>
                  </span>
                  <span>|</span>
                  <span className={`font-mono font-bold ${me.score >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {me.score > 0 ? '+' : ''}{me.score}억
                  </span>
                </div>
              </div>
            </div>
            {/* AI Advice Button */}
            <button
              onClick={handleGetAdvice}
              disabled={!canUseAdvice}
              className={`px-3 py-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all
                ${canUseAdvice
                  ? (isDark ? 'glass-accent text-indigo-300' : 'bg-indigo-100 border border-indigo-200 text-indigo-600')
                  : (isDark ? 'glass text-zinc-600' : 'bg-gray-100 text-gray-400')}
              `}
            >
              <Sparkles size={12} className={canUseAdvice ? 'animate-pulse' : ''} />
              AI 조언
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${canUseAdvice ? (isDark ? 'bg-indigo-900/50' : 'bg-indigo-200') : (isDark ? 'bg-zinc-800' : 'bg-gray-200')}`}>
                {currentAiUsage}/{MAX_AI_ADVICE_PER_TEAM}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Auction - Compact */}
      <div className="px-3 relative z-10">
        <div className={`rounded-xl p-3 ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-red-500" />
              <span className={`text-[10px] font-semibold uppercase ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>현재 경매</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
              <span className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>POT</span>
              <span className="text-yellow-500 font-bold font-mono text-sm">{gameState.pot}억</span>
            </div>
          </div>
          <div className={`flex justify-center items-center py-4 rounded-lg ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
            <div className="text-center">
              <div className={`text-4xl font-bold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{gameState.currentCard}억</div>
              <span className="text-[9px] text-red-500 font-semibold uppercase tracking-wider">Minus Project</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Projects - Compact */}
      {me.cards.length > 0 && (
        <div className="px-3 mt-2 relative z-10">
          <div className={`rounded-xl p-3 ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Database size={10} className={isDark ? 'text-zinc-500' : 'text-gray-500'} />
              <p className={`text-[9px] font-semibold uppercase ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>내 프로젝트</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...me.cards].sort((a,b)=>a-b).map(c => (
                <span key={c} className={`text-[10px] font-mono font-semibold px-2 py-1 rounded ${isDark ? 'glass-dark text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex-1 px-3 mt-3 relative z-10 flex flex-col">
        {isMyTurn ? (
          <>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-500 text-xs font-semibold">내 차례입니다!</span>
            </div>
            <div className="flex gap-3 h-24">
              <button
                onClick={() => handleActionWithSound('pass')}
                disabled={me.chips <= 0}
                className={`flex-1 rounded-xl font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1
                  ${me.chips > 0
                    ? (isDark ? 'glass hover:bg-red-500/10 text-red-400' : 'bg-white/80 shadow-lg border border-gray-200 hover:border-red-300 text-red-500')
                    : (isDark ? 'glass text-zinc-700 opacity-50' : 'bg-gray-100 text-gray-400 opacity-50')}
                `}
              >
                <XCircle size={24} />
                <span className="text-sm uppercase">Pass</span>
                <span className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>자원 1개 지불</span>
              </button>
              <button
                onClick={() => handleActionWithSound('take')}
                className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
              >
                <CheckCircle size={24} />
                <span className="text-sm uppercase">Take</span>
                <span className="text-[9px] text-white/70">프로젝트 가져가기</span>
              </button>
            </div>
          </>
        ) : (
          <div className={`h-24 flex items-center justify-center rounded-xl ${isDark ? 'glass-dark' : 'bg-gray-100'}`}>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping delay-100"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping delay-200"></div>
              </div>
              <p className={`text-sm font-semibold ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                {players[gameState.currentPlayerIndex]?.colorIdx + 1}팀 차례
              </p>
              <p className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>대기 중...</p>
            </div>
          </div>
        )}

        {/* Other Teams - Collapsible at Bottom */}
        <div className="mt-3">
          <button
            onClick={() => setShowOtherTeams(!showOtherTeams)}
            className={`w-full rounded-xl p-3 flex items-center justify-between ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}
          >
            <div className="flex items-center gap-1.5">
              <Activity size={12} className={isDark ? 'text-zinc-500' : 'text-gray-500'} />
              <span className={`text-[10px] font-semibold uppercase ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>다른 팀 현황</span>
            </div>
            {showOtherTeams ? <ChevronUp size={14} className={isDark ? 'text-zinc-500' : 'text-gray-500'} /> : <ChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-gray-500'} />}
          </button>

          {showOtherTeams && (
            <div className={`mt-2 rounded-xl p-3 space-y-2 animate-fade-in ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
              {[...players]
                .filter(p => p.id !== teamId)
                .sort((a, b) => a.colorIdx - b.colorIdx)
                .map(player => {
                  const isCurrentTurn = players[gameState.currentPlayerIndex]?.id === player.id;
                  return (
                    <div key={player.id} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'glass-dark' : 'bg-gray-100'} ${isCurrentTurn ? 'ring-1 ring-indigo-500/50' : ''}`}>
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{player.colorIdx + 1}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between text-[10px]">
                        <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{player.colorIdx + 1}팀</span>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500 font-mono">{player.chips}억</span>
                          <span className={`font-mono ${player.score >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {player.score > 0 ? '+' : ''}{player.score}
                          </span>
                          {isCurrentTurn && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                              TURN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Copyright Footer */}
        <div className="mt-auto pt-4 pb-3 text-center">
          <p className={`text-[9px] ${isDark ? 'text-zinc-700' : 'text-gray-400'}`}>© Copyright Reserved by JJ Creative 교육연구소</p>
        </div>
      </div>

      {/* Advice Modal */}
      {showAdviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-sm rounded-xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="p-3 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 flex justify-between items-center">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2"><Sparkles size={14} className="text-indigo-400"/> AI 전략 분석</h3>
              <button onClick={() => setShowAdviceModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><XCircle className="text-zinc-400" size={16}/></button>
            </div>
            <div className="p-4 text-sm leading-relaxed text-zinc-200 overflow-y-auto flex-1">
              {loadingAdvice ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-zinc-500">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <Loader2 size={20} className="text-white animate-spin" />
                  </div>
                  <span className="text-xs">전략 분석 중...</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-xs">{advice}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerView;
