import * as chai from "chai";
import "mocha";
import { HtmlParse, VirtualElement, VirtualRender, VirtualRenderDiff } from "../../src";

const htmlParse = new HtmlParse();
const virtualElement = new VirtualElement();
const virtualRender = new VirtualRender(virtualElement);

describe("2.0版本diff算法测试", () => {
    describe("相同结构属性不同", () => {
        it("两个按钮的diff运算", () => {
            const htmlCode = `<button data-value="{{demoVersion}}" data-tag="{{obj}}">demo{{time}}</button>`;
            const testData = {
                demoVersion: 1,
                time: (new Date()).getTime().toString(),
                obj: {
                    v:1
                }
            };
            const vDom = htmlParse.parse(htmlCode);
            const vDom1 = virtualRender.render(vDom, null, testData);
            testData.demoVersion = 2;
            testData.time = testData.time + "_2";
            const vDom2 = virtualRender.render(vDom, vDom1, testData);
            chai.assert.strictEqual(vDom2.children[0].status, "UPDATE");
            chai.assert.strictEqual(vDom2.children[0].changeAttrs["data-value"], 2);
        });
        it("不同if属性，旧if属性为false，新if属性为true, diff结果status应为APPEND", () => {
            const htmlCode = `<button if="{{visible}}" event='point' zip="7z" batch="region" class="app" >demo</button>`;
            const vDom = htmlParse.parse(htmlCode);
            const vODom = virtualRender.render(vDom, null, {visible: false});
            const vNDom = virtualRender.render(vDom, vODom, {visible: true});
            chai.assert.strictEqual(vNDom.children[0].status, "APPEND");
        });
        it("不同if属性，旧if属性为true，新if属性为false, diff结果status应为DELETE", () => {
            const htmlCode = `<button if="{{visible}}" batch="region" class="app" event='point'>demo</button>`;
            const vDom = htmlParse.parse(htmlCode);
            const vODom = virtualRender.render(vDom, null, {visible: true});
            const vNDom = virtualRender.render(vDom, vODom, {visible: false});
            chai.assert.strictEqual(vNDom.children[0].status, "DELETE");
        });
        it("插入新节点测试", () => {
            const code1 = `<div data-id='haha'><label em:for="let item in this.listData" key="doForR_{{item.key}}">{{item.title}}</label></div>`;
            const code2 = `<div data-id='haha'><button et:a="testA" data-num="2332" data-tag="app map">Hello</button><label em:for="let item in this.listData" data-value="{{item.value}}" key="doForR_{{item.key}}">{{item.title}}</label></div>`;
            const vDom1 = htmlParse.parse(code1);
            const vDom2 = htmlParse.parse(code2);
            const testData = {
                testA: () => {},
                // tslint:disable-next-line: object-literal-sort-keys
                listData: [
                    {title: "AA",value: "11"},
                    {title: "BB",value: "22"},
                    {title: "BB",value: "33"},
                ]
            };
            const vDomDiff1 = virtualRender.render(vDom1, null, testData);
            const vDomDiff2 = virtualRender.render(vDom2, vDomDiff1, testData);
            chai.assert.strictEqual(vDomDiff2.children[0].children[0].tagName, "button");
            chai.assert.strictEqual(vDomDiff2.children[0].children[0].status, "APPEND");
            chai.assert.strictEqual(vDomDiff2.children[0].children[1].status, "NORMAL");
        });
        it("删除节点操作,旧的dom节点在新的dom树种不存在的时候", () => {
            const testCode1 = `<button>Hello world</button><i class='demo'/><label>DEMO</label>`;
            const testCode2 = `<button>Hello world</button><label>DEMO</label>`;
            const vDom1 = htmlParse.parse(testCode1);
            const vDom2 = htmlParse.parse(testCode2);
            const vDomDiff1 = virtualRender.render(vDom1, null, {});
            const vDomDiff2 = virtualRender.render(vDom2, vDomDiff1, {help:true});
            chai.assert.strictEqual(vDomDiff2.deleteElements.length, 1);
            chai.assert.strictEqual(vDomDiff2.deleteElements[0].tagName, "i");
        });
        it("对比两个属性值为object的节点", () => {
            const testCode1 = `<button data-value="{{info}}">Hello world</button><label>DEMO</label>`;
            const testCode2 = `<button data-value="{{info}}">Hello world</button><label>DEMO</label>`;
            const vDom1 = htmlParse.parse(testCode1);
            const vDom2 = htmlParse.parse(testCode2);
            const vDomDiff1 = virtualRender.render(vDom1, null, {info: {title: "App"}});
            const vDomDiff2 = virtualRender.render(vDom2, vDomDiff1, {info: {title: "App1"}});
            chai.assert.strictEqual(typeof vDomDiff2.children[0].changeAttrs["data-value"], "object");
            chai.assert.strictEqual(vDomDiff2.children[0].changeAttrs["data-value"]["title"], "App1");
        });
        it("对比相同节点在不同位置的情况", () => {
            const testCode1 = `<button data-value="{{info}}">Hello world</button><label test='l'>DEMO</label><i for="demoApp">APP</i>`;
            const testCode2 = `<label>DEMO</label><i for="demoApp">APP</i><button data-value="{{info}}">Hello world</button>`;
            const vDom1 = htmlParse.parse(testCode1);
            const vDom2 = htmlParse.parse(testCode2);
            const vDomDiff1 = virtualRender.render(vDom1, null, {info: {title: "App"}});
            const vDomDiff2 = virtualRender.render(vDom2, vDomDiff1, {info: {title: "App1"}, help: true});
            chai.assert.strictEqual(vDomDiff2.children[0].status, "UPDATE");
            chai.assert.strictEqual(vDomDiff2.children[2].status, "MOVEUPDATE");
            chai.assert.strictEqual(vDomDiff2.children[1].status, "NORMAL");
            chai.assert.strictEqual(vDomDiff2.children[0].deleteAttrs.length, 1);
        });
    });
});
