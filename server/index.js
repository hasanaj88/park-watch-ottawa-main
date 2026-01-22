import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => res.send("Server OK"));

app.post("/api/chat", (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message is required" });

  res.json({ answer: `You said: ${message}` });
});

/* =========================
   Weather API
   GET /api/weather
========================= */
app.get("/api/weather", async (_req, res) => {
  try {
    const key = process.env.OPENWEATHERMAP_API_KEY;

    if (!key) {
      return res.status(500).json({
        error: "Missing OPENWEATHERMAP_API_KEY (check server/.env)",
      });
    }

    // Ottawa coords (later we can make it dynamic)
    const lat = 45.4215;
    const lon = -75.6972;

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

    const r = await fetch(url);

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({
        error: "OpenWeather upstream failed",
        status: r.status,
        body: text.slice(0, 300),
      });
    }

    const data = await r.json();

    return res.json({
      temp: data?.main?.temp ?? 0,
      rain: Boolean(data?.rain),
      snow: Boolean(data?.snow),
    });
  } catch (err) {
    return res.status(500).json({
      error: "Weather endpoint crashed",
      message: String(err),
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
