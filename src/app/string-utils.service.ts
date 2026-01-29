import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StringUtilsService {
  /**
   * Encodes a string to base64, handling UTF-8 characters
   * @param str The input string
   * @returns The base64 encoded string
   */
  encodeBase64(str: string): string {
    return btoa(
      encodeURIComponent(str).replaceAll(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCodePoint(Number.parseInt(p1, 16));
      }),
    );
  }

  /**
   * Decodes a base64 encoded string, handling UTF-8 characters
   * @param str The base64 encoded string
   * @returns The decoded string
   */
  decodeBase64(str: string): string {
    try {
      return decodeURIComponent(
        atob(str)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.codePointAt(0)?.toString(16)).slice(-2);
          })
          .join(''),
      );
    } catch (e) {
      console.error('Failed to decode base64:', e);
      return atob(str);
    }
  }
}
