// POST /api/chat
// All chat validation lives here — no service layer. The controller checks
// the message and persona, then hands the request to the model layer, which
// calls the live Python service (or degrades to the mock-file fallback).
//
// Session lifecycle and persistence now live with the Python service (one
// folder per session under conversations/<session_id>/, one JSON file per
// turn) — the same place the terminal CLI's pipeline.run_pipeline() persists
// turns. Node no longer maintains its own in-memory session Map, so it can
// never drift out of sync with Python. Conversation history, when needed by
// the frontend, should be fetched from the Python service via a future
// GET /api/chat/:sessionId/history endpoint on the Python side — not tracked
// here.

const { getChatResponse } = require("../model/chat");

// Personas chat can serve today. maritime_operator is out of scope for chat
// entirely — not even a 501 case here.
const CHAT_PERSONAS = ["fisherman", "authority"];

async function handleChatMessage(req, res) {
  try {
    const { message, persona, sessionId, location } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "MESSAGE REQUIRED" });
    }

    if (!persona) {
      return res.status(400).json({ message: "PERSONA REQUIRED" });
    }

    if (!CHAT_PERSONAS.includes(persona)) {
      return res.status(400).json({ message: "UNKNOWN PERSONA" });
    }

    // Delegate to the model layer: calls the live Python service, or degrades
    // to the mock-file fallback when the service is unreachable. Returns a
    // `session_id` (Python-generated or a fallback uuid), the ORCA envelope as
    // `response`, and a `servedFrom` flag.
    const result = await getChatResponse({ message, persona, sessionId, location });

    // Conversation history now lives with the Python service, not in Node.
    // The `history` field from the old in-memory Map is dropped. If the
    // frontend needs turn history later, add a GET /api/chat/:sessionId/history
    // endpoint on the Python side rather than reintroducing an in-memory store
    // here.
    return res.status(200).json({
      sessionId: result.session_id,
      response: result.response,
      servedFrom: result.servedFrom,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { handleChatMessage };
