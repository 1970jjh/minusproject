import React, { useState, useRef } from 'react';
import { GameState, Player } from '../types';
import { TEAM_COLORS } from '../constants';
import { generateGameAnalysis, generateWinnerPoster, generatePosterDescription, GameAnalysisResult, AnalysisSection } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Trophy, Medal, Download, Cpu, Loader2,
  ArrowLeft, Crown, TrendingUp, Target, Sparkles,
  Image as ImageIcon, FileText, FileDown, Upload, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ResultsViewProps {
  gameState: GameState;
  onBack: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ gameState, onBack }) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [posterDescription, setPosterDescription] = useState<string | null>(null);
  const [teamPhoto, setTeamPhoto] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<GameAnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle team photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate PDF from content - Force light mode for better readability
  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;

    setGeneratingPdf(true);

    // Store current theme and switch to light for PDF
    const originalTheme = theme;
    setTheme('light');

    // Wait for theme to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const content = contentRef.current;

      // Capture the content as canvas with light background
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc', // Light background for PDF
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      const date = new Date().toISOString().split('T')[0];
      pdf.save(`Strategic-Positioning-Results-${date}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 생성에 실패했습니다.');
    } finally {
      // Restore original theme
      setTheme(originalTheme);
      setGeneratingPdf(false);
    }
  };

  // Sort players by score
  const rankedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const winner = rankedPlayers[0];

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

  // Generate poster using Gemini with optional team photo
  const handleGeneratePoster = async () => {
    setGeneratingPoster(true);
    setPosterError(null);
    setPosterDescription(null);

    try {
      const result = await generateWinnerPoster(gameState, teamPhoto || undefined);
      setPosterImage(result);
    } catch (error: any) {
      console.error("Poster generation failed:", error);
      setPosterError(error.message || "포스터 생성에 실패했습니다.");

      // Generate description as fallback
      const description = await generatePosterDescription(gameState);
      setPosterDescription(description);
    } finally {
      setGeneratingPoster(false);
    }
  };

  // Download poster
  const handleDownloadPoster = () => {
    if (!posterImage) return;

    const link = document.createElement('a');
    link.href = posterImage;
    link.download = `strategic-positioning-winner-team${winner.colorIdx + 1}.png`;
    link.click();
  };

  // Generate analysis
  const handleGenerateAnalysis = async () => {
    setLoadingAnalysis(true);
    const result = await generateGameAnalysis(gameState);
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0: return <Trophy className="text-yellow-400" size={24} />;
      case 1: return <Medal className="text-gray-300" size={22} />;
      case 2: return <Medal className="text-amber-600" size={20} />;
      default: return <span className={`font-bold ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{rank + 1}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    if (isDark) {
      switch (rank) {
        case 0: return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]';
        case 1: return 'bg-gradient-to-r from-gray-800/40 to-gray-700/20 border-gray-400/30';
        case 2: return 'bg-gradient-to-r from-amber-900/30 to-amber-800/20 border-amber-600/30';
        default: return 'bg-zinc-900/50 border-zinc-700/50';
      }
    } else {
      switch (rank) {
        case 0: return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-400 shadow-lg';
        case 1: return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300';
        case 2: return 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300';
        default: return 'bg-white border-gray-200';
      }
    }
  };

  // Get section style based on type
  const getSectionStyle = (type: AnalysisSection['type']) => {
    if (isDark) {
      switch (type) {
        case 'summary': return 'bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border-indigo-500/30';
        case 'team': return 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30';
        case 'winner': return 'bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border-yellow-500/30';
        case 'insight': return 'bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/30';
        case 'positioning': return 'bg-gradient-to-br from-pink-900/20 to-rose-900/20 border-pink-500/30';
        default: return 'bg-zinc-900/50 border-zinc-700/50';
      }
    } else {
      switch (type) {
        case 'summary': return 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300';
        case 'team': return 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-300';
        case 'winner': return 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300';
        case 'insight': return 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300';
        case 'positioning': return 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300';
        default: return 'bg-white border-gray-200';
      }
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#050505] text-white' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b ${isDark ? 'bg-black/90 border-zinc-800' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <ArrowLeft size={20} /> 게임 화면으로
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Strategic Positioning 결과 분석
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all ${isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  PDF 생성 중...
                </>
              ) : (
                <>
                  <FileDown size={16} />
                  PDF 다운로드
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main ref={contentRef} className={`max-w-6xl mx-auto px-6 py-8 space-y-12 ${isDark ? '' : 'bg-gradient-to-br from-slate-100 to-blue-50'}`}>

        {/* Winner Section */}
        <section className="relative">
          <div className={`absolute inset-0 rounded-3xl blur-3xl -z-10 ${isDark ? 'bg-gradient-to-b from-yellow-500/10 to-transparent' : 'bg-gradient-to-b from-yellow-300/20 to-transparent'}`} />

          <div className={`rounded-3xl border p-8 text-center ${isDark ? 'bg-gradient-to-br from-yellow-900/30 via-black to-yellow-900/20 border-yellow-500/30' : 'bg-gradient-to-br from-yellow-100 via-white to-yellow-50 border-yellow-300 shadow-lg'}`}>
            <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full border mb-4 ${isDark ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-yellow-200 border-yellow-400'}`}>
              <Crown size={16} className="text-yellow-500" />
              <span className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>WINNER</span>
            </div>

            <h2 className={`text-5xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {winner.colorIdx + 1}팀
            </h2>
            <p className={`mb-4 ${isDark ? 'text-yellow-400/80' : 'text-yellow-600'}`}>
              {winner.members?.join(' • ') || winner.name}
            </p>

            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className="text-4xl font-black text-yellow-500">{winner.score}억</p>
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Final Score</p>
              </div>
              <div>
                <p className="text-4xl font-black text-emerald-500">{winner.chips}억</p>
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Resources</p>
              </div>
              <div>
                <p className="text-4xl font-black text-red-500">{winner.cards.length}</p>
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Projects</p>
              </div>
            </div>
          </div>
        </section>

        {/* Winner Poster Section */}
        <section className={`rounded-2xl border p-6 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white shadow-lg border-gray-200'}`}>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Sparkles className="text-purple-500" size={24} />
            AI 우승팀 포스터 생성 (Gemini 2.0)
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Generation Controls */}
            <div className="space-y-4">
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                AI가 사이버펑크 스타일의 우승팀 포스터를 생성합니다.
                단체사진을 업로드하면 팀원들의 얼굴과 체형을 유지한 채 디지털 사이버틱 배경의 세로형 포스터를 만들 수 있습니다.
              </p>

              {/* Team Photo Upload */}
              <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'glass-dark' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2 text-purple-500">
                  <Upload size={16} />
                  <span className="font-semibold text-sm">우승팀 단체사진 업로드 (선택)</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-3 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${
                    isDark
                      ? 'border-zinc-600 hover:border-purple-500 text-zinc-400 hover:text-purple-400'
                      : 'border-gray-300 hover:border-purple-400 text-gray-500 hover:text-purple-600'
                  }`}
                >
                  <Upload size={18} />
                  {teamPhoto ? '다른 사진 선택' : '사진 업로드'}
                </button>
                {teamPhoto && (
                  <div className="relative">
                    <img src={teamPhoto} alt="Team photo" className="w-full max-h-48 object-contain rounded-lg" />
                    <button
                      onClick={() => setTeamPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'glass-dark' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2 text-purple-500">
                  <Sparkles size={16} />
                  <span className="font-semibold text-sm">포스터 정보</span>
                </div>
                <div className={`text-xs space-y-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                  <p>우승팀: <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{winner.colorIdx + 1}팀</span></p>
                  <p>팀원: <span className={isDark ? 'text-white' : 'text-gray-900'}>{winner.members?.join(', ') || winner.name}</span></p>
                  <p>최종 점수: <span className="text-yellow-500 font-semibold">{winner.score}억</span></p>
                </div>
              </div>

              <button
                onClick={handleGeneratePoster}
                disabled={generatingPoster}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                  ${!generatingPoster
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                    : isDark ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                `}
              >
                {generatingPoster ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    포스터 생성 중...
                  </>
                ) : (
                  <>
                    <ImageIcon size={20} />
                    AI 포스터 생성하기
                  </>
                )}
              </button>
            </div>

            {/* Generated Poster Area */}
            <div className="space-y-4">
              {posterImage ? (
                <>
                  <img
                    src={posterImage}
                    alt="Generated poster"
                    className={`w-full rounded-xl border shadow-2xl ${isDark ? 'border-zinc-700' : 'border-gray-300'}`}
                  />
                  <button
                    onClick={handleDownloadPoster}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-white"
                  >
                    <Download size={20} />
                    포스터 다운로드
                  </button>
                </>
              ) : posterError ? (
                <div className={`h-64 rounded-xl border p-6 flex flex-col ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-amber-500 mb-4">
                    <FileText size={20} />
                    <span className="font-bold">포스터 컨셉 가이드</span>
                  </div>
                  <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{posterError}</p>
                  {posterDescription && (
                    <div className={`flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                      {posterDescription}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-gray-50 border-gray-300'}`}>
                  <ImageIcon size={40} className={isDark ? 'text-zinc-700' : 'text-gray-400'} />
                  <span className={`text-sm ${isDark ? 'text-zinc-600' : 'text-gray-500'}`}>생성된 포스터가 여기에 표시됩니다</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Team Rankings */}
        <section>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <TrendingUp className="text-cyan-500" size={24} />
            최종 팀 순위
          </h3>

          <div className="space-y-4">
            {rankedPlayers.map((player, rank) => {
              const colorTheme = TEAM_COLORS[player.colorIdx % TEAM_COLORS.length];
              const sequences = findSequences(player.cards);

              return (
                <div
                  key={player.id}
                  className={`rounded-xl border p-4 transition-all ${getRankStyle(rank)}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>

                    <div className={`w-10 h-10 rounded-full ${colorTheme.bg} flex items-center justify-center`}>
                      <span className="text-white font-bold">{player.colorIdx + 1}</span>
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.colorIdx + 1}팀</h4>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                        {player.members?.join(', ') || player.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`text-2xl font-black ${player.score >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {player.score}억
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>최종 점수</p>
                    </div>
                  </div>

                  {/* Always show team details */}
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                    <div className={`rounded-lg p-3 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                      <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>보유 자원</p>
                      <p className="text-xl font-bold text-emerald-500">{player.chips}억</p>
                    </div>
                    <div className={`rounded-lg p-3 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                      <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>보유 프로젝트</p>
                      <p className={`text-sm font-mono ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                        {player.cards.length > 0 ? player.cards.sort((a,b)=>a-b).join(', ') : '없음'}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                      <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>연속 시퀀스</p>
                      <p className="text-sm font-mono text-purple-500">
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
        </section>

        {/* AI Analysis Section */}
        <section className={`rounded-2xl border p-6 ${isDark ? 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 shadow-lg'}`}>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Target className="text-indigo-500" size={24} />
            Strategic Positioning AI 분석
          </h3>

          {!analysis ? (
            <div className="text-center py-12">
              <Cpu size={48} className={`mx-auto mb-4 ${isDark ? 'text-indigo-400/50' : 'text-indigo-300'}`} />
              <p className={`mb-6 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                AI가 게임 전체를 분석하여 각 팀의 전략과 포지셔닝을 평가합니다.
              </p>
              <button
                onClick={handleGenerateAnalysis}
                disabled={loadingAnalysis}
                className={`px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto transition-all
                  ${loadingAnalysis
                    ? isDark ? 'bg-indigo-900/50 text-indigo-400 cursor-wait' : 'bg-indigo-100 text-indigo-400 cursor-wait'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg hover:shadow-indigo-500/25'}
                `}
              >
                {loadingAnalysis ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    AI 분석 진행 중...
                  </>
                ) : (
                  <>
                    <Cpu size={20} />
                    Strategic Position AI 분석 시작
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Render each section as a block */}
              {analysis.sections.map((section, idx) => {
                const isMvpSection = section.type === 'winner' || section.title.includes('MVP');
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border ${isMvpSection ? 'p-8' : 'p-6'} ${getSectionStyle(section.type)} ${isMvpSection ? 'shadow-lg' : ''}`}
                  >
                    <h4 className={`font-bold mb-4 ${isMvpSection ? 'text-2xl' : 'text-lg'} ${isDark ? 'text-white' : 'text-gray-900'} ${isMvpSection ? 'flex items-center gap-3' : ''}`}>
                      {isMvpSection && <Trophy className="text-yellow-500" size={28} />}
                      {section.title}
                    </h4>
                    <div className={`whitespace-pre-wrap leading-relaxed ${isMvpSection ? 'text-lg' : ''} ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
                      {section.content}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleGenerateAnalysis}
                disabled={loadingAnalysis}
                className={`mt-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {loadingAnalysis ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Cpu size={16} />
                )}
                다시 분석하기
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default ResultsView;
