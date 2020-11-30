import { Common } from "elmer-common";
import { IVirtualElement, VirtualElementOperate,VirtualElementOperateType } from "./IVirtualElement";

export class VirtualElement extends Common implements IVirtualElement {
    static className: string = "VirtualElement";
    children: IVirtualElement[];
    data: any;
    dom: HTMLElement|Text;
    innerHTML: string;
    tagName: string;
    props: any;
    parentPath: [];
    path: number[];
    key: string;
    events: any[];
    status: VirtualElementOperateType = "APPEND";
    constructor() {
        super();
        this.props = {};
        this.data = {};
        this.path = [];
        this.events = [];
    }
    init(data:IVirtualElement): void {
        if(Object.assign) {
            Object.assign(this, data);
        } else {
            // tslint:disable-next-line:forin
            for(const key in data) {
                this[key] = data[key];
            }
        }
    }
    create(tagName: string, props?: any, children?:IVirtualElement[] ): IVirtualElement {
        const result:IVirtualElement = {
            children: children || [],
            data: {},
            events: [],
            parentPath: [],
            path: [],
            props: props || {},
            status: "APPEND",
            tagAttrs: {},
            tagName
        };
        return result;
    }
    /**
     * 清空当前数据
     */
    clear(): void {
        this.children  = [];
        this.data      = {};
        this.dom       = null;
        this.events    = null;
        this.innerHTML = "";
        this.key       = null;
        this.path      = [];
        this.props     = {};
        this.status    = "NORMAL";
        this.tagName   = "";
    }
    getData(): IVirtualElement {
        const result:IVirtualElement = {
            children: this.children || [],
            data: this.data,
            dom: this.dom,
            events: this.events,
            innerHTML: this.innerHTML,
            key: this.key,
            parentPath: this.parentPath,
            path: this.path,
            props: this.props || {},
            status: this.status,
            tagName: this.tagName,
        };
        return result;
    }
    append(insertChild: IVirtualElement): void {
        if(insertChild && this.children) {
            const pIndex = this.children.length;
            insertChild.path = JSON.parse(JSON.stringify(this.path));
            this.children.push(insertChild);
            this.updatePath(insertChild, this.path, pIndex);
        } else if(insertChild && !this.children) {
            this.children = [insertChild];
        }
    }
    appendAt(insertChild: IVirtualElement|IVirtualElement[], index: number): void {
        if(insertChild) {
            if(!this.isArray(insertChild)) {
                this.children.splice(index,0,insertChild);
                this.updatePath(insertChild, this.path, index);
            } else {
                let insertVE:IVirtualElement[] = insertChild;
                insertVE.map((tmpItem:IVirtualElement, myIndex:number) => {
                    const insertIndex = index + myIndex;
                    this.children.splice(insertIndex,0,tmpItem);
                    this.updatePath(tmpItem, this.path, insertIndex);
                });
                insertVE = null;
            }
        }
    }
    replaceAt(replaceChild: IVirtualElement|IVirtualElement[], index: number): void {
        this.children[index] = null;
        if(!this.isArray(replaceChild)) {
            this.children.splice(index,1,replaceChild);
        } else {
            this.children.splice(index,1,...replaceChild);
        }
        for(let i=index;i<this.children.length;i++) {
            this.updatePath(this.children[i], this.path, i);
        }
    }
    remove(removeChild: IVirtualElement): void {
        const rmIndex = this.children.indexOf(removeChild);
        if(rmIndex>=0 && rmIndex< this.children.length) {
            this.children.splice(rmIndex, 1);
        }
        if(rmIndex-1<this.children.length && rmIndex-1>=0) {
            for(let i=rmIndex-1;i<this.children.length;i++) {
                this.updatePath(this.children[i], this.path,i);
            }
        }
    }
    removeAt(index: number): void {
        this.children[index] = null;
        this.children.splice(index,1);
        // update those dom's path, those dom's position has been changed after this operation
        if(index-1<this.children.length && index-1>=0) {
            for(let i=index-1;i<this.children.length;i++) {
                this.updatePath(this.children[i], this.path,i);
            }
        }
    }
    parent(findDom: IVirtualElement): IVirtualElement {
        const path = JSON.parse(JSON.stringify(findDom.path));
        path.splice(path.length - 1, 1);
        return this.getElementByPath(path);
    }
    getElementByPath(path: number[]): IVirtualElement | null | undefined {
        if(this.isArray(path) && path.length>0) {
            const maxLevel = path.length;
            let tmpDom:IVirtualElement = this;
            let findDom = true;
            for(let i=0;i<path.length;i++) {
                const tmpPoistion = path[i];
                tmpDom = tmpDom.children[tmpPoistion];
                if(!tmpDom) {
                    findDom = false;
                    break;
                }
            }
            return findDom ? tmpDom : null;
        }
    }
    /**
     * 获取前一个节点
     */
    getPrev(refDom: IVirtualElement): IVirtualElement|null {
        if(refDom) {
            const parent = this.parent(refDom);
            const index = refDom.path[refDom.path.length-1];
            if(parent && index-1>=0 && index-1<parent.children.length) {
                for(let i=index-1;i>=0;i--) {
                    const tmpChild = parent.children[i];
                    if(tmpChild.status !== VirtualElementOperate.DELETE) {
                        return tmpChild;
                    }
                }
            }
        }
        return null;
    }
    getNext(refDom:IVirtualElement): IVirtualElement|null {
        if(refDom) {
            const parent = this.parent(refDom);
            const index = refDom.path[refDom.path.length-1]+1;
            if(index>=0 && index<parent.children.length) {
                return parent.children[index];
            }
        }
        return null;
    }
    /**
     * 统一设置子元素status属性
     * @param status symbol VirtualElementOperate
     */
    setChildrenStatus(status: VirtualElementOperateType): void {
        for(let i=0;i<this.children.length;i++) {
            this.setChildStatus(this.children[i], status);
        }
    }
    /**
     * 复制自身节点元素
     */
    clone(): IVirtualElement {
        const cloneData:IVirtualElement = this.getData();
        const cloneProps = cloneData.props;
        cloneData.props = {};
        const newItem = JSON.parse(JSON.stringify(cloneData));
        newItem.innerHTML = this.innerHTML;
        newItem.data = JSON.parse(JSON.stringify(this.data));
        newItem.path = JSON.parse(JSON.stringify(this.path));
        newItem.props = cloneProps;
        return newItem;
    }
    dispose(): void {
        this.tagName = null;
        this.innerHTML = null;
        this.data = null;
        this.props = null;
        this.dom = null;
        this.events = null;
        this.children = null;
    }
    releaseDom(data:IVirtualElement): void {
        if(data) {
            data.dom = null;
            data.innerHTML = null;
            data.props = null;
            data.events = null;
            if(data.children && data.children.length>0) {
                for(let i=0;i<data.children.length;i++) {
                    this.releaseDom(data.children[i]);
                }
            }
            delete data.dom;
            delete data.innerHTML;
            delete data.props;
            delete data.events;
        }
    }
    virtualElementHasChange(data:IVirtualElement): boolean {
        if(data.status !== VirtualElementOperate.NORMAL) {
            return true;
        } else {
            if(data.children && data.children.length>0) {
                for(const checkItem of data.children) {
                    if(this.virtualElementHasChange(checkItem)) {
                        return true;
                    }
                }
            }
        }
    }
    updatePath(targetElement: IVirtualElement, parentPath: number[], position:number): void {
        let newPath = JSON.parse(JSON.stringify(parentPath));
        newPath.push(position);
        targetElement.path = newPath;
        targetElement.children.map((tmpItem:IVirtualElement, index:number) => {
            this.updatePath(tmpItem, newPath, index);
        });
        newPath = null;
    }
    /**
     * 根据查询class规则筛选dom
     * @param className 查询class规则
     * @param queryDom 查询根元素
     * @return IVirtualElement[]
     */
    getElementsByClassName(className: string, queryDom?:IVirtualElement): IVirtualElement[] {
        const lResult:IVirtualElement[] = [];
        if(!this.isEmpty(className)) {
            if(queryDom) {
                if(queryDom.props) {
                    let checkClassName = queryDom.props.class || "";
                    let checkClassArr = checkClassName.replace(/\s{1,}/g, " ").split(" ");
                    let queryClassArr = className.replace(/\s{1,}/g, " ").split(",");
                    let domMatched  = false;
                    for(let i=0;i<queryClassArr.length;i++) {
                        const myClass = queryClassArr[i];
                        const tagMatch = myClass.match(/^([a-z0-9\_\-]{1,})[\#\.]/i);
                        let checkMyClassArr = myClass.match(/[\#\.][a-z0-9\-\_]{1,}/ig);
                        if(!tagMatch && !checkMyClassArr) {
                            checkMyClassArr = [myClass];
                        } else {
                            if(!checkMyClassArr) {
                                checkMyClassArr = [];
                            }
                            if(tagMatch) {
                                checkMyClassArr.splice(0,0, tagMatch[1]);
                            }
                        }
                        if(checkMyClassArr && checkMyClassArr.length>0) {
                            let isMatched = true;
                            for(let j=0;j<checkMyClassArr.length;j++) {
                                const subClass = checkMyClassArr[j];
                                const subClassValue = subClass.replace(/^[\.\#]*/, "");
                                if(/^\./.test(subClass)) {
                                    if(checkClassArr.indexOf(subClassValue) < 0) {
                                        isMatched = false;
                                        break;
                                    }
                                } else if(/^\#/.test(subClass)) {
                                    if(queryDom.props.id !== subClassValue) {
                                        isMatched = false;
                                        break;
                                    }
                                } else {
                                    if(queryDom.tagName !== subClassValue) {
                                        isMatched = false;
                                        break;
                                    }
                                }
                            }
                            domMatched = isMatched;
                            if(domMatched) {
                                break;
                            }
                        }
                    }
                    if(domMatched) {
                        lResult.push(queryDom);
                    }
                    checkClassName = null;
                    checkClassArr = null;
                    queryClassArr = null;
                    if(queryDom.children && queryDom.children.length>0) {
                        queryDom.children.map((item:IVirtualElement) => {
                            let matchResult = this.getElementsByClassName(className, item);
                            if(matchResult && matchResult.length>0) {
                                lResult.push(...matchResult);
                            }
                            matchResult = null;
                        });
                    }
                }
            } else {
                this.children.map((item:IVirtualElement) => {
                    let matchResult = this.getElementsByClassName(className, item);
                    if(matchResult && matchResult.length>0) {
                        lResult.push(...matchResult);
                    }
                    matchResult = null;
                });
            }
            return lResult;
        } else {
            return [];
        }
    }
    private setChildStatus(item: IVirtualElement,status:VirtualElementOperateType): void {
        item.status = status;
        for(let i=0;i<item.children.length;i++) {
            this.setChildStatus(item.children[i], status);
        }
    }
    private getElementByIndex(element:IVirtualElement,index: number): IVirtualElement {
        if(element && index>=0 && index< element.children.length) {
            return element.children[index];
        } else {
            return null;
        }
    }
}
