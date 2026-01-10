import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNfc } from '@/src/hooks/use-nfc';
import { apiService, AttendanceInfo } from '@/src/services/api';

export default function AttendanceScreen() {
  const { isSupported, isEnabled, isScanning, startScanning, checkNfcSupport } = useNfc();
  const [loading, setLoading] = useState<'checkIn' | 'checkOut' | 'status' | null>(null);
  const [attendanceInfo, setAttendanceInfo] = useState<AttendanceInfo | null>(null);
  const [lastNfcId, setLastNfcId] = useState<string | null>(null);

  const validateNfc = async (): Promise<string | null> => {
    if (!isSupported) {
      Alert.alert('오류', '이 기기는 NFC를 지원하지 않습니다.');
      return null;
    }

    if (!isEnabled) {
      Alert.alert('오류', 'NFC가 활성화되어 있지 않습니다. 설정에서 NFC를 활성화해주세요.');
      await checkNfcSupport();
      return null;
    }

    try {
      const nfcId = await startScanning();
      
      if (!nfcId) {
        Alert.alert('오류', 'NFC 태그를 읽을 수 없습니다.');
        return null;
      }

      setLastNfcId(nfcId);
      return nfcId;
    } catch (error) {
      console.error('NFC scan error:', error);
      Alert.alert('오류', error instanceof Error ? error.message : 'NFC 태그 스캔 중 오류가 발생했습니다.');
      return null;
    }
  };

  const handleCheckIn = async () => {
    const nfcId = await validateNfc();
    if (!nfcId) {
      return;
    }

    try {
      setLoading('checkIn');
      
      // 출근 요청
      await apiService.checkIn(nfcId);
      
      // 상태 확인
      const info = await apiService.getAttendanceInfo(nfcId);
      
      setAttendanceInfo(info);
      Alert.alert('성공', '출근 처리 완료!');
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('오류', error instanceof Error ? error.message : '출근 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const handleCheckOut = async () => {
    const nfcId = await validateNfc();
    if (!nfcId) {
      return;
    }

    try {
      setLoading('checkOut');
      
      // 퇴근 요청
      await apiService.checkOut(nfcId);
      
      // 상태 확인
      const info = await apiService.getAttendanceInfo(nfcId);
      
      setAttendanceInfo(info);
      Alert.alert('성공', '퇴근 처리 완료!');
    } catch (error) {
      console.error('Check-out error:', error);
      Alert.alert('오류', error instanceof Error ? error.message : '퇴근 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const handleCheckStatus = async () => {
    const nfcId = await validateNfc();
    if (!nfcId) {
      return;
    }

    try {
      setLoading('status');
      
      // 상태 확인만
      const info = await apiService.getAttendanceInfo(nfcId);
      
      setAttendanceInfo(info);
      Alert.alert(
        '출퇴근 현황',
        `현재 상태: ${info.status === 'check_in' ? '출근' : '퇴근'}`,
      );
    } catch (error) {
      console.error('Status check error:', error);
      Alert.alert('오류', error instanceof Error ? error.message : '상태 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>출퇴근 관리</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>NFC 지원:</Text>
          <Text style={[styles.statusValue, isSupported && styles.statusSuccess]}>
            {isSupported ? '예' : '아니오'}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>NFC 활성화:</Text>
          <Text style={[styles.statusValue, isEnabled && styles.statusSuccess]}>
            {isEnabled ? '예' : '아니오'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.checkInButton,
              (loading || isScanning || !isSupported || !isEnabled) && styles.buttonDisabled,
            ]}
            onPress={handleCheckIn}
            disabled={loading !== null || isScanning || !isSupported || !isEnabled}
          >
            {loading === 'checkIn' || isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>출근</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.checkOutButton,
              (loading || isScanning || !isSupported || !isEnabled) && styles.buttonDisabled,
            ]}
            onPress={handleCheckOut}
            disabled={loading !== null || isScanning || !isSupported || !isEnabled}
          >
            {loading === 'checkOut' || isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>퇴근</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.statusButton,
              (loading || isScanning || !isSupported || !isEnabled) && styles.buttonDisabled,
            ]}
            onPress={handleCheckStatus}
            disabled={loading !== null || isScanning || !isSupported || !isEnabled}
          >
            {loading === 'status' || isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>출퇴근 현황</Text>
            )}
          </TouchableOpacity>
        </View>

        {lastNfcId && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>마지막 NFC ID:</Text>
            <Text style={styles.infoValue}>{lastNfcId}</Text>
          </View>
        )}

        {attendanceInfo && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>출퇴근 정보:</Text>
            <View style={styles.jsonContainer}>
              <Text style={styles.jsonText}>
                {JSON.stringify(attendanceInfo, null, 2)}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {attendanceInfo.status === 'check_in' ? '출근' : '퇴근'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  statusSuccess: {
    color: '#27ae60',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 30,
    gap: 15,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  checkInButton: {
    backgroundColor: '#27ae60',
  },
  checkOutButton: {
    backgroundColor: '#e74c3c',
  },
  statusButton: {
    backgroundColor: '#3498db',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    width: '100%',
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  jsonContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  jsonText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  statusBadge: {
    marginTop: 15,
    alignSelf: 'flex-start',
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
