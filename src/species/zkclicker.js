/**

 */
define(function(require) {
    "use strict";

    var configurable = require('../utils/configurable');
    var Chance = require('../vendor/chance');
    var RandomizerRequiredException = require('../exceptions/randomizerRequired');
    var UIEffects = require('../utils/uiEffects');
    var rootsSelector = require('../utils/zkRootsSelector');

    return function() {

        var document = window.document,
            body = document.body;

        var defaultClickTypes = ['click', 'click', 'click', 'click', 'click', 'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'mouseout'];
        var defaultExcludeQuery = [
            '.z-treerow','.z-treecell','.z-treecell-content','.z-tree-spacer','.z-treerow-radio','.z-treerow-icon','.z-treerow-checkbox',
            '.z-tab-content','.z-tab',
            '.z-checkbox-content',
            '.z-radio-content',
            '.z-listitem-icon .z-icon-check',
            '.z-listitem-checkbox',
            '.z-listcell',
            '.z-combobox-button', '.z-combobox-icon',
            '.z-selectbox',
            '.z-datebox-button', '.z-datebox-icon'];
        
        /**
         * @mixin
         */
        var config = {
            clickTypes:       defaultClickTypes,
            positionSelector: defaultPositionSelector,
            showAction:       UIEffects.point,
            canClick:         defaultCanClick,
            maxNbTries:       100,
            logger:           null,
            randomizer:       null,
            debug:            false,
            rootsSelector:    rootsSelector,
            elementsSelector: defaultElementsSelector,
            elementsFilter:   defaultElementsFilter,
            simpleClickRatio: 10,
            excludeQuery:  defaultExcludeQuery.join(',')
        };

        function defaultPositionSelector() {
            return [
                config.randomizer.natural({ max: document.documentElement.clientWidth - 1 }),
                config.randomizer.natural({ max: document.documentElement.clientHeight - 1 })
            ];
        }
        
        function defaultElementsSelector() {
            var roots = config.rootsSelector();
            return roots.find(':visible');
        }
        
        function defaultElementsFilter(elements) {
            return elements.filter(function(idx, e) {
                var elem = $(e);
                return elem.css('cursor') === "pointer" 
                    && elem.parents(".z-groupbox-header").parents(".z-popup").length === 0
                    && !elem.is(config.excludeQuery)
            });
        }

        function defaultCanClick() {
            return true;
        }        
        
        function doSimpleClick() {
            var position, posX, posY, targetElement, nbTries = 0;
            do {
                position = config.positionSelector();
                posX = position[0];
                posY = position[1];
                targetElement = document.elementFromPoint(posX, posY);
                nbTries++;
                if (nbTries > config.maxNbTries) return false;
            } while (!targetElement || !config.canClick(targetElement));
            
            return [targetElement, posX, posY];
        }
        
        function doElementClick(elements) {
            if (!elements.length) {
                return false;
            }
            
            var position, posX, posY, targetElement, nbTries = 0;
            do {
                targetElement = config.randomizer.pick(elements);
                elements.splice( $.inArray(targetElement, elements), 1 );

                if (targetElement) {
                    position = $(targetElement).offset();
                    posX = position.left + $(targetElement).width() / 2;
                    posY = position.top + $(targetElement).height() / 2;
                }

                nbTries++;
                if (nbTries > config.maxNbTries || !elements.length) {
                    return false;
                }
            } while (!targetElement || !config.canClick(targetElement));
            return [targetElement, posX, posY];            
        }
        
        
        /**
         * @mixes config
         */
        function clickerGremlin() {
            if (!config.randomizer) {
                throw new RandomizerRequiredException();
            }
            var targetElement, target, posX, posY;
            
            if (config.randomizer.bool({likelihood: config.simpleClickRatio})) {
                target = doSimpleClick();
            } else {
                var elements = config.elementsSelector();
                elements = config.elementsFilter(elements, defaultElementsFilter);

                if (config.debug) {
                    elements.each(function(idx, e) {
                        UIEffects.rect(e, "yellow", 4000);
                    });
                }
                
                target = doElementClick(elements);
                if (!target) {
                    target = doSimpleClick();
                }
            }

            if (!target) {
                return false;
            }
            
            targetElement = target[0];
            posX = target[1];
            posY = target[2];
            
            var evt = document.createEvent("MouseEvents");
            var clickType = config.randomizer.pick(config.clickTypes);
            evt.initMouseEvent(clickType, true, true, window, 0, 0, 0, posX, posY, false, false, false, false, 0, null);
            if (!config.debug) {
                targetElement.dispatchEvent(evt);
            }

            if (typeof config.showAction == 'function') {
                config.showAction(posX, posY, clickType);
            }

            if (config.logger && typeof config.logger.log == 'function') {
                config.logger.log('gremlin', 'zkclicker   ', clickType, 'at', posX, posY);
            }
        }

        configurable(clickerGremlin, config);

        return clickerGremlin;
    };
});
