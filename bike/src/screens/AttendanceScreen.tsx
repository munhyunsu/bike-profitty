import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useNfc } from '@/src/hooks/use-nfc';
import { apiService, AttendanceInfo } from '@/src/services/api';

export default function AttendanceScreen() {
  const { isSupported, isEnabled, isScanning, startScanning, stopScanning, checkNfcSupport } = useNfc();
  const [loading, setLoading] = useState<'checkIn' | 'checkOut' | 'status' | null>(null);
  const [attendanceInfo, setAttendanceInfo] = useState<AttendanceInfo | null>(null);
  const [lastNfcId, setLastNfcId] = useState<string | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAction, setScanAction] = useState<'checkIn' | 'checkOut' | 'status' | null>(null);

  const validateNfc = async (action: 'checkIn' | 'checkOut' | 'status'): Promise<{ nfc_id: string } | null> => {
    if (!isSupported) {
      Alert.alert('오류', '이 기기는 NFC를 지원하지 않습니다.');
      return null;
    }

    if (!isEnabled) {
      Alert.alert('오류', 'NFC가 활성화되어 있지 않습니다. 설정에서 NFC를 활성화해주세요.');
      await checkNfcSupport();
      return null;
    }

    // 스캔 모달 표시
    setScanAction(action);
    setShowScanModal(true);

    try {
      const nfcData = await startScanning();
      console.log('nfcData2', nfcData);

      setShowScanModal(false);
      setScanAction(null);
      
      if (!nfcData || !nfcData.nfc_id) {
        Alert.alert('오류', 'NFC 태그를 읽을 수 없습니다.');
        return null;
      }

      setLastNfcId(nfcData.nfc_id);
      return nfcData;
    } catch (error) {
      setShowScanModal(false);
      setScanAction(null);
      
      if (error instanceof Error && error.message.includes('취소')) {
        // 사용자가 취소한 경우는 알림 표시 안 함
        return null;
      }
      
      console.error('NFC scan error:', error);
      Alert.alert('오류', error instanceof Error ? error.message : 'NFC 태그 스캔 중 오류가 발생했습니다.');
      return null;
    }
  };

  const handleCancelScan = async () => {
    await stopScanning();
    setShowScanModal(false);
    setScanAction(null);
  };

  const handleCheckIn = async () => {
    const nfcData = await validateNfc('checkIn');
    if (!nfcData) {
      return;
    }

    try {
      setLoading('checkIn');
      
      // 출근 요청 (NFC 데이터에 action 추가)
      await apiService.checkIn(nfcData.nfc_id);
      
      // 상태 확인
      const info = await apiService.getAttendanceInfo(nfcData.nfc_id);
      
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
    const nfcData = await validateNfc('checkOut');
    if (!nfcData) {
      return;
    }

    try {
      setLoading('checkOut');
      
      // 퇴근 요청 (NFC 데이터에 action 추가)
      await apiService.checkOut(nfcData.nfc_id);
      
      // 상태 확인
      const info = await apiService.getAttendanceInfo(nfcData.nfc_id);
      
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
    const nfcData = await validateNfc('status');
    if (!nfcData) {
      return;
    }

    try {
      setLoading('status');
      
      // 상태 확인만
      const info = await apiService.getAttendanceInfo(nfcData.nfc_id);
      
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

      {/* NFC 스캔 모달 */}
      <Modal
        visible={showScanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelScan}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>태그하세요</Text>
            <Text style={styles.modalSubtitle}>
              NFC 태그를 기기에 가까이 대주세요
            </Text>
            {isScanning && (
              <ActivityIndicator size="large" color="#3498db" style={styles.modalSpinner} />
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelScan}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSpinner: {
    marginVertical: 20,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    minWidth: 120,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
