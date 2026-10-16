import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Users, Sparkles, Trophy, ArrowRight, ShieldCheck, Flame, Plus } from 'lucide-react';
import { useAIGameStore } from '../stores/useAIGameStore';
import { useGameSettingsStore } from '../stores/useGameSettingsStore';
import { useMultiplayerStore } from '../stores/useMultiplayerStore';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { startNewGame } = useAIGameStore();
  const { createRoom, joinRoom, isConnected, initSocket } = useMultiplayerStore();
  const {
    playerName,
    setPlayerName,
    avatar,
    preferredDifficulty,
    setPreferredDifficulty,
    aiOpponentCount,
    setAiOpponentCount,
  } = useGameSettingsStore();

  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'multiplayer'>('ai');

  React.useEffect(() => {
    initSocket();
  }, [initSocket]);

  const handleStartAIGame = () => {
    startNewGame(playerName, avatar, aiOpponentCount, preferredDifficulty);
    navigate('/play/ai');
  };

  const handleCreateRoom = () => {
    initSocket();
    createRoom(playerName, avatar);
    navigate('/multiplayer');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    initSocket();
    joinRoom(joinCode.trim().toUpperCase(), playerName, avatar);
    navigate('/multiplayer');
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] felt-radial flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
      {/* Decorative ambient blurred lights */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Hero Header */}
      <div className="relative z-10 text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-md mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          The Ultimate Online Card Arena
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none mb-3">
          UNO <span className="bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent">ARENA</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto">
          Play in real time with friends in private rooms or test your strategy against tactical AI opponents.
        </p>
      </div>

      {/* Interactive Mode Card */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-7 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            Play vs Computer
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('multiplayer')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'multiplayer'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Multiplayer
          </button>
        </div>

        {/* Player Name Input */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Your Nickname
          </label>
          <input
            type="text"
            value={playerName}
            maxLength={20}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Tab 1: Play vs AI Options */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Number of AI Opponents */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                AI Opponents ({aiOpponentCount} {aiOpponentCount === 1 ? 'Bot' : 'Bots'})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setAiOpponentCount(count)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      aiOpponentCount === count
                        ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {count} {count === 1 ? '(1v1)' : 'Bots'}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setPreferredDifficulty(diff)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
                      preferredDifficulty === diff
                        ? 'bg-purple-600/30 border-purple-400 text-purple-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartAIGame}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transform hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Game vs AI
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 2: Multiplayer Options */}
        {activeTab === 'multiplayer' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Create Room Button */}
            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-glow-yellow transform hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create Private Room
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Or Join with Code
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Join Room Form */}
            <form onSubmit={handleJoinRoom} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="6-LETTER CODE"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={joinCode.trim().length < 4}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors whitespace-nowrap"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Feature Badges Footer */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-8 text-center text-xs text-slate-400">
        <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">108 Standard Cards</span>
          <span>Authentic deck rules</span>
        </div>
        <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col items-center gap-1">
          <Flame className="w-4 h-4 text-red-400" />
          <span className="font-bold text-slate-200">UNO & Catch Penalties</span>
          <span>One-card alerts</span>
        </div>
        <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col items-center gap-1">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200">WD4 Challenges</span>
          <span>Bluff detection</span>
        </div>
        <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-slate-200">Official Scoring</span>
          <span>Point totals per round</span>
        </div>
      </div>
    </div>
  );
};
