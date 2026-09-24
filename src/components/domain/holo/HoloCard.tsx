import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { DeviceRotateIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { CatalogImage } from '@/domain/catalog';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { CardImage } from '../CardImage';
import type { FoilStyle } from './foil';
import { createGyroFollower } from './gyro';
import { createTilt, type TiltController } from './tilt';
import './holo.css';

/** The app's display setting *Animationen* (UX_SPEC.md §4.13). */
export type HoloMotion = 'full' | 'reduced' | 'off';

export interface HoloCardLabels {
  /** The iPhone's gyroscope button, e.g. "Holo aktivieren". */
  enableGyro: string;
  openFullscreen: string;
  closeFullscreen: string;
}

export interface HoloCardProps {
  image: CatalogImage | undefined;
  alt: string;
  /** CardImage's placeholder text when there is no picture. */
  label?: string;
  foil: FoilStyle;
  motion: HoloMotion;
  labels: HoloCardLabels;
  className?: string;
}

/**
 * iOS asks before it sends orientation events: `DeviceOrientationEvent.requestPermission()`, only
 * from a tap. `ask` shows the button for that tap; `after-touch` (other phones) starts listening
 * after the first touch on the card, never on load.
 */
type Gyro = 'unsupported' | 'ask' | 'after-touch' | 'on' | 'declined';

interface OrientationPermission {
  requestPermission: () => Promise<string>;
}

function asksPermission(value: object): value is OrientationPermission {
  return 'requestPermission' in value && typeof value.requestPermission === 'function';
}

/** iOS's `DeviceOrientationEvent` with its permission request; elsewhere undefined. */
function orientationPermission(): OrientationPermission | undefined {
  if (typeof DeviceOrientationEvent === 'undefined') return undefined;
  const orientation: object = DeviceOrientationEvent;
  return asksPermission(orientation) ? orientation : undefined;
}

function initialGyro(): Gyro {
  if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
  return orientationPermission() ? 'ask' : 'after-touch';
}

/**
 * The holo card viewer of the card page (DSN-01, DESIGN_SYSTEM.md §7 moment 2): the picture leans
 * up to ±12° towards the pointer on a spring, a glare follows the light, and a foil per rarity
 * (holo.css) grows with the lean. Phones lean by gyroscope instead of touch, so the page still
 * scrolls and swipes. The card opens a fullscreen view, where touch may lean it too. Below
 * `motion="full"` (or with the OS asking for less motion) the card is still: `reduced` keeps a
 * faint static sheen, `off` shows the plain picture.
 */
export function HoloCard({ image, alt, label, foil, motion, labels, className }: HoloCardProps) {
  const lessMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const level: HoloMotion = motion === 'full' && lessMotion ? 'reduced' : motion;
  const [open, setOpen] = useState(false);
  const [gyro, setGyro] = useState<Gyro>(initialGyro);
  const openRef = useRef<HTMLButtonElement>(null);
  const gyroOn = level === 'full' && gyro === 'on';

  const enableGyro = () => {
    orientationPermission()
      ?.requestPermission()
      .then(
        (state) => setGyro(state === 'granted' ? 'on' : 'declined'),
        () => undefined, // not granted this time (no tap?): the button stays for another try
      );
  };
  const onTouch = () => setGyro((current) => (current === 'after-touch' ? 'on' : current));

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <HoloSurface
        image={image}
        alt={alt}
        label={label}
        foil={foil}
        level={level}
        touchTilt={false}
        gyro={gyroOn && !open}
        paused={open}
        onTouch={onTouch}
        className="w-full"
      >
        <button
          ref={openRef}
          type="button"
          aria-label={labels.openFullscreen}
          onClick={() => setOpen(true)}
          className="holo-open"
        />
      </HoloSurface>
      {level === 'full' && gyro === 'ask' ? (
        <Button variant="quiet" onClick={enableGyro}>
          <DeviceRotateIcon size={20} weight="bold" aria-hidden />
          {labels.enableGyro}
        </Button>
      ) : null}
      <BaseDialog.Root open={open} onOpenChange={setOpen}>
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="holo-backdrop" />
          <BaseDialog.Popup
            aria-label={alt || labels.openFullscreen}
            finalFocus={openRef}
            data-level={level}
            className="holo-dialog"
          >
            <BaseDialog.Close className="holo-close glass inline-flex h-11 items-center gap-2 rounded-pill pr-[18px] pl-3.5 type-ui font-extrabold text-ink transition-colors duration-(--dur-fast) hover:bg-surface-1">
              <XIcon size={20} weight="bold" aria-hidden />
              {labels.closeFullscreen}
            </BaseDialog.Close>
            <HoloSurface
              image={image}
              alt={alt}
              label={label}
              foil={foil}
              level={level}
              touchTilt
              gyro={gyroOn}
              onTouch={onTouch}
              className="size-full"
            />
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </div>
  );
}

export default HoloCard;

