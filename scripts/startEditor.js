// load required scripts
scriptLoader.ensureJS("gui", ["generalFunctions"]);
scriptLoader.ensureJS("xml", ["gui"]);
scriptLoader.ensureJS("jax");
scriptLoader.ensureJS("guiWorkerLink", ["gui"]);
scriptLoader.ensureJS("page", ["guiWorkerLink"]);
scriptLoader.addEphemeralListener(function() {
    scriptLoader.items.gui.addEphemeralListener("js", function() {
        gui.ensureAllModules(function() {
            scriptLoader.addEphemeralListener(start);
        });
    });
});

// DOM elements
let editor = document.getElementById("editor"), nameModeButton = document.getElementById("nodenamemode"), nicknameModeButton = document.getElementById("nicknamemode"), debugButton = document.getElementById("debugbutton");

function setDebugAction(action) {
    debugButton.setAttribute("title", action.toString());
    debugButton.onclick = action;
}

setDebugAction(function() {
    localStorage.clear();
    localStorage.setItem("max pageId", "3");
    localStorage.setItem("page 0", "chapter\nBook\n\no\n1 2");
    localStorage.setItem("page 1", "chapter\nfirstChild\nFirst Child\nc\n");
    localStorage.setItem("page 2", "chapter\nsecondChild\nSecond Child\nc\n");
    window.location.reload();
});

// configuration parameters
let doSmoothly, smoothDuration = .3, newPageHeight, pageMode;

// page display mode section
{
    let pageNumberListener = function(e) {editor.setAttribute("pagenumbermode", e.target.getAttribute("id"))}
    for (let pageNumberMode of ["siblingnumber", "fullpagenumber"]) document.getElementById(pageNumberMode).addEventListener("change", pageNumberListener);
    let nameModeListener = function(e) {editor.setAttribute("namemode", e.target.getAttribute("id"))}
    for (let nameMode of ["nodenamemode", "nicknamemode", "fullnamemode"]) document.getElementById(nameMode).addEventListener("change", nameModeListener);
    for (let pageAction of ["chapter", "statement", "comment"]) document.getElementById("new"+pageAction+"mode").addEventListener("change", function() {
        editor.setAttribute("pageaction", "new"+pageAction+"mode");
        pageMode = pageAction;
        for (let gap of document.querySelectorAll(".newpagein")) gap.setAttribute("placeholder", "new " + pageAction);
    });
}

// editor parts
let root, pageTools, pageLinks = {}, worker,  workerFunctions = {log: console.log}, focusedPageGap, lockedPageFocus = false, loadingScreen;

var ids;
function start() {
    // Loading screen setup: Loading screen opens any time the worker is told to do something, blocking the gui from taking input while the worker processes its thing. Its message is updated any time the worker responds. If the loading screen is ever up long enough for the user to see it, this will keep the message changing as things happen and will show no change if something gets stuck. There is an inactivity timer tied to the loading screen too, if the loading screen is unused for long enough then the timer fires an inactivity function.
    
    let activityTimer = newTimer(onInactivity, 10000);
    
    loadingScreen = gui.loadingScreen(editor);
    loadingScreen.loadingTitle.nodeValue = "Working...";
    
    workerFunctions.setLoadingScreen = function(message) {
        loadingScreen.openLoadingScreen(message);
        activityTimer.restart();
    }
    
    workerFunctions.closeLoadingScreen = function() {
        loadingScreen.closeLoadingScreen();
        activityTimer.restart();
    }
    
    // start the worker
    worker = guiWorkerLink.worker = new Worker(filePrefix+"scripts/worker.js");
    
    // all messages start with the name of the response handler function then list the arguments to give that handler
    worker.onmessage = function onmessage(e) {
        //console.log("received message from worker " + e.data);
        let line = e.data.toString();
        try {
            workerFunctions[e.data.shift()](...e.data);
        } catch (x) {
            console.log("failing " + line);
            throw x;
        }
        
    }
    
    workerFunctions.showChapter = guiWorkerLink.linkCreators.chapter;
    
    makePageTools();
    
    // first set the page modes to agree with what buttons are pressed, in case the button presses were cached by the browser
    for (let pageNumberMode of ["siblingnumber", "fullpagenumber"]) if (document.getElementById(pageNumberMode).checked) editor.setAttribute("pagenumbermode", pageNumberMode);
    for (let nameMode of ["nodenamemode", "nicknamemode", "fullnamemode"]) if (document.getElementById(nameMode).checked) editor.setAttribute("namemode", nameMode);
    for (let pageAction of ["chapter", "statement", "comment"]) if (document.getElementById("new"+pageAction+"mode").checked) {
        editor.setAttribute("pageaction", "new"+pageAction+"mode");
        pageMode = pageAction;
    }
    
    // make root chapter/saved pages
    if (!storage.fetch("max pageId")) storage.store("max pageId", 1);
    if (!storage.fetch("page 0")) storage.store("page 0", "chapter\nBook\n\no\n");
    loadPages();
    
    storage.deactivated = true;
}

