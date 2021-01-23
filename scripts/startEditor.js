// load required scripts
ScriptManager.openScript(filePrefix + "scripts/gui.js", "gui");
Scripts.gui.script.addEventListener("managed", start);

// DOM elements
let editor = document.getElementById("editor"), nameModeButton = document.getElementById("nodenamemode"), nicknameModeButton = document.getElementById("nicknamemode");
document.getElementById("debugbutton").setAttribute("hide", "");
/*document.getElementById("debugbutton").addEventListener("click", function() {
    let codeOut = document.getElementById("codeout");
    let processor = new XSLTProcessor();
    let req = new XMLHttpRequest();
    req.open("GET", filePrefix + "xslt/save.xslt");
    req.onload = function() {
        processor.importStylesheet(req.responseXML);
        let altered = processor.transformToFragment(pages[0].div, document);
        while (codeOut.firstChild) codeOut.removeChild(codeOut.firstChild);
        let root = gui.element("SCRMLBook");
        root.appendChild(altered);
        codeOut.innerText = nodeToString(root);
    }
    req.send();
});*/

function nodeToString(node, indent = "", tab = "  ", newLine = "\r\n") {
    if (node.nodeType == 3) return node.nodeValue;
    if (node.nodeType == 9) return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + nodeToString(node.firstChild, indent, tab, newLine);
    let line = newLine;
    line += indent+"<"+node.nodeName;
    for (let i = 0; i < node.attributes.length; ++i) line += " "+node.attributes[i].name+"=\""+node.attributes[i].value+"\"";
    line += node.childNodes.length == 0? "/>": ">";
    if (node.childNodes.length > 0) {
        let isText = node.childNodes.length == 1;
        if (isText) isText = node.firstChild.nodeType == 3;
        if (isText) line += node.firstChild.nodeValue + "</"+node.nodeName+">";
        else {
            for (let i = 0; i < node.childNodes.length; ++i) line += nodeToString(node.childNodes[i], indent + tab, tab, newLine);
            line += newLine+indent+"</"+node.nodeName+">";
        }
    }
    return line;
}
// viewing modes
{
    let pageNumberListener = function(e) {editor.setAttribute("pagenumbermode", e.target.getAttribute("id"))}
    for (let pageNumberMode of ["siblingnumber", "fullpagenumber"]) document.getElementById(pageNumberMode).addEventListener("change", pageNumberListener);
    let nameModeListener = function(e) {editor.setAttribute("namemode", e.target.getAttribute("id"))}
    for (let nameMode of ["nodenamemode", "nicknamemode", "fullnamemode"]) document.getElementById(nameMode).addEventListener("change", nameModeListener);
    let pageActionListener = function(e) {editor.setAttribute("pageaction", e.target.getAttribute("id"))}
    for (let pageAction of ["newchaptermode", "newstatementmode", "newcommentmode"]) document.getElementById(pageAction).addEventListener("change", pageActionListener);
}

// variables used in this script
let root, pageTools, pages = [], worker,  workerFunctions = {log: console.log}, focusedPageGap, lockedPageFocus = false;

// check for page then fetch
function getPage(pageNumber) {
    if (!pages[pageNumber]) throw Error("cannot find page " + pageNumber);
    return pages[pageNumber];
}

function start() {
    document.getElementById("debugbutton").click();
    // set up loading screen
    workerFunctions.setLoadingScreen = gui.setLoadingScreen;
    workerFunctions.closeLoadingScreen = gui.closeLoadingScreen;
    
    editor.appendChild(testDiv);
    makePageTools();
    
    // first set the modes to agree with what buttons are pressed, in case the button presses were cached by the browser
    for (let pageNumberMode of ["siblingnumber", "fullpagenumber"]) if (document.getElementById(pageNumberMode).checked) editor.setAttribute("pagenumbermode", pageNumberMode);
    for (let nameMode of ["nodenamemode", "nicknamemode", "fullnamemode"]) if (document.getElementById(nameMode).checked) editor.setAttribute("namemode", nameMode);
    for (let pageAction of ["newchaptermode", "newstatementmode", "newcommentmode"]) if (document.getElementById(pageAction).checked) editor.setAttribute("pageaction", pageAction);
    
    // start worker
    worker = new Worker("../scripts/worker.js");
    worker.onmessage = function onmessage(e) {
        workerFunctions[e.data.shift()](...e.data);
    }
    
    // make root chapter / saved pages
    if (!Storage.getItem("0")) Storage.setItem("0", "chapter\nBook\n\n");
    loadPages();
}

function loadPages() {
    post("openPageProcess");
    doSmoothly = false;
    let page = 0, line;
    while (line = Storage.getItem(page)) loadPage(page++);
    post("closePageProcess");
    for (let i = 0; i < page; ++i) if (pageLoadingInformation[i]) post("move", i, pageLoadingInformation[i].parent, pageLoadingInformation[i].insertBefore);
}

