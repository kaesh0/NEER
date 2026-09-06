// Basic request logging: method, path, status code, response time.
function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - startedAt}ms)`);
  });
  next();
}

module.exports = requestLogger;
