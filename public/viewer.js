import * as SPLAT from "https://cdn.jsdelivr.net/npm/gsplat@1.2.9/+esm";

const canvas = document.getElementById("viewer-canvas");
const titleEl = document.getElementById("scene-title");
const statusEl = document.getElementById("status-text");

const homeBtn = document.getElementById("btn-home");
const frontBtn = document.getElementById("btn-front");
const topBtn = document.getElementById("btn-top");
const fullscreenBtn = document.getElementById("btn-fullscreen");

const renderer = new SPLAT.WebGLRenderer(canvas);
const scene = new SPLAT.Scene();
const camera = new SPLAT.Camera();
const controls = new SPLAT.OrbitControls(camera, canvas);

let sceneMeta = null;

function getSceneId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || "demo";
}

function setVec3(target, x, y, z) {
  if (!target) return;
  if (typeof target.set === "function") {
    target.set(x, y, z);
    return;
  }
  target.x = x;
  target.y = y;
  target.z = z;
}

function callLookAt(cameraObj, x, y, z) {
  if (typeof cameraObj.lookAt === "function") {
    cameraObj.lookAt(x, y, z);
  }
}

function fitCamera(direction = [0.9, 0.35, 1.0]) {
  if (!sceneMeta) return;

  const [cx, cy, cz] = sceneMeta.center;
  const radius = Math.max(sceneMeta.radius || 1, 0.25);
  const distance = radius * 2.6;

  const px = cx + direction[0] * distance;
  const py = cy + direction[1] * distance;
  const pz = cz + direction[2] * distance;

  setVec3(camera.position, px, py, pz);
  callLookAt(camera, cx, cy, cz);

  if (controls.target) {
    setVec3(controls.target, cx, cy, cz);
  }

  if ("near" in camera) camera.near = Math.max(0.01, radius / 100);
  if ("far" in camera) camera.far = radius * 30;
  if (typeof camera.updateProjectionMatrix === "function") {
    camera.updateProjectionMatrix();
  }
}

async function loadSceneMeta(sceneId) {
  const res = await fetch(`/api/scenes/${sceneId}`);
  if (!res.ok) {
    throw new Error(`Scene '${sceneId}' not found`);
  }
  return res.json();
}

async function main() {
  const sceneId = getSceneId();
  sceneMeta = await loadSceneMeta(sceneId);

  titleEl.textContent = sceneMeta.title || sceneMeta.id;
  statusEl.textContent = "Loading splat";

  document.documentElement.style.background = `linear-gradient(180deg, ${sceneMeta.backgroundTop}, ${sceneMeta.backgroundBottom})`;
  document.body.style.background = `linear-gradient(180deg, ${sceneMeta.backgroundTop}, ${sceneMeta.backgroundBottom})`;

  await SPLAT.PLYLoader.LoadAsync(sceneMeta.splatUrl, scene, (progress) => {
    const pct = Math.round((progress || 0) * 100);
    statusEl.textContent = `Loading splat ${pct}%`;
  });

  fitCamera([0.9, 0.35, 1.0]);
  statusEl.textContent = "Ready";

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function frame() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
}

homeBtn.addEventListener("click", () => fitCamera([0.9, 0.35, 1.0]));
frontBtn.addEventListener("click", () => fitCamera([0, 0, 1.8]));
topBtn.addEventListener("click", () => fitCamera([0.001, 1.8, 0.001]));

fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});

main().catch((err) => {
  console.error(err);
  statusEl.textContent = err.message || "Viewer failed";
});