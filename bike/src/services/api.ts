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

  async getAttendanceInfo(nfcId: string): Promise<AttendanceInfo> {
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
