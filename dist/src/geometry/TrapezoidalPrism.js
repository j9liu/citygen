import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import { gl } from '../globals';
function pushVec4ToNumberArray(vec, array) {
    for (let i = 0; i < 4; i++) {
        array.push(vec[i]);
    }
}
class TrapezoidPrism extends Drawable {
    constructor(center, topScale, bottomScale, height) {
        super(); // Call the constructor of the super class. This is required.
        this.center = vec3.fromValues(center[0], center[1], center[2]);
        this.topScale = vec2.fromValues(topScale[0], topScale[1]);
        this.bottomScale = vec2.fromValues(bottomScale[0], bottomScale[1]);
        this.height = height;
    }
    create() {
        this.indices = new Uint32Array([0, 1, 2,
            0, 2, 3,
            4, 5, 6,
            4, 6, 7,
            8, 9, 10,
            8, 10, 11,
            12, 13, 14,
            12, 14, 15,
            16, 17, 18,
            16, 18, 19,
            20, 21, 22,
            20, 22, 23]);
        this.normals = new Float32Array([0, 0, -1, 0,
            0, 0, -1, 0,
            0, 0, -1, 0,
            0, 0, -1, 0,
            0, 0, 1, 0,
            0, 0, 1, 0,
            0, 0, 1, 0,
            0, 0, 1, 0,
            -1, 0, 0, 0,
            -1, 0, 0, 0,
            -1, 0, 0, 0,
            -1, 0, 0, 0,
            1, 0, 0, 0,
            1, 0, 0, 0,
            1, 0, 0, 0,
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, -1, 0, 0,
            0, -1, 0, 0,
            0, -1, 0, 0,
            0, 1, 0, 0,
            0, 1, 0, 0,
            0, 1, 0, 0,
            0, 1, 0, 0]);
        let bottomPos = [vec4.fromValues(-.5, -.5, -.5, 1),
            vec4.fromValues(.5, -.5, -.5, 1),
            vec4.fromValues(.5, -.5, .5, 1),
            vec4.fromValues(-.5, -.5, .5, 1)];
        let topPos = [vec4.fromValues(-.5, .5, -.5, 1),
            vec4.fromValues(.5, .5, -.5, 1),
            vec4.fromValues(.5, .5, .5, 1),
            vec4.fromValues(-.5, .5, .5, 1)];
        let bottomScaleMat = mat4.fromScaling(mat4.create(), vec3.fromValues(this.bottomScale[0], this.height / 2, this.bottomScale[1]));
        let topScaleMat = mat4.fromScaling(mat4.create(), vec3.fromValues(this.topScale[0], this.height / 2, this.topScale[1]));
        for (let i = 0; i < 4; i++) {
            let bPos = bottomPos[i];
            vec4.transformMat4(bPos, bPos, bottomScaleMat);
            let tPos = topPos[i];
            vec4.transformMat4(tPos, tPos, topScaleMat);
        }
        this.positions = new Float32Array([-.5, -.5, -.5, 1,
            .5, -.5, -.5, 1,
            .5, .5, -.5, 1,
            -.5, .5, -.5, 1,
            -.5, -.5, .5, 1,
            .5, -.5, .5, 1,
            .5, .5, .5, 1,
            -.5, .5, .5, 1,
            -.5, -.5, -.5, 1,
            -.5, -.5, .5, 1,
            -.5, .5, .5, 1,
            -.5, .5, -.5, 1,
            .5, -.5, -.5, 1,
            .5, -.5, .5, 1,
            .5, .5, .5, 1,
            .5, .5, -.5, 1,
            -.5, -.5, -.5, 1,
            -.5, -.5, .5, 1,
            .5, -.5, .5, 1,
            .5, -.5, -.5, 1,
            -.5, .5, -.5, 1,
            -.5, .5, .5, 1,
            .5, .5, .5, 1,
            .5, .5, -.5, 1]);
        this.uvs = new Float32Array([0, 0,
            1, 0,
            1, 1,
            0, 1,
            1, 0,
            0, 0,
            0, 1,
            1, 1,
            1, 0,
            0, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            1, 1,
            0, 1,
            0, 0,
            0, 1,
            1, 1,
            1, 0,
            0, 0,
            0, 1,
            1, 1,
            1, 0]);
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
        console.log(`Created trapezoidal prism`);
    }
    setInstanceVBOs(col1, col2, col3, col4, colors) {
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
    setInstanceVBOsForBuildings(col1, col2, col3, col4, fts) {
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
}
;
export default TrapezoidPrism;
//# sourceMappingURL=TrapezoidalPrism.js.map