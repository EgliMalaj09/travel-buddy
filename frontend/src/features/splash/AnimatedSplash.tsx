import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { splashPlan, stampDate, type SplashPlan } from './splashPlan';

interface Props {
  /** True on the very first launch on this phone: plays the long version with the flight. */
  firstLaunch: boolean;
  /** True once the app knows where to go (login checked). The splash waits for this. */
  ready: boolean;
  /** Called on the first frame, so the native (still) splash can hide without a flash. */
  onShown?: () => void;
  /** Called when the fade-out has finished; the parent removes the splash. */
  onDone: () => void;
}

const DASHES = 16;
const SAMPLES = 12;
const STAMP_TILT = '-7deg';

/**
 * "Passport journal" opening: a paper plane flies a dotted route across the linen page,
 * then an oxblood arrival stamp with today's date lands in the middle. Built with React
 * Native's own Animated API (no extra library). Tap anywhere to skip.
 */
export function AnimatedSplash({ firstLaunch, ready, onShown, onDone }: Props) {
  const { colors, fonts, fontSizes, space, radii } = useTheme();
  const { width } = useWindowDimensions();

  const [plan, setPlan] = useState<SplashPlan | null>(null);
  const [played, setPlayed] = useState(false);

  const flight = useState(() => new Animated.Value(0))[0];
  const stamp = useState(() => new Animated.Value(0))[0];
  const bump = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(1))[0];
  const running = useRef<Animated.CompositeAnimation | null>(null);

  // Decide which version to play (phone's "Reduce motion" setting wins).
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => alive && setPlan(splashPlan(firstLaunch, reduce)));
    return () => {
      alive = false;
    };
  }, [firstLaunch]);

  // Play the flight and the stamp.
  useEffect(() => {
    if (!plan) return;
    const steps: Animated.CompositeAnimation[] = [];
    if (plan.flight > 0) {
      steps.push(
        Animated.timing(flight, {
          toValue: 1,
          duration: plan.flight,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    }
    if (plan.stamp > 0) {
      steps.push(
        Animated.timing(stamp, {
          toValue: 1,
          duration: plan.stamp,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // The page gives a little when the stamp hits.
        Animated.sequence([
          Animated.timing(bump, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(bump, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
    } else {
      stamp.setValue(1);
    }
    steps.push(Animated.delay(plan.hold));
    const anim = Animated.sequence(steps);
    running.current = anim;
    anim.start(({ finished }) => finished && setPlayed(true));
    return () => anim.stop();
  }, [plan, flight, stamp, bump]);

  // Fade into the app once both the animation and the login check are done.
  useEffect(() => {
    if (!played || !ready || !plan) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: plan.fadeOut,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => finished && onDone());
  }, [played, ready, plan, fade, onDone]);

  function skip() {
    running.current?.stop();
    flight.setValue(1);
    stamp.setValue(1);
    bump.setValue(0);
    setPlayed(true);
  }

  // The route: a gentle arc above the stamp, from the left edge to the right edge.
  const route = useMemo(() => {
    const span = width + 80;
    const lift = 56;
    const point = (t: number) => ({
      x: -span / 2 + span * t,
      y: -120 - lift * Math.sin(Math.PI * t),
      // Paper-plane icon points up-right, so add 45° to the travel direction.
      angle: (Math.atan2(-lift * Math.PI * Math.cos(Math.PI * t), span) * 180) / Math.PI + 45,
    });
    const samples = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
    const dashes = Array.from({ length: DASHES }, (_, i) => {
      const t = (i + 0.5) / DASHES;
      return { t, ...point(t) };
    });
    return { samples, points: samples.map(point), dashes };
  }, [width]);

  const plane = {
    opacity: flight.interpolate({ inputRange: [0, 0.05, 0.92, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      {
        translateX: flight.interpolate({
          inputRange: route.samples,
          outputRange: route.points.map((p) => p.x),
        }),
      },
      {
        translateY: flight.interpolate({
          inputRange: route.samples,
          outputRange: route.points.map((p) => p.y),
        }),
      },
      {
        rotate: flight.interpolate({
          inputRange: route.samples,
          outputRange: route.points.map((p) => `${p.angle}deg`),
        }),
      },
    ],
  };

  const stampStyle = {
    opacity: stamp.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.9, 1] }),
    transform: [
      { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) },
      { rotate: STAMP_TILT },
    ],
  };
  // A faint ink ring that spreads out from the stamp when it lands.
  const inkStyle = {
    opacity: Animated.multiply(
      stamp.interpolate({ inputRange: [0, 0.99, 1], outputRange: [0, 0, 1] }),
      bump.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
    ),
    transform: [{ scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] }) }],
  };
  const pageStyle = {
    transform: [{ translateY: bump.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }],
  };

  const stampBox = {
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center' as const,
    gap: space.xxs,
  };

  return (
    <Animated.View
      testID="animated-splash"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: fade }]}
      onLayout={onShown}
    >
      <Pressable
        style={styles.fill}
        onPress={skip}
        accessibilityRole="button"
        accessibilityLabel="Travel App is opening. Tap to skip."
      >
        <Animated.View style={[styles.fill, styles.center, pageStyle]}>
          {plan?.kind === 'full' &&
            route.dashes.map((d) => (
              <Animated.View
                key={d.t}
                style={[
                  styles.dash,
                  {
                    backgroundColor: colors.inkSoft,
                    opacity: flight.interpolate({
                      inputRange: [Math.max(0, d.t - 0.04), d.t],
                      outputRange: [0, 0.55],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      { translateX: d.x },
                      { translateY: d.y },
                      { rotate: `${d.angle - 45}deg` },
                    ],
                  },
                ]}
              />
            ))}
          {plan?.kind === 'full' && (
            <Animated.View style={[styles.plane, plane]}>
              <Ionicons name="paper-plane" size={28} color={colors.accent} />
            </Animated.View>
          )}

          <Animated.View style={[stampBox, stampStyle]}>
            <Animated.View
              pointerEvents="none"
              style={[styles.ink, { borderColor: colors.accent, borderRadius: radii.lg }, inkStyle]}
            />
            <View
              style={[styles.innerLine, { borderColor: colors.accent, borderRadius: radii.sm }]}
            />
            <AppText
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                color: colors.accent,
                letterSpacing: 3,
              }}
            >
              ARRIVED
            </AppText>
            <AppText variant="title" color={colors.accent}>
              Travel App.
            </AppText>
            <AppText
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                color: colors.accent,
                letterSpacing: 2,
              }}
            >
              {stampDate()}
            </AppText>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dash: { position: 'absolute', width: 8, height: 2, borderRadius: 1 },
  plane: { position: 'absolute' },
  ink: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderWidth: 6 },
  innerLine: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
