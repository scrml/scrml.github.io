let gui = scrmljs.gui,
    scriptLoader = scrmljs.scriptLoader,
    filePrefix = scrmljs.filePrefix;

gui.ensureModules(["inputs"]);
scriptLoader.addItem("varManager", {}, {js: filePrefix+"scripts/varManager.js"});

gui.linkedScreenedInput = function linkedScreenedInput(loadHere, manager, property, options = {}) {
    let newOptions = Object.assign({}, options), returner = {};
    let onchange = emptyFunction;
    if (options.onchange) onchange = options.onchange;
    newOptions.onchange = function(value) {
        manager.setVarValue(property, returner.element.value);
        onchange(value);
    }
    returner.element = gui.screenedInput(loadHere, newOptions);
    returner.unlink = manager.linkProperty(property, returner.element, "value");
    returner.element.addEventListener("blur", function() {
        window.setTimeout(function() {try {returner.element.value = manager.vars[property].value} catch (e) {}}, 100);
    });
    return returner;
}

gui.linkedFocusedScreenedInput = function linkedFocusedScreenedInput(loadHere, manager, property, screen, options = {}) {
    let newOptions = Object.assign({}, options);
    newOptions.screen = screen;
    let returner = gui.focusedScreenedInput(loadHere, function(newValue) {manager.setVarValue(property, newValue)}, newOptions);
    returner.value = manager.vars[property].value;
    if (returner.setWidth) returner.setWidth();
    returner.select();
    return returner;
}

gui.linkedFocusedScreenedInputReplace = function linkedFocusedScreenedInputReplace(loadHere, replaceThis, manager, property, screen, options = {}) {
    let newOptions = Object.assign({}, options);
    newOptions.screen = screen;
    if ("atts" in newOptions) {
        for (let i = 0; i < newOptions.atts.length; i += 2) if (newOptions.atts[i] == "type") newOptions.atts[i+1] = "text";
    } else newOptions.atts = ["type", "text"];
    let returner = gui.focusedScreenedInputReplace(loadHere, replaceThis, function(newValue) {manager.setVarValue(property, newValue)}, newOptions);
    returner.value = manager.vars[property].value;
    if (returner.setWidth) returner.setWidth();
    returner.select();
    return returner;
}

gui.linkedTextShell = function linkedTextShell(type, loadHere, manager, property, screen, options = {}) {
    let returner = gui.element(type, loadHere, options.atts);
    returner.textNode = gui.linkedText(returner, manager, property);
    returner.tabIndex = 0;
    returner.addEventListener("focus", function() {
        gui.linkedFocusedScreenedInputReplace(loadHere, returner, manager, property, screen, options);
    });
    return returner;
}

gui.linkedFocusedTextShell = function linkedFocusedTextShell(type, loadHere, manager, property, screen, options = {}) {
    let returner = {element: gui.element(type, loadHere, options.atts)};
    returner.unlink = manager.linkProperty(property, returner.element, "value");
    returner.element.addEventListener("click", function() {
        gui.linkedFocusedScreenedInputReplace(loadHere, returner.element, manager, property, screen, options);
    });
    return returner;
}

gui.linkedOption = function linkedOption(loadHere, manager, textProp, valueProp, atts) {
    let returner = {option: gui.element("option", loadHere, atts)};
    let cleanup = [];
    let text = gui.text("", returner.option);
    cleanup.push(manager.linkProperty(textProp, text, "nodeValue"));
    if (typeof valueProp != "undefined") cleanup.push(manager.linkListener(valueProp, function(value) {
        returner.option.setAttribute("value", value);
    }, true));
    returner.deleteMe = function deleteMe() {
        for (let f of cleanup) f();
        if (returner.option.parentNode) gui.orphan(returner.option);
    }
    return returner;
}

gui.linkedText = function linkedText(loadHere, manager, property) {
    let returner = {textNode: gui.text("", loadHere)};
    returner.cleanup = [manager.linkProperty(property, returner.textNode, "nodeValue")];
    return returner;
}