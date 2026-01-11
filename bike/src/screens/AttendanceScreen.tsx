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
import { apiService, AttendanceStatusResponse } from '@/src/services/api';
import { formatDateTime, formatTime } from '@/src/utils/date-format';

export default function AttendanceScreen() {
  const { isSupported, isEnabled, isScanning, startScanning, stopScanning, checkNfcSupport } = useNfc();
  const [loading, setLoading] = useState<'checkIn' | 'checkOut' | 'status' | null>(null);
  const [attendanceInfo, setAttendanceInfo] = useState<AttendanceStatusResponse | null>(null);
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
            {/* 직원 정보 */}
            <View style={styles.employeeCard}>
              <Text style={styles.employeeName}>{attendanceInfo.employee.name}</Text>
              {attendanceInfo.employee.department && (
                <Text style={styles.employeeDetail}>부서: {attendanceInfo.employee.department}</Text>
              )}
              {attendanceInfo.employee.position && (
                <Text style={styles.employeeDetail}>직책: {attendanceInfo.employee.position}</Text>
              )}
            </View>

            {/* 오늘의 출퇴근 상태 */}
            <View style={styles.todayCard}>
              <Text style={styles.cardTitle}>오늘 ({attendanceInfo.today.date})</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, attendanceInfo.today.is_checked_in && styles.statusBadgeActive]}>
                  <Text style={styles.statusBadgeText}>
                    {attendanceInfo.today.is_checked_in ? '✓ 출근' : '출근'}
                  </Text>
                </View>
                {attendanceInfo.today.check_in && (
                  <Text style={styles.timeText}>{formatTime(attendanceInfo.today.check_in.tag_time)}</Text>
                )}
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, attendanceInfo.today.is_checked_out && styles.statusBadgeActive]}>
                  <Text style={styles.statusBadgeText}>
                    {attendanceInfo.today.is_checked_out ? '✓ 퇴근' : '퇴근'}
                  </Text>
                </View>
                {attendanceInfo.today.check_out && (
                  <Text style={styles.timeText}>{formatTime(attendanceInfo.today.check_out.tag_time)}</Text>
                )}
              </View>
            </View>

            {/* 월간 통계 */}
            <View style={styles.statsCard}>
              <Text style={styles.cardTitle}>이번 달 통계</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{attendanceInfo.monthly_stats.total_days}</Text>
                  <Text style={styles.statLabel}>근무일</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{attendanceInfo.monthly_stats.check_in_count}</Text>
                  <Text style={styles.statLabel}>출근</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{attendanceInfo.monthly_stats.check_out_count}</Text>
                  <Text style={styles.statLabel}>퇴근</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.statValueSuccess]}>
                    {attendanceInfo.monthly_stats.on_time_count}
                  </Text>
                  <Text style={styles.statLabel}>정시출근</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.statValueWarning]}>
                    {attendanceInfo.monthly_stats.late_count}
                  </Text>
                  <Text style={styles.statLabel}>지각</Text>
                </View>
              </View>
            </View>

            {/* 최근 기록 */}
            {attendanceInfo.recent_records.length > 0 && (
              <View style={styles.recordsCard}>
                <Text style={styles.cardTitle}>최근 기록</Text>
                {attendanceInfo.recent_records.slice(0, 5).map((record) => (
                  <View key={record.id} style={styles.recordItem}>
                    <View style={[
                      styles.recordTypeBadge,
                      record.tag_type === 'check_in' ? styles.recordTypeCheckIn : styles.recordTypeCheckOut
                    ]}>
                      <Text style={styles.recordTypeText}>
                        {record.tag_type === 'check_in' ? '출근' : '퇴근'}
                      </Text>
                    </View>
                    <Text style={styles.recordTime}>{formatDateTime(record.tag_time)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 마지막 태그 */}
            <View style={styles.lastTagCard}>
              <Text style={styles.cardTitle}>마지막 태그</Text>
              <View style={styles.lastTagRow}>
                <Text style={styles.lastTagType}>
                  {attendanceInfo.last_tag.type === 'check_in' ? '출근' : '퇴근'}
                </Text>
                <Text style={styles.lastTagTime}>{formatDateTime(attendanceInfo.last_tag.time)}</Text>
              </View>
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
  employeeCard: {
    width: '100%',
    padding: 15,
    backgroundColor: '#e8f4f8',
    borderRadius: 10,
    marginBottom: 15,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  employeeDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  todayCard: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  statsCard: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
  },
  recordsCard: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
  },
  lastTagCard: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  statusBadgeActive: {
    backgroundColor: '#27ae60',
  },
  statusBadgeText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  statValueSuccess: {
    color: '#27ae60',
  },
  statValueWarning: {
    color: '#e74c3c',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  recordTypeCheckIn: {
    backgroundColor: '#d4edda',
  },
  recordTypeCheckOut: {
    backgroundColor: '#f8d7da',
  },
  recordTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  recordTime: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  lastTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastTagType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  lastTagTime: {
    fontSize: 14,
    color: '#666',
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
