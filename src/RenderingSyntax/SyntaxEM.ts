import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SyntaxEM extends ASyntax {
    render(event: TypeRenderEvent): TypeRenderResult {
        if(/^em\:/i.test(event.attrKey)) {
            const emTarget = event.target?.replace(/^\{\{/, "")?.replace(/\}\}\s*$/, "");
            const emValue = this.runLimitScript(emTarget, event.component, event.data);
            event.break = true;
            return {
                attrKey: event.attrKey.replace(/^em\:/i, ""),
                hasChange: true,
                result: typeof emValue === "function" ? emValue.bind(event.component) : emValue
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
