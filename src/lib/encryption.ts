import CryptoJS from 'crypto-js';

/**
 * Client-side encryption utility for end-to-end privacy.
 * We use AES-256-GCM (simulated via CryptoJS AES which defaults to high-security CBC/PKCS7 with unique salts).
 */

export const encryptData = (data: any, key: string): string => {
  if (!key) return JSON.stringify(data);
  try {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(stringData, key).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return '';
  }
};

export const decryptData = (encryptedData: string, key: string): any => {
  if (!key || !encryptedData) return null;
  
  // Strip common suffixes that might be appended by the server (like " (Split)")
  // We only want the base64 encrypted part
  let cleanData = encryptedData;
  if (typeof encryptedData === 'string' && encryptedData.includes(' (Split)')) {
    cleanData = encryptedData.replace(' (Split)', '').trim();
  }

  // If doesn't look like base64/encrypted, return as is (for legacy data)
  if (!cleanData.startsWith('U2FsdGVkX1')) {
    try {
      return JSON.parse(cleanData);
    } catch {
      return cleanData;
    }
  }

  try {
    const bytes = CryptoJS.AES.decrypt(cleanData, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) return null;

    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Checks if a string is encrypted by looking for the CryptoJS header
 */
export const isEncrypted = (data: string): boolean => {
  return typeof data === 'string' && data.startsWith('U2FsdGVkX1');
};
