import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { searchTeams } from '../lib/queries';
import type { Team } from '../lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (team: Team) => void;
  excludeIds?: number[];
}

export default function TeamSearchModal({ visible, onClose, onPick, excludeIds = [] }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) { setQuery(''); setResults([]); return; }
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const list = await searchTeams(query, 50);
        if (!cancelled) setResults(list.filter(t => !excludeIds.includes(t.id)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, excludeIds]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Takım Ekle</Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.close, { color: colors.primary }]}>Kapat</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Takım ara (en az 2 harf)"
          placeholderTextColor={colors.textDim}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
        />

        <FlatList
          data={results}
          keyExtractor={t => String(t.id)}
          renderItem={({ item }) => (
            <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => onPick(item)}>
              <Text style={[styles.teamName, { color: colors.text }]}>{item.name}</Text>
              {item.country ? <Text style={[styles.country, { color: colors.textDim }]}>{item.country}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textDim }]}>
              {query.trim().length < 2
                ? 'Takım adı yaz (örn "Galatasaray")'
                : loading ? 'Aranıyor...' : 'Sonuç bulunamadı'}
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 15, fontWeight: '600' },
  input: { margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, fontSize: 16, borderWidth: 1 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  teamName: { fontSize: 15, fontWeight: '600' },
  country: { fontSize: 12, marginTop: 2 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
});
