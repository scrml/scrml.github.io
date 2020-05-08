var gui = thisFileDefines = {};

// calls doc to create element, applies attributes in {attName: attValue} syntax, inserts it as a child to loadHere, and returns the element
gui.elementDoc = function elementDoc(loadHere = null, doc, element, attributes = {}) {
    let returner = doc.createElement(element);
    for (let att in attributes) returner.setAttribute(att, attributes[att]);
    if (loadHere) loadHere.appendChild(returner);
    return returner;
}

// calls document to create element, applies attributes in {attName: attValue} syntax, and returns the element
gui.element = function element(loadHere, element, attributes) {return gui.elementDoc(loadHere, document, element, attributes)}

// calls doc to create a text node with value text, returns the node
gui.textDoc = function textDoc(loadHere = null, doc, text) {
    let returner = doc.createTextNode(text);
    if (loadHere) loadHere.appendChild(returner);
    return returner;
}

// calls document to create a text node with value text, returns the node
gui.text = function text(loadHere, text) {return gui.textDoc(loadHere, document, text)}