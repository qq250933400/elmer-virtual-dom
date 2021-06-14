export const VirtualElementOperate = {
    APPEND: "APPEND",
    DELETE: "DELETE",
    MOVE: "MOVE", // 其他属性都没有变化，只是位置有变化
    MOVEUPDATE: "MOVEUPDATE", // 位置变化并且属性值有变化，需要移动位置并更新属性
    NORMAL: "NORMAL",
    UPDATE: "UPDATE"
};

export interface IHtmlNodeEventData {
    callBack: Function;
    eventName: string;
    handler: any;
}

export type VirtualElementOperateType = "APPEND" | "DELETE" | "NORMAL" | "UPDATE" | "MOVE" | "MOVEUPDATE";

export interface IVirtualElement {
    /** 用于diff判断使用的临时变量 */
    attrCode?: string;
    children: IVirtualElement[];
    /** diff运算过后变化的属性，新增元素为所有属性 */
    changeAttrs?: any;
    data?: any;
    dataSet?: any;
    /** diff运算以后当前节点下需要删除的节点 */
    deleteElements?: IVirtualElement[];
    /** diff运算以后计算出要删除的属性 */
    deleteAttrs?: string[]; // 需要删除的属性
    /** 渲染过后对应的真实dom节点 */
    dom?:HTMLElement|SVGSVGElement|Element|Text|Comment;
    /** 所有事件 */
    events: any;
    /** 当前节点html代码 */
    innerHTML?: string;
    /** 是否是关闭的节点，用于解析时使用 */
    isClose?: boolean;
    /** 是否做过diff运算 */
    isDiff?: boolean;
    key?: string;
    path: number[];
    props: any;
    /** diff运算过后节点的操作类型 */
    status: VirtualElementOperateType;
    /** 用于运算临时数据存储相关 */
    tagAttrs?: any;
    /** 节点Name */
    tagName: string;
    /** 存储渲染时的Id */
    virtualID?: string;
    /** 是否Content节点 */
    isContent?: boolean;
}
