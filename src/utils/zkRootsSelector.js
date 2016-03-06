define(function(require) {
    "use strict";
    
    var configurable = require('../utils/configurable');
    var UIEffects = require('../utils/uiEffects');

    function pickTop(wnds) {
        var maxElem, maxZ = 0;
        wnds.each(function(idx, e) {
            var elem = $(e);
            var zIndex = elem.css('z-index');
            
            if (zIndex !== 'auto' && zIndex > maxZ) {
                maxZ = zIndex;
                maxElem = elem;
            }
        });
    
        if (maxZ === 0) {
            return wnds;
        }
        return maxElem;
    }
    
    return function() {
        var query = '.z-window-modal:visible, .z-messagebox-window:visible, .z-page:visible, .z-window:visible, .z-popup:visible';
        var wnds = $(query);
        wnds = pickTop(wnds);
        /*
        wnds.each(function(idx, e) {
            UIEffects.rect(e);
        });
        */
        return wnds;
    }
});