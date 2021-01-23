loadCSS("styles/gui.css");

var gui = {};

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

gui.focusedElement = function focusedElement(type, loadHere, atts, insertBefore) {
    let returner = gui.element(type, loadHere, atts, insertBefore);
    returner.tabIndex = 0;
    returner.focus();
    returner.addEventListener("blur", function() {
        try {
            loadHere.removeChild(returner)
        } catch (e) {}
    });
}

gui.focusedElementReplace = function focusedElementReplace(type, loadHere, replaceThis, atts) {
    let returner = gui.elementReplace(type, loadHere, replaceThis, atts);
    returner.tabIndex = 0;
    returner.focus();
    returner.addEventListener("blur", function() {
        try {
            loadHere.replaceChild(replaceThis, returner)
        } catch (e) {}
    });
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

gui.inputOutput = {};

gui.inputOutput.textNode = function textNode(textNode, message, time) {
    let text = textNode.nodeValue;
    textNode.nodeValue = message;
    window.setTimeout(function() {if (textNode.nodeValue == message) textNode.nodeValue = text}, time);
}

gui.inputOutput.inputText = function inputText(input, message, time = 1000) {
    let wasAble = !input.hasAttribute("disabled");
    input.setAttribute("inputOutputRevertTo", input.value);
    input.value = message;
    input.setAttribute("disabled", "");
    let width = Math.ceil(gui.getWidth(input, message));
    let style = gui.element("style", document.head);
    style.innerHTML = "[min-width" + width + "] {min-width: " + width + "px}";
    input.setAttribute("min-width" + width, "");
    window.setTimeout(function() {
        input.value = input.getAttribute("inputOutputRevertTo");
        input.removeAttribute("inputOutputRevertTo");
        if (wasAble) input.removeAttribute("disabled");
        document.head.removeChild(style);
        input.removeAttribute("min-width" + width);
        input.focus();
    }, time);
}

gui.inputOutput.button = function button(button, message, time) {
    let textNode = button.firstChild, text = textNode.nodeValue, wasAble = !button.hasAttribute("disabled");
    textNode.nodeValue = message;
    button.setAttribute("disabled", "");
    window.setTimeout(function() {
        if (textNode.nodeValue == message) textNode.nodeValue = text;
        if (wasAble) button.removeAttribute("disabled");
    }, time);
}

gui.nodeNameScreen = function nodeNameScreen(line) {
    try {
        document.createElement(line);
        return true;
    } catch (e) {return false;}
}

gui.dataListScreen = function dataListScreen(dataList) {
    return function(line) {
        for (let i = 0; i < dataList.childNodes.length; ++i) {
            let o = dataList.childNodes[i];
            if (o.getAttribute("value") == line) return !o.hasAttribute("disabled");
        }
        return false;
    }
}

gui.savedFileScreen = function savedFileScreen(location) {
    return (location in savedDocs) || (location in savedFiles);
}

let testDiv = gui.element("div", document.body, ["id", "testDiv"]);

{
    let testSpan, testText;
    
    gui.getWidth = function getWidth(input, line) {
        if (!testSpan) {
            testSpan = gui.element("span", testDiv, ["id", "testSpan"]);
            testText = gui.text("", testSpan);
        }
        testText.nodeValue = line;
        let returner = testSpan.getBoundingClientRect().width;
        testText.nodeValue = "";
        return returner;
    }
}

gui.dynamizeWidth = function dynamizeWidth(input) {
    let changeWidth = function() {input.style.width = Math.max(gui.getWidth(input, input.value), gui.getWidth(input, input.placeholder)) + "px"}
    input.addEventListener("input", changeWidth);
    input.setWidth = changeWidth;
}
{
    let defaultOptions = {
        placeholder: "",
        onchange: emptyFunction,
        screen: gui.nodeNameScreen,
        failMessage: "invalid",
        messageTime: 1000,
        atts: [],
        absorbClicks: false,
        dynamizeWidth: true
    };
    gui.screenedInput = function screenedInput(loadHere, options = {}) {
        let returner = gui.element("input", loadHere, ["type", "text", "placeholder", optionValue(options, defaultOptions, "placeholder")].concat(optionValue(options, defaultOptions, "atts")));
        returner.select();
        let screen = optionValue(options, defaultOptions, "screen"), onchange = optionValue(options, defaultOptions, "onchange"), failMessage = optionValue(options, defaultOptions, "failMessage"), messageTime = optionValue(options, defaultOptions, "messageTime");
        returner.addEventListener("change", function() {
            let line = returner.value;
            if (screen(line)) onchange(line);
            else gui.inputOutput.inputText(returner, failMessage, messageTime)
        });
        if (optionValue(options, defaultOptions, "absorbClicks")) gui.absorbClicks(returner);
        if (optionValue(options, defaultOptions, "dynamizeWidth")) gui.dynamizeWidth(returner);
        return returner;
    }
}
{
    let defaultOptions = {
        placeholder: "",
        onchange: emptyFunction,
        screen: gui.nodeNameScreen,
        failMessage: "invalid",
        messageTime: 1000,
        atts: [],
        absorbClicks: false,
        dynamizeWidth: true
    };
    gui.screenedInputReplace = function screenedInputReplace(loadHere, replaceThis, options = {}) {
        let returner = gui.elementReplace("input", loadHere, replaceThis, ["type", "text", "placeholder", optionValue(options, defaultOptions, "placeholder")].concat(optionValue(options, defaultOptions, "atts")));
        returner.addEventListener("change", function() {
            let line = returner.value;
            if (optionValue(options, defaultOptions, "screen")(line)) {
                loadHere.replaceChild(replaceThis, returner);
                optionValue(options, defaultOptions, "onchange")(line);
            } else gui.inputOutput.inputText(returner, optionValue(options, defaultOptions, "failMessage"), optionValue(options, defaultOptions, "messageTime"))
        });
        if (optionValue(options, defaultOptions, "absorbClicks")) gui.absorbClicks(returner);
        if (optionValue(options, defaultOptions, "dynamizeWidth")) gui.dynamizeWidth(returner);
        return returner;
    }
}

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

gui.focusedScreenedInput = function focusScreenedInput(loadHere, oninput = emptyFunction, options = {}) {
    let newOptions = Object.assign({}, options);
    let returner = gui.screenedInput(loadHere, newOptions);
    returner.focus();
    let onchange = emptyFunction;
    if (newOptions.onchange) onchange = newOptions.onchange;
    newOptions.onchange = function(value) {
        returner.parentElement.removeChild(returner);
        if (newOptions.whileRemovingInput) newOptions.whileRemovingInput();
        oninput(value);
        onchange(value);
    }
    returner.addEventListener("blur", function() {
        try {
            if (newOptions.whileRemovingInput) newOptions.whileRemovingInput();
            returner.parentElement.removeChild(returner)
        } catch (e) {}
    });
    return returner;
}

gui.focusedScreenedInputReplace = function focusedScreeenedInputReplace(loadHere, replaceThis, oninput = emptyFunction, options = {}) {
    let newOptions = Object.assign({}, options);
    let returner = gui.screenedInputReplace(loadHere, replaceThis, newOptions);
    returner.focus();
    let onchange = emptyFunction;
    if ("onchange" in newOptions) onchange = newOptions.onchange;
    newOptions.onchange = function(value) {
        oninput(value);
        onchange(value);
    }
    returner.addEventListener("blur", function(e) {
        try {
            returner.parentElement.replaceChild(replaceThis, returner)
        } catch (e) {}
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

gui.button = function button(text, loadHere, onclick, atts, insertBefore) {
    let returner = gui.element("button", loadHere, atts, insertBefore);
    gui.text(text, returner);
    if (onclick) returner.addEventListener("click", onclick);
    return returner;
}

gui.option = function option(text, loadHere, atts, value = text) {
    let returner = gui.element("option", loadHere, atts);
    gui.text(text, returner);
    returner.setAttribute("value", value);
    return returner;
}

gui.select = function select(loadHere, disabledDescriptionOptionTexts) {
    if (typeof disabledDescriptionOptionTexts == "string") disabledDescriptionOptionTexts = [disabledDescriptionOptionTexts];
    let returner = gui.element("select", loadHere);
    for (let line of disabledDescriptionOptionTexts) gui.option(line, returner, ["disabled", "true"], -1);
    return returner;
}

{
    let openDuration = 400, closeDuration = 200;
    let animationend = function(e) {
        let button = e.target.parentElement.firstChild, trigger = button.nextSibling;
        if (trigger.parentElement.SCRMLEditorTiein.lock) return;
        if (trigger.hasAttribute("opening")) {
            trigger.removeAttribute("opening");
            trigger.setAttribute("open", "");
            button.removeAttribute("disabled");
            button.setAttribute("flashing", "");
            button.focus();
        } else if (trigger.hasAttribute("closing")) {
            trigger.removeAttribute("closing");
            trigger.setAttribute("closed", "");
        }
    }
    let openTrigger = function(e) {
        let button = e.target.parentElement.firstChild, trigger = button.nextSibling;
        if (trigger.parentElement.SCRMLEditorTiein.lock) return;
        if (trigger.hasAttribute("open") || trigger.hasAttribute("opening") || trigger.hasAttribute("closing")) return;
        trigger.removeAttribute("closed");
        trigger.setAttribute("opening", "");
        window.setTimeout(function() {animationend(e)}, openDuration);
    }
    let closeTrigger = function(e) {
        let button = e.target.parentElement.firstChild, trigger = button.nextSibling;
        if (trigger.parentElement.SCRMLEditorTiein.lock) return;
        if (!trigger.hasAttribute("open")) return;
        trigger.removeAttribute("open");
        trigger.setAttribute("closing", "");
        button.setAttribute("disabled", "");
        button.removeAttribute("flashing");
        window.setTimeout(function() {animationend(e)}, closeDuration);
    }
    
    // these are called on a bundle
    let resetBundle = function resetBundle() {
        this.deleteButton.setAttribute("disabled", "");
        this.deleteButton.removeAttribute("flashing");
        for (att of ["open", "closing", "opening"]) this.deleteTrigger.removeAttribute(att);
        this.deleteTrigger.setAttribute("closed", "");
        this.lock = true;
        let me = this;
        window.setTimeout(function() {me.lock = false}, Math.max(openDuration, closeDuration) + 1);
    }
    function hideDelete() {
        this.deleteLaunch.setAttribute("hide", "");
        this.resetBundle();
    }
    function showDelete() {
        this.deleteLaunch.removeAttribute("hide");
    }
    
    gui.deleteBundle = function deleteBundle(loadHere, buttonClick) {
        let returner = {};
        let deleteLaunch = returner.deleteLaunch = gui.element("div", loadHere, ["class", "missileLaunch"]);
        deleteLaunch.SCRMLEditorTiein = {};
        let deleteButton = returner.deleteButton = gui.button("delete", deleteLaunch, buttonClick, ["class", "missileLaunchButton", "disabled", ""]);
        gui.absorbClicks(deleteButton);
        let deleteTrigger = returner.deleteTrigger = gui.element("div", deleteLaunch, ["class", "trigger", "tabindex", "0"]);
        gui.absorbClicks(deleteTrigger);
        deleteButton.addEventListener("blur", closeTrigger);
        deleteTrigger.addEventListener("focus", openTrigger);
        deleteTrigger.addEventListener("click", openTrigger);
        returner.resetBundle = resetBundle;
        returner.hideDelete = hideDelete;
        returner.showDelete = showDelete;
        let pseudo = {
            stopImmediatePropagation: emptyFunction,
            preventDefault: emptyFunction,
            target: deleteTrigger
        };
        returner.openTrigger = function () {openTrigger(pseudo)}
        returner.closeTrigger = function() {closeTrigger(pseudo)}
        return returner;
    }
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
        if (returner.option.parentNode) returner.option.parentNode.removeChild(returner.option);
    }
    return returner;
}

gui.linkedText = function linkedText(loadHere, manager, property) {
    let returner = {textNode: gui.text("", loadHere)};
    returner.cleanup = [manager.linkProperty(property, returner.textNode, "nodeValue")];
    return returner;
}

gui.summary = function summary(text, loadHere, atts) {
    let returner = gui.element("summary", loadHere, atts);
    gui.text(text, returner);
    return returner;
}

gui.hoverButton = function hoverButton(text, loadHere, onclick, spanAtts) {
    let returner = {};
    returner.button = gui.element("button", loadHere, ["class", "hoverHide"]);
    returner.button.addEventListener("click", onclick);
    returner.span = gui.element("span", returner.button, spanAtts);
    returner.text = gui.text(text, returner.span);
    return returner;
}

{
    let defaultOptions = {
        duration: .5,
        onEnd: emptyFunction,
        doSmoothly: true
    };
    gui.smoothErase = function smoothErase(element, options = {}) {
        if (!optionValue(options, defaultOptions, "doSmoothly")) {
            element.parentElement.removeChild(element);
            optionValue(options, defaultOptions, "onEnd")();
            return;
        }
        if (options.width) options.width = Math.round(options.width);
        if (options.height) options.height = Math.round(options.height);
        let box = element.getBoundingClientRect(),
            height = options.height || Math.round(box.height),
            width = options.width || Math.round(box.width),
            parent = element.parentElement,
            name = "smoothErase" + width + "x" + height,
            duration = optionValue(options,defaultOptions,"duration");
        let div = gui.element("div", null, ["id", name]);
        element.parentElement.replaceChild(div, element);
        div.appendChild(element);
        let style = gui.element("style", document.head);
        style.innerHTML = "@keyframes "+name+" {0% {height: "+height+"px; width: "+width+"px} 100% {height: 0px; width: 0px}} #"+name+" {animation-name: "+name+"; animation-duration: "+duration+"s; overflow: hidden}";
        window.setTimeout(function() {
            div.parentElement.removeChild(div);
            document.head.removeChild(style);
            optionValue(options, defaultOptions, "onEnd")();
        }, duration*1000);
    }
}

{
    let defaultOptions = {
        duration: .5,
        testingPlace: testDiv,
        onEnd: emptyFunction,
        doSmoothly: true
    };
    gui.smoothInsert = function smoothInsert(element, parent, insertBefore = null, options = {}) {
        if (!optionValue(options, defaultOptions, "doSmoothly")) {
            parent.insertBefore(element, insertBefore);
            optionValue(options, defaultOptions, "onEnd")();
            return;
        }
        if (options.width) options.width = Math.round(options.width);
        if (options.height) options.height = Math.round(options.height);
        optionValue(options,defaultOptions,"testingPlace").appendChild(element);
        let box = element.getBoundingClientRect(),
            height = options.height || Math.round(box.height),
            width = options.width || Math.round(box.width),
            name = "smoothInsert" + width + "x" + height,
            duration = optionValue(options,defaultOptions,"duration");
        let div = gui.element("div", parent, ["id", name], insertBefore);
        div.appendChild(element);
        let style = gui.element("style", document.head);
        style.innerHTML = "@keyframes "+name+" {0% {height: 0px; width: 0px} 100% {height: "+height+"px; width: "+width+"px}} #"+name+" {animation-name: "+name+"; animation-duration: "+duration+"s; overflow: hidden}";
        window.setTimeout(function() {
            parent.replaceChild(element, div);
            document.head.removeChild(style);
            optionValue(options, defaultOptions, "onEnd")();
        }, duration*1000);
    }
}

gui.smoothElement = function smoothElement(type, loadHere, atts, insertBefore, options) {
    let returner = gui.element(type, null, atts);
    gui.smoothInsert(returner, loadHere, insertBefore, options);
    return returner;
}

{
    let defaultOptions = {
        duration: .5,
        onEnd: emptyFunction,
        doSmoothly: doSmoothly
    };
    gui.smoothSwap = function smoothSwap(element, placeBefore, options = {}) {
        if (!optionValue(options, defaultOptions, "doSmoothly")) {
            placeBefore.parentElement.insertBefore(element, placeBefore);
            optionValue(options, defaultOptions, "onEnd")();
            return;
        }
        if (options.width) options.width = Math.round(options.width);
        if (options.height) options.height = Math.round(options.height);
        let box = element.getBoundingClientRect(),
            height = options.height || Math.round(box.height),
            width = options.width || Math.round(box.width),
            x = box.x,
            y = box.y,
            placeBeforeBox = placeBefore.getBoundingClientRect(),
            x2 = placeBeforeBox.x,
            y2 = placeBeforeBox.y,
            oldParent = element.parentElement,
            newParent = placeBefore.parentElement,
            shrink = "smoothSwapShrink" + width + "x" + height,
            move = "smoothSwapMove" + width + "x" + height,
            grow = "smoothSwapGrow" + width + "x" + height,
            duration = optionValue(options,defaultOptions,"duration");
        let style = gui.element("style", document.head);
        style.innerHTML = "@keyframes "+shrink+" {0% {width: "+width+"px; height: "+height+"px} 100% {width: 0px; height: 0px}}"
        + " @keyFrames "+grow+" {0% {width: 0px; height: 0px} 100% {width: "+width+"px; height: "+height+"px}}"
        + " @keyFrames "+move+" {0% {left: 0px; top: 0px} 100% {left: "+(x2-x)+"px; top: "+(y2-y-height)+"px}}"
        + " #"+shrink+" {animation-name: "+shrink+"; animation-duration: "+duration+"s; position: relative}"
        + " #"+grow+" {animation-name: "+grow+"; animation-duration: "+duration+"s}"
        + " #"+move+" {animation-name: "+move+"; animation-duration: "+duration+"s; position: relative; height: "+height+"px; width: "+width+"px}";
        let shrinkDiv = gui.element("div", oldParent, ["id", shrink], element),
            moveDiv = gui.element("div", shrinkDiv, ["id", move]),
            growDiv = gui.element("div", newParent, ["id", grow], placeBefore);
        moveDiv.appendChild(element);
        window.setTimeout(function() {
            newParent.insertBefore(element, placeBefore);
            document.head.removeChild(style);
            oldParent.removeChild(shrinkDiv);
            newParent.removeChild(growDiv);
            optionValue(options, defaultOptions, "onEnd")();
        }, duration*1000);
    }
}

gui.highlight = function highlight(node) {
    let highlight = gui.element("div", null, ["class", "highlight"]);
    node.parentNode.replaceChild(highlight, node);
    highlight.appendChild(node);
    return function closeHighlight() {xmlImporter.collapseNode(highlight)};
}

{
    // on popup
    let openPopup = function openPopup(inPopup, highlight) {
        this.closePopup();
        this.div.appendChild(inPopup);
        this.main.removeAttribute("hide");
        if (highlight) this.closeHighlight = gui.highlight(highlight);
        if (inPopup.focus) inPopup.focus();
    }
    let closePopup = function closePopup() {
        clearChildren(this.div);
        this.main.setAttribute("hide", "");
        this.closeHighlight();
        this.closeHighlight = emptyFunction;
    }
    gui.popup = function popup(loadHere, atts = []) {
        let returner = {};
        returner.main = gui.element("div", loadHere, ["class", "popup", "hide", ""]);
        returner.div = gui.element("div", returner.main, atts);
        returner.closeButton = gui.button("close", returner.main, function() {returner.closePopup()}, ["class", "closeButton"]);
        returner.openPopup = openPopup;
        returner.closePopup = closePopup;
        returner.closeHighlight = emptyFunction;
        return returner;
    }
}

gui.table = {};

gui.table.titleRow = function titleRow(table, lines) {
    let row = gui.element("tr", table);
    for (let line of lines) gui.text(line, gui.element("th", row));
    return row;
}

gui.table.textRow =  function textRow(table, lines) {
    let row = gui.element("tr", table);
    for (let line of lines) gui.text(line, gui.element("td", row));
    return row;
}

gui.table.row =  function row(table, nodes) {
    let row = gui.element("tr", table);
    for (let node of nodes) gui.element("td", row).appendChild(node);
    return row;
}

gui.copyToClipboard = function copyToClipboard(e) {
    e.preventDefault();
    let input = e.target, wasInDesignMode = input.contentEditable;
    input.contentEditable = true;
    input.select();
    document.execCommand("copy");
    input.blur();
    gui.inputOutput.inputText(input, "copied", 500);
    input.contentEditable = wasInDesignMode;
}

gui.popupLinkedValue = function popupLinkedValue(popup, triggerNode, manager, property, screen, onchange) {
    triggerNode.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        popup.openPopup(gui.linkedScreenedInput(null, manager, property, screen, function(value) {
            popup.closePopup();
            if (onchange) onchange(value);
        }), triggerNode)
    });
}

gui.eventShielder = function(e) {
    e.stopPropagation();
}

gui.shieldClicks = function shieldClicks(element) {
    element.addEventListener("click", gui.eventShielder);
}

gui.eventAbsorber = function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
}

