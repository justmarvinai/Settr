import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useLongPress } from './useLongPress';
import { useSwipe, type SwipeDirection } from './useSwipe';

function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  pointerType: 'touch' | 'mouse' = 'touch',
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType,
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  );
}

function PressHarness({ onLongPress, onClick }: { onLongPress: () => void; onClick: () => void }) {
  const longPress = useLongPress(onLongPress);
  return (
    <button type="button" {...longPress} onClick={onClick}>
      Kachel
    </button>
  );
}

describe('useLongPress', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs after a finger rests, and swallows the click that follows', async () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn<() => void>();
    const onClick = vi.fn<() => void>();
    const screen = await render(<PressHarness onLongPress={onLongPress} onClick={onClick} />);
    const tile = screen.getByRole('button').element();
    pointer(tile, 'pointerdown', 10, 10);
    vi.advanceTimersByTime(499);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    pointer(tile, 'pointerup', 10, 10);
    (tile as HTMLElement).click();
    expect(onClick).not.toHaveBeenCalled();
    // The next press clicks as usual
    pointer(tile, 'pointerdown', 10, 10);
    pointer(tile, 'pointerup', 10, 10);
    (tile as HTMLElement).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('leaves a short tap, a scroll and the mouse alone', async () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn<() => void>();
    const screen = await render(<PressHarness onLongPress={onLongPress} onClick={() => {}} />);
    const tile = screen.getByRole('button').element();
    pointer(tile, 'pointerdown', 10, 10);
    vi.advanceTimersByTime(200);
    pointer(tile, 'pointerup', 10, 10);
    pointer(tile, 'pointerdown', 10, 10);
    pointer(tile, 'pointermove', 10, 30);
    pointer(tile, 'pointerdown', 10, 10, 'mouse');
    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("takes Android's long press (contextmenu) instead of the browser menu", async () => {
    const onLongPress = vi.fn<() => void>();
    const screen = await render(<PressHarness onLongPress={onLongPress} onClick={() => {}} />);
    const tile = screen.getByRole('button').element();
    pointer(tile, 'pointerdown', 10, 10);
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    tile.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    // A right click without a finger on the tile keeps the browser's menu
    const rightClick = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    tile.dispatchEvent(rightClick);
    expect(rightClick.defaultPrevented).toBe(false);
  });
});

function SwipeHarness({
  onSwipe,
  can = () => true,
}: {
  onSwipe: (direction: SwipeDirection) => void;
  can?: (direction: SwipeDirection) => boolean;
}) {
  const [page, setPage] = useState(1);
  const swipe = useSwipe(String(page), can, (direction) => {
    onSwipe(direction);
    setPage((n) => n + 1);
  });
  return (
    <div {...swipe} data-testid="stage" style={{ touchAction: 'pan-y', width: 300, height: 300 }}>
      Karte {page}
    </div>
  );
}

function drag(target: Element, from: number, to: number, steps = 6) {
  pointer(target, 'pointerdown', from, 100);
  for (let i = 1; i <= steps; i++)
    pointer(target, 'pointermove', from + ((to - from) * i) / steps, 100);
  pointer(target, 'pointerup', to, 100);
}

describe('useSwipe', () => {
  it('turns to the next card on a swipe left and the previous on a swipe right', async () => {
    const onSwipe = vi.fn<(direction: SwipeDirection) => void>();
    const screen = await render(<SwipeHarness onSwipe={onSwipe} />);
    const stage = screen.getByTestId('stage').element();
    drag(stage, 250, 100);
    drag(stage, 50, 200);
    expect(onSwipe.mock.calls).toEqual([['next'], ['prev']]);
    await expect.element(screen.getByText('Karte 3')).toBeVisible();
    expect((stage as HTMLElement).style.translate).toBe('');
  });

  it('springs back from a short pull, a scroll and the end of the set', async () => {
    const onSwipe = vi.fn<(direction: SwipeDirection) => void>();
    const screen = await render(
      <SwipeHarness onSwipe={onSwipe} can={(direction) => direction === 'prev'} />,
    );
    const stage = screen.getByTestId('stage').element();
    // Slow and short
    pointer(stage, 'pointerdown', 200, 100);
    pointer(stage, 'pointermove', 185, 100);
    await new Promise((resolve) => setTimeout(resolve, 120));
    pointer(stage, 'pointerup', 170, 100);
    // Mostly up and down: the page scrolls
    pointer(stage, 'pointerdown', 150, 200);
    pointer(stage, 'pointermove', 140, 150);
    pointer(stage, 'pointermove', 80, 20);
    pointer(stage, 'pointerup', 80, 20);
    // Nothing after the last card
    drag(stage, 250, 50);
    expect(onSwipe).not.toHaveBeenCalled();
    expect((stage as HTMLElement).style.translate).toBe('');
  });
});
