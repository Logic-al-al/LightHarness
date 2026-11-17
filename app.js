'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const sceneData = {
  bedroom: {
    name: 'sunlit bedroom', input: 'bedroom-input',
    edits: [
      ['reconstruction','Reconstruction','RECONSTRUCTED SCENE','Explicit geometry, materials, and lighting. Ready to edit.'],
      ['clay','White model','WHITE MODEL','Inspect the recovered scene geometry without the original materials.'],
      ['blinds','Half-close the blinds','GEOMETRY EDIT','Rotate the blinds and observe the resulting pattern of light and shadow.'],
      ['painting','Insert a painting','OBJECT INSERTION','Add a painting to the wall of the reconstructed scene.'],
      ['neon','Cyberpunk lighting','RELIGHTING','Change the illumination to cyan and magenta in the same reconstructed space.']
    ]
  },
  winter: {
    name: 'winter still life', input: 'winter-input',
    edits: [
      ['reconstruction','Reconstruction','RECONSTRUCTED SCENE','An executable tabletop scene with explicit objects, materials, and light.'],
      ['clay','White model','WHITE MODEL','Inspect the geometry behind the winter tabletop composition.'],
      ['glass','Make the desk glass','MATERIAL EDIT','Change the desktop material and render its reflection and transmission.'],
      ['globe','Add a crystal ball','OBJECT INSERTION','Insert a crystal ball with colored illumination into the reconstructed scene.'],
      ['textures','Vivid textures','TEXTURE EDIT','Replace surface textures while preserving an editable scene.']
    ]
  }
};
let currentScene = 'bedroom';
function setEdit(editKey) {
  const scene = sceneData[currentScene];
  const edit = scene.edits.find((item) => item[0] === editKey);
  $('#scene-output').src = `assets/${currentScene}-${editKey}.webp`;
  $('#scene-output').alt = `${scene.name}: ${edit[1]}, as shown in Figure 1 of the paper`;
  $('#output-label').textContent = edit[2];
  $('#scene-caption').textContent = edit[3];
  $$('#edit-buttons button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.edit === editKey)));
}
$$('[data-scene]').forEach((button) => button.addEventListener('click', () => {
  currentScene = button.dataset.scene;
  const scene = sceneData[currentScene];
  $$('[data-scene]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  $('#scene-input').src = `assets/${scene.input}.webp`;
  $('#scene-input').alt = `Input image of the ${scene.name}`;
  $('#edit-buttons').replaceChildren(...scene.edits.map(([key, label]) => {
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.dataset.edit = key;
    editButton.textContent = label;
    return editButton;
  }));
  setEdit('reconstruction');
}));
$('#edit-buttons').addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit]');
  if (button) setEdit(button.dataset.edit);
});
const comparisons = [
  ['Recovering backlit structure','Inspect how each method reconstructs the foreground against a bright window.','backlit scene'],
  ['Local lights, global structure','Compare the placement of bedside lamps and the warm illumination around them.','bedside lamps'],
  ['A large interior, coherently lit','Compare window illumination, ceiling lighting, and the layout of the hall.','large interior'],
  ['Multiple lighting cues','Compare scene layout and the interaction of local and background illumination.','mixed-lighting room'],
  ['Reconstructing striped shadows','Inspect structured shadows across the wall and bedding together with the furniture layout.','bedroom with striped shadows'],
  ['Beyond indoor scenes','Compare the foreground animals and the surrounding outdoor scene.','outdoor animal scene']
];
let comparisonIndex = 0;
function updateComparison() {
  const [title, description, name] = comparisons[comparisonIndex];
  $('#compare-title').textContent = title;
  $('#compare-description').textContent = description;
  $('#compare-input').src = `assets/comparison-${comparisonIndex}-input.webp`;
  $('#compare-ours').src = `assets/comparison-${comparisonIndex}-ours.webp`;
  $('#compare-input').alt = `Reference image: ${name}`;
  $('#compare-ours').alt = `LightHarness reconstruction: ${name}`;
  updateBaseline();
}
function updateBaseline() {
  const selector = $('#baseline-select');
  $('#baseline-image').src = `assets/comparison-${comparisonIndex}-${selector.value}.webp`;
  $('#baseline-image').alt = `${selector.selectedOptions[0].text}: ${comparisons[comparisonIndex][2]}`;
}
$$('[data-compare-scene]').forEach((button) => button.addEventListener('click', () => {
  comparisonIndex = Number(button.dataset.compareScene);
  $$('[data-compare-scene]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  updateComparison();
}));
$('#baseline-select').addEventListener('change', updateBaseline);
$('#comparison-slider').addEventListener('input', (event) => {
  $('#comparison-canvas').style.setProperty('--position', `${event.target.value}%`);
  event.target.setAttribute('aria-valuetext', `${event.target.value}% input image revealed`);
});
const applicationData = {
  texture: {figure:7, file:'texture-figure', title:'Texture editing', description:'Replace multiple surface textures while retaining an explicit scene structure. The paper also explores GPT-Image post-processing of the rendered edit.'},
  reflection: {figure:8, file:'reflection-figure', title:'Relighting with realistic reflections', description:'Edit the scene lighting and inspect reflections on the tabletop. Compare the direct scene render, direct generative editing, and generative post-processing of the render.'},
  shadow: {figure:9, file:'shadow-figure', title:'Relighting with realistic shadows', description:'Introduce a light source into the reconstructed room and recompute the cast shadows. Figure 9 compares the lighting interactions with direct generative editing.'},
  insertion: {figure:10, file:'insertion-figure', title:'Harmonious object insertion', description:'Place a new painting in the recovered bedroom. Explicit geometry supports its projection, occlusion, and interaction with the existing illumination.'}
};
$$('[data-application]').forEach((button) => button.addEventListener('click', () => {
  const key = button.dataset.application;
  const data = applicationData[key];
  $$('[data-application]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  for (const suffix of ['direct','edit','refined']) {
    $(`#app-${suffix}`).src = `assets/${key}-${suffix}.webp`;
    $(`#app-${suffix}`).alt = `${data.title}: ${suffix === 'direct' ? 'direct GPT-Image editing' : suffix === 'edit' ? 'edit rendered from our reconstructed scene' : 'our edit with GPT-Image post-processing'}`;
  }
  $('#app-description').textContent = data.description;
  $('#app-figure').dataset.zoom = `assets/${data.file}.webp`;
  $('#app-figure').dataset.caption = `Figure ${data.figure} · ${data.title}`;
  $('#app-figure').textContent = `See Figure ${data.figure} ↗`;
}));
const dialog = $('#figure-dialog');
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-zoom]');
  if (!trigger) return;
  event.preventDefault();
  $('#dialog-image').src = trigger.dataset.zoom;
  $('#dialog-image').alt = trigger.dataset.caption;
  $('#dialog-caption').textContent = trigger.dataset.caption;
  dialog.showModal();
});
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

