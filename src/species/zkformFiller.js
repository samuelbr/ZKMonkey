
define(function(require) {
    "use strict";

    var configurable = require('../utils/configurable');
    var Chance = require('../vendor/chance');
    var RandomizerRequiredException = require('../exceptions/randomizerRequired');
    var UIEffects = require('../utils/uiEffects');
    var rootsSelector = require('../utils/zkRootsSelector');

    return function() {

        var document = window.document;

        var defaultMapElements = {
            'textarea:not([readonly="readonly"])': fillTextElement,
            'input[type="text"]:not([readonly="readonly"])': fillTextElement,
            'input[type="text"][class="z-combobox-input"]': fillCombobox,
            'input[type="password"]:not([readonly="readonly"])': fillTextElement,
            'input[type="number"]:not([readonly="readonly"])': fillNumberElement,
            'select:not([readonly="readonly"])': fillSelect,
            'input[type="radio"]:not([readonly="readonly"])': fillRadio,
            'input[type="checkbox"]:not([readonly="readonly"])': fillCheckbox,
            'input[type="email"]:not([readonly="readonly"])': fillEmail,
            'input:not([type])': fillTextElement
        };

        function defaultCanFillElement() {
            return true;
        }     
        
        function defaultElementsSelector() {
            var elementTypes = [];

            for (var key in config.elementMapTypes) {
                if(config.elementMapTypes.hasOwnProperty(key)) {
                    elementTypes.push(key);
                }
            }
            
            var roots = config.rootsSelector();
            return roots.find(elementTypes.join(','));
        }
        
        function defaultElementsFilter(elements) {
            return elements.filter(function(idx, e) {
                var elem = $(e);
                return elem.is(':visible')
            });
        }

        function defaultInvalidElemenentsSelector() {
            var roots = config.rootsSelector();
            return roots.find(config.invalidQuery);
        }
        
        /**
         * @mixin
         */
        var config = {
            elementMapTypes: defaultMapElements,
            showAction:      UIEffects.rect,
            showClickAction: UIEffects.point,
            canFillElement:  defaultCanFillElement,
            maxNbTries:      10,
            logger:          null,
            randomizer:      null,
            debug:           false,
            rootsSelector:   rootsSelector,
            elementsSelector:defaultElementsSelector,
            elementsFilter:  defaultElementsFilter,
            resetRatio:      10,
            allowCorrect:    true,
            correctInterval: 1000,
            invalidQuery:    '.z-intbox-invalid, .z-doublebox-invalid, .z-spinner-invalid,.z-textbox-invalid',
            correctMethods:  ['word','email','number','dafault','empty']
            
        };

        /**
         * @mixes config
         */
        function zkformFillerGremlin() {
            if (!config.randomizer) {
                throw new RandomizerRequiredException();
            }
            
            if (config.allowCorrect) {
                tryCorrectElement();
            }
            
            var element, nbTries = 0;
            // Find a random element within all selectors
            // Retrieve all selectors
            var elements = config.elementsSelector();
            elements = config.elementsFilter(elements);
            if (elements.length === 0) return false;

            if (config.debug) {
                for (var i=0; i<elements.length;i++) {
                    UIEffects.rect(elements[i], 'green', 2500);
                };
            }
            
            do {
                element = config.randomizer.pick(elements);
                nbTries++;
                if (nbTries > config.maxNbTries) return false;
            } while (!element || !config.canFillElement(element));

            // Retrieve element type
            var elementType = null;
            for (var selector in config.elementMapTypes) {
                if (matchesSelector(element, selector)) {
                    elementType = selector;
                    break;
                }
            }

            if (!config.debug) {
                var value = config.elementMapTypes[elementType](element);
            }

            if (typeof config.showAction == 'function') {
                config.showAction(element);
            }

            if (config.logger && typeof config.logger.log == 'function') {
                config.logger.log('gremlin', 'formFiller', 'input', value, 'in', element);
            }
        }
        
        function tryCorrectElement() {
            var element,elements = defaultInvalidElemenentsSelector();
            elements = config.elementsFilter(elements);
            var now = new Date().getTime();
            
            //pick element to correct
            elements = elements.filter(function(idx, e){
                var correctTime = $(e).data('zkformFiller-correctTime');
                return !correctTime || correctTime+config.correctInterval < now;
            });
            
            if (!elements.length) {
                return false;
            }
            
            element = $(config.randomizer.pick(elements));
            element.data('zkformFiller-correctTime', now);
            var correctId = element.data('zkformFiller-correctId') || -1;
            correctId++;
            
            //get method
            
            
            console.log('Correct', element, correctId);
        }

        function fillTextElement(element) {
        
            initMetadata(element);

            if ($(element).hasClass('z-intbox')) {
                return fillNumberElement(element);
            }

            if ($(element).hasClass('z-doublebox')) {
                return fillNumberElement(element);
            }

            if ($(element).hasClass('z-spinner-input')) {
                return fillNumberElement(element);
            }
            
            if ($(element).hasClass('z-combobox-input')) {
                return fillCombobox(element);
            }            
            
            if ($(element).hasClass('z-datebox-input')) {
                return fillDatebox(element);
            }

            if ($(element).parents('.chosen-container').length > 0) {
                return fillChosen(element);
            }            
            
            return fillSimpleTextElement(element);
        }
        
        function fillSimpleTextElement(element) {
            var character;
            if (!fixTextElement(element)) {
                character = config.randomizer.character();
                element.value += character;
            }
            
            if (config.randomizer.bool({likelihood: config.resetRatio})) {
                element.value = "";
                character = "EMPTY";
            }
            
            
            $(element).trigger('keyup');
            $(element).trigger('blur');
            
            return character;        
        }
        
        function fillCombobox(element) {
            var btn = $(element).parent().find('.z-combobox-button');
            doZkClick(btn);
            var pt = getElementClickPoint(btn);
            config.showClickAction(pt[0], pt[1]);

            var id = $(element).parent().attr('id') + '-cave';
            var items = $('#'+id).find('.z-comboitem');
            if (items.length) {
                var item = config.randomizer.pick(items);
                doZkClick($(item));
                return item;
            }            
        }
        
        function fillDatebox(element) {
            var btn = $(element).parent().find('.z-datebox-button');
            doZkClick(btn);

            var pt = getElementClickPoint(btn);
            config.showClickAction(pt[0], pt[1]);

            var id = '#'+$(element).parent().attr('id') + '-pp';

            var maxTries = 10;
            do {
                var items = $(id).find(':visible').filter(function(idx, e){
                    return $(e).css('cursor') === 'pointer' || $(e).is('a');
                });

                if (items.length) {
                    var item = config.randomizer.pick(items);
                    doZkClick($(item));
                    pt = getElementClickPoint($(item));
                    config.showClickAction(pt[0], pt[1]);
                }
                maxTries--;
            } while (maxTries > 0 && $(id).is(':visible'));
        }

        function fillChosen(element) {
            $(element).click();
            var parents = $(element).parents('.chosen-container');
            var elements = parents.find('.active-result,.result-selected');
            if (!elements.length) {
                return;
            }

            var item = config.randomizer.pick(elements);
            item = $(item);
            if (item.is('.result-selected')) {
                //unselect item
                var idx = item.attr('data-option-array-index');
                item = parents.find('.search-choice-close[data-option-array-index="'+idx+'"]');
                item = $(item);
            }
            item.mouseup();
            item.click();                            
            return item.text();            
        }        
        
        function fillNumberElement(element) {
            if (!fixTextElement(element)) {
                var number = config.randomizer.character({pool: '0123456789'});
                element.value += number;
            }

            if (config.randomizer.bool({likelihood: config.resetRatio})) {
                element.value = "";
                character = "EMPTY";
            }            
            
            $(element).trigger('keyup');
            $(element).trigger('blur');
            
            return number;
        }
        
        function fixTextElement(element) {
            if (!$(element).is('.z-intbox-invalid, .z-doublebox-invalid, .z-spinner-invalid,.z-textbox-invalid')) {
                return false;
            }
            return restoreToDefaultValue(element);
        }

        function fillSelect(element) {
            var options = element.querySelectorAll('option');
            if (options.length === 0) return;
            var randomOption = config.randomizer.pick(options);

            for (var i = 0, c = options.length; i < c; i++) {
                var option = options[i];
                option.selected = option.value == randomOption.value;
            }

            return randomOption.value;
        }

        function fillRadio(element) {
            // using mouse events to trigger listeners
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            element.dispatchEvent(evt);

            return element.value;
        }

        function fillCheckbox(element) {
            // using mouse events to trigger listeners
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            element.dispatchEvent(evt);

            return element.value;
        }

        function fillEmail(element) {
            var email = config.randomizer.email();
            element.value = email;

            return email;
        }

        function matchesSelector(el, selector) {
            if (el.webkitMatchesSelector) {
                matchesSelector = function(el, selector) {
                    return el.webkitMatchesSelector(selector);
                };
            } else if (el.mozMatchesSelector) {
                matchesSelector = function(el, selector) {
                    return el.mozMatchesSelector(selector);
                };
            } else if (el.msMatchesSelector) {
                matchesSelector = function(el, selector) {
                    return el.msMatchesSelector(selector);
                };
            } else if (el.oMatchesSelector) {
                matchesSelector = function(el, selector) {
                    return el.oMatchesSelector(selector);
                };
            } else {
                throw new Error('Unsupported browser');
            }
            return matchesSelector(el, selector);
        }
        
        function getElementClickPoint(element) {
            var offset = element.offset();
            return [
                offset.left + element.width() / 2,
                offset.top + element.height() / 2
            ]
        }        
        
        function doZkClick(element) {
            var e = jQuery.Event( "click" );
            e.originalEvent = {};
            e.which = 1;
            element.trigger(e);
        }
        
        function initMetadata(element) {
            if (!$(element).data('zkformFiller-checked')) {
                $(element).data('zkformFiller-checked', true);
                $(element).data('zkformFiller-defaultData', element.value);
            }
        }
        
        function restoreToDefaultValue(element) {
            if ($(element).data('zkformFiller-checked')) {
                element.value = $(element).data('zkformFiller-defaultData');
                return true;
            }
            
            return false;
        }

        configurable(zkformFillerGremlin, config);

        return zkformFillerGremlin;
    };
});
