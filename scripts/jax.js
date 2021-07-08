//MathJax section
// configuration
var MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
    }
}

function typeset(code = function() {return []}) {
    console.log(code);
    console.log(code.toString());
    try {
        MathJax.startup.promise = MathJax.startup.promise
            .then(() => MathJax.typesetPromise(code()))
            .catch((err) => console.log('Typeset failed: ' + err.message));
        return MathJax.startup.promise;
    } catch (e) {
        code();
    }
}

{
    // don't do fancy loader.js loading of jax script, if jax script doesn't work we don't want the application to hang
    let script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("id", "MathJax-script");
    script.setAttribute("src", "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js");
    document.head.appendChild(script);
}