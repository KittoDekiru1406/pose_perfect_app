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
  overlayZoom: number;
  overlayPosition: {x: number, y: number};
  showGrid: boolean;
  aspectRatio: AspectRatio;
  zoom: number;
  facingMode: 'user' | 'environment';
  setOverlayOpacity: (opacity: number) => void;
  setOverlayZoom: (zoom: number) => void;
  setOverlayPosition: (position: {x: number, y: number}) => void;
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
    overlayImage, overlayOpacity, overlayZoom, overlayPosition, showGrid, aspectRatio, zoom, facingMode,
    setOverlayOpacity, setOverlayZoom, setOverlayPosition, setShowGrid, setAspectRatio, setZoom,
    onCapture, onFlipCamera, onUploadOverlay
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [zoomCaps, setZoomCaps] = useState<{min: number, max: number, step: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [lastTouchDistance, setLastTouchDistance] = useState<number>(0);
  const [isZooming, setIsZooming] = useState(false);

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

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    if (!overlayImage) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - overlayPosition.x,
      y: e.clientY - overlayPosition.y
    });
  }, [overlayImage, overlayPosition]);

  const handleOverlayTouchStart = useCallback((e: React.TouchEvent) => {
    if (!overlayImage) return;
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - overlayPosition.x,
        y: touch.clientY - overlayPosition.y
      });
    } else if (e.touches.length === 2) {
      // Two touches - start zooming
      setIsZooming(true);
      setIsDragging(false);
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(distance);
    }
  }, [overlayImage, overlayPosition]);

  const handleOverlayMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOverlayPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart, setOverlayPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleOverlayMove(e.clientX, e.clientY);
  }, [handleOverlayMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!overlayImage) return;
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch - dragging
      const touch = e.touches[0];
      handleOverlayMove(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && isZooming) {
      // Two touches - zooming
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newZoom = Math.max(0.5, Math.min(3, overlayZoom * scale));
        setOverlayZoom(newZoom);
      }
      setLastTouchDistance(distance);
    }
  }, [overlayImage, isDragging, isZooming, handleOverlayMove, lastTouchDistance, overlayZoom, setOverlayZoom]);

  const handleOverlayEnd = useCallback(() => {
    setIsDragging(false);
    setIsZooming(false);
    setLastTouchDistance(0);
  }, []);

  useEffect(() => {
    if (isDragging || isZooming) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleOverlayEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleOverlayEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleOverlayEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleOverlayEnd);
      };
    }
  }, [isDragging, isZooming, handleMouseMove, handleTouchMove, handleOverlayEnd]);

  const resetOverlayTransform = useCallback(() => {
    setOverlayZoom(1);
    setOverlayPosition({x: 0, y: 0});
  }, [setOverlayZoom, setOverlayPosition]);

  const handleOverlayWheel = useCallback((e: React.WheelEvent) => {
    if (!overlayImage) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, overlayZoom + delta));
    setOverlayZoom(newZoom);
  }, [overlayImage, overlayZoom, setOverlayZoom]);
  
  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col overflow-hidden">
      <main className="flex-grow flex items-center justify-center relative p-4">
        <div className={`w-full max-w-lg max-h-full relative ${ASPECT_RATIO_CLASSES[aspectRatio]} overflow-hidden rounded-lg shadow-2xl`}>
          {isLoading && <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-30"><p>Starting Camera...</p></div>}
          {cameraError && <div className="absolute inset-0 bg-red-900 flex items-center justify-center z-30 p-4 text-center"><p>{cameraError}</p></div>}
          
          <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover" style={{transform: `scale(${facingMode === 'user' ? -1 : 1}, 1)`}} />
          
          {overlayImage && (
            <img 
              src={overlayImage} 
              alt="Pose overlay" 
              className="absolute top-0 left-0 w-full h-full object-contain cursor-move z-10 transition-opacity select-none" 
              style={{ 
                opacity: overlayOpacity,
                transform: `translate(${overlayPosition.x}px, ${overlayPosition.y}px) scale(${overlayZoom})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={handleOverlayMouseDown}
              onTouchStart={handleOverlayTouchStart}
              onWheel={handleOverlayWheel}
              draggable={false}
            />
          )}
          
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
        {overlayImage && (
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-sm font-medium text-white">Overlay Controls</span>
              <p className="text-xs text-gray-300 mt-1">
                💡 Drag to move • Scroll wheel or pinch to zoom
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs w-16">Opacity</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={overlayOpacity} 
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))} 
                  className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" 
                />
                <span className="text-xs w-10 text-right">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-16">Zoom</span>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.1" 
                  value={overlayZoom} 
                  onChange={(e) => setOverlayZoom(parseFloat(e.target.value))} 
                  className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" 
                />
                <span className="text-xs w-10 text-right">{overlayZoom.toFixed(1)}x</span>
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={resetOverlayTransform}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-xs transition-colors"
                >
                  Reset Position & Zoom
                </button>
              </div>
            </div>
          </div>
        )}
        
        {zoomCaps && (
          <div className="flex items-center gap-2">
            <span className="text-xs w-16">Camera</span>
            <input 
              type="range" 
              min={zoomCaps.min} 
              max={zoomCaps.max} 
              step={zoomCaps.step} 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" 
            />
            <span className="text-xs w-10 text-right">{zoom.toFixed(1)}x</span>
          </div>
        )}
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
