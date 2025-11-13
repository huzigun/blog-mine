import * as crypto from 'crypto';

/**
 * AES-256-CBC 암호화
 * @param password 암호화할 문자열
 * @param key 암호화 키 (32바이트)
 * @returns 암호화된 문자열 (base64)
 */
export const cipher = (password: string, key: string): string => {
  // 키를 32바이트로 조정 (SHA-256 해시 사용)
  const keyBuffer = crypto.createHash('sha256').update(key).digest();

  // IV 생성 (16바이트)
  const iv = crypto.randomBytes(16);

  // AES-256-CBC 암호화
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(password, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // IV와 암호화된 데이터를 함께 저장 (IV:encrypted)
  return iv.toString('base64') + ':' + encrypted;
};

/**
 * AES-256-CBC 복호화
 * @param encryptedData 암호화된 문자열 (IV:encrypted 형식)
 * @param key 복호화 키 (32바이트)
 * @returns 복호화된 문자열
 */
export const decipher = (encryptedData: string, key: string): string => {
  // 키를 32바이트로 조정 (SHA-256 해시 사용)
  const keyBuffer = crypto.createHash('sha256').update(key).digest();

  // IV와 암호화된 데이터 분리
  const [ivBase64, encrypted] = encryptedData.split(':');
  if (!ivBase64 || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivBase64, 'base64');

  // AES-256-CBC 복호화
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export const maskEmail = (email: string) => {
  // 이메일 주소가 유효한지 확인
  if (!email || !email.includes('@')) {
    return 'Invalid email';
  }

  const [localPart, domain] = email.split('@');
  let maskedLocal: string;

  if (localPart.length <= 4) {
    // 4자 이하인 경우 마지막 문자만 남기고 나머지를 '*'로 처리
    maskedLocal = '*'.repeat(localPart.length - 1) + localPart.slice(-1);
  } else {
    // 5자 이상인 경우 처음 2자와 마지막 문자를 제외한 나머지를 '*'로 처리
    const visiblePart = localPart.slice(0, 2) + localPart.slice(-1);
    const maskedPart = '*'.repeat(localPart.length - 3);
    maskedLocal = visiblePart[0] + visiblePart[1] + maskedPart + visiblePart[2];
  }

  return `${maskedLocal}@${domain}`;
};
