import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries, deinterleaveGeometry } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = (selector) => document.querySelector(selector);
const names = { ours: 'LightHarness', viga: 'VIGA', '3dcodeverse': '3DCodeVerse', gpt6: 'GPT-6-Sol', scenerig: 'SceneRig' };
const vector = (a) => new THREE.Vector3().fromArray(a);
const modelBase = new URL('./assets/models/', import.meta.url);
const sizeText = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

// Merge static draw batches without changing positions, material assignments, or cutaway groups.
function batchStaticGeometry(model, meta) {
  const meshes = [];
  model.traverse((node) => { if (node.isMesh) meshes.push(node); });
  if (meshes.length < 800 || meshes.some((m) => m.isSkinnedMesh || Array.isArray(m.material) || Object.keys(m.geometry.morphAttributes).length)) return model;
  model.updateMatrixWorld(true);
  const hidden = new Set(meta.source_camera_hidden), shell = new Set(meta.shell_objects);
  const groups = new Map(), originals = new Set();
  for (const node of meshes) {
    let cameraHidden = false, isShell = false;
    for (let parent = node; parent; parent = parent.parent) {
      const name = parent.userData.name || parent.name;
      cameraHidden ||= hidden.has(name); isShell ||= shell.has(name);
    }
    const geometry = node.geometry.clone();
    deinterleaveGeometry(geometry);
    geometry.applyMatrix4(node.matrixWorld);
    if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
    if (node.matrixWorld.determinant() < 0) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) [indices[i],indices[i+2]] = [indices[i+2],indices[i]];
    }
    const attributes = Object.entries(geometry.attributes).sort().map(([name, a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join('|');
    const key = `${node.material.uuid}:${cameraHidden}:${isShell}:${attributes}`;
    if (!groups.has(key)) groups.set(key, { material: node.material, geometries: [], cameraHidden, isShell });
    groups.get(key).geometries.push(geometry); originals.add(node.geometry);
  }
  const mergedModel = new THREE.Group();
  mergedModel.name = 'Web preview static batches';
  for (const group of groups.values()) {
    const geometry = group.geometries.length === 1 ? group.geometries[0] : mergeGeometries(group.geometries, false);
    if (!geometry) throw new Error('Unable to prepare a static geometry batch');
    if (group.geometries.length > 1) group.geometries.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geometry, group.material);
    mesh.userData.previewCameraHidden = group.cameraHidden;
    mesh.userData.previewShell = group.isShell;
    mergedModel.add(mesh);
  }
  originals.forEach((g) => g.dispose());
  return mergedModel;
}

