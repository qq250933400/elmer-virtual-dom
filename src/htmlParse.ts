import { Common } from "elmer-common";
import { IVirtualElement, VirtualElementOperate } from "./IVirtualElement";

type ReadAttrValue = {
    value: string;
    htmlCode: string;
};
type ReadAttrResult = {
    attrs: any;
    events: any;
    htmlCode: string;
};

export class HtmlParse extends Common {
    static className = "HtmlParse";
    private autoCloseTagList:RegExp[] = [
        /^input$/i,/^br$/i,/^hr$/i,/^img$/i,/^meta$/i,/^\!DOCTYPE$/i
    ];
    private rootNodes:any = {};
    parse(htmlCode: string, selector?: string): IVirtualElement {
        const result:IVirtualElement = {
            children: [],
            data: {},
            events: [],
            path:[],
            props: {},
            status: "APPEND",
            tagName: selector || "VirtualRoot"
        };
        const nodeId = this.getRandomID();
        this.rootNodes[nodeId] = result;
        this.parseNode(htmlCode, result, nodeId);
        delete this.rootNodes[nodeId];
        return result;
    }
    /**
     * 根据节点路径查找Node节点
     * @param rootNodeKey string 根路径ID
     * @param path Array<number> node路径
     */
    public getNodeByPath(rootNode: IVirtualElement, path: string[]):IVirtualElement | null {
        if(rootNode) {
            let checkNode = rootNode;
            let checkIndex = 0;
            let checkIndexValue = path[checkIndex];
            while(checkNode && checkNode.children[checkIndexValue]) {
                checkNode = checkNode.children[checkIndexValue];
                checkIndex += 1;
                checkIndexValue = path[checkIndex];
            }
            if(checkIndex === path.length) {
                return checkNode;
            }
        }
        return null;
    }
    /**
     * 解析dom节点
     * @param htmlCode 解析代码
     * @param parentNode 父元素
     * @param rootNodeKey 保存数据ID
     */
    private parseNode(htmlCode: string, parentNode:IVirtualElement, rootNodeKey: string): void {
        if(!this.isEmpty(htmlCode)) {
            // 将代码前后空格去掉，在做判断，此时可判读开始的代码段是文本还是dom节点，文本内容保留空格，dom节点去除换行符
            let checkCode = htmlCode.replace(/^([\r\n]*)/," ");
            checkCode = checkCode.replace(/^\s*/,"");
            if(!this.isEmpty(checkCode)) {
                if(/^\</.test(checkCode)) {
                    if(/^(\<{2,})/.test(checkCode)) {
                        throw new Error("html代码错误有重复的标识符号：<");
                    } else if (/^\-\-\>/.test(checkCode)) {
                        throw new Error("注释标签错误，不允许以结束标签开始。");
                    } else {
                        if(/^\<\!--/.test(checkCode)) {
                            const commentNode = this.parseComment(checkCode,parentNode);
                            let leftCode = "";
                            parentNode.children.push(commentNode);
                            leftCode = checkCode.replace(commentNode.innerHTML, "").replace(/^\<\!--/, "").replace(/^\-\-\>/, "");
                            this.parseNode(leftCode, parentNode, rootNodeKey);
                        } else {
                            this.parseNextNode(checkCode, parentNode, rootNodeKey);
                        }
                    }
                } else {
                    // 解析到文本节点，取出文本，剩余代码文本继续解析
                    let lStart = htmlCode.indexOf("<");
                    let txt = lStart > 0 ? htmlCode.substr(0, lStart) : "";
                    let leftHtmlCode = htmlCode.substr(lStart);
                    parentNode.children.push({
                        children: [],
                        events: [],
                        innerHTML: txt,
                        isClose: true,
                        path:[...parentNode.path, parentNode.children.length],
                        props: {},
                        status: "APPEND",
                        tagName: "text"
                    });
                    !this.isEmpty(leftHtmlCode) && this.parseNode(leftHtmlCode, parentNode, rootNodeKey);
                    lStart = null;
                    txt = null;
                    leftHtmlCode = null;
                }
            }
            checkCode = null;
        }
    }
    /**
     * 解析注释标签，注释标签不能嵌套
     * @param htmlCode 要解析的代码
     * @param parentNode 父元素
     */
    private parseComment(htmlCode:string, parentNode:IVirtualElement):IVirtualElement {
        let endTagIndex = htmlCode.indexOf("-->");
        const result:IVirtualElement = {
            children: [],
            data: {},
            events: [],
            innerHTML: "",
            isClose: true,
            path:[...parentNode.path, parentNode.children.length],
            props: {},
            status: "APPEND",
            tagName: "<!--"
        };
        if(endTagIndex>0) {
            let commentCode = htmlCode.substr(0, endTagIndex + 3);
            if(commentCode.substr(4).indexOf("<!--")>0) {
                throw new Error("注释标签不允许嵌套");
            }
            if(!this.isEmpty(commentCode)) {
                commentCode = commentCode.replace(/^\<\!--/, "").replace(/\-\-\>$/, "");
            }
            result.innerHTML = commentCode;
            commentCode = null;
        }
        endTagIndex = null;
        return result;
    }
    /**
     * 解析下一个dom节点
     * @param htmlCode string 解析代码文本
     * @param parentNode IVirtualElement 父节点
     * @param rootNodeKey string 根节点ID
     */
    private parseNextNode(htmlCode: string, parentNode:IVirtualElement, rootNodeKey: string): void {
        const tagReg = /^\<([a-z0-9\_\-]*)\s/i;
        const tagNoAttrReg = /^\<([a-z0-9\_\-]*)(([\/]{0,1}\>)|\>)/i;
        if(tagReg.test(htmlCode) || tagNoAttrReg.test(htmlCode)) {
            const tagMatch = htmlCode.match(tagReg);
            if(tagMatch) {
                let tagName = tagMatch[1];
                let code = htmlCode.replace(tagReg, "");
                let autoIndex = code.indexOf("/>");
                let closeIndex = code.indexOf(">");
                let attrCode = autoIndex> 0 && autoIndex<closeIndex ? code.substr(0, autoIndex) : code.substr(0, closeIndex);
                let mLeftCode = autoIndex> 0 && autoIndex<closeIndex ? code.substr(autoIndex) : code.substr(closeIndex);
                attrCode = attrCode.replace(/\r\n/g," ");
                code = attrCode + mLeftCode;
                let attrsResult = this.readAttrs(code);
                let leftCode:string = attrsResult.htmlCode;
                let isAutoClose = this.checkAutoClose(leftCode, tagName);
                let newNode:IVirtualElement = {
                    children: [],
                    data: {},
                    events: attrsResult.events,
                    innerHTML: "",
                    isClose: isAutoClose,
                    path:[...parentNode.path, parentNode.children.length],
                    props: attrsResult.attrs,
                    status: "APPEND",
                    tagName
                };
                leftCode = leftCode.replace(/^\>/, "").replace(/^\/\>/,"").replace(/^(\r\n)*/,"");
                parentNode.children.push(newNode);
                if(isAutoClose) {
                    this.parseNode(leftCode, parentNode, rootNodeKey);
                } else {
                    this.parseNode(leftCode, newNode, rootNodeKey);
                }
                tagName = null;
                code = null;
                attrsResult = null;
                autoIndex = null;
                closeIndex = null;
                isAutoClose = null;
                newNode = null;
                mLeftCode = null;
            } else {
                // 没有属性的标签，示例： <ul />,<img/>
                let noAttrMatch = htmlCode.match(tagNoAttrReg);
                if(noAttrMatch) {
                    let tagName = noAttrMatch[1];
                    let leftCode = htmlCode.replace("<" + tagName,"");
                    let isAutoClose = this.checkAutoClose(leftCode, tagName);
                    let newNode:IVirtualElement = {
                        children: [],
                        data: {},
                        events: [],
                        innerHTML: "",
                        isClose: isAutoClose,
                        path:[...parentNode.path, parentNode.children.length],
                        props: {},
                        status: "APPEND",
                        tagName
                    };
                    leftCode = leftCode.replace(/^\>/, "").replace(/^\/\>/, "").replace(/^(\r\n)*/, "");
                    parentNode.children.push(newNode);
                    if(isAutoClose) {
                        this.parseNode(leftCode, parentNode,rootNodeKey);
                    } else {
                        this.parseNode(leftCode, newNode, rootNodeKey);
                    }
                    tagName = null;
                    leftCode = null;
                    isAutoClose = null;
                    newNode = null;
                }
                noAttrMatch = null;
            }
        } else {
            const endTagReg = /^\<\/\s*([a-z0-9\_\-]*)\s*\>/i;
            const endTagMatch = htmlCode.match(endTagReg);
            if(endTagMatch) {
                let tagName = endTagMatch[1];
                let leftCode = htmlCode.replace(endTagReg, "");
                if(this.checkEndTag(tagName, leftCode, parentNode)) {
                    let parentNodePath:any[] = JSON.parse(JSON.stringify(parentNode.path));
                    let nextParentNode;
                    parentNodePath.splice(parentNodePath.length - 1, 1);
                    nextParentNode = this.getNodeByPath(this.rootNodes[rootNodeKey],parentNodePath);
                    this.parseNode(leftCode, nextParentNode, rootNodeKey);
                    parentNode.isClose = true;
                    nextParentNode = null;
                    parentNodePath = null;
                }
                tagName = null;
                leftCode = null;
            } else {
                if(/^\s\<\!DOCTYPE/.test(htmlCode)) {
                    let leftIndex = htmlCode.indexOf(">");
                    let leftCode  = leftIndex > 0 ? htmlCode.substr(leftIndex + 1) : "";
                    let newNode:IVirtualElement = {
                        children: [],
                        data: {},
                        events: [],
                        innerHTML: "",
                        isClose: true,
                        path:[...parentNode.path, parentNode.children.length],
                        props: {},
                        status: "APPEND",
                        tagName: "!DOCTYPE"
                    };
                    parentNode.children.push(newNode);
                    this.parseNode(leftCode, parentNode, rootNodeKey);
                    leftIndex = null;
                    leftCode = null;
                    newNode = null;
                } else {
                    throw new Error("Html代码错误无效的开始标签" + htmlCode);
                }
            }
        }
    }
    /**
     * 检查标签是否结束
     * @param tagName 标签名
     * @param htmlCode 解析代码
     * @param parentNode 父元素
     */
    private checkEndTag(tagName: string, htmlCode: string, parentNode:IVirtualElement): boolean {
        if(parentNode.tagName === tagName) {
            let innerHTML = "";
            parentNode.isClose = true;
            parentNode.children.map((tmpItem:IVirtualElement) => {
                if(!this.isEmpty(tmpItem.tagName)) {
                    let attrHtml = "";
                    let attrArr = [];
                    if(tmpItem.props) {
                        // tslint:disable-next-line:forin
                        for(const key in tmpItem.props) {
                            let attrValue: string = tmpItem.props[key];
                            attrValue = attrValue.replace(/\"/g,"\"");
                            attrArr.push(key + "=\"" + attrValue + "\"");
                        }
                    }
                    attrHtml = attrArr.join(" ");
                    innerHTML += "<" + tmpItem.tagName + " " + attrHtml + ">" + tmpItem.innerHTML + "</" + tmpItem.tagName + ">";
                    attrArr = null;
                } else {
                    innerHTML += tmpItem.innerHTML;
                }
            });
            parentNode.innerHTML = innerHTML;
            return true;
        }
        return false;
    }
    /**
     * 解析属性
     * @param htmlCode 解析代码
     * @param valChar 属性值标识符号
     * @returns ReadAttrValue 属性值内容
     */
    private readAttrValue(htmlCode: string, valChar?: string): ReadAttrValue {
        const result:ReadAttrValue = {
            htmlCode,
            value: ""
        };
        let checkCode = htmlCode;
        checkCode = valChar === undefined || valChar === null ? htmlCode.replace(/^\s*/, "") : htmlCode;
        if(checkCode.startsWith("'")) { // 已单引号包含值
            checkCode = checkCode.substr(1);
            let splitIndex = checkCode.indexOf("\\'");
            let charIndex = checkCode.indexOf("'");
            if(splitIndex < charIndex && splitIndex >= 0) {
                // 单引号内容包含转义的单引号\'
                result.value = checkCode.substr(0, splitIndex);
                checkCode = checkCode.substr(splitIndex + 2);
                let exResult: ReadAttrValue = !checkCode.startsWith("'") ? this.readAttrValue(checkCode, "'") : {
                    htmlCode: checkCode,
                    value: ""
                };
                result.value += "\\'" + exResult.value;
                result.htmlCode = exResult.htmlCode;
                exResult = null;
            } else {
                if(charIndex > 0) {
                    result.value = checkCode.substr(0, charIndex);
                    result.htmlCode = checkCode.substr(charIndex + 1);
                } else {
                    result.value = "";
                    result.htmlCode = checkCode.substr(1);
                }
            }
            splitIndex = null;
            charIndex = null;
        } else if(checkCode.startsWith('"')) {
            checkCode = checkCode.substr(1);
            let splitIndex = checkCode.indexOf('\\"');
            let charIndex = checkCode.indexOf('"');
            if(splitIndex < charIndex && splitIndex >= 0) {
                // 双引号内容包含转义的双引号\"
                result.value = checkCode.substr(0, splitIndex);
                checkCode = checkCode.substr(splitIndex + 2);
                let exResult: ReadAttrValue = !checkCode.startsWith('"') ? this.readAttrValue(checkCode, '"') : {
                    htmlCode: checkCode,
                    value: ""
                };
                result.value += '\\"' + exResult.value;
                result.htmlCode = exResult.htmlCode;
                exResult = null;
            } else {
                if(charIndex > 0) {
                    result.value = checkCode.substr(0, charIndex);
                    result.htmlCode = checkCode.substr(charIndex + 1);
                } else {
                    result.value = "";
                    result.htmlCode = checkCode.substr(1);
                }
            }
            splitIndex = null;
            charIndex = null;
        } else {
            if(valChar === "'") {
                const splitIndex = checkCode.indexOf("\\'");
                const charIndex = checkCode.indexOf("'");
                if(splitIndex<charIndex && splitIndex >= 0) {
                    result.value = checkCode.substr(0, splitIndex);
                    checkCode = checkCode.substr(splitIndex + 2);
                    let exResult: ReadAttrValue = !checkCode.startsWith("'") ? this.readAttrValue(checkCode, "'") : {
                        htmlCode: checkCode,
                        value: ""
                    };
                    result.value += "\\'" + exResult.value;
                    result.htmlCode = exResult.htmlCode;
                    exResult = null;
                } else {
                    if(charIndex > 0) {
                        result.value = checkCode.substr(0, charIndex);
                        result.htmlCode = checkCode.substr(charIndex + 1);
                    } else {
                        result.value = "";
                        result.htmlCode = checkCode.substr(1);
                    }
                }
            } else if(valChar === '"') {
                let splitIndex = checkCode.indexOf('\\"');
                let charIndex = checkCode.indexOf('"');
                if(splitIndex < charIndex && splitIndex >= 0) {
                    // 双引号内容包含转义的双引号\"
                    result.value = checkCode.substr(0, splitIndex);
                    checkCode = checkCode.substr(splitIndex + 2);
                    let exResult: ReadAttrValue = !checkCode.startsWith('"') ? this.readAttrValue(checkCode, '"') : {
                        htmlCode: checkCode,
                        value: ""
                    };
                    result.value += '\\"' + exResult.value;
                    result.htmlCode = exResult.htmlCode;
                    exResult = null;
                } else {
                    if(charIndex > 0) {
                        result.value = checkCode.substr(0, charIndex);
                        result.htmlCode = checkCode.substr(charIndex + 1);
                    } else {
                        result.value = "";
                        result.htmlCode = checkCode.substr(1);
                    }
                }
                splitIndex = null;
                charIndex = null;
            }
        }
        return result;
    }
    /**
     * 读取标签属性
     * @param htmlCode string 解析代码文本
     * @return ReadAttrResult 返回属性内容
     */
    private readAttrs(htmlCode: string): ReadAttrResult {
        let attrKeyReg = /^([a-z0-9\-_\.\:]{1,})\s*=/i;
        let extAttrKeyReg = /^\.\.\.([[a-z0-9\-_\.]*)(\s|\r\n)/i;
        let onlyAttrKeyReg = /^([a-z0-9\-_\.\:]{1,})(\s|\r\n)/i;
        let checkCode: string = htmlCode;
        const result:ReadAttrResult = {
            attrs: {},
            events: {},
            htmlCode: ""
        };
        checkCode = checkCode.replace(/^[\r\n\s]*/, "");
        while(attrKeyReg.test(checkCode) || extAttrKeyReg.test(checkCode) || onlyAttrKeyReg.test(checkCode)) {
            if(attrKeyReg.test(checkCode)) {
                let attrMatch = checkCode.match(attrKeyReg);
                let attrKey = attrMatch[1];
                let attrValueResult:ReadAttrValue;
                checkCode = checkCode.replace(attrKeyReg, "").replace(/^\s*/,"");
                attrValueResult = this.readAttrValue(checkCode);
                result.attrs[attrKey] = attrValueResult.value;
                checkCode = attrValueResult.htmlCode;
                checkCode = checkCode.replace(/^[\r\n\s]*/, "");
                attrMatch = null;
                attrKey = null;
            } else if(extAttrKeyReg.test(checkCode)) {
                let extAttrMatch =  checkCode.match(extAttrKeyReg);
                result.attrs["..."] = extAttrMatch[1];
                checkCode = checkCode.replace(extAttrKeyReg, "").replace(/^[\r\n\s]*/, "");
                extAttrMatch = null;
            } else if(onlyAttrKeyReg.test(checkCode)) {
                let onlyAttrKeyMatch =  checkCode.match(onlyAttrKeyReg);
                result.attrs[onlyAttrKeyMatch[1]] = onlyAttrKeyMatch[1];
                checkCode = checkCode.replace(onlyAttrKeyReg, "").replace(/^[\r\n\s]*/, "");
                onlyAttrKeyMatch = null;
            }
        }
        result.htmlCode = checkCode;
        attrKeyReg = null;
        extAttrKeyReg = null;
        onlyAttrKeyReg = null;
        return result;
    }
    /**
     * 检查标签是否关闭,匹配关闭节点
     * @param htmlCode string 检查代码
     * @param tagName string 标签名称
     */
    private checkAutoClose(htmlCode: string, tagName: string): boolean {
        for(const reg of this.autoCloseTagList) {
            if(reg.test(tagName)) {
                return true;
            }
        }
        return /^\s*\/\>/.test(htmlCode);
    }
}
