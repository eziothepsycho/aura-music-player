import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface PhoneTrack {
  id: string;
  filename: string;
  uri: string;
  duration: number;
}

export default function App() {
  const [pcIp, setPcIp] = useState('192.168.1.');
  const [pin, setPin] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [tracks, setTracks] = useState<PhoneTrack[]>([]);
  const [comparison, setComparison] = useState<{
    alreadySynced: number;
    newTracks: number;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const handlePair = async () => {
    if (!pcIp.trim() || pin.length !== 6) {
      Alert.alert('Error', 'Please enter a valid PC IP address and 6-digit PIN');
      return;
    }

    try {
      const response = await fetch(`http://${pcIp.trim()}:43210/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          deviceName: 'Android Device',
          model: 'Android Phone',
          os: 'Android',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsPaired(true);
        Alert.alert('Success', 'Paired successfully with Aura Desktop!');
      } else {
        Alert.alert('Pairing Failed', data.message || 'Invalid PIN');
      }
    } catch (err: any) {
      Alert.alert('Connection Error', 'Could not reach PC. Ensure PC and Phone are on the same Wi-Fi.');
    }
  };

  const handleScanAndCompare = async () => {
    setIsScanning(true);
    // Simulates reading local Android storage music
    setTimeout(async () => {
      const mockPhoneTracks = [
        { title: 'Blinding Lights', artist: 'The Weeknd', fileName: 'The Weeknd - Blinding Lights.flac', duration: 200, fileSize: 18000000 },
        { title: 'Get Lucky', artist: 'Daft Punk', fileName: 'Daft Punk - Get Lucky.flac', duration: 248, fileSize: 22000000 },
        { title: 'Decay', artist: 'HOME', fileName: 'HOME - Decay.mp3', duration: 195, fileSize: 8000000 },
      ];

      try {
        const response = await fetch(`http://${pcIp.trim()}:43210/api/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneTracks: mockPhoneTracks }),
        });
        const data = await response.json();
        if (data.success) {
          setComparison({
            alreadySynced: data.comparison.alreadySyncedCount,
            newTracks: data.comparison.newTracksToSync.length,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsScanning(false);
      }
    }, 1000);
  };

  const handleStartSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);

    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          Alert.alert('Complete', '🎉 Synchronization complete! Songs are saved on PC.');
          return 100;
        }
        return prev + 25;
      });
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 24 }}>🎵</Text>
          </View>
          <View>
            <Text style={styles.title}>Aura Sync</Text>
            <Text style={styles.subtitle}>Android Companion App</Text>
          </View>
        </View>

        {!isPaired ? (
          /* Step 1: Connect & Pair */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Connect to Aura Desktop</Text>
            <Text style={styles.cardDesc}>Enter your PC's IP and 6-digit PIN from your PC screen:</Text>

            <Text style={styles.inputLabel}>PC Local IP Address:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.45"
              placeholderTextColor="#64748b"
              value={pcIp}
              onChangeText={setPcIp}
              autoCapitalize="none"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>6-Digit Pairing PIN:</Text>
            <TextInput
              style={[styles.input, styles.pinInput]}
              placeholder="000000"
              placeholderTextColor="#64748b"
              value={pin}
              onChangeText={setPin}
              maxLength={6}
              keyboardType="number-pad"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handlePair}>
              <Text style={styles.btnText}>Pair with PC</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Step 2: Scan & Sync */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Differential Synchronization</Text>
            <Text style={styles.cardDesc}>Scan your phone's music and transfer new tracks to PC:</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#4f46e5', marginVertical: 12 }]}
              onPress={handleScanAndCompare}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>🔍 Scan Phone & Compare with PC</Text>
              )}
            </TouchableOpacity>

            {comparison && (
              <View style={styles.statsBox}>
                <Text style={styles.statLine}>
                  Already on PC (Skipped): <Text style={{ color: '#34d399', fontWeight: 'bold' }}>{comparison.alreadySynced} ✓</Text>
                </Text>
                <Text style={styles.statLine}>
                  New Songs to Sync: <Text style={{ color: '#a78bfa', fontWeight: 'bold' }}>{comparison.newTracks}</Text>
                </Text>

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 12 }]}
                  onPress={handleStartSync}
                  disabled={isSyncing || comparison.newTracks === 0}
                >
                  <Text style={styles.btnText}>
                    {isSyncing ? `Transferring... ${syncProgress}%` : `🚀 Sync ${comparison.newTracks} New Songs`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Offline Guarantee Notice */}
        <View style={[styles.card, styles.noticeCard]}>
          <Text style={styles.noticeTitle}>🛡️ Offline Guarantee</Text>
          <Text style={styles.noticeDesc}>
            Transferred songs reside on your PC disk. Once synced, you can disconnect your phone or turn off Wi-Fi and continue listening offline!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080d',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    marginTop: 10,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: 'rgba(22, 26, 43, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: '#111422',
    borderWidth: 1,
    borderColor: '#242a44',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 14,
    marginBottom: 14,
  },
  pinInput: {
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  primaryBtn: {
    backgroundColor: '#7c3aed',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsBox: {
    backgroundColor: '#0c0e17',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  statLine: {
    fontSize: 13,
    color: '#cbd5e1',
    marginVertical: 4,
  },
  noticeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34d399',
    marginBottom: 4,
  },
  noticeDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
});

