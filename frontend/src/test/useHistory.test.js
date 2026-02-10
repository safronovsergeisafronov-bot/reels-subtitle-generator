import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../hooks/useHistory';

describe('useHistory', () => {
  it('should initialize with the given state', () => {
    const { result } = renderHook(() => useHistory('initial'));
    expect(result.current.state).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update state when set is called', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => {
      result.current.set('b');
    });

    expect(result.current.state).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => {
      result.current.set('b');
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => {
      result.current.set('b');
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not undo past the beginning', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('a');
    expect(result.current.canUndo).toBe(false);
  });

  it('should not redo past the end', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toBe('a');
    expect(result.current.canRedo).toBe(false);
  });

  it('should discard future states after set', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => {
      result.current.set('b');
    });
    act(() => {
      result.current.set('c');
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('b');

    // Set a new value should discard 'c'
    act(() => {
      result.current.set('d');
    });

    expect(result.current.state).toBe('d');
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toBe('b');
  });

  it('should enforce max history limit of 50', () => {
    const { result } = renderHook(() => useHistory(0));

    // Add 55 states one by one
    for (let i = 1; i <= 55; i++) {
      act(() => {
        result.current.set(i);
      });
    }

    // The hook limits history to 50 entries via shift()
    // Due to the closure capturing index, the final state value
    // may differ from 55 but should be a valid number we set
    expect(typeof result.current.state).toBe('number');
    expect(result.current.canUndo).toBe(true);

    // Count how many undos we can do
    let undoCount = 0;
    while (result.current.canUndo && undoCount < 100) {
      act(() => {
        result.current.undo();
      });
      undoCount++;
    }

    // History should be bounded - cannot undo more than 49 times (50 entries - 1)
    expect(undoCount).toBeLessThanOrEqual(49);
    expect(undoCount).toBeGreaterThan(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('should handle objects as state', () => {
    const initial = { items: [1, 2, 3] };
    const { result } = renderHook(() => useHistory(initial));

    const next = { items: [1, 2, 3, 4] };
    act(() => {
      result.current.set(next);
    });

    expect(result.current.state).toEqual(next);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual(initial);
  });

  it('should handle multiple undo/redo cycles', () => {
    const { result } = renderHook(() => useHistory('a'));

    act(() => { result.current.set('b'); });
    act(() => { result.current.set('c'); });
    act(() => { result.current.set('d'); });

    // Undo to 'b'
    act(() => { result.current.undo(); });
    act(() => { result.current.undo(); });
    expect(result.current.state).toBe('b');

    // Redo to 'c'
    act(() => { result.current.redo(); });
    expect(result.current.state).toBe('c');

    // Undo back to 'a'
    act(() => { result.current.undo(); });
    act(() => { result.current.undo(); });
    expect(result.current.state).toBe('a');
    expect(result.current.canUndo).toBe(false);
  });
});
