import React, { useState } from 'react';
import { X, QrCode, Flashlight, Camera, Check, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (assetCode: string, assetName: string, assetId: string) => void;
}

const NEARBY_ASSET_TAGS = [
  {
    code: 'BLR-001',
    name: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
    id: 'a1000000-0000-0000-0000-000000000001',
    location: 'Basement Boiler Room B-01',
    qrPayload: 'LUMINA:ASSET:BLR-001',
  },
  {
    code: 'BLR-002',
    name: 'Auxiliary Fire-Tube Steam Boiler (1,400 kg/h)',
    id: 'a1000000-0000-0000-0000-000000000002',
    location: 'Basement Boiler Room B-02',
    qrPayload: 'LUMINA:ASSET:BLR-002',
  },
  {
    code: 'P-001',
    name: 'Multi-Stage Centrifugal Boiler Feed Pump',
    id: 'a2000000-0000-0000-0000-000000000002',
    location: 'Pump Skid B-01',
    qrPayload: 'LUMINA:ASSET:P-001',
  },
  {
    code: 'CHL-001',
    name: '500-Ton Water-Cooled Centrifugal Chiller',
    id: 'a3000000-0000-0000-0000-000000000003',
    location: 'Central Chiller Plant',
    qrPayload: 'LUMINA:ASSET:CHL-001',
  },
];

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scannedAsset, setScannedAsset] = useState<typeof NEARBY_ASSET_TAGS[0] | null>(null);

  if (!isOpen) return null;

  const handleSimulateScan = (asset: typeof NEARBY_ASSET_TAGS[0]) => {
    setScannedAsset(asset);
    setIsScanning(false);
    setTimeout(() => {
      onScanSuccess(asset.code, asset.name, asset.id);
      onClose();
    }, 700);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/90 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-lg bg-midnight-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Scanner Header */}
        <div className="px-5 py-4 bg-midnight-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h2 id="qr-scanner-title" className="text-base sm:text-lg font-bold text-white">
                Scan Equipment QR Barcode
              </h2>
              <p className="text-xs text-slate-400">Aim camera at boiler asset metal nameplate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-midnight-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Camera Viewfinder with Industrial Overlay */}
        <div className="relative p-6 bg-black flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
          {/* Simulated Dark Industrial Room Background */}
          <div
            className={`absolute inset-0 bg-gradient-to-b from-slate-900 to-black transition-opacity ${
              flashlightOn ? 'opacity-90' : 'opacity-40'
            }`}
          />

          {/* Flashlight beam simulation */}
          {flashlightOn && (
            <div className="absolute inset-0 bg-radial from-amber-100/20 via-transparent to-transparent pointer-events-none" />
          )}

          {/* Viewfinder Target Reticle */}
          <div className="relative z-10 w-64 h-64 border-2 border-indigo-400/80 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-gold-400" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-gold-400" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-gold-400" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-gold-400" />

            {/* Animated Laser Scanning Line */}
            {isScanning && (
              <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-glow-gold animate-bounce" />
            )}

            {/* QR Mock Center Pattern */}
            <div className="opacity-40 p-4 text-center">
              <QrCode className="h-28 w-28 text-slate-400 mx-auto" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-2 block">
                Align Nameplate Here
              </span>
            </div>

            {/* Scanned Confirmation Overlay */}
            {scannedAsset && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-lg shadow-emerald-900">
                  <Check className="h-7 w-7" />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-300 font-bold">
                  Matched Boiler Asset
                </span>
                <span className="text-lg font-bold text-white font-mono">{scannedAsset.code}</span>
              </div>
            )}
          </div>

          {/* Torch / Flashlight Toggle Button */}
          <div className="relative z-10 mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFlashlightOn((prev) => !prev)}
              className={`min-h-[48px] px-4 py-2 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
                flashlightOn
                  ? 'bg-gold-500 text-midnight-950 border-gold-300 shadow-glow-gold'
                  : 'bg-midnight-950/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Flashlight className="h-4 w-4" />
              <span>{flashlightOn ? 'TORCH ON' : 'TORCH OFF (DARK BUNKER)'}</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Fast Equipment Tags (Touch-First Selection) */}
        <div className="p-4 sm:p-5 bg-midnight-950/95 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Or Tap Nearby Equipment Nameplate:
            </span>
            <span className="text-[10px] font-mono text-indigo-400">Bluetooth Proximity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {NEARBY_ASSET_TAGS.map((asset) => (
              <button
                key={asset.code}
                type="button"
                onClick={() => handleSimulateScan(asset)}
                className="min-h-[56px] p-3 rounded-2xl bg-midnight-900 hover:bg-indigo-900/40 active:bg-indigo-700 text-left border border-slate-700/80 flex items-center justify-between gap-2 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gold-400">{asset.code}</span>
                    <span className="text-[11px] text-slate-400 truncate">• {asset.location}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate mt-0.5">{asset.name}</p>
                </div>
                <div className="shrink-0 p-2 rounded-xl bg-midnight-950 text-indigo-400 border border-slate-800">
                  <QrCode className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
