import { Common } from "elmer-common";
import { IVirtualElement } from "../IVirtualElement";
import { ASyntax, SyntaxEM, SyntaxEvent, SyntaxText, SysntaxAttrs } from "../RenderingSyntax";
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
    isComponentChild: boolean;
    sessionId?: string;
};
type VirtualLoopRenderResult = {
    hasRenderChange: boolean;
    innerHTML: string;
};
type TypeVirtualRenderEventType = "onBeforeRender" | "onBeforeReplaceContext" | "onRender";
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
        this.plugin.push(new SysntaxAttrs());
        this.virtualDiff = new VirtualRenderDiff();
    }
    bind(sessionId: string, type: TypeVirtualRenderEventType, callback: Function): Function {
        const evtId = "virtualRenderEvent_" + this.guid();
        if(!this.events[sessionId]) {
            this.events[sessionId] = {};
        }
        if(!this.events[sessionId][type]) {
            this.events[sessionId][type] = {};
        }
        this.events[sessionId][type][evtId] = callback;
        return () => {
            delete this.events[sessionId][type][evtId];
            if(Object.keys(this.events[sessionId][type]).length <= 0) {
                delete this.events[sessionId][type];
            }
            if(Object.keys(this.events[sessionId]).length <= 0) {
                delete this.events[sessionId];
            }
        };
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
        renderDom.path = options ? (options.rootPath || []) : []; // 设置根节点路径
        // 在替换子节点容器前执行
        this.raiseEvent(options?.sessionId, "onBeforeReplaceContext", {vdom: renderDom});
        options && options.children && this.replaceContent(renderDom, options.children);
        // 替换子节点容器后，渲染数据前执行
        this.raiseEvent(options?.sessionId, "onBeforeRender", {vdom: renderDom});
        this.forEach({
            component,
            doDiff: oldDomData && oldDomData.children.length > 0,
            domData: renderDom,
            isComponentChild: false,
            isUserComponent: oldDomData ? !this.isEmpty(oldDomData.virtualID) : false,
            oldDomData,
            optionsData: null,
            rootPath: options ? (options.rootPath || []) : [],
            sessionId: options?.sessionId
        });
        return renderDom;
    }
    private raiseEvent(sessionId: string, eventName: TypeVirtualRenderEventType, args?: any): any {
        if(!this.isEmpty(sessionId) && !this.isEmpty(eventName)) {
            const eventKey = `${sessionId}.${eventName}`;
            const eventObj = this.getValue(this.events, eventKey);
            if(eventObj) {
                let eventResult = null;
                for(const eventId of Object.keys(eventObj)) {
                    const eventCallback = eventObj[eventId];
                    if(typeof eventCallback === "function") {
                        const event = {
                            cancelBubble: false,
                            data: args
                        };
                        eventResult = eventCallback(event);
                        if(event.cancelBubble) {
                            break;
                        }
                    }
                }
                return eventResult;
            }
        }
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
            const contextWrapperReg = /^[Cc]ontext([A-Z\-\_][0-9a-zA-Z]{1,})$/;
            // ContextLeft  -> ChildrenWrapperLeft
            for(let i=0;i<checkItem.children.length;i++) {
                const uItem = checkItem.children[i];
                if(uItem.status !== "DELETE") {
                    // --- 检测Item是否包含Content元素，检测到，替换为children
                    if(
                        uItem.tagName.toLowerCase() === "context" ||
                        /\<[Cc]ontext\s*>\s*\S*\<\/[Cc]ontext\s*\>/i.test(uItem.innerHTML) ||
                        /\<[Cc]ontext\s*\/\>/i.test(uItem.innerHTML) ||
                        /\<[Cc]ontext[A-Z\-\_][0-9a-zA-Z]{1,}\s*\/\>/.test(uItem.innerHTML) ||
                        /\<[Cc]ontext[A-Z\-\_][0-9a-zA-Z]{1,}\s*\>\s*\S*\<\/[Cc]ontext[A-Z\-\_][0-9a-zA-Z]{1,}\s*\>/.test(uItem.innerHTML) ||
                        contextWrapperReg.test(uItem.tagName)) {
                        // 检测到当前dom是content元素或者包含content元素，
                        // 其他dom结构不用再做，
                        if(uItem.tagName.toLowerCase() === "context") {
                            let isContextKey = false;
                            let renderKeyReg = /([A-Z\-\_][0-9a-zA-Z]{1,})$/;
                            for(let j=0,mLen = children.length;j<mLen;j++) {
                                let renderKeyMatch = children[j].tagName.match(renderKeyReg);
                                if(renderKeyMatch) {
                                    const contextRegKey = "Container" + renderKeyMatch[1];
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
                                const contextKey = "Container" + contextMatch[1];
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
            let diffResult = null;
            if(!/^\s*script\s*$/i.test(dom.tagName)) {
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
                if(event.domData.status === "DELETE") {
                    // 当前父组件由于新数据渲染过后需要删除，则子节点也需要删除
                    // 当做diff运算时需要交换virtualId一遍后面处理删除事件
                    dom.status = "DELETE";
                }
                // 在此执行emit事件，在renderAttribure前做一些改动
                const eventResult:any = this.raiseEvent(event.sessionId, "onRender", {
                    dom,
                    isComponentChild: event.isComponentChild
                });

                // 先对属性数据绑定，事件绑定，逻辑判断渲染到虚拟dom树
                if(this.renderAttribute(dom, event.component,{
                    ...optionalData,
                    ...(dom.data || {})
                })) {
                    // 有绑定内容渲染，更新innerHTML
                    hasRenderChange = true;
                }
                // 如果当前元素是自定义组件的子元素时不做diff运算，保留给自定义组件渲染时做diff算法
                // 当前元素是自定义组件，但并不是其他自定义组件的子元素需要做diff
                diffResult = !eventResult?.isComponentChild ? this.virtualDiff.diff({
                    dom,
                    domIndex: kIndex,
                    help: event.component.help,
                    isLastNode: kIndex === forLen - 1,
                    lastMatchIndex,
                    oldParentDom: event.oldDomData,
                }) : {
                    matchDom: null,
                    matchIndex: 0
                };
                lastMatchIndex = diffResult.matchIndex;
                // --------进行下一层级的渲染和diff运算
                if(dom.children.length > 0) {
                    const myEvent:VirtualRenderEvent = {
                        component: event.component,
                        doDiff: event.doDiff,
                        domData: dom,
                        // 当前组件是自定义组件并且不是自定义组件元素时，下一个层元素则被定义为自定义组件元素 isComponentChild === true
                        // 当前组件为自定义组件子元素 isComponentChild === true
                        isComponentChild: eventResult?.isComponentChild || (eventResult?.isComponent && !eventResult?.isComponentChild), // 用于标记是不是组定义组件下的元素
                        isUserComponent: eventResult?.isComponent, // 用于标记是不是自定义组件
                        oldDomData: diffResult?.matchDom,
                        optionsData: optionalData,
                        rootPath: event.rootPath,
                        sessionId: event.sessionId,
                        updateParentPath: hasForEach
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
            } else {
                dom.status = "DELETE";
                dom.children = [];
                dom.innerHTML = "Script tags are not allowed in HTML code";
                dom.tagName = "text";
                throw new Error(`Script tags are not allowed in HTML code.[${event.component.selector}]`);
            }
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
            let hasIf = false;
            if(dom.props) {
                const attributes = [];
                const dataSet = {};
                const renderComponent = (dom as any).component || component;
                // 当组件是上一层组件定义的子元素时，调用的数据应该从上一次元素获取数据
                // tslint:disable-next-line: forin
                for(const attrKey in dom.props) {
                    let attrValue = dom.props[attrKey];
                    let newAttrKey = attrKey;
                    let isEvent = false; // just for current attribute
                    for(const plugin of this.plugin) {
                        const renderEvent: TypeRenderEvent = {
                            attrKey,
                            break: false,
                            component: renderComponent,
                            data: optionalData,
                            target: dom.props[attrKey],
                            vdom: dom
                        };
                        const renderResult = plugin.render(renderEvent);
                        if(renderResult.hasChange) {
                            attrValue = renderResult.result;
                            hasChange = true;
                            if(!this.isEmpty(renderResult.attrKey)) {
                                newAttrKey = renderResult.attrKey;
                            }
                        }
                        if(/^on/.test(attrKey)) {
                            // 浏览器默认事件处理，过滤此操作，使用框架自定义
                            // 并且属性值为javascript: void();模式，或则执行方法aa()
                            if(typeof renderResult.result === "function" || /^\s*javascript\s\:/.test(attrValue) || /[a-z][a-z0-9\.\_]*\s*\(/i.test(attrValue)) {
                                attrValue = "Not Allow Event";
                            }
                        }
                        if(renderResult.isEvent) {
                            isEvent = true;
                        }
                        if(renderEvent.break) {
                            break;
                        }
                    }
                    if(/\:if$/.test(newAttrKey) || /^if$/.test(newAttrKey)) {
                        // console.log(newAttrKey, attrValue, dom.tagName);
                        hasIf = true;
                    }
                    if(!isEvent) {
                        if(hasChange) {
                            // 检测到有数据绑定才需要更新属性值
                            // 自由节点不是删除状态时才需要做此判断，被父组件删除状态影响时状态则不需更新状态
                            if(dom.status !== "DELETE" && (newAttrKey === "if" || "em:if" === newAttrKey)) {
                                // if属性已经被作为是否渲染的标识，不在往外抛出属性
                                if(attrValue) {
                                    dom.status = "APPEND";
                                } else {
                                    dom.status = "DELETE";
                                }
                            } else {
                                if((dom as any).component) {
                                   // delete dom.props[newAttrKey];
                                }
                                dom.props[newAttrKey] = attrValue;
                            }
                            if(newAttrKey !== attrKey) {
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
                if(dom.props["..."]) {
                    if(this.isObject(dom.props["..."])) {
                        const newProps = dom.props["..."];
                        this.extend(dom.props, newProps);
                        delete dom.props["..."];
                    }
                }
                dom.dataSet = dataSet;
                // tslint:disable-next-line: curly
                dom.attrCode = attributes.join(" "); // 临时存储innerHTML，读取值以后即可删除
                delete dom.props["..."];
            }
        } else {
            let result = dom.innerHTML;
            for(const plugin of this.plugin) {
                const renderEvent: TypeRenderEvent = {
                    attrKey: null,
                    break: false,
                    component,
                    data: optionalData,
                    target: result,
                    vdom: dom
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
        const indexKey: string = dom.props["index"];
        if(forMatch) {
            const itemKey: string = forMatch[1];
            const dataKey: string = forMatch[2].replace(/^this\./i,"");
            const repeatData:any = this.getValue(optionsData, dataKey) || this.getValue(component, dataKey);
            const limitKey: string = dom.props["key"];
            if(this.isEmpty(limitKey)) {
                throw new Error("em:for列表渲染必须设置key属性");
            }
            if(repeatData) {
                const sessionId = this.virtualDom.init(dom);
                // tslint:disable-next-line: forin
                for(const forKey in repeatData) {
                    const newDom = this.virtualDom.clone(sessionId);
                    const newItemData = JSON.parse(JSON.stringify(repeatData[forKey]));
                    // newDom.props = {...dom.props};
                    delete newDom.props["em:for"];
                    newItemData.key = forKey;
                    newDom.data = {
                        ...newDom.data,
                        ...optionsData
                    };
                    newDom.data[itemKey] = newItemData;
                    newDom.data[indexKey] = forKey;
                    newDom.props.key = limitKey + forKey;
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
        const repeatData:any = this.checkCallbackCode(component, optionsData, dataKey) || this.getValue(optionsData, dataKey) || this.getValue(component, dataKey);
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
                newDom.props.key = newDom.props.key + forKey;
                newDom.data[itemKey] = newItemData;
                newDom.data[indexKey] = forKey;
                resultDoms.push(newDom);
            }
            this.virtualDom.clear(sessionId);
        }
        return resultDoms;
    }
    private checkCallbackCode(component: any, optionsData: any, code: string): any {
        if(!this.isEmpty(code)) {
            const checkCode = code.replace(/^\s*\{\{/, "").replace(/\}\}\s*$/,"").replace(/^\s*/,"").replace(/\s*$/,"");
            const callbackMatch = checkCode.match(/^([a-z0-9\_\.]{1,})\(([\s\S]*)\)$/i);
            if(callbackMatch) {
                const callbackKey = callbackMatch[1];
                const paramsKey = callbackMatch[2] || "";
                const callback = this.getValue(optionsData, callbackKey) || this.getValue(component, callbackKey);
                if(typeof callback === "function") {
                    const varArr = paramsKey.split(",");
                    if(varArr.length > 0) {
                        const callbackParams:any[] = [];
                        varArr.map((tmpItem: string) => {
                            const varKey = tmpItem.replace(/^\s*/,"").replace(/\s*$/,"");
                            if((/^"/.test(varKey) && /"$/.test(varKey)) || (/^'/.test(varKey) && /'$/.test(varKey))) {
                                // 当前参数为字符类型数据
                                callbackParams.push(varKey);
                            } else {
                                // 当前参数是变量从component读取数据
                                const pV = this.getValue(optionsData, varKey) || this.getValue(component, varKey);
                                callbackParams.push(pV);
                            }
                        });
                        return callback.apply(component, callbackParams);
                    } else {
                        return callback.call(component);
                    }
                }
            }
        }
    }
}
