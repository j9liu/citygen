import { mat4 } from 'gl-matrix';
import { gl } from '../../globals';
var activeProgram = null;
export class Shader {
    constructor(type, source) {
        this.shader = gl.createShader(type);
        gl.shaderSource(this.shader, source);
        gl.compileShader(this.shader);
        if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
            throw gl.getShaderInfoLog(this.shader);
        }
    }
}
;
class ShaderProgram {
    constructor(shaders) {
        this.prog = gl.createProgram();
        for (let shader of shaders) {
            gl.attachShader(this.prog, shader.shader);
        }
        gl.linkProgram(this.prog);
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            throw gl.getProgramInfoLog(this.prog);
        }
        this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
        this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
        this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
        this.attrTransform1 = gl.getAttribLocation(this.prog, "vs_Transform1");
        this.attrTransform2 = gl.getAttribLocation(this.prog, "vs_Transform2");
        this.attrTransform3 = gl.getAttribLocation(this.prog, "vs_Transform3");
        this.attrTransform4 = gl.getAttribLocation(this.prog, "vs_Transform4");
        this.attrUV = gl.getAttribLocation(this.prog, "vs_UV");
        this.attrFloorType = gl.getAttribLocation(this.prog, "vs_FloorType");
        this.unifModel = gl.getUniformLocation(this.prog, "u_Model");
        this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
        this.unifViewProj = gl.getUniformLocation(this.prog, "u_ViewProj");
        this.unif2DProj = gl.getUniformLocation(this.prog, "u_2DProj");
        this.unif3DProj = gl.getUniformLocation(this.prog, "u_3DProj");
        this.unifCameraAxes = gl.getUniformLocation(this.prog, "u_CameraAxes");
        this.unifTime = gl.getUniformLocation(this.prog, "u_Time");
        this.unifEye = gl.getUniformLocation(this.prog, "u_Eye");
        this.unifRef = gl.getUniformLocation(this.prog, "u_Ref");
        this.unifUp = gl.getUniformLocation(this.prog, "u_Up");
        this.unifDimensions = gl.getUniformLocation(this.prog, "u_Dimensions");
        this.unifShowElevation = gl.getUniformLocation(this.prog, "u_ShowElevation");
        this.unifShowPopulation = gl.getUniformLocation(this.prog, "u_ShowPopulation");
        this.unifWaterLevel = gl.getUniformLocation(this.prog, "u_WaterLevel");
        this.unifLightDirections = gl.getUniformLocation(this.prog, "u_LightDirections");
        this.unifLightColors = gl.getUniformLocation(this.prog, "u_LightColors");
    }
    use() {
        if (activeProgram !== this.prog) {
            gl.useProgram(this.prog);
            activeProgram = this.prog;
        }
    }
    setEyeRefUp(eye, ref, up) {
        this.use();
        if (this.unifEye !== -1) {
            gl.uniform3f(this.unifEye, eye[0], eye[1], eye[2]);
        }
        if (this.unifRef !== -1) {
            gl.uniform3f(this.unifRef, ref[0], ref[1], ref[2]);
        }
        if (this.unifUp !== -1) {
            gl.uniform3f(this.unifUp, up[0], up[1], up[2]);
        }
    }
    setDimensions(width, height) {
        this.use();
        if (this.unifDimensions !== -1) {
            gl.uniform2f(this.unifDimensions, width, height);
        }
    }
    setModelMatrix(model) {
        this.use();
        if (this.unifModel !== -1) {
            gl.uniformMatrix4fv(this.unifModel, false, model);
        }
        if (this.unifModelInvTr !== -1) {
            let modelinvtr = mat4.create();
            mat4.transpose(modelinvtr, model);
            mat4.invert(modelinvtr, modelinvtr);
            gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
        }
    }
    setViewProjMatrix(vp) {
        this.use();
        if (this.unifViewProj !== -1) {
            gl.uniformMatrix4fv(this.unifViewProj, false, vp);
        }
    }
    set2DProjMatrix(p) {
        this.use();
        if (this.unif2DProj !== -1) {
            gl.uniformMatrix3fv(this.unif2DProj, false, p);
        }
    }
    set3DProjMatrix(p) {
        this.use();
        if (this.unif3DProj !== -1) {
            gl.uniformMatrix4fv(this.unif3DProj, false, p);
        }
    }
    setCameraAxes(axes) {
        this.use();
        if (this.unifCameraAxes !== -1) {
            gl.uniformMatrix3fv(this.unifCameraAxes, false, axes);
        }
    }
    setTime(t) {
        this.use();
        if (this.unifTime !== -1) {
            gl.uniform1f(this.unifTime, t);
        }
    }
    setShowElevation(val) {
        this.use();
        if (this.unifShowElevation !== -1) {
            gl.uniform1f(this.unifShowElevation, val);
        }
    }
    setShowPopulation(val) {
        this.use();
        if (this.unifShowPopulation !== -1) {
            gl.uniform1f(this.unifShowPopulation, val);
        }
    }
    setWaterLevel(level) {
        this.use();
        if (this.unifWaterLevel !== -1) {
            gl.uniform1f(this.unifWaterLevel, level);
        }
    }
    setLightData(lightDir, lightCol) {
        this.use();
        let lightDirFloats = [], lightColFloats = [];
        for (let i = 0; i < lightDir.length; i++) {
            for (let j = 0; j < 3; j++) {
                lightDirFloats.push(lightDir[i][j]);
                lightColFloats.push(lightCol[i][j]);
            }
        }
        if (this.unifLightDirections !== -1) {
            gl.uniform3fv(this.unifLightDirections, lightDirFloats);
        }
        if (this.unifLightColors !== -1) {
            gl.uniform3fv(this.unifLightColors, lightColFloats);
        }
    }
    draw(d) {
        this.use();
        if (this.attrPos != -1 && d.bindPos()) {
            gl.enableVertexAttribArray(this.attrPos);
            gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrPos, 0); // Advance 1 index in pos VBO for each vertex
        }
        if (this.attrNor != -1 && d.bindNor()) {
            gl.enableVertexAttribArray(this.attrNor);
            gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrNor, 0); // Advance 1 index in nor VBO for each vertex
        }
        if (this.attrUV != -1 && d.bindUV()) {
            gl.enableVertexAttribArray(this.attrUV);
            gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrUV, 0); // Advance 1 index in pos VBO for each vertex
        }
        if (this.attrCol != -1 && d.bindCol()) {
            gl.enableVertexAttribArray(this.attrCol);
            gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrCol, 1); // Advance 1 index in col VBO for each drawn instance
        }
        if (this.attrTransform1 != -1 && d.bindTransform1()) {
            gl.enableVertexAttribArray(this.attrTransform1);
            gl.vertexAttribPointer(this.attrTransform1, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrTransform1, 1); // Advance 1 index in translate VBO for each drawn instance
        }
        if (this.attrTransform2 != -1 && d.bindTransform2()) {
            gl.enableVertexAttribArray(this.attrTransform2);
            gl.vertexAttribPointer(this.attrTransform2, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrTransform2, 1); // Advance 1 index in translate VBO for each drawn instance
        }
        if (this.attrTransform3 != -1 && d.bindTransform3()) {
            gl.enableVertexAttribArray(this.attrTransform3);
            gl.vertexAttribPointer(this.attrTransform3, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrTransform3, 1); // Advance 1 index in translate VBO for each drawn instance
        }
        if (this.attrTransform4 != -1 && d.bindTransform4()) {
            gl.enableVertexAttribArray(this.attrTransform4);
            gl.vertexAttribPointer(this.attrTransform4, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrTransform4, 1); // Advance 1 index in translate VBO for each drawn instance
        }
        if (this.attrFloorType != -1 && d.bindFloorType()) {
            gl.enableVertexAttribArray(this.attrFloorType);
            gl.vertexAttribPointer(this.attrFloorType, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrFloorType, 1);
        }
        d.bindIdx();
        // drawElementsInstanced uses the vertexAttribDivisor for each "in" variable to
        // determine how to link it to each drawn instance of the bound VBO.
        // For example, the index used to look in the VBO associated with
        // vs_Pos (attrPos) is advanced by 1 for each thread of the GPU running the
        // vertex shader since its divisor is 0.
        // On the other hand, the index used to look in the VBO associated with
        // vs_Translate (attrTranslate) is advanced by 1 only when the next instance
        // of our drawn object (in the base code example, the square) is processed
        // by the GPU, thus being the same value for the first set of four vertices,
        // then advancing to a new value for the next four, then the next four, and
        // so on.
        if (d.instanced) {
            gl.drawElementsInstanced(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0, d.numInstances);
        }
        else {
            gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);
        }
        if (this.attrPos != -1)
            gl.disableVertexAttribArray(this.attrPos);
        if (this.attrNor != -1)
            gl.disableVertexAttribArray(this.attrNor);
        if (this.attrCol != -1)
            gl.disableVertexAttribArray(this.attrCol);
        if (this.attrTransform1 != -1)
            gl.disableVertexAttribArray(this.attrTransform1);
        if (this.attrTransform2 != -1)
            gl.disableVertexAttribArray(this.attrTransform2);
        if (this.attrTransform3 != -1)
            gl.disableVertexAttribArray(this.attrTransform3);
        if (this.attrTransform3 != -1)
            gl.disableVertexAttribArray(this.attrTransform4);
        if (this.attrUV != -1)
            gl.disableVertexAttribArray(this.attrUV);
        if (this.attrFloorType != -1)
            gl.disableVertexAttribArray(this.attrFloorType);
    }
}
;
export default ShaderProgram;
//# sourceMappingURL=ShaderProgram.js.map