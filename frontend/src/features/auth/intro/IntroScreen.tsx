import { router } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Logo } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { useAuth } from '../AuthProvider';
import {
  GlobeIllustration,
  MoneyIllustration,
  PinIllustration,
  PlanIllustration,
  ReliveIllustration,
} from './Illustrations';

interface Slide {
  key: string;
  title: string;
  text: string;
  art: ReactNode;
}

/** Main selling points: prepare → travel → remember. Texts can change; photos are placeholders. */
export const slides: Slide[] = [
  {
    key: 'plan',
    title: 'Plan your trip, step by step',
    text: 'Checklists for your passport and destination, packing lists and the weather, all in one place.',
    art: <PlanIllustration />,
  },
  {
    key: 'pin',
    title: 'Pin every moment, even offline',
    text: 'Save places, photos and notes as you go. No signal? Everything syncs when you are back online.',
    art: <PinIllustration />,
  },
  {
    key: 'money',
    title: 'Spend in any currency',
    text: 'Log expenses in the local money and always see what they cost in your home currency.',
    art: <MoneyIllustration />,
  },
  {
    key: 'globe',
    title: 'Your world, stamp by stamp',
    text: 'Every trip adds stamps to your passport and pins to your globe.',
    art: <GlobeIllustration />,
  },
  {
    key: 'relive',
    title: 'Relive every trip',
    text: 'Turn a trip into a short video, a postcard or a journal to keep and share.',
    art: <ReliveIllustration />,
  },
];

export function IntroScreen() {
  const { colors, radii, space } = useTheme();
  const { width } = useWindowDimensions();
  const { finishIntro } = useAuth();
  const list = useRef<ComponentRef<typeof FlatList<Slide>>>(null);
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState(0);
  const last = index === slides.length - 1;

  const goTo = (i: number) => {
    list.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const leave = (to: '/sign-up' | '/login') => {
    // Auth screens are open during the intro, so we can move first and then mark the intro as seen.
    router.replace(to);
    finishIntro();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: space.lg,
          minHeight: 48,
        }}
      >
        <Logo />
        {!last ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => goTo(slides.length - 1)}
            hitSlop={12}
            style={{ position: 'absolute', right: space.lg }}
          >
            <AppText variant="label" color={colors.inkSoft}>
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={list}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        style={{ flex: 1 }}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              height,
              paddingHorizontal: space.lg,
              justifyContent: 'center',
              gap: space.xl,
            }}
          >
            {item.art}
            <View style={{ gap: space.sm }}>
              <AppText variant="title" style={{ textAlign: 'center' }}>
                {item.title}
              </AppText>
              <AppText variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
                {item.text}
              </AppText>
            </View>
          </View>
        )}
      />

      <View style={{ padding: space.lg, gap: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs }}>
          {slides.map((s, i) => (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityLabel={`Page ${i + 1} of ${slides.length}`}
              accessibilityState={{ selected: i === index }}
              onPress={() => goTo(i)}
              hitSlop={8}
              style={{
                height: 8,
                width: i === index ? 24 : 8,
                borderRadius: radii.pill,
                backgroundColor: i === index ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
        {last ? (
          <View style={{ gap: space.sm }}>
            <Button title="Create an account" onPress={() => leave('/sign-up')} />
            <Button
              title="I already have an account"
              kind="secondary"
              onPress={() => leave('/login')}
            />
          </View>
        ) : (
          <Button title="Next" onPress={() => goTo(index + 1)} />
        )}
      </View>
    </SafeAreaView>
  );
}
