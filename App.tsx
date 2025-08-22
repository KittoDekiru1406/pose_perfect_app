import React, { useState, useCallback } from 'react';
import { AspectRatio } from './types';
import CameraView from './components/CameraView';
import PreviewModal from './components/PreviewModal';

const App: React.FC = () => {
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.3);
  const [overlayZoom, setOverlayZoom] = useState<number>(1);
  const [overlayPosition, setOverlayPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [zoom, setZoom] = useState<number>(1);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleOverlayUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setOverlayImage(e.target?.result as string);
        // Reset overlay transformations when new image is uploaded
        setOverlayZoom(1);
        setOverlayPosition({x: 0, y: 0});
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFlipCamera = useCallback(() => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    setZoom(1); // Reset zoom when flipping camera
  }, []);

  const handleCapture = useCallback((imageSrc: string) => {
    setCapturedImage(imageSrc);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
  }, []);
  
  const handleSave = useCallback(() => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `pose-perfect-${new Date().toISOString()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [capturedImage]);

  const handleShare = useCallback(async () => {
    if (!capturedImage) return;

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `pose-perfect-${new Date().toISOString()}.jpeg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Pose Perfect Photo',
          text: 'Check out this photo I took!',
        });
      } else {
        alert('Sharing not supported on this browser. Please save the image instead.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Could not share the image. Please try saving it.');
    }
  }, [capturedImage]);

  if (capturedImage) {
    return (
      <PreviewModal 
        image={capturedImage}
        onClose={handleRetake}
        onSave={handleSave}
        onShare={handleShare}
      />
    );
  }

  return (
    <CameraView
      overlayImage={overlayImage}
      overlayOpacity={overlayOpacity}
      overlayZoom={overlayZoom}
      overlayPosition={overlayPosition}
      showGrid={showGrid}
      aspectRatio={aspectRatio}
      zoom={zoom}
      facingMode={facingMode}
      flashEnabled={flashEnabled}
      setOverlayOpacity={setOverlayOpacity}
      setOverlayZoom={setOverlayZoom}
      setOverlayPosition={setOverlayPosition}
      setShowGrid={setShowGrid}
      setAspectRatio={setAspectRatio}
      setZoom={setZoom}
      setFlashEnabled={setFlashEnabled}
      onCapture={handleCapture}
      onFlipCamera={handleFlipCamera}
      onUploadOverlay={handleOverlayUpload}
    />
  );
};

export default App;