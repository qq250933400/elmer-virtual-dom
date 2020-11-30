import { Common } from "elmer-common";
import { IHtmlNodeEventData, IVirtualElement } from "./IVirtualElement";
import { ASyntax, SyntaxText, SyntaxEvent } from "./RenderingSyntax";
import { TypeRenderActions, TypeRenderEvent } from "./RenderingSyntax/ISyntax";
import { VirtualElement } from "./virtualElement";

type VirtualNodeData = {
    attrs?: any;
    events?:IHtmlNodeEventData[],
    dataSet?: any;
};
type VirtualRenderEvent = {
    domData:IVirtualElement;
    oldDomData:IVirtualElement;
    component:any;
    doDiff?: boolean;
    optionsData?: any;
    hasChange?: boolean;
    updateParentPath?: boolean;
};
type VirtualLoopRenderResult = {
    hasRenderChange: boolean;
    innerHTML: string;
};
/**
 * v2.0.0
 * 新版本VirtualRender合并渲染和diff运算，减少虚拟dom的遍历提升速度
 */
export class VirtualRender extends Common {
    static className: string = "VirtualRender";
    plugin:ASyntax[] = [];
    constructor(private virtualDom: VirtualElement) {
        super();
        this.plugin.push(new SyntaxText());
        this.plugin.push(new SyntaxEvent());
    }
    /**
     * 渲染虚拟dom，并做diff运算标记dom状态
     * @param domData 新dom树
     * @param oldDomData 旧dom树
     * @param component 渲染component对象
     */
    render(domData:IVirtualElement, oldDomData:IVirtualElement,component:any): IVirtualElement {
        this.forEach({
            component,
            doDiff: oldDomData && oldDomData.children.length > 0,
            domData,
            oldDomData,
            optionsData: null
        });
        return domData;
    }
    private forEach(event: VirtualRenderEvent): VirtualLoopRenderResult {
        const optionalData:any = {
            ...event.domData.data,
            ...(event.optionsData || {})
        };
        let hasForEach = false;
        let updatePath = false;
        let hasRenderChange = false;
        let hasRenderInnerHTML = "";
        let forLen = event.domData.children.length;
        // tslint:disable-next-line: forin
        for(let kIndex =0; kIndex < forLen; kIndex++) {
            let dom = event.domData.children[kIndex];
            if(!this.isEmpty(dom.props["em:for"]) && dom.tagName !== "forEach") {
                // 进入for循环
                const forDoms = this.repeatRender(dom, event.component, optionalData);
                if(forDoms.length > 0) {
                    event.domData.children.splice(kIndex, 1, ...forDoms);
                    dom = event.domData.children[kIndex];
                    updatePath = true;
                    forLen += forDoms.length - 1;
                    hasForEach = true;
                } else {
                    event.domData.children[kIndex].status === "DELETE";
                }
            }
            if(dom.tagName === "forEach") {
                // 进入forEach循环
                const forEachDoms = this.forEachRender(dom, event.component, optionalData);
                if(forEachDoms.length > 0) {
                    event.domData.children.splice(kIndex, 1, ...forEachDoms);
                    dom = event.domData.children[kIndex];
                    updatePath = true;
                    forLen += forEachDoms.length - 1;
                    hasForEach = true;
                } else {
                    event.domData.children[kIndex].status === "DELETE";
                }
                hasForEach = true;
            }
            if(hasForEach) {
                dom.path = [...event.domData.path, kIndex];
            }
            if(dom.children.length > 0) {
                const myEvent:VirtualRenderEvent = {
                    component: event.component,
                    doDiff: event.doDiff,
                    domData: dom,
                    oldDomData: event.oldDomData ? event.oldDomData.children[kIndex] : null,
                    optionsData: optionalData,
                    updateParentPath: hasForEach
                };
                const myResult = this.forEach(myEvent);
                if(myResult.hasRenderChange) {
                    // 数据有变化更新innerHTML
                    dom.innerHTML = myResult.innerHTML;
                }
            }
            if(this.renderAttribute(dom, event.component,{
                ...optionalData,
                ...(dom.data || {})
            })) {
                // 有绑定内容渲染，更新innerHTML
                hasRenderChange = true;
            }
            if(this.isEmpty(hasRenderInnerHTML)) {
                hasRenderInnerHTML = dom.innerHTML;
            } else {
                hasRenderInnerHTML += "\r\n" + dom.innerHTML;
            }
        }
        return {
            hasRenderChange,
            innerHTML: hasRenderInnerHTML
        };
    }
    /**
     * 渲染dom属性，如果有绑定值则返回true,通知上一级渲染有改动，如果没有绑定数据被渲染到dom，则会被标记为Static状态，在做diff时不需要进行比较
     * @param dom 渲染属性
     * @param component 渲染组件对象
     * @param optionalData 组件绑定动态数据
     */
    private renderAttribute(dom:IVirtualElement, component:any,optionalData: any): boolean {
        let hasChange = false;
        let isEvent = false;
        if(dom.tagName !== "text") {
            if(dom.props) {
                const attributes = [];
                // tslint:disable-next-line: forin
                for(const attrKey in dom.props) {
                    let attrValue = dom.props[attrKey];
                    for(const plugin of this.plugin) {
                        const renderEvent: TypeRenderEvent = {
                            component,
                            data: optionalData,
                            target: dom.props[attrKey],
                            attrKey,
                            break: false
                        };
                        const renderResult = plugin.render(renderEvent);
                        attrValue = renderResult.result;
                        if(renderResult.hasChange) {
                            hasChange = true;
                        }
                        if(renderResult.isEvent) {
                            isEvent = true;
                        }
                        if(renderEvent.break) {
                            break;
                        }
                    }
                    if(!isEvent) {
                        dom.props[attrKey] = attrValue;
                        attributes.push(`${attrKey}="${attrValue}"`);
                    } else {
                        const eventName = attrKey.replace(/^et\:/i, "");
                        dom.events[eventName] = attrValue;
                    }
                }
            }
        } else {
            let result = dom.innerHTML;
            for(const plugin of this.plugin) {
                const renderEvent: TypeRenderEvent = {
                    component,
                    data: optionalData,
                    target: result,
                    attrKey: null
                };
                const renderResult = plugin.render(renderEvent);
                if(renderResult.hasChange) {
                    hasChange = true;
                    result = renderResult.result;
                }
                if(renderEvent.break) {
                    break;
                }
            }
            dom.innerHTML = result;
        }
        return hasChange;
    }
    /**
     * 旧语法循环渲染列表
     * @param dom 渲染dom
     * @param component 渲染组件对象
     */
    private repeatRender(dom:IVirtualElement, component:any, optionsData: any): IVirtualElement[] {
        const repeatFormula: string = (dom.props["em:for"] || "").replace(/^\s*/, "").replace(/\s$/,"");
        const forReg = /^let\s{1,}([a-z0-9]{1,})\s{1,}in\s{1,}([a-z0-9\.\_\-]{1,})$/i;
        const forMatch = repeatFormula.match(forReg);
        const resultDoms: IVirtualElement[] = [];
        if(forMatch) {
            const itemKey: string = forMatch[1];
            const dataKey: string = forMatch[2].replace(/^this\./i,"");
            const repeatData:any = this.getValue(optionsData, dataKey) || this.getValue(component, dataKey);
            if(repeatData) {
                this.virtualDom.init(dom);
                // tslint:disable-next-line: forin
                for(const forKey in repeatData) {
                    const newDom = this.virtualDom.clone();
                    const newItemData = JSON.parse(JSON.stringify(repeatData[forKey]));
                    newDom.props = {...dom.props};
                    delete newDom.props["em:for"];
                    newItemData.key = forKey;
                    newDom.data = {
                        ...newDom.data,
                        ...optionsData
                    };
                    newDom.data[itemKey] = newItemData;
                    newDom.data["index"] = forKey;
                    resultDoms.push(newDom);
                }
            }
        }
        return resultDoms;
    }
    /**
     * 支持新列表渲染标签forEach
     * @param dom forEach子标签只允许有一个
     * @param component 渲染组件对象
     * @param optionsData 组件间传递数据
     */
    private forEachRender(dom:IVirtualElement, component:any, optionsData: any): IVirtualElement[] {
        const dataKey: string = (dom.props["data"] || "").replace(/^\s*\{\{/,"").replace(/\}\}\s*$/, "").replace(/^\s*/, "").replace(/\s$/,"").replace(/^this\./i,"");
        const resultDoms: IVirtualElement[] = [];
        const itemKey: string = dom.props["item"];
        const indexKey: string = dom.props["index"];
        const repeatData:any = this.getValue(optionsData, dataKey) || this.getValue(component, dataKey);
        if(repeatData) {
            let childrenLen = 0;
            let repeateDom:IVirtualElement = null;
            dom.children.map((checkDom: IVirtualElement) => {
                if (checkDom.tagName === "text" && checkDom.innerHTML.replace(/[\r\n\s]*/g, "").length > 0) {
                    childrenLen += 1;
                    repeateDom = checkDom;
                } else {
                    if (checkDom.tagName !== "text") {
                        childrenLen += 1;
                        repeateDom = checkDom;
                    }
                }
            });
            if (childrenLen !== 1) {
                throw new Error("forEach标签下的一级子标签只能有一个标签,并且不能为空.");
            }
            if(this.isEmpty(repeateDom.props.key)) {
                throw new Error("forEach标签下的子标签必须要设置key属性");
            }
            this.virtualDom.init(repeateDom);
            // tslint:disable-next-line: forin
            for(const forKey in repeatData) {
                const newDom = this.virtualDom.clone();
                const newItemData = JSON.parse(JSON.stringify(repeatData[forKey]));
                newDom.data = {
                    ...newDom.data,
                    ...optionsData
                };
                newDom.props = {...repeateDom.props};
                newDom.props.key = newDom.props.key + forKey;
                newDom.data[itemKey] = newItemData;
                newDom.data[indexKey] = forKey;
                resultDoms.push(newDom);
            }
        }
        return resultDoms;
    }
}
