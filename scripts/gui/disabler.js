{
    let loadCSS = scrmljs.loadCSS,
        gui = scrmljs.gui;
    
    loadCSS("styles/gui/disabler.css");
    
    gui.focusableElementsString = "a, area, button, input, object, select, textarea";
    
    gui.eventShielder = function(e) {
        e.stopPropagation();
    }
    
    gui.shieldClicks = function shieldClicks(element) {
        element.addEventListener("click", gui.eventShielder);
    }
    
    gui.eventAbsorber = function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    
    gui.absorbClicks = function absorbClicks(element) {
        element.addEventListener("click", gui.eventAbsorber, true);
    }
    
    gui.blockTheseEvents = {
        focusin: undefined,
        click: undefined
    }
    
    gui.blockEvents = function blockEvents(element, events = gui.blockTheseEvents) {
        let unblocks = [];
        for (let type in events) {
            element.addEventListener(type, gui.eventAbsorber, true);
            unblocks.push(type);
        }
        return function unblockEvents() {
            for (let type of unblocks) element.removeEventListener(type, gui.eventAbsorber, true);
        }
    }
    
    gui.disablerStylesToCopy = {
        float: undefined,
        display: undefined,
        visibility: undefined
    }
    
    gui.disable = function disable(element, copyTheseStyles = gui.disablerStylesToCopy) {
        let disablerShell = gui.element("div", null, ["class", "disablershell"]);
        let styles = getComputedStyle(element);
        for (let style in copyTheseStyles) disablerShell.style[style] = styles.getPropertyValue(style);
        gui.insertAbove(element, disablerShell);
        let disabler = gui.element("div", disablerShell, ["class", "disabler"]);
        gui.blockEvents(disabler);
        let tabPairs = [];
        for (let tabPair of disablerShell.querySelectorAll("[tabindex]")) tabPairs.push({element: tabPair, tabindex: tabPair.getAttribute("tabindex")});
        for (let e of disablerShell.querySelectorAll(gui.focusableElementsString)) e.setAttribute("tabindex", -1);
        return function() {
            for (let e of disablerShell.querySelectorAll(gui.focusableElementsString)) e.removeAttribute("tabindex");
            for (let e of tabPairs) e.element.setAttribute("tabindex", e.tabindex);
            gui.orphan(disabler);
            gui.removeLayer(disablerShell);
        };
    }
    
    {
        let isSuppressed = false;
        gui.suppressKeys = function suppressKeys() {
            if (isSuppressed) return;
            window.addEventListener("keydown", gui.eventAbsorber);
            isSuppressed = true;
        }
        
        gui.releaseKeySuppression = function releaseKeySuppression() {
            if (isSuppressed) {
                isSuppressed = false;
                window.removeEventListener("keydown", gui.eventAbsorber);
            }
        }
    }
}