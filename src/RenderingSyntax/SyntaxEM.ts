import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SyntaxEM extends ASyntax {
    render(event: TypeRenderEvent): TypeRenderResult {
        if(/^em\:/i.test(event.attrKey)) {
            const emValue = this.runLimitScript(event.target, event.component, event.data);
            return {
                attrKey: event.attrKey.replace(/^em\:/i, ""),
                hasChange: true,
                result: emValue
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
