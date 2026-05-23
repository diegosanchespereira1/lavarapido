"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Ctx = {
  queueCount: number;
  setQueueCount: Dispatch<SetStateAction<number>>;
};

const BoardQueueContext = createContext<Ctx | null>(null);

export function BoardQueueProvider({ children }: { children: ReactNode }) {
  const [queueCount, setQueueCount] = useState(0);

  const value = useMemo(
    () => ({ queueCount, setQueueCount }),
    [queueCount]
  );

  return (
    <BoardQueueContext.Provider value={value}>{children}</BoardQueueContext.Provider>
  );
}

export function useBoardQueue() {
  const ctx = useContext(BoardQueueContext);
  if (!ctx)
    throw new Error("useBoardQueue must be used dentro de BoardQueueProvider");
  return ctx;
}

/** Sincroniza contagem quando o Quadro faz polling. */
export function BoardQueueSync({ count }: { count: number }) {
  const { setQueueCount } = useBoardQueue();
  useEffect(() => {
    setQueueCount(count);
  }, [count, setQueueCount]);
  return null;
}
