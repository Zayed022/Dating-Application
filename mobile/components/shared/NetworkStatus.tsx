import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Config, Colors, Typography, Spacing } from '../../constants';

type Status = 'checking' | 'ok' | 'error';

export default function NetworkStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkServer = async () => {
    setStatus('checking');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${Config.API_URL.replace('/api', '')}/api/ping`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        setStatus('ok');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30000); // re-check every 30s
    return () => clearInterval(interval);
  }, []);

  if (status === 'ok') return null; // Don't show anything when connected

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        {status === 'checking' ? (
          <ActivityIndicator size="small" color="#FCD34D" style={styles.icon} />
        ) : (
          <Text style={styles.icon}>⚠️</Text>
        )}
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            {status === 'checking' ? 'Connecting to server...' : 'Server Unreachable'}
          </Text>
          {status === 'error' && (
            <Text style={styles.body}>
              Edit {'\n'}
              <Text style={styles.code}>mobile/.env</Text>
              {'\n'}Set <Text style={styles.code}>EXPO_PUBLIC_API_URL</Text> to your PC's LAN IP{'\n'}
              e.g. <Text style={styles.code}>http://192.168.1.42:5000/api</Text>
            </Text>
          )}
          <Text style={styles.url}>Current: {Config.API_URL}</Text>
        </View>
        <TouchableOpacity onPress={checkServer} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#92400E',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  icon: { fontSize: 18, marginTop: 2, width: 24 },
  textBlock: { flex: 1 },
  title: {
    color: '#FCD34D',
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.sm,
    marginBottom: 4,
  },
  body: {
    color: '#FDE68A',
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: 4,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#FCD34D',
  },
  url: {
    color: '#92400E',
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: '#92400E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#FCD34D',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
});
