import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// This metadata is the key to a friendly first camera view.
// center = splat center in scene coordinates
// radius = rough scene radius
const scenes = {
  demo: {
    id: "demo",
    title: "Demo Splat",
    splatUrl: "/splats/demo.ply",
    center: [0, 0, 0],
    radius: 1.6,
    up: [0, 1, 0],
    backgroundTop: "#1b2230",
    backgroundBottom: "#0b0f16"
  }
};

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/scenes/:id", (req, res) => {
  const scene = scenes[req.params.id];
  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }
  res.json(scene);
});

app.get("/viewer/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "viewer.html"));
});

app.listen(PORT, () => {
  console.log(`Viewer server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/viewer/demo`);
});