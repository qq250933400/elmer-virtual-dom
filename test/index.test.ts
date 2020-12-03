import * as chai from "chai";
import "mocha";
import { HtmlParse } from "../src";

describe("typescript unit test", () => {
    it("do some test", () => {
        const parse = new HtmlParse();
        const code = parse.parse("<span>AA</span>");
        chai.assert.equal(code.children[0].children.length ,1);
    });
});
