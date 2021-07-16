scriptLoader.ensureJS("generalFunctions");

var idManager = {};

idManager.protoModel = {};

idManager.newManager = function newManager(idName = "id", protoModel = idManager.protoModel) {
    let returner = Object.create(protoModel);
    returner.items = [];
    returner.idName = idName;
    returner.setIdName = "set"+capitalizeFirstLetter(idName);
    returner.defaultSetIdName = function(id) {this[idName] = id};
    return returner;
}

idManager.protoModel.addItem = function addItem(item) {
    if (this.idName in item) throw Error("item already has property " + this.idName);
    if (!item[this.setIdName]) item[this.setIdName] = this.defaultSetIdName;
    item[this.setIdName](this.items.length);
    this.items.push(item);
}

idManager.protoModel.eraseItem = function eraseItem(id) {
    this.items[id] = this.items[this.items.length-1];
    this.items[id][this.setIdName](id);
    this.items.pop();
}