function loadPages() {
    post("openPageProcess");
    doSmoothly = false;
    let maxPageId = storage.fetch("max pageId");
    for (let i = 0; i < maxPageId; ++i) post("preloadPageFromAutosave", i, storage.fetch("page " + i));
    post("flushLoadPagesFromAutosave");
    post("closePageProcess");
}

function post(functionName, ...args) {
    workerFunctions.setLoadingScreen(functionName + ": " + commaJoin(args));
    worker.postMessage([functionName, ...args]);
}

/*function newStatement(parentNumber = null, insertBefore = null, name = "Book") {
    let pageNumber = pages.length;
    newPage(pageNumber);
    let page = getPage(pageNumber);
    page.name = name;
    page.pageType = "statement";
    page.div.setAttribute("class", "statement");
    post("newStatement", parentNumber, insertBefore, pageNumber, name);
    return pageNumber;
}

function newComment(parentNumber = null, insertBefore = null, name = "Book") {
    let pageNumber = pages.length;
    newPage(pageNumber);
    let page = getPage(pageNumber);
    page.name = name;
    page.pageType = "comment";
    page.div.setAttribute("class", "comment");
    page.div.setAttribute("texin", "false");
    post("newComment", parentNumber, insertBefore, pageNumber, name);
    page.texIn = gui.element("textarea", page.div, ["class", "texin"]);
    page.texIn.addEventListener("blur", texOutFromEvent);
    page.texIn.addEventListener("keypress", shiftEnterTexHandler);
    page.texOut = gui.element("p", page.div, ["class", "texout"]);
    page.texOut.addEventListener("click", texInFromEvent);
    return pageNumber;
}
*/
workerFunctions.pseudoPost = post;

let fetchTypes = {};

