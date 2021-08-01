let gui = scrmljs.gui, emptyFunction = scrmljs.emptyFunction, optionFetcher = scrmljs.optionFetcher;

gui.option = function option(text, loadHere, atts = [], value = text) {
    let returner = gui.element("option", loadHere, atts);
    gui.text(text, returner);
    returner.setAttribute("value", value);
    return returner;
}

let selectDefaultOptions = {
    onchange: emptyFunction,
    atts: []
}

gui.select = function select(loadHere, disabledDescriptionOptionTexts, options = {}) {
    options = optionFetcher(selectDefaultOptions, options);
    if (typeof disabledDescriptionOptionTexts == "string") disabledDescriptionOptionTexts = [disabledDescriptionOptionTexts];
    let returner = gui.element("select", loadHere, options("atts"));
    for (let line of disabledDescriptionOptionTexts) gui.option(line, returner, ["disabled", "true"], -1);
    return returner;
}