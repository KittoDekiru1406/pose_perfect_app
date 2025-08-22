import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { 
  AspectRatio,
  ZoomableMediaTrackCapabilities,
  ZoomableMediaTrackConstraintSet,
  ZoomableMediaTrackSettings
} from '../types';
import Icon from './Icon';

interface CameraViewProps {
  overlayImage: string | null;
  overlayOpacity: number;
  showGrid: boolean;
  aspectRatio: AspectRatio;
  zoom: number;
  facingMode: 'user' | 'environment';
  setOverlayOpacity: (opacity: number) => void;
  setShowGrid: (show: boolean) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setZoom: (zoom: number) => void;
  onCapture: (imageSrc: string) => void;
  onFlipCamera: () => void;
  onUploadOverlay: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ASPECT_RATIO_CLASSES: Record<AspectRatio, string> = {
  '3:4': 'aspect-[3/4]',
  '1:1': 'aspect-square',
  '9:16': 'aspect-[9/16]',
};

const CameraView: React.FC<CameraViewProps> = (props) => {
  const {
    overlayImage, overlayOpacity, showGrid, aspectRatio, zoom, facingMode,
    setOverlayOpacity, setShowGrid, setAspectRatio, setZoom,
    onCapture, onFlipCamera, onUploadOverlay
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [zoomCaps, setZoomCaps] = useState<{min: number, max: number, step: number} | null>(null);

  useEffect(() => {
    let currentStream: MediaStream;

    const startCamera = async () => {
      setIsLoading(true);
      setCameraError(null);
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 4096 },
            height: { ideal: 2160 }
          },
          audio: false,
        };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }

        const videoTrack = currentStream.getVideoTracks()[0];
        if ('zoom' in (videoTrack.getSettings() as ZoomableMediaTrackSettings)) {
            const capabilities = videoTrack.getCapabilities() as ZoomableMediaTrackCapabilities;
            if (capabilities.zoom) {
                setZoomCaps({
                    min: capabilities.zoom.min,
                    max: capabilities.zoom.max,
                    step: capabilities.zoom.step,
                });
            }
        } else {
          setZoomCaps(null);
        }

      } catch (err) {
        console.error("Camera Error:", err);
        setCameraError("Could not access the camera. Please check permissions.");
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
      if (!stream) return;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'zoom' in (videoTrack.getSettings() as ZoomableMediaTrackSettings) && zoomCaps) {
          const constraints: MediaTrackConstraints = {
            advanced: [{ zoom: zoom } as ZoomableMediaTrackConstraintSet]
          };
          videoTrack.applyConstraints(constraints);
      }
  }, [zoom, stream, zoomCaps]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
    
    let drawWidth, drawHeight, sx, sy;
    
    if (videoWidth / videoHeight > ratioW / ratioH) {
      drawHeight = videoHeight;
      drawWidth = videoHeight * (ratioW / ratioH);
      sx = (videoWidth - drawWidth) / 2;
      sy = 0;
    } else {
      drawWidth = videoWidth;
      drawHeight = videoWidth * (ratioH / ratioW);
      sx = 0;
      sy = (videoHeight - drawHeight) / 2;
    }
    
    canvas.width = drawWidth;
    canvas.height = drawHeight;

    const context = canvas.getContext('2d');
    if (context) {
      if (facingMode === 'user') {
        context.translate(drawWidth, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, sx, sy, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCapture(dataUrl);
    }
  }, [aspectRatio, onCapture, facingMode]);
  
  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col overflow-hidden">
      <main className="flex-grow flex items-center justify-center relative p-4">
        <div className={`w-full max-w-lg max-h-full relative ${ASPECT_RATIO_CLASSES[aspectRatio]} overflow-hidden rounded-lg shadow-2xl`}>
          {isLoading && <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-30"><p>Starting Camera...</p></div>}
          {cameraError && <div className="absolute inset-0 bg-red-900 flex items-center justify-center z-30 p-4 text-center"><p>{cameraError}</p></div>}
          
          <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover" style={{transform: `scale(${facingMode === 'user' ? -1 : 1}, 1)`}} />
          
          {overlayImage && <img src={overlayImage} alt="Pose overlay" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity" style={{ opacity: overlayOpacity }} />}
          
          {showGrid && (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-20">
              <div className="col-span-1 row-span-1 border-r border-b border-white/30"></div><div className="col-span-1 row-span-1 border-r border-b border-white/30"></div><div className="col-span-1 row-span-1 border-b border-white/30"></div>
              <div className="col-span-1 row-span-1 border-r border-b border-white/30"></div><div className="col-span-1 row-span-1 border-r border-b border-white/30"></div><div className="col-span-1 row-span-1 border-b border-white/30"></div>
              <div className="col-span-1 row-span-1 border-r border-white/30"></div><div className="col-span-1 row-span-1 border-r border-white/30"></div><div className="col-span-1 row-span-1"></div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </main>

      <footer className="w-full bg-black bg-opacity-30 p-4 space-y-4">
        { (overlayImage || zoomCaps) &&
            <div className="flex gap-4 items-center justify-center">
                {overlayImage && <div className="flex-1 flex items-center gap-2">
                <span className="text-xs">Opacity</span>
                <input type="range" min="0" max="1" step="0.05" value={overlayOpacity} onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                </div>}
                {zoomCaps && <div className="flex-1 flex items-center gap-2">
                <span className="text-xs">Zoom</span>
                <input type="range" min={zoomCaps.min} max={zoomCaps.max} step={zoomCaps.step} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                </div>}
            </div>
        }
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-full transition-colors ${showGrid ? 'bg-blue-500' : 'bg-gray-800'}`}>
              <Icon name="grid" className="w-5 h-5"/>
            </button>
            <input type="file" accept="image/*" ref={uploadInputRef} onChange={onUploadOverlay} className="hidden" />
            <button onClick={() => uploadInputRef.current?.click()} className="p-2 rounded-full bg-gray-800">
              <Icon name="upload" className="w-5 h-5"/>
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {(['3:4', '1:1', '9:16'] as AspectRatio[]).map(ratio => (
              <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-3 py-1 rounded-md transition-colors ${aspectRatio === ratio ? 'bg-blue-500 font-semibold' : 'bg-gray-800'}`}>
                {ratio}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-around items-center pt-2">
          <div className="w-20 h-20"></div>
          <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-gray-600 ring-offset-4 ring-offset-black transition-transform active:scale-95">
            <div className="w-16 h-16 rounded-full bg-white border-4 border-black"></div>
          </button>
          <button onClick={onFlipCamera} className="w-20 h-20 flex items-center justify-center">
            <div className="p-3 rounded-full bg-gray-800 transition-colors active:bg-gray-700">
             <Icon name="flip" className="w-8 h-8"/>
            </div>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default CameraView;
