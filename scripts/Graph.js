// First we create plain graphs. Structure consists of ui (universal identifier), typed members, named edges, and ancestry.
let Graph = scrmljs.Graph = {}, idManager = scrmljs.idManager, newVarManager = scrmljs.newVarManager, isEmpty = scrmljs.isEmpty, emptyFunction = scrmljs.emptyFunction, trueFunction = scrmljs.trueFunction;

Graph.allGraphs = idManager.newManager("ui");

Graph.protoModel = {thisIs: "Graph"};// object to be used as prototype of instances of graph
    
Graph.newGraph = function newGraph(protoModel = Graph.protoModel) {
    let returner = Object.create(protoModel), manager = returner.manager = newVarManager();
    // override setUi, the prototype wants to update the manager but the manager can't be initialized yet
    returner.setUi = function(ui) {this.ui = ui};
    Graph.allGraphs.addItem(returner);
    // undo the override
    delete returner.setUi;
    manager.setVarValue("ui", returner.ui);
    returner.members = idManager.newManager("memberId");
    returner.membersByName = {};
    return returner;
}

Graph.protoModel.usesTypes = function usesTypes() {
    let returner = {};
    for (let member of this.members.items) returner[member.type] = undefined;
    return returner;
}
Graph.protoModel.usesType = function usesType(type) {
    for (let member of this.members.items) if (member.type == type) return true;
    return false;
}
Graph.protoModel.isEmpty = function isEmpty() {return this.members.items.length === 0}
Graph.protoModel.canDelete = trueFunction;

Graph.protoModel.deleteGraph = function deleteGraph() {
    if (!this.canDelete()) throw Error("cannot delete graph");
    Graph.allGraphs.preErase(this.ui);
}

let memberProto = Graph.protoModel.memberProto = {}, childProto = memberProto.childProto = {};

// The only place a member is stored is in the graph's members manager. Everywhere else members are referred to by memberId.
Graph.protoModel.addMember = function addMember(name, type, protoModel = this.memberProto) {
    if (!this.canModify()) throw Error("cannot modify graph");
    if (name in this.membersByName) throw Error("already have a member named " + name);
    let member = Object.create(protoModel);
    member.graph = this;
    let manager = member.manager = newVarManager();
    manager.setVarValue("name", name);
    manager.linkProperty("name", member);
    member.type = type;
    // children is an idManager list of (name, memberId) pairs
    member.children = idManager.newManager("childId");
    member.childrenByName = {};
    member.ancestors = {};
    member.descendants = {};
    this.members.addItem(member);
    this.membersByName[name] = member.memberId;
    member.originalId = member.id;
    this.saveStringChangedHook();
    return member;
}

{
    let relate = function relate(members, old, young) {
        let oldM = members[old], youngM = members[young], omd = oldM.descendants, oma = oldM.ancestors, ymd = youngM.descendants, yma = youngM.ancestors;
        if (old in ymd) throw Error("graph must be acyclic");
        if (old in yma) return;
        omd[young] = undefined;
        yma[old] = undefined;
        for (let younger in ymd) relate(members, old, younger);
        for (let older in oma) relate(members, older, young);
    }
    // this can probably be made orders of magnitude faster with a different algorithm
    Graph.protoModel.resetAncestry = function resetAncestry(...theseMembers) {
        let relevants = {}, members = this.members;
        // the only ones which could possibly change are the members given and their families so collect these
        for (let member of theseMembers) {
            relevants[member] = undefined;
            for (let ancestor in members.member(member).ancestors) relevants[ancestor] = undefined;
            for (let descendant in members.member(member).descendants) relevants[descendant] = undefined;
        }
        // get the members instead of just their ids
        for (let member in relevants) relevants[member] = members.member(member);
        // reset the families of the relevant members
        for (let member in relevants) {
            member = relevants[member];
            member.ancestors = {};
            member.descendants = {};
        }
        // relate all the relevant members
        for (let member in relevants) {
            member = relevants[member];
            for (let childName of member.children.items) relate(members, member.memberId, childName.memberId);
        }
        for (let member in relevants) relevants[member].notifyFamilyUpdate();
    }
}

