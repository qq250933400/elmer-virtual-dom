import { ASyntax } from "./ASyntax";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export class SyntaxText extends ASyntax {
    render(event: TypeRenderEvent):TypeRenderResult {
        if(!/^et\:/i.test(event.attrKey) && !/em\:/.test(event.attrKey) && this.isString(event.target)) {
            const reg = /\{\{([^\\}]{1,})\}\}/g;
            const callbackReg = /\{\{\s*([a-z0-9_.]{1,})\(([^\\}]*)\)\s*\}\}/i;
            const defaultReg = /^\{\{([\s\S]*)\|([\s\S]*)\}\}$/;
            const lambdaReg = /\{\{([\s\S^\{^\}]{1,})\?([\s\S^\{^\}]{1,})\:([\s\S^\{^\}]{1,})\}\}/;
            const logicReg = /\s(eq|neq|seq|sneq|lt|gt|lteq|gteq|&&|\|\||\+|\-|\*|\/|\%)\s/;
            const injectScriptReg = /\s*script\:/i;
            const cTxt = event.target.replace(/^\s*/,"").replace(/\s$/, "");
            const keyMatch = cTxt.match(reg);
            let codeText = event.target;
            let hasChange = false;
            if(keyMatch) {
                keyMatch.map((tmpValue:string) => {
                    const isLogicChecking = logicReg.test(tmpValue);
                    // 普通数据绑定
                    if(/^\{\{\s*[a-z0-9\.\_]{1,}\s*\}\}$/i.test(tmpValue) && !isLogicChecking) {
                        // 普通数据绑定
                        const bindKey = tmpValue.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
                        const optionValue = this.getValue(event.data, bindKey);
                        const bindValue:any = /^(true|false)$/i.test(bindKey) ? /^true$/i.test(bindKey) : (undefined === optionValue || null === optionValue ? this.getValue(event.component, bindKey) : optionValue);
                        if(!this.isFunction(bindValue)) {
                            codeText = cTxt !== tmpValue ? codeText.replace(tmpValue, bindValue) : bindValue;
                        } else {
                            codeText = codeText.replace(tmpValue, bindValue());
                        }
                        hasChange = true;
                    } else if(callbackReg.test(tmpValue)) { // 方法调用绑定数据
                        const callbackMatch = tmpValue.match(callbackReg);
                        if(callbackMatch) {
                            const callbackId = callbackMatch[1].replace(/^this\./, "");
                            const params = callbackMatch[2];
                            const varArr = params.split(",");
                            const action = this.getValue(event.component, callbackId);
                            let rStr = "undefined";
                            if(typeof action === "function") {
                                if(varArr && varArr.length > 0) {
                                    const callbackParams:any[] = [];
                                    varArr.map((tmpItem: string) => {
                                        const varKey = tmpItem.replace(/^\s*/,"").replace(/\s*$/,"");
                                        if((/^"/.test(varKey) && /"$/.test(varKey)) || (/^'/.test(varKey) && /'$/.test(varKey))) {
                                            // 当前参数为字符类型数据
                                            callbackParams.push(varKey);
                                        } else {
                                            // 当前参数是变量从component读取数据
                                            const pV = this.getValue(event.data, varKey) || this.getValue(event.component, varKey);
                                            callbackParams.push(pV);
                                        }
                                    });
                                    rStr = action.apply(event.component, callbackParams);
                                } else {
                                    rStr = action.call(event.component);
                                }
                            }
                            codeText = cTxt !== tmpValue ? codeText.replace(tmpValue, rStr) : rStr;
                            hasChange = true;
                        }
                    } else if(defaultReg.test(tmpValue) && !isLogicChecking) {
                        const df = tmpValue.match(defaultReg);
                        const dVData = /^'/.test(df[2]) && /'$/.test(df[2]) ? df[2].replace(/^'/, "").replace(/'$/, "") : // 单引号标识的字符串
                            /^"/.test(df[2]) && /"$/.test(df[2]) ? df[2].replace(/^"/, "").replace(/"$/, "") : // 双引号标识的字符串
                            this.isNumeric(df[2]) ? (df[2].indexOf(".")>=0 ? parseFloat(df[2]): parseInt(df[2], 10)) : // 数字类型的数据
                            /(true|false)/i.test(df[2]) ? /^true$/.test(df[2]) : this.getValue(event.component, df[2]); // true/false， 类型数据
                        const dV:any = this.getValue(event.component, df[1]) || dVData;
                        codeText = cTxt !== tmpValue ? codeText.replace(tmpValue, dV) : dV;
                        hasChange = true;
                    } else if(lambdaReg.test(tmpValue)) { // Lambda表达式绑定
                        const lbdM = tmpValue.match(lambdaReg);
                        const condition = this.runLimitScript(lbdM[1], event.component, event.data);
                        let lamdbValue;
                        if(condition) {
                            lamdbValue = this.runLimitScript(lbdM[2], event.component, event.data);
                        } else {
                            lamdbValue = this.runLimitScript(lbdM[3], event.component, event.data);
                        }
                        codeText = cTxt !== tmpValue ? codeText.replace(tmpValue, lamdbValue) : lamdbValue;
                        hasChange = true;
                    } else if(isLogicChecking) {
                        const runScript = tmpValue.replace(/^\{\{/, "").replace(/\}\}$/,"");
                        const logicV = this.runLimitScript(runScript, event.component, event.data);
                        codeText = cTxt !== tmpValue ? codeText.replace(tmpValue, logicV) : logicV;
                        hasChange = true;
                    } else if(injectScriptReg.test(tmpValue)) {
                        if(/^href$/.test(event.attrKey)) {
                            hasChange = true;
                            codeText = "Not allow script";
                            // tslint:disable-next-line: no-console
                            console.error("Not all script: " + tmpValue);
                        }
                    }
                });
            }
            event.break = hasChange && event.attrKey !== "...";
            return {
                attrKey: event.attrKey,
                hasChange,
                result: codeText
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
