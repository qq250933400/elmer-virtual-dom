import { Common } from "elmer-common";
import { TypeRenderEvent, TypeRenderResult } from "./ISyntax";

export type TypeGetStringVarResult = {
    var: string;
    code: string;
    hasVar: boolean;
};

export abstract class ASyntax extends Common {
    abstract render(event: TypeRenderEvent):TypeRenderResult;
    readVarString(str: string): TypeGetStringVarResult {
        let myText = str;
        let result = "";
        let hasVar = false;
        if(/^\s*"/.test(str)) {
            const char = String.fromCharCode(255);
            const nstr:string = str.replace(/\\"/g, char);
            const strM = nstr.match(/^"([\s\S\\"^"]*?)"/);
            if(strM) {
                const varStr = strM[1];
                const leftStr = str.substr(strM[0].length);
                result = varStr.split(char).join('\"');
                myText = leftStr.split(char).join('\"');
                hasVar = true;
            }
        } else if(/^\s*'/.test(str)) {
            const char = String.fromCharCode(255);
            const nstr:string = str.replace(/\\'/g, char);
            const strM = nstr.match(/^'([\s\S\\'^']*?)'/);
            if(strM) {
                const varStr = strM[1];
                const leftStr = str.substr(strM[0].length);
                result = varStr.split(char).join("\'");
                myText = leftStr.split(char).join("\'");
                hasVar = true;
            }
        }
        return {
            code: myText,
            hasVar,
            var: result
        };
    }
    /**
     * 运行单行判断脚本
     * @param code 脚本代码
     * @param component 当前绑定组件用于读取指定数据
     * @param optionData 当前绑定过程读取可选数据
     */
    runLimitScript(code: string, component: any, optionData: any): any {
        const orChar = String.fromCharCode(255); // 替换符号|| 符号
        const andChar = String.fromCharCode(254); // 替换 && 符号
        const xOrChar = String.fromCharCode(253); // 替换 | 符号
        const xAndChar = String.fromCharCode(252); // 替换 & 符号
        const varCode = (code || "").replace(/^\s*/,"").replace(/\s*$/,"").replace(/\|\|/g, orChar).replace(/\&\&/g, andChar).replace(/\|/, xOrChar).replace(/\&/, xAndChar);
        const varArr = varCode.split(/[+\-\*\/%\?\:]/);
        const varArrSplitArr = varCode.match(/([+\-\*\/%\?\:])/g);
        const logicChars = {
            eq: "==",
            gt: ">",
            gteq: ">=",
            lt: "<",
            lteq: "<=",
            neq: "!=",
            seq: "===",
            sneq: "!=="
        };
        const missionId = this.guid();
        const logicVar = {};
        const logicCodeArr = [];
        let index = 0;
        let mIndex = 0;
        const varBindFunc = (xcode: string): void => {
            const tmpCode = xcode.split(orChar).join("||").split(andChar).join("&&").split(xOrChar).join("|").split(xAndChar).join("&");
            const varKey = missionId + "_" + index;
            if(tmpCode === "||" || tmpCode === "&&" || tmpCode === "|" || tmpCode === "&") {
                logicCodeArr.push(tmpCode);
            } else {
                if(/^"/.test(tmpCode) && /"$/.test(tmpCode)) {
                    logicVar[varKey] = tmpCode.replace(/^"/, "").replace(/"$/, "");
                    logicCodeArr.push(`obj["${varKey}"]`);
                } else if(/^'/.test(tmpCode) && /'$/.test(tmpCode)) {
                    logicVar[varKey] = tmpCode.replace(/^'/, "").replace(/'$/, "");
                    logicCodeArr.push(`obj["${varKey}"]`);
                } else if(logicChars[tmpCode]) {
                    logicCodeArr.push(logicChars[tmpCode]);
                } else if(/true/i.test(tmpCode) || /false/i.test(tmpCode)) {
                    logicCodeArr.push(tmpCode);
                } else if(/^[0-9]{1,}$/.test(tmpCode)) {
                    logicCodeArr.push(parseInt(tmpCode, 10));
                } else if(/^[0-9]{1,}\.[0-9]{1,}$/.test(tmpCode)) {
                    logicCodeArr.push(parseFloat(tmpCode));
                } else {
                    if(tmpCode !== " ") {
                        const optionValue = optionData ? this.getValue(optionData, tmpCode) : undefined;
                        logicVar[varKey] = undefined === optionValue ? this.getValue(component, tmpCode) : optionValue;
                        logicCodeArr.push(`obj["${varKey}"]`);
                    }
                }
            }
            index += 1;
        };
        varArr.map((xcode: string) => {
            const tmpCode = xcode.replace(/^\s{1,}/,"").replace(/\s{1,}$/,"");
            const tmpSplitArr = tmpCode.split(" ");
            if(tmpSplitArr && tmpSplitArr.length > 1) {
                tmpSplitArr.map((itemCode: string) => {
                    varBindFunc(itemCode);
                });
            } else {
                varBindFunc(tmpCode);
            }
            if(varArrSplitArr && !this.isEmpty(varArrSplitArr[mIndex]) && varArrSplitArr[mIndex] !== " "){
                logicCodeArr.push(varArrSplitArr[mIndex]); // 将分割语句字符还原回去
            }
            mIndex += 1;
        });
        const runCode = logicCodeArr.join(" ");
        const runFunc = new Function("obj", `return ${runCode};`);
        return runFunc(logicVar);
    }
}
