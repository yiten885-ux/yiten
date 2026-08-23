const { cookieName, isValidSession, parseCookies, setNoStore } = require("../../lib/auth-shared");

module.exports = function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ authenticated: false, message: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie || "");
  res.status(200).json({ authenticated: isValidSession(cookies[cookieName]) });
};
