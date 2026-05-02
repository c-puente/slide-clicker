import { Router, type IRouter } from "express";
import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../lib/logger";

export const sessionsRouter: IRouter = Router();

// ── security limits ──────────────────────────────────────────────────────────
const MAX_SESSIONS             = 500;
const MAX_AUDIENCE_PER_SESSION = 100;
const MAX_NAME_LENGTH          = 50;
const MAX_NOTE_LENGTH          = 280;
const MSG_RATE_WINDOW_MS       = 2_000;
const MSG_RATE_MAX             = 30;
const NOTE_RATE_WINDOW_MS      = 60_000;
const NOTE_RATE_MAX            = 10;
const MAX_PAYLOAD_BYTES        = 8_192;

// ── types ────────────────────────────────────────────────────────────────────
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
  locked: boolean;
  notesDisabled: boolean;
}

// ── state ────────────────────────────────────────────────────────────────────
const sessions = new Map<string, Session>();

// ── helpers ──────────────────────────────────────────────────────────────────
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
  return Array.from(session.clients.values()).filter(
    (c) => c.role === "audience",
  ).length;
}

// ── WebSocket server ─────────────────────────────────────────────────────────
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
    let msgWindowStart = Date.now();

    let noteMsgCount = 0;
    let noteWindowStart = Date.now();

    ws.on("message", (raw) => {
      // ── rate limit ─────────────────────────────────────────────────────────
      const now = Date.now();
      if (now - msgWindowStart > MSG_RATE_WINDOW_MS) {
        msgCount = 0;
        msgWindowStart = now;
      }
      if (++msgCount > MSG_RATE_MAX) {
        ws.close(1008, "Rate limit exceeded");
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg["type"] as string;

      // ── create_session ─────────────────────────────────────────────────────
      if (type === "create_session") {
        if (clientId) return;
        if (sessions.size >= MAX_SESSIONS) {
          ws.send(JSON.stringify({ type: "error", message: "Server at capacity. Please try again later." }));
          return;
        }

        const name = sanitizeName(msg["name"]);
        const code = generateCode();
        clientId = `${code}-${Date.now()}`;
        sessionCode = code;

        const session: Session = {
          code,
          clients: new Map(),
          slideNumber: 1,
          voteCount: 0,
          voterIds: new Set(),
          locked: false,
          notesDisabled: false,
        };
        const client: Client = { ws, name, role: "presenter", sessionCode: code, memberId: generateMemberId() };
        session.clients.set(clientId, client);
        sessions.set(code, session);

        ws.send(JSON.stringify({
          type: "session_created",
          code,
          slideNumber: session.slideNumber,
          presence: buildPresenceList(session),
          roomLocked: false,
          notesDisabled: false,
        }));
        logger.info({ code, name }, "Session created");

      // ── join_session ───────────────────────────────────────────────────────
      } else if (type === "join_session") {
        if (clientId) return;

        const code = (msg["code"] as string)?.toUpperCase().trim();
        const name = sanitizeName(msg["name"]);

        const session = sessions.get(code);
        if (!session) {
          ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
          return;
        }

        if (session.locked) {
          ws.send(JSON.stringify({ type: "error", message: "This session is locked" }));
          return;
        }

        if (audienceCount(session) >= MAX_AUDIENCE_PER_SESSION) {
          ws.send(JSON.stringify({ type: "error", message: "Session is full." }));
          return;
        }

        clientId = `${code}-${Date.now()}-${Math.random()}`;
        sessionCode = code;

        const client: Client = { ws, name, role: "audience", sessionCode: code, memberId: generateMemberId() };
        session.clients.set(clientId, client);

        ws.send(JSON.stringify({
          type: "session_joined",
          code,
          slideNumber: session.slideNumber,
          presence: buildPresenceList(session),
          roomLocked: session.locked,
          notesDisabled: session.notesDisabled,
        }));

        broadcast(session, { type: "presence_update", presence: buildPresenceList(session) }, clientId);
        logger.info({ code, name }, "Audience joined");

      // ── vote_next ──────────────────────────────────────────────────────────
      } else if (type === "vote_next") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const voter = session.clients.get(clientId);
        if (!voter || voter.role !== "audience") return;

        if (session.voterIds.has(clientId)) return;
        session.voterIds.add(clientId);
        session.voteCount = session.voterIds.size;

        broadcastAll(session, {
          type: "vote_update",
          voteCount: session.voteCount,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, voteCount: session.voteCount }, "Vote cast");

      // ── unvote_next ────────────────────────────────────────────────────────
      } else if (type === "unvote_next") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
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

      // ── advance_slide ──────────────────────────────────────────────────────
      } else if (type === "advance_slide") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        session.slideNumber += 1;
        session.voteCount = 0;
        session.voterIds.clear();

        broadcastAll(session, {
          type: "slide_advanced",
          slideNumber: session.slideNumber,
          voteCount: 0,
          totalAudience: audienceCount(session),
        });
        logger.info({ sessionCode, slideNumber: session.slideNumber }, "Slide advanced");

      // ── reset_votes ────────────────────────────────────────────────────────
      } else if (type === "reset_votes") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        session.voteCount = 0;
        session.voterIds.clear();

        broadcastAll(session, {
          type: "vote_update",
          voteCount: 0,
          totalAudience: audienceCount(session),
        });

      // ── set_room_locked ────────────────────────────────────────────────────
      } else if (type === "set_room_locked") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        session.locked = (msg["locked"] as boolean) === true;

        broadcastAll(session, {
          type: "room_settings",
          roomLocked: session.locked,
          notesDisabled: session.notesDisabled,
        });
        logger.info({ sessionCode, locked: session.locked }, "Room lock changed");

      // ── set_notes_disabled ─────────────────────────────────────────────────
      } else if (type === "set_notes_disabled") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        session.notesDisabled = (msg["disabled"] as boolean) === true;

        broadcastAll(session, {
          type: "room_settings",
          roomLocked: session.locked,
          notesDisabled: session.notesDisabled,
        });
        logger.info({ sessionCode, notesDisabled: session.notesDisabled }, "Notes setting changed");

      // ── remove_member ──────────────────────────────────────────────────────
      } else if (type === "remove_member") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "presenter") return;

        const targetMemberId = msg["memberId"] as string;
        let targetClientId: string | null = null;
        let targetClient: Client | null = null;

        for (const [cid, c] of session.clients) {
          if (c.memberId === targetMemberId && c.role === "audience") {
            targetClientId = cid;
            targetClient = c;
            break;
          }
        }

        if (!targetClientId || !targetClient) return;

        // Notify the removed client before closing
        if (targetClient.ws.readyState === WebSocket.OPEN) {
          targetClient.ws.send(JSON.stringify({ type: "removed_from_session" }));
        }

        // Clean up
        const hadVoted = session.voterIds.has(targetClientId);
        session.clients.delete(targetClientId);
        session.voterIds.delete(targetClientId);
        session.voteCount = session.voterIds.size;

        // Close their connection
        try { targetClient.ws.close(1000, "Removed by presenter"); } catch {}

        const total = audienceCount(session);
        broadcast(session, { type: "presence_update", presence: buildPresenceList(session) });
        if (hadVoted) {
          broadcastAll(session, { type: "vote_update", voteCount: session.voteCount, totalAudience: total });
        }

        logger.info({ sessionCode, removed: targetClient.name }, "Member removed");

      // ── send_note ──────────────────────────────────────────────────────────
      } else if (type === "send_note") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "audience") return;

        if (session.notesDisabled) return;

        const noteNow = Date.now();
        if (noteNow - noteWindowStart > NOTE_RATE_WINDOW_MS) {
          noteMsgCount = 0;
          noteWindowStart = noteNow;
        }
        if (++noteMsgCount > NOTE_RATE_MAX) return;

        const text = ((msg["text"] as string) ?? "")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          .trim()
          .slice(0, MAX_NOTE_LENGTH);
        if (!text) return;

        for (const client of session.clients.values()) {
          if (client.role === "presenter" && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: "note_received",
              from: sender.name,
              text,
              id: `${clientId}-${Date.now()}`,
            }));
          }
        }

        logger.info({ sessionCode, from: sender.name }, "Note sent to presenter");
      }
    });

    ws.on("close", () => {
      if (!sessionCode || !clientId) return;
      const session = sessions.get(sessionCode);
      if (!session) return;

      const hadVoted = session.voterIds.has(clientId);
      session.clients.delete(clientId);
      session.voterIds.delete(clientId);
      session.voteCount = session.voterIds.size;

      if (session.clients.size === 0) {
        sessions.delete(sessionCode);
        logger.info({ sessionCode }, "Session ended (empty)");
      } else {
        const total = audienceCount(session);
        broadcast(session, { type: "presence_update", presence: buildPresenceList(session) });
        if (hadVoted) {
          broadcastAll(session, { type: "vote_update", voteCount: session.voteCount, totalAudience: total });
        }
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  logger.info("WebSocket server attached");
}
