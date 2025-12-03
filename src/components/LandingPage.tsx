import React, { useState, useEffect } from 'react';
import { Users, Lock, LogIn, Monitor, RefreshCw, Hexagon, X } from 'lucide-react';
import { TEAM_COLORS, MAX_PLAYERS, MIN_PLAYERS } from '../constants';
import { GameConfig } from '../types';

interface LandingPageProps {
  onJoinAsAdmin: (config: GameConfig) => void;
  onJoinAsPlayer: (name: string, colorIdx: number) => void;
  isAdminAuthenticated: boolean;
  onAdminLoginSuccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  onJoinAsAdmin, 
  onJoinAsPlayer, 
  isAdminAuthenticated, 
  onAdminLoginSuccess 
}) => {
  // Modes: MAIN (List), PLAYER_FORM, ADMIN_SETUP
  const [viewState, setViewState] = useState<'MAIN' | 'PLAYER_FORM' | 'ADMIN_SETUP'>('MAIN');
  const [activeTab, setActiveTab] = useState<'JOIN' | 'CREATE'>('JOIN');
  
  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTab, setLoginTab] = useState<'MEMBER' | 'ADMIN'>('ADMIN');

  // Player Form State
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);

  // Admin Form State
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [roomName, setRoomName] = useState('전략 포지셔닝: 메인 매치');
  const [maxTeams, setMaxTeams] = useState(MAX_PLAYERS);

  // If already authenticated and switching to CREATE tab, go straight to setup
  useEffect(() => {
    if (activeTab === 'CREATE' && isAdminAuthenticated && viewState === 'MAIN') {
       setViewState('ADMIN_SETUP');
    }
  }, [activeTab, isAdminAuthenticated, viewState]);

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim()) {
      onJoinAsPlayer(teamName, selectedColor);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '6749467') {
      setShowLoginModal(false);
      setAdminError('');
      onAdminLoginSuccess(); // Notify App that auth is good
      setViewState('ADMIN_SETUP');
    } else {
      setAdminError('비밀번호가 일치하지 않습니다.');
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    onJoinAsAdmin({
      roomName,
      maxTeams
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Grids */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-purple-900/10 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8 flex flex-col h-full max-h-screen overflow-y-auto scrollbar-hide">
        
        {/* Header Logo Area */}
        <div className="text-center mb-10 animate-fade-in-down">
            <div className="flex justify-center mb-4">
                <Hexagon size={48} className="text-cyan-400 fill-cyan-900/20" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-bold text-zinc-500 tracking-[0.2em] uppercase mb-1">JJ CREATIVE 교육연구소</h2>
            <h1 className="text-4xl font-black text-white leading-tight">
                AI <span className="text-zinc-600 text-2xl align-middle mx-1">vs</span> <span className="text-cyan-400">집단지성</span>
            </h1>
            <p className="text-[10px] text-cyan-600 font-mono mt-2 tracking-widest uppercase">
                Collective Intelligence Challenge
            </p>
        </div>

        {viewState === 'MAIN' && (
            <>
                {/* Tab Navigation */}
                <div className="flex gap-4 mb-8">
                    <button 
                        onClick={() => setActiveTab('JOIN')}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 border ${activeTab === 'JOIN' ? 'bg-purple-900/20 border-purple-500 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        게임 참여
                    </button>
                    <button 
                        onClick={() => setActiveTab('CREATE')}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 border ${activeTab === 'CREATE' ? 'bg-cyan-900/20 border-cyan-500 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        게임 생성
                    </button>
                </div>

                {/* Content Area based on Tab */}
                <div className="relative min-h-[300px]">
                    {activeTab === 'JOIN' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-end mb-2 px-1">
                                <h3 className="text-lg font-bold text-white">Active Games</h3>
                                <button className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300">
                                    <RefreshCw size={12} /> Refresh
                                </button>
                            </div>

                            {/* Game List Item (Simulated) */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">SK네트웍스</h4>
                                        <p className="text-xs text-zinc-500 font-mono">0/12 Teams • Lobby Open</p>
                                    </div>
                                    <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">WAITING</span>
                                </div>
                                <button 
                                    onClick={() => setViewState('PLAYER_FORM')}
                                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 hover:text-cyan-400 rounded-lg text-sm font-bold text-zinc-300 transition-all border border-zinc-700 flex items-center justify-center gap-2"
                                >
                                    ENTER ROOM
                                </button>
                            </div>

                            {/* Dummy Ended Item */}
                            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-xl p-5 opacity-60">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-zinc-400 mb-1">코레일관광개발</h4>
                                        <p className="text-xs text-zinc-600 font-mono">3/3 Teams • Ended</p>
                                    </div>
                                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-500 text-[10px] font-bold border border-zinc-700">ENDED</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // ADMIN CREATE TAB
                        isAdminAuthenticated ? (
                             // ALREADY AUTHENTICATED
                             <div className="flex items-center justify-center h-[300px]">
                                <p className="text-zinc-500 animate-pulse">관리자 설정 불러오는 중...</p>
                             </div>
                        ) : (
                            // LOCKED (REQUIRE LOGIN)
                            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center h-[300px] flex flex-col items-center justify-center relative overflow-hidden animate-fade-in">
                                <div className="absolute inset-0 bg-black/60 z-10"></div>
                                <div className="relative z-20 flex flex-col items-center">
                                    <Lock size={48} className="text-zinc-600 mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">접근 권한 없음</h3>
                                    <p className="text-sm text-zinc-500 mb-6">게임 생성은 관리자 및 등록된 회원만 가능합니다.</p>
                                    
                                    <button 
                                        onClick={() => setShowLoginModal(true)}
                                        className="px-6 py-3 border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                    >
                                        로그인 하러 가기
                                    </button>
                                    
                                    <div className="mt-8 opacity-20 filter blur-[1px] pointer-events-none select-none">
                                        <button className="px-12 py-4 bg-zinc-800 rounded font-bold text-zinc-600 flex items-center gap-2">
                                            <Monitor size={18} /> CREATE GAME
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </>
        )}

        {viewState === 'PLAYER_FORM' && (
             <form onSubmit={handlePlayerSubmit} className="w-full bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-2xl animate-fade-in">
                <button 
                    type="button" 
                    onClick={() => setViewState('MAIN')}
                    className="mb-6 text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                >
                    ← 뒤로가기
                </button>
                <h3 className="text-2xl font-bold text-white mb-1">팀 프로필 설정</h3>
                <p className="text-xs text-zinc-500 mb-6">입찰에 참여할 팀 정보를 입력하세요.</p>
                
                <div className="mb-6">
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Team Name</label>
                <input 
                    type="text" 
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors text-base placeholder-zinc-700"
                    placeholder="팀 이름 입력"
                    maxLength={8}
                    required
                    autoFocus
                />
                </div>

                <div className="mb-8">
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-3 tracking-wider">Team Color</label>
                <div className="grid grid-cols-6 gap-3">
                    {TEAM_COLORS.map((color, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedColor(idx)}
                        className={`aspect-square rounded-full ${color.bg} border-2 transition-transform ${selectedColor === idx ? 'border-white scale-110 ring-2 ring-white/20' : 'border-transparent opacity-30 hover:opacity-70'}`}
                    />
                    ))}
                </div>
                </div>

                <button 
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-white shadow-lg text-sm tracking-wide"
                >
                    입장하기
                </button>
            </form>
        )}

        {viewState === 'ADMIN_SETUP' && (
            <form onSubmit={handleCreateRoom} className="w-full bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-2xl animate-fade-in">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
                    <div className="p-2 bg-cyan-900/20 rounded-lg text-cyan-400">
                        <Monitor size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">게임 생성</h3>
                        <p className="text-xs text-zinc-500">관리자 모드</p>
                    </div>
                </div>

                <div className="space-y-5 mb-8">
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-bold mb-1 uppercase tracking-wider">Game Title</label>
                        <input 
                            type="text" 
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-bold mb-1 uppercase tracking-wider">Max Teams ({MIN_PLAYERS}-{MAX_PLAYERS})</label>
                        <input 
                            type="number" 
                            min={MIN_PLAYERS}
                            max={MAX_PLAYERS}
                            value={maxTeams}
                            onChange={(e) => setMaxTeams(Number(e.target.value))}
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        type="button"
                        onClick={() => { setViewState('MAIN'); setActiveTab('CREATE'); }}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-zinc-400 text-sm"
                    >
                        취소
                    </button>
                    <button 
                        type="submit"
                        className="flex-[2] py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-white shadow-lg text-sm"
                    >
                        방 개설하기
                    </button>
                </div>
            </form>
        )}

      </div>

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f0f12] w-full max-w-sm rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <LogIn size={18} className="text-cyan-400"/> 시스템 로그인
                    </h3>
                    <button onClick={() => setShowLoginModal(false)} className="text-zinc-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    {/* Tabs */}
                    <div className="flex bg-black rounded-lg p-1 mb-6 border border-zinc-800">
                        <button 
                            onClick={() => setLoginTab('MEMBER')}
                            className={`flex-1 py-2 text-xs font-bold rounded ${loginTab === 'MEMBER' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            회원 로그인
                        </button>
                        <button 
                            onClick={() => setLoginTab('ADMIN')}
                            className={`flex-1 py-2 text-xs font-bold rounded ${loginTab === 'ADMIN' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            관리자 로그인
                        </button>
                    </div>

                    {loginTab === 'ADMIN' ? (
                         <form onSubmit={handleAdminLogin}>
                            <label className="block text-zinc-500 text-[10px] font-bold uppercase mb-2 tracking-wider">Admin Password</label>
                            <input 
                                type="password" 
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] focus:outline-none focus:border-purple-500 transition-colors mb-2 placeholder-zinc-800"
                                placeholder="••••••"
                                autoFocus
                            />
                            <div className="h-4 mb-4">
                                {adminError && <p className="text-red-500 text-[10px] text-center">{adminError}</p>}
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-lg font-bold text-sm transition-all"
                            >
                                로그인
                            </button>
                        </form>
                    ) : (
                        <div className="py-8 text-center text-zinc-500 text-xs">
                            <Lock size={32} className="mx-auto mb-3 opacity-20" />
                            <p>회원 가입 및 로그인은<br/>현재 지원되지 않습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-4 text-[10px] text-zinc-700 font-mono">
        © JJ CREATIVE LAB. All rights reserved.
      </div>
    </div>
  );
};

export default LandingPage;