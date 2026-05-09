import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  subtitle?: string;
}

export default function EmptyState({ title, subtitle }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 32, alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sub: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
});
