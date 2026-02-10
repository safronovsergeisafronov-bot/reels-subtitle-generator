import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave, loadAutoSave } from '../hooks/useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should save data to localStorage after delay', () => {
    const { result } = renderHook(() =>
      useAutoSave('test-key', { value: 42 }, 1000)
    );

    expect(localStorage.getItem('test-key')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem('test-key')).toBe(JSON.stringify({ value: 42 }));
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should debounce saves', () => {
    const { rerender } = renderHook(
      ({ data }) => useAutoSave('test-key', data, 1000),
      { initialProps: { data: 'first' } }
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Update data before timer fires
    rerender({ data: 'second' });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should have saved the latest value
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('second'));
  });

  it('should clear saved data', () => {
    const { result } = renderHook(() =>
      useAutoSave('test-key', 'data', 1000)
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem('test-key')).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(localStorage.getItem('test-key')).toBeNull();
    expect(result.current.lastSaved).toBeNull();
  });

  it('should use custom delay', () => {
    renderHook(() => useAutoSave('test-key', 'data', 5000));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(localStorage.getItem('test-key')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('data'));
  });

  it('should handle localStorage errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useAutoSave('test-key', 'data', 100));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should not throw
    expect(consoleSpy).toHaveBeenCalled();

    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('loadAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when no saved data', () => {
    expect(loadAutoSave('nonexistent')).toBeNull();
  });

  it('should load saved JSON data', () => {
    localStorage.setItem('my-key', JSON.stringify({ items: [1, 2] }));
    const result = loadAutoSave('my-key');
    expect(result).toEqual({ items: [1, 2] });
  });

  it('should return null on invalid JSON', () => {
    localStorage.setItem('bad-key', 'not-json{{{');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = loadAutoSave('bad-key');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should load string data', () => {
    localStorage.setItem('str-key', JSON.stringify('hello'));
    expect(loadAutoSave('str-key')).toBe('hello');
  });

  it('should load array data', () => {
    localStorage.setItem('arr-key', JSON.stringify([1, 2, 3]));
    expect(loadAutoSave('arr-key')).toEqual([1, 2, 3]);
  });
});
