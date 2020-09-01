import {vec2, vec3, vec4, mat3, mat4} from 'gl-matrix';
import Edge from './../road/Edge';
import Drawable from '../rendering/gl/Drawable';
import Cube from '../geometry/Cube';
import HexagonalPrism from '../geometry/HexagonalPrism';

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

  // The numbers in this array correspond to different states of the cells.
  // 0 = empty
  // 1 = water
  // 2 = road
  // 3 = building

  private validCells: Array<number>;
  private roads: Array<Edge>;
  private highwayWidth: number = 3;
  private streetWidth: number = 1.2;

  private numBuildingsGoal: number = 250;
  private buildingPositions: Array<vec2>;
  private cubeTransformMats: Array<mat4>;
  private hexTransformMats: Array<mat4>;

  // reference these for their positions;
  // do NOT send the instanced vbos to these.
  private referenceCube : Cube = new Cube(vec3.fromValues(0, 0, 0));
  private referenceHexPrism : HexagonalPrism = new HexagonalPrism(vec3.fromValues(0, 0, 0));

  // The first four arrays represent the columns of the 
  // transform matrix; the last one corresponds to the colors.
  private cubeInstancedAttributes : Array<Array<number>>;
  private hexInstancedAttributes : Array<Array<number>>;

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
      this.validCells.push(0);
    }

    this.roads = [];
    this.buildingPositions = [];
    this.cubeTransformMats = [];
    this.hexTransformMats = [];

    this.cubeInstancedAttributes = [];
    this.hexInstancedAttributes = [];

    for(let i = 0; i < 5; i++) {
      this.cubeInstancedAttributes.push([]);
      this.hexInstancedAttributes.push([]);
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

    return this.getCellNumberFromXY(cellx, celly);
  }

  public getCellNumberFromXY(x: number, y: number) : number {
    if(x < 0 || x >= this.gridSize[0] || y < 0 || y >= this.gridSize[1]) {
      return undefined;
    }

    return Math.floor(this.gridSize[0] * y + x);
  }

  // Returns (x, y), aka (col, row).
  public getXYFromCellNumber(cellNum: number) : vec2 {
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

    let xy: vec2 = this.getXYFromCellNumber(cellNum);
    let xVal: number = (xy[0] + 0.5) * this.cellWidth,
        yVal: number = (xy[1] + 0.5) * this.cellWidth;

    return vec2.fromValues(xVal, yVal);
  }

  // Returns the bottom left and top right corners of cell,
  // in that order. (The other two can be inferred.)
  public getCornersOfCell(cellNum: number) : Array<vec2> {
    if(cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
      return undefined;
    }

    let xy: vec2 = this.getXYFromCellNumber(cellNum);
    let xValBL: number = xy[0] * this.cellWidth,
        yValBL: number = xy[1] * this.cellWidth,
        xValTR: number = (xy[0] + 1) * this.cellWidth,
        yValTR: number = (xy[1] + 1) * this.cellWidth;

    return [vec2.fromValues(xValBL, yValBL),
            vec2.fromValues(xValTR, yValTR)];
  }


  // gets all eight neighbors of the current cell
  public getNeighborsOfCell(cellNum: number) : Array<number> {
    if(cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
      return undefined;
    }

    let neighbors : Array<number> = [];
    let xy : vec2 = this.getXYFromCellNumber(cellNum);
    for(let i = xy[1] - 1; i <= xy[1] + 1; i++) {
      for (let j = xy[0] - 1; j <= xy[0] + 1; j++) {
        let nCellNum : number = this.getCellNumberFromXY(j, i);

        if(nCellNum == undefined || nCellNum == cellNum) {
          continue;
        }

        neighbors.push(nCellNum);
      }
    } 

    return neighbors;
  }

  //////////////////////////////////////
  // RASTERIZATION FUNCTIONS
  //////////////////////////////////////

  // Assumes that data and water level have been specified
  private rasterizeWater() {
    for(let i = 0; i < this.validCells.length; i++) {
      let midpoint: vec2 = this.getMidpointOfCell(i);
      let height: number = this.getElevation(midpoint);
      if(height <= this.waterLevel) {
        this.validCells[i] = 1;
      }
    }
  }

  private rasterizeRoads() {
    for(let road of this.roads) {
      let roadWidth : number = this.streetWidth;
      if(road.highway) {
        roadWidth = this.highwayWidth;
      }

      let checkNeighbors : boolean = roadWidth > 1.5 * this.cellWidth;

      let endpoint1XY : vec2 = this.getXYFromCellNumber(this.getPosCellNumber(road.endpoint1)),
          endpoint2XY : vec2 = this.getXYFromCellNumber(this.getPosCellNumber(road.endpoint2));

      let yMin : number = Math.round(Math.min(endpoint1XY[1], endpoint2XY[1])),
          yMax : number = Math.round(Math.max(endpoint1XY[1], endpoint2XY[1])),
          xMin : number = Math.round(Math.min(endpoint1XY[0], endpoint2XY[0])),
          xMax : number = Math.round(Math.max(endpoint1XY[0], endpoint2XY[0]));

      for(let i = yMin; i <= yMax; i++) {
        for(let j = xMin; j <= xMax; j++) {
          let cellNum : number = this.getCellNumberFromXY(j, i);
          let corners : Array<vec2> = this.getCornersOfCell(cellNum);
          if(road.intersectQuad(corners[0], corners[1])) {
            this.validCells[cellNum] = 2;

            if(checkNeighbors) {
              let cellMidpt : vec2 = this.getMidpointOfCell(cellNum);
              let cellNeighbors : Array<number> = this.getNeighborsOfCell(cellNum);
              for(let i = 0; i < cellNeighbors.length; i++) {
                if(vec2.distance(cellMidpt, this.getMidpointOfCell(cellNeighbors[i])) < roadWidth / 2) {
                  this.validCells[cellNeighbors[i]] = 2;
                }
              }
            }
          }
        }
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
      if(this.validCells[i] > 0) {
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
        this.cubeInstancedAttributes[0].push(transform[j]);
        this.cubeInstancedAttributes[1].push(transform[4 + j]);
        this.cubeInstancedAttributes[2].push(transform[8 + j]);
        this.cubeInstancedAttributes[3].push(transform[12 + j]);
      }

      for(let j = 0; j < 4; j++) {
        this.cubeInstancedAttributes[4].push(color[j]);
      }
    }
  }

  ///////////////////////////////////////

  public generateBuildingPoints() {
    this.buildingPositions = [];
    let numBuildings : number = 0;
    let badLoopCap : number = 0;
    while(numBuildings < 1) {
      let position : vec2 = vec2.fromValues(Math.random() * this.citySize[0],
                                            Math.random() * this.citySize[1]);
      let cell : number = this.getPosCellNumber(position);
      if(this.validCells[cell] == 0) {
        // Test for nearby roads in a 5 x 5 space. If there
        // are enough roads filling the space around the point,
        // then place the point.
        let threshold : number = 0.2;
        let xy : vec2 = this.getXYFromCellNumber(cell);
        let totalRoadCells : number = 0;
        for(let i = xy[1] - 2; i <= xy[1] + 2; i++) {
          for(let j = xy[0] - 2; j <= xy[0] + 2; j++) {
            if(this.validCells[this.getCellNumberFromXY(j, i)] == 2) {
              totalRoadCells++;
            }
          }
        }

        if(totalRoadCells / 25 > threshold) {
         this.buildingPositions.push(position);
          numBuildings++;
          badLoopCap = 0;
          this.validCells[cell] = 3;
        } else {
          badLoopCap++;
        }
      } else {
        badLoopCap++;
      }

      if(badLoopCap >= this.numBuildingsGoal / 4) {
        break;
      }
    }
  }

  private isCube(obj: Drawable): obj is Cube {
    return obj.count == 36;
  }

  private isHexagonalPrism(obj: Drawable): obj is HexagonalPrism {
    return obj.count == 60;
  }

  public getVec4PositionAtIndexFromShape(d: Drawable, index: number) : vec4 {
    let shapePositions : Float32Array;
    let numPositions : number = 0;
    if(this.isCube(d)) {
      let cube : Cube = d as Cube;
      shapePositions = d.positions;
      numPositions = d.positions.length / 4;
    } else if(this.isHexagonalPrism(d)) {
      let hex : HexagonalPrism = d as HexagonalPrism;
      shapePositions = d.positions;
      numPositions = d.positions.length / 4;
    }

    if(index < 0 || index >= numPositions) {
      return undefined;
    }

    let trueStartingIndex = index * 4;
    return vec4.fromValues(shapePositions[trueStartingIndex],
                           shapePositions[trueStartingIndex + 1],
                           shapePositions[trueStartingIndex + 2],
                           shapePositions[trueStartingIndex + 3]);
  }

  private getRandomPointOfFloorPlan(fpShapes: Array<number>,
                                    fpTransformations: Array<mat4>) : vec3 {
    let fpIndex : number = Math.floor(Math.random() * fpShapes.length);
    let chosenShape : number = fpShapes[fpIndex];

    let chosenIndex : number = -1;
    // These are directly drawn from the positions array in either class.
    let bottomCubeIndices : Array<number> = [16, 17, 18, 19];
    let bottomHexIndices : Array<number>  = [6, 7, 8, 9, 10, 11];

    let originalPos : vec4 = vec4.create();

    if(chosenShape == 4) {
      chosenIndex = bottomCubeIndices[Math.floor(Math.random() * 4)];
      originalPos = this.getVec4PositionAtIndexFromShape(this.referenceCube, chosenIndex);
    } else if(chosenShape == 6) {
      chosenIndex = bottomHexIndices[Math.floor(Math.random() * 6)];
      originalPos = this.getVec4PositionAtIndexFromShape(this.referenceHexPrism, chosenIndex);
    }

    let localTransform : mat4 = fpTransformations[fpIndex];
    let transformedPos : vec4 = vec4.create();
    vec4.transformMat4(transformedPos, originalPos, localTransform);

    return vec3.fromValues(transformedPos[0], transformedPos[1], transformedPos[2]);
  }

  private generateBuildings() {
    this.referenceCube.create();
    this.referenceHexPrism.create();

    for(let p of this.buildingPositions) {
      let pop : number = this.getPopulation(p);
      let floorPlanShapes : Array<number> = [];
      let floorPlanLocalTransformations : Array<mat4> = [];

      let maxFloors : number = 3;
      //let maxBuildingHeight: number = pop / 255;
      let maxBuildingHeight = 10;
      let height: number = maxBuildingHeight;
      let minFloorHeight: number = 1;
      let maxFloorHeight: number = maxBuildingHeight / maxFloors;
/*
      if(pop > 0.6 * 255) {

      } else if (pop > 0.25 * 255) {

      } else {

      }*/

      while(height > 0) {
        /*let shape : string;
        if(Math.random() > 0.5) {
          shape = "hexagonal prism";
        } else {
          shape = "cube";
        }*/

        let floorHeight  : number = (maxFloorHeight - minFloorHeight) * Math.random() + minFloorHeight;

        if(height < 2 * minFloorHeight || height - floorHeight < minFloorHeight) {
          floorHeight = height;
        }

        let transformMat : mat4 = mat4.create(),
            translateMat : mat4 = mat4.create(),
            rotateMat    : mat4 = mat4.create(),
            scaleMat     : mat4 = mat4.create();

        if(floorPlanShapes.length > 0) {
          let newShapeMidpoint : vec3 = this.getRandomPointOfFloorPlan(floorPlanShapes, floorPlanLocalTransformations);
          newShapeMidpoint[1] += floorHeight / 2;
          mat4.fromTranslation(translateMat, newShapeMidpoint)
        } else {
          mat4.fromTranslation(translateMat, vec3.fromValues(0, floorHeight / 2, 0));
        }

        let angle : number = Math.random() * 45 * Math.PI / 180;
        mat4.fromRotation(rotateMat, angle, vec3.fromValues(0, 1, 0));
        mat4.fromScaling(scaleMat, vec3.fromValues(15, floorHeight, 15));

        mat4.multiply(transformMat, rotateMat, scaleMat);
        mat4.multiply(transformMat, translateMat, transformMat);

        floorPlanShapes.push(4);
        floorPlanLocalTransformations.push(transformMat);
        this.renderFloorPlan(p, floorPlanShapes, floorPlanLocalTransformations);
        height = height - floorHeight;
      }
    }
    
  }

  // strictly for the rasterizer tester
  private renderCube(pos: vec2) {
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
      this.cubeInstancedAttributes[0].push(transform[j]);
      this.cubeInstancedAttributes[1].push(transform[4 + j]);
      this.cubeInstancedAttributes[2].push(transform[8 + j]);
      this.cubeInstancedAttributes[3].push(transform[12 + j]);
    }

    for(let j = 0; j < 4; j++) {
      this.cubeInstancedAttributes[4].push(color[j]);
    }
  }

  private renderFloorPlan(pos: vec2,
                          fpShapes: Array<number>,
                          fpLocalTransformations: Array<mat4>) {
    let translateToBuildingPos : mat4 = mat4.create();
    mat4.fromTranslation(translateToBuildingPos, vec3.fromValues(pos[0], 0, pos[1]));
    for(let i = 0; i < fpShapes.length; i++) { 
      let worldTransform : mat4 = mat4.create();
      mat4.multiply(worldTransform, translateToBuildingPos, fpLocalTransformations[i]);
      switch(fpShapes[i]) {
        case 4: {
          for(let j = 0; j < 4; j++) {
            this.cubeInstancedAttributes[0].push(worldTransform[j]);
            this.cubeInstancedAttributes[1].push(worldTransform[4 + j]);
            this.cubeInstancedAttributes[2].push(worldTransform[8 + j]);
            this.cubeInstancedAttributes[3].push(worldTransform[12 + j]);
          }

          let cubeColor : vec4 = vec4.fromValues(1, 0, 0, 1);

          for(let j = 0; j < 4; j++) {
            this.cubeInstancedAttributes[4].push(cubeColor[j]);
          }

          break;
        }

        case 6: {
          for(let j = 0; j < 4; j++) {
            this.hexInstancedAttributes[0].push(worldTransform[j]);
            this.hexInstancedAttributes[1].push(worldTransform[4 + j]);
            this.hexInstancedAttributes[2].push(worldTransform[8 + j]);
            this.hexInstancedAttributes[3].push(worldTransform[12 + j]);
          }

          let hexColor : vec4 = vec4.fromValues(0, 1, 0, 1);

          for(let j = 0; j < 4; j++) {
            this.hexInstancedAttributes[4].push(hexColor[j]);
          }

          break;
        }

        default: {
          break;
        }
      }
    }
  }

  public getBuildingPositions(): Array<vec2> {
    return this.buildingPositions;
  }

  public getCubeInstancedAttributes(): Array<Array<number>> {
    return this.cubeInstancedAttributes;
  }

  public getHexInstancedAttributes(): Array<Array<number>> {
    return this.cubeInstancedAttributes;
  }

  public getCubeTransformMats() : Array<mat4> {
    return this.cubeTransformMats;
  }

  public getHexTransformMats() : Array<mat4> {
    return this.hexTransformMats;
  }

  public getBuildingCount(): number {
    return this.buildingPositions.length;
  }

  public generateCity() {
    this.rasterizeWater();
    this.rasterizeRoads();
    this.generateBuildingPoints();
    /*for(let i = 0; i < this.buildingPositions.length; i++) {
      this.renderCube(this.buildingPositions[i]);
    }*/
    this.generateBuildings();
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

}*/