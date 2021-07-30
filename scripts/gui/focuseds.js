let gui = scrmljs.gui;

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