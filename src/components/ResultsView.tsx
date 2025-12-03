import React, { useState, useRef } from 'react';
import { GameState, Player } from '../types';
import { TEAM_COLORS } from '../constants';
import { generateGameAnalysis, generateWinnerPoster, generatePosterDescription } from '../services/geminiService';
import {
  Trophy, Medal, Upload, Download, Cpu, Loader2,
  ArrowLeft, Crown, TrendingUp, Target, Sparkles,
  Image as ImageIcon, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

interface ResultsViewProps {
  gameState: GameState;
  onBack: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ gameState, onBack }) => {
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [posterDescription, setPosterDescription] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setPosterError(null);
    };
    reader.readAsDataURL(file);
  };

  // Generate poster
  const handleGeneratePoster = async () => {
    if (!uploadedImage) return;

    setGeneratingPoster(true);
    setPosterError(null);

    try {
      // Extract base64 and mime type from data URL
      const matches = uploadedImage.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new Error("Invalid image format");

      const mimeType = matches[1];
      const base64Data = matches[2];

      const result = await generateWinnerPoster(gameState, base64Data, mimeType);
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
      default: return <span className="text-zinc-500 font-bold">{rank + 1}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 0: return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]';
      case 1: return 'bg-gradient-to-r from-gray-800/40 to-gray-700/20 border-gray-400/30';
      case 2: return 'bg-gradient-to-r from-amber-900/30 to-amber-800/20 border-amber-600/30';
      default: return 'bg-zinc-900/50 border-zinc-700/50';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> 게임 화면으로
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Strategic Positioning 결과 분석
          </h1>
          <div className="w-32" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">

        {/* Winner Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent rounded-3xl blur-3xl -z-10" />

          <div className="bg-gradient-to-br from-yellow-900/30 via-black to-yellow-900/20 rounded-3xl border border-yellow-500/30 p-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30 mb-4">
              <Crown size={16} className="text-yellow-400" />
              <span className="text-yellow-400 text-sm font-bold">WINNER</span>
            </div>

            <h2 className="text-5xl font-black text-white mb-2">
              {winner.colorIdx + 1}팀
            </h2>
            <p className="text-yellow-400/80 mb-4">
              {winner.members?.join(' • ') || winner.name}
            </p>

            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className="text-4xl font-black text-yellow-400">{winner.score}억</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Final Score</p>
              </div>
              <div>
                <p className="text-4xl font-black text-emerald-400">{winner.chips}억</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Resources</p>
              </div>
              <div>
                <p className="text-4xl font-black text-red-400">{winner.cards.length}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Projects</p>
              </div>
            </div>
          </div>
        </section>

        {/* Winner Poster Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="text-purple-400" size={24} />
            우승팀 포스터 생성
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                우승팀 단체 사진을 업로드하면 AI가 넷플릭스 드라마 "카지노" 스타일의
                멋진 우승 포스터를 생성합니다.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              {uploadedImage ? (
                <div className="relative">
                  <img
                    src={uploadedImage}
                    alt="Uploaded team"
                    className="w-full h-64 object-cover rounded-xl border border-zinc-700"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/80 rounded-lg text-xs text-zinc-300 hover:text-white border border-zinc-600"
                  >
                    다시 선택
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors"
                >
                  <Upload size={40} className="text-zinc-600" />
                  <span className="text-zinc-500">사진 업로드</span>
                  <span className="text-xs text-zinc-600">JPG, PNG (최대 10MB)</span>
                </button>
              )}

              <button
                onClick={handleGeneratePoster}
                disabled={!uploadedImage || generatingPoster}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                  ${uploadedImage && !generatingPoster
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
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
                    className="w-full rounded-xl border border-zinc-700 shadow-2xl"
                  />
                  <button
                    onClick={handleDownloadPoster}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={20} />
                    포스터 다운로드
                  </button>
                </>
              ) : posterError ? (
                <div className="h-64 bg-zinc-800/50 rounded-xl border border-zinc-700 p-6 flex flex-col">
                  <div className="flex items-center gap-2 text-amber-400 mb-4">
                    <FileText size={20} />
                    <span className="font-bold">포스터 컨셉 가이드</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">{posterError}</p>
                  {posterDescription && (
                    <div className="flex-1 overflow-y-auto text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {posterDescription}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 bg-zinc-800/30 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center gap-3">
                  <ImageIcon size={40} className="text-zinc-700" />
                  <span className="text-zinc-600 text-sm">생성된 포스터가 여기에 표시됩니다</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Team Rankings */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="text-cyan-400" size={24} />
            최종 팀 순위
          </h3>

          <div className="space-y-4">
            {rankedPlayers.map((player, rank) => {
              const colorTheme = TEAM_COLORS[player.colorIdx % TEAM_COLORS.length];
              const sequences = findSequences(player.cards);
              const isExpanded = expandedTeam === rank;

              return (
                <div
                  key={player.id}
                  className={`rounded-xl border p-4 transition-all ${getRankStyle(rank)}`}
                >
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedTeam(isExpanded ? null : rank)}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>

                    <div className={`w-10 h-10 rounded-full ${colorTheme.bg} flex items-center justify-center`}>
                      <span className="text-white font-bold">{player.colorIdx + 1}</span>
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-white">{player.colorIdx + 1}팀</h4>
                      <p className="text-xs text-zinc-400">
                        {player.members?.join(', ') || player.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`text-2xl font-black ${player.score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {player.score}억
                      </p>
                      <p className="text-xs text-zinc-500">최종 점수</p>
                    </div>

                    <div className="text-zinc-500">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                      <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">보유 자원</p>
                        <p className="text-xl font-bold text-emerald-400">{player.chips}억</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">보유 프로젝트</p>
                        <p className="text-sm font-mono text-zinc-300">
                          {player.cards.length > 0 ? player.cards.join(', ') : '없음'}
                        </p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">연속 시퀀스</p>
                        <p className="text-sm font-mono text-purple-400">
                          {sequences.length > 0
                            ? sequences.map(s => `[${s.join(',')}]`).join(' ')
                            : '없음'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Analysis Section */}
        <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/30 p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Target className="text-indigo-400" size={24} />
            Strategic Positioning AI 분석
          </h3>

          {!analysis ? (
            <div className="text-center py-12">
              <Cpu size={48} className="mx-auto mb-4 text-indigo-400/50" />
              <p className="text-zinc-400 mb-6">
                AI가 게임 전체를 분석하여 각 팀의 전략과 포지셔닝을 평가합니다.
              </p>
              <button
                onClick={handleGenerateAnalysis}
                disabled={loadingAnalysis}
                className={`px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto transition-all
                  ${loadingAnalysis
                    ? 'bg-indigo-900/50 text-indigo-400 cursor-wait'
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
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="bg-black/30 rounded-xl p-6 border border-indigo-500/20">
                <div className="whitespace-pre-wrap text-zinc-200 leading-relaxed">
                  {analysis}
                </div>
              </div>

              <button
                onClick={handleGenerateAnalysis}
                disabled={loadingAnalysis}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 flex items-center gap-2 transition-colors"
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
