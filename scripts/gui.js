loadCSS("styles/gui.css");

var gui = {};

gui.elementDoc = function elementDoc(doc, type, loadHere, atts = [], insertBefore = null) {
    let returner = doc.createElement(type);
    if (loadHere) loadHere.insertBefore(returner, insertBefore);
    for (let i = 0; i < atts.length; i += 2) if (atts[i] == "dynamicWidth") gui.dynamizeWidth(returner);
    else returner.setAttribute(atts[i], atts[i+1]);
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

gui.inputOutput = {};

gui.inputOutput.textNode = function textNode(textNode, message, time) {
    let text = textNode.nodeValue;
    textNode.nodeValue = message;
    window.setTimeout(function() {if (textNode.nodeValue == message) textNode.nodeValue = text}, time);
}

gui.inputOutput.inputText = function inputText(input, message, time = 1000) {
    let text = input.value, wasAble = !input.hasAttribute("disabled");
    input.value = message;
    input.setAttribute("disabled", "");
    let width = Math.ceil(gui.getWidth(message));
    let style = gui.element("style", document.head);
    style.innerHTML = "[min-width" + width + "] {min-width: " + width + "px}";
    input.setAttribute("min-width" + width, "");
    window.setTimeout(function() {
        if (input.value == message) input.value = text;
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
    
    gui.getWidth = function getWidth(line) {
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
    let changeWidth = function() {input.style.width = gui.getWidth(input.value) + "px"}
    input.addEventListener("input", changeWidth);
    input.setWidth = changeWidth;
}

gui.screenedInput = function screenedInput(loadHere, options = {}) {
    let defaultOptions = {
        placeholder: "",
        onchange: emptyFunction,
        screen: gui.nodeNameScreen,
        failMessage: "invalid",
        messageTime: 1000,
        atts: []
    };
    let returner = gui.element("input", loadHere, ["type", "text", "placeholder", optionValue(options, defaultOptions, "placeholder")].concat(optionValue(options, defaultOptions, "atts")));
    returner.select();
    returner.addEventListener("change", function() {
        let line = returner.value;
        if (optionValue(options, defaultOptions, "screen")(line)) optionValue(options, defaultOptions, "onchange")(line);
        else gui.inputOutput.inputText(returner, optionValue(options, defaultOptions, "failMessage"), optionValue(options, defaultOptions, "messageTime"))
    });
    return returner;
}

gui.screenedInputReplace = function screenedInputReplace(loadHere, replaceThis, options = {}) {
    let defaultOptions = {
        placeholder: "",
        onchange: emptyFunction,
        screen: gui.nodeNameScreen,
        failMessage: "invalid",
        messageTime: 1000,
        atts: []
    };
    let returner = gui.elementReplace("input", loadHere, replaceThis, ["type", "text", "placeholder", optionValue(options, defaultOptions, "placeholder")].concat(optionValue(options, defaultOptions, "atts")));
    returner.addEventListener("change", function() {
        let line = returner.value;
        if (optionValue(options, defaultOptions, "screen")(line)) {
            loadHere.replaceChild(replaceThis, returner);
            optionValue(options, defaultOptions, "onchange")(line);
        } else gui.inputOutput.inputText(returner, optionValue(options, defaultOptions, "failMessage"), optionValue(options, defaultOptions, "messageTime"))
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

gui.linkedTextShellByValue = function linkedTextShell(type, loadHere, manager, property, screen, options = {}) {
    let returner = gui.element(type, loadHere, options.atts);
    manager.linkProperty(property, returner, "value");
    returner.addEventListener("click", function() {
        gui.linkedFocusedScreenedInputReplace(loadHere, returner, manager, property, screen, options);
    });
    return returner;
}

gui.chapterSystemDefaultOptions = {
    divAtts: ["class", "chapterSystem"],
    chaptersAreCalled: "chapter",
    protoModel: {},
    chapterProtoModel: {},
    gapProtoModel: {},
    moveRestrictedToImmediateFamily: true
}

gui.chapterSystem = function chapterSystem(loadHere, options = {}) {
    function getOption(options, property) {return optionValue(options, gui.chapterSystemDefaultOptions, property)};
    let chapterSystem = Object.create(getOption(options, "protoModel"));
    chapterSystem.manager = newVarManager();
    chapterSystem.manager.setVarValue("chaptersAreCalled", getOption(options, "chaptersAreCalled"));
    chapterSystem.manager.linkProperty("chaptersAreCalled", chapterSystem, "chaptersAreCalled");
    if (options.parentChapterSystem) chapterSystem.parentChapterSystem = options.parentChapterSystem;
    chapterSystem.chapterProtoModel = getOption(options, "chapterProtoModel");
    chapterSystem.gapProtoModel = getOption(options, "gapProtoModel");
    chapterSystem.lockFocus = false;
    chapterSystem.cleanups = [];
    chapterSystem.getOption = getOption;
    chapterSystem.div = gui.element("div", loadHere, getOption(options, "divAtts"));
    chapterSystem.uniqueChapterNameScreen = function uniqueChapterNameScreen(proposal) {return chapterSystem.screenForUniqueChapterName(proposal)}
    chapterSystem.firstGap = chapterSystem.newGap(chapterSystem.div);
    return chapterSystem;
}
gui.chapterSystemDefaultOptions.protoModel.toEachGap = function toEachGap(call, ...args) {
    for (let gap of this.getGaps()) call(gap, args);
}
gui.chapterSystemDefaultOptions.protoModel.getGaps = function getGaps() {
    let returner = [];
    let gap = this.firstGap;
    while (gap) {
        returner.push(gap);
        if (gap.nextChapter) gap = gap.nextChapter.nextGap;
        else gap = false;
    }
    return returner;
}
gui.chapterSystemDefaultOptions.protoModel.toEachChapter = function toEachChapter(call, ...args) {
    for (let chapter of this.getChapters()) call(chapter, args);
}
gui.chapterSystemDefaultOptions.protoModel.getChapters = function getChapters() {
    let returner = [];
    let chapter  = this.firstChapter;
    while (chapter) {
        returner.push(chapter);
        chapter = chapter.nextChapter;
    }
    return returner;
}
gui.chapterSystemDefaultOptions.protoModel.toAcceptMoveMove = function toAcceptMoveMode(comingIn) {
    this.toEachGap(function(gap) {
        gap.div.replaceChild(comingIn.canMoveHere(gap)? gap.moveHereGap: gap.dontMoveHereGap, gap.gap);
    });
    this.toEachChapter(function(chapter) {
        chapter.lockMetaTools();
    });
}
gui.chapterSystemDefaultOptions.protoModel.leaveAcceptMoveMode = function leaveAcceptMoveMode() {
    this.toEachGap(function(gap) {
        for (let button of [gap.moveHereGap, gap.dontMoveHereGap]) if (button.parentElement) gap.div.replaceChild(gap.gap, button);
    });
    this.toEachChapter(function(chapter) {
        chapter.unlockMetaTools();
    });
}
gui.chapterSystemDefaultOptions.chapterProtoModel.lockMetaTools = function lockMetaTools() {
    this.metaTools.removeAttribute("hoverUnhide");
    if (this != this.chapterSystem.focused) {
        this.metaTools.setAttribute("hide", "");
    }
}
gui.chapterSystemDefaultOptions.chapterProtoModel.unlockMetaTools = function unlockMetaTools() {
    this.metaTools.removeAttribute("hide");
    this.metaTools.setAttribute("hoverUnhide", "");
}
gui.chapterSystemDefaultOptions.chapterProtoModel.toMoveMode = function toMoveMode() {
    this.isMoving = true;
    if (this == this.chapterSystem.focused) return;
    this.chapterSystem.focused = this;
    this.chapterSystem.lockFocus = true;
    this.chapterSystem.toAcceptMoveMove(this);
}
gui.chapterSystemDefaultOptions.chapterProtoModel.moveTo = function moveTo(thisGap) {
    this.isMoving = this.chapterSystem.lockFocus = false;
    this.chapterSystem.focused = undefined;
    this.chapterSystem.leaveAcceptMoveMode();
    let a = thisGap.previousChapter,
        b = thisGap.nextChapter,
        c = this.previousChapter,
        d = this.previousGap,
        e = this.nextGap,
        f = this.nextChapter;
    if (thisGap != d && thisGap != e) {
        if (this == this.chapterSystem.firstChapter) {
            this.chapterSystem.firstChapter = f;
            this.chapterSystem.firstGap = e;
        }
        this.previousChapter = a;
        d.previousChapter = a;
        this.nextChapter = b;
        this.nextGap = thisGap;
        thisGap.previousChapter = this;
        e.previousChapter = c;
        if (a) {
            a.nextChapter = this;
            a.nextGap = d;
        } else {
            this.chapterSystem.firstChapter = this;
            this.chapterSystem.firstGap = d;
        }
        if (c) {
            c.nextChapter = f;
            c.nextGap = e;
        }
        if (b) b.previousChapter = this;
        if (f) f.previousChapter = c;
        let unit = gui.element("div", this.div.parentElement, ["class", "unit"], this.div);
        unit.appendChild(d.div);
        unit.appendChild(this.div);
        let hideThese = this.chapterSystem.getGaps();
        for (let i = 0; i < hideThese.length; ++i) hideThese[i] = hideThese[i].div;
        let me = this;
        gui.smoothSwap(unit, thisGap.div, {
            hideThese: hideThese,
            onEnd: function() {
                unit.parentElement.insertBefore(d.div, unit);
                unit.parentElement.replaceChild(me.div, unit);
            }
        });
    }
}
gui.chapterSystemDefaultOptions.protoModel.doMove = function doMove(e) {
    this.focused.moveTo(e.target.gap);
}
gui.chapterSystemDefaultOptions.chapterProtoModel.cancelMove = function cancelMove() {this.moveTo(this.previousGap)}
gui.chapterSystemDefaultOptions.chapterProtoModel.canMoveHere = function canMoveHere(gap) {
    return true;
}
gui.chapterSystemDefaultOptions.chapterProtoModel.openNicknames = function openNicknames() {
    if (!this.nameHolder.parentElement) return;
    let me = this;
    gui.focusedScreenedInputReplace(this.nameHolder.parentElement, this.nameHolder, function(nicknames) {
        me.setNicknames(nicknames.split(", "));
    }, {
        screen: function(proposition) {
            if (proposition == "") return true;
            let lines = proposition.split(", ");
            for (let line of lines) if (!gui.nodeNameScreen(line)) return false;
            return true;
        },
        placeholder: "nicknames"
    }).value = commaJoin(this.nicknames);
}
gui.chapterSystemDefaultOptions.chapterProtoModel.setNicknames = function setNicknames(nicknames) {
    this.nicknames = nicknames;
}
gui.chapterSystemDefaultOptions.chapterProtoModel.deleteChapter = function deleteChapter() {
    if (this.isMoving) this.cancelMove();
    gui.smoothErase(this.div);
    this.nextGap.previousChapter = this.previousChapter;
    this.previousGap.deleteGap();
    if (this.previousChapter) {
        this.previousChapter.nextChapter = this.nextChapter;
        this.previousChapter.nextGap = this.nextGap;
    } else {
        this.chapterSystem.firstChapter = this.nextChapter;
        this.chapterSystem.firstGap = this.nextGap;
    }
    if (this.nextChapter) this.nextChapter.previousChapter = this.previousChapter;
    this.manager.clearAll();
}
gui.chapterSystemDefaultOptions.chapterProtoModel.saveToString = function saveToString() {
    let returner = "";
    returner += "name " + this.name;
    for (let nickname of this.nicknames) returner += " " + nickname;
    returner += "\n";
}
gui.chapterSystemDefaultOptions.protoModel.screenForUniqueChapterName = function screenForUniqueChapterName(proposal) {
    if (!gui.nodeNameScreen(proposal)) return false;
    if (!this.firstChapter) return true;
    let testChapter = this.firstChapter;
    do {if (testChapter.name == proposal) return false} while (testChapter = testChapter.nextChapter);
    return true;
}
gui.chapterSystemDefaultOptions.gapProtoModel.turnIntoNewChapter = function turnIntoNewChapter(name, details = true) {
    let chapterSystem = this.chapterSystem, returner = Object.create(chapterSystem.chapterProtoModel);
    returner.chapterSystem = chapterSystem;
    this.div.removeChild(this.gap);
    if (details) {
        returner.div = gui.elementReplace("details", this.div.parentElement, this.div, ["class", this.div.getAttribute("class")]);
    } else {
        returner.div = this.div;
    }
    returner.div.setAttribute("to1", "");
    returner.previousChapter = this.previousChapter;
    returner.nextChapter = this.nextChapter;
    returner.previousGap = chapterSystem.newGap(returner.div.parentElement, returner.div);
    returner.previousGap.nextChapter = returner;
    returner.nextGap = chapterSystem.newGap(returner.div.parentElement, returner.div.nextElementSibling);
    returner.nextGap.previousChapter = returner;
    if (returner.previousChapter) {
        returner.previousChapter.nextChapter = returner;
        returner.previousChapter.nextGap = returner.previousGap;
        returner.previousGap.previousChapter = returner.previousChapter;
    } else {
        chapterSystem.firstChapter = returner;
        chapterSystem.firstGap = returner.previousGap;
    }
    if (returner.nextChapter) {
        returner.nextChapter.previousChapter = returner;
        returner.nextChapter.previousGap = returner.nextGap;
        returner.nextGap.nextChapter = returner.nextChapter;
    }
    returner.div.chapterSystem = chapterSystem;
    returner.div.chapter = returner;
    returner.manager = newVarManager();
    returner.manager.setVarValue("name", name);
    returner.manager.linkProperty("name", returner, "name");
    if (details) {
        returner.nameHolder = gui.element("div", gui.element("summary", returner.div), ["plainWrapper", ""]);
    } else returner.nameHolder = gui.element("div", returner.div, ["plainWrapper", ""]);
    returner.nameP = gui.linkedTextShellByValue("input", returner.nameHolder, returner.manager, "name", chapterSystem.uniqueChapterNameScreen, {atts: ["disguise", "", "type", "button", "dynamicWidth", ""]});
    returner.nicknames = [];
    returner.nicknameButton = gui.button("…", returner.nameHolder, function() {returner.openNicknames()}, ["disguise", ""]);
    returner.metaTools = gui.element("div", details? returner.nameHolder.parentElement: returner.nameHolder, ["class", "metaTools", "hoverUnhide", ""]);
    returner.isMoving = false;
    returner.moveButton = gui.button("⇳", returner.metaTools, function() {returner.toMoveMode()}, ["disguise", "", "bigger", ""]);
    returner.deleteBundle = gui.deleteBundle(returner.metaTools, function() {returner.deleteChapter()});
    returner.metaTools.addEventListener("mouseleave", function(e) {
        returner.deleteBundle.closeTrigger();
    });
    return returner;
}
    
gui.chapterSystemDefaultOptions.gapProtoModel.deleteGap = function deleteGap() {
    gui.smoothErase(this.div);
    if (this == this.chapterSystem.firstGap) this.chapterSystem.firstGap = this.nextChapter.nextGap;
}
gui.chapterSystemDefaultOptions.protoModel.newGap = function newGap(loadHere, insertBefore) {
    let returner = Object.create(this.gapProtoModel);
    returner.div = gui.element("div", loadHere, ["class", "chapter"], insertBefore);
    returner.gap = gui.element("button", returner.div, ["class", "gap", "disguise", ""]);
    returner.chapterSystem = this;
    let me = this, cycleUnlinkListener = {};
    returner.gap.addEventListener("focus", function() {
        if (returner.gap.firstChild) return;
        let input = gui.focusedScreenedInput(returner.gap, function(name) {returner.turnIntoNewChapter(name)}, {
            screen: me.uniqueChapterNameScreen,
            atts: ["disguise", "", "block", "", "dynamicWidth", ""],
            whileRemovingInput: function() {cycleUnlinkListener.go()}
        });
        let listener = function(newCalled) {
            input.setAttribute("placeholder", "new " + me.chaptersAreCalled + " name");
        }
        cycleUnlinkListener.go = me.manager.linkListener("chaptersAreCalled", listener, true);
    });
    returner.moveHereGap = gui.button("⇦", false, function(e) {me.doMove(e)}, ["class", "moveHereGap", "disguise", ""]);
    returner.moveHereGap.gap = returner;
    returner.dontMoveHereGap = gui.button("❌", false, emptyFunction, ["class", "dontMoveHereGap", "disguise", ""]);
    return returner;
}
gui.chapterSystemDefaultOptions.protoModel.checkFocus = function(e) {
    if (this.lockFocus) return;
    if (this.focused) if (!isAncestorOf(this.focused.div, e.target, "parentElement")) this.focused.loseFocus();
    let element = e.target;
    while (element.parentElement) {
        if (element.chapterSystem) {
            if (element.chapterSystem == this) {
                element.chapter.getFocus();
            }
            break;
        }
        element = element.parentElement;
    }
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
        e.stopImmediatePropagation();
        e.preventDefault();
        let button = e.target.parentElement.firstChild, trigger = button.nextSibling;
        if (trigger.hasAttribute("open") || trigger.hasAttribute("opening") || trigger.hasAttribute("closing")) return;
        trigger.removeAttribute("closed");
        trigger.setAttribute("opening", "");
        window.setTimeout(function() {animationend(e)}, openDuration);
    }
    let closeTrigger = function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        let button = e.target.parentElement.firstChild, trigger = button.nextSibling;
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
        let deleteButton = returner.deleteButton = gui.button("delete", deleteLaunch, buttonClick, ["class", "missileLaunchButton", "disabled", ""]);
        let deleteTrigger = returner.deleteTrigger = gui.element("div", deleteLaunch, ["class", "trigger", "tabindex", "0"]);
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
        onEnd: emptyFunction
    };
    gui.smoothErase = function smoothErase(element, options = {}) {
        let box = element.getBoundingClientRect(), height = Math.round(box.height), width = Math.round(box.width), parent = element.parentElement, name = "smoothErase" + width + "x" + height, duration = optionValue(options,defaultOptions,"duration");
        let div = gui.element("div", null, ["class", name]);
        element.parentElement.replaceChild(div, element);
        div.appendChild(element);
        let style = gui.element("style", document.head);
        style.innerHTML = "@keyframes "+name+" {0% {opacity: 1; height: "+height+"px; width: "+width+"px} 23% {opacity: 0; height: "+height+"px; width: "+width+"px} 100% {opacity: 0; height: 0px; width: 0px}} ."+name+" {animation-name: "+name+"; animation-duration: "+duration+"s; overflow: hidden}";
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
        onEnd: emptyFunction
    };
    gui.smoothInsert = function smoothInsert(element, parent, insertBefore, options = {}) {
        optionValue(options,defaultOptions,"testingPlace").appendChild(element);
        window.setTimeout(function() {
        let box = element.getBoundingClientRect(), height = Math.round(box.height), width = Math.round(box.width), name = "smoothInsert" + width + "x" + height, duration = optionValue(options,defaultOptions,"duration");
        let div = gui.element("div", parent, ["class", name], insertBefore);
        div.appendChild(element);
        let style = gui.element("style", document.head);
        style.innerHTML = "@keyframes "+name+" {0% {opacity: 0; height: 0px; width: 0px} 50% {opacity: 0; height: "+height+"px; width: "+width+"px} 100% {opacity: 1; height: "+height+"px; width: "+width+"px}} ."+name+" {animation-name: "+name+"; animation-duration: "+duration+"s; overflow: hidden}";
        window.setTimeout(function() {
            parent.replaceChild(element, div);
            document.head.removeChild(style);
            optionValue(options, defaultOptions, "onEnd")();
        }, duration*1000);
        }, 500);
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
        hideThese: []
    };
    gui.smoothSwap = function smoothSwap(element, placeBefore, options = {}) {
        let box = element.getBoundingClientRect(), height = Math.round(box.height), width = Math.round(box.width), x = box.x, y = box.y, box2 = placeBefore.getBoundingClientRect(), x2 = box2.x, y2 = box2.y, parent = element.parentElement, shrink = "smoothSwapShrink" + width + "x" + height, move = "smoothSwapMove" + width + "x" + height, grow = "smoothSwapGrow" + width + "x" + height, hide = "smoothSwapHide" + width + "x" + height, duration = optionValue(options,defaultOptions,"duration");
        if (y2 > y) y2 -= height;
        let style = gui.element("style", document.head);
        style.innerHTML = "@keyframes "+shrink+" {0%, 10% {width: "+width+"px; height: "+height+"px} 90%, 100% {width: 0px; height: 0px}} @keyFrames "+grow+" {0%, 10% {width: 0px; height: 0px} 90%, 100% {width: "+width+"px; height: "+height+"px}} @keyFrames "+move+" {0%, 10% {left: "+x+"px; top: "+y+"px} 90%, 100% {left: "+x2+"px; top: "+y2+"px}} @keyframes "+hide+" {0% {filter: opacity(100%)} 10%, 90% {filter: opacity(0%)} 100%: {filter: opacity(100%)}} ."+shrink+" {animation-name: "+shrink+"; animation-duration: "+duration+"s} ."+grow+" {animation-name: "+grow+"; animation-duration: "+duration+"s} ."+move+" {animation-name: "+move+"; animation-duration: "+duration+"s; position: fixed; height: "+height+"px; width: "+width+"px} ."+hide+" {animation-name: "+hide+"; animation-duration: "+duration+"s}";
        let shrinkDiv = gui.element("div", parent, ["class", shrink], element), moveDiv = gui.element("div", shrinkDiv, ["class", move]), growDiv = gui.element("div", parent, ["class", grow], placeBefore);
        let hideThese = optionValue(options, defaultOptions, "hideThese");
        for (let hideMe of hideThese) {
            let div = gui.element("div", hideMe.parentElement, ["class", hide], hideMe);
            div.appendChild(hideMe);
        }
        moveDiv.appendChild(element);
        window.setTimeout(function() {
            for (let hideMe of hideThese) hideMe.parentElement.parentElement.replaceChild(hideMe, hideMe.parentElement);
            parent.insertBefore(element, placeBefore);
            document.head.removeChild(style);
            parent.removeChild(shrinkDiv);
            parent.removeChild(growDiv);
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

function optionValue(options, defaultOptions, property) {
    if (property in options) if (options[property] !== undefined) return options[property];
    return defaultOptions[property];
}