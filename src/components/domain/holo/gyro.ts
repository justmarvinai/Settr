/**
 * Phone tilt → card tilt for the holo viewer (DESIGN_SYSTEM.md §7). Pure: the caller feeds it
 * `deviceorientation` readings and gets the card's aim back, −1…1 per axis like a pointer position.
 */

/** Degrees of phone tilt, from the first reading, that lean the card fully (its ±12°). */
export const GYRO_RANGE_DEG = 12;

/**
 * −1: the card leans against the phone's tilt, so it seems to hold still in space while the light
 * glides over it. Flip to 1 if it feels backwards on a device.
 */
const DIRECTION = -1;

/** Readings that move the aim less than this are sensor noise; skipping them lets the spring rest. */
const NOISE = 0.01;

/**
 * The tilt around the screen's current axes: `x` leans the right edge away (gamma in portrait),
 * `y` the top edge towards you (beta in portrait). `angle` is `screen.orientation.angle`.
 */
export function screenTilt(beta: number, gamma: number, angle: number): { x: number; y: number } {
  switch ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) {
    case 90:
      return { x: beta, y: -gamma };
    case 180:
      return { x: -gamma, y: -beta };
    case 270:
      return { x: -beta, y: gamma };
    default:
      return { x: gamma, y: beta };
  }
}

export interface GyroFollower {
  /** A reading from a `deviceorientation` event. */
  read(beta: number, gamma: number, angle: number): void;
  /** Starts over from the next reading, e.g. after the screen rotated. */
  reset(): void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Follows the phone relative to its first reading. Past the range, the reference point moves with
 * the phone, so tilting back responds at once instead of after a dead zone.
 */
export function createGyroFollower(aim: (x: number, y: number) => void): GyroFollower {
  let origin: { x: number; y: number } | undefined;
  let last: { x: number; y: number } | undefined;
  return {
    read(beta, gamma, angle) {
      const tilt = screenTilt(beta, gamma, angle);
      if (!Number.isFinite(tilt.x) || !Number.isFinite(tilt.y)) return;
      origin ??= { ...tilt };
      origin.x = clamp(origin.x, tilt.x - GYRO_RANGE_DEG, tilt.x + GYRO_RANGE_DEG);
      origin.y = clamp(origin.y, tilt.y - GYRO_RANGE_DEG, tilt.y + GYRO_RANGE_DEG);
      // `|| 0` turns −0 into 0
      const x = (DIRECTION * (tilt.x - origin.x)) / GYRO_RANGE_DEG || 0;
      const y = (DIRECTION * (tilt.y - origin.y)) / GYRO_RANGE_DEG || 0;
      if (last && Math.abs(x - last.x) < NOISE && Math.abs(y - last.y) < NOISE) return;
      last = { x, y };
      aim(x, y);
    },
    reset() {
      origin = undefined;
      last = undefined;
    },
  };
}
