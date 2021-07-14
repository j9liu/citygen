import { vec2, mat3 } from 'gl-matrix';
class Turtle {
    constructor(pos, orient, dep) {
        this.position = vec2.create();
        this.orientation = vec2.create();
        this.depth = 0;
        this.stepLength = 0;
        this.stepDir = vec2.create();
        this.rotationTotal = 0;
        vec2.copy(this.position, pos);
        vec2.copy(this.orientation, orient);
        this.depth = dep;
    }
    moveForward(amt) {
        let temp = vec2.create();
        vec2.scale(temp, this.orientation, amt);
        vec2.add(this.position, this.position, temp);
    }
    rotate(deg) {
        let transform = mat3.create();
        mat3.rotate(transform, transform, deg * Math.PI / 180);
        vec2.transformMat3(this.orientation, this.orientation, transform);
    }
    setPosition(pos) {
        vec2.copy(this.position, pos);
    }
    setOrientation(orient) {
        vec2.copy(this.orientation, orient);
    }
}
export default Turtle;
//# sourceMappingURL=Turtle.js.map