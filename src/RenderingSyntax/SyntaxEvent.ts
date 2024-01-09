import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SyntaxEvent extends ASyntax {
    render(event: TypeRenderEvent): TypeRenderResult {
        if(/^et\:/i.test(event.attrKey)) {
            const action = this.getValue(event.component, event.target);
            event.break = true;
            return {
                attrKey: event.attrKey.replace(/^et\:/i,""),
                hasChange: typeof action === "function",
                isEvent: true,
                result: typeof action === "function" ? action.bind(event.component) : action
            };
        } else {
            return {
                attrKey: null,
                hasChange: false,
                result: null
            };
        }
    }
}
