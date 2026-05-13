import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface LeagueChip {
  id: number | null;
  name: string;
  count?: number;
}

interface Props {
  leagues: LeagueChip[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function LeagueFilter({ leagues, selected, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {leagues.map(l => {
        const active = l.id === selected;
        return (
          <Pressable
            key={String(l.id)}
            onPress={() => onSelect(l.id)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary : colors.card,
              },
            ]}
          >
            <Text
              style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textDim }]}
              numberOfLines={1}
            >
              {l.name}{l.count != null ? ` (${l.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
