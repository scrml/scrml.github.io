loadCSS("styles/gui.css");

var gui = {
    defaultOptions: {},
    allModules: ["animations", "buttons", "clipboard", "datalists", "details", "disabler", "focuseds", "inputs", "linkeds", "loadingScreen", "messages", "popup", "screens", "tables", "textWidth"]
}

if (!scriptLoader.guiModulesTier) {
    console.log("setting up module tier");
    gui.moduleSetups = {};
    scriptLoader.guiModulesTier = scriptLoader.newTier("guiModules", function(item) {
        //console.log("guiModule tier processing " + item.name);
        //window.setTimeout(function() {
            scriptLoader.markComplete(item, scriptLoader.guiModulesTier);
        //}, 100);
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
    try {
        element.parentNode.removeChild(element);
    } catch (e) {}
}

gui.replace = function swap(oldElement, newElement) {
    try {
        oldElement.parentNode.replaceChild(newElement, oldElement);
    } catch (e) {}
}

gui.ensureModule = function ensureModule(name, location = filePrefix+"scripts/gui/"+name+".js", dependencies = {}) {
    console.log("ensuring " + name);
    if (!dependencies.js) dependencies.js = {};
    if (!dependencies.js.gui) dependencies.js.gui = undefined;
    if (!(name in scriptLoader.items)) scriptLoader.addItem("gui/"+name, dependencies, {js: location});
}

gui.ensureModules = function ensureModules(modules) {
    for (let module of modules) gui.ensureModule(module);
}

gui.ensureAllModules = function ensureAllModules(finished = emptyFunction) {
    let allModules = gui.allModules;
    if (allModules.length === 1) gui.ensureModule(allModules[0]);
    else gui.ensureModules(allModules);
    // fix this... with a tier probably
    window.setTimeout(finished, 1000);
}