function(url, encoded) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    if (url) script.src = url;
    script.innerHTML = decodeURIComponent(window.atob(encoded));
    document.head.appendChild(script);
}
