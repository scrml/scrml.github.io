let pageType = scrmljs.mainLink.types.page, statementType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    let extension = pageType.extensions.statement, statementProto = Object.create(pageType.linkProto);
    statementProto.isType = "statement";
    statementProto.isStatement = true;
    statementType = extension.type = Object.create(pageType);
    statementType.linkProto = statementProto;
    statementType.createLink = function createLink(linkId, type = statementType) {
        let page = pageType.createLink(linkId, type);
    }
}

let hostReceivingFunctions = {
    showStatement: function showStatement(linkId) {
        statementType.createLink(linkId, statementType);
    }
}

let workerInitializer = function workerInitializer() {
    let extension = pageType.extensions.statement, statementProto = Object.create(pageType.linkProto);
    statementProto.isType = "statement";
    statementProto.isStatement = true;
    statementType = extension.statementType = Object.create(pageType);
    statementType.showPage = "showStatement";
    statementType.linkProto = statementProto;
    extension.createLink = function createLink(page, type = extension.statementType) {
        pageType.createLink(page, type);
    }
}

let workerReceivingFunctions = {
    
}

pageType.extensions.statement = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }, receivingFunctions: {
        host: hostReceivingFunctions,
        worker: workerReceivingFunctions
    }
}