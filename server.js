const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const chessSockets = new Map();
  const publishChessMatchUpdate = (matchId) => {
    const subscribers = chessSockets.get(matchId);
    if (!subscribers) return;
    const payload = JSON.stringify({ type: "match-updated", matchId });
    for (const socket of subscribers) if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  };
  global.publishChessMatchUpdate = publishChessMatchUpdate;
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  const chessSocketServer = new WebSocketServer({ noServer: true });
  chessSocketServer.on("connection", (socket) => {
    let subscribedMatchId = null;
    socket.on("message", (raw) => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (message?.type !== "subscribe" || typeof message.matchId !== "string" || !/^[a-f0-9-]{36}$/i.test(message.matchId)) return;
      if (subscribedMatchId) chessSockets.get(subscribedMatchId)?.delete(socket);
      subscribedMatchId = message.matchId;
      const subscribers = chessSockets.get(subscribedMatchId) ?? new Set();
      subscribers.add(socket); chessSockets.set(subscribedMatchId, subscribers);
      socket.send(JSON.stringify({ type: "subscribed", matchId: subscribedMatchId }));
    });
    socket.on("close", () => {
      if (!subscribedMatchId) return;
      const subscribers = chessSockets.get(subscribedMatchId); subscribers?.delete(socket);
      if (subscribers?.size === 0) chessSockets.delete(subscribedMatchId);
    });
  });
  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "");
    if (pathname !== "/ws/chess") { socket.destroy(); return; }
    chessSocketServer.handleUpgrade(req, socket, head, (websocket) => chessSocketServer.emit("connection", websocket, req));
  });
  server.listen(port, () => {
    console.log(`> Ready on port ${port}`);
  });
});