/**
 * One tiltable card: the stage (never transformed, so its box is where the pointer is measured)
 * holds the card, which leans; the card clips the picture and the foil and glare layers above it.
 */
function HoloSurface({
  image,
  alt,
  label,
  foil,
  level,
  touchTilt,
  gyro,
  paused = false,
  onTouch,
  children,
  className,
}: {
  image: CatalogImage | undefined;
  alt: string;
  label: string | undefined;
  foil: FoilStyle;
  level: HoloMotion;
  /** Touch drags lean the card (fullscreen); inline, touch belongs to scrolling and swiping. */
  touchTilt: boolean;
  /** Follow the phone's gyroscope. */
  gyro: boolean;
  /** Covered by the fullscreen view: flat and still. */
  paused?: boolean;
  /** A finger touched the card (the first one may switch the gyroscope on). */
  onTouch: () => void;
  /** Drawn above the picture and leaning with it, outside the clip (the open button). */
  children?: ReactNode;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<TiltController | null>(null);
  /** The stage's box, read when a pointer starts steering (not on every move). */
  const boxRef = useRef<DOMRect | null>(null);
  /** The pointer steering the card, if any; the gyroscope waits while one does. */
  const steeringRef = useRef<number | null>(null);
  const animated = level === 'full';

  useEffect(() => {
    const card = cardRef.current;
    if (!animated || !card) return undefined;
    const tilt = createTilt(card);
    tiltRef.current = tilt;
    // Scrolling or resizing moves the card under a resting pointer: measure again on the next move.
    const forgetBox = () => {
      boxRef.current = null;
    };
    window.addEventListener('scroll', forgetBox, { capture: true, passive: true });
    window.addEventListener('resize', forgetBox, { passive: true });
    return () => {
      window.removeEventListener('scroll', forgetBox, { capture: true });
      window.removeEventListener('resize', forgetBox);
      tilt.destroy();
      tiltRef.current = null;
      steeringRef.current = null;
    };
  }, [animated]);

  useEffect(() => {
    if (!paused) return;
    steeringRef.current = null;
    tiltRef.current?.rest();
  }, [paused]);

  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!gyro || !animated || !stage || !tilt) return undefined;
    let visible = true;
    const follower = createGyroFollower((x, y) => {
      if (visible && steeringRef.current === null) tilt.aim(x, y);
    });
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      // Older iPhones (before iOS 16.4) have no screen.orientation
      follower.read(event.beta, event.gamma, screen.orientation?.angle ?? 0);
    };
    // Scrolled out of view: no frames for a card nobody sees.
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (!visible) tilt.rest();
    });
    const onScreenTurn = () => follower.reset();
    observer.observe(stage);
    window.addEventListener('deviceorientation', onOrientation);
    screen.orientation?.addEventListener('change', onScreenTurn);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      screen.orientation?.removeEventListener('change', onScreenTurn);
      observer.disconnect();
      tilt.rest();
    };
  }, [gyro, animated]);

  const accepts = (event: PointerEvent) =>
    animated && !paused && (event.pointerType !== 'touch' || touchTilt);

  const aimAt = (event: PointerEvent) => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!stage || !tilt) return;
    boxRef.current ??= stage.getBoundingClientRect();
    const box = boxRef.current;
    if (box.width === 0 || box.height === 0) return;
    tilt.aim(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      ((event.clientY - box.top) / box.height) * 2 - 1,
    );
  };

  const steer = (event: PointerEvent) => {
    steeringRef.current = event.pointerId;
    boxRef.current = stageRef.current?.getBoundingClientRect() ?? null;
    aimAt(event);
  };

  const release = (event: PointerEvent) => {
    if (event.pointerId !== steeringRef.current) return;
    steeringRef.current = null;
    boxRef.current = null;
    tiltRef.current?.rest();
  };

  return (
    <div
      ref={stageRef}
      data-level={level}
      data-touch-tilt={touchTilt || undefined}
      className={cn('holo-stage', className)}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch' && accepts(event)) steer(event);
      }}
      onPointerMove={(event) => {
        if (event.pointerId === steeringRef.current) aimAt(event);
        // A mouse already over the card when it became interactive steers from its first move
        else if (steeringRef.current === null && event.pointerType !== 'touch' && accepts(event))
          steer(event);
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return;
        onTouch();
        if (!accepts(event)) return;
        try {
          // Keeps steering when the finger slides off the card
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The pointer is already gone; steering without capture is fine
        }
        steer(event);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === 'touch') release(event);
      }}
      onPointerLeave={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div ref={cardRef} className="holo-card">
        <div className="holo-clip">
          <CardImage image={image} size="large" eager alt={alt} label={label} />
          {level !== 'off' && foil !== 'none' ? (
            <>
              <div aria-hidden className="holo-foil" data-foil={foil} />
              <div aria-hidden className="holo-shine" data-foil={foil} />
            </>
          ) : null}
          {animated ? <div aria-hidden className="holo-glare" /> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
