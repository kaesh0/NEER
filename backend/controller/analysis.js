// GET /api/analysis — persona validation, then the model decides the data source.
const { getAnalysisByPersona } = require("../model/analysis");

const VALID_PERSONAS = ["fisherman", "authority", "maritime_operator"];

exports.getAnalysis = async (req, res) => {
  const persona = req.query.persona;

  if (!persona || !VALID_PERSONAS.includes(persona)) {
    return res.status(400).json({ error: "invalid_persona", validPersonas: VALID_PERSONAS });
  }

  // maritime_operator is a planned persona — a deliberate 501, not a validation error.
  if (persona === "maritime_operator") {
    return res.status(501).json({ error: "not_implemented", persona });
  }

  try {
    const { lat, lng, location } = req.query;
    const body = await getAnalysisByPersona(persona, { lat, lng, location });
    return res.status(200).json(body);
  } catch (err) {
    return res.status(502).json({
      error: "analysis_failed",
      message: err?.message || String(err),
    });
  }
};
