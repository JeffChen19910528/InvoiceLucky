import type { DecodeHintType } from '@zxing/library'

/**
 * 相機掃碼的抽象介面：UI 只依賴 `CodeScanner`，不直接依賴任何掃碼函式庫，
 * 因此可替換實作，測試時也能注入假的 scanner。
 */
export interface CodeScanner {
  /** 開啟相機、把影像顯示在 video，並在每次解出內容時呼叫 onCode。 */
  start(video: HTMLVideoElement, onCode: (text: string) => void): Promise<void>
  /** 停止掃描並釋放相機；可重複呼叫，也可在 start 完成前呼叫。 */
  stop(): void
}
export type ScannerFactory = () => CodeScanner

export type CameraErrorCode = 'denied' | 'no-camera' | 'busy' | 'insecure' | 'unsupported' | 'unknown'

export class CameraError extends Error {
  constructor(readonly code: CameraErrorCode) {
    super(code)
  }
}

export function toCameraError(e: unknown): CameraError {
  if (e instanceof CameraError) return e
  const name = e instanceof Error ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return new CameraError('denied')
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return new CameraError('no-camera')
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return new CameraError('busy')
  return new CameraError('unknown')
}

function stopTracks(video: HTMLVideoElement | null) {
  const stream = video?.srcObject
  if (stream instanceof MediaStream) stream.getTracks().forEach((t) => t.stop())
  if (video) video.srcObject = null
}

/** 以 zxing 實作：支援 QR Code 與 Code 39；函式庫以動態 import 載入，不增加首頁體積。 */
export const createZxingScanner: ScannerFactory = () => {
  let stopped = false
  let stopFn: (() => void) | null = null
  let el: HTMLVideoElement | null = null

  return {
    async start(video, onCode) {
      el = video
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new CameraError(typeof window !== 'undefined' && window.isSecureContext === false ? 'insecure' : 'unsupported')
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType: HintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
        if (stopped) return
        const hints = new Map<DecodeHintType, unknown>([[HintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_39]]])
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
        const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, (result) => {
          if (result && !stopped) onCode(result.getText())
        })
        stopFn = () => controls.stop()
        if (stopped) this.stop()
      } catch (e) {
        throw toCameraError(e)
      }
    },
    stop() {
      stopped = true
      try {
        stopFn?.()
      } finally {
        stopFn = null
        stopTracks(el)
      }
    },
  }
}
