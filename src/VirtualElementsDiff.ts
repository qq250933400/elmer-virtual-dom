import { Common } from "elmer-common";
import { IVirtualElement,VirtualElementOperate } from "./IVirtualElement";
import { VirtualElement } from "./virtualElement";

// tslint:disable-next-line: interface-over-type-literal
type CheckPropsChangeResult = {
    sameType?:boolean;
    isChanged?: boolean;
    changeProps?: any;
};
/**
 * 虚拟dom diff算法实现, 当前模块只为2.0版本以下UI框架使用，新版本弃用此模块
 * 此方法为个人学习理解所写，和现下网络流传的方法不一杨，性能方面需要在提升
 * 还未对属性和事件变化做记录，应该记录属性变化在渲染时只针对变化属性做修改，减少操作dom，提升性能
 */
export class VirtualElementsDiff extends Common {
    static className:string = "VirtualElementsDiff";
    sourceDom: IVirtualElement;
    oldDom: IVirtualElement;
    private diffSelector: string;
    constructor(private virtualDom: VirtualElement) {
        super();
    }
    /**
     * 对指定的两个节点做diff运算
     * @param newElement 新节点
     * @param oldElement 旧节点
     * @param selector 可选参数用于标识当前执行的dom结构
     */
    diff(newElement: IVirtualElement, oldElement: IVirtualElement, selector?: string): void {
        this.sourceDom = newElement;
        this.oldDom = oldElement;
        this.diffSelector = selector;
        this.patch(this.sourceDom, this.oldDom);
        this.virtualDom.clear();
    }
    /**
     *  对指定的两个节点做diff 运算
     */
    private patch(newElement:IVirtualElement, oldElement: IVirtualElement,setAppend?:boolean): void {
        if(newElement.children.length>0 && oldElement.children.length<=0) {
            // 新Dom树增加子节点，旧Dom树没有子节点
            // 由于在解析html代码的时候默认status为append所以此处不需要做任何操作
        } else if(newElement.children.length<=0 && oldElement.children.length>0) {
            // 删除节点
            newElement.deleteElements = [];
            oldElement.children.map((tmpOldElement:IVirtualElement, index:number) => {
                tmpOldElement.status = "DELETE";
                newElement.deleteElements.push(tmpOldElement);
            });
        } else {
            // 遍历对比
            const delElements = [];
            let offsetIndex = 0;
            oldElement.children.map((tmpOldItem:IVirtualElement, index: number) => {
                let isCheckNextStep = true;
                if(index + offsetIndex < newElement.children.length) {
                    let tmpNewItem = newElement.children[index + offsetIndex];
                    if(!this.isEmpty(tmpOldItem.props.key)) {
                        const checkKeyResult = this.checkSameVirtualElementByKey(tmpOldItem, newElement.children, index, offsetIndex);
                        if(!checkKeyResult.find) {
                            offsetIndex -= 1;
                            delElements.push(tmpOldItem);
                            isCheckNextStep = false;
                        } else {
                            tmpNewItem = checkKeyResult.dom;
                            offsetIndex = checkKeyResult.offsetIndex;
                        }
                    }
                    if(isCheckNextStep) {
                        const checkResult = this.checkSameVirtualElement(tmpNewItem, tmpOldItem);
                        if(checkResult.sameType) {
                            if(tmpNewItem.status !== VirtualElementOperate.DELETE) {
                                if(checkResult.isChanged) {
                                    if(tmpOldItem.status === VirtualElementOperate.DELETE) {
                                        newElement.children[index + offsetIndex].status = "APPEND";
                                        this.patch(newElement.children[index + offsetIndex], oldElement.children[index], true);
                                    } else {
                                        if(!setAppend) {
                                            newElement.children[index + offsetIndex].changeAttrs = checkResult.changeProps;
                                            newElement.children[index + offsetIndex].status = "UPDATE";
                                        } else {
                                            newElement.children[index + offsetIndex].status = "APPEND";
                                        }
                                        this.patch(newElement.children[index + offsetIndex], oldElement.children[index], setAppend);
                                    }
                                } else {
                                    if(tmpOldItem.status === VirtualElementOperate.DELETE) {
                                        // 两个相同的节点，当旧节点为delete时，dom元素已经被清除，此时需要设置append而不是Update或者Normal
                                        // 更新所有子节点为append模式， 重新添加元素到dom树
                                        // 此类型场景为了解决新元素的status没有设置成append导致节点无法新增到新的dom树中.
                                        // 新增的结构不需要在往下进行diff运算
                                        newElement.children[index].status = "APPEND";
                                        this.patch(newElement.children[index + offsetIndex], oldElement.children[index], true);
                                    } else {
                                        if(!setAppend) {
                                            newElement.children[index + offsetIndex].status = "NORMAL";
                                        } else {
                                            newElement.children[index + offsetIndex].status = "APPEND";
                                        }
                                        this.patch(newElement.children[index + offsetIndex], oldElement.children[index], setAppend);
                                    }
                                }
                            }
                            newElement.children[index + offsetIndex].dom = tmpOldItem.dom;
                            newElement.children[index + offsetIndex].virtualID = tmpOldItem.virtualID;
                        } else {
                            // 不是相同节点，删除旧节点，增加节点
                            if(newElement.status !== VirtualElementOperate.DELETE) {
                                newElement.children[index + offsetIndex].status = "APPEND";
                            }
                            tmpOldItem.status === VirtualElementOperate.DELETE;
                            delElements.push(tmpOldItem);
                        }
                    } // only match condtion element can do normal checking flow;
                } else {
                    tmpOldItem.status === VirtualElementOperate.DELETE;
                    delElements.push(tmpOldItem);
                }
            });
            newElement.deleteElements = delElements;
        }
    }
    /**
     * 检测有key属性的dom
     * @param checkItem 旧dom对象
     * @param newList 新对象列表
     * @param index 检测位置
     * @param offsetIndex 偏移位置
     */
    private checkSameVirtualElementByKey(checkItem:IVirtualElement​​, newList: IVirtualElement[], index: number, offsetIndex: number): any {
        const checkResult = {
            dom: null,
            find: false,
            offsetIndex
        };
        if(index + offsetIndex < newList.length) {
            for(let i=index + offsetIndex;i<newList.length;i++) {
                const newDom = newList[i];
                // + "" 将number转换为字符串
                if(checkItem.tagName === newDom.tagName && checkItem.props.key + "" === newDom.props.key + "") {
                    // same tagName and same key
                    checkResult.find = true;
                    checkResult.offsetIndex = i - index;
                    checkResult.dom = newDom;
                    break;
                }
            }
        }
        return checkResult;
    }
    /**
     * 对比两个dom是不是相同的dom，相同的dom对比属性有没有变化
     * @param checkItem IVirtualElement 检查对象Dom
     * @param oldItem IVirtualElement 旧对象Dom
     * @return CheckPropsChangeResult 对象检查结果
     */
    private checkSameVirtualElement(checkItem: IVirtualElement, oldItem: IVirtualElement): CheckPropsChangeResult {
        const checkProps = checkItem.props || {};
        const oldProps = oldItem.props || {};
        const checkResult:CheckPropsChangeResult = {};
        const changeProps: any = {};
        if(checkItem.tagName === oldItem.tagName) {
            if(checkItem.tagName !== "input" || (checkItem.tagName === "input" && (checkItem.props||{})["type"] === (oldItem.props||{})["type"])) {
                let isChanged = false;
                if(!/^(text|script|style)$/i.test(checkItem.tagName)) {
                    // isChanged = this.isEqual(checkProps, oldProps);
                    // 检查新旧属性知否有变换，有变化标识为Update，通知Render更新当前dom
                    const checkKeys = Object.keys(checkProps);
                    const oldKeys = Object.keys(oldProps);
                    checkKeys.concat(oldKeys).map((tmpKey:string) => {
                        if(checkProps[tmpKey] !== oldProps[tmpKey]) {
                            isChanged = true;
                            changeProps[tmpKey] = checkProps[tmpKey];
                        }
                    });
                } else {
                    isChanged = checkItem.innerHTML !== oldItem.innerHTML;
                }
                checkResult.sameType = true;
                checkResult.isChanged = isChanged;
            } else {
                checkResult.sameType = false;
            }
        } else {
            checkResult.sameType = false;
        }
        checkResult.changeProps = checkProps;
        return checkResult;
    }
}
