let gui = scrmljs.gui;
let testDiv = gui.element("div", document.body, ["id", "testDiv"]);
let testSpan, testText;

gui.getWidth = function getWidth(input, line) {
    if (!testSpan) {
        testSpan = gui.element("span", testDiv, ["id", "testSpan"]);
        testText = gui.text("", testSpan);
    }
    testText.nodeValue = line;
    let returner = testSpan.getBoundingClientRect().width;
    testText.nodeValue = "";
    return returner;
}

let fixWidth = function fixWidth() {
    this.style.width = Math.max(gui.getWidth(this, this.value), gui.getWidth(this, this.placeholder)) + "px";
}

let fixWidthListener = function fixWidthListener(e) {
    e.target.fixWidth();
}

gui.fixInputWidth = function fixInputWidth(input) {
    fixWidth.call(input);
}

gui.dynamizeWidth = function dynamizeWidth(input) {
    input.addEventListener("input", fixWidthListener);
    input.fixWidth = fixWidth;
    input.fixWidth();
}