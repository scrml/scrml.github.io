var guiWorkerLink = {};

guiWorkerLink.linkProto = {};

guiWorkerLink.newLink = function newLink(linkId, loadHere, type, insertBefore = null) {
    console.log("making new link");
    let returner = Object.create(type.protoModel);
    returner.linkId = linkId;
    guiWorkerLink.links[linkId] = returner;
    // if there ever comes a situation where there are multiple web workers using guiWorkerLinks: this is where the link is assigned a worker
    returner.worker = guiWorkerLink.worker;
    console.log("new link made");console.log(returner);
    return returner;
}

guiWorkerLink.linkProto.askWorker = function askWorker(questionType, proposedValue) {
    console.log("asking worker " + questionType + " " + proposedValue);
}

guiWorkerLink.linkProto.fetch = function fetch(dataName) {
    console.log("fetching " + dataName);
}

guiWorkerLink.types = {};

guiWorkerLink.openers = {};

guiWorkerLink.links = {};