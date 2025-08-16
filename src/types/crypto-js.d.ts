/**
 * CryptoJS 类型声明
 * 用于消除 TypeScript 警告
 */

declare module 'crypto-js' {
  export interface WordArray {
    toString(): string
  }

  export interface CipherParams {
    toString(): string
  }

  export namespace enc {
    export namespace Utf8 {
      export function parse(str: string): WordArray
    }
  }

  export namespace mode {
    export const CBC: any
  }

  export namespace pad {
    export const Iso10126: any
  }

  export namespace AES {
    export function encrypt(
      message: string | WordArray,
      key: WordArray,
      cfg?: {
        iv?: WordArray
        mode?: any
        padding?: any
      }
    ): CipherParams
  }

  export default {
    enc,
    mode,
    pad,
    AES
  }
}
