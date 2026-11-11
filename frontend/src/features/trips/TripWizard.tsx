import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components';
import { stepProblem, withDefaultName, type TripDraft } from '@/lib/tripDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { NameStep } from './steps/NameStep';
import { WhatStep } from './steps/WhatStep';
import { WhenStep } from './steps/WhenStep';
import { WhereStep } from './steps/WhereStep';
import { StepHint, TripFormLayout } from './ui/TripFormLayout';

type Step = 1 | 2 | 3 | 4;

const steps: Record<Step, { title: string; subtitle: string }> = {
  1: { title: 'Where are you going?', subtitle: 'Add the cities where you will sleep, in order.' },
  2: { title: 'When?', subtitle: 'Pick the first and last day. Flights are optional.' },
  3: {
    title: 'What will you do?',
    subtitle: 'Choose any. We use it for your packing list and checklist.',
  },
  4: { title: 'Name your trip', subtitle: 'We made one from your stops. Change it if you like.' },
};

/**
 * Create a trip in 4 short steps (T1). The same flow edits a trip (mode "edit").
 * Nothing is saved until the last button.
 */
export function TripWizard({
  initial,
  mode,
  onSubmit,
}: {
  initial: TripDraft;
  mode: 'create' | 'edit';
  onSubmit: (draft: TripDraft) => Promise<void>;
}) {
  const { space } = useTheme();
  const [draft, setDraft] = useState(() => withDefaultName(initial));
  const [step, setStep] = useState<Step>(1);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (d: TripDraft) => {
    setDraft(d);
    setProblem(null);
  };

  const next = async () => {
    const p = stepProblem(draft, step);
    setProblem(p);
    if (p) return;
    if (step < 4) return setStep((step + 1) as Step);
    setSaving(true);
    try {
      await onSubmit(draft);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not save the trip. Try again.');
      setSaving(false);
    }
  };

  const last = mode === 'create' ? 'Create trip' : 'Save changes';
  const nextTitle =
    step === 4
      ? saving
        ? 'Saving…'
        : last
      : step === 3 && draft.activities.length === 0
        ? 'Skip'
        : 'Next';

  return (
    <TripFormLayout
      step={`Step ${step} of 4`}
      title={steps[step].title}
      subtitle={steps[step].subtitle}
      footer={
        <>
          <StepHint message={problem} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {step > 1 ? (
              <View style={{ flex: 1 }}>
                <Button
                  title="Back"
                  kind="secondary"
                  onPress={() => {
                    setProblem(null);
                    setStep((step - 1) as Step);
                  }}
                />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button title={nextTitle} onPress={() => void next()} disabled={saving} />
            </View>
          </View>
        </>
      }
    >
      {step === 1 ? <WhereStep draft={draft} onChange={change} /> : null}
      {step === 2 ? <WhenStep draft={draft} onChange={change} /> : null}
      {step === 3 ? <WhatStep draft={draft} onChange={change} /> : null}
      {step === 4 ? <NameStep draft={draft} onChange={change} /> : null}
    </TripFormLayout>
  );
}
