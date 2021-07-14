import { gl } from '../../globals';
class Drawable {
    constructor() {
        this.count = 0;
        this.idxGenerated = false;
        this.posGenerated = false;
        this.norGenerated = false;
        this.colGenerated = false;
        this.transform1Generated = false;
        this.transform2Generated = false;
        this.transform3Generated = false;
        this.transform4Generated = false;
        this.uvGenerated = false;
        this.floorTypeGenerated = false;
        this.instanced = false; // Set true if this geometry is meant to be instanced.
        this.numInstances = 0; // How many instances of this Drawable the shader program should draw
    }
    destroy() {
        gl.deleteBuffer(this.bufIdx);
        gl.deleteBuffer(this.bufPos);
        gl.deleteBuffer(this.bufNor);
        gl.deleteBuffer(this.bufCol);
        gl.deleteBuffer(this.bufTransform1);
        gl.deleteBuffer(this.bufTransform2);
        gl.deleteBuffer(this.bufTransform3);
        gl.deleteBuffer(this.bufTransform4);
        gl.deleteBuffer(this.bufUV);
        gl.deleteBuffer(this.bufFloorType);
    }
    generateIdx() {
        this.idxGenerated = true;
        this.bufIdx = gl.createBuffer();
    }
    generatePos() {
        this.posGenerated = true;
        this.bufPos = gl.createBuffer();
    }
    generateNor() {
        this.norGenerated = true;
        this.bufNor = gl.createBuffer();
    }
    generateCol() {
        this.colGenerated = true;
        this.bufCol = gl.createBuffer();
    }
    generateTransform1() {
        this.transform1Generated = true;
        this.bufTransform1 = gl.createBuffer();
    }
    generateTransform2() {
        this.transform2Generated = true;
        this.bufTransform2 = gl.createBuffer();
    }
    generateTransform3() {
        this.transform3Generated = true;
        this.bufTransform3 = gl.createBuffer();
    }
    generateTransform4() {
        this.transform4Generated = true;
        this.bufTransform4 = gl.createBuffer();
    }
    generateUV() {
        this.uvGenerated = true;
        this.bufUV = gl.createBuffer();
    }
    generateFloorType() {
        this.floorTypeGenerated = true;
        this.bufFloorType = gl.createBuffer();
    }
    bindIdx() {
        if (this.idxGenerated) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        }
        return this.idxGenerated;
    }
    bindPos() {
        if (this.posGenerated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        }
        return this.posGenerated;
    }
    bindNor() {
        if (this.norGenerated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        }
        return this.norGenerated;
    }
    bindCol() {
        if (this.colGenerated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
        }
        return this.colGenerated;
    }
    bindTransform1() {
        if (this.transform1Generated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform1);
        }
        return this.transform1Generated;
    }
    bindTransform2() {
        if (this.transform2Generated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform2);
        }
        return this.transform2Generated;
    }
    bindTransform3() {
        if (this.transform3Generated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform3);
        }
        return this.transform3Generated;
    }
    bindTransform4() {
        if (this.transform4Generated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTransform4);
        }
        return this.transform4Generated;
    }
    bindUV() {
        if (this.uvGenerated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
        }
        return this.uvGenerated;
    }
    bindFloorType() {
        if (this.floorTypeGenerated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufFloorType);
        }
        return this.floorTypeGenerated;
    }
    elemCount() {
        return this.count;
    }
    drawMode() {
        return gl.TRIANGLES;
    }
    setInstanced(val) {
        this.instanced = val;
    }
    setNumInstances(num) {
        this.numInstances = num;
    }
}
;
export default Drawable;
//# sourceMappingURL=Drawable.js.map