Graph.protoModel.canModify = trueFunction;
Graph.protoModel.setUi = function setUi(ui) {this.manager.setVarValue("ui", ui)}
Graph.protoModel.member = function member(id) {return this.members.items[id]}
Graph.protoModel.eraseMember = function eraseMember(id) {this.member(id).deleteMember()}
Graph.protoModel.saveStringChangedHook = emptyFunction;

Graph.protoModel.saveToAutosaveString = function saveToAutosaveString() {
    let line = this.members.items.length;
    for (let member of this.members.items) line += "\n" + member.saveToAutosaveString();
    return line;
}

memberProto.moveInByName = function moveInByName(name, oldName) {
    if (name == oldName) return;
    let byName = this.graph.membersByName;
    if (name in byName) throw Error("name " + name + " is already in use");
    delete byName[oldName];
    byName[name] = this.id;
}

memberProto.setChild = function setChild(childName, childMemberId, protoModel = this.childProto) {
    let graph = this.graph, members = graph.members.items;
    if (!members[childMemberId]) throw Error(childMemberId + " is not a member of graph " + graph.ui);
    if (childName in this.childrenByName) throw Error("already have a child named " + childName);
    let child = Object.create(protoModel);
    let manager = child.manager = newVarManager();
    manager.setVarValue("name", childName);
    manager.linkProperty("name", child);
    manager.setVarValue("memberId", childMemberId);
    manager.linkProperty("memberId", child);
    this.children.addItem(child);
    graph.resetAncestry();
    graph.saveStringChangedHook();
}

memberProto.unsetChild = function unsetChild(childName) {
    let children = this.children, byName = this.childrenByName, child = byName[childName];
    if (!(child)) throw Error(childName + " is not a child");
    children.preErase(child.childId);
    children.flushErasePreserveOrder();
    let graph = this.graph;
    graph.resetAncestry(this.memberId, child.memberId);
    graph.saveStringChangedHook();
}

memberProto.canDelete = function canDelete() {return isEmpty(this.ancestors)}
// to be overridden if anything later wants to keep updated with a member's family
memberProto.notifyFamilyUpdate = emptyFunction;

memberProto.deleteMember = function deleteMember() {
    if (!this.canDelete()) throw Error("cannot delete member");
    let graph = this.graph, members = graph.members, myType = this.type, inUse = false;
    for (let d in this.descendants) delete graph.member(d).ancestors[this.ui];
    for (let member of members.items) inUse = inUse || (member.type == myType && member.id !== this.id);
    members.preErase(this.id);
    members.flushErasePreserveOrder();
}

// to be called by the idManager only
memberProto.setMemberId = function setMemberId(newMemberId, oldMemberId) {
    let graph = this.graph, members = graph.members.items;
    this.memberId = newMemberId;
    if (typeof oldMemberId === "undefined") return;
    for (let member of members) {
        for (let child of member.children.items) if (child.memberId == oldMemberId) child.memberId = newMemberId;
        if (oldMemberId in member.ancestors) {
            member.ancestors[newMemberId] = undefined;
            delete member.ancestors[oldMemberId];
        } else if (oldMemberId in member.descendants) {
            member.descendants[newMemberId] = undefined;
            delete member.descendants[oldMemberId];
        }
    }
    graph.membersByName[this.name] = newMemberId;
    graph.saveStringChangedHook();
}

memberProto.saveToAutosaveString = function saveToAutosaveString() {
    let line = this.name + " " + this.type;
    for (let child of this.children.items) line += " " + child.name + " " + child.memberId;
    return line;
}

function printGraphs() {
    for (let graph of Graph.allGraphs.items) {
        console.log("graph " + graph.ui + ": " + graph.name);
        console.log(graph.saveToAutosaveString());
    }
    console.log("_________________________________________________________________________");
}