function loadCSS(location) {
    let link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/CSS");
    link.setAttribute("href", filePrefix + location);
    document.head.appendChild(link);
}

function isAncestorOf(older, younger, parentCalled = "parent") {
    while (younger) {
        if (older == younger) return true;
        younger = younger[parentCalled];
    }
    return false;
}

function commaJoin(lines) {
    if (lines.length == 0) return "";
    let returner = "";
    for (let line of lines) returner += line + ", ";
    return returner.substring(0, returner.length - 2);
}

function optionFetcher(defaultOptions, options = {}) {
    return function fetchOption(name) {
        if (name in options) return options[name];
        else return defaultOptions[name];
    }
}

let timerProto = {};

timerProto.restart = function restart() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.callback, this.timeout);
}

function newTimer(callback, timeout) {
    let returner = Object.create(timerProto);
    returner.callback = callback;
    returner.timeout = timeout;
    return returner;
}

function trueFunction() {return true}