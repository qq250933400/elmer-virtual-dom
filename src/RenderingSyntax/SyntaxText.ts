import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SyntaxText extends ASyntax {
    renderBindText(event: TypeRenderEvent):TypeRenderResult {
        const reg = /\{\{([^\\}]{1,})\}\}/g;
        const cTxt = (event.target || "").replace(/^\s*/,"").replace(/\s$/, "");
        const keyMatch = cTxt.match(reg);
        let codeText = event.target;
        let hasChange = false;
        if(keyMatch) {
            keyMatch.map((tmpValue:string) => {
                if(/^\{\{\s*[a-z0-9\.\_]{1,}\s*\}\}$/i.test(tmpValue)) {
                    // 普通数据绑定
                    const bindKey = tmpValue.replace(/^\{\{/, "").replace(/\}\}$/, "");
                    const optionValue = this.getValue(event.data, bindKey);
                    const bindValue:any = undefined === optionValue || null === optionValue ? this.getValue(event.component, bindKey) : optionValue;
                    if(!this.isFunction(bindValue)) {
                        codeText = cTxt !== tmpValue ? codeText.replace(tmpValue, bindValue) : bindValue;
                    } else {
                        codeText = codeText.replace(tmpValue, bindValue());
                    }
                    hasChange = true;
                } else if(/\{\{\s*([a-z0-9_.]{1,})\(([^\\}]{1,})\)\s*\}\}/i.test(tmpValue)) {
                    const callbackMatch = tmpValue.match(/\{\{\s*([a-z0-9_.]{1,})\(([^\\}]{1,})\)\s*\}\}/i);
                    console.log("__Not Match__",callbackMatch);
                }
            });
        }
        return {
            hasChange,
            result: codeText
        };
    }
}
