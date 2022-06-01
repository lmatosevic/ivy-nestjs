import crypto, { BinaryToTextEncoding } from 'crypto';

export class CryptoUtil {
  static signParams(
    params: Record<string, any>,
    secret: string,
    algorithm = 'sha256',
    output: BinaryToTextEncoding = 'hex'
  ): string {
    return CryptoUtil.signText(
      Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&'),
      secret,
      algorithm,
      output
    );
  }

  static signText(
    text: string,
    secret: string,
    algorithm = 'sha256',
    output: BinaryToTextEncoding = 'hex'
  ): string {
    return crypto.createHmac(algorithm, secret).update(text).digest(output);
  }
}
