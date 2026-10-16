import {
  Card,
  CardColor,
  CARD_COLORS,
  PublicGameState,
} from '@uno-arena/shared';
import { getPlayableCards } from '../rules/rules';
import { getNextPlayerIndex } from '../state/state';

export interface AIMoveDecision {
  type: 'play' | 'draw' | 'color' | 'challenge' | 'drawn_choice' | 'catch_uno';
  cardId?: string;
  chosenColor?: CardColor;
  challenge?: boolean;
  play?: boolean;
  targetPlayerId?: string;
  callUno?: boolean;
}

/**
 * Counts how many cards of each color are present in a given hand.
 */
function getColorFrequencies(hand: Card[]): Record<CardColor, number> {
  const counts: Record<CardColor, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };
  for (const card of hand) {
    if (card.color) {
      counts[card.color]++;
    }
  }
  return counts;
}

/**
 * Selects the color that occurs most frequently in the hand.
 */
function getDominantColor(hand: Card[]): CardColor {
  const counts = getColorFrequencies(hand);
  let bestColor: CardColor = 'red';
  let maxCount = -1;

  for (const color of CARD_COLORS) {
    if (counts[color] > maxCount) {
      maxCount = counts[color];
      bestColor = color;
    }
  }
  return bestColor;
}

/**
 * Evaluates the next AI move based on public state, AI's private hand, and difficulty level.
 */
