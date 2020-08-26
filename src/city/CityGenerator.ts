import {vec2, vec3, vec4, mat3, mat4} from 'gl-matrix';
import Edge from './../road/Edge';

export default class CityGenerator {
  public citySize: vec2; // the specified dimensions of city space.
  public gridSize: vec2; // the number of cells along each side. Assumes that this is
                         // proportional to the city width and height.
  private cellWidth : number; // cell width ( calculated with respect to city dimensions )
  private waterLevel : number = 0;

  // The city is divided into cells given the dimensions of the grid,
  // where each cell tracks if it can be built on or not. A cell is considered
  // invalid if there is a road, a building, or a body of water occupying
  // its space. The cell that an item is located in is given by y * cellNum + x.
  private validCells: Array<boolean>;
  private roads: Array<Edge>;
  private highwayWidth: number = 3;
  private streetWidth: number = 1.4;

  private numBuildingsGoal: number = 50;
  private buildingPositions: Array<vec2>;
  private cubeTransformMats: Array<mat4>;
  private hexTransformMats: Array<mat4>;

  // The first four arrays represent the columns of the 
  // transform matrix; the last one corresponds to the colors.
  private instancedAttributes : Array<Array<number>>;

  // Pixel data that is rendered in the frame buffer
  // and passed into the generator.

  private data: Uint8Array = undefined;
  private dataSize : vec2 = undefined;

  constructor(cs: vec2, gs: vec2) {
    this.citySize = cs;
    this.gridSize = gs;
  }

  public setData(d: Uint8Array, ds: vec2) {
    this.data = d;
    this.dataSize = ds;
    this.reset();
  }

  public setWaterLevel(level: number) {
    this.waterLevel = level * 255 / 5;
  }

  public setRoads(rArray: Array<Edge>) {
    this.roads = rArray;
  }

  public setHighwayWidth(width: number) {
    this.highwayWidth = width;
  }

  public setStreetWidth(width: number) {
    this.streetWidth = width;
  }

  // Gets the green component of the image
  public getElevation(point : vec2) : number {
    let texPoint : vec2 = vec2.create();
    texPoint[0] = point[0] / this.citySize[0];
    texPoint[1] = point[1] / this.citySize[1];
    texPoint[0] = Math.floor(texPoint[0] * this.dataSize[0]);
    texPoint[1] = Math.floor(texPoint[1] * this.dataSize[1]);
    return this.data[4.0 * (texPoint[0] + this.dataSize[0] * texPoint[1]) + 1.0];
  }

  public getPopulation(point : vec2) : number {
    let texPoint : vec2 = vec2.create();
    texPoint[0] = point[0] / this.citySize[0];
    texPoint[1] = point[1] / this.citySize[1];
    texPoint[0] = Math.floor(texPoint[0] * this.dataSize[0]);
    texPoint[1] = Math.floor(texPoint[1] * this.dataSize[1]);
    return this.data[4.0 * (texPoint[0] + this.dataSize[0] * texPoint[1])];
  }

  public reset() {
    this.cellWidth = this.citySize[0] / this.gridSize[0];
    this.validCells = [];
    for(let i : number = 0; i < this.gridSize[0] * this.gridSize[1]; i++) {
      this.validCells.push(true);
    }

    this.roads = [];
    this.buildingPositions = [];
    this.cubeTransformMats = [];
    this.hexTransformMats = [];

    this.instancedAttributes = [];
    for(let i = 0; i < 5; i++) {
      this.instancedAttributes.push([]);
    }
  }

  //////////////////////////////////////
  // CELL ACCESS HELPER FUNCTIONS
  //////////////////////////////////////

  public getPosRowNumber(p: vec2): number {
    return Math.floor(p[1] / this.cellWidth);
  }

  public getPosColNumber(p: vec2) : number {
    return Math.floor(p[0] / this.cellWidth)
  }

  public getPosCellNumber(p: vec2) : number {
    let cellx : number = Math.floor(p[0] / this.cellWidth), 
        celly : number = Math.floor(p[1] / this.cellWidth);

    return this.getCellNumberFromRowCol(cellx, celly);
  }

  public getCellNumberFromRowCol(x: number, y: number) : number {
    let celln : number = Math.floor(this.gridSize[0] * y + x);
    if(celln < 0 || celln >= this.gridSize[0] * this.gridSize[1]) {
      return undefined;
    }

    return celln;
  }

  public getRowColFromCellNumber(cellNum: number) : vec2 {
    if(cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
      return undefined;
    }

    return vec2.fromValues(cellNum % this.gridSize[0],
                           Math.floor(cellNum / this.gridSize[0]));
  }

  public getMidpointOfCell(cellNum: number) : vec2 {
    if(cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
      return undefined;
    }

    let rowCol: vec2 = this.getRowColFromCellNumber(cellNum);
    let xVal: number = (rowCol[0] + 0.5) * this.cellWidth,
        yVal: number = (rowCol[1] + 0.5) * this.cellWidth;

    return vec2.fromValues(xVal, yVal);
  }