gui.absorbClicks = function absorbClicks(element) {
    element.addEventListener("click", gui.eventAbsorber);
}

gui.visibilityTrackerProtoModel = {};

gui.newVisibilityTracker = function newVisibilityTracker(protoModel = visibilityTrackerProtoModel) {
    
}

{
    let isSuppressed = false;
    gui.suppressKeys = function suppressKeys() {
        if (isSuppressed) return;
        window.addEventListener("keydown", gui.eventAbsorber);
        isSuppressed = true;
    }

    gui.releaseKeySuppression = function releaseKeySuppression() {
        if (isSuppressed) {
            isSuppressed = false;
            window.removeEventListener("keydown", gui.eventAbsorber);
        }
    }
}

{
    let div = gui.element("div", document.body, ["id", "loadingScreen", "hide", "", "temporarilyInvisible", ""]), div2 = gui.element("div", div), icon = gui.element("div", div2, ["id", "loadingIcon"]);
    gui.text("Loading...", gui.element("p", div2));
    let msgSpan = gui.element("p", div2), msgText = gui.text("loading screen is hidden", msgSpan), isLoad = false;
    
    gui.setLoadingScreen = function setLoadingScreen(message = "") {
        msgText.nodeValue = message;
        if (!isLoad) {
            isLoad = true;
            div.removeAttribute("hide");
            gui.suppressKeys();
        }
    }
    
    gui.closeLoadingScreen = function closeLoadingScreen() {
        isLoad = false;
        div.setAttribute("hide", "");
        gui.releaseKeySuppression();
        msgText.nodeValue = "loading screen is hidden";
    }
    
    gui.absorbClicks(div);
}

function optionValue(options, defaultOptions, property) {
    if (property in options) if (options[property] !== undefined) return options[property];
    return defaultOptions[property];
}