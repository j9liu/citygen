import {vec2, vec3, vec4, mat3} from 'gl-matrix';
import CityGenerator from './city/CityGenerator';

// Test for structural equality of arrays
function arrayEquality(a: Array<number>, b: Array<number>) : boolean {
	if (a == null || b == null) { return false; }
  	if (a.length != b.length) { return false; }

  	let sortedA : Array<number> = a.sort((n1, n2) => n1 - n2);
  	let sortedB : Array<number> = b.sort((n1, n2) => n1 - n2);

	for (var i = 0; i < a.length; ++i) {
		if (sortedA[i] !== sortedB[i]) {
			return false;
		}
	}

	return true;
}

// Test for equality of arrays of vec2, with a certain order
function arrayVec2Equality(a: Array<vec2>, b: Array<vec2>) : boolean {
	if (a == null || b == null) { return false; }
  	if (a.length != b.length) { return false; }

  	for (var i = 0; i < a.length; ++i) {
		if (!vec2.equals(a[i], b[i])) {
			return false;
		}
	}

	return true;
}

export function testCityGenerator() {
	// 8 x 4 grid of cells 64 units wide
	let cg : CityGenerator = new CityGenerator(vec2.fromValues(512, 256), vec2.fromValues(8, 4));
	cg.reset();

	function testGetRowColFromCellNumber() {
		let cellCoords6  : vec2 = cg.getRowColFromCellNumber(6),
		    cellCoords24 : vec2 = cg.getRowColFromCellNumber(24),
		    cellCoords19 : vec2 = cg.getRowColFromCellNumber(19);

		let t  : boolean = vec2.equals(cellCoords6, vec2.fromValues(6, 0)),
			t2 : boolean = vec2.equals(cellCoords24, vec2.fromValues(0, 3)),
			t3 : boolean = vec2.equals(cellCoords19, vec2.fromValues(3, 2));

		if(t && t2 && t3) {
			console.log("City Generator Get Row Col From Cell Number Test: passed!");
		} else {
			console.log("City Generator Get Row Col From Cell Number Test: failed.", t, t2, t3);
		}
	}

	function testGetMidpointOfCell() {
		let midpoint2  : vec2 = cg.getMidpointOfCell(2),
		    midpoint23 : vec2 = cg.getMidpointOfCell(23),
		    midpoint28 : vec2 = cg.getMidpointOfCell(28),
		    midpoint9  : vec2 = cg.getMidpointOfCell(9);

		let t  : boolean = vec2.equals(midpoint2, vec2.fromValues(160, 32)),
			t2 : boolean = vec2.equals(midpoint23, vec2.fromValues(480, 160)),
			t3 : boolean = vec2.equals(midpoint28, vec2.fromValues(288, 224)),
			t4 : boolean = vec2.equals(midpoint9, vec2.fromValues(96, 96));

		if(t && t2 && t3 && t4) {
			console.log("City Generator Get Midpoint Of Cell Test: passed!");
		} else {
			console.log("City Generator Get Midpoint Of Cell Test: failed.", t, t2, t3, t4);
		}
	}

	function testGetCornersOfCell() {
		let corners4  : Array<vec2> = cg.getCornersOfCell(4),
			corners16 : Array<vec2> = cg.getCornersOfCell(16),
			corners13 : Array<vec2> = cg.getCornersOfCell(13),
			corners29 : Array<vec2> = cg.getCornersOfCell(29);

		let correct4  : Array<vec2> = [vec2.fromValues(256, 0),
									   vec2.fromValues(320, 64)],
			correct16 : Array<vec2> = [vec2.fromValues(0, 128),
									   vec2.fromValues(64, 192)],
			correct13 : Array<vec2> = [vec2.fromValues(320, 64),
									   vec2.fromValues(384, 128)],
			correct29 : Array<vec2> = [vec2.fromValues(320, 192),
									   vec2.fromValues(384, 256)]

	    let t  : boolean = arrayVec2Equality(corners4, correct4),
			t2 : boolean = arrayVec2Equality(corners16, correct16),
			t3 : boolean = arrayVec2Equality(corners13, correct13),
			t4 : boolean = arrayVec2Equality(corners29, correct29);

		if(t && t2 && t3 && t4) {
			console.log("City Generator Get Corners Of Cell Test: passed!");
		} else {
			console.log("City Generator Get Corners Of Cell Test: failed.", t, t2, t3, t4);
		}
	}

	testGetRowColFromCellNumber();
	testGetMidpointOfCell();
	testGetCornersOfCell();
}