function(encoded) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = window.atob(encoded);
    var parent = document.getElementsByTagName('head').item(0);
    parent.appendChild(script);
}
