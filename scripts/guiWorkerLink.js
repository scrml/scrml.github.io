var guiWorkerLink = {};

guiWorkerLink.linkProto = {};

guiWorkerLink.newLink = function newLink(loadHere, worker, type, insertBefore, protoModel = guiWorkerLink.linkProto) {
    let returner = Object.create(protoModel);
    returner.guiUnit = guiWorkerLink.newGuiUnit(loadHere, insertBefore, type);
    returner.worker = worker;
    return returner;
}

guiWorkerLink.newGuiUnit = function newGuiUnit(loadHere, insertBefore, type) {
    let returner = type.createUnit(loadHere, insertBefore);
    guiWorkerLink.guiUnits.addItem(returner);
    return returner;
}

guiWorkerLink.linkProto.askWorker = function askWorker(questionType, proposedValue) {
    console.log("asking worker " + questionType + " " + proposedValue);
}

guiWorkerLink.types = {};

scriptLoader.ensureJS("idManager");
scriptLoader.items.idManager.addEphemeralListener("js", function() {
    guiWorkerLink.guiUnits = idManager.newManager();
});

guiWorkerLink.openers = {};