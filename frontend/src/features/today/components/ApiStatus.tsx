import { StyleSheet, Text } from 'react-native';
import { theme } from '../../../shared/theme';
import { useApiHealth } from '../hooks/useApiHealth';

export function ApiStatus() {
  const health = useApiHealth();
  const color =
    health === 'ok'
      ? theme.colors.ok
      : health === 'unreachable'
        ? theme.colors.error
        : theme.colors.muted;
  return <Text style={[styles.text, { color }]}>API: {health}</Text>;
}

const styles = StyleSheet.create({ text: { fontSize: 16 } });
