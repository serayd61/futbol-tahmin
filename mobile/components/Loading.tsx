import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Loading() {
  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
