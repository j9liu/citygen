import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class HexagonalPrism extends Drawable {
  center: vec3;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  transcol1: Float32Array; // Data for bufTransform1
  transcol2: Float32Array; // Data for bufTransform2
  transcol3: Float32Array; // Data for bufTransform3
  transcol4: Float32Array; // Data for bufTransform4
  floorTypes: Float32Array; // Influences procedural textures in the fragment shader.

  constructor(center: vec3) {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec3.fromValues(center[0], center[1], center[2]);
  }

  create() {
    let rt3 : number = Math.sqrt(3);
    this.indices = new Uint32Array([0, 1, 2, // top hexagon
                                    0, 2, 3,
                                    0, 3, 4,
                                    0, 4, 5,
                                    6, 7, 8, // bottom hexagon
                                    6, 8, 9,
                                    6, 9, 10,
                                    6, 10, 11,
                                    12, 13, 14, // upperright side
                                    12, 14, 15,
                                    16, 17, 18, // uppermost side
                                    16, 18, 19,
                                    20, 21, 22,  // upperleft side
                                    20, 22, 23,
                                    24, 25, 26, // lowerleft side
                                    24, 26, 27,
                                    28, 29, 30, // lowermost side
                                    28, 30, 31,
                                    32, 33, 34, // lowerright side
                                    32, 34, 35]);

    this.positions = new Float32Array([  0.5, 0.5, 0, 1,            // rightmost point, top hexagon
                                        0.25, 0.5, 0.25 * rt3, 1,   // upperright point, top hexagon
                                       -0.25, 0.5, 0.25 * rt3, 1,   // upperleft point, top hexagon
                                        -0.5, 0.5, 0, 1,            // leftmost point, top hexagon
                                       -0.25, 0.5, -0.25 * rt3, 1,  // bottomleft point, top hexagon
                                        0.25, 0.5, -0.25 * rt3, 1,  // bottomright point, top hexagon

                                         0.5, -0.5, 0, 1,           // rightmost point, bottom hexagon
                                        0.25, -0.5, 0.25 * rt3, 1,  // upperright point, bottom hexagon
                                       -0.25, -0.5, 0.25 * rt3, 1,  // upperleft point, bottom hexagon
                                        -0.5, -0.5, 0, 1,           // leftmost point, bottom hexagon
                                       -0.25, -0.5, -0.25 * rt3, 1, // bottomleft point, bottom hexagon
                                        0.25, -0.5, -0.25 * rt3, 1, // bottomright point, bottom hexagon

                                         0.5, 0.5, 0, 1,             // rightmost point, top hexagon
                                         0.5, -0.5, 0, 1,            // rightmost point, bottom hexagon
                                         0.25, -0.5, 0.25 * rt3, 1,  // upperright point, bottom hexagon
                                         0.25, 0.5, 0.25 * rt3, 1,   // upperright point, top hexagon

                                         0.25, 0.5, 0.25 * rt3, 1,   // upperright point, top hexagon
                                         0.25, -0.5, 0.25 * rt3, 1,  // upperright point, bottom hexagon
                                        -0.25, -0.5, 0.25 * rt3, 1,  // upperleft point, bottom hexagon
                                        -0.25, 0.5, 0.25 * rt3, 1,   // upperleft point, top hexagon 

                                        -0.25, 0.5, 0.25 * rt3, 1,   // upperleft point, top hexagon 
                                        -0.25, -0.5, 0.25 * rt3, 1,  // upperleft point, bottom hexagon
                                         -0.5, -0.5, 0, 1,           // leftmost point, bottom hexagon
                                         -0.5, 0.5, 0, 1,            // leftmost point, top hexagon

                                         -0.5, 0.5, 0, 1,            // leftmost point, top hexagon 
                                         -0.5, -0.5, 0, 1,           // leftmost point, bottom hexagon
                                        -0.25, -0.5, -0.25 * rt3, 1, // bottomleft point, bottom hexagon
                                        -0.25, 0.5, -0.25 * rt3, 1,  // bottomleft point, top hexagon

                                        -0.25, 0.5, -0.25 * rt3, 1,  // bottomleft point, top hexagon 
                                        -0.25, -0.5, -0.25 * rt3, 1, // bottomleft point, bottom hexagon
                                         0.25, -0.5, -0.25 * rt3, 1, // bottomright point, bottom hexagon
                                         0.25, 0.5, -0.25 * rt3, 1,  // bottomright point, top hexagon

                                         0.25, 0.5, -0.25 * rt3, 1,  // bottomright point, top hexagon
                                         0.25, -0.5, -0.25 * rt3, 1, // bottomright point, bottom hexagon
                                          0.5, -0.5, 0, 1,           // rightmost point, bottom hexagon
                                          0.5, 0.5, 0, 1]);

    this.normals = new Float32Array([ 0, 1, 0, 0,
                                      0, 1, 0, 0,
                                      0, 1, 0, 0,
                                      0, 1, 0, 0,
                                      0, 1, 0, 0,
                                      0, 1, 0, 0,

                                      0, -1, 0, 0,
                                      0, -1, 0, 0,
                                      0, -1, 0, 0,
                                      0, -1, 0, 0,
                                      0, -1, 0, 0,
                                      0, -1, 0, 0,

                                      0.5 * rt3, 0, 0.5, 0,
                                      0.5 * rt3, 0, 0.5, 0,
                                      0.5 * rt3, 0, 0.5, 0,
                                      0.5 * rt3, 0, 0.5, 0,

                                      0, 0, 1, 0,
                                      0, 0, 1, 0,
                                      0, 0, 1, 0,
                                      0, 0, 1, 0,

                                     -0.5 * rt3, 0, 0.5, 0,
                                     -0.5 * rt3, 0, 0.5, 0,
                                     -0.5 * rt3, 0, 0.5, 0,
                                     -0.5 * rt3, 0, 0.5, 0,

                                     -0.5 * rt3, 0, -0.5, 0,
                                     -0.5 * rt3, 0, -0.5, 0,
                                     -0.5 * rt3, 0, -0.5, 0,
                                     -0.5 * rt3, 0, -0.5, 0,

                                      0, 0, -1, 0,
                                      0, 0, -1, 0,
                                      0, 0, -1, 0,
                                      0, 0, -1, 0,

                                      0.5 * rt3, 0, -0.5, 0,
                                      0.5 * rt3, 0, -0.5, 0,
                                      0.5 * rt3, 0, -0.5, 0,
                                      0.5 * rt3, 0, -0.5, 0]);

    this.uvs = new Float32Array([1.0, 0.5,
                                 0.75, 0.25 * rt3 + 0.5,
                                 -0.75, 0.25 * rt3 + 0.5,
                                 -1.0, 0.5,
                                 -0.75, -0.25 * rt3 - 0.5,
                                 0.75, -0.25 * rt3 - 0.5,

                                 -1.0, 0.5,
                                 -0.75, -0.25 * rt3 - 0.5,
                                 0.75, -0.25 * rt3 - 0.5,
                                 1.0, 0.5,
                                 0.75, 0.25 * rt3 + 0.5,
                                 -0.75, 0.25 * rt3 + 0.5,

                                 0, 1,
                                 0, 0,
                                 1, 0,
                                 1, 1,

                                 0, 1,
                                 0, 0,
                                 1, 0,
                                 1, 1,

                                 0, 1,
                                 0, 0,
                                 1, 0,
                                 1, 1,

                                 0, 1,
                                 0, 0,
                                 1, 0,
                                 1, 1,

                                 0, 1,
                                 0, 0,
                                 1, 0,
                                 1, 1,

                                 0, 1,
                                 0, 0,
                                 1, 0,
                                 1, 1
                                 ]);

    let translate : mat4 = mat4.fromTranslation(mat4.create(), this.center);
    let length : number = this.positions.length;
    let pos = this.positions;
    for(let i = 0; i < length; i += 4) {
      let posScratch : vec4 = vec4.fromValues(pos[i], pos[i + 1], pos[i + 2], pos[i + 3]);
      vec4.transformMat4(posScratch, posScratch, translate);
      for(let j = 0; j < 4; j++) {
        pos[i + j] = posScratch[j];
      }
    }

    this.generateIdx();
    this.generatePos();
    this.generateNor();
    this.generateCol();
    this.generateUV();
    this.generateTransform1();
    this.generateTransform2();
    this.generateTransform3();
    this.generateTransform4();
    this.generateFloorType();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

    console.log(`Created hexagonal prism`);
  }

  setInstanceVBOs(col1: Float32Array, col2: Float32Array, col3: Float32Array, col4: Float32Array,
                  colors: Float32Array) {
    this.colors = colors;
    this.transcol1 = col1;
    this.transcol2 = col2;
    this.transcol3 = col3;
    this.transcol4 = col4;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform1);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol1, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform2);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol2, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform3);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol3, gl.STATIC_DRAW);
 
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform4);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol4, gl.STATIC_DRAW);
  }

  setInstanceVBOsForBuildings(col1: Float32Array, col2: Float32Array, col3: Float32Array, col4: Float32Array,
                  fts: Float32Array) {
    this.transcol1 = col1;
    this.transcol2 = col2;
    this.transcol3 = col3;
    this.transcol4 = col4;
    this.floorTypes = fts;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform1);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol1, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform2);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol2, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform3);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol3, gl.STATIC_DRAW);
 
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform4);
    gl.bufferData(gl.ARRAY_BUFFER, this.transcol4, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufFloorType);
    gl.bufferData(gl.ARRAY_BUFFER, this.floorTypes, gl.STATIC_DRAW);
  }
};

export default HexagonalPrism;
