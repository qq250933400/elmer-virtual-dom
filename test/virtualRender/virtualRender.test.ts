import * as chai from "chai";
import "mocha";
import { HtmlParse, VirtualNode, VirtualRender } from "../../src";

const htmlParse = new HtmlParse();
const virtualElement = new VirtualNode();
const virtualRender = new VirtualRender(virtualElement);

describe("虚拟dom渲染测试", () => {
    describe("html代码解析", () => {
        it("验证html代码解析结果", () => {
            const testCode = `<!DOCTYPE ><span data-value='ma\\'p' data-id='dd' data-type="te\\"st">hello</span><!--for comment --><a/>`;
            const vdom = htmlParse.parse(testCode);
            chai.assert.equal(vdom.children[1].tagName, "span");
        });
    });
    describe("渲染dom树", () => {
        it("列表渲染: forEach标签", ()=> {
            const testCode = `<ul><forEach data="{{listData}}" item="myData" index="myIndex"><li key="test">{{myIndex}} hello {{myData.title}}</li></forEach></ul>`;
            const testData = {
                listData: [
                    {title: "A", value: 1},
                    {title: "B", value: 2}
                ]
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.equal(vdom.children[0].children.length, 2);
            chai.assert.equal(vdom.children[0].children[1].innerHTML, "1 hello B");
        });
        it("列表渲染: em:for属性", ()=> {
            const testCode = `<ul><li em:for="let myData in this.listData" key="formItem">{{myData.key}} hello {{myData.title}}</li></ul>`;
            const testData = {
                listData: [
                    {title: "A", value: 1},
                    {title: "B", value: 2}
                ]
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.equal(vdom.children[0].children.length, 2);
            chai.assert.equal(vdom.children[0].children[1].innerHTML, "1 hello B");
        });
        it("渲染静态文本内容", ()=> {
            const testCode = `<span>hello {{title}}</span>`;
            const testData = {
                title: "world"
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.equal(vdom.children[0].children[0].innerHTML, "hello world");
        });
        it("方法绑定调用", () => {
            const testCode = `<label>{{sumApply(testA,testB)}}</label>`;
            const testData = {
                testA: 100,
                testB: 200,
                // tslint:disable-next-line: object-literal-sort-keys
                sumApply: (a, b) => {
                    return a + b;
                }
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual<any>(vdom.children[0].innerHTML, "300");
        });
        it("带默认值绑定渲染，绑定结果为undefined或者null时返回默认值, {{title|'default'}}", () => {
            const testCode = `<label>{{title|'default'}}</label>`;
            const testData = {};
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.equal(vdom.children[0].innerHTML, "default");
        });
        it("带默认值绑定渲染，绑定结果为undefined或者null时返回默认值, {{title|true}}", () => {
            const testCode = `<label>{{title|true}}</label>`;
            const testData = {};
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual<string>(vdom.children[0].innerHTML as any, "true");
        });
        it("带默认值绑定渲染，绑定结果为undefined或者null时返回默认值, {{title|level}}", () => {
            const testCode = `<label>{{title|level}}</label>`;
            const testData = {
                level: 2
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual<string>(vdom.children[0].innerHTML as any, "2");
        });
        it("Lambda表达式绑定值, {{level eq 2 ? 'true': 'false'}}", () => {
            const testCode = `<label>{{level eq 2 ? 'true': 'false'}}</label>`;
            const testData = {
                level: 2
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual<string>(vdom.children[0].innerHTML as any, "true");
        });
        it("逻辑判断绑定, {{level / 2 eq 1 && level % 2 eq 0}}", () => {
            const testCode = `<label checked="{{level / 2 eq 1 && level % 2 eq 0}}">逻辑绑定</label>`;
            const testData = {
                level: 2
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual<boolean>(vdom.children[0].props["checked"], true);
        });
        it("跨层级的innerHTML更新, <label><span>A{{level}}</span></label>", () => {
            const vdom = htmlParse.parse(`<label><span>A{{level}}</span></label>`);
            const vdomRender = virtualRender.render(vdom, null, {level:2});
            chai.assert.strictEqual(vdomRender.children[0].innerHTML, "<span >A2</span>");
        });
    });
    describe("事件渲染测试", () => {
        it("单击事件测试", () => {
            const testCode = `<label et:click="onClick">逻辑绑定</label>`;
            const testData = {
                level: 2,
                onClick(): void {
                    // tslint:disable-next-line: no-console
                    console.log("logicEvent");
                }
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual<string>(typeof vdom.children[0].events["click"], "function");
        });
    });
    describe("em:属性标签测试", () => {
        it("em:for属性测试, 旧版本列表循环渲染", () => {
            const testCode = "<label em:for='let item in this.listData' key='letFor'>测试{{item.title}}</label>";
            const testData = {
                level: 2,
                listData: []
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual(vdom.children[0].status, "DELETE");
        });
        it("非em:for属性测试", () => {
            const testCode = "<label em:active='level % 2 eq 0' em:level='level'>测试{{item.title}}</label>";
            const testData = {
                level: 2
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual(vdom.children[0].props.active, true);
            chai.assert.strictEqual(vdom.children[0].props.level, 2);
        });
        it("非em:for属性测试,绑定方法", () => {
            const testCode = "<label em:test='demoCallback'>测试{{item.title}}</label>";
            const testData = {
                demoCallback: (a,b):any => {
                    return a + b / 10;
                }
            };
            let vdom = htmlParse.parse(testCode);
            vdom = virtualRender.render(vdom, null, testData);
            chai.assert.strictEqual(typeof vdom.children[0].props.test, "function");
        });
        it("渲染前事件监听", (done) => {
            const testCode = "<label em:test='demoCallback'>测试{{item.title}}</label>";
            const vdom = htmlParse.parse(testCode);
            const ssid = virtualRender.guid();
            const descCallback = virtualRender.on(ssid, "onBeforeRender", () => {
                done();
            });
            virtualRender.render(vdom, null, {}, {
                sessionId: ssid
            });
            descCallback();
        });
        it("If属性渲染", () => {
            const testCode = "<label if='{{visible}}'>测试{{item.title}}</label>";
            const vdom = htmlParse.parse(testCode);
            const ssid = virtualRender.guid();
            const newDom = virtualRender.render(vdom, null, {
                visible: false
            });
            const newDom2 = virtualRender.render(vdom, null, {
                visible: true
            });
            chai.assert.deepEqual(newDom.children[0].status, "DELETE");
            chai.assert.deepEqual(newDom2.children[0].status, "APPEND");
        });
    });
    describe("forEach标签循环渲染", () => {
        const htmlCode = `<forEach data="listData" item="item"><button key="{{item.id}}">Hello{{item.value}}</button></forEach>`;
        const listData = [
            { id: "2233", value: "NewValue1", title: "Hello world1" }, 
            { id: "2234", value: "NewValue2", title: "Hello world2" },
            { id: "2235", value: "NewValue3", title: "Hello world3" },
            { id: "2236", value: "NewValue4", title: "Hello world4" }
        ];
        const vdom = htmlParse.parse(htmlCode);
        it("简单列表渲染", () => {
            const newDom = virtualRender.render(vdom, null, {listData});
            chai.assert.equal(newDom.children.length, 4);
            chai.assert.equal(newDom.children[1].innerHTML, "HelloNewValue2");
        });
        it("删除第二项，diff运算以后status应该是DELETE", () => {
            const newDom = virtualRender.render(vdom, null, {listData});
            const newListData = [
                { id: "2233", value: "NewValue1", title: "Hello world1" }, 
                { id: "2235", value: "NewValue3", title: "Hello world3" },
                { id: "2236", value: "NewValue4", title: "Hello world4" }
            ];
            const diffDom = virtualRender.render(vdom, newDom, {listData: newListData});
            chai.assert.equal(diffDom.deleteElements[0].status, "DELETE");
        });
    });
});
