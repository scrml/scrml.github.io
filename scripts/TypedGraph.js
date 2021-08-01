// Typed graphs are the structures of statements as graphs. Added functionality over Graph is type matching and the root element
let Graph = scrmljs.Graph, TypedGraph = scrmljs.Graph.TypedGraph = {}, isEmpty = scrmljs.isEmpty, emptyFunction = scrmljs.emptyFunction, universe = Graph.universe, geneses = universe.geneses = {}, subset = scrmljs.subset;

TypedGraph.protoModel = Object.create(Graph.protoModel);
TypedGraph.protoModel.thisIs = "TypedGraph";

TypedGraph.newGraph = function newGraph(protoModel = TypedGraph.protoModel) {
    let returner = Graph.newGraph(protoModel);
    returner.addMember(returner.ui, memberProto).checkChildOrder = false;
    returner.markGenesis();
    return returner;
}

let memberProto = TypedGraph.memberProto = Object.create(Graph.memberProto);

TypedGraph.protoModel.addMember = function addMember(type, protoModel = memberProto) {
    if (!this.canDelete()) throw Error("cannot modify a typed graph which is in use");
    let member = Graph.protoModel.addMember.call(this, type, protoModel);
    if (member.id) this.member(0).setChild(member.id, member.id);
    this.markGenesis(false);
    return member;
}

TypedGraph.protoModel.canModify = function canModify() {
    if (!this.canDelete()) return false;
    for (let genesis in geneses) if (genesis != this.ui) return true;
    return false;
}

TypedGraph.protoModel.maximalTerms = function maximalTerms() {
    let returner = [];
    for (let member of this.members.items) if (member.id && subset(member.ancestors, {"0": undefined})) returner.push(member);
    return returner;
}

TypedGraph.protoModel.canFits = function canFits() {
    let returner = {};
    for (let graph of allGraphs) if (this.canFit(graph)) returner[graph.ui] = undefined;
    return returner;
}

TypedGraph.protoModel.canFit = function canFit(graph) {
    for (let required in graph.usesTypes()) if (!this.usesType(required)) return false;
    return true;
}

TypedGraph.protoModel.isGenesis = function isGenesis() {return this.members.items.length === 1};

TypedGraph.protoModel.markGenesis = function markGenesis(mark = true) {
    if (mark === (this.ui in geneses)) return;
    if (mark) geneses[this.ui] = undefined;
    else delete geneses[this.ui];
}

TypedGraph.protoModel.setUi = function setUi(newUi) {
    let oldUi = this.ui;
    Graph.protoModel.setUi.call(this, newUi);
    if (geneses[oldUi]) {
        delete geneses[oldUi];
        geneses[newUi] = undefined;
    }
}

// type is the definition graph, term is the term currently being checked in this graph, template is the corresponding term in the definition
TypedGraph.protoModel.checkTerm = function checkTerm(type, term, template, encountered) {
    let member = this.member(term), inType = type.member(template);
    // check that types are the same
    if (!(member.type && type === Graph.allGraphs[member.type])) throw Error("cannot find type " + member.type + " from " + term);
    if (member.type !== inType.type) throw Error("type of " + term + " is " + member.type + " but it should be " + inType.type);
    // check that the required descendant sctructure is present
    for (let childName in inType.children) {
        if (!(childName in member.children)) throw Error(term + " does not have child named " + childName);
        let child = member.children[childName], typeChild = inType.children[childName];
        if (!(typeChild in encountered)) encountered[typeChild] = child;
        if (child !== encountered[typeChild]) throw Error("definition mismatch, " + child + " should be " + encountered[typeChild]);
        // recursive step to exhaust the descendants
        this.checkTerm(type, child, typeChild, encountered);
    }
}
// check that the terms in this typed graph match their types
TypedGraph.protoModel.checkMatchType = function checkMatchType() {
    for (let term of this.members.items) if (term.id === 0) continue; else this.checkTerm(Graph.allGraphs[term.type], term.id, 0, {});
}

memberProto.deleteMember = function deleteMember() {
    Graph.memberProto.deleteMember.call(this);
    if (this.graph.isGenesis()) this.graph.markGenesis();
}