  // Returns the bottom left and top right corners of cell,
  // in that order. (The other two can be inferred.)
  public getCornersOfCell(cellNum: number) : Array<vec2> {
    if(cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
      return undefined;
    }

    let rowCol: vec2 = this.getRowColFromCellNumber(cellNum);
    let xValBL: number = rowCol[0] * this.cellWidth,
        yValBL: number = rowCol[1] * this.cellWidth,
        xValTR: number = (rowCol[0] + 1) * this.cellWidth,
        yValTR: number = (rowCol[1] + 1) * this.cellWidth;

    return [vec2.fromValues(xValBL, yValBL),
            vec2.fromValues(xValTR, yValTR)];
  }

  // Given an edge, find all of the cells that it intersects
  public getEdgeCells(e: Edge) : Array<number> {
    let ret : Array<number> = [];

    let leftBound : number = this.getPosColNumber(e.endpoint1);
    let rightBound : number = this.getPosColNumber(e.endpoint2);
    let bottomBound : number = this.getPosRowNumber(e.endpoint1);
    let topBound : number = this.getPosRowNumber(e.endpoint2);

    if(leftBound > rightBound) {
      rightBound = leftBound;
      leftBound = this.getPosColNumber(e.endpoint2);
    }

    if(bottomBound > topBound) {
      topBound = bottomBound;
      bottomBound = this.getPosRowNumber(e.endpoint2);
    }

    rightBound = Math.min(rightBound, this.gridSize[0]);
    topBound = Math.min(topBound, this.gridSize[1]);

    for(let j = bottomBound; j <= topBound; j++) {
      for(let i = leftBound; i <= rightBound; i++) {

        let cellNumber = this.gridSize[0] * j + i;
        if(cellNumber < 0 || cellNumber >= this.gridSize[0] * this.gridSize[1]) {
          continue; // cell out of bounds
        }

        if(e.intersectQuad(vec2.fromValues(i * this.cellWidth, j * this.cellWidth),
                           vec2.fromValues((i + 1) * this.cellWidth, (j + 1) * this.cellWidth))) {
          ret.push(cellNumber);
        }
      }
    }
    return ret;
  }

  //////////////////////////////////////
  // "RASTERIZATION" FUNCTIONS
  //////////////////////////////////////

  // Assumes that data and water level have been specified
  private rasterizeWater() {
    for(let i = 0; i < this.validCells.length; i++) {
      let midpoint: vec2 = this.getMidpointOfCell(i);
      let height: number = this.getElevation(midpoint);
      if(height <= this.waterLevel) {
        this.validCells[i] = false;
      }
    }
  }

  private rasterizeRoads() {
    this.roads = [];
    this.roads.push(new Edge(vec2.fromValues(0, 0), vec2.fromValues(512, 512), 0, true));
    //console.log(this.roads);
    for(let road of this.roads) {
      let cellsIntersected : Array<number> = this.getEdgeCells(road);
      for(let i: number = 0; i < cellsIntersected.length; i++) {
        this.validCells[i] = false;
      }
    }
  }

  private rasterizerTester() {
    this.buildingPositions = [];
    for(let i = 0; i < this.validCells.length; i++) {
      this.buildingPositions.push(this.getMidpointOfCell(i));
    }

    for(let i = 0; i < this.buildingPositions.length; i++) {
      let pos : vec2 = this.buildingPositions[i];
      let pos3D : vec3 = vec3.fromValues(pos[0], 2, pos[1]);
      let scale : vec3 = vec3.fromValues(this.cellWidth, 0.3, this.cellWidth);
      let color : vec4 = vec4.fromValues(1, 0, 0, 1);
      if(this.validCells[i]) {
        color = vec4.fromValues(0, 1, 0, 1);
      }

      let transform :    mat4 = mat4.create(),
          scaleMat :     mat4 = mat4.create(),
          rotateMat :    mat4 = mat4.create(),
          translateMat : mat4 = mat4.create();

      mat4.fromScaling(scaleMat, scale);
      mat4.fromTranslation(translateMat, pos3D);
      mat4.multiply(transform, translateMat, scaleMat);

      for(let j = 0; j < 4; j++) {
        this.instancedAttributes[0].push(transform[j]);
        this.instancedAttributes[1].push(transform[4 + j]);
        this.instancedAttributes[2].push(transform[8 + j]);
        this.instancedAttributes[3].push(transform[12 + j]);
      }

      for(let j = 0; j < 4; j++) {
        this.instancedAttributes[4].push(color[j]);
      }
    }
  }

  ///////////////////////////////////////

