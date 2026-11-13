import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, View } from 'react-native';

import { AppText, Checkbox } from '@/components';
import type { ChecklistItem } from '@/data';
import { dueLabel } from '@/lib/checklist';
import { useTheme } from '@/theme/ThemeProvider';

/** One line of the checklist: tick box, title, due date, notes, official link, and a ••• menu. */
export function ChecklistItemRow({
  item,
  today,
  onToggle,
  onMenu,
}: {
  item: ChecklistItem;
  today: string;
  onToggle: (done: boolean) => void;
  onMenu: () => void;
}) {
  const { colors, space } = useTheme();
  const due = item.done ? null : dueLabel(item.dueDate, today);
  const late = !!item.dueDate && item.dueDate < today && !item.done;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <View style={{ flex: 1, gap: space.xxs }}>
        <Checkbox
          checked={item.done}
          onChange={onToggle}
          label={
            <AppText
              variant="body"
              color={item.done ? colors.inkSoft : undefined}
              style={item.done ? { textDecorationLine: 'line-through' } : undefined}
            >
              {item.title}
            </AppText>
          }
        />
        {due || (item.notes && !item.done) || (item.sourceUrl && !item.done) ? (
          <View style={{ paddingLeft: 24 + space.sm, gap: space.xxs }}>
            {due ? (
              <AppText variant="date" color={late ? colors.warning : undefined}>
                {due}
              </AppText>
            ) : null}
            {item.notes && !item.done ? <AppText variant="caption">{item.notes}</AppText> : null}
            {item.sourceUrl && !item.done ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(item.sourceUrl!)}
                hitSlop={8}
              >
                <AppText variant="caption" color={colors.accent}>
                  Check the official source
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Options for ${item.title}`}
        onPress={onMenu}
        hitSlop={8}
        style={{ minHeight: 44, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}
