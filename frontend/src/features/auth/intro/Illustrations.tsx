import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { AppText, PhotoPlaceholder } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Intro illustrations: real app pieces (cards, chips, stamps) around photo placeholders,
 * on a dashed "travel route" circle. Photos are placeholders until the real images exist.
 */

const SIZE = 300;

function Stage({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: SIZE, height: SIZE, alignSelf: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: 20,
          top: 20,
          width: SIZE - 40,
          height: SIZE - 40,
          borderRadius: (SIZE - 40) / 2,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.border,
        }}
      />
      {children}
    </View>
  );
}

function At({
  style,
  rotate,
  children,
}: {
  style: ViewStyle;
  rotate?: number;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        { position: 'absolute' },
        style,
        rotate ? { transform: [{ rotate: `${rotate}deg` }] } : null,
      ]}
    >
      {children}
    </View>
  );
}

function MiniCard({ children, width }: { children: ReactNode; width?: number }) {
  const { colors, radii, space } = useTheme();
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space.sm,
        gap: space.xs,
      }}
    >
      {children}
    </View>
  );
}

function Pill({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
}) {
  const { colors, radii, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: space.xs,
        paddingHorizontal: space.sm,
      }}
    >
      <Ionicons name={icon} size={14} color={color ?? colors.accent} />
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

function Row({
  icon,
  text,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Ionicons name={icon} size={14} color={color} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}

/** 1. Prepare: checklist, weather, trip photo. */
export function PlanIllustration() {
  const { colors } = useTheme();
  return (
    <Stage>
      <At style={{ left: 80, top: 70 }}>
        <PhotoPlaceholder width={150} height={150} round />
      </At>
      <At style={{ left: 0, top: 6 }} rotate={-4}>
        <MiniCard width={160}>
          <AppText variant="label">Before you go</AppText>
          <Row icon="checkmark-circle" text="Passport valid" color={colors.success} />
          <Row icon="checkmark-circle" text="No visa needed" color={colors.success} />
          <Row icon="ellipse-outline" text="Adapter type C" color={colors.inkSoft} />
        </MiniCard>
      </At>
      <At style={{ right: 0, top: 40 }}>
        <PhotoPlaceholder width={64} height={64} round />
      </At>
      <At style={{ right: 4, bottom: 46 }} rotate={3}>
        <Pill icon="sunny-outline" label="24° Marrakesh" color={colors.bucket} />
      </At>
      <At style={{ left: 18, bottom: 22 }}>
        <Pill icon="bag-handle-outline" label="Packing: 18 of 24" />
      </At>
    </Stage>
  );
}

function MapPin({ kind }: { kind: 'bucket' | 'planned' | 'visited' }) {
  const { colors } = useTheme();
  const color =
    kind === 'bucket' ? colors.bucket : kind === 'planned' ? colors.planned : colors.accent;
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderStyle: kind === 'bucket' ? 'dotted' : 'solid',
        borderColor: color,
        backgroundColor: kind === 'visited' ? color : colors.surface,
      }}
    />
  );
}

/** 2. Travel: pins on a map, photos, offline. */
export function PinIllustration() {
  const { colors, radii } = useTheme();
  return (
    <Stage>
      <At style={{ left: 50, top: 50 }}>
        <View
          style={{
            width: 200,
            height: 200,
            borderRadius: radii.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
      </At>
      <At style={{ left: 140, top: 78 }}>
        <MapPin kind="visited" />
      </At>
      <At style={{ left: 170, top: 120 }}>
        <MapPin kind="planned" />
      </At>
      <At style={{ left: 120, top: 190 }}>
        <MapPin kind="bucket" />
      </At>
      <At style={{ left: 0, top: 14 }} rotate={-8}>
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 6,
            paddingBottom: 18,
            borderRadius: radii.sm,
          }}
        >
          <PhotoPlaceholder width={84} height={84} />
        </View>
      </At>
      <At style={{ right: 0, top: 150 }} rotate={6}>
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 6,
            paddingBottom: 18,
            borderRadius: radii.sm,
          }}
        >
          <PhotoPlaceholder width={78} height={78} />
        </View>
      </At>
      <At style={{ left: 10, bottom: 14 }}>
        <Pill icon="cloud-offline-outline" label="Saved · syncs later" color={colors.planned} />
      </At>
    </Stage>
  );
}

