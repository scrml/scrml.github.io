let xml = scrmljs.xml = {};

xml.nodeToString = function nodeToString(node, indent = "", tab = "  ", newLine = "\r\n") {
    if (node.nodeType == 3) return node.nodeValue;
    if (node.nodeType == 9) return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + nodeToString(node.firstChild, indent, tab, newLine);
    if (node.nodeType !== 1) return "--  ??  --  "+node.toString()+"  --  ??  --";
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

xml.parser = new DOMParser();

xml.parseDoc = function parseDoc(docLine, mimeType = "text/xml") {return xml.parser.parseFromString(docLine, mimeType)}

xml.stylesheetTransforms = {};

xml.importStylesheet = function importStylesheet(location, finished) {
    let req = new XMLHttpRequest();
    req.addEventListener("load", function() {
        let processor = new XSLTProcessor();
        processor.importStylesheet(req.responseXML);
        xml.stylesheetTransforms[location] = function transform(source) {
            return processor.transformToDocument(source);
        }
        finished();
    });
    req.open("GET", location);
    req.overrideMimeType("text/xml");
    req.send();
}

xml.getRoot = function getRoot(node) {
    if (node.nodeType === 9) return node.firstChild;
    return node;
}

xml.trim = function trim(node) {
    if (node.nodeType === 9) return trim(node.firstChild);
    if (node.nodeType !== 1) return;
    let childNode, nextNode = node.firstChild;
    while (childNode = nextNode) {
        nextNode = childNode.nextSibling;
        if (childNode.nodeType === 3 && childNode.nodeValue.trim() === "") childNode.parentElement.removeChild(childNode);
        else if (childNode.nodeType === 1) xml.trim(childNode);
    }
}

xml.serializer = new XMLSerializer();

// Take user-inputted TeX and do necessary escaping to make it allowable as an XML attribute. Requires DOM access.
xml.stringToAtt = function texToAtt(line) {
    if (!xml.stringConverterDoc) xml.stringConverterDoc = xml.newDocument("convert");
    let doc = xml.stringConverterDoc;
    let element = doc.createElement("x");
    element.setAttribute("x", line);
    let returner = xml.serializer.serializeToString(element);
    return returner.substring(6, returner.length - 3);
}