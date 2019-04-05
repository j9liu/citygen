import {vec2, vec3, mat3} from 'gl-matrix';
import Edge from './road/Edge';
import Node from './road/Node';

class RoadGenerator {
  width: number;
  height: number;
  
  ncells : Array<Array<Node>>;
  ecells : Array<Array<Edge>>;
  mainRoads : Array<Edge>;
  smallRoads : Array<Edge>;
  turtleStack : Array<Turtle>;

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    reset();
  }

  reset() {
    this.validityData = [];
    for(let i : number = 0; i < width; i++) {
      this.validityData.push([]);
      for(let j : number = 0; j < height; j++) {
        this.validityData[i].push(false);
      }
    }
  }

  sortEdge(e: Edge) {
    for(let i = 0; i < 16; i++) {
      let wScalar = i % 4;
      let hScalar = Math.floor(i / 4);
      if(e.intersectQuad(vec2.fromValues(wScalar * cwq, hScalar * chq),
                         vec2.fromValues((wScalar + 1) * cwq, (hScalar + 1) * chq))) {
        ecells[i].push(e);
      }
    }
  }

  getCells(e: Edge) : Array<number> {
    let ret : Array<number> = [];
    for(let i = 0; i < 16; i++) {
      let wScalar = i % 4;
      let hScalar = Math.floor(i / 4);
      if(e.intersectQuad(vec2.fromValues(wScalar * cwq, hScalar * chq),
                         vec2.fromValues((wScalar + 1) * cwq, (hScalar + 1) * chq))) {
        ret.push(i);
      }
    }
    return ret;
  }

  sortNode(n: Node) {
    let cellx : number = Math.floor(n.x / cwq);  
    let celly : number = Math.floor(n.y / chq);
    let array : Array<Node> = ncells[4 * celly + cellx];
    if(array == undefined) {
      return;
    }
    array.push(n);
  }
    
    function getNode(pos: vec2) : Node {
    let cellx : number = Math.floor(pos[0] / cwq);  
    let celly : number = Math.floor(pos[1] / chq);
    let array : Array<Node> = ncells[4 * celly + cellx];
    if(array == undefined) {
      return undefined;
    }
    for(let i = 0; i < array.length; i++) {
      if(vec2.equals(array[i].position, pos)) {
        return array[i];
      }
    }
    return undefined;
  }

  function getNodeCell(pos: vec2) : number {
    let cellx : number = Math.floor(pos[0] / cwq);  
    let celly : number = Math.floor(pos[1] / chq);
    if(ncells[4 * celly + cellx] == undefined) {
      return undefined;
    }
    return 4 * celly + cellx;
  }

}

export default RoadGenerator;