import { Common } from "elmer-common";
import { IVirtualElement, VirtualElementOperateType } from "../IVirtualElement";

export class VirtualNode extends Common {
    static className = "VirtualNode";
    private nodes: any = {};
    init(vdom:IVirtualElement): string {
        const vId = "virualNode_" + this.guid();
        this.nodes[vId] = vdom;
        return vId;
    }
    clear(sessionId: string): void {
        delete this.nodes[sessionId];
    }
    /**
     * 创建一个新的虚拟节点
     * @param tagName 节点名字
     * @param props 属性【可选参数】
     * @param children 子节点【可选参数】
     */
    create(tagName: string, props?: any, children?:IVirtualElement[] ): IVirtualElement {
        const result:IVirtualElement = {
            children: children || [],
            data: {},
            events: [],
            path: [],
            props: props || {},
            status: "APPEND",
            tagAttrs: {},
            tagName
        };
        return result;
    }
    getNode(sessionId: string): IVirtualElement {
        return this.nodes[sessionId];
    }
    append(sessionId: string, insertChild: IVirtualElement): void {
        const vdom:IVirtualElement = this.nodes[sessionId];
        if(insertChild && vdom.children) {
            const pIndex = vdom.children.length;
            insertChild.path = JSON.parse(JSON.stringify(vdom.path));
            vdom.children.push(insertChild);
            this.updatePath(insertChild, vdom.path, pIndex);
        } else if(insertChild && !vdom.children) {
            vdom.children = [insertChild];
        }
    }
    appendAt(sessionId: string, insertChild: IVirtualElement|IVirtualElement[], index: number): void {
        const vdom:IVirtualElement = this.nodes[sessionId];
        if(insertChild) {
            if(!this.isArray(insertChild)) {
                vdom.children.splice(index,0,insertChild);
                this.updatePath(insertChild, vdom.path, index);
            } else {
                let insertVE:IVirtualElement[] = insertChild;
                insertVE.map((tmpItem:IVirtualElement, myIndex:number) => {
                    const insertIndex = index + myIndex;
                    vdom.children.splice(insertIndex,0,tmpItem);
                    this.updatePath(tmpItem, vdom.path, insertIndex);
                });
                insertVE = null;
            }
        }
    }
    replaceAt(sessionId: string, replaceChild: IVirtualElement|IVirtualElement[], index: number): void {
        const replaceList = !this.isArray(replaceChild) ? [replaceChild] : replaceChild;
        if(replaceChild && replaceList.length>0) {
            const vdom:IVirtualElement = this.nodes[sessionId];
            const newChildren = [];
            vdom.children[index] = null;
            for(let i=0;i<vdom.children.length;i++) {
                if(i===index) {
                    replaceList.map((item) => {
                        newChildren.push(item);
                    });
                } else {
                    newChildren.push(vdom.children[i]);
                }
            }
            vdom.children = newChildren;
            if(replaceList.length>1) {
                for(let i=index;i<vdom.children.length;i++) {
                    this.updatePath(vdom.children[i], vdom.path, i);
                }
            }
            this.updateInnerHTML(vdom);
        }
    }
    remove(sessionId: string, removeChild: IVirtualElement): void {
        const vdom:IVirtualElement = this.nodes[sessionId];
        const rmIndex = vdom.children.indexOf(removeChild);
        if(rmIndex>=0 && rmIndex< vdom.children.length) {
            vdom.children.splice(rmIndex, 1);
        }
        if(rmIndex-1<vdom.children.length && rmIndex-1>=0) {
            for(let i=rmIndex-1;i<vdom.children.length;i++) {
                this.updatePath(vdom.children[i], vdom.path,i);
            }
        }
    }
    removeAt(sessionId: string, index: number): void {
        const vdom:IVirtualElement = this.nodes[sessionId];
        vdom.children[index] = null;
        vdom.children.splice(index,1);
        // update those dom's path, those dom's position has been changed after this operation
        if(index-1<vdom.children.length && index-1>=0) {
            for(let i=index-1;i<vdom.children.length;i++) {
                this.updatePath(vdom.children[i], vdom.path,i);
            }
        }
        this.updateInnerHTML(vdom);
    }
    parent(sessionId: string, findDom: IVirtualElement): IVirtualElement {
        const path = JSON.parse(JSON.stringify(findDom.path));
        path.splice(path.length - 1, 1);
        return this.getElementByPath(sessionId, path);
    }
    getElementByPath(sessionId: string, path: number[]): IVirtualElement | null | undefined {
        if(this.isArray(path) && path.length>0) {
            let tmpDom:IVirtualElement = this.nodes[sessionId];
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
    getPrev(session: string, refDom: IVirtualElement): IVirtualElement|null {
        if(refDom) {
            const parent = this.parent(session, refDom);
            const index = refDom.path[refDom.path.length-1];
            if(parent && index-1>=0 && index-1<parent.children.length) {
                for(let i=index-1;i>=0;i--) {
                    const tmpChild = parent.children[i];
                    if(tmpChild.status !== "DELETE") {
                        return tmpChild;
                    }
                }
            }
        }
        return null;
    }
    getNext(session: string, refDom:IVirtualElement): IVirtualElement|null {
        if(refDom) {
            const parent = this.parent(session, refDom);
            const index = refDom.path[refDom.path.length-1]+1;
            if(index>=0 && index<parent.children.length) {
                return parent.children[index];
            }
        }
        return null;
    }
     /**
     * 复制自身节点元素
     */
    clone(sessionId: string): IVirtualElement {
        const cloneData:IVirtualElement = this.getNode(sessionId);
        const cloneProps = cloneData.props;
        cloneData.props = {};
        const newItem = JSON.parse(JSON.stringify(cloneData));
        newItem.innerHTML = cloneData.innerHTML;
        newItem.data = JSON.parse(JSON.stringify(cloneData.data));
        newItem.path = JSON.parse(JSON.stringify(cloneData.path));
        newItem.props = cloneProps;
        return newItem;
    }
    changeStatus(vdom: IVirtualElement, status: VirtualElementOperateType): void {
        vdom.status = status;
        if(vdom.children && vdom.children.length > 0) {
            vdom.children.map((subItem) => {
                this.changeStatus(subItem, status);
            });
        }
    }
    private updateInnerHTML(vdom:IVirtualElement): void {
        if(vdom.children && vdom.children.length > 0) {
            let code = "";
            vdom.children.map((vItem) => {
                code += `<${vItem.tagName} ${vItem.attrCode}>${vItem.innerHTML}</${vItem.tagName}>\r\n`;
            });
            vdom.innerHTML = code;
        }
    }
    private updatePath(targetElement: IVirtualElement, parentPath: number[], position:number): void {
        let newPath = JSON.parse(JSON.stringify(parentPath));
        newPath.push(position);
        targetElement.path = newPath;
        targetElement.children.map((tmpItem:IVirtualElement, index:number) => {
            this.updatePath(tmpItem, newPath, index);
        });
        newPath = null;
    }
}