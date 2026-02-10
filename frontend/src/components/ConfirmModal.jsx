import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, { title = 'Подтверждение', confirmText = 'Да', cancelText = 'Отмена', destructive = false } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ type: 'confirm', title, message, confirmText, cancelText, destructive });
    });
  }, []);

  const prompt = useCallback((message, { title = 'Введите значение', defaultValue = '', confirmText = 'OK', cancelText = 'Отмена' } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ type: 'prompt', title, message, defaultValue, confirmText, cancelText });
    });
  }, []);

  const handleClose = useCallback((result) => {
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    setModal(null);
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, prompt }}>
      {children}
      {modal && (
        <ConfirmModalInner modal={modal} onClose={handleClose} />
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

function ConfirmModalInner({ modal, onClose }) {
  const [inputValue, setInputValue] = useState(modal.defaultValue || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (modal.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [modal.type]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose(modal.type === 'prompt' ? null : false);
      }
      if (e.key === 'Enter' && modal.type === 'prompt') {
        onClose(inputValue.trim() || null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal, inputValue, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label={modal.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(modal.type === 'prompt' ? null : false);
      }}
    >
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm mx-4 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {modal.destructive && <AlertTriangle size={18} className="text-red-400" />}
            <h3 className="text-base font-bold text-white">{modal.title}</h3>
          </div>
          <button
            onClick={() => onClose(modal.type === 'prompt' ? null : false)}
            className="text-gray-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-4">{modal.message}</p>

        {modal.type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors mb-4"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onClose(modal.type === 'prompt' ? null : false)}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {modal.cancelText}
          </button>
          <button
            onClick={() => onClose(modal.type === 'prompt' ? (inputValue.trim() || null) : true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              modal.destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {modal.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModalInner;
