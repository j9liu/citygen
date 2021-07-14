import { vec2, vec3, vec4 } from 'gl-matrix';
import CityGenerator from './city/CityGenerator';
import Cube from './geometry/Cube';
import HexagonalPrism from './geometry/HexagonalPrism';
// Test for structural equality of arrays
function arrayEquality(a, b) {
    if (a == null || b == null) {
        return false;
    }
    if (a.length != b.length) {
        return false;
    }
    let sortedA = a.sort((n1, n2) => n1 - n2);
    let sortedB = b.sort((n1, n2) => n1 - n2);
    for (var i = 0; i < a.length; ++i) {
        if (sortedA[i] !== sortedB[i]) {
            return false;
        }
    }
    return true;
}
// Test for equality of arrays of vec2, with a certain order
function arrayVec2Equality(a, b) {
    if (a == null || b == null) {
        return false;
    }
    if (a.length != b.length) {
        return false;
    }
    for (var i = 0; i < a.length; ++i) {
        if (!vec2.equals(a[i], b[i])) {
            return false;
        }
    }
    return true;
}
export function testCityGenerator() {
    // 8 x 4 grid of cells 64 units wide
    let cg = new CityGenerator(vec2.fromValues(512, 256), vec2.fromValues(8, 4));
    cg.reset();
    function testGetXYFromCellNumber() {
        let cellCoords6 = cg.getXYFromCellNumber(6), cellCoords24 = cg.getXYFromCellNumber(24), cellCoords19 = cg.getXYFromCellNumber(19), cellCoords15 = cg.getXYFromCellNumber(15);
        let t = vec2.equals(cellCoords6, vec2.fromValues(6, 0)), t2 = vec2.equals(cellCoords24, vec2.fromValues(0, 3)), t3 = vec2.equals(cellCoords19, vec2.fromValues(3, 2)), t4 = vec2.equals(cellCoords15, vec2.fromValues(7, 1));
        if (t && t2 && t3 && t4) {
            console.log("City Generator Get XY From Cell Number Test: passed!");
        }
        else {
            console.log("City Generator Get XY From Cell Number Test: failed.", t, t2, t3, t4);
        }
    }
    function testGetCellNumberFromXY() {
        let xy03 = cg.getCellNumberFromXY(0, 3), xy60 = cg.getCellNumberFromXY(6, 0), xy22 = cg.getCellNumberFromXY(2, 2);
        let t = xy03 == 24, t2 = xy60 == 6, t3 = xy22 == 18;
        if (t && t2 && t3) {
            console.log("City Generator Get Cell Number From XY Test: passed!");
        }
        else {
            console.log("City Generator Get Cell Number From XY Test: failed.", t, t2, t3);
        }
    }
    function testGetMidpointOfCell() {
        let midpoint2 = cg.getMidpointOfCell(2), midpoint23 = cg.getMidpointOfCell(23), midpoint28 = cg.getMidpointOfCell(28), midpoint9 = cg.getMidpointOfCell(9);
        let t = vec2.equals(midpoint2, vec2.fromValues(160, 32)), t2 = vec2.equals(midpoint23, vec2.fromValues(480, 160)), t3 = vec2.equals(midpoint28, vec2.fromValues(288, 224)), t4 = vec2.equals(midpoint9, vec2.fromValues(96, 96));
        if (t && t2 && t3 && t4) {
            console.log("City Generator Get Midpoint Of Cell Test: passed!");
        }
        else {
            console.log("City Generator Get Midpoint Of Cell Test: failed.", t, t2, t3, t4);
        }
    }
    function testGetCornersOfCell() {
        let corners4 = cg.getCornersOfCell(4), corners16 = cg.getCornersOfCell(16), corners13 = cg.getCornersOfCell(13), corners29 = cg.getCornersOfCell(29);
        let correct4 = [vec2.fromValues(256, 0),
            vec2.fromValues(320, 64)], correct16 = [vec2.fromValues(0, 128),
            vec2.fromValues(64, 192)], correct13 = [vec2.fromValues(320, 64),
            vec2.fromValues(384, 128)], correct29 = [vec2.fromValues(320, 192),
            vec2.fromValues(384, 256)];
        let t = arrayVec2Equality(corners4, correct4), t2 = arrayVec2Equality(corners16, correct16), t3 = arrayVec2Equality(corners13, correct13), t4 = arrayVec2Equality(corners29, correct29);
        if (t && t2 && t3 && t4) {
            console.log("City Generator Get Corners Of Cell Test: passed!");
        }
        else {
            console.log("City Generator Get Corners Of Cell Test: failed.", t, t2, t3, t4);
        }
    }
    function testGetNeighborsOfCell() {
        let neighbors24 = cg.getNeighborsOfCell(24), neighbors8 = cg.getNeighborsOfCell(8), neighbors5 = cg.getNeighborsOfCell(5), neighbors31 = cg.getNeighborsOfCell(31), neighbors11 = cg.getNeighborsOfCell(11);
        let correct24 = [16, 17, 25], correct8 = [0, 1, 9, 16, 17], correct5 = [4, 6, 12, 13, 14], correct31 = [22, 23, 30], correct11 = [2, 3, 4, 10, 12, 18, 19, 20];
        let t = arrayEquality(neighbors24, correct24), t2 = arrayEquality(neighbors8, correct8), t3 = arrayEquality(neighbors5, correct5), t4 = arrayEquality(neighbors31, correct31), t5 = arrayEquality(neighbors11, correct11);
        if (t && t2 && t3 && t4 && t5) {
            console.log("City Generator Get Neighbors Of Cell Test: passed!");
        }
        else {
            console.log("City Generator Get Neighbors Of Cell Test: failed.", t, t2, t3, t4, t5);
        }
    }
    function testGetVec4PositionAtIndexFromShape() {
        let cube = new Cube(vec3.fromValues(0, 0, 0));
        let hex = new HexagonalPrism(vec3.fromValues(0, 0, 0));
        cube.create();
        hex.create();
        let cubePosAt0 = cg.getVec4PositionAtIndexFromShape(cube, 0), cubePosAt3 = cg.getVec4PositionAtIndexFromShape(cube, 3), cubePosAt23 = cg.getVec4PositionAtIndexFromShape(cube, 23);
        let hexPosAt7 = cg.getVec4PositionAtIndexFromShape(hex, 7), hexPosAt17 = cg.getVec4PositionAtIndexFromShape(hex, 17), hexPosAt35 = cg.getVec4PositionAtIndexFromShape(hex, 35);
        let correctCPosAt0 = vec4.fromValues(-.5, -.5, -.5, 1), correctCPosAt3 = vec4.fromValues(-.5, .5, -.5, 1), correctCPosAt23 = vec4.fromValues(.5, .5, -.5, 1);
        let correctHPosAt7 = vec4.fromValues(0.25, -0.5, 0.25 * Math.sqrt(3), 1), correctHPosAt17 = vec4.fromValues(0.25, -0.5, 0.25 * Math.sqrt(3), 1), correctHPosAt35 = vec4.fromValues(0.5, 0.5, 0, 1);
        let t = vec4.equals(cubePosAt0, correctCPosAt0), t2 = vec4.equals(cubePosAt3, correctCPosAt3), t3 = vec4.equals(cubePosAt23, correctCPosAt23), t4 = vec4.equals(hexPosAt7, correctHPosAt7), t5 = vec4.equals(hexPosAt17, correctHPosAt17), t6 = vec4.equals(hexPosAt35, correctHPosAt35);
        if (t && t2 && t3 && t4 && t5 && t6) {
            console.log("City Generator Get Vec4 Position At Index From Shape: passed!");
        }
        else {
            console.log("City Generator GGet Vec4 Position At Index From Shape: failed.", t, t2, t3, t4, t5, t6);
        }
    }
    testGetXYFromCellNumber();
    testGetCellNumberFromXY();
    testGetMidpointOfCell();
    testGetCornersOfCell();
    testGetNeighborsOfCell();
    testGetVec4PositionAtIndexFromShape();
}
//# sourceMappingURL=test.js.map