var guiWorkerLink = {};

guiWorkerLink.linkProto = {};

guiWorkerLink.newLink = function newLink(linkId, loadHere, type, insertBefore = null) {
    let returner = Object.create(type.protoModel);
    returner.linkId = linkId;
    guiWorkerLink.links[linkId] = returner;
    return returner;
}

guiWorkerLink.linkProto.fetch = function fetch(type, dataName) {
    post("fetch", type, this.linkId, dataName);
}

guiWorkerLink.linkProto.askWorker = function askWorker(type, questionType, proposedValue) {
    post("ask", type, this.linkId, questionType, proposedValue);
}

guiWorkerLink.types = {};

guiWorkerLink.openers = {};

guiWorkerLink.links = {};