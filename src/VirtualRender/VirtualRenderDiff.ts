import { Common } from "elmer-common";
import { IVirtualElement } from "../IVirtualElement";

type TypeCheckSameNodeResult = {
    sameNode: boolean;
    updateProps: any;
    hasChange: boolean;
    deleteProps: string[];
    similarPercent: number;
};

type TypeDiffEvent = {
    dom: IVirtualElement​​;
    domIndex: number;
    lastMatchIndex: number;
    oldParentDom: IVirtualElement​​;
    help?: boolean;
};
type TypeDiffResult = {
    matchDom: IVirtualElement​​;
    matchIndex: number;
};

export class VirtualRenderDiff extends Common {
    /**
     * Diff运算，指定dom查找在旧dom树中的位置，并对比将要做的操作
     * @param {object} event diff参数
     * @param {IVirtualElement​​} event.dom 要做diff运算的节点
     */
    diff(event: ​​TypeDiffEvent): TypeDiffResult {
        const oldParentDom = event.oldParentDom;
        const result:TypeDiffResult = {
            matchDom: null,
            matchIndex: event.lastMatchIndex
        };
        // 设置有key值的dom，只要对key和tagName做判断即可
        // 当旧节点树没有子节点时，则保留新dom节点的状态，不做任何判断
        if(oldParentDom && oldParentDom.children && oldParentDom.children.length > 0) {
            for(let diffIndex = 0;diffIndex<oldParentDom.children.length;diffIndex++) {
                const tmpOld = oldParentDom.children[diffIndex];
                if(!tmpOld?.tagAttrs?.checked) {
                    const checkResult = this.sameNode(event.dom, tmpOld);
                    if(checkResult.sameNode) {
                        
                        if(event.dom.status !== "DELETE") {
                            if(event.lastMatchIndex > diffIndex) {
                                if(tmpOld.status !== "DELETE") {
                                    event.dom.status = checkResult.hasChange ? "MOVEUPDATE" : "MOVE";
                                } else {
                                    event.dom.status = "APPEND";
                                }
                            } else {
                                // 当匹配上的旧节点是DELETE状态的时候，真实dom是匹配不上的，所以需要更改为Append状态
                                // 当旧节点不是DELETE状态是才能根据实际情况定义修改状态为UPDATE或则NORMAL
                                event.dom.status = tmpOld.status !== "DELETE" ? checkResult.hasChange ? "UPDATE" : "NORMAL" : "APPEND";
                            }
                            if(checkResult.hasChange) {
                                event.dom.changeAttrs = checkResult.updateProps;
                                event.dom.deleteAttrs = checkResult.deleteProps;
                            }
                        }
                        result.matchDom = tmpOld;
                        result.matchIndex = diffIndex;
                        this.setValue(tmpOld, "tagAttrs.checked", true);
                        // 已经match上的dom节点标记起来，防止相似节点被重复引用
                        break;
                    } else {
                        if(event.help && tmpOld.tagName === "text") {
                            console.log(checkResult.similarPercent, tmpOld.tagName, event.dom.tagName, diffIndex, event.lastMatchIndex);
                        }
                    }
                }
            }
        }
        return result;
    }
    /**
     * 计算两个字符串的相似度
     * @param s 比较字符串
     * @param t 比较字符串
     * @param toFixed 计算结果保留小数位数
     */
    similar(s: string, t: string, toFixed?: number):number {
        if(this.isString(s) && this.isString(t) && s.length === 0 && t.length === 0) {
            return 1;
        }
        if (!s || !t) {
            return 0;
        }
        const l = s.length > t.length ? s.length : t.length;
        const n = s.length;
        const m = t.length;
        const d = [];
        const f = toFixed || 3;
        let i:number, j:number, si:string, tj:string, cost: number;
        // tslint:disable-next-line: curly
        if (n === 0) return m;
        // tslint:disable-next-line: curly
        if (m === 0) return n;
        for (i = 0; i <= n; i++) {
            d[i] = [];
            d[i][0] = i;
        }
        for (j = 0; j <= m; j++) {
            d[0][j] = j;
        }
        for (i = 1; i <= n; i++) {
            si = s.charAt(i - 1);
            for (j = 1; j <= m; j++) {
                tj = t.charAt(j - 1);
                if (si === tj) {
                    cost = 0;
                } else {
                    cost = 1;
                }
                d[i][j] = this.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            }
        }
        const res = (1 - d[n][m] / l);
        return parseFloat(res.toFixed(f));
    }
    private sameNode(newDom: IVirtualElement​​, oldDom: IVirtualElement): TypeCheckSameNodeResult {
        const result: TypeCheckSameNodeResult = {
            deleteProps: [],
            hasChange: false,
            sameNode: false,
            similarPercent: 0,
            updateProps: {}
        };
        if(newDom.tagName === oldDom.tagName) {
            if(!this.isEmpty(newDom.props.key) && !this.isEmpty(oldDom.props.key)) {
                // 当key不为空时需要key相等才算是相同节点
                if(newDom.props.key === oldDom.props.key) {
                    result.sameNode = true;
                    result.similarPercent = 1;
                }
            } else if(this.isEmpty(newDom.props.key) && this.isEmpty(oldDom.props.key)) {
                // 当key都为空时，只要tagName相同即认为是相同的节点
                // innerHTML相似度达到80以上才算做相同节点
                const smpercent = !/^text$/i.test(newDom.tagName) ? this.similar(newDom.attrCode, oldDom.attrCode) : this.similar(newDom.innerHTML, oldDom.innerHTML);
                // 当两个节点tagName相同，并且都是text节点的时候需要对比innerHTML属性，text节点没有attributes
                result.sameNode = smpercent >= 0.85;
                result.similarPercent = smpercent;
            }
            if(result.sameNode) { // 判断为同一个节点时才对属性做判断，不是同一个节点直接下移判断
                const newProps:any = (newDom.props || {});
                const oldProps: any = (oldDom.props || {});
                const newPropsKeys: any[] = Object.keys(newProps);
                const oldPropsKeys: any[] = Object.keys(oldProps);
                const updateProps: any = {};
                oldPropsKeys.map((tmpKey: string) => {
                    if(newPropsKeys.indexOf(tmpKey)>=0) {
                        // 新，旧节点都有此属性时，属性值不同更新属性为新节点属性旧节点属性丢弃
                        // 新旧节点属性值相等，从updateProps属性删除
                        if(this.isObject(newProps[tmpKey]) && this.isObject(newProps[tmpKey])) {
                            // 两个属性值都是Object对象，使用isEqual比较
                            if(!this.isEqual(newProps[tmpKey], oldProps[tmpKey])) {
                                // 当两个属性值不相等时不需要做更新, 将变化的属性更新到update list
                                result.hasChange = true;
                                updateProps[tmpKey] = newProps[tmpKey];
                            }
                        } else if(!this.isObject(newProps[tmpKey]) && !this.isObject(newProps[tmpKey])) {
                            // 两个属性值都不是Object时直接使用===做比较， 其中一个是Object,另一个不是Object,即不相等，默认放置在要更新的对象上
                            if(newProps[tmpKey] !== oldProps[tmpKey]) {
                                // 当两个属性值相等时不需要做更新
                                result.hasChange = true;
                                updateProps[tmpKey] = newProps[tmpKey];
                            }
                        }
                    } else {
                        // 旧节点属性不在新节点属性列表中，需要添加至要删除的属性列表中
                        result.hasChange = true;
                        result.deleteProps.push(tmpKey);
                    }
                });
                result.updateProps = updateProps;
            }
        }
        return result;
    }
    private min(a:number,b:number, c: number):number {
        return a < b ? (a < c ? a : c) : (b < c ? b : c);
    }
}
