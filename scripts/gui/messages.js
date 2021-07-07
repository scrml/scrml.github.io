gui.ensureModule("textWidth");

gui.messages = {};

gui.messages.textNode = function textNode(textNode, message, time) {
    let text = textNode.nodeValue;
    textNode.nodeValue = message;
    window.setTimeout(function() {if (textNode.nodeValue == message) textNode.nodeValue = text}, time);
}

gui.messages.inputText = function inputText(input, message, time = 1000) {
    let wasAble = !input.hasAttribute("disabled");
    input.setAttribute("messagesRevertTo", input.value);
    input.value = message;
    input.setAttribute("disabled", "");
    let width = Math.ceil(gui.getWidth(input, message));
    let style = gui.element("style", document.head);
    style.innerHTML = "[min-width" + width + "] {min-width: " + width + "px}";
    input.setAttribute("min-width" + width, "");
    window.setTimeout(function() {
        input.value = input.getAttribute("messagesRevertTo");
        input.removeAttribute("messagesRevertTo");
        if (wasAble) input.removeAttribute("disabled");
        document.head.removeChild(style);
        input.removeAttribute("min-width" + width);
        input.focus();
    }, time);
}

gui.messages.button = function button(button, message, time) {
    let textNode = button.firstChild, text = textNode.nodeValue, wasAble = !button.hasAttribute("disabled");
    textNode.nodeValue = message;
    button.setAttribute("disabled", "");
    window.setTimeout(function() {
        if (textNode.nodeValue == message) textNode.nodeValue = text;
        if (wasAble) button.removeAttribute("disabled");
    }, time);
}

gui.highlight = function highlight(node) {
    let highlight = gui.element("div", null, ["class", "highlight"]);
    node.parentNode.replaceChild(highlight, node);
    highlight.appendChild(node);
    return function closeHighlight() {highlight.parentNode.replaceChild(node, highlight)};
}