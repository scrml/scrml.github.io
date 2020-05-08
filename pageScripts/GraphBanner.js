var GraphBanner = {};console.log(currentScriptLocation());

function drawBanner(canvas) {
    // reset canvas size to match actual size
    let rect = canvas.getBoundingClientRect(), width = rect.width, height = rect.height;
    canvas.width = width;
    canvas.height = height;
    let context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "black";
    context.font = (height/2) + "px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("SCRML", width/2, height/2);
}

// after everything is loaded, set up the page
function setupPage() {
    // set up banner
    let banner = gui.element(null, "canvas", {class: "banner"});
    document.body.insertBefore(banner, document.body.firstChild);
    gui.text(gui.element(banner, "h1"), "SCRML");
    let bannerCSS = document.getElementById("bannerCSS");
    if (!bannerCSS) gui.element(document.head, "link", {rel: "stylesheet", href: "styles/banner.css", id: "bannerCSS"});
    let redrawBanner = function() {drawBanner(banner)};
    // timeout is to allow canvas resizing from CSS and also to avoid crashing should the browser not support canvas
    window.setTimeout(redrawBanner, 100);
    window.addEventListener("resize", redrawBanner);
}