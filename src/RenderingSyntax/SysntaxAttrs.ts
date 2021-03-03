import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SysntaxAttrs extends ASyntax {
    render(event: TypeRenderEvent):TypeRenderResult {
        if(event.attrKey === "...") {
            const exdata = this.getValue(event.data, event.target) || this.getValue(event.component, event.target);
            if(exdata && this.isObject(exdata)) {
                this.extend(event.vdom.props, exdata, true, ["id","children"]);
                event.break = true;
            }
            delete event.vdom.props[event.attrKey];
            return {
                attrKey: event.attrKey,
                hasChange: false,
                result: null
            };
        } else {
            return {
                attrKey: event.attrKey,
                hasChange: false,
                result: null
            }
        }
    }
}