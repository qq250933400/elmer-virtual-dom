export type TypeRenderActions = "BindText" | "BindAction" | "BindEvent";

export type TypeRenderEvent = {
    attrKey?: string;
    component: any;
    data: any;
    target: string;
    break?: boolean;
};

export type TypeRenderResult = {
    hasChange?: boolean;
    result:any;
    attrKey: string;
    isEvent?: boolean;
};
