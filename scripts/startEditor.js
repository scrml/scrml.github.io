// load required scripts
ScriptManager.openScript(filePrefix + "scripts/gui.js", "gui");
Scripts.gui.script.addEventListener("managed", start);

// DOM elements
let editor = document.getElementById("editor"), nameModeButton = document.getElementById("nodeNameMode"), nicknameModeButton = document.getElementById("nicknameMode");
//document.getElementById("debugButton").setAttribute("hide", "");
document.getElementById("debugButton").addEventListener("click", function() {
    post("printAll");
});

// viewing modes
{
    let pageNumberListener = function(e) {editor.setAttribute("pageNumberMode", e.target.getAttribute("id"))}
    for (let pageNumberMode of ["siblingNumber", "fullPageNumber"]) document.getElementById(pageNumberMode).addEventListener("change", pageNumberListener);
    let nameModeListener = function(e) {editor.setAttribute("nameMode", e.target.getAttribute("id"))}
    for (let nameMode of ["nodeNameMode", "nicknameMode", "fullNameMode"]) document.getElementById(nameMode).addEventListener("change", nameModeListener);
    let pageActionListener = function(e) {editor.setAttribute("pageAction", e.target.getAttribute("id"))}
    for (let pageAction of ["newChapterMode", "newStatementMode"]) document.getElementById(pageAction).addEventListener("change", pageActionListener);
}

// variables used in this script
let root, pageTools, pages = [], worker,  workerFunctions = {log: console.log}, focusedPageGap, lockedPageFocus = false;

// check for page then fetch
function getPage(pageNumber) {
    if (!pages[pageNumber]) throw Error("cannot find page " + pageNumber);
    return pages[pageNumber];
}

function start() {
    // set up loading screen
    workerFunctions.setLoadingScreen = gui.setLoadingScreen;
    workerFunctions.closeLoadingScreen = gui.closeLoadingScreen;
    
    editor.appendChild(testDiv);
    makePageTools();
    
    // first set the modes to agree with what buttons are pressed, in case the button presses were cached by the browser
    for (let pageNumberMode of ["siblingNumber", "fullPageNumber"]) if (document.getElementById(pageNumberMode).checked) editor.setAttribute("pageNumberMode", pageNumberMode);
    for (let nameMode of ["nodeNameMode", "nicknameMode", "fullNameMode"]) if (document.getElementById(nameMode).checked) editor.setAttribute("nameMode", nameMode);
    for (let pageAction of ["newChapterMode", "newStatementMode"]) if (document.getElementById(pageAction).checked) editor.setAttribute("pageAction", pageAction);
    
    // start worker
    worker = new Worker("../scripts/worker.js");
    worker.onmessage = function onmessage(e) {
        //console.log("received message");console.log(e.data);
        workerFunctions[e.data.shift()](...e.data);
    }
    
    // make root chapter
    newChapter();
}

function post(functionName, ...args) {
    worker.postMessage([functionName, ...args]);
}

// prototypical new page, do not call this from anything except a (specific type of) page constructor
function newPage(pageNumber) {
    if (pages[pageNumber]) throw Error("page " + pageNumber + " already exists");
    let page = pages[pageNumber] = {pageNumber: pageNumber, pageType: "page"};
    page.div = gui.element("details", null, ["class", "page", "pageNumber", pageNumber]);
    page.pageHead = gui.element("summary", page.div, ["class", "pageHead"]);
    page.div.addEventListener("mouseenter", pageFocusInFromEvent);
    page.siblingNumberSpan = gui.element("span", page.pageHead, ["class", "siblingNumber"]);
    page.siblingNumberText = gui.text("", page.siblingNumberSpan);
    page.fullPageNumberSpan = gui.element("span", page.pageHead, ["class", "fullPageNumber"]);
    page.fullPageNumberText = gui.text("", page.fullPageNumberSpan);
    page.nameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "page name", "class", "name", "disguise", ""]);
    page.nameSpan.addEventListener("change", nameProcessorFromEvent);
    page.nameSpan.addEventListener("blur", nameBlurredFromEvent);
    gui.absorbClicks(page.nameSpan);
    page.nicknameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "nickname", "class", "nickname", "disguise", ""]);
    page.nicknameSpan.addEventListener("change", nameProcessorFromEvent);
    gui.absorbClicks(page.nicknameSpan);
    page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullName"]);
    page.fullNameText = gui.text("", page.fullNameSpan);
}

