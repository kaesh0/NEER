// GET /api/analysis?persona=...
// All persona validation lives here — no service layer. The controller
// decides whether the persona is missing, unknown, or a real planned persona
// that is not implemented yet, then asks the model directly for the data.

const { getAnalysisByPersona } = require("../model/analysis");

// Personas the API can serve today.
const IMPLEMENTED_PERSONAS = ["fisherman", "authority"];

// Real planned persona that is not built yet — 501, not 400.
const PLANNED_PERSONAS = ["maritime_operator"];

// Everything the API knows about, for error responses.
const VALID_PERSONAS = [...IMPLEMENTED_PERSONAS, ...PLANNED_PERSONAS];

async function handleGetAnalysis(req, res) {
  try {
    const { persona, lat, lng, location } = req.query;

    if (!persona) {
      return res.status(400).json({
        error: "invalid_persona",
        message: "MISSING PERSONA PARAMETER",
        validPersonas: VALID_PERSONAS,
      });
    }

    const normPersona = persona === "marine" ? "maritime_operator" : persona;

    if (!VALID_PERSONAS.includes(normPersona)) {
      return res.status(400).json({
        error: "invalid_persona",
        message: "UNKNOWN PERSONA",
        validPersonas: VALID_PERSONAS,
      });
    }

    // When no specific coordinates or location are requested, preserve planned 501 response
    if (PLANNED_PERSONAS.includes(normPersona) && !lat && !lng && !location) {
      return res.status(501).json({
        error: "not_implemented",
        message: "PERSONA NOT YET IMPLEMENTED",
        persona: "maritime_operator",
      });
    }

    const analysis = await getAnalysisByPersona(normPersona, { lat, lng, location });
    return res.status(200).json(analysis);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { handleGetAnalysis };
