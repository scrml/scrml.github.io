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
    element.addEventListener("click", gui.eventAbsorber, true);
}

gui.blockTheseEvents = {
    focus: undefined,
    click: undefined
}

gui.blockEvents = function blockEvents(element, events = gui.blockTheseEvents) {
    for (let type in events) element.addEventListener(type, gui.eventAbsorber, true);
}

gui.disablerStylesToCopy = {
    float: undefined,
    display: undefined,
    visibility: undefined
}

gui.disable = function disable(element, copyTheseStyles = gui.disablerStylesToCopy) {
    let disabler = gui.element("div", null, ["class", "disabler"]);
    let styles = getComputedStyle(element);
    for (let style in copyTheseStyles) disabler.style[style] = styles.getPropertyValue(style);
    element.parentElement.replaceChild(disabler, element);
    disabler.appendChild(element);
    gui.blockEvents(disabler);
    return function() {disabler.parentElement.replaceChild(element, disabler)};
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