  public generateBuildingPoints() {
    this.buildingPositions = [];
    let numBuildings : number = 0;
    let badLoopCap : number = 0;
    while(numBuildings < this.numBuildingsGoal) {
      let position : vec2 = vec2.fromValues(Math.random() * this.citySize[0],
                                            Math.random() * this.citySize[1]);
      let cell : number = this.getPosCellNumber(position);
      if(this.validCells[cell]) {
        this.buildingPositions.push(position);
        numBuildings++;
        badLoopCap = 0;
        this.validCells[cell] = false;
      } else {
        badLoopCap++;
      }

      if(badLoopCap >= this.numBuildingsGoal / 4) {
        break;
      }
    }
  }

  private generateBuildings() {
    for(let p of this.buildingPositions) {

      let height : number = 5;
      let floorPlanShapes : Array<number> = [];
      let floorPlanOffsets : Array<number> = [];
      while(height > 0) {
        let shape : number;
        if(Math.random() > 0.5) {
          shape = 6;
        } else {
          shape = 4;
        }

        if(floorPlanShapes.length == 0) {

        }

        let floorHeight : number = height * Math.random();
        height = height - floorHeight;
      }
    }
  }

  private renderBuilding(pos: vec2) {
    let pos3D : vec3 = vec3.fromValues(pos[0], 0, pos[1]);
    let scale : vec3 = vec3.fromValues(3, 1, 3);

    let color : vec4 = vec4.fromValues(1, 0, 0, 1);

    let transform :    mat4 = mat4.create(),
        scaleMat :     mat4 = mat4.create(),
        rotateMat :    mat4 = mat4.create(),
        translateMat : mat4 = mat4.create();

    mat4.fromScaling(scaleMat, scale);
    mat4.fromTranslation(translateMat, pos3D);
    mat4.multiply(transform, translateMat, scaleMat);

    for(let j = 0; j < 4; j++) {
      this.instancedAttributes[0].push(transform[j]);
      this.instancedAttributes[1].push(transform[4 + j]);
      this.instancedAttributes[2].push(transform[8 + j]);
      this.instancedAttributes[3].push(transform[12 + j]);
    }

    for(let j = 0; j < 4; j++) {
      this.instancedAttributes[4].push(color[j]);
    }
  }

  public getBuildingPositions(): Array<vec2> {
    return this.buildingPositions;
  }

  public getInstancedAttributes(): Array<Array<number>> {
    return this.instancedAttributes;
  }

  public getBuildingCount(): number {
    return this.buildingPositions.length;
  }


  public generateCity() {
    this.rasterizeWater();
    this.rasterizeRoads();
    this.rasterizerTester();
    //this.generateBuildingPoints();
    //this.generateBuildings();
  }
}


/* 
  // Returns an array of Edges, in this order:
  // [ top edge, left edge, bottom edge, right edge]
  // where the orientations are based on the initial 
  // positions of the corners
  private convertRoadToRectangle(e: Edge): Array<Edge> {

    let rectLength: number = e.getLength();
    let rectWidth: number = this.streetWidth;
    if(e.highway) {
      rectWidth = this.highwayWidth;
    }

    // Define the four corners of the rectangle.
    let topLeft:     vec2 = vec2.fromValues(-rectWidth / 2,
                                               rectLength / 2),
        topRight:    vec2 = vec2.fromValues( rectWidth / 2,
                                               rectLength / 2),
        bottomLeft:  vec2 = vec2.fromValues(-rectWidth / 2,
                                              -rectLength / 2),
        bottomRight: vec2 = vec2.fromValues( rectWidth / 2,
                                              -rectLength / 2);

     let angle : number = Math.atan2(e.endpoint2[1] - e.endpoint1[1],
                                     e.endpoint2[0] - e.endpoint1[0]);

     let rotateMat : mat3 = mat3.create();
     mat3.fromRotation(rotateMat, angle);

     vec2.transformMat3(topLeft, topLeft, rotateMat);
     vec2.transformMat3(topRight, topRight, rotateMat);
     vec2.transformMat3(bottomLeft, bottomLeft, rotateMat);
     vec2.transformMat3(bottomRight, bottomRight, rotateMat);

     let translateMat : mat3 = mat3.create();
     mat3.fromTranslation(translateMat, e.getMidpoint());

     vec2.transformMat3(topLeft, topLeft, translateMat);
     vec2.transformMat3(topRight, topRight, translateMat);
     vec2.transformMat3(bottomLeft, bottomLeft, translateMat);
     vec2.transformMat3(bottomRight, bottomRight, translateMat);

     let topEdge:    Edge = new Edge(topLeft, topRight, 0, false),
         leftEdge:   Edge = new Edge(topLeft, bottomLeft, 0, false),
         bottomEdge: Edge = new Edge(bottomLeft, bottomRight, 0, false),
         rightEdge:  Edge = new Edge(topRight, bottomRight, 0, false);

     return [topEdge, leftEdge, bottomEdge, rightEdge];
    
  }

  private getBoundsOfRectangle(edges: Array<Edge>): Array<vec2> {
    if()
  }
}*/