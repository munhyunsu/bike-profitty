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

  const startScanning = async (): Promise<string | null> => {
    if (!isSupported) {
      throw new Error('NFC is not supported on this device');
    }

    try {
      setIsScanning(true);
      await NfcManager.start();
      
      const tech = NfcTech.Ndef;
      await NfcManager.requestTechnology(tech, {
        alertMessage: 'NFC 태그를 스캔 중입니다...',
      });

      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        // NFC ID를 16진수 문자열로 변환
        const nfcId = Array.from(tag.id)
          .map((byte: number) => byte.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
        
        await NfcManager.cancelTechnologyRequest();
        setIsScanning(false);
        return nfcId;
      }
      
      await NfcManager.cancelTechnologyRequest();
      setIsScanning(false);
      return null;
    } catch (error) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      setIsScanning(false);
      if ((error as Error).message?.includes('cancelled')) {
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
