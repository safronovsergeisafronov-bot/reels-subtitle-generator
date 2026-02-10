import React, { useState, useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: ['Space'], description: 'Play / Pause' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'C'], description: 'Copy subtitle (Timeline)' },
  { keys: ['Ctrl', 'V'], description: 'Paste subtitle (Timeline)' },
  { keys: ['Delete'], description: 'Remove subtitle (Timeline)' },
  { keys: ['?'], description: 'Show shortcuts' },
  { keys: ['Escape'], description: 'Close modal' },
];

const KeyBadge = ({ children }) => (
  <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-zinc-700 border border-zinc-600 rounded-md text-xs font-mono text-zinc-200 shadow-[0_1px_0_1px_rgba(0,0,0,0.3)]">
    {children}
  </span>
);

const KeyboardShortcuts = ({ isOpen: externalIsOpen, onClose }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const close = onClose || (() => setInternalIsOpen(false));
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      requestAnimationFrame(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector('button');
          if (firstFocusable) firstFocusable.focus();
        }
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when typing in inputs
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        if (externalIsOpen === undefined) {
          setInternalIsOpen(true);
        }
      }

      if (e.key === 'Escape' && isOpen) {
        close();
      }

      // Trap focus within modal
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, externalIsOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 modal-overlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div ref={modalRef} className="bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl w-[440px] max-h-[80vh] overflow-hidden modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-zinc-400" />
            <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={close}
            className="text-zinc-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Close keyboard shortcuts"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6">
          <div className="flex flex-col gap-3">
            {shortcuts.map((shortcut, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm text-zinc-300">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIdx) => (
                    <React.Fragment key={keyIdx}>
                      {keyIdx > 0 && (
                        <span className="text-zinc-600 text-xs mx-0.5">+</span>
                      )}
                      <KeyBadge>{key}</KeyBadge>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-[10px] text-zinc-500 text-center">
            Press <KeyBadge>Esc</KeyBadge> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
