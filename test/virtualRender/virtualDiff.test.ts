import * as chai from "chai";
import "mocha";
import { HtmlParse, VirtualElement, VirtualElementsDiff, VirtualRender, VirtualRenderDiff } from "../../src";

const htmlParse = new HtmlParse();
const virtualElement = new VirtualElement();
const virtualRender = new VirtualRender(virtualElement);
const virtualDiff = new VirtualElementsDiff(virtualElement);
const htmlCode = `<div>
    <span key="form">{{title}}</span>
    <button em:for="let item in this.buttons" key="form-{{item.key}}">{{item.title}}</button>
    <a if="{{visible}}">Exit</a>
</div>`;
const virtualDoms = htmlParse.parse(htmlCode);
const diffObj = new VirtualRenderDiff();
describe("旧版本diff算法模块测试", () => {
    it("第一次渲染diff运算", () => {
        const testDom = virtualRender.render(virtualDoms, null, {
            title: "demo",
            // tslint:disable-next-line: object-literal-sort-keys
            buttons: [
                {title: "AA", value: 2},
                {title: "BB", value: 3}
            ]
        });
        virtualDiff.diff(testDom, virtualElement.create("div"));
        chai.assert.strictEqual(testDom.children[0].children[0].innerHTML as any, "demo");
    });
    it("字符串相似度计算, hello world - hellow world", () => {
        chai.assert.equal(diffObj.similar("hello world", "hellow world") === 1, false);
    });
    it("字符串相似度计算, hello world - hello world", () => {
        chai.assert.equal(diffObj.similar("hello world", "hellow world"), 0.917);
    });
    it("第一次渲染diff运算", () => {
        const testDom = virtualRender.render(virtualDoms, null, {
            title: "demo",
            // tslint:disable-next-line: object-literal-sort-keys
            buttons: [
                {title: "AA", value: 2},
                {title: "BB", value: 3}
            ],
            visible: false
        });
        const newVirtualDom = virtualRender.render(virtualDoms, testDom, {
            title: "demo1",
            // tslint:disable-next-line: object-literal-sort-keys
            buttons: [
                {title: "CC", value: 2},
                {title: "DD", value: 3}
            ],
            visible: true
        });
        const newInput = virtualElement.create("input");
        virtualElement.init(newVirtualDom);
        virtualElement.append(newInput);
        virtualElement.appendAt(newInput, 1);
        virtualDiff.diff(newVirtualDom, virtualDoms);
        chai.assert.strictEqual(newVirtualDom.children[0].children[0].children[0].status as any, "UPDATE");
    });
    it("设置key属性的diff运算", () => {
        const testCode = `<div><button key='app1'>Append</button><button key='app2'>Append{{appTitle}}</button><button>Append{{appTitle}}</button></div>`;
        const vDom = htmlParse.parse(testCode);
        const oldDom = virtualRender.render(vDom, null, {
            appTitle: "app2"
        });
        const newDom = virtualRender.render(vDom, null, {
            appTitle: "app3"
        });
        virtualDiff.diff(newDom, oldDom);
        chai.assert.strictEqual(newDom.children[0].children[1].children[0].status, "UPDATE");
    });
    it("新dom节点没有子节点", () => {
        const testCode = `<div if="{{visible}}"><button key='app1'>Append</button><button>Append{{appTitle}}</button></div>`;
        const testNewCode = "<div if=\"{{visible}}\"/>";
        const vDom = htmlParse.parse(testCode);
        const vNDom = htmlParse.parse(testNewCode);
        const oldDom = virtualRender.render(vDom, null, {
            appTitle: "app2",
            visible: false
        });
        const newDom = virtualRender.render(vNDom, null, {
            appTitle: "app3",
            visible: true
        });
        virtualDiff.diff(newDom, oldDom);
        chai.assert.strictEqual(newDom.children[0].children[1], undefined);
    });
});