export function createViewer() {
  let syncing = false, generation = 0, controller = null, disposed = false, inView = true;
  const loader = new GLTFLoader();
  const panes = [];
  const clay = new THREE.MeshStandardMaterial({ color: 0xe3dfd2, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const wireframe = new THREE.MeshBasicMaterial({ color: 0x355347, wireframe: true });

  function disposeModel(pane) {
    if (!pane.model) return;
    pane.scene.remove(pane.model);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    pane.model.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of node.userData.previewMaterials || []) {
        materials.add(material);
        for (const item of Object.values(material)) if (item?.isTexture) textures.add(item);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => { t.dispose(); t.source?.data?.close?.(); });
    pane.model = null;
  }

  function requestDraw(pane) {
    if (pane.pendingFrame || disposed || !inView) return;
    pane.pendingFrame = requestAnimationFrame(() => {
      pane.pendingFrame = 0;
      pane.controls.update();
      pane.renderer.render(pane.scene, pane.camera);
      pane.stage.dataset.triangles = String(pane.renderer.info.render.triangles);
      pane.stage.dataset.drawCalls = String(pane.renderer.info.render.calls);
    });
  }

  function syncNavigation(source) {
    if (syncing || !$('#model-sync').checked || !source.meta) return;
    const target = panes.find((p) => p !== source);
    if (!target?.meta) return;
    syncing = true;
    // Compare relative camera-space movements; the methods do not share world coordinates.
    const inverse = source.referenceQuaternion.clone().invert();
    const relativeOffset = source.camera.position.clone().sub(source.controls.target).applyQuaternion(inverse).divideScalar(source.referenceDistance);
    const relativePan = source.controls.target.clone().sub(source.referenceTarget).applyQuaternion(inverse).divideScalar(source.referenceDistance);
    target.controls.target.copy(relativePan.multiplyScalar(target.referenceDistance).applyQuaternion(target.referenceQuaternion).add(target.referenceTarget));
    target.camera.position.copy(relativeOffset.multiplyScalar(target.referenceDistance).applyQuaternion(target.referenceQuaternion).add(target.controls.target));
    target.camera.lookAt(target.controls.target);
    target.controls.update();
    requestDraw(target);
    syncing = false;
  }

  function rotate(pane, radians) {
    if (!pane.meta) return;
    const offset = pane.camera.position.clone().sub(pane.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    pane.camera.position.copy(pane.controls.target).add(offset);
    pane.controls.update();
    requestDraw(pane);
  }

  function makePane(key) {
    const stage = $(`#model-stage-${key}`);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', `${key === 'ours' ? 'LightHarness' : 'Baseline'} 3D scene. Drag or use left and right arrows to orbit. Use plus and minus to zoom. Right-drag to pan.`);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6e9e1);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    camera.position.set(3, 2, 5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = true;
    controls.zoomSpeed = 0.8;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.6;
    room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8d9983, 1.2));
    const keyLight = new THREE.DirectionalLight(0xfff8e9, 2.2);
    keyLight.position.set(5, 9, 4); scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xdce9ff, 0.75);
    fillLight.position.set(-4, 4, -3); scene.add(fillLight);
    const pane = { key, stage, renderer, scene, camera, controls, environment, model: null, meta: null, id: null, pendingFrame: 0 };
    stage.appendChild(renderer.domElement);
    controls.addEventListener('change', () => { requestDraw(pane); syncNavigation(pane); });
    renderer.domElement.addEventListener('keydown', (event) => {
      if (!pane.meta) return;
      if (['ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') rotate(pane, (event.key === 'ArrowLeft' ? 1 : -1) * Math.PI / 36);
      if (['+', '=', '-', '_'].includes(event.key)) {
        camera.position.sub(controls.target).multiplyScalar(['+','='].includes(event.key) ? 0.9 : 1.1).add(controls.target);
        controls.update(); requestDraw(pane);
      }
    });
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      pane.stage.querySelector('.model-pane-message').textContent = '3D graphics context was lost. Reload the page to restore the viewer.';
      $('#model-status').textContent = 'The browser interrupted WebGL. Paper renderings are still available below.';
    });
    pane.resize = new ResizeObserver(() => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix(); requestDraw(pane);
    });
    pane.resize.observe(stage);
    return pane;
  }

  try {
    panes.push(makePane('ours'));
    panes.push(makePane('baseline'));
  } catch (error) {
    panes.forEach((p) => { p.resize.disconnect(); p.controls.dispose(); p.environment.dispose(); p.renderer.dispose(); p.renderer.domElement.remove(); });
    throw error;
  }

  function referenceCamera(pane) {
    if (!pane.meta) return;
    const data = pane.meta.camera;
    pane.camera.position.fromArray(data.position);
    pane.camera.quaternion.fromArray(data.quaternion);
    pane.camera.up.set(0, 1, 0);
    pane.controls.target.fromArray(data.target);
    pane.camera.fov = data.fov;
    pane.camera.near = Math.max(0.001, pane.referenceDistance / 1000);
    const span = vector(pane.meta.bounds.max).distanceTo(vector(pane.meta.bounds.min));
    pane.camera.far = Math.max(100, span * 20, pane.referenceDistance * 100);
    pane.controls.minDistance = Math.max(0.01, pane.referenceDistance * 0.015);
    pane.controls.maxDistance = Math.max(span * 5, pane.referenceDistance * 20);
    pane.camera.updateProjectionMatrix();
    pane.controls.update(); requestDraw(pane);
  }

  function resetBoth() {
    syncing = true;
    panes.forEach(referenceCamera);
    syncing = false;
  }

  function applyDisplay(pane) {
    if (!pane.model) return;
    const mode = $('#model-display').value, cutaway = $('#model-cutaway').checked;
    const hidden = new Set(pane.meta.source_camera_hidden);
    const shells = new Set(pane.meta.shell_objects);
    pane.model.traverse((node) => {
      const originalName = node.userData.name || node.name;
      node.visible = !node.userData.previewCameraHidden && !hidden.has(originalName) && !(cutaway && (node.userData.previewShell || shells.has(originalName)));
      if (node.isMesh) {
        const originals = node.userData.previewMaterials;
        node.material = mode === 'clay' ? clay : mode === 'wireframe' ? wireframe : node.userData.previewWasArray ? originals : originals[0];
      }
    });
    requestDraw(pane);
  }

  async function loadPane(pane, row, method, token, signal) {
    const id = `scene-${row}-${method}`;
    const message = pane.stage.querySelector('.model-pane-message');
    if (pane.id === id && pane.model) {
      message.textContent = ''; pane.stage.classList.add('is-ready'); pane.stage.dataset.ready = 'true';
      $(`#model-download-${pane.key}`).hidden = false; return;
    }
    message.textContent = `Loading ${names[method]} scene…`;
    const metadata = await fetch(new URL(`${id}.json`, modelBase), { signal });
    if (!metadata.ok) throw new Error(`Model metadata unavailable (${metadata.status})`);
    const meta = await metadata.json();
    message.textContent = `Loading ${names[method]} · ${sizeText(meta.bytes)}…`;
    const file = await fetch(new URL(meta.url, modelBase), { signal });
    if (!file.ok) throw new Error(`Model download failed (${file.status})`);
    const buffer = await file.arrayBuffer();
    if (token !== generation) return;
    message.textContent = `Preparing ${names[method]} geometry…`;
    const gltf = await loader.parseAsync(buffer, modelBase.href);
    gltf.scene = batchStaticGeometry(gltf.scene, meta);
    const candidate = { model: gltf.scene, scene: new THREE.Scene() };
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.userData.previewWasArray = Array.isArray(node.material);
        node.userData.previewMaterials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of node.userData.previewMaterials) {
          if ('emissiveIntensity' in material) material.emissiveIntensity = Math.min(material.emissiveIntensity, 1.5);
        }
        node.frustumCulled = true;
      }
    });
    if (token !== generation || disposed) { disposeModel(candidate); return; }
    disposeModel(pane);
    pane.model = gltf.scene; pane.meta = meta; pane.id = id;
    pane.referenceTarget = vector(meta.camera.target);
    pane.referenceQuaternion = new THREE.Quaternion().fromArray(meta.camera.quaternion);
    pane.referenceDistance = Math.max(0.1, vector(meta.camera.position).distanceTo(pane.referenceTarget));
    pane.scene.add(pane.model);
    pane.stage.classList.add('is-ready');
    pane.stage.dataset.model = id;
    pane.stage.dataset.ready = 'true';
    pane.renderer.domElement.setAttribute('aria-label', `${names[method]} interactive 3D scene. Drag or use left/right arrows to orbit, plus/minus to zoom, right-drag to pan.`);
    message.textContent = '';
    $(`#model-meta-${pane.key}`).textContent = `${meta.objects.toLocaleString()} scene objects · ${sizeText(meta.bytes)} · Web preview`;
    const link = $(`#model-download-${pane.key}`);
    link.href = new URL(meta.url, modelBase).href; link.download = meta.url; link.hidden = false;
    applyDisplay(pane);
  }

  async function load() {
    if (disposed) return;
    const token = ++generation;
    controller?.abort(); controller = new AbortController();
    const row = $('#model-scene').value, baseline = $('#model-baseline').value;
    const button = $('#load-models'); button.disabled = true;
    $('#model-status').textContent = 'Loading scene geometry. Larger outdoor models may take a little longer.';
    const results = await Promise.allSettled([
      loadPane(panes[0], row, 'ours', token, controller.signal),
      loadPane(panes[1], row, baseline, token, controller.signal)
    ]);
    if (token !== generation) return;
    const failures = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected' && result.reason.name !== 'AbortError') {
        failures.push(`${index === 0 ? 'LightHarness' : names[baseline]}: ${result.reason.message}`);
        panes[index].stage.querySelector('.model-pane-message').textContent = 'Could not load this model. Select “Retry 3D viewer” to try again.';
        panes[index].stage.classList.remove('is-ready');
        delete panes[index].stage.dataset.ready;
        $(`#model-download-${panes[index].key}`).hidden = true;
      }
    });
    resetBoth();
    button.disabled = false; button.textContent = failures.length ? 'Retry 3D viewer' : 'Reload models';
    for (const id of ['model-reset','model-frame','model-left','model-right']) $(`#${id}`).disabled = !panes.some((p) => p.model);
    $('#model-status').textContent = failures.length ? failures.join(' · ') : `Ready · ${$('#model-scene').selectedOptions[0].textContent} · LightHarness & ${names[baseline]}. Focus either canvas to use ← / → and + / −.`;
    document.dispatchEvent(new CustomEvent('modelsloaded', { detail: { row, baseline, failures } }));
  }

  const handleChange = () => { load().catch((error) => { $('#model-status').textContent = error.message; }); };
  $('#model-scene').addEventListener('change', handleChange);
  $('#model-baseline').addEventListener('change', handleChange);
  $('#model-display').addEventListener('change', () => panes.forEach(applyDisplay));
  $('#model-cutaway').addEventListener('change', () => panes.forEach(applyDisplay));
  $('#model-sync').addEventListener('change', () => { if ($('#model-sync').checked && panes[0].meta) syncNavigation(panes[0]); });
  $('#model-reset').addEventListener('click', resetBoth);
  $('#model-frame').addEventListener('click', () => {
    syncing = true;
    for (const pane of panes) {
      if (!pane.meta) continue;
      const min = vector(pane.meta.bounds.min), max = vector(pane.meta.bounds.max);
      const center = min.clone().add(max).multiplyScalar(0.5);
      const radius = min.distanceTo(max) / 2;
      const verticalFov = THREE.MathUtils.degToRad(pane.camera.fov);
      const effectiveFov = Math.min(verticalFov, 2 * Math.atan(Math.tan(verticalFov / 2) * pane.camera.aspect));
      const distance = radius / Math.sin(effectiveFov / 2) * 1.08;
      pane.controls.target.copy(center);
      pane.camera.position.copy(center).add(new THREE.Vector3(0.7,0.5,1).normalize().multiplyScalar(distance));
      pane.camera.lookAt(center); pane.controls.update(); requestDraw(pane);
    }
    syncing = false;
  });
  for (const [id, angle] of [['model-left',-15],['model-right',15]]) {
    $(`#${id}`).addEventListener('click', () => {
      syncing = true; panes.forEach((pane) => rotate(pane, THREE.MathUtils.degToRad(angle))); syncing = false;
    });
  }
  const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) panes.forEach(requestDraw); }, {rootMargin:'200px'});
  visibility.observe($('#interactive-3d'));
  window.addEventListener('pagehide', () => {
    disposed = true; controller?.abort(); visibility.disconnect();
    panes.forEach((pane) => { cancelAnimationFrame(pane.pendingFrame); pane.resize.disconnect(); disposeModel(pane); pane.controls.dispose(); pane.environment.dispose(); pane.renderer.dispose(); });
    clay.dispose(); wireframe.dispose();
  }, { once:true });
  return { load };
}
