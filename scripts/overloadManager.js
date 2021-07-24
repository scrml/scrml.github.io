{
    let overloadManager = scrmljs.overloadManager = {};
    /*
        Overload manager uses a ticket system. It starts by opening a process. Tickets are added while processes are open. A ticket is stored in a (name, function) pair, both strings, where name is intended to be the id of an object and function refers to a function which can be performed on that object. The tickets pile up as a process continues, but only by name and function. That is, no matter how many times a ticket is added for a given (name, function) pair, that function will evaluate for that name only once at the end. The tickets are all automatically evaluated and flushed once the processes are all closed. If there are no open processes, the ticket is executed immediately.
    */
    
    overloadManager.protoModel = {};
    
    overloadManager.newOverloadManager = function newOverloadManager(protoModel = overloadManager.protoModel) {
        let returner = Object.create(protoModel);
        returner.items = {};
        returner.ticketFunctions = {};
        returner.openProcesses = 0;
        return returner;
    }
    
    overloadManager.protoModel.addTicketFunction = function addTicketFunction(name, func) {
        if (this.ticketFunctions[name]) throw Error(name + " is already a ticket function");
        this.ticketFunctions[name] = func
    }
    
    overloadManager.protoModel.openProcess = function openProcess() {
        ++this.openProcesses;
    }
    
    overloadManager.protoModel.closeProcess = function closeProcess() {
        if (--this.openProcesses == 0) {
            for (let item in this.items) for (let ticketFunction in this.items[item]) this.ticketFunctions[ticketFunction](item, ...this.items[item][ticketFunction]);
            this.items = {};
            this.closeProcessHook();
        }
    }
    
    overloadManager.protoModel.closeProcessHook = emptyFunction;
    
    overloadManager.protoModel.addTicket = function addTicket(item, ticketFunction, ...data) {
        if (this.openProcesses == 0) return this.ticketFunctions[ticketFunction](item, ...data);
        if (!this.items[item]) this.items[item] = {};
        this.items[item][ticketFunction] = data;
    }
}