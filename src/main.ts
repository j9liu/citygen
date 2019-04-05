import {vec2, vec3, vec4, mat3} from 'gl-matrix';
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

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  displayElevation: false,
  displayPopDensity: false,
  waterLevel: 0.5,
  maxHighwayLength: 200,
  maxHighwayAngle: 60,
  'Generate': loadScene
};

let square: Square,
    screenQuad: ScreenQuad,
    cube: Cube,
    hexagonalPrism: HexagonalPrism,
    plane: Plane,
    time: number = 0.0;

//// NOISE FUNCTIONS FOR DATA GENERATION ////
function random(p: vec2, seed: vec2) : number {
  let sum : vec2 = vec2.create();
  vec2.add(sum, p, seed);
  let temp : number = Math.sin(vec2.dot(sum, vec2.fromValues(127.1 * 43758.5453, 311.7 * 43758.5453)));
  return temp - Math.floor(temp);
}

function interpNoise2D(x: number, y: number) : number {
  let intX = Math.floor(x);
  let fractX = x - intX;
  let intY = Math.floor(y);
  let fractY = x - intY;

  let v1 : number = random(vec2.fromValues(intX, intY), vec2.fromValues(0, 0));
  let v2 : number = random(vec2.fromValues(intX + 1, intY), vec2.fromValues(0, 0));
  let v3 : number = random(vec2.fromValues(intX, intY + 1), vec2.fromValues(0, 0));
  let v4 : number = random(vec2.fromValues(intX + 1, intY + 1), vec2.fromValues(0, 0));

  let i1 : number = v1 * (1 - fractX) + v2 * fractX;
  let i2 : number = v3 * (1 - fractX) + v4 * fractX;
  return i1 * (1 - fractY) + i2 * fractY;
}

function fbm2(p: vec2) : number {
  let total: number = 0.
  let persistence: number = 0.5;
  let octaves: number = 8;

  for(let i = 0; i < octaves; i++) {
    let freq: number = Math.pow(2., i);
    let amp: number = Math.pow(persistence, i);
    total += interpNoise2D(p[0] * freq, p[1] * freq) * amp;
  }

  return total;
}  

let cellSize : number = 2.;

function generate_point(cell: vec2) : vec2 {
    let p : vec2 = vec2.fromValues(cell[0], cell[1]);
    let rand : vec2 = vec2.fromValues(vec2.dot(p, vec2.fromValues(127.1, 311.7)),
                                     vec2.dot(p, vec2.fromValues(269.5, 183.3)) * 43758.5453);
    let r0 : number = Math.sin(rand[0]);
    let r1 : number = Math.sin(rand[1]);
    vec2.add(p, p, vec2.fromValues(r0 - Math.floor(r0), r1 - Math.floor(r1))); 
    vec2.scale(p, p, cellSize);
    return p;
}

function worleyNoise(p: vec2) : number {
    let cell : vec2 = vec2.fromValues(Math.floor(p[0] / cellSize), Math.floor(p[1] / cellSize));
    let point : vec2 = generate_point(cell);
    let shortest_distance : number = vec2.distance(p, point);

   // compute shortest distance from cell + neighboring cell points
    for(let i = -1.; i <= 1.; i += 1.) {
        let ncell_x : number = cell[0] + i;
        for(let j = -1.; j <= 1.; j += 1.) {
            let ncell_y : number = cell[1] + j;

            // get the point for that cell
            let npoint : vec2 = generate_point(vec2.fromValues(ncell_x, ncell_y));

            // compare to previous distances
            let distance = vec2.distance(p, npoint);
            if(distance < shortest_distance) {
                shortest_distance = distance;
            }
        }
    }

    return shortest_distance / cellSize;
}

//// ELEVATION / POPULATION FUNCTIONS ////
// The given point is always defined in city space.

function getElevation(point : vec2) : number {
  let tpoint : vec2 = vec2.create();
  vec2.divide(tpoint, point, vec2.fromValues(cw, ch));
  let temp : vec2 = vec2.create();
  vec2.scaleAndAdd(temp, vec2.fromValues(1., -0.4), tpoint, 2);
  return Math.pow(fbm2(temp), 5.);
}

function getPopulation(point : vec2) : number {
  let tpoint : vec2 = vec2.create();
  vec2.divide(tpoint, point, vec2.fromValues(cw, ch));
  let temp : vec2 = vec2.create();
  vec2.scaleAndAdd(temp, vec2.fromValues(0.3, 7.0), tpoint, 2.);
  return 1. - worleyNoise(tpoint) * fbm2(temp);
}

/* 
 * Define the bounds of "city space", which will to go from (0, 0) in the lower left corner
 * to (cw, ch) in the upper right corner. All coordinates here function within that space
 * and are then transformed to fit the screen at the end.
 */

const cw: number = 512;
const ch: number = 512;


// Define the size of the plane used to ground our city
const pw: number = 100;
const ph: number = 100;

///////////////////////////////////
//////   CITY GENERATION     //////
///////////////////////////////////
/*
let cg : CityGenerator = new CityGenerator(cw, ch);
cg.rasterizeWater(getElevation, controls.waterLevel);
cg.rasterizeRoads();
cg.generateBuildingPoints();
cg.generateBuildings(getPopulation);*/

function createMeshes() {
  square = new Square();  
  square.create();
  screenQuad = new ScreenQuad();
  screenQuad.create();
  plane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(pw,ph), 20);
  plane.create();
}

function loadScene() {

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

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(50, 50, 10), vec3.fromValues(50, 50, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const terrain = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/terrain-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, flat, [screenQuad],
                    controls.displayElevation, controls.displayPopDensity, controls.waterLevel);
    renderer.render(camera, terrain, [plane], false, false, 0);
    renderer.render(camera, instancedShader, [], false, false, 0);
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