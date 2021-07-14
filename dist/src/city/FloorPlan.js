export var Shape;
(function (Shape) {
    Shape[Shape["SQUARE"] = 4] = "SQUARE";
    Shape[Shape["HEX"] = 6] = "HEX";
})(Shape || (Shape = {}));
;
export var CaseFlag;
(function (CaseFlag) {
    CaseFlag[CaseFlag["DEFAULT"] = 0] = "DEFAULT";
    CaseFlag[CaseFlag["SPECIAL_1"] = 1] = "SPECIAL_1";
    CaseFlag[CaseFlag["SPECIAL_2"] = 2] = "SPECIAL_2";
})(CaseFlag || (CaseFlag = {}));
export default class FloorPlan {
    constructor() {
        this.shapes = [];
        this.transformations = [];
        this.specialCasesShapes = [];
        this.specialCasesShapesCount = [0, 0];
    }
}
;
//# sourceMappingURL=FloorPlan.js.map