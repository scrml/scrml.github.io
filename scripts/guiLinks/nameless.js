// Nameless pages aren't actually nameless, they just set their names to "namelessPage##" where ## is their pageId. Also they don't show their names or other identifying information in the gui.

let pageType = scrmljs.mainLink.types.page, namelessType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    scrmljs.loadCSS("styles/guiLinks/nameless.css");
    let extension = pageType.extensions.nameless, namelessProto = extension.linkProto = Object.create(pageType.linkProto);
    namelessProto.isType = "nameless";
    namelessProto.isNameless = true;
    namelessType = extension.type = Object.create(pageType);
    namelessType.linkProto = namelessProto;
    pageType.showNameless = namelessType.createLink = function createLink(linkId, extensionName = "nameless") {
        let page = pageType.createLink(linkId, extensionName);
        page.div.setAttribute("nameless", "");
        return page;
    }
}

let workerInitializer = function workerInitializer() {
    // first the raw nameless stuff
    let pageProto = scrmljs.pageProtos.page, namelessProto = scrmljs.pageProtos.nameless = Object.create(pageProto);
    
    namelessProto.pageType = "nameless";
    namelessProto.isNameless = true;
    
    scrmljs.pageCreators.nameless = function newNameless(name, nickname, protoModel = namelessProto) {
        return scrmljs.pageCreators.page(name, nickname, protoModel);
    }
    
    // now for guiLink stuff
    
    let extension = pageType.extensions.nameless, nLinkProto = extension.linkProto = Object.create(pageType.linkProto);
    nLinkProto.isType = "nameless";
    nLinkProto.isNameless = true;
    namelessType = extension.type = Object.create(pageType);
    namelessType.linkProto = nLinkProto;
    namelessType.extensionName = "nameless";
    namelessType.createLink = function createLink(page, extensionName = "nameless") {
        pageType.createLink(page, extensionName);
    }
}

pageType.extensions.nameless = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}