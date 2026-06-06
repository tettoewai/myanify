"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getLoginPromptCopy,
  getLoginUrl,
  setLoginPromptHandler,
  type LoginPromptReason,
} from "@/lib/require-login";

interface LoginPromptContextValue {
  promptLogin: (callbackPath?: string, reason?: LoginPromptReason) => void;
}

const LoginPromptContext = createContext<LoginPromptContextValue | null>(null);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [callbackPath, setCallbackPath] = useState<string | null>(null);
  const [reason, setReason] = useState<LoginPromptReason>("default");

  const promptLogin = useCallback(
    (path?: string, nextReason: LoginPromptReason = "default") => {
      const resolvedPath =
        path ?? `${window.location.pathname}${window.location.search}`;
      setCallbackPath(resolvedPath);
      setReason(nextReason);
      setOpen(true);
    },
    [],
  );

  useEffect(() => {
    setLoginPromptHandler((path, nextReason) => {
      promptLogin(path, nextReason);
    });

    return () => setLoginPromptHandler(null);
  }, [promptLogin]);

  const handleConfirm = () => {
    if (!callbackPath) return;
    setOpen(false);
    window.location.href = getLoginUrl(callbackPath);
  };

  const copy = getLoginPromptCopy(reason);

  return (
    <LoginPromptContext.Provider value={{ promptLogin }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Continue to login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt() {
  const context = useContext(LoginPromptContext);
  if (!context) {
    throw new Error("useLoginPrompt must be used within LoginPromptProvider");
  }
  return context;
}