/** 3. Money: expenses in local money and home currency. */
export function MoneyIllustration() {
  const { colors, space } = useTheme();
  const rows: [string, string, string][] = [
    ['Tagine dinner', '200 MAD', '€18.40'],
    ['Taxi to riad', '80 MAD', '€7.36'],
    ['Souk lamp', '350 MAD', '€32.20'],
  ];
  return (
    <Stage>
      <At style={{ right: 6, top: 4 }}>
        <PhotoPlaceholder width={110} height={110} round />
      </At>
      <At style={{ left: 0, top: 96 }} rotate={-2}>
        <MiniCard width={230}>
          <AppText variant="label">Marrakesh · Day 2</AppText>
          {rows.map(([what, local, home]) => (
            <View
              key={what}
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}
            >
              <AppText variant="caption" style={{ flex: 1 }} color={colors.ink}>
                {what}
              </AppText>
              <AppText variant="date">{local}</AppText>
              <AppText variant="date" color={colors.accent}>
                ≈ {home}
              </AppText>
            </View>
          ))}
        </MiniCard>
      </At>
      <At style={{ right: 10, bottom: 20 }} rotate={3}>
        <Pill icon="swap-horizontal-outline" label="Total ≈ €57.96" />
      </At>
    </Stage>
  );
}

function Stamp({ code, year, color }: { code: string; year: string; color: string }) {
  const { fontSizes, radii } = useTheme();
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: color,
        borderRadius: radii.sm,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignItems: 'center',
      }}
    >
      <AppText variant="date" color={color} style={{ fontSize: fontSizes.lg }}>
        {code}
      </AppText>
      <AppText variant="date" color={color} style={{ fontSize: fontSizes.xs }}>
        {year}
      </AppText>
    </View>
  );
}

/** 4. Remember: globe, passport stamps, stats. */
export function GlobeIllustration() {
  const { colors } = useTheme();
  return (
    <Stage>
      <At style={{ left: 60, top: 60 }}>
        <View
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: colors.planned,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="earth-outline" size={110} color={colors.surface} />
        </View>
      </At>
      <At style={{ left: 4, top: 30 }} rotate={-12}>
        <Stamp code="MAR" year="APR 2026" color={colors.accent} />
      </At>
      <At style={{ right: 6, top: 70 }} rotate={10}>
        <Stamp code="JPN" year="OCT 2025" color={colors.planned} />
      </At>
      <At style={{ left: 20, bottom: 50 }} rotate={6}>
        <Stamp code="ALB" year="AUG 2025" color={colors.bucket} />
      </At>
      <At style={{ right: 0, bottom: 14 }}>
        <MiniCard>
          <AppText variant="date" color={colors.ink}>
            12 countries · 31 cities
          </AppText>
        </MiniCard>
      </At>
    </Stage>
  );
}

/** 5. Relive: trip video, postcard, share. */
export function ReliveIllustration() {
  const { colors, radii } = useTheme();
  return (
    <Stage>
      <At style={{ left: 96, top: 10 }}>
        <View style={{ borderRadius: radii.lg, overflow: 'hidden' }}>
          <PhotoPlaceholder width={150} height={266} />
          <View
            style={{
              position: 'absolute',
              left: 51,
              top: 109,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="play" size={22} color={colors.accent} />
          </View>
        </View>
      </At>
      <At style={{ left: 0, top: 60 }} rotate={-7}>
        <MiniCard width={120}>
          <PhotoPlaceholder width={102} height={60} />
          <AppText variant="note">Wish you were here!</AppText>
        </MiniCard>
      </At>
      <At style={{ right: 0, bottom: 40 }} rotate={4}>
        <Pill icon="share-social-outline" label="Share to Reels" />
      </At>
    </Stage>
  );
}
