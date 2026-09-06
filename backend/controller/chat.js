// POST /api/chat — validation, then the model calls the Python service
// (with the mock-file fallback when it is unreachable).
const { getChatResponse } = require("../model/chat");

// Personas chat can serve today; maritime_operator is out of scope for chat.
const CHAT_PERSONAS = ["fisherman", "authority"];

exports.postChat = async (req, res) => {
  const { message, persona, sessionId, location } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: "MESSAGE REQUIRED" });
  }
  if (!persona) {
    return res.status(400).json({ message: "PERSONA REQUIRED" });
  }
  if (!CHAT_PERSONAS.includes(persona)) {
    return res.status(400).json({ message: "UNKNOWN PERSONA" });
  }

  try {
    const result = await getChatResponse({
      message: String(message).trim(),
      persona,
      sessionId,
      location: location ? String(location).trim() : undefined,
    });
    return res.status(200).json({
      sessionId: result.session_id,
      servedFrom: result.servedFrom,
      response: result.response,
    });
  } catch (err) {
    return res.status(502).json({
      message: "CHAT FAILED",
      detail: err?.message || String(err),
    });
  }
};
