ScriptManager.openScript(filePrefix + "scripts/gui.js", "gui");
Scripts["gui"].script.addEventListener("managed", start);

let root, pageProto = {}, chapterProto = Object.create(pageProto), statementProto, commentProto, buttons;
let pageTools;

function start() {
    editor.appendChild(testDiv);
    makePageTools();
    root = newChapter(false, false, "Book");
    root.a = "root";
    root.show();
    root.open(true);
    root.chapterHead.setAttribute("id", "rootHead");
    document.getElementById("editor").appendChild(root.div);
    root.newPageMakers = {
        chapter: function(gap, name) {
            newChapter(gap.SCRMLEditorTiein.chapter, gap.SCRMLEditorTiein.nextPage, name);
        }
    };
    root.setPageMode = function setPageMode(mode) {
        if (this.newPageMode != "moveHere" && this.newPageMode != "dontMoveHere") this.lastPageMode = this.newPageMode? this.newPageMode: mode;
        this.newPageMode = mode;
        this.applyToSubChapters(function() {
            if (this.cleanupGaps) for (let f of this.cleanupGaps) {
                f.SCRMLEditorTiein.gap.setAttribute("mode", mode);
                f.SCRMLEditorTiein.gap.removeAttribute("disabled");
            }
        });
    }
    root.setPageMode("chapter");
    for (let type of ["chapter", "statement", "comment"]) document.getElementById(type+"Mode").addEventListener("click", function() {root.setPageMode(type)});
}

let focusLocked = false, isFocused = undefined;

function makePageTools() {
    pageTools = gui.element("div", false, ["id", "pageTools"]);
    pageTools.moveButton = gui.button("⇳", pageTools, toMoveMode, ["disguise", "", "bigger", ""]);
    pageTools.deleteBundle = gui.deleteBundle(pageTools, function() {isFocused.deletePage()});
}

function pageToolsMouseoverListener(e) {
    if (focusLocked) return;
    e = e.target;
    while (!e.SCRMLEditorTiein || !e.SCRMLEditorTiein.page) e = e.parentElement;
    e.SCRMLEditorTiein.page.focus();
}

function lockFocus(page) {
    page.focus();
    focusLocked = true;
}

function unlockFocus() {
    if (root.newPageMode == "moveHere") root.setPageMode(root.lastPageMode);
    focusLocked = false;
    isFocused = undefined;
    if (pageTools.parentElement) pageTools.parentElement.removeChild(pageTools);
}

function toMoveMode(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (focusLocked) {
        unlockFocus();
        root.setPageMode(root.lastPageMode);
        return;
    }
    lockFocus(isFocused);
    root.setPageMode("moveHere");
    isFocused.applyToSubChapters(function() {
        if (this.cleanupGaps) for (let f of this.cleanupGaps) {
            f.SCRMLEditorTiein.gap.setAttribute("mode", "dontMoveHere");
            f.SCRMLEditorTiein.gap.setAttribute("disabled", "");
        }
    });
}

function newChapter(parent, insertBefore, name = "") {
    let returner = Object.create(chapterProto);
    returner.isChapter = true;
    returner.manager = newVarManager();
    returner.manager.setVarValue("name", name);
    returner.manager.linkProperty("name", returner);
    returner.manager.setVarValue("nickname", "");
    returner.manager.linkProperty("nickname", returner);
    returner.manager.setVarValue("chapterNumber", -1);
    returner.manager.linkProperty("chapterNumber", returner);
    returner.manager.linkListener("chapterNumber", function(chapterNumber) {
        returner.updateFullChapterNumber();
        if (returner.nextChapter) returner.nextChapter.manager.setVarValue("chapterNumber", chapterNumber+1);
    }, true);
    returner.manager.linkProperty("fullChapterNumber", returner);
    returner.manager.linkListener("fullChapterNumber", function() {if (returner.firstChapter) returner.firstChapter.updateFullChapterNumber()});
    if (parent) parent.insertBefore(returner, insertBefore);
    return returner;
}

chapterProto.childNameScreen = function childNameScreen(proposal) {
    if (!gui.nodeNameScreen(proposal)) return false;
    let page = this.firstPage;
    while (page) {
        if (page.name == proposal) return false;
        page = page.nextPage;
    }
    return true;
}

