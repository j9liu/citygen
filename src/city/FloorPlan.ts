import {vec2, vec3, vec4, mat3, mat4} from 'gl-matrix';

export enum Shape {
	SQUARE = 4,
	HEX = 6
};

export enum CaseFlag {
	DEFAULT = 0,
	SPECIAL_1 = 1,
	SPECIAL_2 = 2
}

export default class FloorPlan {
	public shapes : Array<Shape>;
	public transformations: Array<mat4>;

	//This array tracks which shapes are different from the others for aesthetic purposes,
	// such as colored columns.
	public specialCasesShapes: Array<CaseFlag>;
	public specialCasesShapesCount: Array<number>;

	constructor() {
		this.shapes = [];
		this.transformations = [];
		this.specialCasesShapes = [];
		this.specialCasesShapesCount = [0, 0];
	}
};