export function chooseAIMove(
  gameState: PublicGameState,
  aiPlayerId: string,
  aiHand: Card[],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): AIMoveDecision {
  // Check if someone forgot to call UNO and AI can catch them
  const catchTarget = gameState.players.find(
    (p) => p.id !== aiPlayerId && p.cardCount === 1 && !p.hasCalledUno
  );
  if (catchTarget) {
    // Hard AI always catches (1.0), medium 70% chance, easy 30% chance
    const catchChance = difficulty === 'hard' ? 1.0 : difficulty === 'medium' ? 0.7 : 0.3;
    if (Math.random() < catchChance) {
      return {
        type: 'catch_uno',
        targetPlayerId: catchTarget.id,
      };
    }
  }

  // Handle pending action: color selection
  if (
    gameState.pendingAction?.type === 'color_selection' &&
    gameState.pendingAction.playerId === aiPlayerId
  ) {
    if (difficulty === 'easy') {
      const randomColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
      return { type: 'color', chosenColor: randomColor };
    }
    return { type: 'color', chosenColor: getDominantColor(aiHand) };
  }

  // Handle pending action: WD4 challenge
  if (
    gameState.pendingAction?.type === 'wd4_challenge' &&
    gameState.pendingAction.playerId === aiPlayerId
  ) {
    if (difficulty === 'easy') {
      // 50/50 challenge or accept
      return { type: 'challenge', challenge: Math.random() < 0.5 };
    }

    if (difficulty === 'medium') {
      // 35% chance to challenge
      return { type: 'challenge', challenge: Math.random() < 0.35 };
    }

    // Hard: calculate probability without cheating!
    // Total cards of active color in a standard deck is 25.
    // Count how many cards of activeColor are visible to AI (in AI hand + top discard)
    const visibleCount = aiHand.filter((c) => c.color === gameState.activeColor).length;
    // If AI holds few or none of that color, offender likely had that color!
    const shouldChallenge = visibleCount <= 1;
    return { type: 'challenge', challenge: shouldChallenge };
  }

  // Handle pending action: drawn card choice (under allowDrawAndPlay)
  if (
    gameState.pendingAction?.type === 'drawn_card_choice' &&
    gameState.pendingAction.playerId === aiPlayerId
  ) {
    const drawnCard = gameState.pendingAction.drawnCard;
    if (!drawnCard) {
      return { type: 'drawn_choice', play: false };
    }

    if (difficulty === 'easy') {
      const play = Math.random() > 0.3;
      const chosenColor =
        drawnCard.type === 'wild' || drawnCard.type === 'wild4'
          ? CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]
          : undefined;
      return { type: 'drawn_choice', play, chosenColor };
    }

    // Medium & Hard: if playable, almost always play it to reduce hand count
    const chosenColor =
      drawnCard.type === 'wild' || drawnCard.type === 'wild4'
        ? getDominantColor(aiHand)
        : undefined;
    return { type: 'drawn_choice', play: true, chosenColor };
  }

  // Normal turn: find all legally playable cards
  const playableCards = getPlayableCards(aiHand, gameState.topDiscard, gameState.activeColor);

  // If no playable card, must draw
  if (playableCards.length === 0) {
    return { type: 'draw' };
  }

  // Determine if AI will reach 1 card after playing this move
  const willHaveOneCard = aiHand.length === 2;
  // Should call UNO?
  const callUnoChance = difficulty === 'hard' ? 0.99 : difficulty === 'medium' ? 0.85 : 0.6;
  const shouldCallUno = willHaveOneCard && Math.random() < callUnoChance;

  // Easy AI: Pick completely at random among legal cards
  if (difficulty === 'easy') {
    const chosen = playableCards[Math.floor(Math.random() * playableCards.length)];
    const chosenColor =
      chosen.type === 'wild' || chosen.type === 'wild4'
        ? CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]
        : undefined;
    return {
      type: 'play',
      cardId: chosen.id,
      chosenColor,
      callUno: shouldCallUno,
    };
  }

  // Medium AI:
  // 1. Prefer matching color cards matching dominant color
  // 2. Save Wilds for emergencies unless nothing else or low cards
  const dominantColor = getDominantColor(aiHand);
  const nextPlayerIndex = getNextPlayerIndex(
    gameState.currentTurnIndex,
    gameState.direction,
    gameState.players.length
  );
  const nextPlayer = gameState.players[nextPlayerIndex];
  const nextPlayerThreat = (nextPlayer?.cardCount ?? 7) <= 2;

  if (difficulty === 'medium') {
    // If next player is about to win, play attack cards (draw2, skip, reverse, wild4)
    if (nextPlayerThreat) {
      const attackCard = playableCards.find(
        (c) => c.type === 'draw2' || c.type === 'wild4' || c.type === 'skip' || c.type === 'reverse'
      );
      if (attackCard) {
        const chosenColor =
          attackCard.type === 'wild4' || attackCard.type === 'wild'
            ? dominantColor
            : undefined;
        return {
          type: 'play',
          cardId: attackCard.id,
          chosenColor,
          callUno: shouldCallUno,
        };
      }
    }

    // Prefer non-wild matching dominant color
    const bestMatching = playableCards.find(
      (c) => c.color === dominantColor && c.type !== 'wild' && c.type !== 'wild4'
    );
    if (bestMatching) {
      return {
        type: 'play',
        cardId: bestMatching.id,
        callUno: shouldCallUno,
      };
    }

    // Any non-wild card
    const nonWild = playableCards.find((c) => c.type !== 'wild' && c.type !== 'wild4');
    if (nonWild) {
      return {
        type: 'play',
        cardId: nonWild.id,
        callUno: shouldCallUno,
      };
    }

    // Otherwise play wild
    const wildCard = playableCards[0];
    return {
      type: 'play',
      cardId: wildCard.id,
      chosenColor: dominantColor,
      callUno: shouldCallUno,
    };
  }

  // Hard AI:
  // Highly tactical heuristic scoring:
  // - Punish opponent with low cards (+100 for draw2/wild4/skip on low card opponent)
  // - Preserve Wild/WD4 if other moves exist, unless winning immediately (+200 if wild empties hand)
  // - High value cards discarded first to minimize opponent points in case of loss
  let bestCard = playableCards[0];
  let highestScore = -Infinity;

  for (const card of playableCards) {
    let score = 0;

    // Empties hand immediately = ultimate priority!
    if (aiHand.length === 1) {
      score += 1000;
    }

    // Attack cards when next player is dangerous
    if (nextPlayerThreat) {
      if (card.type === 'draw2') score += 120;
      if (card.type === 'wild4') score += 110;
      if (card.type === 'skip') score += 90;
      if (card.type === 'reverse') score += 80;
    }

    // Color synergy: playing a card that switches or maintains dominant color
    if (card.color === dominantColor) {
      score += 25;
    }

    // Getting rid of high points (numbers 7, 8, 9)
    if (card.type === 'number' && card.value && card.value >= 7) {
      score += card.value * 2;
    }

    // Conserve Wilds if hand has other playable cards
    if (card.type === 'wild' || card.type === 'wild4') {
      if (playableCards.length > 1 && aiHand.length > 2) {
        score -= 50; // hold wild for later
      } else {
        score += 30; // play wild if necessary
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCard = card;
    }
  }

  const chosenColor =
    bestCard.type === 'wild' || bestCard.type === 'wild4' ? dominantColor : undefined;

  return {
    type: 'play',
    cardId: bestCard.id,
    chosenColor,
    callUno: shouldCallUno,
  };
}
