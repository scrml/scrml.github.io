// Every script in this site defines an object and gives some functionality to that object. This functionality may depend on other scripts, but the scripts are loaded asynchronously. ScriptManager keeps track of which scripts are loaded and can handle requests to delay function execution until the required scripts are all loaded.

// repository of all loaded scripts
var Scripts = {};

// the object defined by the current script scriptManager.js
var ScriptManager = {selfLocation: document.currentScript.getAttribute("src")};

// Opening a script involves remembering the script (the object it defines) and setting up delayed functions to be executed once all required scripts are loaded. These delayed functions can either be halting, meaning this script will not be considered loaded until the function executes, or nonhalting.
{
    // This function is added to the entry in Scripts for the active script. If all halting functions are executed then transition to loaded state. This involves firing a "managed" event on the script DOM element which loaded this script in the first place.
    let checkFinished = function checkFinished() {
        if (this.waitingOns.length == 0) {
            this.isFinished = true;
            this.script.dispatchEvent(new Event("managed"));
        }
    }
    
    // This function is added to the wait ticket for a delayed execution. Check if execution is ready and, if so, execute and record that this has been done.
    let checkWaitOver = function checkWaitOver() {
        let ready = true;
        for (let need in this.waitingOn) ready = ready && Scripts[need].isFinished;
        if (ready && !this.isResolved) {
            this.isResolved = true;
            this.callback(this.pass);
            if (this.halt) {
                this.me.waitingOns.splice(this.me.waitingOns.indexOf(this), 1);
                this.me.checkFinished();
            }
        }
    }
    
    // This function is added to the entry in Scripts for the active script. Create a wait ticket for callback to be executed, with argument pass, when all requiredScripts are finished setting up.
    // Delay callback(pass) until all requiredScripts are finished loading. Halt means this script will not be considered finished loading until the delayed function executes.
    let waitFor = function waitFor(requiredScripts, callback, pass, halt = false) {
        let wait = {isResolved: false, me: this, waitingOn: requiredScripts, halt: halt, callback: callback, pass: pass, checkWaitOver: checkWaitOver};
        if (halt) this.waitingOns.push(wait);
        for (let r in requiredScripts) Scripts[r].script.addEventListener("managed", function() {wait.checkWaitOver()});
        wait.checkWaitOver();
    }
    
    // Create a new entry in the Scripts repository for the script found at location. This entry will know whether it is done loading or not and, when it finishes loading, it fires a "managed" event on the script DOM element where the script came from. This entry is what is told to add delayed function execution. Also this entry houses the object defined by the script.
    ScriptManager.openScript = function openScript(location, finished = emptyFunction, pass) {
        if (location in Scripts) return;
        let entry = Scripts[location] = {};
        entry.location = location;
        entry.object = {};
        entry.isFinished = false;
        entry.checkFinished = checkFinished;
        entry.waitingOns = [];
        entry.waitFor = waitFor;
        // If this happens to be opening scriptManager itself, do not create a new script DOM element but grab the existing one. Otherwise create and insert a new script DOM element for the new script. 
        if (location == ScriptManager.selfLocation) {
            entry.script = document.currentScript;
        } else {
            let script = document.createElement("script");
            entry.script = script;
            script.setAttribute("src", location);
            script.setAttribute("async", "");
            script.setAttribute("defer", "");
            script.addEventListener("load", function() {entry.checkFinished()});
            document.head.appendChild(script);
        }
        entry.script.addEventListener("managed", function() {finished(pass)});
    }
}

// Open a set of scripts with the declared dependencies.
ScriptManager.openScripts = function openScripts(openThese, finished = emptyFunction, pass) {
    for (let location in openThese) {
        
    }
}

// Run this script through the setup process above
ScriptManager.openScript(ScriptManager.selfLocation);

// Fetch and execute a script without processing it
ScriptManager.executeJS = function executeJS(location, finished = emptyFunction, pass) {
    let script = document.createElement("script");
    script.setAttribute("src", location);
    script.onload = function() {finished(pass)};
    document.head.appendChild(script);
}

// for use as default function
function emptyFunction() {}