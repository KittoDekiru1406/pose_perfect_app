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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 z-50 flex flex-col animate-fade-in">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-in-out; }
      `}</style>
      <div className="flex-grow flex items-center justify-center p-6 min-h-0">
        <img src={image} alt="Captured preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-blue-300/20" />
      </div>
      <div className="bg-gradient-to-t from-slate-900/95 via-blue-900/90 to-indigo-900/85 backdrop-blur-md border-t border-blue-300/20 p-6 flex justify-around items-center shadow-lg shadow-blue-500/10">
        <button onClick={onClose} className="flex flex-col items-center text-blue-100 space-y-2 p-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 active:scale-95 shadow-md">
          <Icon name="retake" className="w-8 h-8" />
          <span className="text-sm font-medium">Retake</span>
        </button>
        <button onClick={onSave} className="flex flex-col items-center text-blue-100 space-y-2 p-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 active:scale-95 shadow-md">
          <Icon name="save" className="w-8 h-8" />
          <span className="text-sm font-medium">Save</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center text-blue-100 space-y-2 p-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-600 active:scale-95 shadow-md">
          <Icon name="share" className="w-8 h-8" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};

export default PreviewModal;
