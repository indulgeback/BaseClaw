import { completeSetup, expect, test } from './fixtures/electron';

test.describe('SpriteClaw sprite stage', () => {
  test('shows the sprite stage and reacts to composer activity', async ({ page }) => {
    await completeSetup(page);

    await expect(page.getByTestId('sprite-stage')).toBeVisible();
    await expect(page.getByTestId('sprite-stage').getByText('Sprite awake')).toBeVisible();
  });
});
