import React from 'react';
import Icon from './Icon';

interface PreviewModalProps {
  image: string;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ image, onClose, onSave, onShare }) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-in-out; }
      `}</style>
      <div className="flex-grow flex items-center justify-center p-4 min-h-0">
        <img src={image} alt="Captured preview" className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
      <div className="bg-black bg-opacity-30 p-4 flex justify-around items-center">
        <button onClick={onClose} className="flex flex-col items-center text-white space-y-1 p-2 rounded-lg transition-colors hover:bg-white/10 active:bg-white/20">
          <Icon name="retake" className="w-8 h-8" />
          <span className="text-xs font-medium">Retake</span>
        </button>
        <button onClick={onSave} className="flex flex-col items-center text-white space-y-1 p-2 rounded-lg transition-colors hover:bg-white/10 active:bg-white/20">
          <Icon name="save" className="w-8 h-8" />
          <span className="text-xs font-medium">Save</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center text-white space-y-1 p-2 rounded-lg transition-colors hover:bg-white/10 active:bg-white/20">
          <Icon name="share" className="w-8 h-8" />
          <span className="text-xs font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};

export default PreviewModal;
