import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Chip, Input } from '@/components';
import type { FlightDirection, IsoDate } from '@/data/types';
import { formatDay } from '@/lib/dates';
import { directionLabels, flightProblem, type FlightDraft } from '@/lib/tripDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { Calendar } from './Calendar';
import { StepHint } from './TripFormLayout';

/** A day field that opens a small calendar below it. */
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: IsoDate | null;
  onChange: (d: IsoDate | null) => void;
}) {
  const { colors, radii, space } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: space.xs, flex: 1 }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDay(value) : 'not set'}`}
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          paddingHorizontal: space.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
        }}
      >
        <AppText variant="date" style={{ flex: 1 }} color={value ? colors.ink : colors.inkSoft}>
          {value ? formatDay(value) : 'Pick a day'}
        </AppText>
        <Ionicons name="calendar-outline" size={18} color={colors.inkSoft} />
      </Pressable>
      {open ? (
        <Calendar
          mode="single"
          start={value}
          end={value}
          onChange={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

/** Add or edit one flight (T5). Every field is optional. */
export function FlightEditor({
  flight,
  onSave,
  onDelete,
  onClose,
}: {
  flight: FlightDraft | null;
  onSave: (f: FlightDraft) => void;
  onDelete: (key: string) => void;
  onClose: () => void;
}) {
  const { colors, space } = useTheme();
  const [f, setF] = useState<FlightDraft | null>(flight);
  const [problem, setProblem] = useState<string | null>(null);
  // Load a new flight into the form whenever the modal opens with one.
  const [shownKey, setShownKey] = useState<string | null>(null);
  if (flight && flight.key !== shownKey) {
    setShownKey(flight.key);
    setF(flight);
    setProblem(null);
  }
  if (!flight || !f) return null;

  const set = <K extends keyof FlightDraft>(k: K, v: FlightDraft[K]) => setF({ ...f, [k]: v });
  const save = () => {
    const p = flightProblem(f);
    setProblem(p);
    if (!p) onSave(f);
  };
  const close = () => {
    setShownKey(null);
    onClose();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg }}>
          <AppText variant="heading" style={{ flex: 1 }}>
            Flight
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingBottom: space.xl,
            gap: space.lg,
          }}
        >
          <AppText variant="body" color={colors.inkSoft}>
            Fill in what you know. Everything is optional and can be added later.
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {(Object.keys(directionLabels) as FlightDirection[]).map((d) => (
              <Chip
                key={d}
                label={directionLabels[d]}
                selected={f.direction === d}
                onPress={() => set('direction', d)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Airline"
                value={f.airline}
                onChangeText={(v) => set('airline', v)}
                placeholder="e.g. Wizz Air"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Flight number"
                value={f.flightNumber}
                onChangeText={(v) => set('flightNumber', v)}
                placeholder="e.g. W6 4567"
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="From airport"
                value={f.departureAirport}
                onChangeText={(v) => set('departureAirport', v)}
                placeholder="e.g. TIA"
                autoCapitalize="characters"
                maxLength={60}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="To airport"
                value={f.arrivalAirport}
                onChangeText={(v) => set('arrivalAirport', v)}
                placeholder="e.g. FCO"
                autoCapitalize="characters"
                maxLength={60}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <DateField
              label="Departure day"
              value={f.departureDate}
              onChange={(d) => set('departureDate', d)}
            />
            <View style={{ width: 110 }}>
              <Input
                label="Time"
                value={f.departureTime}
                onChangeText={(v) => set('departureTime', v)}
                placeholder="09:40"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <DateField
              label="Arrival day"
              value={f.arrivalDate}
              onChange={(d) => set('arrivalDate', d)}
            />
            <View style={{ width: 110 }}>
              <Input
                label="Time"
                value={f.arrivalTime}
                onChangeText={(v) => set('arrivalTime', v)}
                placeholder="11:05"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
          <AppText variant="caption">Times are local at each airport.</AppText>
          <Input
            label="Booking code"
            value={f.bookingCode}
            onChangeText={(v) => set('bookingCode', v)}
            placeholder="e.g. K7Q2LM"
            autoCapitalize="characters"
            maxLength={12}
          />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Seat"
                value={f.seat}
                onChangeText={(v) => set('seat', v)}
                placeholder="e.g. 14A"
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Terminal"
                value={f.terminal}
                onChangeText={(v) => set('terminal', v)}
                placeholder="2"
                maxLength={10}
              />
            </View>
          </View>
          <StepHint message={problem} />
          <Button title="Save flight" onPress={save} />
          <Button
            title="Remove this flight"
            kind="ghost"
            onPress={() => {
              setShownKey(null);
              onDelete(f.key);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