function newChapter(parentNumber = null, insertBefore = null, name = "Book") {
    let pageNumber = pages.length;
    newPage(pageNumber);
    let page = getPage(pageNumber);
    page.div.setAttribute("class", "chapter");
    post("newChapter", parentNumber, insertBefore, pageNumber, name);
    newPageGap(page);
}

function newPageGap(page, insertBefore = null, insert = true) {
    let returner = gui.element("div", insert? page.div: null, ["class", "pageGap"], insertBefore? insertBefore.div: null);
    returner.addEventListener("focusin", pageGapFocus);
    let newChapterIn = gui.element("input", returner, ["class", "newChapterIn", "placeholder", "new chapter", "disguise", ""]);
    newChapterIn.addEventListener("blur", clearPageGap);
    newChapterIn.addEventListener("change", newChapterInChanged);
    let newStatementIn = gui.element("input", returner, ["class", "newStatementIn", "placeholder", "new statement", "disguise", ""]);
    newStatementIn.addEventListener("blur", clearPageGap);
    newStatementIn.addEventListener("change", newStatementInChanged);
    return returner;
}

function getPageGapFronEvent(event) {
    let gap = event.target;
    while (gap.getAttribute("class") != "pageGap") gap = gap.parentElement;
    return gap;
}

function pageGapFocus(event) {
    focusedPageGap = getPageGapFronEvent(event);
}

function clearPageGap(event) {
    let gap = getPageGapFronEvent(event);
    for (let child of gap.querySelectorAll(".newChapterIn, .newStatementIn")) {
        child.blur();
        child.value = "";
    }
}

function newChapterInChanged(event) {
    let gap = getPageGapFronEvent(event), newChapterIn = gap.querySelector(".newChapterIn"), line = newChapterIn.value;
    if (!gui.nodeNameScreen(line)) return gui.inputOutput.inputText(newChapterIn, "invalid nodeName");
    clearPageGap({target: gap});
    post("newPageNameCheck", gap.parentElement.getAttribute("pageNumber"), line);
}

function newStatementInChanged(event) {
    console.log("not ready yet");
}

workerFunctions.pseudoPost = post;

workerFunctions.fetched = function fetched(pageNumber, dataName, ...data) {
    let page = getPage(pageNumber);
    switch (dataName) {
        /*move*/ case "parent": // data is [parentNumber, insertBefore]
            if (data[0] == null) {
                // this case is only for adding the root page (page 0) to the editor
                if (pageNumber != 0) throw Error("only page 0 can be the root, not page " + pageNumber);
                editor.appendChild(page.div);
            } else {
                let newParent = getPage(data[0]), insertBefore = data[1] == null? null: getPage(data[1]);
                if (page.div.parentElement) {
                    gui.smoothErase(page.div.previousSibling);
                    let deleteMe = gui.element("div", newParent.div, ["hide", ""], insertBefore? insertBefore.div: null);
                    gui.smoothSwap(page.div, deleteMe, {onEnd: function() {
                        deleteMe.parentElement.removeChild(deleteMe);
                        console.log("hello");
                    }});
                } else {
                    let deleteMe2 = gui.element("div", newParent.div, ["hide", ""], insertBefore? insertBefore.div: null), deleteMe1 = gui.element("div", newParent.div, ["hide", ""], deleteMe2);
                    gui.smoothInsert(page.div, newParent.div, deleteMe1, {onEnd: function() {deleteMe1.parentElement.removeChild(deleteMe1)}});
                    gui.smoothInsert(newPageGap(newParent, insertBefore, false), newParent.div, deleteMe2, {onEnd: function() {deleteMe2.parentElement.removeChild(deleteMe2)}});
                }
            }
        break; /*set name*/ case "name": // data is [name]
            if (page.nameSpan.hasAttribute("inputOutputRevertTo")) page.nameSpan.setAttribute("inputOutputRevertTo", data[0]);
            else page.nameSpan.value = data[0];
            page.nicknameSpan.setAttribute("placeholder", "nickname for " + data[0]);
        break; /*set nickname*/ case "nickname": // data is [nickname]
            workerFunctions.setNickname(pageNumber, data[0]);
        break; /*set pageNumber*/ case "siblingNumber": // data is [siblingNumber]
            page.siblingNumberText.nodeValue = data[0];
        break; /*set fullPageNumber*/ case "fullPageNumber": // data is [fullPageNumber]
            page.fullPageNumberText.nodeValue = data[0];
        break; /*set fullName*/ case "fullName": // data is [fullName]
            page.fullNameText.nodeValue = data[0];
        break; default: console.log("do not recognize fetched type " + dataName);
    }
}

