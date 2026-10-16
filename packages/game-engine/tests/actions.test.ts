import { describe, expect, it } from 'vitest';
import { Card, PlayerInfo } from '@uno-arena/shared';
import {
  executeCallUno,
  executeCatchUno,
  executeChallengeWd4,
  executeChooseColor,
  executeDrawCard,
  executePlayCard,
  recycleDrawPileIfNeeded,
} from '../src/actions/reducer';
import { createInitialGameState } from '../src/state/state';

describe('Actions and Reducers', () => {
  const players2: PlayerInfo[] = [
    { id: 'p1', name: 'Alice', avatar: 'cat', isHost: true, isReady: true, isConnected: true, isAi: false },
    { id: 'p2', name: 'Bob', avatar: 'dog', isHost: false, isReady: true, isConnected: true, isAi: false },
  ];

  const players3: PlayerInfo[] = [
    { id: 'p1', name: 'Alice', avatar: 'cat', isHost: true, isReady: true, isConnected: true, isAi: false },
    { id: 'p2', name: 'Bob', avatar: 'dog', isHost: false, isReady: true, isConnected: true, isAi: false },
    { id: 'p3', name: 'Charlie', avatar: 'fox', isHost: false, isReady: true, isConnected: true, isAi: false },
  ];

  it('handles normal color card play and advances turn', () => {
    const customDeck: Card[] = [
      // 7 cards for p1
      { id: 'c1', type: 'number', color: 'red', value: 1 },
      { id: 'c2', type: 'number', color: 'blue', value: 2 },
      { id: 'c3', type: 'number', color: 'green', value: 3 },
      { id: 'c4', type: 'number', color: 'yellow', value: 4 },
      { id: 'c5', type: 'number', color: 'red', value: 5 },
      { id: 'c6', type: 'number', color: 'blue', value: 6 },
      { id: 'c7', type: 'number', color: 'green', value: 7 },
      // 7 cards for p2
      { id: 'c8', type: 'number', color: 'red', value: 2 },
      { id: 'c9', type: 'number', color: 'blue', value: 3 },
      { id: 'c10', type: 'number', color: 'green', value: 4 },
      { id: 'c11', type: 'number', color: 'yellow', value: 5 },
      { id: 'c12', type: 'number', color: 'red', value: 6 },
      { id: 'c13', type: 'number', color: 'blue', value: 7 },
      { id: 'c14', type: 'number', color: 'green', value: 8 },
      // First discard card
      { id: 'c15', type: 'number', color: 'red', value: 9 },
      // Remaining deck
      { id: 'c16', type: 'number', color: 'red', value: 0 },
    ];

    const state = createInitialGameState(players2, undefined, customDeck);
    expect(state.currentTurnIndex).toBe(0);
    expect(state.topDiscard.color).toBe('red');

    // Alice plays c1 (red 1) on top of red 9
    const res = executePlayCard(state, 'p1', 'c1');
    expect(res.success).toBe(true);
    expect(state.topDiscard.id).toBe('c1');
    expect(state.currentTurnIndex).toBe(1); // turn advanced to Bob
    expect(state.hands['p1']).toHaveLength(6);
  });

  it('rejects play when it is not the players turn', () => {
    const state = createInitialGameState(players2);
    state.currentTurnIndex = 0;
    state.pendingAction = null;
    // Bob tries to play while Alice has turn 0
    const bobCard = state.hands['p2'][0];
    const res = executePlayCard(state, 'p2', bobCard.id);
    expect(res.success).toBe(false);
    expect(res.error).toBe('It is not your turn.');
  });

  it('applies Skip card: skips the next player', () => {
    const state = createInitialGameState(players3);
    state.currentTurnIndex = 0;
    state.topDiscard = { id: 'd0', type: 'number', color: 'blue', value: 1 };
    state.activeColor = 'blue';

    const skipCard: Card = { id: 'skip1', type: 'skip', color: 'blue' };
    state.hands['p1'].push(skipCard);

    const res = executePlayCard(state, 'p1', 'skip1');
    expect(res.success).toBe(true);
    // Skips Bob (index 1), turn goes to Charlie (index 2)
    expect(state.currentTurnIndex).toBe(2);
  });

  it('applies Reverse card: flips direction in 3+ player game', () => {
    const state = createInitialGameState(players3);
    state.currentTurnIndex = 0;
    state.direction = 1;
    state.topDiscard = { id: 'd0', type: 'number', color: 'green', value: 1 };
    state.activeColor = 'green';

    const revCard: Card = { id: 'rev1', type: 'reverse', color: 'green' };
    state.hands['p1'].push(revCard);

    const res = executePlayCard(state, 'p1', 'rev1');
    expect(res.success).toBe(true);
    expect(state.direction).toBe(-1);
    // Direction counter-clockwise from index 0 -> index 2 (Charlie)
    expect(state.currentTurnIndex).toBe(2);
  });

  it('applies Reverse card in 2-player game: acts as Skip', () => {
    const state = createInitialGameState(players2);
    state.currentTurnIndex = 0;
    state.topDiscard = { id: 'd0', type: 'number', color: 'green', value: 1 };
    state.activeColor = 'green';

    const revCard: Card = { id: 'rev1', type: 'reverse', color: 'green' };
    state.hands['p1'].push(revCard);

    const res = executePlayCard(state, 'p1', 'rev1');
    expect(res.success).toBe(true);
    // In 2-player, skipping Bob returns turn to Alice
    expect(state.currentTurnIndex).toBe(0);
  });

  it('applies Draw Two: next player draws 2 cards and is skipped', () => {
    const state = createInitialGameState(players3);
    state.pendingAction = null;
    state.currentTurnIndex = 0;
    state.topDiscard = { id: 'd0', type: 'number', color: 'yellow', value: 1 };
    state.activeColor = 'yellow';

    const bobInitialCards = state.hands['p2'].length;
    const draw2Card: Card = { id: 'd2_1', type: 'draw2', color: 'yellow' };
    state.hands['p1'].push(draw2Card);

    const res = executePlayCard(state, 'p1', 'd2_1');
    expect(res.success).toBe(true);
    expect(state.hands['p2']).toHaveLength(bobInitialCards + 2);
    // Bob was skipped, turn is Charlie (index 2)
    expect(state.currentTurnIndex).toBe(2);
  });

  it('handles Wild card color choice', () => {
    const state = createInitialGameState(players2);
    state.currentTurnIndex = 0;
    state.activeColor = 'red';

    const wildCard: Card = { id: 'w_test', type: 'wild' };
    state.hands['p1'].push(wildCard);

    // Play wild without color argument -> enters color_selection pendingAction
    const res = executePlayCard(state, 'p1', 'w_test');
    expect(res.success).toBe(true);
    expect(state.pendingAction?.type).toBe('color_selection');
    expect(state.pendingAction?.playerId).toBe('p1');

    // Player chooses color 'blue'
    const colorRes = executeChooseColor(state, 'p1', 'blue');
    expect(colorRes.success).toBe(true);
    expect(state.activeColor).toBe('blue');
    expect(state.pendingAction).toBeNull();
    expect(state.currentTurnIndex).toBe(1); // turn now Bob
  });

  it('handles Wild Draw Four challenge: guilty offender', () => {
    const state = createInitialGameState(players2);
    state.currentTurnIndex = 0;
    state.activeColor = 'red';
    state.pendingAction = null;
    state.topDiscard = { id: 'discard_red', type: 'number', color: 'red', value: 5 };

    // Alice holds a red card AND WD4
    const wd4: Card = { id: 'wd4_test', type: 'wild4' };
    state.hands['p1'] = [{ id: 'red_card', type: 'number', color: 'red', value: 3 }, wd4];
    state.hands['p2'] = [{ id: 'blue_card', type: 'number', color: 'blue', value: 3 }];

    // Alice plays WD4 choosing 'green'
    executePlayCard(state, 'p1', 'wd4_test', 'green');
    expect(state.pendingAction?.type).toBe('wd4_challenge');
    expect(state.pendingAction?.playerId).toBe('p2');

    // Bob challenges! Alice held red_card (matching activeColor 'red') -> guilty!
    const challengeRes = executeChallengeWd4(state, 'p2', true);
    expect(challengeRes.success).toBe(true);
    // Alice drew 4 penalty cards
    expect(state.hands['p1']).toHaveLength(1 + 4);
    // Bob takes turn normally without drawing
    expect(state.hands['p2']).toHaveLength(1);
    expect(state.currentTurnIndex).toBe(1);
  });

  it('handles Wild Draw Four challenge: innocent offender', () => {
    const state = createInitialGameState(players2);
    state.currentTurnIndex = 0;
    state.activeColor = 'red';
    state.pendingAction = null;
    state.topDiscard = { id: 'discard_red', type: 'number', color: 'red', value: 5 };

    // Alice holds NO red cards, only blue and WD4 -> innocent!
    const wd4: Card = { id: 'wd4_test', type: 'wild4' };
    state.hands['p1'] = [{ id: 'blue_card', type: 'number', color: 'blue', value: 3 }, wd4];
    state.hands['p2'] = [{ id: 'bob_card', type: 'number', color: 'yellow', value: 3 }];

    executePlayCard(state, 'p1', 'wd4_test', 'green');
    expect(state.pendingAction?.type).toBe('wd4_challenge');

    // Bob challenges -> Alice innocent! Bob draws 6 cards (4 + 2 penalty) and is skipped
    const bobInitialCount = state.hands['p2'].length;
    const challengeRes = executeChallengeWd4(state, 'p2', true);
    expect(challengeRes.success).toBe(true);
    expect(state.hands['p2']).toHaveLength(bobInitialCount + 6);
  });

  it('applies catch UNO penalty when player fails to call UNO', () => {
    const state = createInitialGameState(players2);
    // Set Bob's hand to 1 card without calling UNO
    state.hands['p2'] = [{ id: 'solo_card', type: 'number', color: 'red', value: 5 }];
    state.players[1].cardCount = 1;
    state.players[1].hasCalledUno = false;

    // Alice catches Bob!
    const catchRes = executeCatchUno(state, 'p1', 'p2');
    expect(catchRes.success).toBe(true);
    // Bob received 2 penalty cards
    expect(state.hands['p2']).toHaveLength(3);
    expect(state.players[1].cardCount).toBe(3);
  });

  it('recycles discard pile when draw pile is low', () => {
    const state = createInitialGameState(players2);
    state.drawPile = [{ id: 'last_draw', type: 'number', color: 'red', value: 1 }];
    state.discardPile = [
      { id: 'disc1', type: 'number', color: 'blue', value: 2 },
      { id: 'disc2', type: 'number', color: 'green', value: 3 },
      { id: 'disc_top', type: 'number', color: 'yellow', value: 4 },
    ];
    state.topDiscard = state.discardPile[2];

    // Need 2 cards
    recycleDrawPileIfNeeded(state, 2);
    expect(state.drawPile.length).toBeGreaterThanOrEqual(2);
    // Top discard preserved
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].id).toBe('disc_top');
  });

  it('detects round winner when hand reaches zero', () => {
    const state = createInitialGameState(players2);
    state.currentTurnIndex = 0;
    state.topDiscard = { id: 'top', type: 'number', color: 'red', value: 2 };
    state.activeColor = 'red';

    // Alice has only 1 card left: red 5
    state.hands['p1'] = [{ id: 'win_card', type: 'number', color: 'red', value: 5 }];
    state.hands['p2'] = [{ id: 'loser_card', type: 'number', color: 'blue', value: 9 }];

    const res = executePlayCard(state, 'p1', 'win_card');
    expect(res.success).toBe(true);
    expect(state.status).toBe('ended');
    expect(state.winner?.playerId).toBe('p1');
    expect(state.winner?.score).toBe(9); // Bob's remaining card value
  });
});