let pageLoadingInformation = [];

function loadPage(pageNumber) {
    if (pages[pageNumber]) throw Error("page " + pageNumber + " already exists")
    let lines = Storage.getItem(pageNumber).split("\n");
    switch (lines[0]) {
        case "chapter":
            if (pageNumber != newChapter(pageNumber == 0? null: 0, null, lines[1])) throw Error("wrong page number");
            post("setNickname", pageNumber, lines[2]);
            if (lines[3].length > 0) {
                let children = lines[3].split(" ");
                let index = children.indexOf("");
                if (index >= 0) children.splice(index, 1);
                for (let i = 0; i < children.length; ++i) pageLoadingInformation[children[i]] = {parent: pageNumber, insertBefore: i+1==children.length? null: children[i+1]};
            }
        break; case "statement":
            
        break; case "comment":
            
        break; default: throw Error("do not recognize page type " + lines[0]);
    }
}
function post(functionName, ...args) {
    worker.postMessage([functionName, ...args]);
}

// prototypical new page, do not call this from anything except a (specific type of) page constructor
function newPage(pageNumber) {
    if (pages[pageNumber]) throw Error("page " + pageNumber + " already exists");
    let page = pages[pageNumber] = {pageNumber: pageNumber, pageType: "page"};
    page.div = gui.element("details", null, ["class", "page", "pagenumber", pageNumber, "open", ""]);
    page.div.addEventListener("toggle", openDetailsFromEvent);
    page.div.addEventListener("mouseenter", pageFocusInFromEvent);
    page.pageHead = gui.element("summary", page.div, ["class", "pagehead"]);
    page.pageHead.addEventListener("mouseenter", pageFocusInFromEvent);
    page.siblingNumberSpan = gui.element("span", page.pageHead, ["class", "siblingnumber"]);
    page.siblingNumberText = gui.text("", page.siblingNumberSpan);
    page.fullPageNumberSpan = gui.element("span", page.pageHead, ["class", "fullpagenumber"]);
    page.fullPageNumberText = gui.text("", page.fullPageNumberSpan);
    page.nameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "page name", "class", "name", "disguise", ""]);
    page.nameSpan.addEventListener("change", nameProcessorFromEvent);
    page.nameSpan.addEventListener("blur", nameBlurredFromEvent);
    gui.absorbClicks(page.nameSpan);
    page.nicknameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "nickname", "class", "nickname", "disguise", ""]);
    page.nicknameSpan.addEventListener("change", nameProcessorFromEvent);
    gui.absorbClicks(page.nicknameSpan);
    page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullname"]);
    page.fullNameText = gui.text("", page.fullNameSpan);
}

function newChapter(parentNumber = null, insertBefore = null, name = "Book") {
    let pageNumber = pages.length;
    newPage(pageNumber);
    let page = getPage(pageNumber);
    page.pageType = "chapter";
    page.div.setAttribute("class", "chapter");
    post("newChapter", parentNumber, insertBefore, pageNumber, name);
    newPageGap(page);
    return pageNumber;
}

function newPageGap(page, insertBefore = null) {
    let returner = gui.element("div", page? page.div: null, ["class", "pagegap"], insertBefore? insertBefore.div: null);
    returner.addEventListener("focusin", pageGapFocus);
    let newChapterIn = gui.element("input", returner, ["class", "newchapterin", "placeholder", "new chapter", "disguise", ""]);
    newChapterIn.addEventListener("blur", clearPageGap);
    newChapterIn.addEventListener("change", newChapterInChanged);
    let newStatementIn = gui.element("input", returner, ["class", "newstatementin", "placeholder", "new statement", "disguise", ""]);
    newStatementIn.addEventListener("blur", clearPageGap);
    newStatementIn.addEventListener("change", newStatementInChanged);
    let newCommentIn = gui.element("input", returner, ["class", "newcommentin", "placeholder", "new comment", "disguise", ""]);
    newCommentIn.addEventListener("blur", clearPageGap);
    newCommentIn.addEventListener("change", newCommentInChanged);
    gui.text("❌", gui.element("button", returner, ["class", "dontmovehere", "disabled", ""]));
    let moveHereButton = gui.element("button", returner, ["class", "movehere"]);
    gui.text("⇦", moveHereButton);
    moveHereButton.addEventListener("click", doMove);
    return returner;
}

function getPageGapFromEvent(event) {
    let gap = event.target;
    while (gap.getAttribute("class") != "pagegap") gap = gap.parentElement;
    return gap;
}

function pageGapFocus(event) {
    focusedPageGap = getPageGapFromEvent(event);
}

