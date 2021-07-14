import { vec2 } from 'gl-matrix';
export default class Node {
    constructor(pos, i) {
        let copy = vec2.create();
        vec2.copy(copy, pos);
        this.x = copy[0];
        this.y = copy[1];
        this.id = i;
    }
    getPosition() {
        return vec2.fromValues(this.x, this.y);
    }
    changePosition(pos) {
        this.x = pos[0];
        this.y = pos[1];
    }
    equals(n, epsilon) {
        return Math.abs(this.x - n.x) < epsilon
            && Math.abs(this.y - n.y) < epsilon;
    }
    distanceFrom(pos) {
        return vec2.distance(vec2.fromValues(this.x, this.y), pos);
    }
}
//# sourceMappingURL=Node.js.map