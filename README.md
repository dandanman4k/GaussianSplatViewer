# GaussianSplatViewer

## Tech stack

This example project is a small **Node/Express-style viewer app** with a **gsplat.js** front end.

- **Frontend:** HTML, CSS, vanilla JavaScript modules
- **3D rendering:** `gsplat.js` loaded from a CDN
- **Backend:** Node.js server (project root shows `server.mjs`)
- **Asset model:** scene metadata from an API plus a remote or local splat/PLY asset URL

The repo currently has two viewer layers:

1. A **simple demo** in `index.html`, `index.js`, and `style.css`
2. A more **app-style viewer** in `viewer.html`, `viewer.js`, and `styles.css`

The simple demo loads a hardcoded public `.splat` file directly from Hugging Face. The app-style viewer reads the scene id from the URL, requests metadata from `/api/scenes/:sceneId`, then loads the scene asset and fits the camera around the returned center/radius values.

---

## Project structure

```txt
GaussianSplatViewer/
├─ public/
│  ├─ viewer.html
│  ├─ viewer.js
│  ├─ styles.css
│  ├─ demo/
│  ├─ splats/
│  ├─ index.html
│  ├─ index.js
│  └─ style.css
├─ gsplat.js/
├─ test/
├─ package.json
└─ server.mjs
```

### What each file does

#### 1) Demo viewer

`index.html` provides a full-screen canvas and a loading dialog:

```html
<canvas id="canvas"></canvas>
<script src="index.js" type="module"></script>
```

`index.js` shows the smallest working gsplat example:

```js
import * as SPLAT from "https://cdn.jsdelivr.net/npm/gsplat@latest";

const renderer = new SPLAT.WebGLRenderer(canvas);
const scene = new SPLAT.Scene();
const camera = new SPLAT.Camera();
const controls = new SPLAT.OrbitControls(camera, canvas);

const url = "https://.../bonsai-7k-mini.splat";
await SPLAT.Loader.LoadAsync(url, scene, (progress) => {
  progressIndicator.value = progress * 100;
});
```

Use this version when you want a fast prototype or when you want to test whether your `.splat` file renders at all.

#### 2) App-style viewer

`viewer.html` adds UI controls and loads `viewer.js`:

```html
<div class="toolbar">
  <button id="btn-home" type="button">Home</button>
  <button id="btn-front" type="button">Front</button>
  <button id="btn-top" type="button">Top</button>
  <button id="btn-fullscreen" type="button">Fullscreen</button>
</div>

<script type="module" src="/viewer.js"></script>
```

`viewer.js` reads the scene id from the current path:

```js
function getSceneId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || "demo";
}
```

Then it fetches scene metadata from the backend:

```js
async function loadSceneMeta(sceneId) {
  const res = await fetch(`/api/scenes/${sceneId}`);
  if (!res.ok) throw new Error(`Scene '${sceneId}' not found`);
  return res.json();
}
```

And fits the camera using backend-provided bounds:

```js
const [cx, cy, cz] = sceneMeta.center;
const radius = Math.max(sceneMeta.radius || 1, 0.25);
const distance = radius * 2.6;

setVec3(camera.position, cx + 0.9 * distance, cy + 0.35 * distance, cz + 1.0 * distance);
callLookAt(camera, cx, cy, cz);
```

This is the version you should integrate into a real product.

---

## Quick start

### 1) Install dependencies

From the project root:

```bash
npm install
```

### 2) Start the server

Because the project root shows `server.mjs`, the most direct start command is:

```bash
node server.mjs
```

If your `package.json` already has scripts, you can also use something like:

```bash
npm run dev
# or
npm start
```

### 3) Open the app

Typical local URLs will be one of these:

```txt
http://localhost:3000/
http://localhost:3000/viewer.html
http://localhost:3000/demo
http://localhost:3000/your-scene-id
```

If `viewer.js` is being used as intended, the most important route is the one whose last path segment becomes the scene id.

Example:

```txt
http://localhost:3000/demo
```

That makes the frontend request:

```txt
GET /api/scenes/demo
```

---

## Backend contract

The app-style viewer expects the backend to return scene metadata in this shape:

```json
{
  "id": "demo",
  "title": "Demo Scene",
  "splatUrl": "/splats/demo.ply",
  "center": [0, 0, 0],
  "radius": 1.5,
  "backgroundTop": "#0b1020",
  "backgroundBottom": "#1d2a44"
}
```

A minimal Express-style implementation would look like this:

