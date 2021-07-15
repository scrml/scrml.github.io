let testDiv = gui.element("div", document.body, ["id", "testDiv"]);

{
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
}

gui.dynamizeWidth = function dynamizeWidth(input) {
    let changeWidth = function() {input.style.width = Math.max(gui.getWidth(input, input.value), gui.getWidth(input, input.placeholder)) + "px"}
    input.addEventListener("input", changeWidth);
    input.setWidth = changeWidth;
    changeWidth();
}