workerFunctions.fetched = function fetched(typeName, id, dataName, ...data) {
    //console.log("fetched " + typeName + " " + id + " " + dataName + " " + data);
    
    fetchTypes[typeName][dataName](id, ...data);
    
    /*if (1<0) {
        switch (dataName) {
            /*move/ case "parent": // data is [parentNumber, insertBefore]
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
                            gui.smoothErase(page.div.previousElementSibling, {duration: smoothDuration, doSmoothly: doSmoothly});
                            gapSpot = gui.element("div", newParent.div, [], insertBefore? insertBefore.div: null);
                            pageSpot = gui.element("div", newParent.div, [], gapSpot);
                        } else {
                            // moving up
                            gui.smoothErase(page.div.nextElementSibling, {duration: smoothDuration, doSmoothly: doSmoothly});
                            pageSpot = gui.element("div", newParent.div, [], insertBefore? insertBefore.div.previousElementSibling: newParent.div.lastElementChild);
                            gapSpot = gui.element("div", newParent.div, [], pageSpot);
                        }
                        gui.smoothInsert(newGap, newParent.div, gapSpot, {
                            onEnd: function() {newParent.div.removeChild(gapSpot)},
                            width: templateGapBBox.width,
                            height: templateGapBBox.height,
                            duration: smoothDuration,
                            doSmoothly: doSmoothly
                        });
                        gui.smoothMove(page.div, pageSpot, {
                            onEnd: function() {newParent.div.removeChild(pageSpot)},
                            width: templateGapBBox.width,
                            duration: smoothDuration,
                            doSmoothly: doSmoothly
                        });
                    } else {
                        // new page (birth move)
                        let deleteMe2 = gui.element("div", newParent.div, [], insertBefore? insertBefore.div: null), deleteMe1 = gui.element("div", newParent.div, [], deleteMe2);
                        gui.smoothInsert(page.div, newParent.div, deleteMe1, {
                            onEnd: function() {deleteMe1.parentElement.removeChild(deleteMe1)},
                            width: templateGapBBox.width,
                            height: newPageHeight,
                            duration: smoothDuration,
                            doSmoothly: doSmoothly
                        });
                        gui.smoothInsert(newPageGap(newParent, insertBefore, false), newParent.div, deleteMe2, {
                            onEnd: function() {deleteMe2.parentElement.removeChild(deleteMe2)},
                            width: templateGapBBox.width,
                            height: templateGapBBox.height,
                            duration: smoothDuration,
                            doSmoothly: doSmoothly
                        });
                    }
                }
            break; /*set nickname/ case "nickname": // data is [nickname]
                if (page.nicknameSpan.hasAttribute("messagerevertto")) page.nicknameSpan.setAttribute("messagerevertto", data[0]);
                else page.nicknameSpan.value = data[0];
                page.nicknameSpan.setAttribute("value", data[0]);
            break; /*set pageNumber/ case "siblingNumber": // data is [siblingNumber]
                page.siblingNumberText.nodeValue = data[0];
            break; /*set fullPageNumber/ case "fullPageNumber": // data is [fullPageNumber]
                page.fullPageNumberText.nodeValue = data[0];
            break; /*set fullName/ case "fullName": // data is [fullName]
                page.fullNameText.nodeValue = data[0];
            break; /*show or hide delete button/ case "isInUse": // data is [isInUse]
                page.div.setAttribute("isinuse", data[0]);
                if (page == isFocused) {
                    deleteBundleReset();
                    deleteBundleReset = data[0]? gui.disable(pageTools.deleteBundle.deleteLaunch): emptyFunction;
                }
            break; /*set comment's tex/ case "tex": // data is [tex]
                page.texIn.value = data[0];
                //page.texOut.innerHTML = texAttToInnerHTML(data[0]);
                typeset(function() {
                    page.texOut.innerHTML = texAttToInnerHTML(data[0]);
                    return [page.texOut];
                });
            break; default: console.log("do not recognize fetched type " + dataName);
        }
    }*/
}

fetchTypes.page = {};

fetchTypes.page.name = function setName(linkId, name) {
    let page = getPageFromLinkId(linkId);
    if (page.nameSpan.hasAttribute("messagerevertto")) page.nameSpan.setAttribute("messagerevertto", name);
    else {
        page.nameSpan.value = name;
        page.nameSpan.removeAttribute("disabled");
        page.nameSpan.blur();
    }
    page.nicknameSpan.setAttribute("placeholder", "nickname for " + name);
}

fetchTypes.page.nickname = function setNickname(linkId, nickname) {
    getPageFromLinkId(linkId).nicknameSpan.value = nickname;
}

fetchTypes.page.fullName = function setFullName(linkId, fullName) {
    getPageFromLinkId(linkId).fullNameText.nodeValue = fullName;
}

fetchTypes.page.setOpen = function setOpen(linkId, open) {
    getPageFromLinkId(linkId).setOpen(open);
}

workerFunctions.setMaxPageId = function setMaxPageId(maxId) {
    storage.store("max pageId", maxId);
}

