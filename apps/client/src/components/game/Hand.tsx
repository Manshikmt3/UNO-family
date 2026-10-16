import React, { useState } from 'react';
import { Card, CardColor } from '@uno-arena/shared';
import { isValidMove } from '@uno-arena/game-engine';
import { UnoCard } from './UnoCard';

interface HandProps {
  cards: Card[];
  topDiscard: Card | null;
  activeColor: CardColor;
  isMyTurn: boolean;
  onPlayCard: (card: Card) => void;
  disabled?: boolean;
}

/**
 * Computes per-card fan geometry so the hand looks like it's held in a real fist.
 *
 * Cards are placed along a virtual circle whose centre sits *below* the visible
 * area.  Each card is translated radially outward and rotated tangentially.
 *
 * @param count  number of cards
 * @param index  card index (0-based)
 * @param hovered  index of the card currently hovered (-1 if none)
 */
function getFanStyle(
  count: number,
  index: number,
  hovered: number,
): React.CSSProperties {
  if (count === 0) return {};

  // Total arc the hand spans (degrees). More cards → wider arc, capped at 80°.
  const totalArc = Math.min(80, count * 9);
  // Step between adjacent cards
  const step = count > 1 ? totalArc / (count - 1) : 0;
  // Angle of this card relative to the centre of the fan (0 = straight up)
  const angle = -totalArc / 2 + step * index;

  // How far cards travel along the radius (px). Bigger = more spread.
  const radius = 380;
  const angleRad = (angle * Math.PI) / 180;

  // x/y offsets: card moves along arc. The arc centre is *below* so we
  // use sin for x and (1 - cos) for y (upward).
  const tx = Math.sin(angleRad) * radius;
  const ty = -(1 - Math.cos(angleRad)) * radius * 0.35; // shallow arc

  // Hover spread: the hovered card lifts; neighbours pull away slightly
  let liftY = 0;
  let extraScale = 1;
  if (hovered !== -1) {
    const dist = Math.abs(index - hovered);
    if (dist === 0) {
      liftY = -28;
      extraScale = 1.08;
    } else {
      // Neighbours spread outward from the hovered card
      const dir = index < hovered ? -1 : 1;
      liftY = dist === 1 ? -6 : 0;
      const nudge = dir * Math.max(0, 12 - dist * 4);
      return {
        transform: `translateX(calc(-50% + ${tx + nudge}px)) translateY(${ty + liftY}px) rotate(${angle}deg) scale(${extraScale})`,
        zIndex: 10 - dist,
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transformOrigin: 'bottom center',
      };
    }
  }

  return {
    transform: `translateX(calc(-50% + ${tx}px)) translateY(${ty + liftY}px) rotate(${angle}deg) scale(${extraScale})`,
    zIndex: hovered === index ? 50 : index,
    transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transformOrigin: 'bottom center',
  };
}

export const Hand: React.FC<HandProps> = ({
  cards,
  topDiscard,
  activeColor,
  isMyTurn,
  onPlayCard,
  disabled = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(-1);

  // Height of the arc container — enough room for the tallest lifted card
  const containerHeight = 200;

  return (
    <div className="relative w-full select-none" style={{ userSelect: 'none' }}>
      {/* Label bar */}
      <div className="flex items-center justify-between px-4 mb-1 text-xs sm:text-sm text-slate-400">
        <span className="font-semibold text-slate-300">
          Your Hand{' '}
          <span className="text-slate-500">
            ({cards.length} {cards.length === 1 ? 'card' : 'cards'})
          </span>
        </span>

        {isMyTurn && (
          <span className="flex items-center gap-1.5 text-amber-400 font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Your Turn — pick a card or draw
          </span>
        )}
      </div>

      {/* Arc stage */}
      <div
        className="relative w-full overflow-visible"
        style={{ height: containerHeight }}
      >
        {cards.map((card, idx) => {
          const isPlayable =
            isMyTurn &&
            !disabled &&
            (topDiscard ? isValidMove(card, topDiscard, activeColor).valid : true);

          const style = getFanStyle(cards.length, idx, hoveredIdx);

          return (
            <div
              key={card.id}
              style={style}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(-1)}
            >
              <UnoCard
                card={card}
                isPlayable={isPlayable}
                onClick={() => onPlayCard(card)}
                disabled={disabled}
                size="md"
              />
            </div>
          );
        })}

        {cards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm italic">
            No cards — waiting for deal…
          </div>
        )}
      </div>

      {/* Subtle ground shadow for depth */}
      <div
        className="pointer-events-none"
        style={{
          height: 18,
          background:
            'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(0,0,0,0.45) 0%, transparent 100%)',
          marginTop: -4,
        }}
      />
    </div>
  );
};
