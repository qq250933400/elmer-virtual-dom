import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SyntaxEvent extends ASyntax {
    render(event: TypeRenderEvent): TypeRenderResult {
        console.log("Render-Event");
        return {
            hasChange: false,
            result: null
        };
    }
}
