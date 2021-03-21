import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SysntaxAttrs extends ASyntax {
    render(event: TypeRenderEvent):TypeRenderResult {
        if(event.attrKey === "...") {
            const targetKeys = this.isString(event.target) ? event.target.replace(/\s*\{\{\s*/,"").replace(/\s*\}\}\s*/, "") : "";
            // if event.target equal object then that value was transform from SyntaxText
            const exdata = this.isString(event.target) ? (this.getValue(event.data, targetKeys) || this.getValue(event.component, targetKeys)) : event.target;
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
            };
        }
    }
}
