/*{
    // on popup
    let openPopup = function openPopup(inPopup, highlight) {
        this.closePopup();
        this.div.appendChild(inPopup);
        this.main.removeAttribute("hide");
        if (highlight) this.closeHighlight = gui.highlight(highlight);
        if (inPopup.focus) inPopup.focus();
    }
    let closePopup = function closePopup() {
        clearChildren(this.div);
        this.main.setAttribute("hide", "");
        this.closeHighlight();
        this.closeHighlight = emptyFunction;
    }
    gui.popup = function popup(loadHere, atts = []) {
        let returner = {};
        returner.main = gui.element("div", loadHere, ["class", "popup", "hide", ""]);
        returner.div = gui.element("div", returner.main, atts);
        returner.closeButton = gui.button("close", returner.main, function() {returner.closePopup()}, ["class", "closeButton"]);
        returner.openPopup = openPopup;
        returner.closePopup = closePopup;
        returner.closeHighlight = emptyFunction;
        return returner;
    }
}

gui.popupLinkedValue = function popupLinkedValue(popup, triggerNode, manager, property, screen, onchange) {
    triggerNode.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        popup.openPopup(gui.linkedScreenedInput(null, manager, property, screen, function(value) {
            popup.closePopup();
            if (onchange) onchange(value);
        }), triggerNode)
    });
}*/