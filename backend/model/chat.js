// Chat endpoint model.
//
// TEMPORARY: conversation history now lives with the Python service (one folder
// per session under conversations/<session_id>/, one JSON file per turn) — the
// same place the terminal CLI's pipeline.run_pipeline() persists turns. The
// in-memory Map from the earlier mockup is removed entirely so Node can never
// drift out of sync with Python. When a real conversation store (Redis / DB)
// lands, only the Python service changes; nothing here needs to know where
// sessions live, the same way model/analysis.js isolates the Python-service call
// and the mock-file fallback so the rest of the backend doesn't.
//
// This file is the chat-side entry point to the data source: it calls the Python
// service for a live response and degrades to the mock-file fallback when the
// service is unreachable. The actual HTTP plumbing lives in model/analysis.js
// (the model that owns "talk to the data source"), reused here via
// queryPythonService + AI_SERVICE_UNAVAILABLE.

const { getAnalysisByPersona, queryPythonService, AI_SERVICE_UNAVAILABLE } = require("./analysis");

// Personas chat can serve today. maritime_operator is out of scope for chat
// entirely — not even a 501 case here.
const CHAT_PERSONAS = ["fisherman", "authority"];

/**
 * Ask the live Python service for a chat response.
 *
 * Sends the user's message to the Python service exactly as the terminal CLI
 * would (same POST /api/query endpoint), with the session_id the caller
 * provides (or none, letting Python generate one — the same pattern main.py
 * uses). Python returns `{ session_id, final_output }`; the `final_output` IS
 * the ORCA envelope, so this is a drop-in replacement for the old canned
 * getAnalysisByPersona() call.
 *
 * Returns the Python response directly, plus a `servedFrom` flag. On
 * AI_SERVICE_UNAVAILABLE, falls back to the persona's mock file (with
 * `servedFrom: "fallback_mock"` and a generated session_id, since Python didn't
 * see the request).
 */
async function getChatResponse({ message, persona, sessionId, location }) {
  try {
    const pythonResponse = await queryPythonService("/api/query", {
      text: message,
      session_id: sessionId || undefined,
      location: location || undefined,
      persona: persona || undefined,
    });
    return {
      session_id: pythonResponse.session_id,
      response: pythonResponse.final_output,
      servedFrom: "ai_service",
    };
  } catch (err) {
    if (err && err.code === "AI_SERVICE_UNAVAILABLE") {
      // Read the mock file DIRECTLY — do NOT call getAnalysisByPersona here,
      // because that itself calls the Python service first and would succeed
      // (returning ai_service) whenever the service is reachable. The fallback
      // should only trigger when the service is genuinely unreachable.
      const { PERSONA_MOCKS, readMockFile } = require('./analysis');
      const mockFile = PERSONA_MOCKS[persona] || "fisherman_kochi.json";
      const mockBody = await readMockFile(mockFile);
      if (!mockBody.provenance) {
        mockBody.provenance = {};
      }
      mockBody.provenance.status = "fallback";
      mockBody.provenance.overallStatus = "fallback";
      mockBody.provenance.summary = "Showing example data — live service temporarily unavailable, please try again shortly.";
      if (!mockBody.provenance.availability) {
        mockBody.provenance.availability = {};
      }
      mockBody.provenance.availability.weather = "fallback";
      mockBody.provenance.availability.pfz = "fallback";
      mockBody.provenance.availability.hazards = "fallback";

      // Mock files use meta.responseId, not .sessionId. Derive a session id from
      // it so the controller can return something stable in fallback mode.
      const fallbackSessionId =
        sessionId ||
        (mockBody && mockBody.meta && mockBody.meta.responseId
          ? mockBody.meta.responseId
          : require("crypto").randomUUID());
      return {
        session_id: fallbackSessionId,
        response: mockBody,
        servedFrom: "fallback_mock",
      };
    }
    throw err;
  }
}

module.exports = { getChatResponse };
