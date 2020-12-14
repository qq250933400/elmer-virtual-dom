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
    attrCode?: string; // 用于diff判断使用
    children: IVirtualElement[];
    changeAttrs?: any;
    data?: any;
    dataSet?: any;
    deleteElements?: IVirtualElement[];
    deleteAttrs?: string[]; // 需要删除的属性
    dom?:HTMLElement|SVGSVGElement|Element|Text|Comment;
    events: any;
    innerHTML?: string;
    isClose?: boolean;
    isDiff?: boolean;
    key?: string;
    path: number[];
    // parentPath: number[];
    props: any;
    status: VirtualElementOperateType;
    tagAttrs?: any;
    tagName: string;
    virtualID?: string;
    isContent?: boolean;
}
