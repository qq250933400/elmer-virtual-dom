import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SysntaxAttrs extends ASyntax {
    render(event: TypeRenderEvent):TypeRenderResult {
        if(event.attrKey === "...") {
            const targetKeys = this.isString(event.target) ? event.target.replace(/\s*\{\{\s*/,"").replace(/\s*\}\}\s*/, "") : "";
            // if event.target equal object then that value was transform from SyntaxText
            const exdata = this.isString(event.target) ? (this.getValue(event.data, targetKeys) || this.getValue(event.component, targetKeys)) : event.target;
            let hasChange = false;
            if(exdata && this.isObject(exdata)) {
                event.break = true;
                hasChange = true;
            }
            return {
                attrKey: event.attrKey,
                hasChange,
                result: exdata
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
