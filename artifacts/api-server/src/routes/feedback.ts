import { Router } from "express";
import { createTransport } from "nodemailer";
import { logger } from "../lib/logger";

const router = Router();

const RECIPIENT = "localfinanceguide@proton.me";

router.post("/feedback", async (req, res) => {
  const { rating, text } = req.body as { rating?: unknown; text?: unknown };

  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    res.status(400).json({ error: "Invalid rating" });
    return;
  }

  const safeText = (typeof text === "string" ? text : "").slice(0, 500);
  const stars = "★".repeat(r) + "☆".repeat(5 - r);

  req.log.info({ rating: r, hasText: !!safeText }, "Feedback received");

  const user = process.env["FEEDBACK_EMAIL_USER"];
  const pass = process.env["FEEDBACK_EMAIL_PASS"];

  if (user && pass) {
    try {
      const transporter = createTransport({
        service: "gmail",
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: `"Slide Clicker Feedback" <${user}>`,
        to: RECIPIENT,
        subject: `Feedback ${stars} (${r}/5)`,
        text: safeText
          ? `Rating: ${r}/5\n\n${safeText}`
          : `Rating: ${r}/5\n\nNo written feedback.`,
      });

      req.log.info({ rating: r }, "Feedback email sent");
    } catch (err) {
      req.log.error({ err }, "Failed to send feedback email");
    }
  }

  res.json({ ok: true });
});

export default router;
