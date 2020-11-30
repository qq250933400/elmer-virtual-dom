import * as chai from "chai";
import "mocha";
import { HtmlParse, VirtualElement } from "../../src";
import { VirtualRender } from "../../src/virtualRender";

const htmlParse = new HtmlParse();
const virtualElement = new VirtualElement();
const vDom = htmlParse.parse(`<div class="testApp"><button id="myApp">Hello world</button></div>`);
describe("虚拟dom操作测试", () => {
    it("创建新节点, create", () => {
        const newDom = virtualElement.create("a");
        chai.assert.strictEqual(newDom.tagName, "a");
    });
    it("插入新节点到目标dom, append", () => {
        const newDom = virtualElement.create("a");
        virtualElement.init(vDom.children[0]);
        virtualElement.append(newDom);
        chai.assert.strictEqual(vDom.children[0].children[1].tagName, "a");
    });
    it("插入新节点到目标dom指定位置，appendAt", () => {
        const newDom = virtualElement.create("span");
        virtualElement.init(vDom.children[0]);
        virtualElement.appendAt(newDom, 1);
        chai.assert.strictEqual(vDom.children[0].children[1].tagName, "span");
    });
    it("替换指定位置的节点, 替换一个dom，replaceAt", () => {
        const newDom = virtualElement.create("i");
        virtualElement.init(vDom.children[0]);
        virtualElement.replaceAt(newDom, 1);
        chai.assert.strictEqual(vDom.children[0].children[1].tagName, "i");
    });
    it("替换指定位置的节点, 替换一个dom数组，replaceAt", () => {
        const newDom = virtualElement.create("i");
        const secDom = virtualElement.create("b");
        virtualElement.init(vDom.children[0]);
        virtualElement.appendAt([newDom, secDom], 1);
        chai.assert.strictEqual(vDom.children[0].children[2].tagName, "b");
        chai.assert.strictEqual(vDom.children[0].children[3].tagName, "i");
    });
    it("通过className获取virtualDom元素", () => {
        virtualElement.init(vDom);
        const targetDom = virtualElement.getElementsByClassName("#myApp", vDom.children[0]);
        chai.assert.strictEqual(targetDom && targetDom.length > 0 ? targetDom[0].tagName : "", "button");
    });
    it("判断是否有改动: virtualElementHasChagne, 新版将弃用此方法", () => {
        vDom.children[0].status = "NORMAL";
        vDom.status = "NORMAL";
        chai.assert.strictEqual(virtualElement.virtualElementHasChange(vDom), true);
    });
    it("获取父元素: parent", () => {
        virtualElement.init(vDom);
        const parentDom = virtualElement.parent(vDom.children[0].children[0]);
        chai.assert.strictEqual(parentDom.tagName, "div");
    });
    it("获取前一个节点：getPrev", () => {
        virtualElement.init(vDom);
        const parentDom = virtualElement.getPrev(vDom.children[0].children[0]);
        chai.assert.strictEqual(parentDom, null);
    });
    it("获取下一个临近节点：getNext", () => {
        virtualElement.init(vDom);
        const parentDom = virtualElement.getNext(vDom.children[0].children[0]);
        chai.assert.strictEqual(parentDom.tagName, "i");
    });
    it("修改所有子元素状态", () => {
        virtualElement.init(vDom.children[0]);
        virtualElement.setChildrenStatus("UPDATE");
        chai.assert.strictEqual(vDom.children[0].children[0].status, "UPDATE");
        chai.assert.strictEqual(vDom.children[0].children[1].status, "UPDATE");
    });
    it("删除虚拟dom", () => {
        virtualElement.init(vDom.children[0]);
        virtualElement.removeAt(2);
        chai.assert.strictEqual(vDom.children[0].children.length, 4);
    });
    it("clear清空数据", () => {
        virtualElement.init(vDom);
        virtualElement.clear();
        chai.assert.strictEqual(vDom.children.length, 1);
        chai.assert.strictEqual(virtualElement.children.length, 0);
    });
    it("释放虚拟dom数据", () => {
        virtualElement.releaseDom(vDom.children[0].children[0]);
        chai.assert.strictEqual(vDom.children[0].children[0].innerHTML, undefined);
    });
    it("释放根元素", () => {
        virtualElement.init(vDom);
        virtualElement.dispose();
        chai.assert.strictEqual(virtualElement.data, null);
    });
});
