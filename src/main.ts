import {vec2, vec3, vec4, mat3 ,mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Cube from './geometry/Cube';
import HexagonalPrism from './geometry/HexagonalPrism';
import Square from './geometry/Square';
import Plane from './geometry/Plane';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Edge from './road/Edge';
import RoadGenerator from './road/RoadGenerator';
import CityGenerator from './city/CityGenerator';
import {testCityGenerator} from './test';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  displayElevation: false,
  displayPopDensity: true,
  waterLevel: 0.5,
  startPositionX: 73.4075,
  startPositionY: 22.76785,
  lockStartPos: false,
  useRandomness: true,
  maxIterations: 20,
  globalGridAngle: 22.5,
  showGridAngleHelp: false,
  'Generate New': loadScene
};

let square: Square,
    screenQuad: ScreenQuad,
    cube: Cube,
    roadCube: Cube,
    hexagonalPrism: HexagonalPrism,
    plane: Plane,
    time: number = 0.0,
    rgCityHeight: number = 512, // the width will scale based on window's aspect ratio.
    rgGridHeight: number = 8,
    cgCityHeight: number = 512,
    cgGridHeight: number = cgCityHeight / 2,
    planeHeight: number = 17,
    aspectRatio: number = window.innerWidth / window.innerHeight,
    rgen: RoadGenerator,
    cgen: CityGenerator,
    projectionMatrix: mat4;


//////////////////////
// RENDERING ARRAYS 
//////////////////////

let buildingTCol1Array : Array<number>,
    buildingTCol2Array : Array<number>,
    buildingTCol3Array : Array<number>,
    buildingTCol4Array : Array<number>,
    buildingColorsArray : Array<number>;

function createMeshes() {
  square = new Square();
  cube = new Cube(vec3.fromValues(0, 0, 0));
  roadCube = new Cube(vec3.fromValues(0, 0, 0));
  screenQuad = new ScreenQuad();
  hexagonalPrism = new HexagonalPrism(vec3.fromValues(0, 0, 0));
  plane = new Plane(vec3.fromValues(0,0,0),
                    vec2.fromValues(aspectRatio * planeHeight, planeHeight), 12);
  cube.create();
  cube.setInstanced(true);
  roadCube.create();
  roadCube.setInstanced(true);
  square.create();
  screenQuad.create();
  hexagonalPrism.create();
  plane.create();
}

function initializeGenerators() {

  // Calculate projection matrix for roads
  let translate = mat4.create(),
          scale = mat4.create(),
          planeScale = mat4.create();

  mat4.fromTranslation(translate, vec3.fromValues(aspectRatio * planeHeight / 2,
                                                  controls.waterLevel + 0.15,
                                                  -planeHeight / 2));

  mat4.fromScaling(scale, vec3.fromValues(-2 / Math.floor(rgCityHeight), 1, 2 / rgCityHeight));
  mat4.fromScaling(planeScale, vec3.fromValues(planeHeight / 2,
                                                1, planeHeight / 2));

  projectionMatrix = mat4.create();
  mat4.multiply(projectionMatrix, planeScale, scale);
  mat4.multiply(projectionMatrix, translate, projectionMatrix);

  // Calculate grid based on window dimensions
  let rgCityDimensions : vec2 = vec2.fromValues(Math.floor(aspectRatio * rgCityHeight), rgCityHeight),
      rgGridDimensions : vec2 = vec2.fromValues(Math.floor(aspectRatio * rgGridHeight), rgGridHeight);

  let cgCityDimensions : vec2 = vec2.fromValues(Math.floor(aspectRatio * cgCityHeight), cgCityHeight),
      cgGridDimensions : vec2 = vec2.fromValues(Math.floor(aspectRatio * cgGridHeight), cgGridHeight);


  rgen = new RoadGenerator(rgCityDimensions, rgGridDimensions);
  cgen = new CityGenerator(cgCityDimensions, cgGridDimensions);
}

function generateRoads() {

  rgen.setUseMyStartPos(controls.lockStartPos);
  if(controls.lockStartPos) {
    rgen.startPos[0] = controls.startPositionX;
    rgen.startPos[1] = controls.startPositionY;
  }

  rgen.setWaterLevel(controls.waterLevel);
  rgen.setUseRandomness(controls.useRandomness);
  rgen.setMaxGridIterations(controls.maxIterations);
  rgen.setGlobalGridAngle(controls.globalGridAngle);
  rgen.reset();
  controls.startPositionX = rgen.startPos[0];
  controls.startPositionY = rgen.startPos[1];
  rgen.generateRoads();

  let instances : Array<Array<number>> = rgen.getInstancedAttributes();

  roadCube.setInstanceVBOs(new Float32Array(instances[0]),
                           new Float32Array(instances[1]),
                           new Float32Array(instances[2]),
                           new Float32Array(instances[3]),
                           new Float32Array(instances[4]));
  roadCube.setNumInstances(rgen.getRoadCount());
}

function generateCity() {
  cgen.setWaterLevel(controls.waterLevel);
  cgen.reset();
  cgen.setRoads(rgen.getAllRoads());
  cgen.generateCity();
  let points : Array<vec2> = cgen.getBuildingPositions();

  let instances : Array<Array<number>> = cgen.getInstancedAttributes();

  cube.setInstanceVBOs(new Float32Array(instances[0]),
                           new Float32Array(instances[1]),
                           new Float32Array(instances[2]),
                           new Float32Array(instances[3]),
                           new Float32Array(instances[4]));
  cube.setNumInstances(cgen.getBuildingCount());
}

function loadScene() {
  generateRoads();
  generateCity();
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Create meshes
  createMeshes();

  const camera = new Camera(vec3.fromValues(0, 10, -20), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);

  // Create shaders

  const road = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const building = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/building-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/building-frag.glsl')),
  ]);

  const terrain = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/terrain-frag.glsl')),
  ]);

  terrain.setDimensions(aspectRatio * planeHeight, planeHeight);
  terrain.setWaterLevel(controls.waterLevel);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const data = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/data-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/data-frag.glsl')),
  ]);

  //testCityGenerator();

  // Create and bind the texture
  const t_width = window.innerWidth;
  const t_height = window.innerHeight;
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t_width, t_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  // Set texture's render settings
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);   
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); 
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create and bind the frame buffer
  var texture_fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, texture_fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Create and bind the render buffer
  var texture_rb = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, texture_rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, t_width, t_height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, texture_rb);

  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      console.log("error");
  }

  // Render data first
  gl.viewport(0, 0, window.innerWidth, window.innerHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  camera.update();
  renderer.render(camera, data, [screenQuad]);

  gl.bindFramebuffer(gl.FRAMEBUFFER, texture_fb);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  let pixelData = new Uint8Array(t_width * t_height * 4);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
    gl.readPixels(0, 0, t_width, t_height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
  }

  initializeGenerators();
  rgen.setData(pixelData, vec2.fromValues(t_width, t_height));
  cgen.setData(pixelData, vec2.fromValues(t_width, t_height));
  road.set3DProjMatrix(projectionMatrix);
  building.set3DProjMatrix(projectionMatrix);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, window.innerWidth, window.innerHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);

  // Initial call to load scene
  loadScene();

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    flat.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, terrain, [plane]);
    renderer.render(camera, road, [roadCube]);
    renderer.render(camera, building, [cube]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    flat.setDimensions(window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  flat.setDimensions(window.innerWidth, window.innerHeight);

  // Start the render loop
  tick();
}

main();