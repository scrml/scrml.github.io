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

// Event listener for auto-resizing textareas, returns the textarea itself
gui.fixTextHeightListener = function fixTextHeightListener(event) {
    // stash scroll location to avoid jumps
    let scrollLeft = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft,
        scrollTop = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
    
    // resize textarea
    event = event.target;
    while (event.nodeName.toLowerCase() != "textarea") event = event.parentNode;
    event.style.height = "auto";
    event.style.height = event.scrollHeight+"px";
    
    // reset scroll location
    window.scrollTo(scrollLeft, scrollTop);
    return event;
}

gui.dynamizeHeight = function dymanizeHeight(textarea) {
    textarea.addEventListener("input", gui.fixTextHeightListener);
}

gui.setTextareaContent = function setTextareaContent(textarea, line) {
    textarea.value = line;
    gui.fixTextHeightListener({target: textarea});
}