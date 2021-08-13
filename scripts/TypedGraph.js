// Typed graphs are the structures of statements as graphs. Added functionality over Graph is type matching and the root element
let Graph = scrmljs.Graph, TypedGraph = scrmljs.Graph.TypedGraph = {}, isEmpty = scrmljs.isEmpty, emptyFunction = scrmljs.emptyFunction, subset = scrmljs.subset;

TypedGraph.protoModel = Object.create(Graph.protoModel);
TypedGraph.protoModel.thisIs = "TypedGraph";

TypedGraph.newGraph = function newGraph(protoModel = TypedGraph.protoModel) {
    let returner = Graph.newGraph(protoModel);
    returner.addMember(0, returner.ui, memberProto).checkChildOrder = false;
    return returner;
}

let memberProto = TypedGraph.protoModel.memberProto = Object.create(Graph.protoModel.memberProto);

TypedGraph.protoModel.addMember = function addMember(name, type, protoModel = this.memberProto) {
    let member = Graph.protoModel.addMember.call(this, name, type, protoModel);
    if (member.memberId) this.member(0).setChild(member.memberId, member.memberId);
    return member;
}

TypedGraph.protoModel.maximalTerms = function maximalTerms() {
    let returner = [];
    for (let max of this.member(0).children.items) returner.push(this.member(max.memberId));
    return returner;
}

TypedGraph.protoModel.usesTypes = function usesTypes() {
    let returner = Graph.protoModel.usesTypes.call(this);
    delete returner[this.ui];
    return returner;
}

// get a list of all possible next terms
/*TypedGraph.protoModel.canFits = function canFits() {
    let returner = {};
    for (let graph of allGraphs) if (this.canFit(graph)) returner[graph.ui] = undefined;
    return returner;
}*/

/*TypedGraph.protoModel.allHomomorphismsFromGraph = function allHomomorphismsFromGraph(graph) {
    
}*/

TypedGraph.protoModel.isGenesis = function isGenesis() {return this.members.items.length === 1};

// type is the definition graph, term is the term currently being checked in this graph, template is the corresponding term in the definition
TypedGraph.protoModel.checkTerm = function checkTerm(type, term, template, encountered) {
    let member = this.member(term), inType = type.member(template);
    if (!(type === Graph.graph(member.type))) throw Error("cannot find type " + member.type + " from " + term);
    // check that types are the same
    if (member.type !== inType.type) throw Error("type of " + term + " is " + member.type + " but it should be " + inType.type);
    // check that the required descendant sctructure is present
    for (let childName in inType.childrenByName) {
        if (!(childName in member.childrenByName)) throw Error(term + " does not have child named " + childName);
        let child = member.childrenByName[childName], typeChild = inType.childrenByName[childName];
        if (!(typeChild in encountered)) encountered[typeChild] = child;
        if (child !== encountered[typeChild]) throw Error("definition mismatch, " + child + " should be " + encountered[typeChild]);
        // recursive step to exhaust the descendants
        this.checkTerm(type, child, typeChild, encountered);
    }
}
// check that the terms in this typed graph match their types
TypedGraph.protoModel.checkMatchType = function checkMatchType() {
    for (let term of this.members.items) if (term.memberId === 0) continue; else this.checkTerm(Graph.graph(term.type), term.memberId, 0, {});
}