scrmljs.loadCSS("styles/gui.css");

let scriptLoader = scrmljs.scriptLoader,
    filePrefix = scrmljs.filePrefix,
    emptyFunction = scrmljs.emptyFunction,
    isAncestorOf = scrmljs.isAncestorOf,
    identityFunction = scrmljs.identityFunction;

let gui = scrmljs.gui = {
    log: scrmljs.emptyFunction,
    defaultOptions: {},
    allModules: ["animations", "buttons", "clipboard", "datalists", "deleteBundle", "details", "disabler", "focuseds", "inputs", "linkeds", "loadingScreen", "messages", "popup", "screens", "tables", "textWidth"]
}

if (!scriptLoader.guiModulesTier) {
    gui.log("setting up module tier");
    gui.moduleSetups = {};
    scriptLoader.guiModulesTier = scriptLoader.newTier("guiModules", function(item) {
        gui.log("guiModule tier processing " + item.name);
        if (gui.moduleSetups[item.name]) gui.moduleSetups[item.name]();
        scriptLoader.markComplete(item, scriptLoader.guiModulesTier);
    });
}

gui.elementDoc = function elementDoc(doc, type, loadHere, atts = [], insertBefore = null) {
    let returner = doc.createElement(type);
    if (loadHere) loadHere.insertBefore(returner, insertBefore);
    for (let i = 0; i < atts.length; i += 2) returner.setAttribute(atts[i], atts[i+1]);
    return returner;
}

gui.element = function element(type, loadHere, atts, insertBefore) {return gui.elementDoc(document, type, loadHere, atts, insertBefore)}

gui.elementReplace = function elementReplace(type, loadHere, replaceThis, atts) {
    let returner = gui.element(type, loadHere, atts, replaceThis);
    loadHere.removeChild(replaceThis);
    returner.replaced = replaceThis;
    return returner;
}

gui.text = function text(line, loadHere) {
    let returner = document.createTextNode(line);
    if (loadHere) loadHere.appendChild(returner);
    return returner;
}

gui.textShell = function textShell(line, type, loadHere, atts, insertBefore) {
    let returner = gui.element(type, loadHere, atts, insertBefore);
    gui.text(line, returner);
    return returner;
}

gui.orphan = function orphan(element) {
    if (element.parentElement) element.parentElement.removeChild(element);
}

gui.replace = function replace(newElement, oldElement) {
    if (oldElement.parentNode) oldElement.parentNode.replaceChild(newElement, oldElement);
    else gui.orphan(newElement);
}

gui.swap = function swap(a, b) {
    let ap = a.parentElement, an = a.nextSibling, bp = b.parentElement, bn = b.nextSibling;
    if (ap) ap.insertBefore(b, an); else gui.orphan(b);
    if (bp) bp.insertBefore(a, bn); else gui.orphan(a);
}

gui.filicide = function filicide(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
}

gui.removeLayer = function removeLayer(element) {
    if (!element.parentNode) return gui.filicide(element);
    while (element.firstChild) element.parentNode.insertBefore(element.firstChild, element);
    gui.orphan(element);
}

gui.insertBeneath = function insertBeneath(parent, layer) {
    if (isAncestorOf(parent, layer)) gui.removeLayer(layer);
    else if (isAncestorOf(layer, parent)) gui.removeLayer(parent);
    while (parent.firstChild) layer.appendChild(parent.firstChild);
    parent.appendChild(layer);
}

gui.insertAbove = function insertAbove(child, layer) {
    gui.replace(layer, child);
    layer.appendChild(child);
}

// return a function which will serve as an event listener to select the nearest ancestor of the received event/element which matches selector, searching only descendants of root

gui.basicClimber = function basicClimber(selector, root = document.body) {
    return function(elementOrEvent) {
        if (elementOrEvent.target) elementOrEvent = elementOrEvent.target;
        let matches = Array.from(root.querySelectorAll(selector));
        for (let i = 0; i < matches.length; ++i) if (!isAncestorOf(matches[i], elementOrEvent, "parentNode")) matches[i] = false;
        matches = matches.filter(identityFunction);
        while (elementOrEvent && !matches.includes(elementOrEvent)) elementOrEvent = elementOrEvent.parentElement;
        return elementOrEvent;
    }
}

/*function climbElementAncestryUntil(elementOrEvent, selector, filter = trueFunction, root = document.body) {
    if (elementOrEvent.target) elementOrEvent = elementOrEvent.target;
    let matches = root.querySelectorAll(selector).filter(filter);
    while (elementOrEvent && !matches.includes(elementOrEvent)) elementOrEvent = elementOrEvent.parentElement;
    return elementOrEvent;
}*/

gui.ensureModule = function ensureModule(name, location = filePrefix+"scripts/gui/"+name+".js", dependencies = {}) {
    gui.log("ensuring " + name);
    if (!dependencies.js) dependencies.js = {};
    if (!dependencies.js.gui) dependencies.js.gui = undefined;
    if (!(("gui/"+name) in scriptLoader.items)) scriptLoader.addItem("gui/"+name, dependencies, {js: location});
}

gui.ensureModules = function ensureModules(modules) {
    for (let module of modules) gui.ensureModule(module);
}

gui.ensureAllModules = function ensureAllModules(finished = emptyFunction) {
    scriptLoader.onTier = -2;
    let allModules = gui.allModules;
    if (allModules.length === 1) gui.ensureModule(allModules[0]);
    else gui.ensureModules(allModules);
    scriptLoader.guiModulesTier.addEphemeralListener(finished);
}

gui.moduleDependency = function moduleDependency(currentModule, dependsOnThese, whenReady) {
    gui.ensureModules(dependsOnThese);
    gui.moduleSetups["gui/"+currentModule] = whenReady;
    scriptLoader.items["gui/"+currentModule].addEphemeralListener("js", function() {
        let dependencies = {};
        for (let dependency of dependsOnThese) dependencies["gui/"+dependency] = undefined;
        scriptLoader.setDependencies("gui/"+currentModule, {guiModules: dependencies});
    });
}