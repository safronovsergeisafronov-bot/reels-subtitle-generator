import { useState, useCallback } from 'react';

const MAX_HISTORY = 50;

export function useHistory(initialState) {
  const [history, setHistory] = useState([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const set = useCallback((newState) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, index + 1);
      newHistory.push(newState);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setIndex((prev) => {
      const newLen = Math.min(prev + 2, MAX_HISTORY);
      return newLen - 1;
    });
  }, [index]);

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, set, undo, redo, canUndo, canRedo };
}
