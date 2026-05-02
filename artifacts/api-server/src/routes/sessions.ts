import { Router, type IRouter } from "express";
import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../lib/logger";

export const sessionsRouter: IRouter = Router();

interface Client {
  ws: WebSocket;
  name: string;
  role: "presenter" | "audience";
  sessionCode: string;
}

interface Session {
  code: string;
  clients: Map<string, Client>;
  slideNumber: number;
  voteCount: number;
  voterIds: Set<string>;
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
    name: c.name,
    role: c.role,
  }));
}

export function attachWebSocketServer(server: import("http").Server) {
  const wss = new WebSocketServer({ noServer: true });

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

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg["type"] as string;

      if (type === "create_session") {
        const name = (msg["name"] as string) ?? "Presenter";
        const code = generateCode();
        clientId = `${code}-${Date.now()}`;
        sessionCode = code;

        const session: Session = {
          code,
          clients: new Map(),
          slideNumber: 1,
          voteCount: 0,
          voterIds: new Set(),
        };
        const client: Client = { ws, name, role: "presenter", sessionCode: code };
        session.clients.set(clientId, client);
        sessions.set(code, session);

        ws.send(
          JSON.stringify({
            type: "session_created",
            code,
            slideNumber: session.slideNumber,
            presence: buildPresenceList(session),
          }),
        );
        logger.info({ code, name }, "Session created");
      } else if (type === "join_session") {
        const code = (msg["code"] as string)?.toUpperCase().trim();
        const name = (msg["name"] as string) ?? "Audience";

        const session = sessions.get(code);
        if (!session) {
          ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
          return;
        }

        clientId = `${code}-${Date.now()}-${Math.random()}`;
        sessionCode = code;

        const client: Client = { ws, name, role: "audience", sessionCode: code };
        session.clients.set(clientId, client);

        ws.send(
          JSON.stringify({
            type: "session_joined",
            code,
            slideNumber: session.slideNumber,
            presence: buildPresenceList(session),
          }),
        );

        broadcast(
          session,
          {
            type: "presence_update",
            presence: buildPresenceList(session),
          },
          clientId,
        );

        logger.info({ code, name }, "Audience joined");
      } else if (type === "vote_next") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        if (session.voterIds.has(clientId)) return;
        session.voterIds.add(clientId);
        session.voteCount = session.voterIds.size;

        const totalAudience = Array.from(session.clients.values()).filter(
          (c) => c.role === "audience",
        ).length;

        broadcastAll(session, {
          type: "vote_update",
          voteCount: session.voteCount,
          totalAudience,
        });

        logger.info({ sessionCode, voteCount: session.voteCount }, "Vote cast");
      } else if (type === "unvote_next") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        if (!session.voterIds.has(clientId)) return;
        session.voterIds.delete(clientId);
        session.voteCount = session.voterIds.size;

        const totalAudience = Array.from(session.clients.values()).filter(
          (c) => c.role === "audience",
        ).length;

        broadcastAll(session, {
          type: "vote_update",
          voteCount: session.voteCount,
          totalAudience,
        });

        logger.info({ sessionCode, voteCount: session.voteCount }, "Vote cancelled");
      } else if (type === "advance_slide") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        session.slideNumber += 1;
        session.voteCount = 0;
        session.voterIds.clear();

        const totalAudience = Array.from(session.clients.values()).filter(
          (c) => c.role === "audience",
        ).length;

        broadcastAll(session, {
          type: "slide_advanced",
          slideNumber: session.slideNumber,
          voteCount: 0,
          totalAudience,
        });

        logger.info(
          { sessionCode, slideNumber: session.slideNumber },
          "Slide advanced",
        );
      } else if (type === "reset_votes") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        session.voteCount = 0;
        session.voterIds.clear();
        const totalAudience = Array.from(session.clients.values()).filter(
          (c) => c.role === "audience",
        ).length;

        broadcastAll(session, {
          type: "vote_update",
          voteCount: 0,
          totalAudience,
        });
      } else if (type === "send_note") {
        if (!sessionCode || !clientId) return;
        const session = sessions.get(sessionCode);
        if (!session) return;

        const sender = session.clients.get(clientId);
        if (!sender || sender.role !== "audience") return;

        const text = ((msg["text"] as string) ?? "").trim().slice(0, 280);
        if (!text) return;

        for (const client of session.clients.values()) {
          if (client.role === "presenter" && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(
              JSON.stringify({
                type: "note_received",
                from: sender.name,
                text,
                id: `${clientId}-${Date.now()}`,
              }),
            );
          }
        }

        logger.info({ sessionCode, from: sender.name }, "Note sent to presenter");
      }
    });

    ws.on("close", () => {
      if (!sessionCode || !clientId) return;
      const session = sessions.get(sessionCode);
      if (!session) return;

      session.clients.delete(clientId);

      if (session.clients.size === 0) {
        sessions.delete(sessionCode);
        logger.info({ sessionCode }, "Session ended (empty)");
      } else {
        broadcast(session, {
          type: "presence_update",
          presence: buildPresenceList(session),
        });
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  logger.info("WebSocket server attached");
}
