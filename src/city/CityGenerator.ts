import {vec2, vec3, vec4} from 'gl-matrix';
import Edge from './road/Edge';

class CityGenerator {
  width: number;
  height: number;
  // Store whether or not a grid space can be built on. Array stored [column][row]
  validCells: Array<Array<boolean>>;
  buildingPositions: Array<vec2>;

  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
    resetValidityData();
    this.buildingPositions = [];
  }

  resetValidityData() {
    this.validCells = [];
    for(let i : number = 0; i < width; i++) {
      this.validCells.push([]);
      for(let j : number = 0; j < height; j++) {
        this.validCells[i].push(true);
      }
    }
  }

  rasterizeWater(elevationFunc: any, waterThreshold: number) {
    
  }

  rasterizeRoads(roads: Array<Edge>) {

  }

  // Returns the coordinates of the cell that the given point falls in.
  // If the cell falls out of bounds, return undefined.
  getCellOfPoint(point: vec2) : vec2 {
    if(point[0] < 0 || point[0] >= width || point[1] < 0 || point[1] >= height) {
      return undefined;
    }
    return vec2.fromValues(Math.floor(point[0]), Math.floor(point[1]));
  }

  generateBuildingPoints() {
    this.buildingPositions = [];
    for(let i : number = 0; i < 10; i++) {
      let position : vec2 = vec2.fromValues(Math.random * width, Math.random * height);
      let cell : vec2 = getCellOfPoint(position);
      if(cell != undefined && validCells[cell[0]][cell[1]]) {
        buildingPositions.push(position);
      }
    }
  }

  generateBuildings(populationFunc: any) {
    for(let p of this.buildingPositions) {
      let height : number = 9;
      while(height > 0) {
        let sides : number = Math.floor(3 + Math.random * 5);
        let floorHeight : number = height * Math.random();
        height = height - floorHeight;
      }
    }
  }

  generatePolygonVBO(sides: number, scale: vec2, height: number) {

  }
}

export default CityGenerator;