const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const submissionsPath = path.join(__dirname, "data", "submissions.json");

const ensureDataFile = async () => {
  await fs.mkdir(path.dirname(submissionsPath), { recursive: true });
  try {
    await fs.access(submissionsPath);
  } catch (error) {
    await fs.writeFile(submissionsPath, "[]", "utf8");
  }
};

const readSubmissions = async () => {
  await ensureDataFile();
  const content = await fs.readFile(submissionsPath, "utf8");
  try {
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
};

const saveSubmission = async (payload) => {
  const submissions = await readSubmissions();
  const entry = { ...payload, submittedAt: new Date().toISOString() };
  submissions.push(entry);
  await fs.writeFile(submissionsPath, JSON.stringify(submissions, null, 2), "utf8");
  return entry;
};

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(__dirname));

app.post("/api/aplicaciones", async (req, res) => {
  const payload = req.body || {};

  if (!payload.nombre || !payload.email) {
    return res.status(400).json({ ok: false, message: "Nombre y email son requeridos" });
  }

  try {
    const entry = await saveSubmission(payload);
    return res.status(201).json({ ok: true, entry });
  } catch (error) {
    console.error("No se pudo guardar la aplicación", error);
    return res.status(500).json({ ok: false, message: "No se pudo guardar la aplicación" });
  }
});

app.get("/api/aplicaciones", async (_req, res) => {
  try {
    const submissions = await readSubmissions();
    return res.json({ ok: true, submissions });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudo leer la base" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
