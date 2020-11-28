export type TypeRenderActions = "BindText" | "BindAction" | "BindEvent";

export type TypeRenderEvent = {
    component: any;
    data: any;
    target: string;
    type: TypeRenderActions;
    break?: boolean;
};

export type TypeRenderResult = {
    hasChange?: boolean;
    result:any;
};
