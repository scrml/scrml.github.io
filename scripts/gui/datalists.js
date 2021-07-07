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

function optionValue(options, defaultOptions, property) {
    if (property in options) if (options[property] !== undefined) return options[property];
    return defaultOptions[property];
}