let gui = scrmljs.gui,
    emptyFunction = scrmljs.emptyFunction,
    optionFetcher = scrmljs.optionFetcher;

gui.moduleDependency("inputs", ["screens", "messages", "disabler", "textWidth"], function() {
    gui.defaultOptions.screenedInput = {
        placeholder: "",
        onchange: emptyFunction,
        screen: gui.nodeNameScreen,
        failMessage: "invalid",
        messageTime: 1000,
        atts: [],
        absorbClicks: false,
        dynamizeWidth: true
    }
});

gui.screenedInput = function screenedInput(loadHere, options = {}) {
    let option = optionFetcher(gui.defaultOptions.screenedInput, options);
    let returner = gui.element("input", loadHere, ["type", "text", "placeholder", option("placeholder")].concat(option("atts")));
    returner.select();
    let screen = option("screen"), onchange = option("onchange"), failMessage = option("failMessage"), messageTime = option("messageTime");
    returner.addEventListener("change", function(e) {
        let line = returner.value;
        if (screen(line)) onchange(e);
        else gui.messages.inputText(returner, failMessage, messageTime)
    });
    if (option("absorbClicks")) gui.absorbClicks(returner);
    if (option("dynamizeWidth")) gui.dynamizeWidth(returner);
    return returner;
}

// enter key to blur
gui.screenedInputReplace = function screenedInputReplace(loadHere, replaceThis, options = {}) {
    let option = optionFetcher(gui.defaultOptions.screenedInput, options);
    let returner = gui.elementReplace("input", loadHere, replaceThis, ["type", "text", "placeholder", option("placeholder")].concat(option("atts")));
    returner.addEventListener("change", function() {
        let line = returner.value;
        if (option("screen")(line)) {
            loadHere.replaceChild(replaceThis, returner);
            option("onchange")(line);
        } else gui.messages.inputText(returner, option("failMessage"), option("messageTime"))
    });
    if (option("absorbClicks")) gui.absorbClicks(returner);
    if (option("dynamizeWidth")) gui.dynamizeWidth(returner);
    return returner;
}

gui.focusedScreenedInput = function focusScreenedInput(loadHere, oninput = emptyFunction, options = {}) {
    let newOptions = Object.assign({}, options);
    let returner = gui.screenedInput(loadHere, newOptions);
    returner.focus();
    let onchange = emptyFunction;
    if (newOptions.onchange) onchange = newOptions.onchange;
    newOptions.onchange = function(value) {
        gui.orphan(returner);
        if (newOptions.whileRemovingInput) newOptions.whileRemovingInput();
        oninput(value);
        onchange(value);
    }
    returner.addEventListener("blur", function() {
        try {
            if (newOptions.whileRemovingInput) newOptions.whileRemovingInput();
            gui.orphan(returner)
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
            gui.replace(returner, replaceThis);
        } catch (e) {}
    });
    return returner;
}