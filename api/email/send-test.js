const { requireAdminRequest, setNoStore } = require("../../lib/auth-shared");
const { defaultOwnerEmail, sendResendEmail } = require("../../lib/email-shared");

module.exports = async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }
  if (!requireAdminRequest(req, res, { sameOrigin: true })) return;

  try {
    const to = process.env.TEST_EMAIL_TO || defaultOwnerEmail;
    const result = await sendResendEmail({
      to,
      subject: "Yiten Huang 邮件系统测试",
      html: `<p>你好，这是一封来自 yitenhuang.com 的邮件系统测试。</p><p>如果你看到这封邮件，说明 Resend API 已经接通。</p>`,
    });
    res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Unable to send test email" });
  }
};
