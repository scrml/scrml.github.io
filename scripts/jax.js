let jax = scrmljs.jax = {};

// configuration
var MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
    }
}

jax.promise = new Promise(function (resolutionFunc, rejectionFunc) {
    // import MathJax
    let script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("id", "MathJax-script");
    script.setAttribute("src", "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js");
    document.head.appendChild(script);
    script.addEventListener("load", resolutionFunc);
    script.addEventListener("error", rejectionFunc);
});

jax.typeset = function typeset(element) {
    jax.promise = jax.promise.then(function() {
        return MathJax.startup.promise = MathJax.startup.promise.then(MathJax.typesetPromise([element]));
    });
}