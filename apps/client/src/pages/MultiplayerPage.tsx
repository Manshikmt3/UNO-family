import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardColor } from '@uno-arena/shared';
import { ActiveColorBadge } from '../components/game/ActiveColorBadge';
import { CatchUnoButton } from '../components/game/CatchUnoButton';
import { ChallengeModal } from '../components/game/ChallengeModal';
import { ChatPanel } from '../components/game/ChatPanel';
import { ColorPickerModal } from '../components/game/ColorPickerModal';
import { DiscardPile } from '../components/game/DiscardPile';
import { DrawnCardChoiceModal } from '../components/game/DrawnCardChoiceModal';
import { DrawPile } from '../components/game/DrawPile';
import { GameOverModal } from '../components/game/GameOverModal';
import { Hand } from '../components/game/Hand';
import { CircularPlayerLayout } from '../components/game/CircularPlayerLayout';
import { UnoButton } from '../components/game/UnoButton';
import { RoomLobby } from '../components/lobby/RoomLobby';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useGameSettingsStore } from '../stores/useGameSettingsStore';
import { useMultiplayerStore } from '../stores/useMultiplayerStore';
import { RotateCw, ArrowLeft, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export const MultiplayerPage: React.FC = () => {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();

  const {
    isConnected,
    isConnecting,
    connectionError,
    retryConnection,
    room,
    playerId,
    gameState,
    myHand,
    errorToast,
    chatMessages,
    unreadChatCount,
    initSocket,
    joinRoom,
    createRoom,
    setReady,
    startGame,
    playCard,
    drawCard,
    playDrawnCard,
    chooseColor,
    callUno,
    catchUno,
    challengeWd4,
    requestRematch,
    leaveRoom,
    addAiPlayer,
    removeAiPlayer,
    clearError,
    sendChat,
    clearUnreadChat,
  } = useMultiplayerStore();

  const { playerName, avatar } = useGameSettingsStore();
  const sfx = useSoundEffects();

  const [pendingCardForColor, setPendingCardForColor] = useState<Card | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);

  // Initialize socket on mount
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  // If URL has a room code and we are not in a room yet, auto-join
  useEffect(() => {
    if (urlCode && isConnected && !room) {
      joinRoom(urlCode.toUpperCase(), playerName, avatar);
    }
  }, [urlCode, isConnected, room, joinRoom, playerName, avatar]);

  // SFX on game over
  useEffect(() => {
    if (gameState?.winner) {
      sfx.playWinSound();
    }
  }, [gameState?.winner]);

  // Reset rematch requested flag on new round
  useEffect(() => {
    if (gameState && gameState.status === 'in_progress') {
      setRematchRequested(false);
    }
  }, [gameState?.status]);

  // If no room is active, show join prompt
  if (!room || !playerId) {
    return (
      <div className="min-h-[calc(100vh-60px)] felt-radial flex flex-col items-center justify-center p-4 text-center">
        <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
            {isConnected ? (
              <Wifi className="w-6 h-6 text-emerald-400" />
            ) : isConnecting ? (
              <RotateCw className="w-6 h-6 text-amber-400 animate-spin" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            Multiplayer Room
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {isConnected
              ? 'Join or create a private room to start playing online.'
              : isConnecting
              ? 'Connecting to UNO Arena server...'
              : connectionError || 'Could not reach the UNO multiplayer server.'}
          </p>

          {!isConnected && !isConnecting && (
            <p className="text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-5 text-left">
              💡 <strong>Connecting across cities?</strong> If your backend is hosted on a free cloud service (like Render), it sleeps after inactivity and takes ~30–45 seconds to wake up.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {!isConnected && (
              <button
                type="button"
                onClick={retryConnection}
                disabled={isConnecting}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                {isConnecting ? 'Connecting...' : 'Retry Connection'}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Go to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Lobby Phase (Game not started yet)
  if (!gameState || gameState.status === 'waiting') {
    return (
      <div className="min-h-[calc(100vh-60px)] felt-radial flex items-center justify-center p-4">
        <RoomLobby
          room={room}
          currentUserId={playerId}
          onSetReady={setReady}
          onStartGame={startGame}
          onLeaveRoom={() => {
            leaveRoom();
            navigate('/');
          }}
          onAddAi={addAiPlayer}
          onRemoveAi={removeAiPlayer}
        />
      </div>
    );
  }

  // 2. Active Game Phase
  const {
    players,
    currentTurnIndex,
    direction,
    topDiscard,
    activeColor,
    drawPileCount,
    discardPileCount,
    pendingAction,
  } = gameState;

  const currentTurnPlayer = players[currentTurnIndex];
  const isMyTurn = currentTurnPlayer?.id === playerId;
  const myPlayerObj = players.find((p) => p.id === playerId);

  const canCallUno =
    (myHand.length === 2 || myHand.length === 1) && !myPlayerObj?.hasCalledUno;

  const opponentMissingUno = players.find(
    (p) => p.id !== playerId && p.cardCount === 1 && !p.hasCalledUno
  );

  const handlePlayCard = (card: Card) => {
    if (card.type === 'wild' || card.type === 'wild4') {
      setPendingCardForColor(card);
      sfx.playWildSound();
    } else {
      if (card.type === 'skip' || card.type === 'reverse' || card.type === 'draw2') {
        sfx.playSpecialCardSound();
      } else {
        sfx.playCardSound();
      }
      playCard(card.id);
    }
  };

  const handleSelectColor = (color: CardColor) => {
    if (pendingCardForColor) {
      playCard(pendingCardForColor.id, color);
      setPendingCardForColor(null);
    } else if (pendingAction?.type === 'color_selection') {
      chooseColor(color);
    }
  };

  const handleDraw = () => {
    sfx.playDrawSound();
    drawCard();
  };

  const handleCallUno = () => {
    sfx.playUnoSound();
    callUno();
  };

  const handleCatchUno = (targetId: string) => {
    sfx.playSpecialCardSound();
    catchUno(targetId);
  };

  const showChallengeModal =
    pendingAction?.type === 'wd4_challenge' && pendingAction.playerId === playerId;

  const showDrawnCardModal =
    pendingAction?.type === 'drawn_card_choice' && pendingAction.playerId === playerId;

  const showColorPicker =
    !!pendingCardForColor ||
    (pendingAction?.type === 'color_selection' && pendingAction.playerId === playerId);

  return (
    <div className="relative min-h-[calc(100vh-60px)] felt-radial flex flex-col justify-between p-2 sm:p-4 select-none overflow-hidden">
      {/* Top Bar */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-2 pt-1 pb-2">
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            navigate('/');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-bold transition-all shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave
        </button>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-amber-400 font-bold bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full shadow">
            Room: {room.code}
          </div>

          <div
            className="flex items-center gap-1 text-xs text-slate-300 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full shadow"
            title={`Direction: ${direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-amber-400 transform transition-transform ${
                direction === -1 ? '-scale-x-100' : ''
              }`}
            />
          </div>

          <ActiveColorBadge color={activeColor} />
        </div>
      </div>

      {/* Error Toast */}
      {errorToast && (
        <div className="max-w-md mx-auto mb-2 px-4 py-2 bg-red-950/90 border border-red-500/60 rounded-xl text-red-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorToast}</span>
          </div>
          <button type="button" onClick={clearError} className="ml-3 text-red-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Circular player table */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex items-center justify-center py-2">
        <CircularPlayerLayout
          players={players}
          humanPlayerId={playerId}
          currentTurnPlayerId={currentTurnPlayer?.id}
        >
          {/* Center Table — Draw/Discard Piles + UNO actions */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 sm:gap-8 p-4 sm:p-6 rounded-3xl bg-slate-950/70 border border-slate-800/80 shadow-2xl">
              <DrawPile
                count={drawPileCount}
                isMyTurn={isMyTurn}
                onDraw={handleDraw}
              />
              <DiscardPile topCard={topDiscard} count={discardPileCount} />
            </div>
            <div className="flex items-center gap-2">
              <UnoButton
                canCallUno={canCallUno}
                onCallUno={handleCallUno}
                hasCalledUno={myPlayerObj?.hasCalledUno}
              />
              <CatchUnoButton
                targetPlayerId={opponentMissingUno?.id ?? null}
                onCatch={handleCatchUno}
              />
            </div>
          </div>
        </CircularPlayerLayout>
      </div>

      {/* Human Player Hand */}
      <div className="w-full">
        <Hand
          cards={myHand}
          topDiscard={topDiscard}
          activeColor={activeColor}
          isMyTurn={isMyTurn}
          onPlayCard={handlePlayCard}
        />
      </div>

      {/* Modals */}
      <ColorPickerModal isOpen={showColorPicker} onSelectColor={handleSelectColor} />

      <ChallengeModal
        isOpen={showChallengeModal}
        onDecision={(challenge) => challengeWd4(challenge)}
        offenderName={players.find((p) => p.id === pendingAction?.sourcePlayerId)?.name}
      />

      <DrawnCardChoiceModal
        isOpen={showDrawnCardModal}
        drawnCard={pendingAction?.drawnCard ?? null}
        onPlay={() => playDrawnCard(true)}
        onPass={() => playDrawnCard(false)}
      />

      <GameOverModal
        isOpen={gameState.status === 'ended'}
        gameState={gameState}
        isRematchRequested={rematchRequested}
        onRematch={() => {
          setRematchRequested(true);
          requestRematch();
        }}
        onReturnHome={() => {
          leaveRoom();
          navigate('/');
        }}
      />

      {/* Live Chat */}
      <ChatPanel
        messages={chatMessages}
        myPlayerId={playerId ?? ''}
        unreadCount={unreadChatCount}
        onSend={sendChat}
        onOpen={clearUnreadChat}
      />
    </div>
  );
};
