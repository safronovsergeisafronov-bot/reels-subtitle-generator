import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export function useHistory(initialState) {
  const [index, setIndex] = useState(0);
  const historyRef = useRef([initialState]);

  const state = historyRef.current[index];

  const set = useCallback((newState) => {
    const history = historyRef.current;
    // Discard any future states beyond current index
    const newHistory = history.slice(0, index + 1);
    newHistory.push(newState);

    // Enforce max history limit
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
      historyRef.current = newHistory;
      setIndex(newHistory.length - 1);
    } else {
      historyRef.current = newHistory;
      setIndex(newHistory.length - 1);
    }
  }, [index]);

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(historyRef.current.length - 1, prev + 1));
  }, []);

  const canUndo = index > 0;
  const canRedo = index < historyRef.current.length - 1;

  return { state, set, undo, redo, canUndo, canRedo };
}
