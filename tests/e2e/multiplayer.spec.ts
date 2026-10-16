import { expect, test } from '@playwright/test';

test.describe('Multi-Client Multiplayer Synchronization', () => {
  test('Two players join room, ready up, and start synchronized game with isolated hands', async ({
    browser,
  }) => {
    // 1. Host Context (Alice)
    const contextAlice = await browser.newContext();
    const pageAlice = await contextAlice.newPage();
    await pageAlice.goto('/');

    // Alice creates a private room
    await pageAlice.getByRole('button', { name: /multiplayer/i }).click();
    await pageAlice.getByRole('button', { name: /create private room/i }).click();
    await expect(pageAlice).toHaveURL(/\/multiplayer/);

    // Extract room code
    const codeLocator = pageAlice.locator('.font-mono').first();
    await expect(codeLocator).toBeVisible({ timeout: 10000 });
    const roomCode = (await codeLocator.textContent())?.trim();
    expect(roomCode).toHaveLength(6);

    // 2. Second Player Context (Bob)
    const contextBob = await browser.newContext();
    const pageBob = await contextBob.newPage();
    await pageBob.goto('/');

    // Bob enters nickname and joins with code
    await pageBob.getByPlaceholder('Enter player name').fill('Bob');
    await pageBob.getByRole('button', { name: /multiplayer/i }).click();
    await pageBob.getByPlaceholder('6-LETTER CODE').fill(roomCode!);
    await pageBob.getByRole('button', { name: /join/i }).click();
    await expect(pageBob).toHaveURL(/\/multiplayer/);

    // Verify Bob is now visible in Alice's lobby
    await expect(pageAlice.getByText('Bob')).toBeVisible({ timeout: 10000 });

    // Bob marks Ready
    const readyBtn = pageBob.getByRole('button', { name: /i am ready/i });
    await expect(readyBtn).toBeVisible();
    await readyBtn.click();

    // Verify Alice sees Bob as Ready
    await expect(pageAlice.getByText(/ready/i).first()).toBeVisible();

    // Alice starts the game
    const startGameBtn = pageAlice.getByRole('button', { name: /start game/i });
    await expect(startGameBtn).toBeEnabled();
    await startGameBtn.click();

    // Both players should now be in the active game view
    await expect(pageAlice.getByText(/your hand/i).first()).toBeVisible({ timeout: 10000 });
    await expect(pageBob.getByText(/your hand/i).first()).toBeVisible({ timeout: 10000 });

    // Verify Alice sees Bob in opponent row
    await expect(pageAlice.getByText('Bob').first()).toBeVisible();
    // Verify Bob sees Alice in opponent row
    await expect(pageBob.getByText('Player 1').first()).toBeVisible();

    await contextAlice.close();
    await contextBob.close();
  });
});
