import { Common } from "elmer-common";
import { IVirtualElement } from "../IVirtualElement";
import { ASyntax, SyntaxEM, SyntaxEvent, SyntaxText } from "../RenderingSyntax";
import { TypeRenderEvent } from "../RenderingSyntax/ISyntax";
import { VirtualNode } from "./VirtualNode";
import { VirtualRenderDiff } from "./VirtualRenderDiff";

type VirtualRenderEvent = {
    domData:IVirtualElement;
    oldDomData:IVirtualElement;
    component:any;
    doDiff?: boolean;
    optionsData?: any;
    hasChange?: boolean;
    updateParentPath?: boolean;
    rootPath: number[];
    isUserComponent: boolean;
};
type VirtualLoopRenderResult = {
    hasRenderChange: boolean;
    innerHTML: string;
};
type TypeVirtualRenderEventType = "onBeforeRender";
type TypeVirtualRenderOptions = {
    rootPath?: number[],
    children?: IVirtualElement[];
    sessionId?: string
};
/**
 * v2.0.0
 * 新版本VirtualRender合并渲染和diff运算，减少虚拟dom的遍历提升速度
 */
export class VirtualRender extends Common {
    static className: string = "VirtualRender";
    plugin:ASyntax[] = [];
    private virtualDiff: VirtualRenderDiff;
    private events: any = {};
    constructor(private virtualDom: VirtualNode) {
        super();
        this.plugin.push(new SyntaxText());
        this.plugin.push(new SyntaxEvent());
        this.plugin.push(new SyntaxEM());
        this.virtualDiff = new VirtualRenderDiff();
    }
    bind(sessionId: string, type: TypeVirtualRenderEventType, callback: Function): string {
        const evtId = "virtualRenderEvent_" + this.guid();
        if(!this.events[sessionId]) {
            this.events[sessionId] = {};
        }
        if(!this.events[sessionId][type]) {
            this.events[sessionId][type] = {};
        }
        this.events[sessionId][type][evtId] = callback;
        return evtId;
    }
    unBind(sessionId: string, type: TypeVirtualRenderEventType, eventId: string): void {
        if(this.events[sessionId]) {
            if(this.events[sessionId][type]) {
                delete this.events[sessionId][type][eventId];
                if(Object.keys(this.events[sessionId][type]).length<=0) {
                    delete this.events[sessionId][type];
                }
            }
            if(Object.keys(this.events[sessionId]).length<=0) {
                delete this.events[sessionId]
            }
        }
    }
    setVirtualElement(virtualDom:VirtualNode): void {
        this.virtualDom = virtualDom;
    }
    /**
     * 渲染虚拟dom，并做diff运算标记dom状态
     * @param domData 新dom树
     * @param oldDomData 旧dom树
     * @param component 渲染component对象
     */
    render(domData:IVirtualElement, oldDomData:IVirtualElement,component:any, options?: TypeVirtualRenderOptions): IVirtualElement {
        const renderDom:any = JSON.parse(JSON.stringify(domData));
        const beforeEventName:TypeVirtualRenderEventType = "onBeforeRender";
        if(options && !this.isEmpty(options.sessionId)) {
            const eventObjKey = `${options.sessionId}.${beforeEventName}`;
            const eventObj = this.getValue(this.events, eventObjKey);
            if(eventObj) {
                for(const evtId of Object.keys(eventObj)) {
                    const eventCallback = eventObj[evtId];
                    if(typeof eventCallback === "function") {
                        const event = {
                            cancelBubble: false,
                            vdom: renderDom
                        };
                        eventCallback(event);
                        if(event.cancelBubble) {
                            break;
                        }
                    }
                }
            }
        }
        renderDom.path = options ? (options.rootPath || []) : []; // 设置根节点路径
        options && options.children && this.replaceContent(renderDom, options.children);
        this.forEach({
            component,
            doDiff: oldDomData && oldDomData.children.length > 0,
            domData: renderDom,
            oldDomData,
            optionsData: null,
            rootPath: options ? (options.rootPath || []) : [],
            isUserComponent: oldDomData ? !this.isEmpty(oldDomData.virtualID) : false
        });
        return renderDom;
    }
    /**
     * 渲染自定义组件在父组件定义的子组件内容
     * context不能和content[A-Z\-\_][A-Za-z0-9]{1,}共同使用,只能选择其一做配置
     * @param checkItem 检测组件
     * @param children 父组件定义的子组件内容
     */
    private replaceContent(checkItem:IVirtualElement, children?: IVirtualElement[]): void {
        // 当前component接收到children的时候才需要执行此方法，为减少循环提升性能
        if(children && children.length>0) {
            const contextWrapperReg = /^context([A-Z\-\_][0-9a-zA-Z]{1,})$/;
            for(let i=0;i<checkItem.children.length;i++) {
                const uItem = checkItem.children[i];
                if(uItem.status !== "DELETE") {
                    // --- 检测Item是否包含Content元素，检测到，替换为children
                    if(
                        /\<context\s*>\s*\S*\<\/context\s*\>/i.test(uItem.innerHTML) ||
                        /\<context\s*\/\>/i.test(uItem.innerHTML) ||
                        uItem.tagName === "context" ||
                        /\<content\s*>\s*\S*\<\/content\s*\>/i.test(uItem.innerHTML) ||
                        /\<content\s*\/\>/i.test(uItem.innerHTML) ||
                        uItem.tagName === "content" ||
                        /\<context[A-Z\-\_][0-9a-zA-Z]{1,}\s*\/\>/.test(uItem.innerHTML) ||
                        /\<context[A-Z\-\_][0-9a-zA-Z]{1,}\s*\>\s*\S*\<\/context[A-Z\-\_][0-9a-zA-Z]{1,}\s*\>/.test(uItem.innerHTML) ||
                        contextWrapperReg.test(uItem.tagName)) {
                        // 检测到当前dom是content元素或者包含content元素，
                        // 其他dom结构不用再做，
                        if(uItem.tagName.toLowerCase() === "content" || uItem.tagName.toLowerCase() === "context") {
                            let isContextKey = false;
                            let renderKeyReg = /([A-Z\-\_][0-9a-zA-Z]{1,})$/;
                            for(let j=0,mLen = children.length;j<mLen;j++) {
                                let renderKeyMatch = children[j].tagName.match(renderKeyReg);
                                if(renderKeyMatch) {
                                    const contextRegKey = "ChildrenWrapper" + renderKeyMatch[1];
                                    if(contextRegKey === children[j].tagName) {
                                        isContextKey = true;
                                        break;
                                    }
                                    renderKeyMatch = null;
                                }
                                children[j].isContent = true;
                            }
                            renderKeyReg = null;
                            if(!isContextKey) {
                                const sessionId = this.virtualDom.init(checkItem);
                                this.virtualDom.replaceAt(sessionId, children, i);
                                this.virtualDom.clear(sessionId);
                                break;
                            }
                        } else {
                            const contextMatch = uItem.tagName.match(contextWrapperReg);
                            if(contextMatch) {
                                const contextKey = "ChildrenWrapper" + contextMatch[1];
                                for(let j=0, mLen = children.length; j< mLen; j++) {
                                    if(contextKey === children[j].tagName) {
                                        for(let z=0,zLen = children[j].children.length;z<zLen;z++) {
                                            children[j].children[z].isContent = true;
                                        }
                                        const sessionId = this.virtualDom.init(checkItem);
                                        this.virtualDom.replaceAt(sessionId, children[j].children, i);
                                        this.virtualDom.clear(sessionId);
                                        break;
                                    }
                                }
                            } else {
                                // 执行下一层搜索
                                this.replaceContent(checkItem.children[i], children);
                            }
                        }
                    }
                }
            }
        }
    }
    private forEach(event: VirtualRenderEvent): VirtualLoopRenderResult {
        const optionalData:any = {
            ...event.domData.data,
            ...(event.optionsData || {})
        };
        const deleteElements: IVirtualElement[] = [];
        // 当前虚拟dom是用户自定义组件时不需要对子元素做diff运算
        // 有子元素是要传到自定义组件里面的diff运算去做，当前层级组件内不用做diff
        // virtualID只有在旧dom才会出现，旧dom节点是经过渲染流程以后的数据
        const isUserComponent = !event.isUserComponent ? (event.oldDomData ? !this.isEmpty(event.oldDomData.virtualID) : false) : true;
        let hasForEach = false;
        let hasRenderChange = false;
        let hasRenderInnerHTML = "";
        let forLen = event.domData.children.length;
        let lastMatchIndex = 0;
        // tslint:disable-next-line: forin
        for(let kIndex =0; kIndex < forLen; kIndex++) {
            let dom = event.domData.children[kIndex];
            if(!this.isEmpty(dom.props["em:for"]) && dom.tagName !== "forEach") {
                // 进入for循环
                const forDoms = this.repeatRender(dom, event.component, optionalData);
                if(forDoms.length > 0) {
                    event.domData.children.splice(kIndex, 1, ...forDoms);
                    dom = event.domData.children[kIndex];
                    forLen += forDoms.length - 1;
                    hasForEach = true;
                } else {
                    delete event.domData.children[kIndex].props["em:for"];
                    event.domData.children[kIndex].status = "DELETE";
                }
            }
            if(dom.tagName === "forEach") {
                // 进入forEach循环
                const forEachDoms = this.forEachRender(dom, event.component, optionalData);
                if(forEachDoms.length > 0) {
                    event.domData.children.splice(kIndex, 1, ...forEachDoms);
                    dom = event.domData.children[kIndex];
                    forLen += forEachDoms.length - 1;
                    hasForEach = true;
                } else {
                    event.domData.children[kIndex].status = "DELETE";
                }
                hasForEach = true;
            }
            dom.path = [...event.domData.path, kIndex]; // 更新path数据
            // 先对属性数据绑定，事件绑定，逻辑判断渲染到虚拟dom树
            if(this.renderAttribute(dom, event.component,{
                ...optionalData,
                ...(dom.data || {})
            })) {
                // 有绑定内容渲染，更新innerHTML
                hasRenderChange = true;
            }
            // console.log(dom.tagName, dom.innerHTML);
            const diffResult = !isUserComponent ? this.virtualDiff.diff({
                dom,
                domIndex: kIndex,
                help: event.component.help,
                lastMatchIndex,
                oldParentDom: event.oldDomData,
                isLastNode: kIndex === forLen - 1
            }) : {
                matchIndex: 0,
                matchDom: null
            };
            lastMatchIndex = diffResult.matchIndex;
            // --------进行下一层级的渲染和diff运算
            if(dom.children.length > 0) {
                const myEvent:VirtualRenderEvent = {
                    component: event.component,
                    doDiff: event.doDiff,
                    domData: dom,
                    oldDomData: diffResult.matchDom,
                    optionsData: optionalData,
                    updateParentPath: hasForEach,
                    rootPath: event.rootPath,
                    isUserComponent
                };
                const myResult = this.forEach(myEvent);
                if(myResult.hasRenderChange) {
                    // 数据有变化更新innerHTML
                    dom.innerHTML = myResult.innerHTML;
                    hasRenderChange = true;
                }
            }
            const curAttrHtmlCode = dom.attrCode || "";
            hasRenderInnerHTML += !this.isEmpty(hasRenderInnerHTML) ? "\r\n" : "";
            hasRenderInnerHTML += /^text$/i.test(dom.tagName) ? dom.innerHTML : `<${dom.tagName} ${curAttrHtmlCode}>${dom.innerHTML}</${dom.tagName}>`;
        }
        // 将没有做过对比的旧节点找出来并标记为删除状态
        // 如果节点属于自定义组件子节点不标记删除状态，由于子节点没有做diff运算，所有子节点都没有标记为diff状态
        if(!isUserComponent && event.oldDomData && event.oldDomData.children.length > 0) {
            event.oldDomData.children.map((tmpDom: IVirtualElement) => {
                // tmpDom.tagAttrs && console.log(tmpDom.tagName, tmpDom.tagAttrs.checked);
                if(!tmpDom.isDiff) {
                    tmpDom.status = "DELETE";
                    deleteElements.push(tmpDom);
                }
            });
        }
        event.domData.deleteElements = deleteElements;
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
        if(dom.tagName !== "text") {
            if(dom.props) {
                const attributes = [];
                const dataSet = {};
                // tslint:disable-next-line: forin
                for(const attrKey in dom.props) {
                    let attrValue = dom.props[attrKey];
                    let newAttrKey = attrKey;
                    let isEvent = false; // just for current attribute
                    for(const plugin of this.plugin) {
                        const renderEvent: TypeRenderEvent = {
                            attrKey,
                            break: false,
                            component,
                            data: optionalData,
                            target: dom.props[attrKey]
                        };
                        const renderResult = plugin.render(renderEvent);
                        if(renderResult.hasChange) {
                            attrValue = renderResult.result;
                            hasChange = true;
                            if(!this.isEmpty(renderResult.attrKey)) {
                                newAttrKey = renderResult.attrKey;
                            }
                        }
                        if(renderResult.isEvent) {
                            isEvent = true;
                        }
                        if(renderEvent.break) {
                            break;
                        }
                    }
                    if(!isEvent) {
                        if(hasChange) {
                            // 检测到有数据绑定才需要更新属性值
                            if(newAttrKey === "if") {
                                // if属性已经被作为是否渲染的标识，不在往外抛出属性
                                if(attrValue) {
                                    dom.status = "APPEND";
                                } else {
                                    dom.status = "DELETE";
                                }
                            } else {
                                dom.props[newAttrKey] = attrValue;
                            }
                            if(newAttrKey !== attrKey || newAttrKey === "if") {
                                delete dom.props[attrKey];
                            }
                        }
                        if(/^data\-/.test(newAttrKey)) {
                            dataSet[newAttrKey.replace(/^data\-/, "")] = attrValue;
                        }
                        const toCodeAttrValue = undefined === attrValue ? "undefined" : (null === attrValue ? "null" : attrValue.toString());
                        !/^if$/.test(newAttrKey) && attributes.push(`${newAttrKey}=${JSON.stringify(toCodeAttrValue)}`);
                    } else {
                        const eventName = newAttrKey.replace(/^et\:/i, "");
                        if(typeof attrValue === "function") {
                            dom.events[eventName] = attrValue.bind(component);
                        }
                        delete dom.props[attrKey];
                    }
                }
                dom.dataSet = dataSet;
                // tslint:disable-next-line: curly
                dom.attrCode = attributes.join(" "); // 临时存储innerHTML，读取值以后即可删除
            }
        } else {
            let result = dom.innerHTML;
            for(const plugin of this.plugin) {
                const renderEvent: TypeRenderEvent = {
                    attrKey: null,
                    break: false,
                    component,
                    data: optionalData,
                    target: result
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
                const sessionId = this.virtualDom.init(dom);
                // tslint:disable-next-line: forin
                for(const forKey in repeatData) {
                    const newDom = this.virtualDom.clone(sessionId);
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
                this.virtualDom.clear(sessionId);
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
            const sessionId = this.virtualDom.init(repeateDom);
            // tslint:disable-next-line: forin
            for(const forKey in repeatData) {
                const newDom = this.virtualDom.clone(sessionId);
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
            this.virtualDom.clear(sessionId);
        }
        return resultDoms;
    }
}
