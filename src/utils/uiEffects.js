define(function(require) {
    "use strict";

    var document = window.document,
        body = document.body;
    
    function defaultShowPoint(x, y) {
        var clickSignal = document.createElement('div');
        clickSignal.style.zIndex = 2000;
        clickSignal.style.border = "3px solid red";
        clickSignal.style['border-radius'] = '50%'; // Chrome
        clickSignal.style.borderRadius = '50%';     // Mozilla
        clickSignal.style.width = "40px";
        clickSignal.style.height = "40px";
        clickSignal.style['box-sizing'] = 'border-box';
        clickSignal.style.position = "absolute";
        clickSignal.style.webkitTransition = 'opacity 1s ease-out';
        clickSignal.style.mozTransition = 'opacity 1s ease-out';
        clickSignal.style.transition = 'opacity 1s ease-out';
        clickSignal.style.left = (x - 20 ) + 'px';
        clickSignal.style.top = (y - 20 )+ 'px';
        var element = body.appendChild(clickSignal);
        setTimeout(function() {
            body.removeChild(element);
        }, 1000);
        setTimeout(function() {
            element.style.opacity = 0;
        }, 50);
    }

    function defaultShowRect(element, color, delay) {
        color = color || "red";
        delay = delay || 2500;
        if(typeof element.attributes['data-old-border'] === 'undefined') {
            element.attributes['data-old-border'] = element.style.border;
        }
        if (!element.attributes['data-old-counter']) {
            element.attributes['data-old-counter'] = 0;
        }
        element.attributes['data-old-counter']++;

        var oldBorder = element.attributes['data-old-border'];
        element.style.border = "1px solid "+color;

        setTimeout(function() {
            element.attributes['data-old-counter']--;
            if (!element.attributes['data-old-counter']) {
                element.style.border = oldBorder;
            }
        }, delay);
    }    
    
    var effects = {
        "point": defaultShowPoint,
        "rect": defaultShowRect
    };
    
    return effects;
});