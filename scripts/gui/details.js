gui.summary = function summary(text, loadHere, atts) {
    let returner = gui.element("summary", loadHere, atts);
    gui.text(text, returner);
    return returner;
}

gui.details = function details(summaryText, loadHere, atts, insertBefore) {
    let returner = gui.element("details", loadHere, atts, insertBefore);
    gui.summary(summaryText, returner);
    return returner;
}