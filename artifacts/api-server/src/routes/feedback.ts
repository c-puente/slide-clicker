import { Router } from "express";

const router = Router();

const GITHUB_TOKEN = process.env["GITHUB_PERSONAL_ACCESS_TOKEN_V2"] || process.env["GITHUB_PERSONAL_ACCESS_TOKEN"];
const GITHUB_OWNER = "c-puente";
const GITHUB_REPO = "next-slide-feedback";

router.post("/feedback", async (req, res) => {
  const { rating, text } = req.body as { rating?: unknown; text?: unknown };

  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    res.status(400).json({ error: "Invalid rating" });
    return;
  }

  const safeText = (typeof text === "string" ? text : "").slice(0, 500);
  const stars = "★".repeat(r) + "☆".repeat(5 - r);
  const title = `Feedback ${stars} (${r}/5)`;
  const body = safeText
    ? `Rating: ${r}/5\n\n${safeText}`
    : `Rating: ${r}/5\n\nNo written feedback.`;

  req.log.info({ rating: r, hasText: !!safeText }, "Feedback received");

  if (!GITHUB_TOKEN) {
    req.log.error("Missing GitHub token for feedback issues");
    res.status(500).json({ error: "Feedback storage unavailable" });
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title,
        body,
        labels: ["feedback"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error({ status: response.status, errorText }, "Failed to create feedback issue");
      res.status(502).json({ error: "Failed to store feedback" });
      return;
    }

    req.log.info({ rating: r }, "Feedback issue created");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to create feedback issue");
    res.status(502).json({ error: "Failed to store feedback" });
  }
});

export default router;
