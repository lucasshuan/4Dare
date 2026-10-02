"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { riseIn } from "@/lib/motion";

interface Toast {
  id: number;
  text: string;
}

const ToastContext = createContext<(text: string) => void>(() => {});

/** Short messages at the bottom of the screen (errors, "link copied"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { id, text }]);
    window.setTimeout(
      () => setToasts((all) => all.filter((x) => x.id !== id)),
      3500,
    );
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div
              key={x.id}
              {...riseIn}
              className="pointer-events-auto max-w-md rounded-pill bg-ink px-5 py-3 font-medium text-on-ink text-sm shadow-pop"
            >
              {x.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
