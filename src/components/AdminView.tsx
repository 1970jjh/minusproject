import React from 'react';
import { GameState, GamePhase } from '../types';
import PlayerBoard from './PlayerBoard';
import GameCard from './GameCard';
import Chip from './Chip';
import { CHIP_UNIT, MIN_PLAYERS } from '../constants';
import { RefreshCw, Play, Trophy, Users, Monitor, Eye, LayoutGrid, LogOut, BarChart3, Zap, Database, Activity, TrendingUp, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AdminViewProps {
  gameState: GameState;
  onStartGame: () => void;
  onReset: () => void;
  onViewPlayer: (playerId: string) => void;
  onExit: () => void;
  onShowResults?: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ gameState, onStartGame, onReset, onViewPlayer, onExit, onShowResults }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Safety: ensure players is always an array
  const players = gameState.players || [];
  const config = gameState.config || { roomName: 'Game Room', maxTeams: 6 };

  const currentPlayer = players.length > 0
    ? players[gameState.currentPlayerIndex]
    : null;
  const winner = gameState.phase === GamePhase.FINISHED && players.length > 0
    ? [...players].sort((a, b) => b.score - a.score)[0]
    : null;

  // -- Lobby Mode (Silicon Valley Style) --
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-gray-900'}`}>
        {/* Background Grid Pattern */}
        <div className={`absolute inset-0 tech-grid pointer-events-none ${!isDark && 'opacity-30'}`}></div>

        {/* Animated Gradient Orbs */}
        <div className={`absolute top-20 left-20 w-96 h-96 rounded-full blur-[120px] animate-pulse ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-400/20'}`}></div>
        <div className={`absolute bottom-20 right-20 w-80 h-80 rounded-full blur-[100px] animate-pulse delay-1000 ${isDark ? 'bg-purple-600/20' : 'bg-purple-400/20'}`}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] ${isDark ? 'bg-cyan-600/10' : 'bg-cyan-400/10'}`}></div>

        {/* Theme Toggle & Exit Button */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-semibold ${isDark ? 'glass text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg text-gray-600 hover:text-gray-900 border border-gray-200'}`}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={onExit}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-semibold ${isDark ? 'glass text-zinc-400 hover:text-white hover:border-zinc-500' : 'bg-white/80 shadow-lg text-gray-600 hover:text-gray-900 border border-gray-200'}`}
          >
            <LogOut size={14} /> 나가기
          </button>
        </div>

        {/* Room Info Header */}
        <div className="relative z-10 mb-12 text-center space-y-6">
            <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-full ${isDark ? 'glass-accent' : 'bg-white/80 shadow-lg border border-indigo-200'}`}>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <Monitor size={14} className="text-indigo-500" />
                <span className={`text-xs font-mono uppercase tracking-[0.2em] ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Command Center</span>
            </div>
            <h1 className={`text-5xl md:text-7xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {config.roomName}
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                <Users size={16} />
                <span className="font-mono">{players.length}</span>
                <span className={isDark ? 'text-zinc-600' : 'text-gray-400'}>/</span>
                <span className={`font-mono ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>{config.maxTeams}</span>
              </div>
              <div className={`w-px h-4 ${isDark ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
              <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Teams Connected</span>
            </div>
        </div>

        {/* Teams Grid */}
        <div className="relative z-10 w-full max-w-7xl mb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...players].sort((a, b) => a.colorIdx - b.colorIdx).map(player => {
                const members = player.members || [player.name];
                return (
                  <div key={player.id} className={`group relative rounded-2xl p-6 flex flex-col items-center transition-all duration-300 ${isDark ? 'glass hover:bg-white/[0.08] hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]' : 'bg-white/80 shadow-lg border border-gray-200 hover:border-indigo-300 hover:shadow-xl'}`}>
                     {/* Team Number Badge */}
                     <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg group-hover:shadow-indigo-500/30 transition-all group-hover:scale-110">
                       <span className="text-2xl font-bold text-white">{player.colorIdx + 1}</span>
                     </div>

                     {/* Team Name */}
                     <span className={`font-semibold text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.name}</span>

                     {/* Member Count */}
                     <div className={`flex items-center gap-2 px-3 py-1 rounded-full mb-4 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-100 border border-emerald-200'}`}>
                       <Activity size={12} className="text-emerald-500" />
                       <span className={`text-xs font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{members.length} members</span>
                     </div>

                     {/* Member List */}
                     <div className="w-full mb-4 max-h-20 overflow-y-auto scrollbar-hide">
                       <div className="flex flex-wrap gap-1.5 justify-center">
                         {members.map((name, idx) => (
                           <span key={idx} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${isDark ? 'glass text-zinc-400' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                             {name}
                           </span>
                         ))}
                       </div>
                     </div>

                     {/* View Team Button */}
                     <button
                       onClick={() => onViewPlayer(player.id)}
                       className={`w-full mt-auto py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${isDark ? 'glass-dark hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'}`}
                     >
                        <Eye size={14} /> View Team Console
                     </button>
                  </div>
                );
            })}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, config.maxTeams - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[260px] group transition-colors ${isDark ? 'border-zinc-800/50 hover:border-indigo-500/20' : 'border-gray-300 hover:border-indigo-300'}`}>
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${isDark ? 'bg-zinc-900/50 group-hover:bg-indigo-900/20' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                     <span className={`font-mono text-lg transition-colors ${isDark ? 'text-zinc-600 group-hover:text-indigo-400' : 'text-gray-400 group-hover:text-indigo-500'}`}>{i + 1 + players.length}</span>
                   </div>
                   <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Awaiting Connection</span>
                </div>
            ))}
            </div>
        </div>

        {/* Start Button */}
        <div className="relative z-10">
          <button
            onClick={onStartGame}
            disabled={players.length < MIN_PLAYERS}
            className={`
              group relative px-16 py-6 rounded-2xl font-bold text-xl flex items-center gap-4 transition-all duration-300
              ${players.length >= MIN_PLAYERS
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-right text-white shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] border border-indigo-400/30'
                : isDark ? 'glass text-zinc-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            <Zap size={24} className={players.length >= MIN_PLAYERS ? 'animate-pulse' : ''} />
            <span className="uppercase tracking-wider">Initialize Game</span>
            {players.length >= MIN_PLAYERS && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </button>
          {players.length < MIN_PLAYERS && (
            <p className={`text-center mt-4 text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Minimum {MIN_PLAYERS} teams required to start
            </p>
          )}
        </div>
      </div>
    );
  }

  // -- Game Mode (Silicon Valley Command Center) --
  const getPlayerPosition = (index: number, total: number) => {
    const angleDeg = (360 / total) * index - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const rx = 42;
    const ry = 38;
    const left = 50 + rx * Math.cos(angleRad);
    const top = 50 + ry * Math.sin(angleRad);

    return {
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
    };
  };

  // Digital City Skyline SVG Component
  const CitySkyline = () => (
    <div className="absolute bottom-0 left-0 right-0 h-80 pointer-events-none z-0 overflow-hidden opacity-20">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/30 via-transparent to-transparent"></div>

      {/* Main skyline */}
      <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1920 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          {/* Glow filter for windows */}
          <filter id="windowGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Building gradient */}
          <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#0f0a1e" stopOpacity="0.9"/>
          </linearGradient>
        </defs>

        {/* Back layer buildings (furthest) */}
        <g fill="url(#buildingGrad)" opacity="0.4">
          <rect x="0" y="200" width="60" height="200"/>
          <rect x="70" y="150" width="45" height="250"/>
          <rect x="125" y="180" width="55" height="220"/>
          <rect x="190" y="120" width="40" height="280"/>
          <rect x="240" y="160" width="70" height="240"/>
          <rect x="320" y="100" width="50" height="300"/>
          <rect x="380" y="140" width="65" height="260"/>
          <rect x="455" y="80" width="55" height="320"/>
          <rect x="520" y="130" width="45" height="270"/>
          <rect x="575" y="170" width="60" height="230"/>
          <rect x="645" y="90" width="50" height="310"/>
          <rect x="705" y="150" width="40" height="250"/>
          <rect x="755" y="110" width="70" height="290"/>
          <rect x="835" y="160" width="55" height="240"/>
          <rect x="900" y="70" width="45" height="330"/>
          <rect x="955" y="130" width="60" height="270"/>
          <rect x="1025" y="100" width="50" height="300"/>
          <rect x="1085" y="150" width="65" height="250"/>
          <rect x="1160" y="80" width="55" height="320"/>
          <rect x="1225" y="140" width="45" height="260"/>
          <rect x="1280" y="170" width="70" height="230"/>
          <rect x="1360" y="60" width="50" height="340"/>
          <rect x="1420" y="120" width="60" height="280"/>
          <rect x="1490" y="160" width="55" height="240"/>
          <rect x="1555" y="90" width="45" height="310"/>
          <rect x="1610" y="140" width="70" height="260"/>
          <rect x="1690" y="110" width="50" height="290"/>
          <rect x="1750" y="170" width="60" height="230"/>
          <rect x="1820" y="130" width="55" height="270"/>
          <rect x="1885" y="150" width="35" height="250"/>
        </g>

        {/* Middle layer buildings */}
        <g fill="#0c0a1d" opacity="0.6">
          <rect x="30" y="220" width="80" height="180"/>
          <rect x="140" y="170" width="60" height="230"/>
          <rect x="230" y="200" width="90" height="200"/>
          <rect x="350" y="140" width="70" height="260"/>
          <rect x="450" y="180" width="85" height="220"/>
          <rect x="570" y="120" width="60" height="280"/>
          <rect x="660" y="160" width="75" height="240"/>
          <rect x="770" y="100" width="55" height="300"/>
          <rect x="860" y="150" width="80" height="250"/>
          <rect x="970" y="130" width="65" height="270"/>
          <rect x="1070" y="170" width="90" height="230"/>
          <rect x="1190" y="110" width="70" height="290"/>
          <rect x="1290" y="150" width="60" height="250"/>
          <rect x="1380" y="90" width="85" height="310"/>
          <rect x="1500" y="140" width="75" height="260"/>
          <rect x="1610" y="180" width="55" height="220"/>
          <rect x="1700" y="120" width="80" height="280"/>
          <rect x="1810" y="160" width="65" height="240"/>
        </g>

        {/* Front layer buildings (closest) */}
        <g fill="#050208" opacity="0.8">
          <rect x="10" y="250" width="100" height="150"/>
          <rect x="150" y="220" width="70" height="180"/>
          <rect x="260" y="240" width="110" height="160"/>
          <rect x="410" y="200" width="80" height="200"/>
          <rect x="530" y="230" width="95" height="170"/>
          <rect x="670" y="190" width="70" height="210"/>
          <rect x="780" y="220" width="100" height="180"/>
          <rect x="920" y="210" width="85" height="190"/>
          <rect x="1050" y="230" width="75" height="170"/>
          <rect x="1170" y="200" width="90" height="200"/>
          <rect x="1300" y="220" width="80" height="180"/>
          <rect x="1420" y="190" width="100" height="210"/>
          <rect x="1560" y="230" width="70" height="170"/>
          <rect x="1670" y="210" width="95" height="190"/>
          <rect x="1800" y="240" width="80" height="160"/>
        </g>

        {/* Windows - glowing dots */}
        <g fill="#818cf8" filter="url(#windowGlow)" opacity="0.8">
          {/* Randomly placed windows */}
          <rect x="85" y="170" width="3" height="3"/>
          <rect x="95" y="180" width="3" height="3"/>
          <rect x="85" y="200" width="3" height="3"/>
          <rect x="345" y="120" width="3" height="3"/>
          <rect x="355" y="145" width="3" height="3"/>
          <rect x="345" y="170" width="3" height="3"/>
          <rect x="475" y="100" width="3" height="3"/>
          <rect x="485" y="130" width="3" height="3"/>
          <rect x="495" y="110" width="3" height="3"/>
          <rect x="665" y="110" width="3" height="3"/>
          <rect x="675" y="140" width="3" height="3"/>
          <rect x="685" y="125" width="3" height="3"/>
          <rect x="785" y="130" width="3" height="3"/>
          <rect x="795" y="160" width="3" height="3"/>
          <rect x="805" y="145" width="3" height="3"/>
          <rect x="920" y="90" width="3" height="3"/>
          <rect x="930" y="120" width="3" height="3"/>
          <rect x="920" y="150" width="3" height="3"/>
          <rect x="1180" y="100" width="3" height="3"/>
          <rect x="1190" y="130" width="3" height="3"/>
          <rect x="1200" y="115" width="3" height="3"/>
          <rect x="1380" y="80" width="3" height="3"/>
          <rect x="1390" y="110" width="3" height="3"/>
          <rect x="1380" y="140" width="3" height="3"/>
          <rect x="1580" y="110" width="3" height="3"/>
          <rect x="1590" y="140" width="3" height="3"/>
          <rect x="1580" y="170" width="3" height="3"/>
        </g>

        {/* Cyan accent windows */}
        <g fill="#22d3ee" filter="url(#windowGlow)" opacity="0.6">
          <rect x="165" y="190" width="3" height="3"/>
          <rect x="275" y="165" width="3" height="3"/>
          <rect x="395" y="155" width="3" height="3"/>
          <rect x="590" y="135" width="3" height="3"/>
          <rect x="735" y="125" width="3" height="3"/>
          <rect x="875" y="165" width="3" height="3"/>
          <rect x="1045" y="145" width="3" height="3"/>
          <rect x="1265" y="135" width="3" height="3"/>
          <rect x="1445" y="105" width="3" height="3"/>
          <rect x="1635" y="155" width="3" height="3"/>
          <rect x="1835" y="145" width="3" height="3"/>
        </g>

        {/* Pink accent windows */}
        <g fill="#f472b6" filter="url(#windowGlow)" opacity="0.5">
          <rect x="55" y="215" width="3" height="3"/>
          <rect x="215" y="135" width="3" height="3"/>
          <rect x="505" y="145" width="3" height="3"/>
          <rect x="625" y="185" width="3" height="3"/>
          <rect x="820" y="115" width="3" height="3"/>
          <rect x="985" y="150" width="3" height="3"/>
          <rect x="1115" y="185" width="3" height="3"/>
          <rect x="1335" y="175" width="3" height="3"/>
          <rect x="1545" y="125" width="3" height="3"/>
          <rect x="1730" y="135" width="3" height="3"/>
        </g>
      </svg>

      {/* Subtle reflection effect at very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-indigo-500/5 to-transparent"></div>

      {/* Animated scan line effect */}
      <div className="absolute bottom-0 left-0 right-0 h-full overflow-hidden">
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-float" style={{ bottom: '20%' }}></div>
      </div>
    </div>
  );

  return (
    <div className={`h-screen w-screen flex flex-col relative overflow-hidden font-sans select-none ${isDark ? 'bg-[#0a0a0f] text-gray-100' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-gray-900'}`}>

      {/* Background Effects */}
      <div className={`absolute inset-0 tech-grid pointer-events-none z-0 ${!isDark && 'opacity-30'}`}></div>
      <div className={`absolute inset-0 pointer-events-none z-0 ${isDark ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,rgba(0,0,0,0.9)_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,rgba(255,255,255,0.5)_70%)]'}`}></div>

      {/* Digital City Skyline Background */}
      {isDark && <CitySkyline />}

      {/* Animated corner accents */}
      <div className={`absolute top-0 left-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/10'}`}></div>
      <div className={`absolute bottom-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/10'}`}></div>

      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <div className={`rounded-xl p-4 flex items-center gap-4 ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
             <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <Database size={18} className="text-white" />
             </div>
             <div>
                <h1 className={`text-sm font-semibold tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>{config.roomName}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>ROUND {gameState.turnCount}</span>
                  <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-zinc-600' : 'bg-gray-400'}`}></div>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>DECK {gameState.deck?.length || 0}</span>
                </div>
             </div>
          </div>
          {/* JJ Creative Branding */}
          <div className={`mt-3 rounded-lg px-4 py-2 flex items-center gap-2 ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
            <span className="text-[10px] font-bold tracking-wider">
              <span className="text-cyan-500">JJ</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}> Creative </span>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">교육연구소</span>
            </span>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></div>
              <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse delay-100"></div>
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse delay-200"></div>
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-3">
          <button onClick={toggleTheme} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${isDark ? 'glass hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900'}`}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button onClick={onReset} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${isDark ? 'glass hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-300'}`}>
            <RefreshCw size={14} /> Reset
          </button>
          <button onClick={onExit} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${isDark ? 'glass hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-white/80 shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900'}`}>
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-8">

        {/* Subtle Table Ring */}
        <div className={`absolute inset-16 rounded-full border pointer-events-none ${isDark ? 'border-zinc-800/30' : 'border-gray-300/30'}`}></div>
        <div className={`absolute inset-24 rounded-full border pointer-events-none ${isDark ? 'border-indigo-500/5' : 'border-indigo-300/20'}`}></div>

        <div className="w-full h-full max-w-[1600px] relative">

            {/* Center Area: Command Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] flex items-center justify-center z-20">

               {gameState.phase === GamePhase.FINISHED ? (
                  <div className={`text-center animate-fade-in-up rounded-3xl p-10 ${isDark ? 'glass' : 'bg-white/90 shadow-2xl border border-gray-200'}`}>
                     <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
                        <Trophy size={80} className="text-yellow-400 relative z-10" />
                     </div>
                     <h2 className={`text-5xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Victory</h2>
                     <div className="text-3xl font-semibold text-yellow-500 mb-6">{winner?.name}</div>
                     <div className={`text-lg mb-6 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Final Score: <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{winner?.score}억</span></div>

                     {/* Results Analysis Button */}
                     {onShowResults && (
                        <button
                           onClick={onShowResults}
                           className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 mx-auto transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-105"
                        >
                           <BarChart3 size={18} />
                           Strategic Analysis
                        </button>
                     )}

                     <div className={`flex items-center gap-4 mt-6 p-4 rounded-xl justify-center ${isDark ? 'glass-dark' : 'bg-gray-100 border border-gray-200'}`}>
                        <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Hidden Project</span>
                        <GameCard value={gameState.hiddenCard!} isHidden={false} className="w-14 h-20 text-[10px]" />
                     </div>
                  </div>
               ) : (
                  <div className="flex items-center gap-16">
                     {/* Pot Display */}
                     <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -inset-8 bg-yellow-500/10 blur-3xl rounded-full"></div>
                            <div className={`rounded-2xl p-6 relative ${isDark ? 'glass' : 'bg-white/80 shadow-lg border border-gray-200'}`}>
                              <div className="flex flex-wrap justify-center gap-1.5 max-w-[180px]">
                                  {Array.from({ length: Math.min(gameState.pot, 15) }).map((_, i) => (
                                      <Chip key={i} count={1} className="scale-110" />
                                  ))}
                                  {gameState.pot > 15 && (
                                    <span className="text-xs text-yellow-500">+{gameState.pot - 15}</span>
                                  )}
                              </div>
                            </div>
                        </div>
                        <div className={`mt-6 px-6 py-3 rounded-xl ${isDark ? 'glass-dark' : 'bg-white/90 shadow-lg border border-gray-200'}`}>
                           <span className="text-yellow-500 font-mono font-bold text-3xl">{gameState.pot}{CHIP_UNIT}</span>
                        </div>
                        <span className={`mt-2 text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Accumulated Resources</span>
                     </div>

                     {/* Current Project */}
                     <div className="flex flex-col items-center">
                         <div className="relative group">
                           <div className="absolute -inset-8 bg-red-500/10 blur-3xl rounded-full group-hover:bg-red-500/20 transition-colors"></div>
                           <div className="transform transition-transform duration-500 group-hover:scale-105">
                             <GameCard value={gameState.currentCard!} className={`w-44 h-64 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${isDark ? 'border border-zinc-700/50' : 'border border-gray-300'}`} />
                           </div>
                         </div>
                         <span className={`mt-6 text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-red-400/60' : 'text-red-500/60'}`}>Current Project</span>
                     </div>
                  </div>
               )}
            </div>

            {/* Players distributed elliptically */}
            {players.map((player, index) => (
                <div
                    key={player.id}
                    className="absolute w-64 z-30 transition-all duration-500"
                    style={getPlayerPosition(index, players.length)}
                >
                    <PlayerBoard
                        player={player}
                        isActive={gameState.phase === GamePhase.PLAYING && currentPlayer?.id === player.id}
                        isWinner={winner?.id === player.id}
                        showPass={gameState.lastPassedPlayerIndex === index && gameState.phase === GamePhase.PLAYING}
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