function getPageFromLinkId(linkId) {
    let page = guiWorkerLink.links[linkId];
    if (!page || !page.isPage) throw Error("link " + linkId + " is not a page");
    return page;
}

workerFunctions.errorOut = function errorOut(pageNumber, dataName, ...data) {
    let page = getPage(pageNumber);
    switch (dataName) {
        case "name": // data is [failedName]
            gui.inputOutput.inputText(page.nameSpan, "naming conflict");
    }
}

workerFunctions.pageNameCheck = function pageNameCheck(parentNumber, line, result) {
    console.log("page name result " + parentNumber + " " + line + " " + result);
}

workerFunctions.smoothMode = function smoothMode(smoothMode) {
    doSmoothly = smoothMode;
}

workerFunctions.movePage = function movePage(linkId, parentId, insertBeforeId) {
    getPageFromLinkId(linkId).movePage(getPageFromLinkId(parentId), isFinite(insertBeforeId)? getPageFromLinkId(insertBeforeId): null);
}

workerFunctions.save = function save(pageId, line) {
    storage.store("page " + pageId, line);
}

workerFunctions.canAcceptMove = function canAcceptMove(pageNumber, accept) {
    getPage(pageNumber).div.setAttribute("canacceptmove", accept);
}

workerFunctions.moveModeOff = moveModeOff;

/*let focusLocked = false, isFocused, deleteBundleReset = emptyFunction;

function pageFocusInFromEvent(e) {pageFocusIn(getPage(getPageNumberFromEvent(e)))}
function pageFocusIn(page) {
    if (!lockedPageFocus && isFocused != page) {
        isFocused = page;
        page.pageHead.appendChild(pageTools);
        pageTools.deleteBundle.resetBundle();
        deleteBundleReset();
        deleteBundleReset = page.div.getAttribute("isInUse") == "true"? gui.disable(pageTools.deleteBundle.deleteLaunch): emptyFunction;
    }
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

function openDetailsFromEvent(e) {openDetails(getPageNumberFromEvent(e))}
function openDetails(pageNumber, open = getPage(pageNumber).div.hasAttribute("open")) {
    post("openDetails", pageNumber, open);
}

function texOutFromEvent(e) {texOut(getPageNumberFromEvent(e))}
function texOut(pageNumber) {
    let page = getPage(pageNumber);
    page.div.setAttribute("texin", "false");
    post("setTex", pageNumber, page.texIn.value);
}
function shiftEnterTexHandler(e) {if (e.key == "Enter" && e.shiftKey) texOutFromEvent(e)}
function texInFromEvent(e) {texIn(getPageNumberFromEvent(e))}
function texIn(pageNumber) {
    let page = getPage(pageNumber);
    page.div.setAttribute("texin", "true");
    page.texIn.focus();
}

function deletePage(page) {
    page.div.parentElement.removeChild(page.div.nextElementSibling);
    page.div.parentElement.removeChild(page.div);
    pages[page.pageNumber] = "skipped";
    storage.store(page.pageNumber, "skipped");
    storage.erase("tex " + page.pageNumber);
    post("deletePage", page.pageNumber);
}
*/
function onInactivity() {
    
}

function makePageTools() {
    pageTools = gui.element("div", false, ["id", "pagetools"]);
    pageTools.moveButton = gui.button("⇳", pageTools, toggleMoveMode, ["disguise", "", "bigger", ""]);
    gui.shieldClicks(pageTools.moveButton);
    pageTools.deleteBundle = gui.deleteBundle(pageTools, function() {deletePage(isFocused)});
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
    post("startMoveModeChecks", pageNumber);
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
    moveModeOff();
}

function skipPageSpot() {
    pages.push("skipped");
    post("skipPageSpot");
}

// processing of TeX in a node attribute to make it ready to display as the innerHTML of something
function texAttToInnerHTML(line) {
    return line.replaceAll(/\n/g, "<br>");
}
