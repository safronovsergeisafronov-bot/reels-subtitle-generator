import { useState, useEffect, useRef, useCallback } from 'react';

export function useAutoSave(key, data, delay = 2000) {
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        setLastSaved(new Date());
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [key, data, delay]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setLastSaved(null);
  }, [key]);

  return { lastSaved, clear };
}

export function loadAutoSave(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.error('Failed to load auto-save:', err);
    return null;
  }
}
