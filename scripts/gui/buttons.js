{
    let gui = scrmljs.gui;
    
    gui.button = function button(text, loadHere, onclick, atts, insertBefore) {
        let returner = gui.element("button", loadHere, atts, insertBefore);
        gui.text(text, returner);
        if (onclick) returner.addEventListener("click", onclick);
        return returner;
    }

    gui.hoverButton = function hoverButton(text, loadHere, onclick, spanAtts) {
        let returner = {};
        returner.button = gui.element("button", loadHere, ["class", "hoverHide"]);
        if (onclick) returner.button.addEventListener("click", onclick);
        returner.span = gui.element("span", returner.button, spanAtts);
        returner.text = gui.text(text, returner.span);
        return returner;
    }
}