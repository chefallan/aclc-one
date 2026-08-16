"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, CheckCircle, AlertCircle } from "lucide-react";

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanning = () => {
    if (!containerRef.current) return;

    setIsScanning(true);
    setLastResult(null);

    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Prevent duplicate scans
        if (lastResult?.message === decodedText) return;

        try {
          const data = JSON.parse(decodedText);
          if (data.type === "aclc-attendance" && data.sessionId && data.token) {
            onScan(decodedText);
            setLastResult({ success: true, message: "QR code scanned successfully!" });
            stopScanning();
          } else {
            setLastResult({ success: false, message: "Invalid QR code format" });
          }
        } catch {
          setLastResult({ success: false, message: "Invalid QR code" });
        }
      },
      (errorMessage) => {
        // Ignore frequent "QR code not found" errors during scanning
        if (!errorMessage.includes("QR code not found")) {
          console.error("QR scan error:", errorMessage);
          onError?.(errorMessage);
        }
      }
    );
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Scan Attendance QR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isScanning ? (
          <div className="space-y-4">
            <div ref={containerRef} id="qr-reader" className="w-full" />
            <Button onClick={stopScanning} variant="outline" className="w-full gap-2">
              <CameraOff className="w-4 h-4" />
              Stop Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
              <Camera className="w-16 h-16 text-slate-400" />
            </div>
            <Button onClick={startScanning} className="w-full gap-2">
              <Camera className="w-4 h-4" />
              Start Scanning
            </Button>
          </div>
        )}

        {lastResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              lastResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {lastResult.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{lastResult.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
