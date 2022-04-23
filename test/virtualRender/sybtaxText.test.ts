import * as chai from "chai";
import "mocha";
import { HtmlParse } from "../../src/parse/HtmlParse";
import { SyntaxText } from "../../src/RenderingSyntax";

const htmlParse = new HtmlParse();
const st = new SyntaxText();
const demoData = {
    title: "example",
    lm: 4,
    color: "red",
    text: "Empty",
    visible: true
};

describe("数据绑定渲染", () => {
    it("双引号文本引用读取, \"App\"-cc\"Undefined\"", () => {
        const varStr = st.readVarString(`"App"-cc"Undefined"`);
        chai.assert.strictEqual<string>(varStr.var, "App");
    });
    it("单引号文本引用读取, 'App'-cc'Undefined'", () => {
        const varStr = st.readVarString(`'App'-cc'Undefined'`);
        chai.assert.strictEqual<string>(varStr.var, "App");
    });
    it("静态数据绑定", () => {
        const mResult = st.render({
            component: demoData,
            data: null,
            target: "{{title}}",
            vdom: {
                tagName: "Test",
                "children": [],
                "props": {},
                "events": {},
                path: [0],
                "status": "NORMAL"
            }
        });
        chai.assert.strictEqual(mResult.result, "example");
    });
    it("Lambda绑定测试", () => {
        const rResult = st.runLimitScript("lm % 2 eq 0 ? color : text", demoData, {});
        chai.assert.equal(rResult, "red");
    });
    it("数学运算", () => {
        const rResult = st.runLimitScript("lm % 6 + 100 ", demoData, {});
        chai.assert.equal(rResult, 104);
    });
    it("If属性绑定测试", () => {
        const vdom = htmlParse.parse("<About if='{{visible}}'/>");
        const vResult = st.render({
            component: demoData,
            vdom,
            target: "{{visible}}",
            data: null
        });
        chai.assert.deepEqual<boolean>(vResult.result as any, true);
    });
});
