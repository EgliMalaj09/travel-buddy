import { useEffect, useMemo, useState } from 'react';
import { PanResponder, View, type PanResponderInstance } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { clampView, countryPoint, globePaths, type GlobeView } from '@/lib/atlas';
import { useTheme } from '@/theme/ThemeProvider';

/** The turn-in when the Atlas opens (design guide "slow" family, a bit longer for a globe). */
const SPIN_MS = 1200;
/** Speed of the slow turn on its own. */
const IDLE_DEG_PER_MS = 0.006;
/** Where the globe looks when nothing is visited yet: Europe, a little from above. */
const DEFAULT_VIEW: GlobeView = { lng: 12, lat: 38 };

/**
 * The dotted globe (design guide "Departures", Atlas): land as dots, visited countries in the
 * accent colour, the country you are in today in "sun". Drag to turn it (left/right and
 * up/down). On open it turns to `focus`, then (with `autoSpin`) keeps turning slowly. No 3D library: a flat SVG with an orthographic
 * projection (src/lib/atlas.ts). With reduced motion it does not spin in or drift after a drag.
 */
export function Globe({
  visited,
  here = null,
  focus = null,
  size,
  reduceMotion,
  autoSpin = false,
  accessibilityLabel,
}: {
  /** ISO codes of visited countries. */
  visited: readonly string[];
  /** ISO code of the country you are in today. */
  here?: string | null;
  /** ISO code to turn to when it opens or changes. */
  focus?: string | null;
  /** Width and height in points. */
  size: number;
  reduceMotion: boolean;
  /** Turn slowly on its own (only while the screen is shown; never with reduced motion). */
  autoSpin?: boolean;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const visitedSet = useMemo(() => new Set(visited), [visited]);
  const target = useMemo<GlobeView>(() => {
    const p = focus ? countryPoint(focus) : null;
    // Look from a little north of the country, like the template (Europe sits upright).
    return p ? clampView({ lng: p.lng, lat: Math.min(p.lat, 50) }) : DEFAULT_VIEW;
  }, [focus]);

  const [view, setView] = useState<GlobeView>(() =>
    reduceMotion ? target : { ...target, lng: target.lng + 70 },
  );
  // Gestures and animation live outside React's render (a plain object made once).
  const [driver] = useState(() => createDriver(view, setView));
  useEffect(() => {
    // One globe width turns it about half way round.
    driver.configure(180 / size, reduceMotion, autoSpin);
    driver.turnTo(target);
  }, [driver, target, size, reduceMotion, autoSpin]);
  useEffect(() => () => driver.stop(), [driver]);

  const paths = useMemo(
    () => globePaths(view, size, visitedSet, here),
    [view, size, visitedSet, here],
  );
  const k = size / 320; // dot sizes follow the globe size

  return (
    <View
      {...driver.pan.panHandlers}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, alignSelf: 'center' }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.46}
          fill={colors.surface}
          stroke={colors.border}
          strokeWidth={1.5}
        />
        {paths.land.map((d, i) =>
          d ? (
            <Path
              key={i}
              d={d}
              stroke={colors.inkSoft}
              strokeOpacity={0.55}
              strokeWidth={(2.2 + i * 0.7) * k}
              strokeLinecap="round"
            />
          ) : null,
        )}
        {paths.visited ? (
          <Path
            d={paths.visited}
            stroke={colors.accent}
            strokeWidth={4.4 * k}
            strokeLinecap="round"
          />
        ) : null}
        {paths.here ? (
          <Path d={paths.here} stroke={colors.sun} strokeWidth={5.2 * k} strokeLinecap="round" />
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * Turns the globe: a drag, the drift after it, and the turn to a country. Draws at most once
 * per frame, however fast the finger moves. Plain object, so React never re-creates it.
 */
interface GlobeDriver {
  pan: PanResponderInstance;
  configure(perPoint: number, reduceMotion: boolean, autoSpin: boolean): void;
  turnTo(target: GlobeView): void;
  stop(): void;
}

function createDriver(initial: GlobeView, setView: (v: GlobeView) => void): GlobeDriver {
  let perPoint = 0.5;
  let reduceMotion = false;
  let autoSpin = false;
  let current = initial;
  let pending: GlobeView | null = null;
  let frame = 0;
  let anim = 0;
  let startView = initial;

  const show = (v: GlobeView) => {
    current = v;
    pending = v;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending) setView(pending);
    });
  };
  const stopAnim = () => {
    if (anim) cancelAnimationFrame(anim);
    anim = 0;
  };

  /** The slow turn on its own (about 6° a second, west to east like the Earth, as in the template). */
  const idle = () => {
    stopAnim();
    if (!autoSpin || reduceMotion) return;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min(t - last, 50) : 0;
      last = t;
      show(clampView({ ...current, lng: current.lng - dt * IDLE_DEG_PER_MS }));
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };

  return {
    configure(p, r, a) {
      perPoint = p;
      reduceMotion = r;
      autoSpin = a;
    },
    /** Turn to `target` the short way round (ease out). Reduced motion: jump there. */
    turnTo(target) {
      stopAnim();
      if (reduceMotion) {
        show(target);
        return;
      }
      const from = current;
      const dLng = ((((target.lng - from.lng + 180) % 360) + 360) % 360) - 180;
      const dLat = target.lat - from.lat;
      let start = 0;
      const step = (t: number) => {
        start ||= t;
        const p = Math.min(1, (t - start) / SPIN_MS);
        const e = 1 - (1 - p) ** 3;
        show(clampView({ lng: from.lng + dLng * e, lat: from.lat + dLat * e }));
        if (p < 1) anim = requestAnimationFrame(step);
        else idle();
      };
      anim = requestAnimationFrame(step);
    },
    stop() {
      stopAnim();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
    pan: PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      // Keep the drag when the page would like to scroll: the globe is the thing being moved.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        stopAnim();
        startView = current;
      },
      onPanResponderMove: (_, g) =>
        show(
          clampView({
            lng: startView.lng - g.dx * perPoint,
            lat: startView.lat + g.dy * perPoint,
          }),
        ),
      onPanResponderRelease: (_, g) => {
        if (reduceMotion) return;
        // A little drift after letting go (vx is points per millisecond, ~16 ms a frame).
        let v = -g.vx * perPoint * 16;
        const step = () => {
          v *= 0.92;
          if (Math.abs(v) < 0.05) {
            idle();
            return;
          }
          show(clampView({ ...current, lng: current.lng + v }));
          anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
      },
    }),
  };
}
