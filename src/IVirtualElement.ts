export const VirtualElementOperate = {
    APPEND: "APPEND",
    DELETE: "DELETE",
    NORMAL: "NORMAL",
    UPDATE: "UPDATE"
};

export interface IHtmlNodeEventData {
    callBack: Function;
    eventName: string;
    handler: any;
}

export type VirtualElementOperateType = "APPEND" | "DELETE" | "NORMAL" | "UPDATE";

export interface IVirtualElement {
    children: IVirtualElement[];
    changeAttrs?: any;
    data?: any;
    dataSet?: any;
    delElements?: IVirtualElement[];
    dom?:HTMLElement|SVGSVGElement|Element|Text|Comment;
    events: any[];
    innerHTML?: string;
    isClose?: boolean;
    key?: string;
    path: number[];
    parentPath: number[];
    props: any;
    status: VirtualElementOperateType;
    tagAttrs?: any;
    tagName: string;
    virtualID?: string;
    isContent?: boolean;
}
