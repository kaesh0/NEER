// GET /api/geo/search?q=  and GET /api/geo/reverse?lat=&lng=
const { searchLocations, reverseGeocode } = require("../model/geo");

exports.search = async (req, res) => {
  const q = req.query.q;
  if (!q || !String(q).trim()) {
    return res.status(400).json({ error: "QUERY_REQUIRED", message: "q is required." });
  }
  const results = await searchLocations(String(q));
  return res.status(200).json({ results });
};

exports.reverse = async (req, res) => {
  const { lat, lng } = req.query;
  const place = await reverseGeocode(lat, lng);
  if (!place) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Could not resolve that location." });
  }
  return res.status(200).json(place);
};
