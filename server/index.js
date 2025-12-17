import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => res.send("Server OK"));

app.post("/api/chat", (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message is required" });

  res.json({ answer: `You said: ${message}` });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
