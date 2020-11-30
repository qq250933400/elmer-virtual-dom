import * as chai from "chai";
import "mocha";
import { HtmlParse, VirtualElement, VirtualElementsDiff, VirtualRender } from "../../src";

const htmlParse = new HtmlParse();
const virtualElement = new VirtualElement();
const virtualRender = new VirtualRender(virtualElement);
const virtualDiff = new VirtualElementsDiff(virtualElement);
const htmlCode = `<div>
    <span key="form">{{title}}</span>
    <button em:for="let item in this.buttons">{{item.title}}</button>
    <a if="{{visible}}">Exit</a>
</div>`;
const virtualDoms = htmlParse.parse(htmlCode);
describe("旧版本diff算法模块测试", () => {
    it("第一次渲染diff运算", () => {
        virtualRender.render(virtualDoms, null, {
            title: "demo",
            buttons: [
                {title: "AA", value: 2},
                {title: "BB", value: 3}
            ]
        });
        virtualDiff.diff(virtualDoms, virtualElement.create("div"));
        chai.assert.strictEqual(virtualDoms.children[0].children[0].innerHTML as any, "demo");
    });
    it("第一次渲染diff运算", () => {
        virtualRender.render(virtualDoms, null, {
            title: "demo",
            buttons: [
                {title: "AA", value: 2},
                {title: "BB", value: 3}
            ],
            visible: false
        });
        const newVirtualDom = htmlParse.parse(htmlCode);
        virtualRender.render(newVirtualDom, null, {
            title: "demo1",
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
});
