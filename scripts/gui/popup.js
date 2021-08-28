let gui = scrmljs.gui, emptyFunction = scrmljs.emptyFunction, optionFetcher = scrmljs.optionFetcher;

scrmljs.loadCSS("styles/gui/popup.css");

gui.ensureModules(["disabler"]);

gui.popups = {};

let popupDefaultOptions = {};

gui.popups.basic = function popupInputText(hostElement, options = {}) {
    let returner = {};
    let option = optionFetcher(popupDefaultOptions, options);
    let popupShell = returner.popupShell = gui.element("div", null, ["class", "popupshell"]);
    gui.insertAbove(hostElement, popupShell);
    let popup = returner.popup = gui.element("div", popupShell, ["class", "popup"]);
    gui.absorbClicks(popup);
    returner.closePopup = function closePopup() {
        gui.filicide(popupShell);
        gui.swap(hostElement, popupShell);
    }
    returner.showBox = gui.element("div", popup, ["class", "popupbox"]);
    return returner;
}

let inputTextDefaultOptions = {
    popupOptions: popupDefaultOptions
}

gui.popups.inputText = function popupInputText(hostElement, onchange = emptyFunction, options = {}) {
    let option = optionFetcher(inputTextDefaultOptions, options),
        popup = gui.popups.basic(hostElement, option("popupOptions")),
        input = popup.input = gui.element("input", popup.showBox, ["type", "text"]),
        labelText = option("label");
    if (typeof labelText !== "undefined") {
        let label = popup.label = gui.textShell(labelText, "label", popup.showBox, ["for", option("labelId")], input);
        input.setAttribute("id", option("labelId"));
    }
    input.addEventListener("change", onchange);
    input.focus();
    return popup;
}