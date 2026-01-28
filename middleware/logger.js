module.exports = function logger(req, res, next) {
  const t = new Date().toTimeString().slice(0, 8); // HH:MM:SS
  console.log(`[${t}] ${req.method}: ${req.url}`);
  next();
};
