import { Common } from "elmer-common";
import { IHtmlNodeEventData, IVirtualElement } from "./IVirtualElement";
import { VirtualElement } from "./virtualElement";

type VirtualNodeData = {
    attrs?: any;
    events?:IHtmlNodeEventData[],
    dataSet?: any;
};
/**
 * v2.0.0
 * 新版本VirtualRender合并渲染和diff运算，减少虚拟dom的遍历提升速度
 */
export class VirtualRender extends Common {
    static className: string = "VirtualRender";
    constructor(private virtualDom: VirtualElement) {
        super();
    }
    /**
     * 渲染虚拟dom，并做diff运算标记dom状态
     * @param domData 新dom树
     * @param oldDomData 旧dom树
     * @param component 渲染component对象
     */
    render(domData:IVirtualElement, oldDomData:IVirtualElement,component:any): IVirtualElement {
        this.forEach(domData, oldDomData, component, oldDomData && oldDomData.children.length > 0);
        return domData;
    }
    private isEmptyObject(target:any): boolean {
        return (target && Object.keys(target).length <=0) || (undefined === target || null === target);
    }
    private forEach(domData:IVirtualElement, oldDomData:IVirtualElement, component:any, doDiff?: boolean, optionsData?: any): void {
        const optionalData:any = {
            ...domData.data,
            ...(optionsData || {})
        };
        let hasForEach = false;
        let updatePath = false;
        // tslint:disable-next-line: forin
        for(const kIndex in domData.children) {
            let dom = domData.children[kIndex];
            if(!this.isEmpty(dom.props["em:for"]) && dom.tagName !== "forEach") {
                // 进入for循环
                const forDoms = this.repeatRender(dom, component, optionalData);
                if(forDoms.length > 0) {
                    domData.children.splice(parseInt(kIndex,10), 1, ...forDoms);
                    dom = domData.children[kIndex];
                    updatePath = true;
                } else {
                    domData.children[kIndex].status === "DELETE";
                }
            }
            if(dom.tagName === "forEach") {
                 // 进入forEach循环
                const forEachDoms = this.forEachRender(dom, component, optionalData);
                if(forEachDoms.length > 0) {
                    domData.children.splice(parseInt(kIndex,10), 1, ...forEachDoms);
                    dom = domData.children[kIndex];
                    updatePath = true;
                } else {
                    domData.children[kIndex].status === "DELETE";
                }
                hasForEach = true;
            }
            if(dom.children.length > 0) {
                this.forEach(dom, oldDomData ? oldDomData.children[kIndex] : null, component, doDiff, optionalData);
            }

        }
    }
    private renderAttribute(dom:IVirtualElement): void {
        if(dom.props) {
            for(const attrKey in dom.props) {
                if(/^em\:/i.test(attrKey)) {
                    // em:开头的属性表示值是从component获取，或者是判断逻辑,[neq,!=] [eq,==] [lt,<] [gt,>],[lteq, <=],[gteq, >=]
                }
            }
        }
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
        const dataKey: string = (dom.props["data"] || "").replace(/^\s*/, "").replace(/\s$/,"").replace(/^this\./i,"");
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
                newDom.props.key = newDom.props.key + forKey;
                newDom.data[itemKey] = newItemData;
                newDom.data[indexKey] = forKey;
                resultDoms.push(newDom);
            }
        }
        return resultDoms;
    }
}