pageProto.orphan = function orphan() {
    if (!this.parent) return;
    if (this.parent.showCleanups && this.parent.isOpen) {
        let array = this.parent.cleanupGaps;
        for (let i = 0; i < array.length; ++i) if (array[i].SCRMLEditorTiein.gap == this.previousGap) {
            array[i]();
            array.splice(i, 1);
            break;
        }
        this.nextGap.SCRMLEditorTiein.previousPage = this.previousPage;
        if (this.previousPage) this.previousPage.nextGap = this.nextGap;
        this.div.parentElement.removeChild(this.div);
    }
    if (this.previousPage) this.previousPage.nextPage = this.nextPage;
    else this.parent.firstPage = this.nextPage;
    if (this.nextPage) this.nextPage.previousPage = this.previousPage;
    else this.parent.lastPage = this.previousPage;
    if (this.previousChapter) this.previousChapter.nextChapter = this.nextChapter;
    else this.parent.firstChapter = this.nextChapter;
    if (this.nextChapter) this.nextChapter.previousChapter = this.previousChapter;
    else this.parent.lastChapter = this.previousChapter;
    if (this.previousChapter) this.previousChapter.manager.setVarValue("chapterNumber", this.previousChapter.chapterNumber);
    else if (this.nextChapter) this.nextChapter.manager.setVarValue("chapterNumber", this.nextChapter.chapterNumber-1);
    this.parent = this.previousPage = this.nextPage = this.previousChapter = this.nextChapter = undefined;
}

chapterProto.insertBefore = function insertBefore(newPage, beforeMe) {
    if (newPage == beforeMe || (beforeMe && newPage.nextPage == beforeMe) || (newPage == this.lastPage && !beforeMe)) return;
    if (beforeMe && (this != beforeMe.parent)) throw Error("the kid is not my son");
    newPage.orphan();
    if (!this.childNameScreen(newPage.name)) {
        let modifier = 0;
        while (!this.childNameScreen(newPage.name + "_" + ++modifier));
        newPage.manager.setVarValue("name", newPage.name + "_" + modifier);
    }
    newPage.parent = this;
    if (beforeMe) {
        if (beforeMe == this.firstPage) this.firstPage = newPage;
        else {
            beforeMe.previousPage.nextPage = newPage;
            newPage.previousPage = beforeMe.previousPage;
        }
        newPage.nextPage = beforeMe;
        beforeMe.previousPage = newPage;
    } else {
        if (this.lastPage) {
            this.lastPage.nextPage = newPage;
            newPage.previousPage = this.lastPage;
        } else this.firstPage = newPage;
        this.lastPage = newPage;
    }
    if (newPage.isChapter) {
        if (beforeMe && beforeMe.isChapter) {
            newPage.nextChapter = beforeMe;
            newPage.previousChapter = beforeMe.previousChapter;
            if (beforeMe.previousChapter) beforeMe.previousChapter.nextChapter = newPage;
            else this.firstChapter = newPage;
            beforeMe.previousChapter = newPage;
        } else {
            if (beforeMe && beforeMe.nextChapter) {
                newPage.nextChapter = beforeMe.nextChapter;
                newPage.previousChapter = beforeMe.nextChapter.previousChapter;
                beforeMe.nextChapter.previousChapter = newPage;
                if (newPage.previousChapter) newPage.previousChapter.nextChapter = newPage;
                else this.firstChapter = newPage;
            } else {
                if (this.lastChapter) {
                    this.lastChapter.nextChapter = newPage;
                    newPage.previousChapter = this.lastChapter;
                } else this.firstChapter = newPage;
                this.lastChapter = newPage;
            }
        }
        let page = newPage.previousChapter;
        if (!page) page = this.firstPage;
        while (page != newPage) {
            page.nextChapter = newPage;
            page = page.nextPage;
        }
        page = beforeMe;
        while (page && !page.isChapter) {
            page.previousChapter = newPage;
            page = page.nextPage;
        }
        if (newPage.previousChapter) newPage.previousChapter.manager.setVarValue("chapterNumber", newPage.previousChapter.chapterNumber);
        else newPage.manager.setVarValue("chapterNumber", 1);
    }
    if (this.showCleanups && this.isOpen) {
        newPage.show();
        let replacing;
        if (beforeMe) replacing = beforeMe.previousGap;
        else if (newPage.previousPage) replacing = newPage.previousPage.nextGap;
        else replacing = this.cleanupGaps[0].SCRMLEditorTiein.gap;
        this.div.insertBefore(newPage.div, replacing);
        this.cleanupGaps.push(newGap(this, newPage, "previous", gapHandler));
        newPage.nextGap = replacing;
        replacing.SCRMLEditorTiein.previousPage = newPage;
    } else newPage.hide();
}
chapterProto.show = function show() {
    if (this.showCleanups) return;
    let me = this;
    me.showCleanups = {};
    me.div = gui.element("details", null, ["class", "chapter"]);
    me.div.SCRMLEditorTiein = {chapter: this, page: this};
    me.showCleanups.removeDiv = function() {removeAndErase(me, "div", me.smoothly)}
    let elements = {};
    me.showCleanups.EraseElements = function() {for (let e in elements) me[e] = undefined}
    elements.chapterHead = gui.element("summary", me.div, ["class", "chapterHead"]);
    elements.chapterHead.chapter = me;
    elements.chapterHead.addEventListener("click", function() {if (me.isOpen) me.close(); else me.open()});
    elements.chapterNumberSpan = gui.element("span", elements.chapterHead, ["class", "chapterNumber"]);
    elements.chapterNumberText = gui.text("", elements.chapterNumberSpan);
    elements.nameSwapButton = gui.button("⥄", elements.chapterHead, function() {me.nameSwap()}, ["class", "nameSwapButton", "disguise", ""]);
    gui.absorbClicks(elements.nameSwapButton);
    elements.nameSpan = gui.linkedScreenedInput(elements.chapterHead, me.manager, "name", {
        screen: me.parent? function(name) {return me.parent.childNameScreen(name)}: gui.nodeNameScreen,
        atts: ["class", "name", "disguise", ""],
        absorbClicks: true
    });
    me.showCleanups.unlinkName = elements.nameSpan.unlink;
    elements.nameSpan = elements.nameSpan.element;
    elements.nicknameSpan = gui.linkedScreenedInput(null, me.manager, "nickname", {
        screen: trueFunction,
        atts: ["class", "nickname", "disguise", "", "placeholder", "nickname"],
        absorbClicks: true
    });
    me.showCleanups.unlinkNickname = elements.nicknameSpan.unlink;
    elements.nicknameSpan = elements.nicknameSpan.element;
    for (let e in elements) {me[e] = elements[e]}
    me.showCleanups.chapterNumberText = me.manager.linkProperty("fullChapterNumber", elements.chapterNumberText, "nodeValue");
    if (me.parent) me.parent.div.appendChild(me.div);
    if (this.wasOpen) this.open(true);
    this.chapterHead.addEventListener("mouseover", pageToolsMouseoverListener);
}