function clearPageGap(event) {
    let gap = getPageGapFromEvent(event);
    for (let child of gap.querySelectorAll(".newChapterIn, .newStatementIn")) {
        child.blur();
        child.value = "";
    }
}

function getGapParentNumber(gap) {
    while (!gap.hasAttribute("pagenumber")) gap = gap.parentElement;
    return gap.getAttribute("pagenumber");
}

function getGapNextPageNumber(gap) {
    if (gap.nextElementSibling) return gap.nextElementSibling.getAttribute("pagenumber");
    else return null;
}

function newChapterInChanged(event) {
    let gap = getPageGapFromEvent(event), newChapterIn = gap.querySelector(".newchapterin"), line = newChapterIn.value;
    if (!gui.nodeNameScreen(line)) return gui.inputOutput.inputText(newChapterIn, "invalid nodeName");
    clearPageGap({target: gap});
    post("newPageNameCheck", gap.parentElement.getAttribute("pagenumber"), line);
}

function newStatementInChanged(event) {
    console.log("not ready yet");
}

function newCommentInChanged(event) {
    console.log("not ready yet");
}

workerFunctions.pseudoPost = post;

let duration = .3, newPageHeight, doSmoothly = true;

workerFunctions.fetched = function fetched(pageNumber, dataName, ...data) {
    let page = getPage(pageNumber);
    switch (dataName) {
        /*move*/ case "parent": // data is [parentNumber, insertBefore]
            if (data[0] == null) {
                // this case is only for adding the root page (page 0) to the editor
                if (pageNumber != 0) throw Error("only page 0 can be the root, not page " + pageNumber);
                editor.appendChild(page.div);
                newPageHeight = page.div.getBoundingClientRect().height;
            } else {
                let newParent = getPage(data[0]), insertBefore = data[1] == null? null: getPage(data[1]), templateGapBBox = newParent.div.firstChild.nextElementSibling.getBoundingClientRect();
                if (page.div.parentElement) {
                    // existing page (actual move)
                    let gapSpot, pageSpot, newGap = newPageGap();
                    if (page.div.getBoundingClientRect().y < (insertBefore? insertBefore.div.getBoundingClientRect().y: newParent.div.getBoundingClientRect().y+newParent.div.getBoundingClientRect().height)) {
                        // moving down
                        gui.smoothErase(page.div.previousElementSibling, {duration: duration, doSmoothly: doSmoothly});
                        gapSpot = gui.element("div", newParent.div, [], insertBefore? insertBefore.div: null);
                        pageSpot = gui.element("div", newParent.div, [], gapSpot);
                    } else {
                        // moving up
                        gui.smoothErase(page.div.nextElementSibling, {duration: duration, doSmoothly: doSmoothly});
                        pageSpot = gui.element("div", newParent.div, [], insertBefore? insertBefore.div.previousElementSibling: newParent.div.lastElementChild);
                        gapSpot = gui.element("div", newParent.div, [], pageSpot);
                    }
                    gui.smoothInsert(newGap, newParent.div, gapSpot, {
                        onEnd: function() {newParent.div.removeChild(gapSpot)},
                        width: templateGapBBox.width,
                        height: templateGapBBox.height,
                        duration: duration,
                        doSmoothly: doSmoothly
                    });
                    gui.smoothSwap(page.div, pageSpot, {
                        onEnd: function() {newParent.div.removeChild(pageSpot)},
                        width: templateGapBBox.width,
                        duration: duration,
                        doSmoothly: doSmoothly
                    });
                } else {
                    // new page (birth move)
                    let deleteMe2 = gui.element("div", newParent.div, [], insertBefore? insertBefore.div: null), deleteMe1 = gui.element("div", newParent.div, [], deleteMe2);
                    gui.smoothInsert(page.div, newParent.div, deleteMe1, {
                        onEnd: function() {deleteMe1.parentElement.removeChild(deleteMe1)},
                        width: templateGapBBox.width,
                        height: newPageHeight,
                        duration: duration,
                        doSmoothly: doSmoothly
                    });
                    gui.smoothInsert(newPageGap(newParent, insertBefore, false), newParent.div, deleteMe2, {
                        onEnd: function() {deleteMe2.parentElement.removeChild(deleteMe2)},
                        width: templateGapBBox.width,
                        height: templateGapBBox.height,
                        duration: duration,
                        doSmoothly: doSmoothly
                    });
                }
            }
            if (editor.hasAttribute("movemode")) moveModeOff();
        break; /*set name*/ case "name": // data is [name]
            if (page.nameSpan.hasAttribute("inputoutputrevertto")) page.nameSpan.setAttribute("inputoutputrevertto", data[0]);
            else page.nameSpan.value = data[0];
            page.nicknameSpan.setAttribute("placeholder", "nickname for " + data[0]);
            page.nameSpan.setAttribute("value", data[0]);
        break; /*set nickname*/ case "nickname": // data is [nickname]
            if (page.nicknameSpan.hasAttribute("inputoutputrevertto")) page.nicknameSpan.setAttribute("inputoutputrevertto", data[0]);
            else page.nicknameSpan.value = data[0];
            page.nicknameSpan.setAttribute("value", data[0]);
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
    if (parentNumber != focusedPageGap.parentElement.getAttribute("pagenumber")) throw Error("mismatch in parent during check for new page");
    let newChapterIn = focusedPageGap.querySelector(".newChapterIn");
    if (result) {
        newChapter(parentNumber, focusedPageGap.nextElementSibling? focusedPageGap.nextElementSibling.getAttribute("pagenumber"): null, line);
    } else {
        newChapterIn.value = line;
        gui.inputOutput.inputText(newChapterIn, "naming conflict");
    }
}

workerFunctions.smoothMode = function smoothMode(smoothMode) {
    doSmoothly = smoothMode;
}

workerFunctions.save = function save(saves) {
    for (let save of saves) Storage.setItem(save.pageNumber, save.line);
}

workerFunctions.canAcceptMove = function canAcceptMove(pageNumber, accept) {
    getPage(pageNumber).div.setAttribute("canacceptmove", accept);
}

workerFunctions.moveModeOff = moveModeOff;

function getPageNumberFromEvent(e) {
    let element = e.target;
    while (!element.hasAttribute("pagenumber")) element = element.parentElement;
    let pageNumber = element.getAttribute("pagenumber");
    activePage = pageNumber;
    return pageNumber;
}

let focusLocked = false, isFocused;

function pageFocusInFromEvent(e) {pageFocusIn(getPage(getPageNumberFromEvent(e)))}
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

function openDetailsFromEvent(e) {openDetails(getPageNumberFromEvent(e))}
function openDetails(pageNumber) {
    post("openDetails", pageNumber, getPage(pageNumber).div.hasAttribute("open"));
}

function makePageTools() {
    pageTools = gui.element("div", false, ["id", "pagetools"]);
    pageTools.moveButton = gui.button("⇳", pageTools, toggleMoveMode, ["disguise", "", "bigger", ""]);
    gui.shieldClicks(pageTools.moveButton);
    pageTools.deleteBundle = gui.deleteBundle(pageTools, function() {console.log("deleting");/*isFocused.deletePage()*/});
}

function toggleMoveMode(e) {
    if (editor.hasAttribute("movemode")) moveModeOff();
    else moveModeOn(getPageNumberFromEvent(e));
}

function moveModeOn(pageNumber) {
    let page = getPage(pageNumber);
    if (editor.hasAttribute("movemode")) throw Error("already in move mode");
    lockedPageFocus = true;
    editor.setAttribute("movemode", "");
    page.div.setAttribute("movingPage", "");
    post("startMoveModeChecks", page.pageNumber);
}

function moveModeOff() {
    if (!editor.hasAttribute("movemode")) throw Error("cannot turn move mode off if not in move mode");
    lockedPageFocus = false;
    editor.removeAttribute("movemode");
    document.querySelector("[movingpage]").removeAttribute("movingPage");
    for (let page of document.querySelectorAll("[canacceptmove]")) page.removeAttribute("canacceptmove");
    post("endMoveMode");
}

function doMove(e) {
    let gap = e.target.parentElement, movingPage = getPage(document.querySelector("[movingpage]").getAttribute("pagenumber"));
    post("move", movingPage.pageNumber, getGapParentNumber(gap), getGapNextPageNumber(gap));
}

let Storage = {};

Storage.alert = function() {
    document.body.innerHTML = "<p>Error: Window localStorage is unavailable, please make it available to use this editor.</p><p>This will likely involve some settings in your browser.</p>";
}

Storage.setItem = function setItem(name, value) {
    if ((typeof name == "undefined") || (typeof value == "undefined")) throw Error("saving an undefined");
    try {
        return window.localStorage.setItem(name, value);
    } catch (e) {
        Storage.alert();
    }
}

Storage.getItem = function getItem(name) {
    if (typeof name == "undefined") throw Error("getting an undefined");
    try {
        return window.localStorage.getItem(name);
    } catch (e) {
        Storage.alert();
    }
}

Storage.removeItem = function removeItem(name) {
    if (typeof name == "undefined") throw Error("removing an undefined");
    try {
        return window.localStorage.removeItem(name);
    } catch (e) {
        Storage.alert();
    }
}

Storage.moveItem = function moveItem(oldName, newName) {
    if (oldName == newName) return;
    Storage.setItem(newName, Storage.getItem(oldName));
    Storage.removeItem(oldName);
}

Storage.deleteAll = function deleteAll() {
    window.localStorage.clear();
}