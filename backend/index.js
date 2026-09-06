// ORCA mock analysis backend entry point.
const express = require("express");
const cors = require("cors");

const analysisRoute = require("./route/analysis");
const chatRoute = require("./route/chat");
const authRoute = require("./route/auth");
const geoRoute = require("./route/geo");
const requestLogger = require("./middleware/requestLogger");

const app = express();

// The Vite dev server runs on this port during development; allow both
// spellings of the loopback host so the demo works either way.
const FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({ origin: FRONTEND_ORIGINS }));
app.use(requestLogger);

// Parse JSON request bodies (the chat endpoint posts JSON; analysis uses query params).
app.use(express.json());

app.use("/api/analysis", analysisRoute);
app.use("/api/chat", chatRoute);
app.use("/api/auth", authRoute);
app.use("/api/geo", geoRoute);

// Health check — the frontend or a load balancer can probe this.
app.get("/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});

// Port from the environment if set and parseable; anything falsy or invalid
// (including an empty or "0" value) falls back to the default 3001.
const PORT = Number(process.env.PORT) || 3001;

// Only start listening when this file is run directly (`npm start`). When it
// is imported by the test file, the tests start their own server on an
// ephemeral port and control its lifecycle.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SERVER RUNNING AT PORT:${PORT}`);
  });
}

module.exports = app;