chapterProto.hide = function hide() {
    if (this.wasOpen = this.isOpen) this.close();
    doAll(this.showCleanups);
    this.showCleanups = undefined;
    if (this == isFocused) unlockFocus();
}

chapterProto.open = function open(simulated = false) {
    let me = this;
    me.isOpen = me.smoothly = true;
    if (simulated) me.div.setAttribute("open", "");
    doAll(me.cleanupsBeforeOpening);
    me.cleanupsBeforeOpening = undefined;
    me.cleanupsBeforeClosing = {};
    let page = me.firstPage;
    while (page) {
        page.smoothly = true;
        page.show();
        page = page.nextPage;
    }
    me.cleanupGaps = [];
    me.cleanupsBeforeClosing.cleanupGaps = function() {doEach(me.cleanupGaps)}
    me.cleanupGaps.push(newGap(me, undefined, undefined, gapHandler));
    page = me.firstPage;
    if (page) {
        me.cleanupGaps[0].SCRMLEditorTiein.gap.SCRMLEditorTiein.nextPage = page;
        page.previousGap = me.cleanupGaps[0].SCRMLEditorTiein.gap;
        me.div.insertBefore(me.cleanupGaps[0].SCRMLEditorTiein.gap, page.div);
    }
    while (page) {
        me.cleanupGaps.push(newGap(me, page, "next", gapHandler));
        page = page.nextPage;
    }
}

chapterProto.close = function close(simulated = false) {
    this.isOpen = this.smoothly = false;
    if (simulated) this.div.removeAttribute("open");
    doAll(this.cleanupsBeforeClosing);
    this.cleanupsBeforeClosing = undefined;
    this.cleanupsBeforeOpening = {};
    let page = this.firstPage;
    while (page) {
        page.smoothly = false;
        page.hide();
        page = page.nextPage;
    }
}

