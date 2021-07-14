import Drawable from '../rendering/gl/Drawable';
import { gl } from '../globals';
class Square extends Drawable {
    constructor() {
        super(); // Call the constructor of the super class. This is required.
    }
    create() {
        this.indices = new Uint32Array([0, 1, 2,
            0, 2, 3]);
        this.positions = new Float32Array([-0.5, 0, -0.5, 1,
            0.5, 0, -0.5, 1,
            0.5, 0, 0.5, 1,
            -0.5, 0, 0.5, 1]);
        this.generateIdx();
        this.generatePos();
        this.generateCol();
        this.generateTransform1();
        this.generateTransform2();
        this.generateTransform3();
        this.generateTransform4();
        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);
        console.log(`Created square`);
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
}
;
export default Square;
//# sourceMappingURL=Square.js.map