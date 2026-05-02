import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type Role = "presenter" | "audience";

interface PresenceMember {
  name: string;
  role: Role;
}

export interface Note {
  id: string;
  from: string;
  text: string;
}

interface SessionState {
  code: string | null;
  role: Role | null;
  name: string;
  slideNumber: number;
  voteCount: number;
  totalAudience: number;
  presence: PresenceMember[];
  connected: boolean;
  error: string | null;
  triggerFlash: boolean;
  notes: Note[];
}

interface SessionActions {
  setName: (name: string) => void;
  createSession: () => void;
  joinSession: (code: string) => void;
  voteNext: () => void;
  advanceSlide: () => void;
  resetVotes: () => void;
  leaveSession: () => void;
  clearError: () => void;
  sendNote: (text: string) => void;
  dismissNote: (id: string) => void;
}

const defaultState: SessionState = {
  code: null,
  role: null,
  name: "",
  slideNumber: 1,
  voteCount: 0,
  totalAudience: 0,
  presence: [],
  connected: false,
  error: null,
  triggerFlash: false,
  notes: [],
};

const SessionContext = createContext<SessionState & SessionActions>({
  ...defaultState,
  setName: () => {},
  createSession: () => {},
  joinSession: () => {},
  voteNext: () => {},
  advanceSlide: () => {},
  resetVotes: () => {},
  leaveSession: () => {},
  clearError: () => {},
  sendNote: () => {},
  dismissNote: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

const WS_URL = `wss://${process.env.EXPO_PUBLIC_DOMAIN}/api/ws`;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(defaultState);
  const wsRef = useRef<WebSocket | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRoleRef = useRef<Role | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("slideclicker_name").then((stored) => {
      if (stored) setState((s) => ({ ...s, name: stored }));
    });
  }, []);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(
    (onOpen: () => void) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, connected: true, error: null }));
        onOpen();
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = msg["type"] as string;

        if (type === "session_created") {
          setState((s) => ({
            ...s,
            code: msg["code"] as string,
            role: "presenter",
            slideNumber: (msg["slideNumber"] as number) ?? 1,
            presence: (msg["presence"] as PresenceMember[]) ?? [],
            voteCount: 0,
            totalAudience: 0,
          }));
        } else if (type === "session_joined") {
          setState((s) => ({
            ...s,
            code: msg["code"] as string,
            role: "audience",
            slideNumber: (msg["slideNumber"] as number) ?? 1,
            presence: (msg["presence"] as PresenceMember[]) ?? [],
            voteCount: 0,
          }));
        } else if (type === "presence_update") {
          setState((s) => {
            const presence = (msg["presence"] as PresenceMember[]) ?? [];
            const totalAudience = presence.filter(
              (p) => p.role === "audience",
            ).length;
            return { ...s, presence, totalAudience };
          });
        } else if (type === "vote_update") {
          setState((s) => {
            const voteCount = (msg["voteCount"] as number) ?? 0;
            const totalAudience = (msg["totalAudience"] as number) ?? s.totalAudience;
            const shouldFlash =
              s.role === "presenter" && voteCount > s.voteCount;

            if (shouldFlash) {
              if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
              flashTimeoutRef.current = setTimeout(() => {
                setState((prev) => ({ ...prev, triggerFlash: false }));
              }, 1800);
            }

            return {
              ...s,
              voteCount,
              totalAudience,
              triggerFlash: shouldFlash ? true : s.triggerFlash,
            };
          });
        } else if (type === "slide_advanced") {
          setState((s) => ({
            ...s,
            slideNumber: (msg["slideNumber"] as number) ?? s.slideNumber + 1,
            voteCount: 0,
            totalAudience: (msg["totalAudience"] as number) ?? s.totalAudience,
            triggerFlash: false,
          }));
        } else if (type === "note_received") {
          setState((s) => ({
            ...s,
            notes: [
              ...s.notes,
              {
                id: (msg["id"] as string) ?? `${Date.now()}`,
                from: (msg["from"] as string) ?? "Someone",
                text: (msg["text"] as string) ?? "",
              },
            ],
          }));
        } else if (type === "error") {
          setState((s) => ({
            ...s,
            error: (msg["message"] as string) ?? "Unknown error",
          }));
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        wsRef.current = null;
      };

      ws.onerror = () => {
        setState((s) => ({
          ...s,
          error: "Connection failed. Please try again.",
          connected: false,
        }));
      };
    },
    [],
  );

  const setName = useCallback((name: string) => {
    setState((s) => ({ ...s, name }));
    AsyncStorage.setItem("slideclicker_name", name);
  }, []);

  const createSession = useCallback(() => {
    const name = state.name || "Presenter";
    connect(() => {
      send({ type: "create_session", name });
    });
  }, [state.name, connect, send]);

  const joinSession = useCallback(
    (code: string) => {
      const name = state.name || "Audience";
      connect(() => {
        send({ type: "join_session", code, name });
      });
    },
    [state.name, connect, send],
  );

  const voteNext = useCallback(() => {
    send({ type: "vote_next" });
  }, [send]);

  const advanceSlide = useCallback(() => {
    send({ type: "advance_slide" });
  }, [send]);

  const resetVotes = useCallback(() => {
    send({ type: "reset_votes" });
  }, [send]);

  const leaveSession = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setState((s) => ({ ...defaultState, name: s.name }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const sendNote = useCallback((text: string) => {
    send({ type: "send_note", text });
  }, [send]);

  const dismissNote = useCallback((id: string) => {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  }, []);

  return (
    <SessionContext.Provider
      value={{
        ...state,
        setName,
        createSession,
        joinSession,
        voteNext,
        advanceSlide,
        resetVotes,
        leaveSession,
        clearError,
        sendNote,
        dismissNote,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
