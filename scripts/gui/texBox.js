/*
    A texBox is a div which displays editable rendered TeX. Clicking on it opens a textarea to edit the TeX and blurring switches back to the rendered TeX.
    There are some optional keystroke overrides. By default, pressing tab will override the browser's tabbing process and instead enter a "\t" character.
    Pressing shift+enter or shift+tab blurs the textarea, entering the content and triggering a render. Shift+tab will tab to the next browser element too.
    There's a special case with shift tabbing where if no edits have been made then shift tab will tab to the previous tabbable element instead.
*/
let gui = scrmljs.gui, emptyFunction = scrmljs.emptyFunction;

scrmljs.scriptLoader.ensureJS("jax");

gui.ensureModule("textWidth");

scrmljs.loadCSS("styles/gui/texBox.css");

let texProto = gui.texProto = {};

gui.texBox = function texBox(loadHere, atts = [], onchange = emptyFunction, insertBefore) {
    let returner = Object.create(texProto);
    returner.div = gui.element("div", loadHere, atts, insertBefore);
    returner.texIn = gui.element("textarea", returner.div, ["class", "texin"]);
    gui.dynamizeHeight(returner.texIn);
    returner.texIn.addEventListener("change", function() {
        returner.setTex(returner.texIn.value);
        returner.toOutputMode();
        onchange(returner.texIn.value);
    });
    returner.texIn.addEventListener("blur", function() {returner.toOutputMode()});
    returner.texOut = gui.element("button", returner.div, ["class", "texout", "disguise", "", "hide", ""]);
    returner.texOut.addEventListener("click", function() {returner.toInputMode()});
    return returner;
}

texProto.toInputMode = function toInputMode() {
    this.texIn.removeAttribute("hide");
    this.texOut.setAttribute("hide", "");
    this.texIn.focus();
}

texProto.toOutputMode = function toOutputMode() {
    this.texIn.blur();
    this.texIn.setAttribute("hide", "");
    this.texOut.removeAttribute("hide");
}

texProto.setTex = function setTex(tex) {
    let outputMode = this.texIn.hasAttribute("hide");
    this.toInputMode();
    gui.setTextareaContent(this.texIn, tex);
    this.texOut.textContent = tex;
    if (outputMode) this.toOutputMode();
    scrmljs.jax.typeset(this.texOut);
}