import * as chai from "chai";
import "mocha";
import { HtmlParse } from "../src/parse/HtmlParse";

describe("typescript unit test", () => {
    it("do some test", () => {
        const parse = new HtmlParse();
        const code = parse.parse("<span>AA</span>");
        chai.assert.equal(code.children[0].children.length ,1);
    });
    it("Array.concat test", () => {
        const parse = new HtmlParse();
        const testA = [1,2,3,4], testB = ["a","b","c", "d"];
        const testC = parse.mergeArray(testA, testB);
        chai.assert.equal(testC.length, 8);
    });
});
