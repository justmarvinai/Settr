import { describe, expect, it, vi } from 'vitest';
import { createGyroFollower, GYRO_RANGE_DEG, screenTilt } from './gyro';

function follower() {
  const aim = vi.fn<(x: number, y: number) => void>();
  return { aim, gyro: createGyroFollower(aim) };
}
const lastAim = (aim: ReturnType<typeof follower>['aim']) => aim.mock.lastCall ?? [];

describe('screenTilt', () => {
  it('reads gamma and beta in portrait and turns them with the screen', () => {
    expect(screenTilt(40, 5, 0)).toEqual({ x: 5, y: 40 });
    expect(screenTilt(40, 5, 90)).toEqual({ x: 40, y: -5 });
    expect(screenTilt(40, 5, 180)).toEqual({ x: -5, y: -40 });
    expect(screenTilt(40, 5, 270)).toEqual({ x: -40, y: 5 });
    expect(screenTilt(40, 5, -90)).toEqual(screenTilt(40, 5, 270));
  });
});

describe('createGyroFollower', () => {
  it('starts flat at the first reading, however the phone is held', () => {
    const { aim, gyro } = follower();
    gyro.read(52, -7, 0);
    expect(lastAim(aim)).toEqual([0, 0]);
  });

  it('leans the card against the phone, fully at the range', () => {
    const { aim, gyro } = follower();
    gyro.read(45, 0, 0);
    gyro.read(45, GYRO_RANGE_DEG / 2, 0);
    expect(lastAim(aim)).toEqual([-0.5, 0]);
    gyro.read(45 + GYRO_RANGE_DEG, 0, 0);
    expect(lastAim(aim)).toEqual([0, -1]);
  });

  it('drags its reference along past the range, so tilting back responds at once', () => {
    const { aim, gyro } = follower();
    gyro.read(45, 0, 0);
    gyro.read(45, 30, 0); // 30° right: clamped at the range
    expect(lastAim(aim)).toEqual([-1, 0]);
    gyro.read(45, 30 - GYRO_RANGE_DEG / 2, 0); // back by half the range
    expect(lastAim(aim)).toEqual([-0.5, 0]);
  });

  it('skips sensor noise and broken readings', () => {
    const { aim, gyro } = follower();
    gyro.read(45, 0, 0);
    gyro.read(45.05, 0.05, 0);
    gyro.read(Number.NaN, 0, 0);
    expect(aim).toHaveBeenCalledTimes(1);
  });

  it('starts over after a reset', () => {
    const { aim, gyro } = follower();
    gyro.read(45, 0, 0);
    gyro.read(45, 6, 0);
    gyro.reset();
    gyro.read(45, 6, 0);
    expect(lastAim(aim)).toEqual([0, 0]);
  });
});
