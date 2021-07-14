import { vec2, vec3, vec4, mat4 } from 'gl-matrix';
import Edge from './Edge';
import Node from './Node';
import Turtle from './Turtle';
export default class RoadGenerator {
    constructor(cs, gs) {
        this.useMyStartPos = false;
        // Highway variables
        this.searchRadius = 100;
        this.searchAngle = 90;
        this.searchSteps = 6;
        this.branchThreshold = 45;
        this.hSegLength = 100;
        this.maxBlocks = 30;
        this.gridLength = 20;
        this.gridWidth = 10;
        this.useRandomness = true;
        this.maxGridIterations = 20;
        this.globalGridAngle = 0;
        this.globalDirection = vec2.fromValues(1.0, 0);
        this.nodeEpsilon = 2;
        this.nCounter = 0;
        this.eCounter = 0;
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
    setStartPos(sp) {
        vec2.copy(this.startPos, sp);
    }
    setUseMyStartPos(lock) {
        this.useMyStartPos = lock;
    }
    setUseRandomness(val) {
        this.useRandomness = val;
    }
    setMaxGridIterations(val) {
        this.maxGridIterations = val;
    }
    setGlobalGridAngle(angle) {
        this.globalGridAngle = angle;
        this.globalDirection = vec2.fromValues(this.cosDeg(angle), this.sinDeg(angle));
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
    setWaterLevel(level) {
        this.waterLevel = level * 255 / 5;
    }
    reset() {
        this.cellWidth = this.citySize[0] / this.gridSize[0];
        this.ncells = [];
        this.ecells = [];
        for (let i = 0; i < this.gridSize[0] * this.gridSize[1]; i++) {
            this.ncells.push([]);
            this.ecells.push([]);
        }
        this.mainRoads = [];
        this.smallRoads = [];
        this.turtles = [];
        this.turtlesToAdd = [];
        this.gridTurtles = [];
        this.instancedAttributes = [];
        for (let i = 0; i < 5; i++) {
            this.instancedAttributes.push([]);
        }
        if (this.data == undefined) {
            return;
        }
        // Bias the random point towards the edges.
        if (!this.useMyStartPos) {
            do {
                let xValue = Math.random() * 0.09 * this.citySize[0]
                    + 0.01 * this.citySize[0], yValue = Math.random() * 0.09 * this.citySize[1]
                    + 0.01 * this.citySize[1];
                if (Math.random() <= 0.5) {
                    xValue += 0.90 * this.citySize[0];
                }
                if (Math.random() <= 0.5) {
                    yValue += 0.90 * this.citySize[1];
                }
                this.startPos = vec2.fromValues(xValue, yValue);
            } while (this.getElevation(this.startPos) <= this.waterLevel);
        }
        // Based on the position, attempt to make Turtle face
        // the direction with the most promising population density,
        // as long as it points in a general direction towards the center of the map.
        let rotation = 0;
        let maxWeight = -1;
        for (let i = -360; i <= 360; i += 30) {
            let tempTurtle = new Turtle(this.startPos, vec2.fromValues(1, 0), 0);
            tempTurtle.rotate(i);
            let weight = 0;
            tempTurtle.moveForward(this.cellWidth);
            if (this.getElevation(tempTurtle.position) > this.waterLevel &&
                !this.outOfBounds(tempTurtle.position)) {
                weight = this.getPopulation(tempTurtle.position);
            }
            if (weight > maxWeight) {
                rotation = i;
                maxWeight = weight;
            }
        }
        let candidate = vec2.fromValues(this.cosDeg(rotation), this.sinDeg(rotation));
        let turtleToCenter = vec2.fromValues(this.citySize[0] * 0.5 - this.startPos[0], this.citySize[1] * 0.5 - this.startPos[1]);
        vec2.normalize(turtleToCenter, turtleToCenter);
        let finalDir = vec2.create();
        let angle = this.acosDeg(vec2.dot(candidate, turtleToCenter));
        if (angle > 90) {
            vec2.copy(finalDir, turtleToCenter);
        }
        else {
            vec2.copy(finalDir, candidate);
        }
        let t = new Turtle(this.startPos, finalDir, -1);
        this.turtles.push(t);
        this.sortNode(new Node(this.startPos, this.nCounter));
    }
    // Given height and population data, generate a substantial set of roads that covers it
    generateRoads() {
        // Hard cap to guarantee that the program ends and won't infinitely loop
        let maxHWIterations = 20;
        // First we lay out the highways
        for (let j = 0; j < maxHWIterations && this.turtles.length > 0; j++) {
            for (let i = 0; i < this.turtles.length; i++) {
                this.branchHighway(this.turtles[i]);
            }
            let activeTurtles = [];
            for (let i = 0; i < this.turtles.length; i++) {
                if (this.drawRoad(this.turtles[i])) {
                    activeTurtles.push(this.turtles[i]);
                }
            }
            this.turtles = activeTurtles;
            this.turtles = this.turtles.concat(this.turtlesToAdd);
            this.turtlesToAdd = [];
        }
        this.turtles = [];
        // Then start to layout first grid roads
        for (let i = 0; i < this.mainRoads.length; i++) {
            this.branchGrid(this.mainRoads[i]);
        }
        for (let j = 0; j < this.maxGridIterations && this.turtles.length > 0; j++) {
            let activeTurtles = [];
            for (let i = 0; i < this.turtles.length; i++) {
                if (this.drawRoad(this.turtles[i])) {
                    activeTurtles.push(this.turtles[i]);
                }
            }
            this.turtles = activeTurtles;
            this.turtles = this.turtles.concat(this.turtlesToAdd);
            this.turtlesToAdd = [];
        }
        // Draw out the second ones
        this.turtles = [];
        this.turtles = this.gridTurtles;
        for (let j = 0; j < this.maxGridIterations && this.turtles.length > 0; j++) {
            let activeTurtles = [];
            for (let i = 0; i < this.turtles.length; i++) {
                if (this.drawRoad(this.turtles[i])) {
                    activeTurtles.push(this.turtles[i]);
                }
            }
            this.turtles = activeTurtles;
            this.turtles = this.turtles.concat(this.turtlesToAdd);
            this.turtlesToAdd = [];
        }
        console.log("done!");
        // Convert edges to render data
        for (let i = 0; i < this.smallRoads.length; i++) {
            this.renderEdge(this.smallRoads[i]);
        }
        for (let i = 0; i < this.mainRoads.length; i++) {
            this.renderEdge(this.mainRoads[i]);
        }
    }
    getMainRoads() {
        return this.mainRoads;
    }
    getSmallRoads() {
        return this.smallRoads;
    }
    getRoadCount() {
        return this.mainRoads.length + this.smallRoads.length;
    }
    getAllRoads() {
        let mrCopy = this.mainRoads.slice();
        let srCopy = this.smallRoads.slice();
        return mrCopy.concat(srCopy);
    }
    getInstancedAttributes() {
        return this.instancedAttributes;
    }
    renderEdge(e) {
        let midpoint = e.getMidpoint();
        let midpoint3D = vec3.fromValues(midpoint[0], 0, midpoint[1]);
        let scale = vec3.fromValues(e.getLength(), 0.05, 1);
        let color = vec4.fromValues(80. / 255., 80. / 255., 80. / 255., 1.2);
        if (e.highway) {
            scale[2] = 3.;
            color = vec4.fromValues(25. / 255., 25. / 225., 25. / 255., 1.);
        }
        let angle = -Math.atan2(e.endpoint2[1] - e.endpoint1[1], e.endpoint2[0] - e.endpoint1[0]);
        let transform = mat4.create();
        let scaleMat = mat4.create();
        let rotateMat = mat4.create();
        let translateMat = mat4.create();
        mat4.fromScaling(scaleMat, scale);
        mat4.fromRotation(rotateMat, angle, vec3.fromValues(0, 1, 0));
        mat4.fromTranslation(translateMat, midpoint3D);
        mat4.multiply(transform, rotateMat, scaleMat);
        mat4.multiply(transform, translateMat, transform);
        for (let j = 0; j < 4; j++) {
            this.instancedAttributes[0].push(transform[j]);
            this.instancedAttributes[1].push(transform[4 + j]);
            this.instancedAttributes[2].push(transform[8 + j]);
            this.instancedAttributes[3].push(transform[12 + j]);
        }
        for (let j = 0; j < 4; j++) {
            this.instancedAttributes[4].push(color[j]);
        }
    }
    //////////////////////////////////////
    // GENERAL HELPER FUNCTIONS
    //////////////////////////////////////
    outOfBounds(pos) {
        return pos[0] < 0 || pos[0] > this.citySize[0] || pos[1] < 0 || pos[1] > this.citySize[1];
    }
    // manages equality with a larger epsilon
    vec2Equality(v1, v2) {
        return Math.abs(v1[0] - v2[0]) < this.nodeEpsilon
            && Math.abs(v1[1] - v2[1]) < this.nodeEpsilon;
    }
    cosDeg(deg) {
        let rad = deg * Math.PI / 180;
        return Math.cos(rad);
    }
    sinDeg(deg) {
        let rad = deg * Math.PI / 180;
        return Math.sin(rad);
    }
    acosDeg(value) {
        return Math.acos(value) * 180 / Math.PI;
    }
    //////////////////////////////////////
    // CELL MANAGEMENT HELPER FUNCTIONS
    //////////////////////////////////////
    getPosRowNumber(p) {
        return Math.floor(p[1] / this.cellWidth);
    }
    getPosColNumber(p) {
        return Math.floor(p[0] / this.cellWidth);
    }
    getPosCellNumber(p) {
        let cellx = Math.floor(p[0] / this.cellWidth), celly = Math.floor(p[1] / this.cellWidth);
        return this.getCellNumberFromRowCol(cellx, celly);
    }
    getCellNumberFromRowCol(x, y) {
        let celln = Math.floor(this.gridSize[0] * y + x);
        if (celln < 0 || celln >= this.gridSize[0] * this.gridSize[1]) {
            return undefined;
        }
        return celln;
    }
    // Given a vec2 position, see if there is an existing
    // node that marks that position.
    getNodeAtPos(pos) {
        if (this.outOfBounds(pos)) {
            return undefined;
        }
        let nArray = this.ncells[this.getPosCellNumber(pos)];
        if (nArray == undefined) {
            return undefined;
        }
        for (let i = 0; i < nArray.length; i++) {
            if (this.vec2Equality(nArray[i].getPosition(), pos)) {
                return nArray[i];
            }
        }
        return undefined;
    }
    getNodeClosestToPos(pos) {
        return undefined;
    }
    // Given an edge, find all of the cells that it intersects
    getEdgeCells(e) {
        let ret = [];
        let leftBound = this.getPosColNumber(e.endpoint1);
        let rightBound = this.getPosColNumber(e.endpoint2);
        let bottomBound = this.getPosRowNumber(e.endpoint1);
        let topBound = this.getPosRowNumber(e.endpoint2);
        if (leftBound > rightBound) {
            rightBound = leftBound;
            leftBound = this.getPosColNumber(e.endpoint2);
        }
        if (bottomBound > topBound) {
            topBound = bottomBound;
            bottomBound = this.getPosRowNumber(e.endpoint2);
        }
        rightBound = Math.min(rightBound, this.gridSize[0]);
        topBound = Math.min(topBound, this.gridSize[1]);
        for (let j = bottomBound; j <= topBound; j++) {
            for (let i = leftBound; i <= rightBound; i++) {
                let cellNumber = this.gridSize[0] * j + i;
                if (cellNumber < 0 || cellNumber >= this.gridSize[0] * this.gridSize[1]) {
                    continue; // cell out of bounds
                }
                if (e.intersectQuad(vec2.fromValues(i * this.cellWidth, j * this.cellWidth), vec2.fromValues((i + 1) * this.cellWidth, (j + 1) * this.cellWidth))) {
                    ret.push(cellNumber);
                }
            }
        }
        return ret;
    }
    // Given a node, sort it into the cell map as long as there
    // isn't another existing node at that position. If the node
    // is unable to be fit, return false
    sortNode(n) {
        if (this.outOfBounds(n.getPosition())) {
            return false;
        }
        let array = this.ncells[this.getPosCellNumber(n.getPosition())];
        for (let i = 0; i < array.length; i++) {
            if (n.equals(array[i], this.nodeEpsilon)) {
                return false;
            }
        }
        array.push(n);
        this.nCounter++;
        return true;
    }
    // Given an edge, sort it into the cell map, i.e. find all of the cells
    // that it overlaps and store it in those cells' datasets.
    sortEdge(e) {
        let cells = this.getEdgeCells(e);
        if (cells == undefined || cells.length == 0) {
            return false;
        }
        for (let i = 0; i < cells.length; i++) {
            this.ecells[cells[i]].push(e);
        }
        this.eCounter++;
        return true;
    }
    willIntersect(t1, t2) {
        let p = t1.position;
        let r = t1.orientation;
        let q = t2.position;
        let s = t2.orientation;
        let qp = vec2.create();
        vec2.subtract(qp, q, p);
        let qpxr = qp[0] * r[1] - qp[1] * r[0];
        let qpxs = qp[0] * s[1] - qp[1] * s[0];
        let rxs = r[0] * s[1] - r[1] * s[0];
        if (Math.abs(rxs) < 0.01) {
            return false;
        }
        let u = qpxr / rxs;
        let t = qpxs / rxs;
        return u >= 0 && t >= 0;
    }
    //////////////////////////////////////
    // ROAD DRAWING & FUNCTIONS
    //////////////////////////////////////
    // Rotates the turtle such that it will draw in the direction of the most
    // highly weighted direction above a certain threshold, while generating
    // a new Turtle if either 1. the turtle rotates enough off its original course
    // and its current route is still strongly populated, or 2. the Turtle can go towards
    // two population peaks that are spread apart from each other
    branchHighway(t) {
        let rotation = 0;
        let secondRotation = 0;
        let maxWeight = -1;
        let secondMaxWeight = -1;
        let currentWeight = -1;
        for (let i = -this.searchAngle / 2; i <= this.searchAngle / 2; i += this.searchAngle / 8) {
            let tempTurtle = new Turtle(t.position, t.orientation, -1);
            tempTurtle.rotate(i);
            let weight = 0;
            for (let j = 0; j < this.searchSteps; j++) {
                tempTurtle.moveForward(this.searchRadius / this.searchSteps);
                if (this.outOfBounds(tempTurtle.position)) {
                    break;
                }
                if (this.getElevation(tempTurtle.position) > this.waterLevel) {
                    weight += this.getPopulation(tempTurtle.position)
                        / vec2.distance(tempTurtle.position, t.position);
                }
            }
            // extended search for current road
            if (Math.abs(i) < 0.1) {
                currentWeight = weight;
                for (let j = 0; j < this.searchSteps / 2; j++) {
                    tempTurtle.moveForward(this.searchRadius / (4 * this.searchSteps));
                    if (this.outOfBounds(tempTurtle.position)) {
                        break;
                    }
                    if (this.getElevation(tempTurtle.position) > this.waterLevel) {
                        currentWeight += this.getPopulation(tempTurtle.position)
                            / vec2.distance(tempTurtle.position, t.position);
                    }
                }
            }
            if (weight > maxWeight) {
                secondRotation = rotation;
                secondMaxWeight = maxWeight;
                rotation = i;
                maxWeight = weight;
            }
            else if (weight > secondMaxWeight) {
                secondRotation = i;
                secondMaxWeight = weight;
            }
        }
        let nt = new Turtle(t.position, t.orientation, -1);
        // Branch if the threshold is passed & the original direction is promising enough
        if (Math.abs(rotation) > this.branchThreshold && Math.abs(currentWeight - maxWeight) >
            Math.abs(currentWeight - secondMaxWeight)) {
            this.turtlesToAdd.push(nt);
        }
        // otherwise try to branch with the two max-weighted directions
        else if (Math.abs(rotation - secondRotation) > this.branchThreshold) {
            nt.rotate(secondRotation);
            this.turtlesToAdd.push(nt);
        }
        if (Math.abs(t.rotationTotal + rotation) < 150) {
            t.rotate(rotation);
            t.rotationTotal += rotation;
        }
    }
    branchGrid(e) {
        // We use the Turtle "depth" to store numbers 
        let minLength = 10;
        let maxSteps = Math.floor(e.getLength() / this.gridLength);
        if (e.getLength() / this.gridLength - maxSteps < 0.5) {
            maxSteps--;
        }
        let dir = e.getDirectionVector();
        let perpLocal = dir[1] != 0 ? vec2.fromValues(1, -dir[0] / dir[1])
            : vec2.fromValues(0, 1);
        let perpGlobal = this.globalDirection[1] != 0
            ? vec2.fromValues(1, -this.globalDirection[0] / this.globalDirection[1])
            : vec2.fromValues(0, 1);
        vec2.normalize(perpLocal, perpLocal);
        vec2.normalize(perpGlobal, perpGlobal);
        // angle between local perpendicular and the global direction
        let anglePerp = this.acosDeg(vec2.dot(perpLocal, this.globalDirection));
        anglePerp = Math.min(anglePerp, 180 - anglePerp);
        // angle between local direction and the global direction
        let angleRoadDir = this.acosDeg(vec2.dot(dir, this.globalDirection));
        angleRoadDir = Math.min(angleRoadDir, 180 - angleRoadDir);
        // change direction depending on which (if any)
        // of the two directions are closest to direction vector
        let gridDir = vec2.create();
        let gridPerpDir = vec2.create();
        if (anglePerp < 45) {
            vec2.copy(gridDir, this.globalDirection);
            vec2.copy(gridPerpDir, perpGlobal);
        }
        else if (angleRoadDir < 45) {
            vec2.copy(gridDir, perpGlobal);
            vec2.copy(gridPerpDir, this.globalDirection);
        }
        else {
            gridDir = perpLocal;
            gridPerpDir = dir;
        }
        // This turtle marches along the existing highway to spawn grid turtles along the sides
        let tempTurtle = new Turtle(e.endpoint1, dir, 0);
        for (let i = 0; i <= maxSteps; i++) {
            let t = new Turtle(tempTurtle.position, gridDir, 0);
            vec2.copy(t.stepDir, gridPerpDir);
            this.turtles.push(t);
            let oppDir = vec2.fromValues(-gridDir[0], -gridDir[1]);
            let t2 = new Turtle(tempTurtle.position, oppDir, 0);
            vec2.copy(t2.stepDir, gridPerpDir);
            this.turtles.push(t2);
            this.sortNode(new Node(tempTurtle.position, this.nCounter));
            tempTurtle.moveForward(this.gridLength);
        }
    }
    drawRoad(t) {
        if (this.getNodeAtPos(t.position) == undefined) {
            this.sortNode(new Node(t.position, this.nCounter));
        }
        if (t.depth < 0) {
            return this.drawHighway(t);
        }
        return this.drawGrid(t);
    }
    drawHighway(t) {
        let oldPos = vec2.fromValues(t.position[0], t.position[1]);
        t.moveForward(this.hSegLength);
        let road = new Edge(oldPos, vec2.fromValues(t.position[0], t.position[1]), this.eCounter, true);
        if (!this.fixForConstraints(road)) {
            return false;
        }
        vec2.copy(t.position, road.endpoint2);
        this.sortEdge(road);
        this.sortNode(new Node(oldPos, this.nCounter));
        this.mainRoads.push(road);
        return road.expandable;
    }
    drawGrid(t) {
        let upRoadDrawn = false;
        let forwardRoadDrawn = false;
        let oldPos = vec2.fromValues(t.position[0], t.position[1]);
        this.sortNode(new Node(oldPos, this.nCounter));
        let keepExpanding = true;
        if (t.depth > 0) {
            t.moveForward(this.gridLength);
            let road = new Edge(oldPos, vec2.fromValues(t.position[0], t.position[1]), this.eCounter, false);
            if (this.fixForConstraints(road)) {
                this.sortEdge(road);
                this.sortNode(new Node(road.endpoint2, this.nCounter));
                this.smallRoads.push(road);
                upRoadDrawn = true;
                keepExpanding = road.expandable;
            }
            if (this.useRandomness && Math.random() < 0.4) {
                t.rotate(90);
            }
        }
        else {
            t.moveForward(this.gridWidth);
            let road = new Edge(oldPos, vec2.fromValues(t.position[0], t.position[1]), this.eCounter, false);
            if (this.fixForConstraints(road)) {
                t.setPosition(road.endpoint2);
                this.sortNode(new Node(t.position, this.nCounter));
                this.sortEdge(road);
                this.smallRoads.push(road);
                forwardRoadDrawn = true;
                keepExpanding = keepExpanding && road.expandable;
            }
            this.gridTurtles.push(new Turtle(road.endpoint2, t.stepDir, 1));
            if (this.useRandomness && Math.random() < 0.1) {
                this.gridTurtles.push(new Turtle(road.endpoint2, vec2.fromValues(-t.stepDir[0], -t.stepDir[1]), 1));
            }
        }
        return (upRoadDrawn || forwardRoadDrawn) && keepExpanding;
    }
    //////////////////////////////////////
    // ROAD CONSTRAINT HELPER FUNCTIONS
    //////////////////////////////////////
    fixForConstraints(e) {
        return this.fixForBounds(e) && this.fixForWater(e) && this.fixForNearbyRoads(e);
    }
    fixForBounds(e) {
        if (this.outOfBounds(e.endpoint1)) {
            return false;
        }
        if (!this.outOfBounds(e.endpoint2)) {
            return true;
        }
        let temp = vec2.create(), increment = vec2.create();
        vec2.copy(temp, e.endpoint2);
        vec2.scale(increment, e.getDirectionVector(), e.getLength() / 4);
        for (let i = 0; i < 4; i++) {
            vec2.subtract(temp, temp, increment);
            if (!this.outOfBounds(temp)) {
                // stretch it so it goes off screen (for aesthetic)
                vec2.add(temp, temp, increment);
                vec2.copy(e.endpoint2, temp);
                return true;
            }
        }
        return false;
    }
    // Checks if the edge goes into the water and tries to adjust the endpoints'
    // positions accordingly. If the resulting edge can fit on land or is long enough
    // to be a worthwhile road, return true; else, return false.
    fixForWater(e) {
        // If the road is a highway ending in a body of water,
        // we can try to extend it to a piece of land within reach.
        // Otherwise, we let the highway dangle, anticipating that it can be shortened
        // back towards land.
        if (e.highway) {
            // Test if the newest endpoint is in the water.
            if (this.getElevation(e.endpoint2) > this.waterLevel) {
                return true;
            }
            let increment = vec2.create();
            vec2.scale(increment, e.getDirectionVector(), this.hSegLength);
            let temp = vec2.fromValues(e.endpoint2[0], e.endpoint2[1]);
            for (let i = 0; i < 20; i++) {
                vec2.add(temp, temp, increment);
                if (this.outOfBounds(temp)) {
                    break;
                }
                if (this.getElevation(temp) > this.waterLevel) {
                    vec2.copy(e.endpoint2, temp);
                    return true;
                }
            }
        }
        // Otherwise, if the road is part of the grid network or is a highway
        // that cannot be extended, we check if the road at any point
        // (within reasonable testing) crosses water. If so, we truncate the
        // road so it's as long as possible before hitting water.
        let testPoint = vec2.create();
        vec2.copy(testPoint, e.endpoint1);
        let increment = e.getDirectionVector();
        vec2.scale(increment, increment, e.getLength() / 10);
        for (let i = 0; i < 10; i++) {
            vec2.add(testPoint, testPoint, increment);
            if (this.getElevation(testPoint) <= this.waterLevel) {
                vec2.subtract(testPoint, testPoint, increment);
                vec2.copy(e.endpoint2, testPoint);
                break;
            }
        }
        return e.getLength() >= 2 * vec2.length(increment);
    }
    adjustForIntersection(e) {
        // Add new intersections where the edge intersects other edges;
        // keep track of the intersection closest to the first endpoint,
        // then chop the road so it intersects it. This is to ensure
        // the road doesn't penetrate through others.
        let nodeId = -1;
        if (this.getNodeAtPos(e.endpoint1) != undefined) {
            nodeId = this.getNodeAtPos(e.endpoint1).id;
        }
        let closestMid = undefined;
        let closestMidDistance = Math.max(this.citySize[0], this.citySize[1]);
        // Get the indices of the cells that the target edge intersects;
        // we check these for intersections with other edges.
        let interCells = this.getEdgeCells(e);
        for (let i = 0; i < interCells.length; i++) {
            let cellNum = interCells[i];
            let cellEdges = this.ecells[cellNum];
            for (let j = 0; j < cellEdges.length; j++) {
                let currEdge = cellEdges[j];
                if (e.id == cellEdges[j].id) {
                    continue;
                }
                let inter = e.intersectEdge(cellEdges[j]);
                if (inter != undefined) {
                    let interNode = this.getNodeAtPos(inter);
                    if (interNode == undefined) {
                        interNode = new Node(inter, this.nCounter);
                        this.sortNode(interNode);
                    }
                    if (interNode.distanceFrom(e.endpoint1) < 1 || interNode.id == nodeId) {
                        continue;
                    }
                    if (interNode.distanceFrom(e.endpoint1) < closestMidDistance) {
                        closestMid = interNode;
                        closestMidDistance = interNode.distanceFrom(e.endpoint1);
                    }
                }
            }
        }
        if (closestMid != undefined) {
            if (!this.vec2Equality(closestMid.getPosition(), e.endpoint2) && closestMidDistance > 1) {
                vec2.copy(e.endpoint2, closestMid.getPosition());
                e.setExpandable(false);
            }
        }
        if (e.highway) {
            return e.getLength() > this.hSegLength / 8;
        }
        return e.getLength() > Math.min(this.gridWidth, this.gridLength) / 3;
    }
    // Try to extend this to be as long as possible, until
    // it reaches another grid road. If it cannot be extended
    // to reach another road, just continue to expand with original
    // length.
    adjustForLength(e) {
        if (this.getNodeAtPos(e.endpoint2) != undefined) {
            return;
        }
        let extendRadius = this.gridLength * 1.5;
        let tempEndpt = vec2.fromValues(e.endpoint2[0], e.endpoint2[1]);
        let tempEndpt2 = vec2.create();
        vec2.scale(tempEndpt2, e.getDirectionVector(), extendRadius);
        vec2.add(tempEndpt2, tempEndpt2, tempEndpt);
        // create a dummy edge
        let tempEdge = new Edge(tempEndpt, tempEndpt2, -1, false);
        if (!this.fixForBounds(tempEdge) && !this.fixForWater(tempEdge)) {
            return;
        }
        let danglingEdge = this.adjustForIntersection(tempEdge);
        //danglingEdge = danglingEdge && this.adjustForEnd(tempEdge);
        if (!danglingEdge) {
            vec2.copy(e.endpoint2, tempEndpt2);
        }
    }
    // Search for the Node closest to the new endpoint;
    // if it falls within a small radius, snap
    // the edge to that node.
    adjustForEnd(e) {
        if (this.getNodeAtPos(e.endpoint2) != undefined) {
            return true;
        }
        let edgeDir = e.getDirectionVector();
        let endCellCoords = vec2.fromValues(this.getPosRowNumber(e.endpoint2), this.getPosColNumber(e.endpoint2));
        let closestEnd = undefined;
        let closestEndDistance = Math.max(this.citySize[0], this.citySize[1]);
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let currCellNum = this.getCellNumberFromRowCol(endCellCoords[0] + j, endCellCoords[1] + i);
                if (currCellNum == undefined) {
                    continue;
                }
                for (let i = 0; i < this.ncells[currCellNum].length; i++) {
                    let currNode = this.ncells[currCellNum][i];
                    if (currNode.distanceFrom(e.endpoint2) < closestEndDistance) {
                        closestEnd = currNode;
                        closestEndDistance = currNode.distanceFrom(e.endpoint2);
                    }
                }
            }
        }
        let threshold = (this.gridLength + this.gridWidth) / 2;
        if (e.highway) {
            threshold = this.hSegLength / 6;
        }
        if (closestEnd != undefined) {
            if (!this.vec2Equality(closestEnd.getPosition(), e.endpoint1)
                && closestEndDistance < threshold) {
                vec2.copy(e.endpoint2, closestEnd.getPosition());
                e.setExpandable(false);
            }
        }
        if (e.highway) {
            return e.getLength() > this.hSegLength / 8;
        }
        return e.getLength() > Math.min(this.gridWidth, this.gridLength) / 2;
    }
    fixForNearbyRoads(e) {
        let valid = this.adjustForIntersection(e) && this.adjustForEnd(e);
        if (e.expandable) {
            this.adjustForLength(e);
        }
        return valid;
    }
}
//# sourceMappingURL=RoadGenerator.js.map