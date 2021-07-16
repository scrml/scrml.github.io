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

guiWorkerLink.linkProto.setLinkId = function setLinkId(newLinkId, oldLinkId = this.linkId) {
    this.linkId = newLinkId;
    delete guiWorkerLink.links[oldLinkId];
    guiWorkerLink.links[newLinkId] = this;
}

guiWorkerLink.linkProto.erase = function erase() {
    delete guiWorkerLink.links[this.linkId];
}

guiWorkerLink.types = {};

guiWorkerLink.linkCreators = {};

guiWorkerLink.links = {};