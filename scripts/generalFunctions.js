scrmljs.loadCSS = function loadCSS(location) {
    let link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/CSS");
    link.setAttribute("href", scrmljs.filePrefix + location);
    document.head.appendChild(link);
}

scrmljs.isAncestorOf = function isAncestorOf(older, younger, parentCalled = "parent") {
    while (younger) {
        if (older === younger) return true;
        younger = younger[parentCalled];
    }
    return false;
}

scrmljs.commaJoin = function commaJoin(lines) {
    if (lines.length == 0) return "";
    let returner = "";
    for (let line of lines) returner += line + ", ";
    return returner.substring(0, returner.length - 2);
}

scrmljs.capitalizeFirstLetter = function capitalizeFirstLetter(line) {
    if (line.length == 0) return line;
    return line.charAt(0).toUpperCase() + line.slice(1);
}

scrmljs.optionFetcher = function optionFetcher(defaultOptions, options = {}) {
    return function fetchOption(name) {
        if (name in options) return options[name];
        else return defaultOptions[name];
    }
}

scrmljs.timerProto = {};

scrmljs.timerProto.restart = function restart() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.callback, this.timeout);
}

scrmljs.newTimer = function newTimer(callback, timeout) {
    let returner = Object.create(scrmljs.timerProto);
    returner.callback = callback;
    returner.timeout = timeout;
    return returner;
}

scrmljs.climbElementAncestryUntil = function climbElementAncestryUntil(elementOrEvent, selector, filter = trueFunction, root = document.body) {
    if (elementOrEvent.target) elementOrEvent = elementOrEvent.target;
    let matches = root.querySelectorAll(selector).filter(filter);
    while (elementOrEvent && !matches.includes(elementOrEvent)) elementOrEvent = elementOrEvent.parentElement;
    return elementOrEvent;
}

scrmljs.trueFunction = function trueFunction() {return true}
scrmljs.identityFunction = function identityFunction(x) {return x}