'use client';

import { useEffect, useRef, useState } from 'react';
import { Sheet } from './ui';

// QR scanning without a library, via the browser's built-in BarcodeDetector.
//
// Support is uneven: Chrome on Android has it, Safari on iOS does not. Rather
// than shipping a 200 KB decoder for that gap, the button only appears where
// the API exists - on iPhones the system camera app scans QR codes anyway and
// opens the join link directly, which is the better flow there regardless.
export function scannerSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

type Detector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

export default function CodeScanner({
  onClose,
  onCode,
}: {
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const stopped = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    stopped.current = false;

    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctor = (window as any).BarcodeDetector;
        if (!Ctor) throw new Error('Dieses Gerät kann keine QR-Codes scannen.');
        const detector: Detector = new Ctor({ formats: ['qr_code'] });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (stopped.current || !videoRef.current) return;
          try {
            const hits = await detector.detect(videoRef.current);
            const url = hits[0]?.rawValue;
            if (url) {
              // Accept a full join link or a bare code.
              const m = url.match(/\/join\/([A-Za-z0-9]{4,8})/) ?? url.match(/^([A-Za-z0-9]{4,8})$/);
              if (m) {
                stopped.current = true;
                onCode(m[1].toUpperCase());
                return;
              }
            }
          } catch {
            /* a frame failed to decode - just try the next one */
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /permission|denied|NotAllowed/i.test(msg)
            ? 'Kein Zugriff auf die Kamera. Erlaube ihn in den Browser-Einstellungen.'
            : msg,
        );
      }
    })();

    return () => {
      stopped.current = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <Sheet title="QR-Code scannen" onClose={onClose}>
      {error ? (
        <div className="note err">{error}</div>
      ) : (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
          <span className="scanner-frame" />
        </div>
      )}
      <p className="tiny center">Halte die Kamera auf den QR-Code in der Lobby.</p>
      <button className="block" onClick={onClose}>
        Abbrechen
      </button>
    </Sheet>
  );
}
