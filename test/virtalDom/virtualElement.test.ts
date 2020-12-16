import * as chai from "chai";
import "mocha";
import { HtmlParse, VirtualNode } from "../../src";

const htmlParse = new HtmlParse();
const virtualElement = new VirtualNode();
const vDom = htmlParse.parse(`<div class="testApp"><button id="myApp">Hello world</button></div>
<div class='for level2'>
    <input type='text'/><textarea>mytext</textarea>
    <!--comment tag-->
</div>`);
describe("虚拟dom操作测试", () => {
    it("读取注释节点", () => {
        const commentDom = htmlParse.parse(`<!--comments--><div>new test</div>`);
        chai.assert.strictEqual(commentDom.children[0].tagName, "<!--");
    });
    it("创建新节点, create", () => {
        const newDom = virtualElement.create("a");
        chai.assert.strictEqual(newDom.tagName, "a");
    });
    it("插入新节点到目标dom, append", () => {
        const newDom = virtualElement.create("a");
        const sessionId = virtualElement.init(vDom.children[0]);
        virtualElement.append(sessionId,newDom);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(vDom.children[0].children[1].tagName, "a");
    });
    it("插入新节点到目标dom指定位置，appendAt", () => {
        const newDom = virtualElement.create("span");
        const sessionId = virtualElement.init(vDom.children[0]);
        virtualElement.appendAt(sessionId, newDom, 1);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(vDom.children[0].children[1].tagName, "span");
    });
    it("替换指定位置的节点, 替换一个dom，replaceAt", () => {
        const newDom = virtualElement.create("i");
        const sessionId = virtualElement.init(vDom.children[0]);
        virtualElement.replaceAt(sessionId, newDom, 1);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(vDom.children[0].children[1].tagName, "i");
    });
    it("替换指定位置的节点, 替换一个dom数组，replaceAt", () => {
        const newDom = virtualElement.create("i");
        const secDom = virtualElement.create("b");
        const sessionId = virtualElement.init(vDom.children[0]);
        virtualElement.appendAt(sessionId, [newDom, secDom], 1);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(vDom.children[0].children[2].tagName, "b");
        chai.assert.strictEqual(vDom.children[0].children[3].tagName, "i");
    });
    it("获取父元素: parent", () => {
        const sessionId = virtualElement.init(vDom);
        const parentDom = virtualElement.parent(sessionId, vDom.children[0].children[0]);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(parentDom.tagName, "div");
    });
    it("获取前一个节点：getPrev", () => {
        const sessionId = virtualElement.init(vDom);
        const parentDom = virtualElement.getPrev(sessionId, vDom.children[0].children[0]);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(parentDom, null);
    });
    it("获取下一个临近节点：getNext", () => {
        const sessionId = virtualElement.init(vDom);
        const parentDom = virtualElement.getNext(sessionId, vDom.children[0].children[0]);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(parentDom.tagName, "i");
    });
    it("修改所有子元素状态", () => {
        virtualElement.changeStatus(vDom, "UPDATE");
        chai.assert.strictEqual(vDom.children[0].children[0].status, "UPDATE");
        chai.assert.strictEqual(vDom.children[0].children[1].status, "UPDATE");
    });
    it("删除虚拟dom", () => {
        const sessionId = virtualElement.init(vDom.children[0]);
        virtualElement.removeAt(sessionId, 2);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(vDom.children[0].children.length, 4);
    });
    it("删除节点", () => {
        const sessionId = virtualElement.init(vDom.children[1]);
        virtualElement.remove(sessionId, vDom.children[1].children[1]);
        chai.assert.strictEqual(vDom.children[1].children[1].tagName, "<!--");
    });
    it("clear清空数据", () => {
        const sessionId = virtualElement.init(vDom);
        virtualElement.clear(sessionId);
        chai.assert.strictEqual(vDom.children.length, 2);
        chai.assert.strictEqual(virtualElement.getNode(sessionId), undefined);
    });
});
