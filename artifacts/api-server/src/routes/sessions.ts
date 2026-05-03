import { Router, type IRouter } from "express";
import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../lib/logger";

export const sessionsRouter: IRouter = Router();

const MAX_SESSIONS = 500;
const MAX_AUDIENCE_PER_SESSION = 100;
const MAX_NAME_LENGTH = 50;
const MAX_NOTE_LENGTH = 280;
const MSG_RATE_WINDOW_MS = 2_000;
const MSG_RATE_MAX = 30;
const NOTE_RATE_WINDOW_MS = 60_000;
const NOTE_RATE_MAX = 10;
const MAX_PAYLOAD_BYTES = 8_192;

interface Client {
  ws: WebSocket;
  name: string;
  role: "presenter" | "audience";
  sessionCode: string;
  memberId: string;
}

interface Session {
  code: string;
  clients: Map<string, Client>;
  slideNumber: number;
  voteCount: number;
  voterIds: Set<string>;
  prevVoteCount: number;
  prevVoterIds: Set<string>;
  locked: boolean;
  notesDisabled: boolean;
}

const sessions = new Map<string, Session>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return sessions.has(code) ? generateCode() : code;
}

function generateMemberId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function sanitizeName(raw: unknown): string {
  const s = (typeof raw === "string" ? raw : "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
  return s.slice(0, MAX_NAME_LENGTH) || "Anonymous";
}

function broadcast(session: Session, message: object, excludeId?: string) {
  const data = JSON.stringify(message);
  for (const [id, client] of session.clients) {
    if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function broadcastAll(session: Session, message: object) {
  const data = JSON.stringify(message);
  for (const client of session.clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function buildPresenceList(session: Session) {
  return Array.from(session.clients.values()).map((c) => ({
    id: c.memberId,
    name: c.name,
    role: c.role,
  }));
}

function audienceCount(session: Session): number {
  return Array.from(session.clients.values()).filter((c) => c.role === "audience").length;
}

export function attachWebSocketServer(server: import("http").Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

  server.on(
    "upgrade",
    (req: IncomingMessage, socket: import("net").Socket, head: Buffer) => {
      if (req.url?.startsWith("/api/ws")) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      } else {
        socket.destroy();
      }
    },
  );

  wss.on("connection", (ws: WebSocket) => {
    let clientId: string | null = null;
    let sessionCode: string | null = null;

    let msgCount = 0;
    let windowStart = Date.now();
    let noteCount = 0;
    let noteWindowStart = Date.now();

    function closeWith(code: number, reason: string) {
      try { ws.close(code, reason); } catch {}
    }

    function getSession() {
      return sessionCode ? sessions.get(sessionCode) : undefined;
    }

    ws.on("message", (raw) => {
      const now = Date.now();
      if (now - windowStart > MSG_RATE_WINDOW_MS) {
        windowStart = now;
        msgCount = 0;
      }
      if (++msgCount > MSG_RATE_MAX) return closeWith(1008, "Rate limit exceeded");

      let msg: { type?: string; [key: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const type = msg.type;

      if (type === "vote_next") {
        if (!sessionCode || !clientId) return;
        const session = getSession();
        if (!session) return;
        const voter = session.clients.get(clientId);
        if (!voter || voter.role !== "audience") return;

        if (session.prevVoterIds.has(clientId)) {
          session.prevVoterIds.delete(clientId);
          session.prevVoteCount = session.prevVoterIds.size;
          broadcastAll(session, {
            type: "prev_vote_update",
            prevVoteCount: session.prevVoteCount,
            totalAudience: audienceCount(session),
          });
        }

        if (session.voterIds.has(clientId)) return;
        session.voterIds.add(clientId);
        session.voteCount = session.voterIds.size;
        broadcastAll(session, {
          type: "vote_update",
          voteCount: session.voteCount,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, voteCount: session.voteCount }, "Vote cast");
      } else if (type === "unvote_next") {
        if (!sessionCode || !clientId) return;
        const session = getSession();
        if (!session) return;
        const voter = session.clients.get(clientId);
        if (!voter || voter.role !== "audience") return;

        if (!session.voterIds.has(clientId)) return;
        session.voterIds.delete(clientId);
        session.voteCount = session.voterIds.size;
        broadcastAll(session, {
          type: "vote_update",
          voteCount: session.voteCount,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, voteCount: session.voteCount }, "Vote cancelled");
      } else if (type === "vote_prev") {
        if (!sessionCode || !clientId) return;
        const session = getSession();
        if (!session) return;
        const voter = session.clients.get(clientId);
        if (!voter || voter.role !== "audience") return;

        if (session.voterIds.has(clientId)) {
          session.voterIds.delete(clientId);
          session.voteCount = session.voterIds.size;
          broadcastAll(session, {
            type: "vote_update",
            voteCount: session.voteCount,
            totalAudience: audienceCount(session),
          });
        }

        if (session.prevVoterIds.has(clientId)) return;
        session.prevVoterIds.add(clientId);
        session.prevVoteCount = session.prevVoterIds.size;
        broadcastAll(session, {
          type: "prev_vote_update",
          prevVoteCount: session.prevVoteCount,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, prevVoteCount: session.prevVoteCount }, "Prev vote cast");
      } else if (type === "unvote_prev") {
        if (!sessionCode || !clientId) return;
        const session = getSession();
        if (!session) return;
        const voter = session.clients.get(clientId);
        if (!voter || voter.role !== "audience") return;

        if (!session.prevVoterIds.has(clientId)) return;
        session.prevVoterIds.delete(clientId);
        session.prevVoteCount = session.prevVoterIds.size;
        broadcastAll(session, {
          type: "prev_vote_update",
          prevVoteCount: session.prevVoteCount,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, prevVoteCount: session.prevVoteCount }, "Prev vote cancelled");
      } else if (type === "advance_slide") {
        if (!sessionCode || !clientId) return;
        const session = getSession();
        if (!session) return;
        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        session.slideNumber += 1;
        session.voteCount = 0;
        session.voterIds.clear();
        session.prevVoteCount = 0;
        session.prevVoterIds.clear();
        broadcastAll(session, {
          type: "slide_advanced",
          slideNumber: session.slideNumber,
          voteCount: 0,
          prevVoteCount: 0,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, slideNumber: session.slideNumber }, "Slide advanced");
      } else if (type === "go_back") {
        if (!sessionCode || !clientId) return;
        const session = getSession();
        if (!session) return;
        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        session.slideNumber = Math.max(1, session.slideNumber - 1);
        session.voteCount = 0;
        session.voterIds.clear();
        session.prevVoteCount = 0;
        session.prevVoterIds.clear();
        broadcastAll(session, {
          type: "slide_went_back",
          slideNumber: session.slideNumber,
          voteCount: 0,
          prevVoteCount: 0,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, slideNumber: session.slideNumber }, "Slide went back");
      }
    });
  });
}
