import { useState, useEffect } from 'react';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export function useNfc() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    checkNfcSupport();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const checkNfcSupport = async () => {
    try {
      const supported = await NfcManager.isSupported();
      setIsSupported(supported);
      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setIsEnabled(enabled);
      }
    } catch (error) {
      console.error('NFC check failed:', error);
      setIsSupported(false);
    }
  };

  const startScanning = async (): Promise<{ nfc_id: string } | null> => {
    if (!isSupported) {
      throw new Error('NFC is not supported on this device');
    }

    try {
      setIsScanning(true);
      await NfcManager.start();
      
      const tech = NfcTech.Ndef;
      await NfcManager.requestTechnology(tech, {
        alertMessage: '태그하세요',
      });

      const tag = await NfcManager.getTag();
      
      if (!tag) {
        await NfcManager.cancelTechnologyRequest();
        setIsScanning(false);
        return null;
      }

      // 1. NDEF 메시지가 있으면 JSON 데이터 읽기 시도
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        console.log('tag.ndefMessage', tag.ndefMessage);
        const ndefRecords = tag.ndefMessage;
        
        for (const record of ndefRecords) {
          if (record.type && record.payload) {
            try {
              // 텍스트 레코드 디코딩
              const payloadArray = Array.isArray(record.payload) 
                ? new Uint8Array(record.payload) 
                : record.payload;
              const textPayload = Ndef.text.decodePayload(payloadArray);
              
              // JSON 파싱 시도
              try {
                const jsonData = JSON.parse(textPayload);
                if (jsonData.nfc_id) {
                  await NfcManager.cancelTechnologyRequest();
                  setIsScanning(false);
                  return jsonData;
                }
              } catch (parseError) {
                // JSON이 아니면 무시하고 계속 진행
                console.log('Not JSON, raw text:', textPayload);
              }
            } catch (decodeError) {
              console.error('Failed to decode NDEF record:', decodeError);
            }
          }
        }
      }
      
      // 2. NDEF 메시지가 없거나 JSON을 찾지 못한 경우, 태그 시리얼번호(UID)를 사용
      if (tag.id) {
        console.log('tag.id', tag.id, 'type:', typeof tag.id);
        let nfcId: string;
        
        // tag.id가 문자열인 경우 (이미 16진수 문자열)
        if (typeof tag.id === 'string') {
          nfcId = tag.id.toUpperCase();
        } 
        // tag.id가 배열인 경우 (number[])
        else if (Array.isArray(tag.id)) {
          const idArray = tag.id as number[];
          nfcId = idArray
            .map((byte: number) => byte.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        }
        // tag.id가 Uint8Array나 다른 배열 형태인 경우
        else {
          const idArray = Array.from(tag.id as unknown as ArrayLike<number>) as number[];
          nfcId = idArray
            .map((byte: number) => byte.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        }
        
        await NfcManager.cancelTechnologyRequest();
        setIsScanning(false);
        console.log('tag.id return', nfcId);
        return { nfc_id: nfcId };
      }
      
      // 3. 태그 ID도 없는 경우
      console.log('tag cancel');
      await NfcManager.cancelTechnologyRequest();
      setIsScanning(false);
      return null;
    } catch (error) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      setIsScanning(false);
      if ((error as Error).message?.includes('cancelled') || (error as Error).message?.includes('User')) {
        throw new Error('NFC 스캔이 취소되었습니다.');
      }
      throw error;
    }
  };

  const stopScanning = async () => {
    try {
      await NfcManager.cancelTechnologyRequest();
      setIsScanning(false);
    } catch (error) {
      console.error('Error stopping NFC scan:', error);
    }
  };

  return {
    isSupported,
    isEnabled,
    isScanning,
    startScanning,
    stopScanning,
    checkNfcSupport,
  };
}