```js
import express from "express";
import path from "path";

const app = express();
app.use(express.static("public"));

app.get("/api/scenes/:id", (req, res) => {
  const { id } = req.params;

  const scenes = {
    demo: {
      id: "demo",
      title: "Demo Scene",
      splatUrl: "/splats/demo.ply",
      center: [0, 0, 0],
      radius: 1.5,
      backgroundTop: "#0b1020",
      backgroundBottom: "#162033"
    }
  };

  const scene = scenes[id];
  if (!scene) return res.status(404).json({ error: "Scene not found" });

  res.json(scene);
});

app.get("/:sceneId", (req, res) => {
  res.sendFile(path.resolve("public/viewer.html"));
});

app.listen(3000, () => {
  console.log("Viewer running on http://localhost:3000");
});
```

---

## Important loader note

There is one detail worth keeping an eye on:

- `index.js` uses:

```js
await SPLAT.Loader.LoadAsync(url, scene, onProgress);
```

- `viewer.js` uses:

```js
await SPLAT.PLYLoader.LoadAsync(sceneMeta.splatUrl, scene, onProgress);
```

That means the **demo viewer is wired for `.splat`**, while the **app-style viewer is currently wired through the PLY loader**.

So when integrating assets, decide on one of these two paths:

### Option A: keep using `.ply`

Return a PLY file from the backend:

```json
{
  "splatUrl": "/splats/patient-123.ply"
}
```

### Option B: switch the app-style viewer to `.splat`

Change this:

```js
await SPLAT.PLYLoader.LoadAsync(sceneMeta.splatUrl, scene, onProgress);
```

To this:

```js
await SPLAT.Loader.LoadAsync(sceneMeta.splatUrl, scene, onProgress);
```

And then return:

```json
{
  "splatUrl": "/splats/patient-123.splat"
}
```

Pick one format and keep it consistent across the API, storage, and UI.

---

## How frontend developers can modify it

### Change the default view

The current camera framing is driven by `fitCamera(direction)`:

```js
fitCamera([0.9, 0.35, 1.0]); // home
fitCamera([0, 0, 1.8]);      // front
fitCamera([0.001, 1.8, 0.001]); // top
```

To make the opening angle flatter or closer, adjust the direction vector or the distance multiplier:

```js
const distance = radius * 2.0; // closer than 2.6
```

### Add more UI actions

Example reset button:

```html
<button id="btn-left" type="button">Left</button>
```

```js
document.getElementById("btn-left").addEventListener("click", () => {
  fitCamera([-1.8, 0, 0]);
});
```

### Change the visual theme

The viewer already supports dynamic background colors from the API:

```js
document.documentElement.style.background =
  `linear-gradient(180deg, ${sceneMeta.backgroundTop}, ${sceneMeta.backgroundBottom})`;
```

So a backend can theme scenes by case type, department, or brand without changing the frontend code.

---

## How backend developers can integrate it into other systems

The cleanest pattern is to treat the viewer as a thin rendering client.

Your main system can:

1. Store scene files in local storage, S3, Supabase Storage, or another bucket
2. Save scene metadata in a database
3. Expose an API that returns the file URL and camera bounds
4. Link users into the viewer using a scene id

Example database-style record:

```json
{
  "id": "burn-case-day-5",
  "title": "Burn Case - Day 5",
  "file_path": "splats/burn-case-day-5.splat",
  "center": [0.03, 0.82, -0.12],
  "radius": 0.64
}
```

Example transformed API response:

```js
res.json({
  id: row.id,
  title: row.title,
  splatUrl: signedUrl,
  center: row.center,
  radius: row.radius,
  backgroundTop: "#101828",
  backgroundBottom: "#1f2937"
});
```

This makes the viewer easy to embed in hospital systems, admin panels, patient portals, or imaging dashboards.

---

## Embedding into another app

You have two common options.

### Option 1: link out to the viewer

```html
<a href="/viewer/burn-case-day-5">Open 3D View</a>
```

### Option 2: iframe embed

```html
<iframe
  src="/burn-case-day-5"
  title="3D Scene Viewer"
  style="width:100%; height:600px; border:0; border-radius:16px;"
></iframe>
```

If auth is required, keep the API behind your normal session or token checks.

---

## Troubleshooting

### Blank viewer

Check these first:

```txt
- The scene id in the URL is correct
- /api/scenes/:id returns 200
- splatUrl points to a real file
- The chosen loader matches the file format
- The browser console has no CORS or 404 errors
```

### Scene loads but camera is bad

Your `center` and `radius` values are probably wrong. Start with:

```json
{
  "center": [0, 0, 0],
  "radius": 1
}
```

Then refine from there.

### Controls feel odd on mobile

Reduce the default distance or add more fixed camera buttons.

---

## Suggested next step

If you plan to productionize this, the first upgrade I would make is to standardize the asset format across both viewers so the demo and the app-style viewer use the same loader path. That removes a sneaky little footgun from the project and makes integration much smoother.
