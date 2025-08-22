import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface InstallerProps {
    onInstall: () => void;
    installPrompt: Event | null;
}

const Installer: React.FC<InstallerProps> = ({ onInstall, installPrompt }) => {
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Simple check for iOS devices
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);
    }, []);

    const IosInstructions = () => (
        <div className="bg-gray-800 bg-opacity-80 p-4 rounded-lg text-center mt-6">
            <h3 className="font-semibold text-lg mb-2">Để cài đặt trên iPhone/iPad:</h3>
            <p className="text-sm">1. Nhấn vào biểu tượng Chia sẻ <Icon name="share" className="w-5 h-5 inline-block mx-1" /> trong thanh công cụ của trình duyệt.</p>
            <p className="text-sm mt-2">2. Cuộn xuống và chọn "Thêm vào MH chính".</p>
        </div>
    );

    return (
        <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md">
                <style>{`
                    @keyframes slide-up {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
                `}</style>

                <div className="animate-slide-up">
                    <div className="w-24 h-24 mx-auto mb-4 p-4 bg-gray-900 rounded-3xl flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#iconGradient)" strokeWidth="8"/>
                            <path d="M50 30 V 70 M30 50 H 70" fill="none" stroke="url(#iconGradient)" strokeWidth="6" strokeLinecap="round"/>
                        </svg>
                    </div>

                    <h1 className="text-4xl font-bold mb-2">Pose Perfect</h1>
                    <p className="text-gray-300 text-lg mb-8">
                        Cài đặt ứng dụng để có trải nghiệm tốt nhất, hoạt động ngoại tuyến và truy cập nhanh từ màn hình chính của bạn.
                    </p>
                </div>
                
                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    {installPrompt && !isIOS ? (
                        <button 
                            onClick={onInstall}
                            className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl text-lg hover:bg-blue-700 active:scale-95 transition-all transform duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                        >
                            Cài đặt Ứng dụng
                        </button>
                    ) : (
                        <IosInstructions />
                    )}
                </div>

                <div className="text-gray-500 text-xs mt-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <p>Sau khi cài đặt, hãy mở ứng dụng từ màn hình chính.</p>
                </div>
            </div>
        </div>
    );
};

export default Installer;