chapterProto.focus = function focus() {
    if (focusLocked || this == isFocused) return;
    isFocused = this;
    this.chapterHead.appendChild(pageTools);
    pageTools.deleteBundle.resetBundle();
}
let gapNumber = 0;
function newGap(chapter, page, direction, onclick, text = "", divClass = "gap") {
    let gap = gui.button(text, chapter.div, onclick, ["class", divClass, "disguise", "", "mode", root.newPageMode], page? direction == "previous"? page.div: page.div.nextElementSibling: null);
    gap.gapNumber = gapNumber++;
    gap.setAttribute("gapNumber", gap.gapNumber);
    if (root.newPageMode == "moveHere" && isAncestorOf(isFocused, chapter)) {
        gap.setAttribute("mode", "dontMoveHere");
        gap.setAttribute("disabled", "");
    }
    gap.SCRMLEditorTiein = {chapter: chapter};
    if (page) page[direction+"Gap"] = gap;
    let oppositeDirection = direction == "previous"? "next": "previous";
    gap.SCRMLEditorTiein[oppositeDirection+"Page"] = page;
    if (page && page[direction+"Page"]) {
        page[direction+"Page"][oppositeDirection+"Gap"] = gap;
        gap.SCRMLEditorTiein[direction+"Page"] = page[direction+"Page"];
    }
    let returner = function() {
        if (gap.parentElement) gap.parentElement.removeChild(gap);
        if (gap.SCRMLEditorTiein.previousPage) gap.SCRMLEditorTiein.previousPage.nextGap = undefined;
        if (gap.SCRMLEditorTiein.nextPage) gap.SCRMLEditorTiein.nextPage.previousGap = undefined;
    }
    returner.SCRMLEditorTiein = {gap: gap};
    return returner;
}

function gapHandler(e) {
    let gap = e.target;
    while (!gap.SCRMLEditorTiein) gap = gap.parentElement;
    if (root.newPageMode == "moveHere") {
        let moving = isFocused, beforeHere = gap.SCRMLEditorTiein.nextPage, chapter = gap.SCRMLEditorTiein.chapter;
        unlockFocus();
        root.setPageMode(root.lastPageMode);
        chapter.insertBefore(moving, beforeHere);
    } else gui.focusedScreenedInputReplace(
        gap.parentElement,
        gap,
        function(name) {root.newPageMakers[root.newPageMode](gap, name)},
        {
            atts: ["class", "gap", "disguise", ""],
            screen: function(name) {return gap.SCRMLEditorTiein.chapter.childNameScreen(name)}
        }
    );
}

chapterProto.nameSwap = function nameSwap() {
    if (this.nameSpan.parentElement) {
        this.chapterHead.replaceChild(this.nicknameSpan, this.nameSpan);
        this.nameSwapButton.innerHTML = "⥂";
    } else {
        this.chapterHead.replaceChild(this.nameSpan, this.nicknameSpan);
        this.nameSwapButton.innerHTML = "⥄";
    }
}

chapterProto.computeFullChapterNumber = function computeFullChapterNumber() {
    if (this.parent) {
        if (this.parent.parent) return this.parent.fullChapterNumber + "." + this.chapterNumber;
        else return this.chapterNumber;
    }
    else return "";
}

chapterProto.updateFullChapterNumber = function updateFullChapterNumber() {
    this.manager.setVarValue("fullChapterNumber", this.computeFullChapterNumber());
}

chapterProto.applyToSubChapters = function applyToSubChapters(func, ...args) {
    func.apply(this, args);
    let sub = this.firstChapter;
    while (sub) {
        sub.applyToSubChapters(func, args);
        sub = sub.nextChapter;
    }
}

chapterProto.deletePage = function deletePage() {
    while (this.firstPage) this.parent.insertBefore(this.firstPage, this);
    this.orphan();
}

function doAll(functions, ...args) {for (let f in functions) functions[f](args)}

function doEach(functions, ...args) {for (let f of functions) f(args)}

function removeAndErase(object, elementName, smooth = false) {
    if (object[elementName]) if (object[elementName].parentNode) {
        if (smooth) gui.smoothErase(object[elementName]);
        else object[elementName].parentNode.removeChild(object[elementName]);
    }
    object[elementName] = undefined;
}
