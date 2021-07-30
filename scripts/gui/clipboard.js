let gui = scrmljs.gui;

gui.copyToClipboard = function copyToClipboard(e) {
    e.preventDefault();
    let input = e.target, wasInDesignMode = input.contentEditable;
    input.contentEditable = true;
    input.select();
    document.execCommand("copy");
    input.blur();
    if (gui.messages) gui.messages.inputText(input, "copied", 500);
    input.contentEditable = wasInDesignMode;
}