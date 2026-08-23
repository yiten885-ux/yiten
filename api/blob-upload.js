// 浏览器直传 Blob 的服务端令牌接口：客户端把文件直接上传到 Vercel Blob，
// 不再经过无服务器函数体（避开 4.5MB 平台上限），支持几十 MB 的电子书/音频。
const { readJsonBody, requireAdminRequest, setNoStore } = require("../lib/auth-shared");

module.exports = async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdminRequest(req, res, { sameOrigin: true })) return;
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const { handleUpload } = require("@vercel/blob/client");
    const jsonResponse = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        addRandomSuffix: true,
        maximumSizeInBytes: 35 * 1024 * 1024,
        allowedContentTypes: ["audio/mpeg", "audio/mp4", "audio/wav", "image/jpeg", "image/png", "image/webp", "image/gif"],
      }),
      onUploadCompleted: async () => {
        // 直传完成后的回调，当前无需额外处理。
      },
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    const status = Number(error.status) || 400;
    res.status(status).json({ error: status < 500 ? error.message : "client upload token failed" });
  }
};
