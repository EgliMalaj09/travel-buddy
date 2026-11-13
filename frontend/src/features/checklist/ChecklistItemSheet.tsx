import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { AppText, Button, Chip, Input } from '@/components';
import { checklistEditProblem, type ChecklistEdit } from '@/data';
import { taskCategories, taskCategoryLabels } from '@/lib/checklist';
import { useTheme } from '@/theme/ThemeProvider';

/** Add or edit one item: name, group and an optional note. */
export function ChecklistItemSheet({
  initial,
  onSave,
  onClose,
}: {
  /** Null to add a new item. */
  initial: ChecklistEdit | null;
  onSave: (edit: ChecklistEdit) => Promise<void>;
  onClose: () => void;
}) {
  const { colors, radii, space } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'other');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const edit = { title, notes: notes || null, category };
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
            <AppText variant="heading">{initial ? 'Edit item' : 'Add your own item'}</AppText>
            <Input
              label="What to do"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setError(null);
              }}
              placeholder="e.g. Renew my driving licence"
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
                {taskCategories.map((c) => (
                  <Chip
                    key={c}
                    label={taskCategoryLabels[c]}
                    selected={category === c}
                    onPress={() => setCategory(c)}
                  />
                ))}
              </View>
            </View>
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