workerFunctions.errorOut = function errorOut(pageNumber, dataName, ...data) {
    let page = getPage(pageNumber);
    switch (dataName) {
        case "name": // data is [failedName]
            gui.inputOutput.inputText(page.nameSpan, "naming conflict");
    }
}

workerFunctions.newPageNameCheck = function newPageNameCheck(parentNumber, line, result) {
    if (parentNumber != focusedPageGap.parentElement.getAttribute("pageNumber")) throw Error("mismatch in parent during check for new page");
    let newChapterIn = focusedPageGap.querySelector(".newChapterIn");
    if (result) {
        newChapter(parentNumber, focusedPageGap.nextElementSibling? focusedPageGap.nextElementSibling.getAttribute("pageNumber"): null, line);
    } else {
        newChapterIn.value = line;
        gui.inputOutput.inputText(newChapterIn, "naming conflict");
    }
}

workerFunctions.save = function save(pages) {
    //console.log("saving " + pages);
}

function getPageNumberFromEvent(e) {
    let element = e.target;
    while (!element.hasAttribute("pageNumber")) element = element.parentElement;
    let pageNumber = element.getAttribute("pageNumber");
    activePage = pageNumber;
    return pageNumber;
}

let focusLocked = false, isFocused;

function pageFocusInFromEvent(e) {
    pageFocusIn(getPage(getPageNumberFromEvent(e)));
    gui.eventAbsorber(e);
}
function pageFocusIn(page) {
    if (!lockedPageFocus) page.pageHead.appendChild(pageTools);
}

function nameProcessorFromEvent(e) {return nameProcessor(getPageNumberFromEvent(e), e)}
function nameProcessor(pageNumber, event) {
    let page = getPage(pageNumber);
    if (nicknameModeButton.checked) return post("setNickname", pageNumber, page.nicknameSpan.value);
    if (!gui.nodeNameScreen(page.nameSpan.value)) return gui.inputOutput.inputText(page.nameSpan, "invalid nodeName");
    post("setName", pageNumber, page.nameSpan.value);
}

function nameBlurredFromEvent(e) {return nameBlurred(getPageNumberFromEvent(e))}
function nameBlurred(pageNumber) {
    post("resetName", pageNumber);
}

function deletePageFromEvent(e) {deletePage(getPageNumberFromEvent(e))}
function deletePage(pageNumber) {
    console.log("deleting");
    console.log(getPage(pageNumber));
}

workerFunctions.setNickname = function setNickname(pageNumber, nickname) {
    let page = getPage(pageNumber);
    if (page.nicknameSpan.hasAttribute("inputOutputRevertTo")) page.nicknameSpan.setAttribute("inputOutputRevertTo", nickname);
    else page.nicknameSpan.value = nickname;
}

function makePageTools() {
    pageTools = gui.element("div", false, ["id", "pageTools"]);
    pageTools.moveButton = gui.button("⇳", pageTools, toMoveMode, ["disguise", "", "bigger", ""]);
    gui.shieldClicks(pageTools.moveButton);
    pageTools.deleteBundle = gui.deleteBundle(pageTools, function() {console.log("deleting");/*isFocused.deletePage()*/});
}

function toMoveMode(e) {
    let page = getPage(getPageNumberFromEvent(e));
    if (lockedPageFocus) {
        lockedPageFocus = false;
        editor.removeAttribute("moveMode");
        page.div.removeAttribute("movingPage");
    } else {
        lockedPageFocus = true;
        editor.setAttribute("moveMode", "");
        page.div.setAttribute("movingPage", "");
    }
}