// Lazy-load WebGL and its models only when the reader requests the 3D viewer.
const modelLabels = {ours: 'LightHarness', viga: 'VIGA', '3dcodeverse': '3DCodeVerse', gpt6: 'GPT-6-Sol', scenerig: 'SceneRig'};
function updateModelPosters() {
  const row = $('#model-scene').value, method = $('#model-baseline').value;
  $('#model-baseline-name').textContent = modelLabels[method];
  $('#model-reference').src = `assets/comparison-${row}-input.webp`;
  $('#model-render-ours').src = `assets/comparison-${row}-ours.webp`;
  $('#model-render-baseline').src = `assets/comparison-${row}-${method}.webp`;
  $('#model-render-baseline').alt = `${modelLabels[method]} paper rendering from Figure 4`;
  $('#model-render-baseline-caption').textContent = `${modelLabels[method]} · Paper rendering`;
  for (const [pane, key] of [['ours','ours'],['baseline',method]]) {
    $(`#model-stage-${pane} .model-poster`).src = `assets/comparison-${row}-${key}.webp`;
  }
}
$('#model-scene').addEventListener('change', updateModelPosters);
$('#model-baseline').addEventListener('change', updateModelPosters);
let modelViewer = null;
$('#load-models').addEventListener('click', async () => {
  const button = $('#load-models');
  button.disabled = true;
  $('#model-status').textContent = 'Starting the 3D viewer…';
  try {
    if (!modelViewer) {
      const module = await import('./viewer3d.js');
      modelViewer = module.createViewer();
    }
    await modelViewer.load();
  } catch (error) {
    $('#model-status').textContent = `Unable to start 3D: ${error.message}. Use a WebGL 2-capable browser with hardware acceleration enabled, or inspect the paper renderings below.`;
    button.textContent = 'Retry 3D viewer';
  } finally {
    button.disabled = false;
  }
});
