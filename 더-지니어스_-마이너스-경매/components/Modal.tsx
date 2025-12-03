
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-800 w-full max-w-4xl rounded-2xl border border-zinc-600 shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-700 bg-zinc-900">
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition rounded-full p-2 hover:bg-zinc-700"
          >
            <X size={28} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
