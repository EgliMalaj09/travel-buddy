import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from '@/components/core';

export interface PickerOption {
  value: string;
  label: string;
  /** Shown before the label, e.g. a flag. */
  prefix?: string;
  /** Shown on the right, e.g. a currency code. */
  hint?: string;
}

/** A field that opens a searchable full-screen list (countries, currencies). Selection over typing. */
export function OptionPicker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose',
  error,
}: {
  label: string;
  value: string | undefined;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const { colors, fonts, fontSizes, radii, space } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: colors.surface,
          borderColor: error ? colors.accent : colors.border,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingHorizontal: space.md,
          minHeight: 48,
        }}
      >
        <AppText variant="body" style={{ flex: 1 }} color={selected ? colors.ink : colors.inkSoft}>
          {selected
            ? `${selected.prefix ? `${selected.prefix}  ` : ''}${selected.label}`
            : placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md }}
          >
            <AppText variant="heading" style={{ flex: 1 }}>
              {label}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setOpen(false)}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.inkSoft}
              autoFocus
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radii.md,
                padding: space.md,
                fontFamily: fonts.body,
                fontSize: fontSizes.md,
                color: colors.ink,
              }}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                  setQuery('');
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingHorizontal: space.lg,
                  minHeight: 52,
                  backgroundColor: pressed ? colors.surface : 'transparent',
                })}
              >
                {item.prefix ? <AppText variant="body">{item.prefix}</AppText> : null}
                <AppText variant="body" style={{ flex: 1 }}>
                  {item.label}
                </AppText>
                {item.hint ? <AppText variant="date">{item.hint}</AppText> : null}
                {item.value === value ? (
                  <Ionicons name="checkmark" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
