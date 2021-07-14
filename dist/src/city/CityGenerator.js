import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import Cube from '../geometry/Cube';
import HexagonalPrism from '../geometry/HexagonalPrism';
import { Shape, CaseFlag } from './FloorPlan';
import FloorPlan from './FloorPlan';
var BuildingType;
(function (BuildingType) {
    BuildingType[BuildingType["SKYSCRAPER_1"] = 0] = "SKYSCRAPER_1";
    BuildingType[BuildingType["SKYSCRAPER_2"] = 1] = "SKYSCRAPER_2";
    BuildingType[BuildingType["SKYSCRAPER_3"] = 2] = "SKYSCRAPER_3";
    BuildingType[BuildingType["HOUSE_1"] = 3] = "HOUSE_1";
    BuildingType[BuildingType["HOUSE_2"] = 4] = "HOUSE_2";
})(BuildingType || (BuildingType = {}));
var FloorType;
(function (FloorType) {
    FloorType[FloorType["SKYSCRAPER_1_BASE"] = 10] = "SKYSCRAPER_1_BASE";
    FloorType[FloorType["SKYSCRAPER_1_SPECIAL"] = 1] = "SKYSCRAPER_1_SPECIAL";
    FloorType[FloorType["SKYSCRAPER_2_BASE"] = 20] = "SKYSCRAPER_2_BASE";
    FloorType[FloorType["SKYSCRAPER_2_SPECIAL"] = 2] = "SKYSCRAPER_2_SPECIAL";
    FloorType[FloorType["SKYSCRAPER_3_BASE"] = 30] = "SKYSCRAPER_3_BASE";
    FloorType[FloorType["HOUSE_1_BASE"] = 100] = "HOUSE_1_BASE";
    FloorType[FloorType["HOUSE_2_BASE"] = 200] = "HOUSE_2_BASE";
})(FloorType || (FloorType = {}));
export default class CityGenerator {
    constructor(cs, gs) {
        this.waterLevel = 0;
        this.highwayWidth = 3;
        this.streetWidth = 1.2;
        this.globalGridAngle = 0;
        this.numBuildingsGoal = 300;
        this.buildingScale = 0.5;
        this.buildingRadius = 5;
        // reference these for their positions;
        // do NOT send the instanced vbos to these.
        this.referenceCube = new Cube(vec3.fromValues(0, 0, 0));
        this.referenceHexPrism = new HexagonalPrism(vec3.fromValues(0, 0, 0));
        // Pixel data that is rendered in the frame buffer
        // and passed into the generator.
        this.data = undefined;
        this.dataSize = undefined;
        this.citySize = cs;
        this.gridSize = gs;
    }
    setData(d, ds) {
        this.data = d;
        this.dataSize = ds;
        this.reset();
    }
    setWaterLevel(level) {
        this.waterLevel = level * 255 / 5;
    }
    setRoads(rArray) {
        this.roads = rArray;
    }
    setHighwayWidth(width) {
        this.highwayWidth = width;
    }
    setStreetWidth(width) {
        this.streetWidth = width;
    }
    setGlobalGridAngle(angle) {
        this.globalGridAngle = angle;
    }
    // Gets the green component of the image
    getElevation(point) {
        let texPoint = vec2.create();
        texPoint[0] = point[0] / this.citySize[0];
        texPoint[1] = point[1] / this.citySize[1];
        texPoint[0] = Math.floor(texPoint[0] * this.dataSize[0]);
        texPoint[1] = Math.floor(texPoint[1] * this.dataSize[1]);
        return this.data[4.0 * (texPoint[0] + this.dataSize[0] * texPoint[1]) + 1.0];
    }
    getPopulation(point) {
        let texPoint = vec2.create();
        texPoint[0] = point[0] / this.citySize[0];
        texPoint[1] = point[1] / this.citySize[1];
        texPoint[0] = Math.floor(texPoint[0] * this.dataSize[0]);
        texPoint[1] = Math.floor(texPoint[1] * this.dataSize[1]);
        return this.data[4.0 * (texPoint[0] + this.dataSize[0] * texPoint[1])];
    }
    reset() {
        this.cellWidth = this.citySize[0] / this.gridSize[0];
        this.validCells = [];
        for (let i = 0; i < this.gridSize[0] * this.gridSize[1]; i++) {
            this.validCells.push(0);
        }
        this.roads = [];
        this.buildingPositions = [];
        this.cubeTransformMats = [];
        this.hexTransformMats = [];
        this.cubeInstancedTransforms = [];
        this.hexInstancedTransforms = [];
        this.cubeInstancedFloorTypes = [];
        this.hexInstancedFloorTypes = [];
        for (let i = 0; i < 4; i++) {
            this.cubeInstancedTransforms.push([]);
            this.hexInstancedTransforms.push([]);
        }
    }
    //////////////////////////////////////
    // CELL ACCESS HELPER FUNCTIONS
    //////////////////////////////////////
    getPosRowNumber(p) {
        return Math.floor(p[1] / this.cellWidth);
    }
    getPosColNumber(p) {
        return Math.floor(p[0] / this.cellWidth);
    }
    getPosCellNumber(p) {
        let cellx = Math.floor(p[0] / this.cellWidth), celly = Math.floor(p[1] / this.cellWidth);
        return this.getCellNumberFromXY(cellx, celly);
    }
    getCellNumberFromXY(x, y) {
        if (x < 0 || x >= this.gridSize[0] || y < 0 || y >= this.gridSize[1]) {
            return undefined;
        }
        return Math.floor(this.gridSize[0] * y + x);
    }
    // Returns (x, y), aka (col, row).
    getXYFromCellNumber(cellNum) {
        if (cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
            return undefined;
        }
        return vec2.fromValues(cellNum % this.gridSize[0], Math.floor(cellNum / this.gridSize[0]));
    }
    getMidpointOfCell(cellNum) {
        if (cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
            return undefined;
        }
        let xy = this.getXYFromCellNumber(cellNum);
        let xVal = (xy[0] + 0.5) * this.cellWidth, yVal = (xy[1] + 0.5) * this.cellWidth;
        return vec2.fromValues(xVal, yVal);
    }
    // Returns the bottom left and top right corners of cell,
    // in that order. (The other two can be inferred.)
    getCornersOfCell(cellNum) {
        if (cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
            return undefined;
        }
        let xy = this.getXYFromCellNumber(cellNum);
        let xValBL = xy[0] * this.cellWidth, yValBL = xy[1] * this.cellWidth, xValTR = (xy[0] + 1) * this.cellWidth, yValTR = (xy[1] + 1) * this.cellWidth;
        return [vec2.fromValues(xValBL, yValBL),
            vec2.fromValues(xValTR, yValTR)];
    }
    // gets all eight neighbors of the current cell
    getNeighborsOfCell(cellNum) {
        if (cellNum < 0 || cellNum >= this.gridSize[0] * this.gridSize[1]) {
            return undefined;
        }
        let neighbors = [];
        let xy = this.getXYFromCellNumber(cellNum);
        for (let i = xy[1] - 1; i <= xy[1] + 1; i++) {
            for (let j = xy[0] - 1; j <= xy[0] + 1; j++) {
                let nCellNum = this.getCellNumberFromXY(j, i);
                if (nCellNum == undefined || nCellNum == cellNum) {
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
    rasterizeWater() {
        for (let i = 0; i < this.validCells.length; i++) {
            let midpoint = this.getMidpointOfCell(i);
            let height = this.getElevation(midpoint);
            if (height <= this.waterLevel) {
                this.validCells[i] = 1;
            }
        }
    }
    rasterizeRoads() {
        for (let road of this.roads) {
            let roadWidth = this.streetWidth;
            if (road.highway) {
                roadWidth = this.highwayWidth;
            }
            let checkNeighbors = roadWidth > 1.5 * this.cellWidth;
            let endpoint1XY = this.getXYFromCellNumber(this.getPosCellNumber(road.endpoint1)), endpoint2XY = this.getXYFromCellNumber(this.getPosCellNumber(road.endpoint2));
            let yMin = Math.round(Math.min(endpoint1XY[1], endpoint2XY[1])), yMax = Math.round(Math.max(endpoint1XY[1], endpoint2XY[1])), xMin = Math.round(Math.min(endpoint1XY[0], endpoint2XY[0])), xMax = Math.round(Math.max(endpoint1XY[0], endpoint2XY[0]));
            for (let i = yMin; i <= yMax; i++) {
                for (let j = xMin; j <= xMax; j++) {
                    let cellNum = this.getCellNumberFromXY(j, i);
                    let corners = this.getCornersOfCell(cellNum);
                    if (road.intersectQuad(corners[0], corners[1])) {
                        this.validCells[cellNum] = 2;
                        if (checkNeighbors) {
                            let cellMidpt = this.getMidpointOfCell(cellNum);
                            let cellNeighbors = this.getNeighborsOfCell(cellNum);
                            for (let i = 0; i < cellNeighbors.length; i++) {
                                if (vec2.distance(cellMidpt, this.getMidpointOfCell(cellNeighbors[i])) < roadWidth / 2) {
                                    this.validCells[cellNeighbors[i]] = 2;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    rasterizerTester() {
        this.buildingPositions = [];
        for (let i = 0; i < this.validCells.length; i++) {
            this.buildingPositions.push(this.getMidpointOfCell(i));
        }
        for (let i = 0; i < this.buildingPositions.length; i++) {
            let pos = this.buildingPositions[i];
            let pos3D = vec3.fromValues(pos[0], 2, pos[1]);
            let scale = vec3.fromValues(this.cellWidth, 0.3, this.cellWidth);
            let color = -2.0;
            if (this.validCells[i] > 0) {
                color = -1.0;
            }
            let transform = mat4.create(), scaleMat = mat4.create(), rotateMat = mat4.create(), translateMat = mat4.create();
            mat4.fromScaling(scaleMat, scale);
            mat4.fromTranslation(translateMat, pos3D);
            mat4.multiply(transform, translateMat, scaleMat);
            for (let j = 0; j < 4; j++) {
                this.cubeInstancedTransforms[0].push(transform[j]);
                this.cubeInstancedTransforms[1].push(transform[4 + j]);
                this.cubeInstancedTransforms[2].push(transform[8 + j]);
                this.cubeInstancedTransforms[3].push(transform[12 + j]);
            }
            this.cubeInstancedFloorTypes.push(color);
        }
    }
    // strictly for the rasterizer tester
    renderCube(pos) {
        let pos3D = vec3.fromValues(pos[0], 0, pos[1]);
        let scale = vec3.fromValues(3, 1, 3);
        let color = -2.0;
        let transform = mat4.create(), scaleMat = mat4.create(), rotateMat = mat4.create(), translateMat = mat4.create();
        mat4.fromScaling(scaleMat, scale);
        mat4.fromTranslation(translateMat, pos3D);
        mat4.multiply(transform, translateMat, scaleMat);
        for (let j = 0; j < 4; j++) {
            this.cubeInstancedTransforms[0].push(transform[j]);
            this.cubeInstancedTransforms[1].push(transform[4 + j]);
            this.cubeInstancedTransforms[2].push(transform[8 + j]);
            this.cubeInstancedTransforms[3].push(transform[12 + j]);
        }
        this.cubeInstancedFloorTypes.push(color);
    }
    //////////////////////////////////////
    // POINT GENERATION FOR BUILDINGS
    //////////////////////////////////////
    generateBuildingPositions() {
        this.buildingPositions = [];
        let numBuildings = 0;
        let badLoopCap = 0;
        while (numBuildings < this.numBuildingsGoal) {
            let position = vec2.fromValues(Math.random() * this.citySize[0], Math.random() * this.citySize[1]);
            let cell = this.getPosCellNumber(position);
            if (this.validCells[cell] == 0) {
                // Test for nearby roads in a 5 x 5 space. If there
                // are enough roads filling the space around the point,
                // then place the point.
                let threshold = 0.15;
                let xy = this.getXYFromCellNumber(cell);
                let totalRoadCells = 0;
                for (let i = xy[1] - 2; i <= xy[1] + 2; i++) {
                    for (let j = xy[0] - 2; j <= xy[0] + 2; j++) {
                        if (this.validCells[this.getCellNumberFromXY(j, i)] == 2) {
                            totalRoadCells++;
                        }
                    }
                }
                if (totalRoadCells / 25.0 >= threshold) {
                    this.buildingPositions.push(position);
                    numBuildings++;
                    badLoopCap = 0;
                    for (let i = xy[1] - Math.floor(this.buildingRadius / 2); i <= xy[1] + Math.ceil(this.buildingRadius / 2); i++) {
                        for (let j = xy[0] - Math.floor(this.buildingRadius / 2); j <= xy[0] + Math.ceil(this.buildingRadius / 2); j++) {
                            this.validCells[this.getCellNumberFromXY(j, i)] = 3;
                        }
                    }
                }
                else {
                    badLoopCap++;
                }
            }
            else {
                badLoopCap++;
            }
            if (badLoopCap >= 100) {
                break;
            }
        }
    }
    //////////////////////////////////////
    // BUILDING GENERATION HELPER FUNCTIONS
    ////////////////////////////////////// 
    random2D(p, seed) {
        let p2 = vec2.fromValues(p[0] * p[0], p[1] * 1.5);
        let dot = vec2.dot(p, seed);
        let sin = Math.sin(dot);
        return sin - Math.floor(sin);
    }
    isCube(obj) {
        return obj.count == 36;
    }
    isHexagonalPrism(obj) {
        return obj.count == 60;
    }
    getVec4PositionAtIndexFromShape(d, index) {
        let shapePositions;
        let numPositions = 0;
        if (this.isCube(d)) {
            let cube = d;
            shapePositions = d.positions;
            numPositions = d.positions.length / 4;
        }
        else if (this.isHexagonalPrism(d)) {
            let hex = d;
            shapePositions = d.positions;
            numPositions = d.positions.length / 4;
        }
        if (index < 0 || index >= numPositions) {
            return undefined;
        }
        let trueStartingIndex = index * 4;
        return vec4.fromValues(shapePositions[trueStartingIndex], shapePositions[trueStartingIndex + 1], shapePositions[trueStartingIndex + 2], shapePositions[trueStartingIndex + 3]);
    }
    getRandomPointOfFloorPlan(floorPlan) {
        // Choose one of the floor plan shapes at random.
        let fpShapes = floorPlan.shapes;
        let fpIndex = Math.floor(Math.random() * fpShapes.length);
        let chosenShape = fpShapes[fpIndex];
        // Choose one of the bottom indices of the floor plan shape. 
        // These are directly drawn from the positions array in either class.
        let chosenIndex = -1;
        let bottomCubeIndices = [16, 17, 18, 19];
        let bottomHexIndices = [6, 7, 8, 9, 10, 11];
        let originalPos = vec4.create();
        if (chosenShape == Shape.SQUARE) {
            chosenIndex = bottomCubeIndices[Math.floor(Math.random() * 4)];
            originalPos = this.getVec4PositionAtIndexFromShape(this.referenceCube, chosenIndex);
        }
        else if (chosenShape == Shape.HEX) {
            chosenIndex = bottomHexIndices[Math.floor(Math.random() * 6)];
            originalPos = this.getVec4PositionAtIndexFromShape(this.referenceHexPrism, chosenIndex);
        }
        let fpTransformations = floorPlan.transformations;
        let localTransform = fpTransformations[fpIndex];
        let transformedPos = vec4.create();
        vec4.transformMat4(transformedPos, originalPos, localTransform);
        return vec3.fromValues(transformedPos[0], transformedPos[1], transformedPos[2]);
    }
    getRandomSideOfCube() {
        let bottomCubeIndices = [16, 17, 18, 19];
        let result = vec2.create();
        let side = Math.ceil(Math.random() * 4);
        let index1, index2;
        switch (side) {
            case 1:
                index1 = 16;
                index2 = 17;
                break;
            case 2:
                index1 = 17;
                index2 = 18;
                break;
            case 3:
                index1 = 18;
                index2 = 19;
                break;
            case 4:
                index1 = 19;
                index2 = 16;
        }
        let point1 = this.getVec4PositionAtIndexFromShape(this.referenceCube, index1), point2 = this.getVec4PositionAtIndexFromShape(this.referenceCube, index2);
        let p1 = vec2.fromValues(point1[0], point1[2]), p2 = vec2.fromValues(point2[0], point2[2]);
        vec2.add(result, p1, p2);
        vec2.scale(result, result, 0.5);
        return result;
    }
    //////////////////////////////////////
    // BUILDING GENERATION
    /////////////////////////////////////
    getFloorScale(shape, buildingType, maxBuildingHeight) {
        let result = vec2.create();
        if (buildingType >= BuildingType.HOUSE_1) {
            result = vec2.fromValues(12, 12);
        }
        else if (shape == Shape.HEX) {
            result = vec2.fromValues(maxBuildingHeight * (2 + Math.random() * 3), maxBuildingHeight * (2 + Math.random() * 3));
        }
        else {
            result = vec2.fromValues(maxBuildingHeight * (1 + Math.random() * 2), maxBuildingHeight * (1 + Math.random() * 2));
        }
        return result;
    }
    generateBuildings() {
        this.referenceCube.create();
        this.referenceHexPrism.create();
        for (let p of this.buildingPositions) {
            let pop = this.getPopulation(p);
            let floorPlan = new FloorPlan();
            let floorPlanShapes = floorPlan.shapes;
            let floorPlanLocalTransformations = floorPlan.transformations;
            // The first array corresponds to the shapes in the floor plan.
            // The second case corresponds to the floors in the entire building.
            // 
            let floorPlanSpecialCasesShapes = floorPlan.specialCasesShapes;
            let floorPlanSpecialCasesFloors = [];
            // This keeps track of how MANY of each special shape / floor there is,
            // while the other array keeps track of the order.
            // This could be constructed every time in the floor type function
            // but this is so low memory that it's easier to track it here.
            let floorPlanSpecialCasesShapesCount = floorPlan.specialCasesShapesCount;
            let floorPlanSpecialCasesFloorsCount = [0, 0, 0];
            let lastYOffset = 0;
            let maxFloors = 8;
            let currFloors = 1;
            let maxBuildingHeight = 10;
            let buildingType = BuildingType.SKYSCRAPER_1;
            if (pop > 0.8 * 255) {
                maxBuildingHeight = pop / 40;
                if (Math.random() > 0.5) {
                    buildingType = BuildingType.SKYSCRAPER_2;
                }
            }
            else if (pop > 0.6 * 255) {
                maxBuildingHeight = 4;
                maxFloors = 5;
            }
            else {
                maxBuildingHeight = 0.6 + Math.random() * 0.4;
                maxFloors = 2;
                buildingType = BuildingType.HOUSE_1;
            }
            let currHeight = maxBuildingHeight;
            let minFloorHeight = Math.min(0.75, Math.max(maxBuildingHeight / (2 * maxFloors), 0.25));
            //let maxFloorHeight: number = Math.max(2 * maxBuildingHeight / maxFloors, minFloorHeight);
            let maxFloorHeight = Math.max(maxBuildingHeight / maxFloors + minFloorHeight / 2, minFloorHeight);
            let lastFloor = false;
            while (currHeight > 0) {
                // Choose a floor shape to use.
                let shape = this.random2D(p, vec2.fromValues(currFloors, currFloors)) >= 0.5 ? Shape.SQUARE : Shape.HEX;
                if (buildingType == BuildingType.HOUSE_1) {
                    shape = Shape.SQUARE;
                }
                // Determine the height of the current floor. 
                let floorHeight = minFloorHeight;
                floorHeight += (maxFloorHeight - minFloorHeight) * Math.random();
                if (currHeight < 2 * minFloorHeight || currHeight - floorHeight < minFloorHeight || currFloors == maxFloors) {
                    floorHeight = currHeight;
                }
                // Create the transformation matrices for the shapes of this floor.
                let transformMat = mat4.create(), translateMat = mat4.create(), rotateMat = mat4.create(), scaleMat = mat4.create();
                let yOffset = 0;
                if (floorPlanShapes.length > 0) {
                    let newShapeMidpoint = vec3.create();
                    if (buildingType == BuildingType.HOUSE_1) {
                        let sideOfCube = this.getRandomSideOfCube();
                        newShapeMidpoint = vec3.fromValues(sideOfCube[0], 0, sideOfCube[1]);
                    }
                    else {
                        newShapeMidpoint = this.getRandomPointOfFloorPlan(floorPlan);
                    }
                    newShapeMidpoint[1] += 0.5;
                    mat4.fromTranslation(translateMat, newShapeMidpoint);
                    yOffset = lastYOffset - floorHeight;
                }
                else {
                    mat4.fromTranslation(translateMat, vec3.fromValues(0, 0, 0));
                    yOffset = currHeight - floorHeight;
                }
                let angle = Math.random() * (45 * Math.PI / 180);
                if (buildingType == BuildingType.HOUSE_1) {
                    angle = -this.globalGridAngle;
                }
                let scale = this.getFloorScale(shape, buildingType, maxBuildingHeight);
                mat4.fromRotation(rotateMat, angle, vec3.fromValues(0, 1, 0));
                mat4.fromScaling(scaleMat, vec3.fromValues(scale[0], 1, scale[1]));
                mat4.multiply(transformMat, rotateMat, scaleMat);
                mat4.multiply(transformMat, translateMat, transformMat);
                floorPlanShapes.push(shape);
                floorPlanLocalTransformations.push(transformMat);
                let floorTypes = this.generateFloorTypes(p, floorPlan, floorPlanSpecialCasesFloors, floorPlanSpecialCasesFloorsCount, floorHeight, yOffset, lastFloor, buildingType, maxBuildingHeight);
                this.renderFloorPlan(p, floorPlanShapes, floorPlanLocalTransformations, floorHeight, yOffset, floorTypes);
                lastYOffset = yOffset;
                currHeight = currHeight - floorHeight;
                currFloors++;
            }
        }
    }
    generateFloorTypes(pos, fp, fpSpecialCasesFloors, fpSpecialCasesFloorsCount, fpHeight, fpYOffset, fpLast, bType, bMaxHeight) {
        // Handle floor type assignment for the entire floor
        let heightRatio = (fpYOffset + (fpHeight / 2)) / bMaxHeight;
        let floorType;
        let fpShapes = fp.shapes;
        /*if(fpShapes.length % 2 == 0) {
          cubeColor = vec4.fromValues(0.2, 0.8, 0.2, 1.);
        }*/
        switch (bType) {
            case BuildingType.SKYSCRAPER_1: {
                let currFloorNumber = fpShapes.length - 1;
                let specialFloorCaseCount = fpSpecialCasesFloorsCount[1];
                if (specialFloorCaseCount < 1
                    && (currFloorNumber == 0 || fpSpecialCasesFloors[currFloorNumber - 1] != 1)
                    && this.random2D(pos, vec2.fromValues(currFloorNumber, 2 * currFloorNumber)) > 0.6) {
                    floorType = FloorType.SKYSCRAPER_1_SPECIAL;
                }
                else {
                    floorType = FloorType.SKYSCRAPER_1_BASE;
                    let windowNum = Math.floor(Math.random() * 4);
                    floorType += windowNum;
                }
                break;
            }
            case BuildingType.SKYSCRAPER_2: {
                floorType = FloorType.SKYSCRAPER_2_BASE;
                let windowNum = Math.random() * 3;
                if (windowNum > 1) {
                    windowNum = Math.ceil(windowNum);
                    windowNum += 2.0;
                }
                else {
                    windowNum = 0;
                }
                floorType += windowNum;
                break;
            }
            case BuildingType.HOUSE_1: {
                floorType = FloorType.HOUSE_1_BASE;
            }
            default: {
                break;
            }
        }
        // Take care of special shape cases here (shapes with different textures than the others)
        let result = [];
        let fpSpecialCasesShapes = fp.specialCasesShapes;
        let fpSpecialCasesShapesCount = fp.specialCasesShapesCount;
        for (let i = 0; i < fpShapes.length; i++) {
            if (bType == BuildingType.SKYSCRAPER_2) {
                let shapeCaseNum = fpSpecialCasesShapes[i];
                switch (shapeCaseNum) {
                    case undefined:
                        let shapeCaseCount = fpSpecialCasesShapesCount[1];
                        if (shapeCaseCount < 1
                            && fpShapes[i] == Shape.HEX
                            && this.random2D(pos, vec2.fromValues(2 * fpShapes.length, -fpShapes.length / 2)) > 0.4) {
                            result.push(FloorType.SKYSCRAPER_2_SPECIAL);
                            fpSpecialCasesShapes.push(CaseFlag.SPECIAL_1);
                            fpSpecialCasesShapesCount[1]++;
                        }
                        else {
                            result.push(floorType);
                            fpSpecialCasesShapes.push(CaseFlag.DEFAULT);
                            fpSpecialCasesShapesCount[0]++;
                        }
                        break;
                    case CaseFlag.SPECIAL_1:
                        if (this.random2D(pos, vec2.fromValues(-8 * fpShapes.length, 5 * fpShapes.length)) > 0.6) {
                            result.push(2);
                        }
                        else {
                            result.push(floorType);
                        }
                        break;
                    default:
                        result.push(floorType);
                        break;
                }
            }
            else {
                result.push(floorType);
            }
        }
        // Keep track of the assigned floor type here
        fpSpecialCasesFloors.push(floorType);
        fpSpecialCasesFloorsCount[floorType]++;
        return result;
    }
    renderFloorPlan(pos, fpShapes, fpLocalTransformations, fpHeight, fpYOffset, fpTypes) {
        let translateToBuildingPos = mat4.create(), scaleToFloorHeight = mat4.create();
        mat4.fromTranslation(translateToBuildingPos, vec3.fromValues(pos[0], this.buildingScale * (fpYOffset + fpHeight / 2), pos[1]));
        mat4.fromScaling(scaleToFloorHeight, vec3.fromValues(this.buildingScale, this.buildingScale * fpHeight, this.buildingScale));
        for (let i = 0; i < fpShapes.length; i++) {
            let scaledTransform = mat4.create(), worldTransform = mat4.create();
            mat4.multiply(scaledTransform, scaleToFloorHeight, fpLocalTransformations[i]);
            mat4.multiply(worldTransform, translateToBuildingPos, scaledTransform);
            switch (fpShapes[i]) {
                case 4: {
                    for (let j = 0; j < 4; j++) {
                        this.cubeInstancedTransforms[0].push(worldTransform[j]);
                        this.cubeInstancedTransforms[1].push(worldTransform[4 + j]);
                        this.cubeInstancedTransforms[2].push(worldTransform[8 + j]);
                        this.cubeInstancedTransforms[3].push(worldTransform[12 + j]);
                    }
                    this.cubeInstancedFloorTypes.push(fpTypes[i]);
                    break;
                }
                case 6: {
                    for (let j = 0; j < 4; j++) {
                        this.hexInstancedTransforms[0].push(worldTransform[j]);
                        this.hexInstancedTransforms[1].push(worldTransform[4 + j]);
                        this.hexInstancedTransforms[2].push(worldTransform[8 + j]);
                        this.hexInstancedTransforms[3].push(worldTransform[12 + j]);
                    }
                    this.hexInstancedFloorTypes.push(fpTypes[i]);
                    break;
                }
                default: {
                    break;
                }
            }
        }
    }
    generateCity() {
        this.rasterizeWater();
        this.rasterizeRoads();
        this.generateBuildingPositions();
        this.generateBuildings();
    }
    //////////////////////////////////////
    // PUBLIC ACCESS FUNCTIONS
    //////////////////////////////////////
    getBuildingPositions() {
        return this.buildingPositions;
    }
    getCubeInstancedTransforms() {
        return this.cubeInstancedTransforms;
    }
    getHexInstancedTransforms() {
        return this.hexInstancedTransforms;
    }
    getCubeInstancedFloorTypes() {
        return this.cubeInstancedFloorTypes;
    }
    getHexInstancedFloorTypes() {
        return this.hexInstancedFloorTypes;
    }
    getCubeTransformMats() {
        return this.cubeTransformMats;
    }
    getHexTransformMats() {
        return this.hexTransformMats;
    }
    getBuildingCount() {
        return this.buildingPositions.length;
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
//# sourceMappingURL=CityGenerator.js.map