
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
            'input[type="radio"]:not([readonly="readonly"])': fillByClick,
            'input[type="checkbox"]:not([readonly="readonly"])': fillByClick,
            'input[type="email"]:not([readonly="readonly"])': fillEmail,
            'input:not([type])': fillTextElement
        };
        
        var defaultFillers = {
            'empty': function(e) {
                e.value = '';
                return 'EMPTY';
            },
            'append-char': function(e) {
                var character = config.randomizer.character();
                e.value += character;
                return 'append '+character;
            },
            'append-number': function(e) {
                var number = config.randomizer.character({pool: '0123456789'});
                e.value += number;
                return 'append '+number;
            },
            'char': function(e) {
                var character = config.randomizer.character();
                e.value = character;
                return character;
            },
            'number': function(e) {
                var number = config.randomizer.natural();
                e.value = number;
                return number;
            },
            'smaller-number': function(e) {
                var number = config.randomizer.natural({max:65536});
                e.value = number;
                return number;
            },            
            'word': function(e) {
                var word = config.randomizer.word();
                e.value = word;
                return word;
            },
            'sentence': function(e) {
                var sentence = config.randomizer.sentence();
                e.value = sentence;
                return sentence;
            },
            'paragraph': function(e) {
                var paragraph = config.randomizer.paragraph();
                e.value = paragraph;
                return paragraph;
            },
            'email': function(e) {
                var email = config.randomizer.email();
                e.value = email;
                return email;
            },
            'default': function(e) {
                if ($(e).data('zkformFiller-checked')) {
                    var value = $(e).data('zkformFiller-defaultData');
                    e.value = value;
                    return value;
                }
            }
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
            var keys = Object.keys(config.correctFillers);
            return roots.find(keys.join(','));
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
            correctFillers:  {
                '.z-textbox-invalid':                                        ['word','email','number','smaller-number','default','empty'],
                '.z-intbox-invalid,.z-doublebox-invalid,.z-spinner-invalid': ['number','smaller-number','default','empty'],
                '.z-datebox-invalid':                                        ['empty','default']},
            
            textFillers:     [['append-char','empty','number','smaller-number','word','sentence','email','char'],[10,5,2,3,10,10,5,5]],
            numberFillers:   [['append-number','empty','number','smaller-number'],[5,2,2,3]]
            
        };

        /**
         * @mixes config
         */
        function zkformFillerGremlin() {
            if (!config.randomizer) {
                throw new RandomizerRequiredException();
            }
            
            if (config.allowCorrect && tryCorrectElement()) {
                return true;
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
                if ($(element).is(selector)) {
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
                config.logger.log('gremlin', 'zkformFiller', 'input', value, 'in', element);
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
            
            var correctFillers;
            for (var k in config.correctFillers) {
                if (element.is(k)) {
                    correctFillers = config.correctFillers[k];
                    break;
                }
            }
            
            //get correct method
            var correctId = element.data('zkformFiller-correctId');
            if (correctId >= 0) {
                correctId++;
            } else {
                correctId = 0;
            }
            
            if (correctId >= correctFillers.length) {
                correctId = 0;
            }
            element.data('zkformFiller-correctId', correctId);
            
            //get method
            var method = correctFillers[correctId];
            console.log('Correct by ', method, element);
            applyFiller(method, element[0]);
            return true;
        }

        function fillTextElement(element) {
            initMetadata(element);

            if ($(element).is('.z-intbox,.z-doublebox,.z-spinner-input')) {
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
            var filler = config.randomizer.weighted(config.textFillers[0], config.textFillers[1]);
            return applyFiller(filler, element);
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
            var filler = config.randomizer.weighted(config.numberFillers[0], config.numberFillers[1]);
            return applyFiller(filler, element);
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

        function fillByClick(element) {
            // using mouse events to trigger listeners
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            element.dispatchEvent(evt);

            return element.value;
        }

        function fillEmail(element) {
            return defaultFillers['email'](element);
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
        
        function applyFiller(fillerName, element) {
            var ret = defaultFillers[fillerName](element);
            $(element).trigger('keyup').trigger('blur');
            
            return ret;
        }

        configurable(zkformFillerGremlin, config);

        return zkformFillerGremlin;
    };
});
