import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { AppText, Button, Chip, Input } from '@/components';
import { checklistEditProblem, QUANTITY_MAX, type ChecklistEdit } from '@/data';
import type { ChecklistItemType } from '@/data/types';
import { taskCategories, taskCategoryLabels } from '@/lib/checklist';
import { packingCategories, packingCategoryLabels } from '@/lib/packing';
import { useTheme } from '@/theme/ThemeProvider';

const groups = {
  task: taskCategories.map((c) => ({ key: c as string, label: taskCategoryLabels[c] })),
  packing: packingCategories.map((c) => ({ key: c as string, label: packingCategoryLabels[c] })),
};

/** Add or edit one item: name, group and an optional note; packing items also "how many". */
export function ChecklistItemSheet({
  initial,
  type = 'task',
  onSave,
  onClose,
}: {
  /** Null to add a new item. */
  initial: ChecklistEdit | null;
  /** A to-do (default) or a packing item. */
  type?: ChecklistItemType;
  onSave: (edit: ChecklistEdit) => Promise<void>;
  onClose: () => void;
}) {
  const { colors, radii, space } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [category, setCategory] = useState<ChecklistEdit['category']>(
    initial?.category ?? (type === 'packing' ? 'clothes' : 'other'),
  );
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const packing = type === 'packing';
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const edit: ChecklistEdit = {
      title,
      notes: notes || null,
      category,
      ...(packing ? { quantity } : {}),
    };
    const problem = checklistEditProblem(edit);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await onSave(edit);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              padding: space.lg,
              paddingBottom: space.xxl,
              gap: space.lg,
            }}
          >
            <AppText variant="heading">
              {initial ? 'Edit item' : packing ? 'Add something to pack' : 'Add your own item'}
            </AppText>
            <Input
              label={packing ? 'What to pack' : 'What to do'}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setError(null);
              }}
              placeholder={packing ? 'e.g. Camera' : 'e.g. Renew my driving licence'}
              maxLength={120}
              autoFocus={!initial}
              error={error ?? undefined}
            />
            <Input
              label="Note (optional)"
              value={notes}
              onChangeText={setNotes}
              maxLength={1000}
              multiline
            />
            <View style={{ gap: space.sm }}>
              <AppText variant="label">Group</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {groups[type].map((g) => (
                  <Chip
                    key={g.key}
                    label={g.label}
                    selected={category === g.key}
                    onPress={() => setCategory(g.key as ChecklistEdit['category'])}
                  />
                ))}
              </View>
            </View>
            {packing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <AppText variant="label" style={{ flex: 1 }}>
                  How many
                </AppText>
                <Button
                  title="−"
                  kind="secondary"
                  accessibilityLabel="One less"
                  disabled={quantity <= 1}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                />
                <AppText variant="body" accessibilityLiveRegion="polite">
                  {quantity}
                </AppText>
                <Button
                  title="+"
                  kind="secondary"
                  accessibilityLabel="One more"
                  disabled={quantity >= QUANTITY_MAX}
                  onPress={() => setQuantity((q) => Math.min(QUANTITY_MAX, q + 1))}
                />
              </View>
            ) : null}
            <Button
              title={saving ? 'Saving…' : 'Save'}
              disabled={saving}
              onPress={() => void save()}
            />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
