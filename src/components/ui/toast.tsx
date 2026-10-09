"use client";

import { AnimatePresence, m } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { riseIn } from "@/lib/motion";

/** A button on the toast ("Undo", "Open"): pressing it runs it and closes the toast. */
interface ToastAction {
  label: string;
  run: () => void;
}

interface Toast {
  id: number;
  text: string;
  action?: ToastAction;
}

type Show = (text: string, options?: { action?: ToastAction }) => void;

const ToastContext = createContext<Show>(() => {});

/** Short messages at the bottom of the screen (errors, "link copied"), some with one action. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const close = useCallback(
    (id: number) => setToasts((all) => all.filter((x) => x.id !== id)),
    [],
  );
  const show = useCallback<Show>(
    (text, options) => {
      const id = Date.now() + Math.random();
      setToasts((all) => [
        ...all.slice(-2),
        { id, text, action: options?.action },
      ]);
      // one with an action stays a little longer, so there is time to press it
      window.setTimeout(() => close(id), options?.action ? 5500 : 3500);
    },
    [close],
  );
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+var(--dock))] z-[60] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((x) => (
            <m.div
              key={x.id}
              {...riseIn}
              className={
                x.action
                  ? "pointer-events-auto flex max-w-md items-center gap-3 rounded-[20px] bg-ink py-2 pr-2 pl-5 font-medium text-on-ink text-sm shadow-pop"
                  : "pointer-events-auto max-w-md rounded-pill bg-ink px-5 py-3 font-medium text-on-ink text-sm shadow-pop"
              }
            >
              <span>{x.text}</span>
              {x.action ? (
                <button
                  type="button"
                  onClick={() => {
                    x.action?.run();
                    close(x.id);
                  }}
                  className="h-8 shrink-0 rounded-pill bg-on-ink/15 px-3 font-bold transition-colors duration-150 hover:bg-on-ink/25"
                >
                  {x.action.label}
                </button>
              ) : null}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
