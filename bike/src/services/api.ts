import { API_BASE_URL, API_ENDPOINTS } from '@/src/utils/constants';

export interface AttendanceRequest {
  nfc_id: string;
  action: 'check_in' | 'check_out';
}

export interface AttendanceInfo {
  nfc_id: string;
  status: 'check_in' | 'check_out';
  timestamp?: string;
  [key: string]: unknown;
}

export interface Employee {
  id: number;
  nfc_id: string;
  name: string;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  nfc_id: string;
  tag_type: 'check_in' | 'check_out';
  tag_time: string;
  created_at: string;
}

export interface TodayInfo {
  date: string;
  records: AttendanceRecord[];
  check_in: AttendanceRecord | null;
  check_out: AttendanceRecord | null;
  is_checked_in: boolean;
  is_checked_out: boolean;
}

export interface MonthlyStats {
  total_days: number;
  check_in_count: number;
  check_out_count: number;
  on_time_count: number;
  late_count: number;
}

export interface LastTag {
  type: 'check_in' | 'check_out';
  time: string;
}

export interface AttendanceStatusResponse {
  success: boolean;
  employee: Employee;
  today: TodayInfo;
  monthly_stats: MonthlyStats;
  recent_records: AttendanceRecord[];
  last_tag: LastTag;
}

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async checkIn(nfcId: string): Promise<AttendanceInfo> {
    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.ATTENDANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nfc_id: nfcId, action: 'check_in' }),
    });

    if (!response.ok) {
      throw new Error(`출근 요청 실패: ${response.statusText}`);
    }

    return response.json();
  }

  async checkOut(nfcId: string): Promise<AttendanceInfo> {
    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.ATTENDANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nfc_id: nfcId, action: 'check_out' }),
    });

    if (!response.ok) {
      throw new Error(`퇴근 요청 실패: ${response.statusText}`);
    }

    return response.json();
  }

  async getAttendanceInfo(nfcId: string): Promise<AttendanceStatusResponse> {
    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.INFO}/${nfcId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`상태 확인 실패: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();
