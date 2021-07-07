{
    loadCSS("graphics/banner.css");
    
    var drawBanner = {};
    // Create a canvas element which draws text and animates a random graph backdrop. Settings for drawing, such as what text is written, are applied as attributes to the canvas element so they can be manipulated with CSS.
    drawBanner.newBanner = function newBanner() {
        let banner = Object.create(drawBanner.protoModel);
        banner.canvas = document.createElement("canvas");
        banner.canvas.setAttribute("class", "banner");
        banner.canvas.setAttribute("nodexgap", "30");
        banner.canvas.setAttribute("nodeygap", "30");
        banner.canvas.setAttribute("nodedensity", ".4");
        banner.canvas.setAttribute("edgedensity", ".3");
        banner.canvas.setAttribute("framesperpx", "2");
        banner.canvas.setAttribute("noderadius", "8");
        banner.canvas.setAttribute("edgereach", "2");
        banner.frames = 0;
        banner.px = 0;
        banner.nodes = [];
        banner.boundDraw = function() {banner.draw();};
        window.requestAnimationFrame(banner.boundDraw);
        return banner;
    }
    
    drawBanner.protoModel = {};
    drawBanner.nodeProto = {};
    // populate nodes with the given density
    drawBanner.protoModel.setupNodes = function setupNodes() {
        let canvas = this.canvas;
        function get(attribute) {return canvas.getAttribute(attribute);}
        
        this.nodes.splice(0, this.nodes.length);
        let nodeDensity = get("nodedensity"), edgeReach = get("edgereach"), bbox = this.canvas.getBoundingClientRect(), width = bbox.width/get("nodexgap") + 2*edgeReach, height = bbox.height/get("nodeygap") + 2*edgeReach;
        this.width = width;
        this.height = height;
        for (let col = 0; col < width; ++col) {
            this.nodes.push([]);
            for (let row = 0; row < height; ++row) {
                if (Math.random() < nodeDensity) this.newNode(col, row, edgeReach);
            }
        }
    }
    
    drawBanner.protoModel.newNode = function newNode(x, y, edgeReach) {
        let node = Object.create(drawBanner.nodeProto);
        this.nodes[x][y] = node;
        node.x = x;
        node.y = y;
        node.nodes = this.nodes;
        node.edgeDensity = this.canvas.getAttribute("edgedensity");
        node.edgeReach = edgeReach;
        node.edges = [];
        node.makeEdges();
        node.color = "rgb(" + (Math.floor(256*Math.random())) + "," + (Math.floor(256*Math.random())) + "," + (Math.floor(256*Math.random())) + ")";
        return node;
    }
    
    drawBanner.nodeProto.makeEdges = function makeEdges() {
        for (let col = this.x-this.edgeReach; col <= this.x; ++col) for (let row = this.y-this.edgeReach; row < this.y+this.edgeReach; ++row) {
            if (this.nodes[col]) if (this.nodes[col][row]) {
                if (Math.random() < this.edgeDensity) {
                    this.edges.push({dx: col-this.x, dy: row-this.y});
                }
            }
        }
    }
    
    drawBanner.nodeProto.moveLeft = function moveLeft() {
        this.nodes[this.x][this.y] = undefined;
        if (this.x-- > 0) {
            this.nodes[this.x][this.y] = this;
        }
    }
    
    drawBanner.protoModel.shiftLeft = function shiftLeft() {
        for (let x = 0; x < this.nodes.length; ++x) for (let y = 0; y < this.nodes[x].length; ++y) if (this.nodes[x][y]) this.nodes[x][y].moveLeft();
        let last = this.nodes.length - 1;
        for (let y = 0; y < this.height; ++y) {
            if (Math.random() < this.canvas.getAttribute("nodedensity")) this.newNode(last, y, this.canvas.getAttribute("edgereach"));
        }
    }
    
    drawBanner.pi2 = Math.PI * 2;
    
    drawBanner.protoModel.draw = function draw() {
        let canvas = this.canvas, context = canvas.getContext("2d"), get = function(attribute) {return canvas.getAttribute(attribute)};
        let bbox = canvas.getBoundingClientRect();
        if (canvas.width != bbox.width || canvas.height != bbox.height) {
            canvas.width = bbox.width;
            canvas.height = bbox.height;
            this.setupNodes();
        }
        if (++this.frames > get("framesperpx")) {
            this.frames = 0;
            ++this.px;
        }
        if (this.px > get("nodexgap")) {
            this.px = 0;
            this.shiftLeft();
        }
        // fill background
        if (!canvas.hasAttribute("background")) canvas.setAttribute("background", "white");
        context.fillStyle = canvas.getAttribute("background");
        context.fillRect(0, 0, canvas.width, canvas.height);
        if (!canvas.hasAttribute("color")) canvas.setAttribute("color", "black");
        // draw nodes and edges
        let node, xgap = get("nodexgap"), ygap = get("nodeygap"), edgeReach = get("edgereach"), radius = get("noderadius");
        let xshift = -xgap*edgeReach, yshift = -ygap*edgeReach;
        for (let x = 0; x < this.nodes.length; ++x) for (let y = 0; y < this.nodes[x].length; ++y) if (this.nodes[x][y]) {
            node = this.nodes[x][y];
            context.strokeStyle = "black";
            for (let edge of node.edges) {
                context.beginPath();
                context.moveTo(node.x*xgap+xshift-this.px, node.y*ygap+yshift);
                context.lineTo((node.x+edge.dx)*xgap+xshift-this.px, (node.y+edge.dy)*ygap+yshift);
                context.stroke();
            }
        }
        for (let x = 0; x < this.nodes.length; ++x) for (let y = 0; y < this.nodes[x].length; ++y) if (this.nodes[x][y]) {
            node = this.nodes[x][y];
            context.fillStyle = node.color;
            context.beginPath();
            context.arc(node.x*xgap+xshift-this.px, node.y*ygap+yshift, radius, 0, drawBanner.pi2);
            context.fill();
        }
        // draw text
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = (bbox.height/2) + "px sans-serif";
        context.fillStyle = canvas.getAttribute("color");
        context.fillText(canvas.getAttribute("text"), canvas.width/2, canvas.height/2);
        window.requestAnimationFrame(this.boundDraw);
    }
}