import { Common } from "elmer-common";
import { IVirtualElement } from "../IVirtualElement";

type TypeCheckSameNodeResult = {
    sameNode: boolean;
    updateProps: any;
    hasChange: boolean;
    deleteProps: string[];
};

export class VirtualRenderDiff extends Common {
    /**
     * diff运算
     * @param targetDom 当前执行diff运算的dom节点
     * @param newDom 当前执行diff运算父级新dom树
     * @param oldDom 当前执行diff运算父级旧dom树
     */
    diff(targetDom: IVirtualElement​​,newDom:IVirtualElement​​, oldDom:IVirtualElement​​): void {
        if(targetDom.status !== "DELETE") { // 已经判定为删除的节点不需要进行diff运算
            // 设置有key值的dom，只要对key和tagName做判断即可
            if(oldDom && oldDom.children && oldDom.children.length > 0) {
                let matchNode = false;
                for(const tmpOld of oldDom.children) {
                    if(!tmpOld?.tagAttrs?.checked) {
                        const checkResult = this.sameNode(targetDom, tmpOld);
                        if(checkResult.sameNode) {
                            if(checkResult.hasChange) {
                                targetDom.status = tmpOld.path === targetDom.parentPath ? "UPDATE" : "MOVEUPDATE";
                                targetDom.changeAttrs = checkResult.updateProps;
                                targetDom.delProps = checkResult.deleteProps;
                            } else {
                                targetDom.status = tmpOld.path === targetDom.parentPath ? "NORMAL" : "MOVE";
                            }
                            matchNode = true;
                            this.setValue(tmpOld, "tagAttrs.checked", true);
                            break;
                        }
                    }
                }
            } else {
                // 旧dom节点为空，新节点状态修改为append
                targetDom.status = "APPEND";
            }
        }
    }
    /**
     * 计算两个字符串的相似度
     * @param s 比较字符串
     * @param t 比较字符串
     * @param toFixed 计算结果保留小数位数
     */
    similar(s: string, t: string, toFixed?: number):number {
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
            updateProps: {}
        };
        if(newDom.tagName === oldDom.tagName) {
            if(!this.isEmpty(newDom.props.key) && !this.isEmpty(oldDom.props.key)) {
                // 当key不为空时需要key相等才算是相同节点
                if(newDom.props.key === oldDom.props.key) {
                    result.sameNode = true;
                }
            } else if(this.isEmpty(newDom.props.key) && this.isEmpty(oldDom.props.key)) {
                // 当key都为空时，只要tagName相同即认为是相同的节点
                result.sameNode = true;
            }
            if(result.sameNode) { // 判断为同一个节点时才对属性做判断，不是同一个节点直接下移判断
                const newProps:any = (newDom.props || {});
                const oldProps: any = (oldDom.props || {});
                const newPropsKeys: any[] = Object.keys(newProps);
                const oldPropsKeys: any[] = Object.keys(oldProps);
                oldPropsKeys.map((tmpKey: string) => {
                    if(newPropsKeys.indexOf(tmpKey)>=0) {
                        // 新，旧节点都有此属性时，属性值不同更新属性为新节点属性旧节点属性丢弃
                        // 新旧节点属性值相等，从updateProps属性删除
                        if(this.isObject(newProps[tmpKey]) && this.isObject(newProps[tmpKey])) {
                            // 两个属性值都是Object对象，使用isEqual比较
                            if(this.isEqual(newProps[tmpKey], oldProps[tmpKey])) {
                                // 当两个属性值相等时不需要做更新
                                delete newProps[tmpKey];
                            } else {
                                result.hasChange = true;
                            }
                        } else if(!this.isObject(newProps[tmpKey]) && !this.isObject(newProps[tmpKey])) {
                            // 两个属性值都不是Object时直接使用===做比较， 其中一个是Object,另一个不是Object,即不相等，默认放置在要更新的对象上
                            if(newProps[tmpKey] === oldProps[tmpKey]) {
                                // 当两个属性值相等时不需要做更新
                                delete newProps[tmpKey];
                            } else {
                                result.hasChange = true;
                            }
                        }
                    } else {
                        // 旧节点属性不在新节点属性列表中，需要添加至要删除的属性列表中
                        result.hasChange = true;
                        result.deleteProps.push(tmpKey);
                    }
                });
                result.updateProps = newProps;
            }
        }
        return result;
    }
    private min(a:number,b:number, c: number):number {
        return a < b ? (a < c ? a : c) : (b < c ? b : c);
    }
}
