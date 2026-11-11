import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Checkbox } from '@/components';
import { formatDateRange, formatDay } from '@/lib/dates';
import { newId } from '@/lib/ids';
import {
  changeNights,
  directionLabels,
  flightTitle,
  newFlight,
  setDates,
  setNoDates,
  totalNights,
  type FlightDraft,
  type TripDraft,
} from '@/lib/tripDraft';
import { flagEmoji, stopDates } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

import { Calendar } from '../ui/Calendar';
import { FlightEditor } from '../ui/FlightEditor';
import { Stepper } from '../ui/Stepper';

/** Step 2: first and last day (or "I don't know yet"), nights per stop, flights. */
export function WhenStep({
  draft,
  onChange,
}: {
  draft: TripDraft;
  onChange: (d: TripDraft) => void;
}) {
  const { colors, space } = useTheme();
  const [editing, setEditing] = useState<FlightDraft | null>(null);
  const total = totalNights(draft);
  const dated = total !== null;
  const lastIndex = draft.stops.length - 1;

  const schedule = stopDates(
    dated ? draft.startDate : null,
    draft.stops.map((s, order) => ({
      ...s,
      id: s.key,
      tripId: '',
      order,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 0,
    })),
  );

  return (
    <View style={{ gap: space.lg }}>
      {!draft.noDates ? (
        <>
          <Calendar
            mode="range"
            start={draft.startDate}
            end={draft.endDate}
            onChange={(s, e) => onChange(setDates(draft, s, e))}
          />
          <AppText variant="date" style={{ textAlign: 'center' }}>
            {draft.startDate && draft.endDate
              ? `${formatDateRange(draft.startDate, draft.endDate)} · ${total} ${total === 1 ? 'night' : 'nights'}`
              : draft.startDate
                ? `From ${formatDay(draft.startDate)}: now tap the last day`
                : 'Tap the first day, then the last day'}
          </AppText>
        </>
      ) : null}
      <Checkbox
        checked={draft.noDates}
        onChange={(v) => onChange(setNoDates(draft, v))}
        label="I don't know yet (the trip goes to Someday)"
      />

      {draft.stops.length > 1 || (!dated && draft.stops.length > 0) ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="label">Nights in each place</AppText>
          {schedule.map(({ stop, arrive, leave }, i) => {
            const isLast = i === lastIndex;
            return (
              <Card key={stop.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body">
                      {flagEmoji(stop.countryCode)} {stop.cityName}
                    </AppText>
                    {arrive ? (
                      <AppText variant="caption">{formatDateRange(arrive, leave)}</AppText>
                    ) : null}
                  </View>
                  {dated && isLast ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="date" color={stop.nights < 0 ? colors.accent : colors.ink}>
                        {stop.nights === 1 ? '1 night' : `${stop.nights} nights`}
                      </AppText>
                      <AppText variant="caption">the rest of the trip</AppText>
                    </View>
                  ) : (
                    <Stepper
                      value={stop.nights}
                      label={stop.cityName}
                      onMinus={() => onChange(changeNights(draft, i, -1))}
                      onPlus={() => onChange(changeNights(draft, i, 1))}
                      minusDisabled={stop.nights <= 0}
                      plusDisabled={dated && (draft.stops[lastIndex]?.nights ?? 0) <= 0}
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <AppText variant="label">Flights (optional)</AppText>
        {draft.flights.map((f) => (
          <Card key={f.key} onPress={() => setEditing(f)}>
            <AppText variant="caption">{directionLabels[f.direction]}</AppText>
            <AppText variant="body">
              {flightTitle({
                airline: f.airline || null,
                flightNumber: f.flightNumber || null,
                departureAirport: f.departureAirport || null,
                arrivalAirport: f.arrivalAirport || null,
              })}
            </AppText>
            {f.departureDate ? (
              <AppText variant="date">
                {formatDay(f.departureDate)}
                {f.departureTime ? ` · ${f.departureTime}` : ''}
              </AppText>
            ) : null}
          </Card>
        ))}
        <Button
          title="+ Add a flight"
          kind="secondary"
          onPress={() => setEditing(newFlight(draft, newId()))}
        />
      </View>

      <FlightEditor
        flight={editing}
        onClose={() => setEditing(null)}
        onDelete={(key) => {
          onChange({ ...draft, flights: draft.flights.filter((f) => f.key !== key) });
          setEditing(null);
        }}
        onSave={(f) => {
          const exists = draft.flights.some((x) => x.key === f.key);
          onChange({
            ...draft,
            flights: exists
              ? draft.flights.map((x) => (x.key === f.key ? f : x))
              : [...draft.flights, f],
          });
          setEditing(null);
        }}
      />
    </View>
  );
}
