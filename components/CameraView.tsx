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
  flashEnabled: boolean;
  isFlipped: boolean;
  timerSeconds: number;
  setOverlayOpacity: (opacity: number) => void;
  setOverlayZoom: (zoom: number) => void;
  setOverlayPosition: (position: {x: number, y: number}) => void;
  setShowGrid: (show: boolean) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setZoom: (zoom: number) => void;
  setFlashEnabled: (enabled: boolean) => void;
  setTimerSeconds: (seconds: number) => void;
  onCapture: (imageSrc: string) => void;
  onSwitchCamera: () => void;
  onUploadOverlay: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ASPECT_RATIO_CLASSES: Record<AspectRatio, string> = {
  '3:4': 'aspect-[3/4]',
  '1:1': 'aspect-square',
  '9:16': 'aspect-[9/16]',
};

const CameraView: React.FC<CameraViewProps> = (props) => {
  const {
    overlayImage, overlayOpacity, overlayZoom, overlayPosition, showGrid, aspectRatio, zoom, facingMode, flashEnabled, isFlipped, timerSeconds,
    setOverlayOpacity, setOverlayZoom, setOverlayPosition, setShowGrid, setAspectRatio, setZoom, setFlashEnabled, setTimerSeconds,
    onCapture, onSwitchCamera, onUploadOverlay
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [zoomCaps, setZoomCaps] = useState<{min: number, max: number, step: number} | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [lastTouchDistance, setLastTouchDistance] = useState<number>(0);
  const [isZooming, setIsZooming] = useState(false);
  const [countdownActive, setCountdownActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

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
        const capabilities = videoTrack.getCapabilities() as ZoomableMediaTrackCapabilities;
        
        // Check zoom capabilities
        if ('zoom' in (videoTrack.getSettings() as ZoomableMediaTrackSettings)) {
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

        // Check torch (flash) capabilities
        console.log('Camera capabilities:', capabilities);
        if (capabilities.torch !== undefined) {
          console.log('Torch supported:', capabilities.torch);
          setTorchSupported(true);
        } else {
          console.log('Torch not supported');
          setTorchSupported(false);
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

  useEffect(() => {
      if (!stream || !torchSupported) return;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
          const constraints: MediaTrackConstraints = {
            advanced: [{ torch: flashEnabled } as ZoomableMediaTrackConstraintSet]
          };
          videoTrack.applyConstraints(constraints).catch(err => {
            console.warn('Could not apply torch constraint:', err);
          });
      }
  }, [flashEnabled, stream, torchSupported]);

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
      if (isFlipped) {
        context.translate(drawWidth, 0);
        context.scale(-1, 1);
      }
      
      context.drawImage(video, sx, sy, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCapture(dataUrl);
    }
  }, [aspectRatio, onCapture, isFlipped]);

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
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      const touch = e.touches[0];
      setIsDragging(true);
      setIsZooming(false);
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
    
    if (e.touches.length === 1 && isDragging && !isZooming) {
      // Single touch - dragging
      e.preventDefault();
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

  const startCountdown = useCallback(() => {
    if (timerSeconds === 0) {
      handleCapture();
      return;
    }
    
    setCountdownActive(true);
    setCountdown(timerSeconds);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCountdownActive(false);
          // Small delay to show "0" before capture
          setTimeout(() => handleCapture(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timerSeconds, handleCapture]);

  const cancelCountdown = useCallback(() => {
    setCountdownActive(false);
    setCountdown(0);
  }, []);

  const cycleTimer = useCallback(() => {
    const timerOptions = [0, 3, 5, 10];
    const currentIndex = timerOptions.indexOf(timerSeconds);
    const nextIndex = (currentIndex + 1) % timerOptions.length;
    setTimerSeconds(timerOptions[nextIndex]);
  }, [timerSeconds, setTimerSeconds]);

  const handleOverlayWheel = useCallback((e: React.WheelEvent) => {
    if (!overlayImage) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, overlayZoom + delta));
    setOverlayZoom(newZoom);
  }, [overlayImage, overlayZoom, setOverlayZoom]);
  
  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 text-white flex flex-col overflow-hidden">
      <main className="flex-grow flex items-center justify-center relative min-h-0">
        <div className={`w-full h-full max-w-lg relative ${ASPECT_RATIO_CLASSES[aspectRatio]} overflow-hidden rounded-2xl shadow-2xl border border-blue-300/30 backdrop-blur-sm bg-gradient-to-b from-blue-950/50 to-slate-900/50 flex-shrink-0`}
             style={{
               maxHeight: aspectRatio === '9:16' ? 'calc(100vh - 120px)' : 
                         aspectRatio === '1:1' ? 'calc(100vh - 140px)' : 
                         'calc(100vh - 160px)',
               maxWidth: aspectRatio === '9:16' ? 'calc((100vh - 120px) * 9 / 16)' :
                        aspectRatio === '1:1' ? 'calc(100vh - 140px)' :
                        'calc((100vh - 160px) * 3 / 4)'
             }}>
          {isLoading && <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-30"><p>Starting Camera...</p></div>}
          {cameraError && <div className="absolute inset-0 bg-red-900 flex items-center justify-center z-30 p-4 text-center"><p>{cameraError}</p></div>}

          {/* Timer indicator */}
          {timerSeconds > 0 && !countdownActive && (
            <div className="absolute top-4 right-4 z-20 bg-orange-600 px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-white">{timerSeconds}S</span>
            </div>
          )}

          {/* Countdown display */}
          {countdownActive && (
            <div className="absolute inset-0 flex items-center justify-center z-25 bg-black bg-opacity-50">
              <div className="flex flex-col items-center gap-4">
                <div className="text-8xl font-bold text-white animate-pulse">
                  {countdown}
                </div>
                <button 
                  onClick={cancelCountdown}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute top-0 left-0 w-full h-full object-cover" 
            style={{
              transform: `scaleX(${isFlipped ? -1 : 1})`
            }}
          />
          
          {overlayImage && (
            <img 
              src={overlayImage} 
              alt="Pose overlay" 
              className="absolute top-0 left-0 w-full h-full object-contain cursor-move z-10 transition-opacity select-none touch-none" 
              style={{ 
                opacity: overlayOpacity,
                transform: `translate(${overlayPosition.x}px, ${overlayPosition.y}px) scale(${overlayZoom})`,
                transformOrigin: 'center center',
                touchAction: 'none'
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

      <footer className="w-full bg-gradient-to-t from-slate-900/95 via-blue-900/90 to-indigo-900/85 backdrop-blur-md border-t border-blue-300/20 p-3 space-y-2 shadow-lg shadow-blue-500/10">
        {/* Overlay Controls - Elegant */}
        {overlayImage && (
          <div className="space-y-2 bg-blue-950/30 rounded-xl p-2 border border-blue-400/20">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-12 text-blue-200 text-xs font-medium">Pose</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={overlayOpacity} 
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))} 
                className="flex-1 h-2 bg-gradient-to-r from-blue-800 to-indigo-700 rounded-full appearance-none cursor-pointer accent-blue-400" 
              />
              <span className="w-8 text-xs text-blue-200 text-right font-medium">{Math.round(overlayOpacity * 100)}%</span>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={overlayZoom} 
                onChange={(e) => setOverlayZoom(parseFloat(e.target.value))} 
                className="w-20 h-2 bg-gradient-to-r from-blue-800 to-indigo-700 rounded-full appearance-none cursor-pointer accent-blue-400" 
              />
              <button 
                onClick={resetOverlayTransform}
                className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg text-[10px] font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Reset
              </button>
            </div>
          </div>
        )}
        
        {/* Camera Zoom - Elegant */}
        {zoomCaps && (
          <div className="flex items-center gap-3 text-sm bg-blue-950/30 rounded-xl p-2 border border-blue-400/20">
            <span className="w-12 text-blue-200 text-xs font-medium">Zoom</span>
            <input 
              type="range" 
              min={zoomCaps.min} 
              max={zoomCaps.max} 
              step={zoomCaps.step} 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="flex-1 h-2 bg-gradient-to-r from-blue-800 to-indigo-700 rounded-full appearance-none cursor-pointer accent-blue-400" 
            />
            <span className="w-8 text-xs text-blue-200 text-right font-medium">{zoom.toFixed(1)}x</span>
          </div>
        )}
        
        {/* Main Control Buttons - Elegant Row */}
        <div className="flex justify-between items-center py-2 bg-blue-950/40 rounded-xl border border-blue-400/30 shadow-lg">
          <div className="flex items-center gap-2 px-3">
            <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-xl transition-all duration-300 shadow-md ${showGrid ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-400/30' : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-blue-600 hover:to-indigo-600'}`}>
              <Icon name="grid" className="w-4 h-4"/>
            </button>
            <input type="file" accept="image/*" ref={uploadInputRef} onChange={onUploadOverlay} className="hidden" />
            <button onClick={() => uploadInputRef.current?.click()} className="p-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
              <Icon name="upload" className="w-4 h-4"/>
            </button>
            <button 
              onClick={() => setFlashEnabled(!flashEnabled)} 
              className={`p-2 rounded-xl transition-all duration-300 shadow-md ${flashEnabled ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-yellow-400/30' : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-amber-600 hover:to-yellow-600'} ${!torchSupported ? 'opacity-50' : ''}`}
              title={torchSupported ? "Flash" : "Flash not supported"}
            >
              <Icon name="flash" className="w-4 h-4"/>
            </button>
            <button 
              onClick={cycleTimer} 
              className={`p-2 rounded-xl transition-all duration-300 shadow-md ${timerSeconds > 0 ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-400/30' : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-orange-600 hover:to-red-600'}`}
              title={`Timer: ${timerSeconds === 0 ? 'Off' : `${timerSeconds}s`}`}
            >
              <Icon name="timer" className="w-4 h-4"/>
            </button>
          </div>
          
          {/* Aspect Ratio - Elegant */}
          <div className="flex items-center gap-1 text-xs px-3">
            {(['3:4', '1:1', '9:16'] as AspectRatio[]).map(ratio => (
              <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 shadow-sm ${aspectRatio === ratio ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-400/30' : 'bg-gradient-to-r from-slate-700 to-slate-600 text-blue-200 hover:from-blue-600 hover:to-indigo-600'}`}>
                {ratio}
              </button>
            ))}
          </div>
        </div>
        
        {/* Capture Controls - Elegant */}
        <div className="flex justify-center items-center py-3 bg-gradient-to-r from-blue-950/50 via-indigo-950/60 to-blue-950/50 rounded-xl border border-blue-300/20 shadow-xl">
          <div className="flex flex-col items-center mr-8">
            <button onClick={onSwitchCamera} className="w-14 h-14 flex items-center justify-center group" title="Switch Camera">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300 shadow-lg group-active:scale-95">
               <Icon name="switchCamera" className="w-5 h-5"/>
              </div>
            </button>
            <span className="text-xs text-blue-200 mt-1 font-medium">{facingMode === 'user' ? 'Front' : 'Back'}</span>
          </div>
          
          <button 
            onClick={startCountdown} 
            disabled={countdownActive}
            className={`w-18 h-18 rounded-full bg-gradient-to-br from-white via-blue-50 to-white flex items-center justify-center ring-4 ring-blue-400/60 ring-offset-4 ring-offset-transparent transition-all duration-300 shadow-2xl ${countdownActive ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:ring-blue-300/80'}`}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-blue-50 border-3 border-blue-400/60 flex items-center justify-center shadow-inner">
              {timerSeconds > 0 && !countdownActive && (
                <span className="text-xs font-bold text-blue-800">{timerSeconds}s</span>
              )}
            </div>
          </button>
          
          <div className="w-14 ml-8">
            {/* Spacer for symmetry */}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CameraView;
