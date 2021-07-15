scriptLoader.ensureJS("guiWorkerLink");

scriptLoader.items.guiWorkerLink.addEphemeralListener("js", function() {
    let pageType = guiWorkerLink.types.page = {};
    pageType.protoModel = {};
    pageType.protoModel.isType = function() {return "page"};
    pageType.protoModel.isPage = true;
    
    pageType.createUnit = function createUnit(loadHere, insertBefore, type = pageType) {
        let page = Object.create(type.protoModel);
        page.div = gui.element("details", loadHere, ["class", page.isType(), "unitid", -1], insertBefore);
        page.div.addEventListener("toggle", type.toggleListener);
        page.div.addEventListener("mouseenter", type.focusListener);
        page.pageHead = gui.element("summary", page.div, ["class", "pageHead"]);
        page.pageHead.addEventListener("mouseenter", type.focusListener);
        page.siblingNumberSpan = gui.element("span", page.pageHead, ["class", "siblingnumber"]);
        page.siblingNumberText = gui.text("", page.siblingNumberSpan);
        page.fullPageNumberSpan = gui.element("span", page.pageHead, ["class", "fullpagenumber"]);
        page.fullPageNumberText = gui.text("", page.fullPageNumberSpan);
        page.nameSpan = gui.screenedInput(page.pageHead, {
            atts: ["class", "name", "disguise", ""],
            placeholder: "page name",
            onchange: type.nameProcessorListener,
            absorbClicks: true
        });
        page.nameSpan.addEventListener("blur", type.nameBlurredListener);
        page.nicknameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "nickname", "class", "nickname", "disguise", ""]);
        page.nicknameSpan.addEventListener("change", type.nameProcessorListener);
        gui.absorbClicks(page.nicknameSpan);
        page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullname"]);
        page.fullNameText = gui.text("", page.fullNameSpan);
        page.pageNumberOut = gui.text(-1, page.pageHead);
        return page;
    }
    
    pageType.protoModel.setId = function setId(id) {
        this.div.setAttribute("unitid", id);
        this.pageNumberOut.nodeValue = id;
        this.id = id;
    }
    
    pageType.climber = gui.basicClimber(".page", editor);
    
    pageType.getPageFromEvent = function getPageFromEvent(e, type = pageType) {
        e = type.climber(e);
        return guiWorkerLink.guiUnits.items[e.getAttribute("unitid")];
    }
    
    pageType.getLinkFromEvent = function getLinkFromEvent(e, type = pageType) {
        e = type.climber(e);
        return pageLinks[e.getAttribute("unitid")];
    }
    
    pageType.toggleListener = function(e, type = pageType) {
        console.log("toggling " + e);
    }
    
    pageType.focusListener = function(e, type = pageType) {
        e = type.getPageFromEvent(e);
    }
    
    pageType.nameProcessorListener = function(e, type = pageType) {
        let link = type.getLinkFromEvent(e, type);
        link.askWorker("name", link.guiUnit.nameSpan.value);
    }
    
    pageType.nameBlurredListener = function(e, type = pageType) {
        console.log("blurring name");
    }
    
    pageType.linkProto = Object.create(guiWorkerLink.linkProto);
    
    pageType.linkProto.askWorker = function askWorker(questionType, proposedValue) {
        let unit = this.guiUnit;
        unit.nameSpan.setAttribute("disabled", "");
        unit.nameSpan.value = "checking " + unit.nameSpan.value + "...";
        this.worker.postMessage(["pageNameCheck", unit.id, proposedValue]);
    }
    
    let chapterType = guiWorkerLink.types.chapter = Object.create(pageType);
    
    chapterType.protoModel = Object.create(pageType.protoModel);
    chapterType.protoModel.isType = function() {return "chapter"};
    chapterType.protoModel.isChapter = true;
    
    chapterType.createUnit = function createUnit(loadHere, insertBefore) {
        let chapter = pageType.createUnit(loadHere, insertBefore, chapterType);
        return chapter;
    }
    
    chapterType.climber = gui.basicClimber(".chapter", editor);
    portTypedEventListeners(pageType, chapterType, ["getPageFromEvent", "getLinkFromEvent", "focusListener", "nameProcessorListener"]);
        
    guiWorkerLink.openers.chapter = function openGuiChapter(linkId) {
        let link = guiWorkerLink.newLink(editor, worker, chapterType, null, pageType.linkProto);
        pageLinks[linkId] = link;
    }
});

function portTypedEventListeners(proto, instance, functionNames, defaultType = instance) {
    for (let name of functionNames) instance[name] = function(e, type = defaultType) {return proto[name](e, type)};
}

/*
// prototypical new page, do not call this from anything except a (specific type of) page constructor
function newPage(pageNumber) {
    if (pages[pageNumber]) throw Error("page " + pageNumber + " already exists");
    let page = pages[pageNumber] = {pageNumber: pageNumber, pageType: "page"};
    page.div = gui.element("details", null, ["class", "page", "pagenumber", pageNumber]);
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
    //page.pageNumberOut = gui.text(pageNumber, page.pageHead);
}

function newChapter(parentNumber = null, insertBefore = null, name = "Book") {
    let pageNumber = pages.length;
    newPage(pageNumber);
    let page = getPage(pageNumber);
    page.name = name;
    page.pageType = "chapter";
    page.div.setAttribute("class", "chapter");
    post("newChapter", parentNumber, insertBefore, pageNumber, name);
    newPageGap(page);
    return pageNumber;
}
*/