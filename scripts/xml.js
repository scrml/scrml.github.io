let xml = scrmljs.xml = {};

xml.nodeToString = function nodeToString(node, indent = "", tab = "  ", newLine = "\r\n") {
    if (node.nodeType == 3) return node.nodeValue;
    if (node.nodeType == 9) return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + nodeToString(node.firstChild, indent, tab, newLine);
    let line = newLine;
    line += indent+"<"+node.nodeName;
    for (let i = 0; i < node.attributes.length; ++i) line += " "+node.attributes[i].name+"=\""+node.attributes[i].value+"\"";
    line += node.childNodes.length == 0? "/>": ">";
    if (node.childNodes.length > 0) {
        let isText = node.childNodes.length == 1;
        if (isText) isText = node.firstChild.nodeType == 3;
        if (isText) line += node.firstChild.nodeValue + "</"+node.nodeName+">";
        else {
            for (let i = 0; i < node.childNodes.length; ++i) line += nodeToString(node.childNodes[i], indent + tab, tab, newLine);
            line += newLine+indent+"</"+node.nodeName+">";
        }
    }
    return line;
}

xml.newDocument = function newDocument(rootName) {
    return document.implementation.createDocument(null, rootName);
}