gui.summary = function summary(text, loadHere, atts) {
    let returner = gui.element("summary", loadHere, atts);
    gui.text(text, returner);
    return returner;
}