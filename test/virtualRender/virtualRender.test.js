var describe = require("mocha").describe;
var assert = require("assert");
var HtmlParse = require("../../lib/htmlParse").HtmlParse;
var VirtualElement = require("../../lib/virtualElement").VirtualElement;
var VirtualRender = require("../../lib/virtualRender").VirtualRender;

var htmlParse = new HtmlParse();
var virtualElement = new VirtualElement();
var virtualRender = new VirtualRender(virtualElement);

var sourceDom = htmlParse.parse(`<div><span>测试dom结构{{title}}</span>
    <ul><li em:for="let item in this.testData">{{item.title}}</li></ul>
    <div>
        <forEach data="testData" item="itemData" index="sKey">
            <button key="mapFor{{sKey}}"><span>{{itemData.title}}{{sKey}}</span><i>{{onRefresh(sKey)}}</i></button>
        </forEach>
    </div>
</div>`);
var componentData = {
    title: "demo",
    testData: [{
        title: "AA"
    },{
        title: "BB"
    }],
    onRefresh: function(sid) {
        return (new Date()).toLocaleString() + '_' + sid
    }
};
var newDom = virtualRender.render(sourceDom, null, componentData);

describe("虚拟dom渲染测试", () => {
    // console.log(JSON.stringify(newDom, null, 4));
    it("验证html代码解析结果", () => {
        assert.deepStrictEqual(sourceDom.children[0].tagName, "div");
        assert.deepStrictEqual(sourceDom.children[0].children[0].innerHTML, "测试dom结构demo");
    });
    describe("第一次渲染dom树", () => {
        it("列表渲染, 第二个标签子元素数量应为2", ()=>{
            assert.deepStrictEqual(newDom.children[0].children[1].children.length, 2);
        });
        it("新标签forEach列表渲染, 第二个标签子元素数量应为2", ()=>{
            assert.deepStrictEqual(newDom.children[0].children[2].children.length, 2);
        });
        it("静态文本渲染, 第一个文本标签内容应该是：测试dom结构demo", ()=>{
            assert.deepStrictEqual(newDom.children[0].children[0].innerHTML, "测试dom结构demo");
        });
    });
});

