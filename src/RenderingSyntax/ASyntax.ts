import { Common } from "elmer-common";
import { ISyntax, TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export abstract class ASyntax extends Common implements ISyntax {
    render(event: TypeRenderEvent):TypeRenderResult {
        if(event.type === "BindText") {
            if(typeof this.renderBindText === "function") {
                return this.renderBindText(event);
            }
        }
        return event.data;
    }
    renderBindText?(event: TypeRenderEvent):TypeRenderResult;
}
