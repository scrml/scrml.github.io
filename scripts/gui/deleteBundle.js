gui.ensureModules(["buttons", "disabler"]);
{
    let openDuration = 400, closeDuration = 200;
    let animationend = function(e) {
        let button = e.target.parentElement.firstChild, trigger = button.nextElementSibling;
        if (trigger.parentElement.SCRMLEditorTiein.lock) return;
        if (trigger.hasAttribute("opening")) {
            trigger.removeAttribute("opening");
            trigger.setAttribute("open", "");
            button.removeAttribute("disabled");
            button.setAttribute("flashing", "");
            button.focus();
        } else if (trigger.hasAttribute("closing")) {
            trigger.removeAttribute("closing");
            trigger.setAttribute("closed", "");
        }
    }
    let openTrigger = function(e) {
        let button = e.target.parentElement.firstChild, trigger = button.nextElementSibling;
        if (trigger.parentElement.SCRMLEditorTiein.lock) return;
        if (trigger.hasAttribute("open") || trigger.hasAttribute("opening") || trigger.hasAttribute("closing")) return;
        trigger.removeAttribute("closed");
        trigger.setAttribute("opening", "");
        window.setTimeout(function() {animationend(e)}, openDuration);
    }
    let closeTrigger = function(e) {
        let button = e.target.parentElement.firstChild, trigger = button.nextSibling;
        if (trigger.parentElement.SCRMLEditorTiein.lock) return;
        if (!trigger.hasAttribute("open")) return;
        trigger.removeAttribute("open");
        trigger.setAttribute("closing", "");
        button.setAttribute("disabled", "");
        button.removeAttribute("flashing");
        window.setTimeout(function() {animationend(e)}, closeDuration);
    }
    
    // these are called on a bundle
    let resetBundle = function resetBundle() {
        this.deleteButton.setAttribute("disabled", "");
        this.deleteButton.removeAttribute("flashing");
        for (att of ["open", "closing", "opening"]) this.deleteTrigger.removeAttribute(att);
        this.deleteTrigger.setAttribute("closed", "");
        this.lock = true;
        let me = this;
        window.setTimeout(function() {me.lock = false}, Math.max(openDuration, closeDuration) + 1);
    }
    function hideDelete() {
        this.deleteLaunch.setAttribute("hide", "");
        this.resetBundle();
    }
    function showDelete() {
        this.deleteLaunch.removeAttribute("hide");
    }
    
    gui.deleteBundle = function deleteBundle(loadHere, buttonClick) {
        let returner = {};
        let deleteLaunch = returner.deleteLaunch = gui.element("div", loadHere, ["class", "missilelaunch"]);
        deleteLaunch.SCRMLEditorTiein = {};
        let deleteButton = returner.deleteButton = gui.button("delete", deleteLaunch, buttonClick, ["class", "missilelaunchbutton", "disabled", ""]);
        gui.absorbClicks(deleteButton);
        let deleteTrigger = returner.deleteTrigger = gui.element("div", deleteLaunch, ["class", "trigger", "tabindex", "0"]);
        deleteButton.addEventListener("blur", closeTrigger);
        deleteTrigger.addEventListener("focus", openTrigger);
        deleteTrigger.addEventListener("click", openTrigger);
        gui.blockEvents(deleteTrigger);
        returner.resetBundle = resetBundle;
        returner.hideDelete = hideDelete;
        returner.showDelete = showDelete;
        let pseudo = {
            target: deleteTrigger
        };
        returner.openTrigger = function () {openTrigger(pseudo)}
        returner.closeTrigger = function() {closeTrigger(pseudo)}
        return returner;
    }
}