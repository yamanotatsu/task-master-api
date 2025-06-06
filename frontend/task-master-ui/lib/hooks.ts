import { useCallback, useEffect, useRef, useState } from "react";

/**
 * デバウンス処理を行うカスタムフック
 * @param value 監視する値
 * @param delay デバウンスの遅延時間（ミリ秒）
 * @returns デバウンスされた値
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 楽観的更新を行うカスタムフック
 * @param initialValue 初期値
 * @returns [値, 楽観的更新関数, リバート関数]
 */
export function useOptimisticUpdate<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const previousValueRef = useRef<T>(initialValue);

  const optimisticUpdate = useCallback((newValue: T) => {
    previousValueRef.current = value;
    setValue(newValue);
  }, [value]);

  const revert = useCallback(() => {
    setValue(previousValueRef.current);
  }, []);

  return [value, optimisticUpdate, revert] as const;
}

/**
 * Intersection Observerを使用した遅延ローディングフック
 * @param options IntersectionObserverのオプション
 * @returns [ref, isIntersecting]
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isIntersecting];
}

/**
 * ローカルストレージの状態を管理するフック
 * @param key ストレージのキー
 * @param initialValue 初期値
 * @returns [値, 値を設定する関数]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}