// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = 'ready';
squiffy.story.id = 'ee6add85ae';
squiffy.story.sections = {
	'ready': {
		'text': "",
		'js': function() {
			$("#restart").text("Reiniciar partida"); //change upper right "restart" to the word you want.
			squiffy.ui.settings.restartPrompt=false; // disable prompt, "Are you sure you want to restart?".
			squiffy.story.go("start");
		},
		'passages': {
		},
	},
	'start': {
		'text': "<audio\n  src=\"night2.mp3\"\n  autoplay>\n  Your browser does not support the <code>audio</code> element.\n</audio>\n\n\n<div align=\"center\">\n<img src=\"smilingg.png\">\n</div> \n\n\n<div align=\"center\"><b><p><em>ELIGE UN CAPÍTULO</em></p></b></div>\n\n<div align=\"center\">\n<a class=\"squiffy-link link-passage\" data-passage=\"Empezar\" role=\"link\" tabindex=\"0\">Capítulo 1</a><br>\n<br> \n</div> \n\n<div align=\"center\">\n<a class=\"squiffy-link link-passage\" data-passage=\"Muypronto\" role=\"link\" tabindex=\"0\">Capítulo 2</a><br>\n<br> \n</div> \n<div align=\"center\">\n<a class=\"squiffy-link link-passage\" data-passage=\"Muypronto\" role=\"link\" tabindex=\"0\">Capítulo 3</a><br>\n<br> \n</div> \n<div align=\"center\">\n<a class=\"squiffy-link link-passage\" data-passage=\"Muypronto\" role=\"link\" tabindex=\"0\">Capítulo 4</a><br>\n<br> \n</div> \n<div align=\"center\">\n<a class=\"squiffy-link link-passage\" data-passage=\"Muypronto\" role=\"link\" tabindex=\"0\">Capítulo 5</a><br>\n<br> \n</div> \n\n<div align=\"center\"><b><p><em>INSTRUCCIONES</em></p></b></div>\n<div align=\"center\">\n\n<a class=\"squiffy-link link-passage\" data-passage=\"Modo\" role=\"link\" tabindex=\"0\">Cómo se juega</a><br>\n<br> \n</div> \n\n<div align=\"center\"><b><p><em>ABOUT</em></p></b></div>\n<div align=\"center\">\n<div align=\"center\"><p><em>QugenBooks 2017</em></p></div>",
		'attributes': ["score = 0","Health = 5","Llave = 0"],
		'passages': {
			'Empezar': {
				'clear': true,
				'text': "",
				'js': function() {
					   
					setTimeout(function(){ 
					   squiffy.story.go("Capitulo1");
					},1000);
					 
					
					
					
					    
				},
			},
			'Muypronto': {
				'text': "<p>Pronto la actualización para jugar este capítulo. ¡Comparte esta app y dale 5 estrellas, si fue de tu agrado! Eso nos sería de mucha ayuda.<br>\n-QugenBooks</p>",
			},
			'Modo': {
				'text': "<div align=\"justify\"><b><p><em>&quot;Te has despertado con un fuerte dolor de cabeza. Estás sentado con las manos atadas a una silla de madera. Te encuentras en una habitación oscura con un foco colgando, exactamente, encima de tu cabeza. Un hombre, gordo, con una sonrisa te observa a lo lejos, su expresión perdida y carente de cordura te hiela la sangre. Se acerca lentamente sobandose las manos, curioso, tímido, decidido...¿crees que podrás sobrevivir?&quot;</em></p></b></div>\n\n<p>Descubre el camino a la supervivencia. Este es un Gamebook tambíen conocido como Text adventure, en el cual tendrás que tomar desiciones para poder avanzar durante la partida.<br> \nCada decisión tomada te dará puntos (Score).<br>\nTus puntos de vida iniciales son 5 (Puntos de vida).<br>\n¡Cuidado! Tu cordura puede jugarte malas pasadas (Locura).<br>\nSi pierdes presiona en la parte superior del texto reiniciar para volver a empezar (Restart - Reiniciar Partida).<br></p>\n<p>Los capítulos se irán agregando paulatinamente. Lo mejor que puedes hacer para apoyar este proceso apoyando la app, compartiendo y dando 5 estrellas. Esto ayudara mucho en agilizar al update del resto del juego.</p>\n<div align=\"justify\">",
			},
			'About': {
				'text': "<p>QugenBooks 2017</p>",
			},
		},
	},
	'Capitulo1': {
		'clear': true,
		'text': "<audio\n  src=\"haba.mp3\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio>\n\n<div align=\"center\"><b><p><em><h1>El cadaver<br>sonriente</h1></em></p></b></div>\n<div align=\"center\">\n\n<div align=\"justify\"><h2>Capítulo 1</h2><div align=\"justify\">\n\n\n<div align=\"center\">\n<img src=\"1.png\">\n</div> \n\n<p>Te has despertado con un fuerte dolor de cabeza. Una mujer cantando ópera martilla tus sentidos. No sabes de dónde viene la música. Estás sentado con las manos atadas a una silla de madera. Te encuentras en una habitación oscura con un foco colgando, exactamente, encima de tu cabeza. Un hombre, gordo, con una sonrisa te observa a lo lejos, su expresión perdida y carente de cordura te hiela la sangre. Se acerca lentamente sobandose las manos, curioso, tímido, decidido...</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Mueves tus manos desesperadamente, esperanzado a escapar.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Lo observas fijamente, intentas permanecer tranquilo.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Le preguntas &quot;¿Quién eres?&quot;.</p>\n</li>\n</ul>",
		'js': function() {
			            
		},
		'passages': {
			'A': {
				'text': "<p><div align=\"justify\">\nTe mueves enérgicamente, pero notas que es imposible quitarse las ataduras. La expresión del hombre es de sorpresa al ver tu intento fallido; se detiene, abre los ojos, dibuja una &quot;o&quot; con sus labios, después de unos segundos, vuelve a sonreir.<div align=\"justify\"></p>",
				'attributes': ["score+=10"],
			},
			'B': {
				'text': "<p><div align=\"justify\">\nEl hombre gordo lleva un mandil blanco, muy sucio, su aspecto es desaliñado; sus gordas mejillas casi le cubren los ojos; su sonrisa, blanca, impecable...desentona con su aspecto y lo vuelve inquietante; viste con una camisa blanca, un pantalón y zapatos negros.<div align=\"justify\"></p>",
			},
			'C': {
				'text': "<p>El hombre no da ninguna respuesta.</p>",
				'attributes': ["score+=20"],
			},
			'@1': {
				'text': "<p>El hombre continua acercándose lentamente.</p>",
				'attributes': ["score+=30"],
			},
			'@2': {
				'text': "",
				'js': function() {
					squiffy.story.go("Inicio");
				},
			},
		},
	},
	'Inicio': {
		'text': "<p><div align=\"center\">\n<img src=\"3.png\">\n</div> </p>\n<p><div align=\"justify\">\nEl hombre se postra frente a ti. Sonríe y con una reverencia majestuosa dice:</p>\n<p>-Buenas noches, mi nombre es..., bueno no creo que le importe. Pero debo decirle a usted que yo no soy de esas personas que se dejan asustar por cualquier cosa. No, señor. Soy un hombre, hecho y derecho. Más que eso, soy alguien quién inspira el miedo. Un hombre de la vida galante con la sangre fría y traicionera. Así es, una persona que tiene por pasatiempo matar personas por el simple hecho de hacerlo; sin embargo, últimamente me he olvidado de tales pasiones, debido a que no puedo controlar esta cruda sensación. Dios me protega, en verdad, Dios me protega, ya que está imagen me sigue a todos lados y no deja de atormentarme. ¡Ay de mí y de mi benevolente alma! Qué si de algo ha pecado, ha sido de asesinar, porque soy un hombre ejemplo, incluso doy limosna en misa. Si es que, siendo honestos, no hay persona como yo. Las voces dentro de mi cabeza me piden a gritos que termine mi obra maestra, esa imagen en mi cabeza. Crearé el cuerpo perfecto, tu tienes una sonrisa perfecta...<div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Aterrado por las locuras que habla el hombre comienzas a gritar.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Lo observas fijamente, intentas no mostrar emoción alguna.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Observas la habitación en la que te encuentras.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "<p><div align=\"justify\">\nSueltas una alarido de terror. El hombre te observa, suelta una carcajada, y después de unos segundos empieza a toser grotescamente. Luego se acerca y te da una bofetada.<div align=\"justify\"> </p>\n<p>-¡Silencio! Nos puede escuchar...No quiero que nos escuche...\n<br>\n<br>\n<b><p><em>Has perdido 1 punto de vida. Tus puntos de vida son {Health}.</em></p></b>\n<br>\n<br></p>",
				'attributes': ["Health-=1","score+=5"],
			},
			'B': {
				'text': "<p><div align=\"justify\">\nEl hombre gordo te observa fijamente, luego alza las manos con magnificiencia como si agarrara de la cintura y la mano a alguien, a continuación empieza a dar pasos atrás, pasos adelante, con los ojos cerrados, por toda la habitación; bailando al ritmo de la melodía. Observas la silueta de aquel hombre que va y viene de entre la sombras al círculo de luz en el que te encuentras.<div align=\"justify\"></p>",
				'attributes': ["score+=20"],
			},
			'C': {
				'text': "<p><div align=\"justify\">\nGiras tu cabeza alrededor, todo es oscuro, a excepción de la luz que tienes encima de tu cabeza. Aquel hombre sonrie y empieza a bailar...es como si siguiera el ritmo de algún vals de opera. <div align=\"justify\"></p>",
				'attributes': ["score+=30"],
			},
			'@1': {
				'text': "<p>El hombre está parado enfrente de ti.</p>",
			},
			'@2': {
				'text': "",
				'js': function() {
					squiffy.story.go("Escena2");
					
				},
			},
		},
	},
	'Escena2': {
		'text': "<p><div align=\"justify\">\nEl hombre paró en seco, gira hacia a ti y dice:</p>\n<p>-Es la hora, me llaman...- El loco se adentra en la sombras de la habitación. Se escucha al fondo que se abre un cajón. Luego unos sonidos metálicos y, finalmente, el hombre regresa con un cuchillo de carnicero oxidado. Respira muy fuerte y parece muy ansioso.<div align=\"justify\"></p>\n<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Le preguntas que tiene planeado hacer con el cuchillo. Intentas no vacilar.</li>\n</ul>\n<ul>\n<li><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Le preguntas por su nombre.</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score+=10"],
				'js': function() {
					    squiffy.story.go("Escena3");
				},
			},
			'B': {
				'text': "<p><div align=\"justify\">\n-¿Nombre? - El hombre suelta una carcajada, pareciese que estuviera haciendo gárgaras- Ellos me han dicho que preguntarías por mi nombre. Yo no tengo nombre. No, si tienes. No, no debo...debería saberlo...no...</p>\n<p>Parece que el hombre tiene una batalla interna. Empiezas a pensar que le falta un tornillo, ya no luce tan cuerdo. <div align=\"justify\"></p>",
				'attributes': ["score+=30"],
			},
		},
	},
	'Escena3': {
		'text': "<p><div align=\"center\">\n<img src=\"2.png\">\n</div> </p>\n<div align=\"justify\">\n\n<p><div align=\"justify\">\nEl hombre gordo sonríe ampliamente, mostrando su dentadura perfecta, tan perfecta que te resulta antinatural, surreal. Te apunta con el cuchillo y dice:</p>\n<p>-Tu serás el indicado. Si, señor, usted, buen hombre, ha sido elegido por ellos. Tiene que ser como ellos, mejor que ellos...<div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Preguntas: &quot;¿De que me hablas?&quot;.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Exclamas: &quot;Eres un enfermo&quot;. Luego le escupes.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Le sigues el juego: &quot;¿Mejor que quiénes?&quot;.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "<div align=\"justify\">",
				'attributes': ["score+=30"],
				'js': function() {
					      squiffy.story.go("Escena4");
				},
			},
			'B': {
				'text': "<p><div align=\"justify\">\nTu escupitajo alcanzo uno de sus zapatos.</p>\n<p>-¡¿Que?! - Su rostro se deforma terriblemente en un arrebato de ira - ¡¿Como te atreves a insultarme de esta forma?! ¡Tú que eres mi ser perfecto!</p>\n<p>El hombre gordo se acerca y te encaja el cuchillo en una pierna. Sueltas un alarido de dolor.</p>\n<p>-¡Ellos pensaban igual que tú! - Exclama mientras saca, sin remordimiento, el cuchillo.</p>\n<p>Casi te desmayas, pero por alguna razón la adrenalina y el pánico generado te mantiene despierto...tú odio hacia aquel ser repugnante ha despertado, pero tienes más miedo a no saber que será de ti si te quedas inconciente.<div align=\"justify\">\n<br>\n<br>\n<b><p><em>Has perdido 1 punto de vida. Tus puntos de vida son {Health}.</em></p></b></p>",
				'attributes': ["score+=40","Health-=1"],
			},
			'C': {
				'text': "",
				'attributes': ["score+=25"],
				'js': function() {
					    squiffy.story.go("Escena4");
					    
				},
			},
		},
	},
	'Escena4': {
		'clear': true,
		'text': "<audio\n  src=\"menu.mp3\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio>\n\n<div align=\"center\">\n<img src=\"4.png\">\n</div> \n\n<p><div align=\"justify\">\nDe repente, el maníaco se torna nervioso e inseguro...</p>\n<p>-Aquellos...los de la sonrisa - dice con cierto temor - Ellos me hablan, siempre me exigen más y más... No puedo decirles que no. Si me negara acabarían conmigo y mi dulce Marian. Eres el ser perfecto, eres empático, a pesar de todo...creo que te presentaré a Marian. Sí, ella es buena, ya verás...</p>\n<p>El hombre sin esperar una respuesta, suelta el cuchillo, y camina con una cojera hacia a las sombras de la habitación. Luego abre una puerta y sale por ella, escuchas como se aleja. Al fondo puedes divisar un pasillo iluminado.<div align=\"justify\"> </p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Gritas aún más fuerte. No sabes de lo que es capaz el hombre.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Te mueves bruscamente de izquierda a derecha en la silla, quieres caer al suelo.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Te quedas inmutable y perplejo. No crees que haya una salida.</p>\n</li>\n</ul>",
		'js': function() {
			   
		},
		'passages': {
			'A': {
				'text': "<p>Nadie te escucha. La habitación continúa en un silencio mortuorio.       </p>",
				'attributes': ["score+=5"],
			},
			'B': {
				'text': "",
				'attributes': ["score+=30"],
				'js': function() {
					    squiffy.story.go("Escena5");
				},
			},
			'C': {
				'text': "<p><div align=\"justify\"><br>Te sientes desolado, quieres creer que no estas teniendo una alucinación. En tu mente algo ha hecho ´crack´, aún así no estas dispuesto a quedarte aquí de brazos cruzados.<div align=\"justify\"> <br>\n<br>\n<b><p><em>Has ganado 1 punto de locura. Estás perdiendo tu cordura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["Locura = 0","Locura+=1"],
			},
		},
	},
	'Escena5': {
		'text': "<p><div align=\"center\">\n<img src=\"5.png\">\n</div> \nConsigues caer al suelo cerca del cuchillo. A lo lejos, escuchas pasos.</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Te quedas paralizado. Sabes que cualquier movimiento en falso es peligroso.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Alcanzas el cuchillo con tu mano derecha.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score+=30"],
				'js': function() {
					    squiffy.story.go("Escena5.5");
					
				},
			},
			'B': {
				'text': "",
				'js': function() {
					    squiffy.story.go("Escena5.6");
				},
			},
		},
	},
	'Escena5.6': {
		'text': "<p><div align=\"justify\">\nUna vez que agarras el cuchillo de alguna manera consigues introducirlo por debajo de la atadura y empiezas a cortar con desesperación. Sin embargo, cuando estabas a punto de terminar el hombre ha entrado por la puerta.</p>\n<p>-¡¿Qué haces?! - exclama colocando sus manos en la cabeza - Debí hacer caso, Gulli debío obedecer a las voces...- Su mirada se inyecta en sangre y se mueve lo más rápido que puede hacia a ti - Ahora verás, animal inmundo, nadie engaña a Gulli.</p>\n<p>Te arranca el cuchillo de la mano y lo arroja al suelo. Luego te comienza a golpear la cara con mucha rabia, es muy doloroso...quedas inconciente.<div align=\"justify\">\n <br>\n <br>\n<b><p><em>Has perdido 2 puntos de vida. Tus puntos de vida son {Health}.</em></p></b>\n<br>\n <br>\n <div align=\"justify\">\nDespiertas, no sabes cuanto tiempo has estado inconciente. Puedes ver el cuchillo aún en el suelo. Escuchas pasos a lo lejos.<div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Te quedas paralizado. Sabes que cualquier movimiento en falso es peligroso.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Alcanzas el cuchillo con tu mano derecha.</p>\n</li>\n</ul>",
		'attributes': ["Health-=1","Health-=1"],
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score+=20"],
				'js': function() {
					    squiffy.story.go("Escena5.5");
				},
			},
			'B': {
				'clear': true,
				'text': "<audio\n  src=\"gameover.ogg\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio>\n\n <div align=\"justify\">\nUna vez que agarras el cuchillo de alguna manera consigues introducirlo por debajo de la atadura y empiezas a cortar con desesperación. Sin embargo, cuando estabas a punto de terminar el hombre ha entrado por la puerta.\n\n-¡¿Qué haces?! - exclama colocando sus manos en la cabeza -¡Otra vez engañando a Gulli!- Su mirada se inyecta en sangre y se mueve lo más rápido que puede hacia a ti - Ahora verás, ya es hora.\n\nTe arranca el cuchillo de la mano. Lo alza por encima de su cabeza. Sabes que es el final.<div align=\"justify\">\n\n<div align=\"center\">\n<img src=\"2.png\">\n</div> \n\n<div align=\"center\"><b><p><em>FIN DEL JUEGO</em></p></b></div>\n<div align=\"center\"><b><p><em>Presiona Restart o Reiniciar Partida para volver a jugar.</em></p></b></div>",
				'attributes': ["score-=50"],
				'js': function() {
					   
				},
			},
		},
	},
	'Escena5.5': {
		'text': "<p><div align=\"justify\">\nIntentas no mover un músculo, solo ves que el hombre atraviesa el pasillo de un lado a otro. Ni siquiera se ha asomado por la puerta para echarte un vistazo.  </p>\n<p>Ya no escuchas pasos, solo la voz del hombre en la lejanía que dice:</p>\n<p>-Gulli, ¿donde has dejado a Marian? Eres muy distraído, Gulli...tu amada, Gulli<div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Te quedas paralizado. Sabes que cualquier movimiento en falso es peligroso.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Alcanzas el cuchillo con tu mano derecha.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score-=50"],
				'js': function() {
					    squiffy.story.go("Escena5.5.1");
				},
			},
			'B': {
				'text': "",
				'attributes': ["score+=30"],
				'js': function() {
					    squiffy.story.go("Escena6");      
				},
			},
		},
	},
	'Escena5.5.1': {
		'text': "<p>Ya no escuchas absolutamente nada. No hay pasos, no hay voces...</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Te quedas paralizado. Sabes que cualquier movimiento en falso es peligroso.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Alcanzas el cuchillo con tu mano derecha.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score-=30"],
				'js': function() {
					    squiffy.story.go("Escena5.5.1");
				},
			},
			'B': {
				'text': "",
				'attributes': ["score+=30"],
				'js': function() {
					    squiffy.story.go("Escena6");          
					    
				},
			},
		},
	},
	'Escena6': {
		'text': "<p><div align=\"justify\">\nUna vez que agarras el cuchillo de alguna manera consigues introducirlo por debajo de la atadura y empiezas a cortar con desesperación. Consigues liberar una mano y en cuestión de segundos estás de pie, un poco adolorido, pero te revitalizas solo de pensar que ese maníaco anda suelto. Estás listo para salir de este antro. Das un par de pasos hacia la puerta...no viene nadie. Arrojas el cuchillo al suelo. Ahora sin luz que te vislumbre puedes ver un poco mejor el lugar. <div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Observar la habitación detenidamente.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Ir a pasillo.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score+=5"],
				'js': function() {
					    squiffy.story.go("Observarcuarto");
				},
			},
			'B': {
				'text': "",
				'attributes': ["score+=5"],
				'js': function() {
					    squiffy.story.go("EscenaPasillo");     
				},
			},
		},
	},
	'Observarcuarto': {
		'text': "<div align=\"center\">\n<img src=\"7.png\">\n</div> \n\n<p>En la habitación hay:<br>\n<a class=\"squiffy-link link-passage\" data-passage=\"Un viejo congelador\" role=\"link\" tabindex=\"0\">Un viejo congelador</a> | <a class=\"squiffy-link link-passage\" data-passage=\"TV vieja\" role=\"link\" tabindex=\"0\">TV vieja</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Sierras y cuchillos\" role=\"link\" tabindex=\"0\">Sierras y cuchillos</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Ventanilla\" role=\"link\" tabindex=\"0\">Ventanilla</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Casillero\" role=\"link\" tabindex=\"0\">Casillero</a></p>\n<p>Ir a:<br>\n<a class=\"squiffy-link link-section\" data-section=\"EscenaPasillo\" role=\"link\" tabindex=\"0\">Pasillo</a></p>",
		'passages': {
			'Un viejo congelador': {
				'text': "<p><div align=\"justify\">\nHay un viejo congelador a tu lado derecho. Parece que esta en funcionamiento, tal vez puedes <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el congelador\" role=\"link\" tabindex=\"0\">Abrir el congelador</a> para ver si hay algo útil.<div align=\"justify\"></p>",
			},
			'Abrir el congelador': {
				'text': "<p><div align=\"justify\">\nAl abrirlo, una densa neblina emana. Al ver con más atención...te horrorizas al darte cuenta que esta repleto de brazos humanos. Es mejor que se mantenga cerrado.<div align=\"justify\">\n<br>\n<b><p><em>Has ganado 1 punto de locura. Estás perdiendo la cordura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["Locura = 0","Locura+=1"],
			},
			'TV vieja': {
				'text': "<p><div align=\"justify\">\nA tu izquierda hay un mueble con una TV vieja. Tal vez, las noticias ya están hablando de tu desaparición, ¿quieres <a class=\"squiffy-link link-passage\" data-passage=\"Encenderla\" role=\"link\" tabindex=\"0\">Encenderla</a>?<div align=\"justify\"></p>",
			},
			'Encenderla': {
				'text': "<p><div align=\"justify\">\nAl presionar el switch de encendido, un sonido ensordecedor sale de la pantalla, no hay señal. <div align=\"justify\"></p>\n<p>A lo lejos escuchas pasos. No fue una buena idea encender el televisor.</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Esconderse en el casillero.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Te escondes debajo de la mesa.</p>\n</li>\n</ul>",
			},
			'A': {
				'text': "",
				'js': function() {
					squiffy.story.go("CasilleroL");
				},
			},
			'B': {
				'text': "",
				'js': function() {
					 squiffy.story.go("CasilleroD");
					
				},
			},
			'Sierras y cuchillos': {
				'text': "<p><div align=\"justify\">\nUna mesa a tu izquierda te da escalofrios, esta llena de sierras y cuchillos, algunos manchados con líquido rojo oscuro. Necesitas algo con que defenderte, el <a class=\"squiffy-link link-passage\" data-passage=\"Machete\" role=\"link\" tabindex=\"0\">Machete</a> parece una buena opción para defenderse. Hay un cajón semiabierto, parece que es aquel que el hombre gordo abrió. Tal vez deberías <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el cajón\" role=\"link\" tabindex=\"0\">Abrir el cajón</a>.<div align=\"justify\"></p>",
			},
			'Machete': {
				'text': "<p><div align=\"justify\">\nCuando estabas a punto de tomarlo, alejas tu mano. No te sientes cómodo con esto. La violencia no es lo tuyo, no sabrías que hacer con el arma.<div align=\"justify\"></p>",
			},
			'Abrir el cajón': {
				'text': "<p>Encuentras una <a class=\"squiffy-link link-passage\" data-passage=\"nota\" role=\"link\" tabindex=\"0\">nota</a> y una <a class=\"squiffy-link link-section\" data-section=\"Observar1\" role=\"link\" tabindex=\"0\">llave</a>.</p>",
			},
			'nota': {
				'text': "<p><div align=\"justify\">\nPuedes leer en la nota &quot;Gulli nunca duerme, Gulli trabaja siempre, Gulli quiere complacer a las voces...Gulli necesita más cuerpos para trabajar...&quot;.<div align=\"justify\"></p>",
			},
			'llave': {
				'text': "<p>Has tomado la llave. Para algo tiene que servir, puede ser la clave para escapar de aquí.\n <br>\n <br>\n<b><p><em>Has obtenido &quot;Llave&quot;.</em></p></b></p>",
				'attributes': ["Llave=1"],
			},
			'Ventanilla': {
				'text': "<p><div align=\"justify\">\nUna ventanilla ya hace encima de la mesa con sierras y cuchillos a tu izquierda, estás en un sótano. Además, esta reforzada con barrotes de metal. No tienes tiempo para intentar salir por ahí.<div align=\"justify\"></p>",
			},
			'Casillero': {
				'text': "<p><div align=\"justify\">\nUn casillero de metal oxidado al derecha del congelador. Su puerta esta abierta, no tiene nada en su interior más que suciedad.<div align=\"justify\"></p>",
			},
		},
	},
	'CasilleroL': {
		'text': "<p>{if rnd=3:<a class=\"squiffy-link link-section\" data-section=\"Findeljuegoc\" role=\"link\" tabindex=\"0\"><em> Continuar...</a>} {else:<a class=\"squiffy-link link-section\" data-section=\"Observar2\" role=\"link\" tabindex=\"0\"></em> Continuar...</a>}</p>",
		'js': function() {
			     var rnd = Math.ceil(Math.random() * 3);    // random number between 1 and 3
			     
			squiffy.set("rnd",rnd); 
			
		},
		'passages': {
		},
	},
	'CasillerD': {
		'text': "<div align=\"justify\">\nTe has escondido debajo de la mesa. El hombre gordo a entrado y te ha visto.\n\n-Has faltado a la confianza de Gulli - Te estira del pie bruscamente y te saca -. Ellos estan molestos, ha llegado la hora.<div align=\"justify\">\n\n<div align=\"center\"><b><p><em>FIN DEL JUEGO</em></p></b></div>\n<div align=\"center\"><b><p><em>Presiona Restart o Reiniciar Partida para volver a jugar.</em></p></b></div>",
		'passages': {
		},
	},
	'Findeljuego': {
		'clear': true,
		'text': "<p><audio\n  src=\"gameover.ogg\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio></p>\n<div align=\"center\"><b><p><em>FIN DEL JUEGO</em></p></b></div>\n<div align=\"center\"><b><p><em>Presiona Restart o Reiniciar Partida para volver a jugar.</em></p></b></div>",
		'js': function() {
			   
		},
		'passages': {
		},
	},
	'Findeljuegoc': {
		'clear': true,
		'text': "<div align=\"center\">\n<img src=\"11.png\">\n</div> \n\n\n<p><audio\n  src=\"gameover.ogg\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio>\nTe has escondido en el casillero, pero el hombre gordo ha mirado por la rendija, se aleja por un instante...luego, regresa corriendo y abre la puerta del casillero. Tu fin ha llegado.</p>\n<div align=\"center\"><b><p><em>FIN DEL JUEGO</em></p></b></div>\n<div align=\"center\"><b><p><em>Presiona Restart o Reiniciar Partida para volver a jugar.</em></p></b></div>",
		'passages': {
		},
	},
	'Observar1': {
		'text': "<p>Has tomado la llave. Para algo tiene que servir, puede ser la clave para escapar de aquí.\n <br>\n <br>\n<b><p><em>Has obtenido &quot;Llave&quot;.</em></p></b></p>\n<div align=\"center\">\n<img src=\"7.png\">\n</div> \n\n\n<p>En la habitación hay:<br>\n<a class=\"squiffy-link link-passage\" data-passage=\"Un viejo congelador\" role=\"link\" tabindex=\"0\">Un viejo congelador</a> | <a class=\"squiffy-link link-passage\" data-passage=\"TV vieja\" role=\"link\" tabindex=\"0\">TV vieja</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Sierras y cuchillos\" role=\"link\" tabindex=\"0\">Sierras y cuchillos</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Ventanilla\" role=\"link\" tabindex=\"0\">Ventanilla</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Casillero\" role=\"link\" tabindex=\"0\">Casillero</a></p>\n<p>Ir a:<br>\n<a class=\"squiffy-link link-section\" data-section=\"EscenaPasillo3\" role=\"link\" tabindex=\"0\">Pasillo</a></p>",
		'attributes': ["Llave=1"],
		'passages': {
			'Un viejo congelador': {
				'text': "<p><div align=\"justify\">\nHay un viejo congelador a tu lado derecho. Parece que esta en funcionamiento, tal vez puedes <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el congelador\" role=\"link\" tabindex=\"0\">Abrir el congelador</a> para ver si hay algo útil.<div align=\"justify\"></p>",
			},
			'Abrir el congelador': {
				'text': "<p><div align=\"justify\">\nAl abrirlo, una densa neblina emana. Al ver con más atención...te horrorizas al darte cuenta que esta repleto de brazos humanos. Es mejor que se mantenga cerrado.<div align=\"justify\"></p>\n<p><br>\n<b><p><em>Has ganado 1 punto de locura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["Locura+=1"],
			},
			'TV vieja': {
				'text': "<p>A tu izquierda hay un mueble con una TV vieja. Tal vez, las noticias ya están hablando de tu desaparición, ¿quieres <a class=\"squiffy-link link-passage\" data-passage=\"Encenderla\" role=\"link\" tabindex=\"0\">Encenderla</a>?</p>",
			},
			'Encenderla': {
				'text': "<p><div align=\"justify\">\nAl presionar el switch de encendido, un sonido ensordecedor sale de la pantalla, no hay señal. <div align=\"justify\"></p>\n<p>A lo lejos escuchas pasos. No fue una buena idea encender el televisor.</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Esconderse en el casillero.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Te escondes debajo de la mesa.</p>\n</li>\n</ul>",
			},
			'A': {
				'text': "",
				'js': function() {
					squiffy.story.go("CasilleroL");
				},
			},
			'B': {
				'text': "",
				'js': function() {
					 squiffy.story.go("CasilleroD");
					
				},
			},
			'Sierras y cuchillos': {
				'text': "<p><div align=\"justify\">\nUna mesa a tu izquierda te da escalofrios, esta llena de sierras y cuchillos, algunos manchados con líquido rojo oscuro. Necesitas algo con que defenderte, el <a class=\"squiffy-link link-passage\" data-passage=\"Machete\" role=\"link\" tabindex=\"0\">Machete</a> parece una buena opción para defenderse. Hay un cajón semiabierto, parece que es aquel que el hombre gordo abrió. Tal vez deberías <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el cajón\" role=\"link\" tabindex=\"0\">Abrir el cajón</a>.<div align=\"justify\"></p>",
			},
			'Machete': {
				'text': "<p><div align=\"justify\">\nCuando estabas a punto de tomarlo, alejas tu mano. No te sientes cómodo con esto. La violencia no es lo tuyo, no sabrías que hacer con el arma.<div align=\"justify\"></p>",
			},
			'Abrir el cajón': {
				'text': "<p>Abres el cajón, nuevamente. Solo ves que hay una <a class=\"squiffy-link link-passage\" data-passage=\"nota\" role=\"link\" tabindex=\"0\">nota</a>.</p>",
			},
			'nota': {
				'text': "<p>Puedes leer en la nota </p>",
			},
			'Ventanilla': {
				'text': "<p><div align=\"justify\">\nUna ventanilla ya hace encima de la mesa con sierras y cuchillos a tu izquierda, estás en un sótano. Además, esta reforzada con barrotes de metal. No tienes tiempo para intentar salir por ahí.<div align=\"justify\"></p>",
			},
			'Casillero': {
				'text': "<p>Un casillero de metal oxidado al derecha del congelador. Su puerta esta abierta, no tiene nada en su interior más que suciedad.</p>",
			},
		},
	},
	'Observar2': {
		'text': "<div align=\"center\">\n<img src=\"11.png\">\n</div> \n\n\n<div align=\"justify\">\nEl hombre que se hace llamar Gulli, ha pasado a un lado del casillero. Al no verte atado a la silla, ha soltado un alarido pavoroso y ha salido corriendo por el pasillo.<div align=\"justify\">\n\n<div align=\"center\">\n<img src=\"7.png\">\n</div> \n\n\n<p>En la habitación hay:<br>\n<a class=\"squiffy-link link-passage\" data-passage=\"Un viejo congelador\" role=\"link\" tabindex=\"0\">Un viejo congelador</a> | <a class=\"squiffy-link link-passage\" data-passage=\"TV vieja\" role=\"link\" tabindex=\"0\">TV vieja</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Sierras y cuchillos\" role=\"link\" tabindex=\"0\">Sierras y cuchillos</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Ventanilla\" role=\"link\" tabindex=\"0\">Ventanilla</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Casillero\" role=\"link\" tabindex=\"0\">Casillero</a></p>\n<p>Ir a:<br>\n<a class=\"squiffy-link link-section\" data-section=\"EscenaPasillo3\" role=\"link\" tabindex=\"0\">Pasillo</a></p>",
		'passages': {
			'Un viejo congelador': {
				'text': "<p><div align=\"justify\">\nHay un viejo congelador a tu lado derecho. Parece que esta en funcionamiento, tal vez puedes <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el congelador\" role=\"link\" tabindex=\"0\">Abrir el congelador</a> para ver si hay algo útil.<div align=\"justify\"></p>",
			},
			'Abrir el congelador': {
				'text': "<p><div align=\"justify\">\nAl abrirlo, una densa neblina emana, al ver con más atención...te horrorizas al darte cuenta que esta repleto de brazos humanos. Es mejor que se mantenga cerrado.<div align=\"justify\"></p>\n<p><br>\n<b><p><em>Has ganado 1 punto de locura. Estás perdiendo la cordura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["Locura+=1"],
			},
			'TV vieja': {
				'text': "<p><div align=\"justify\">\nA tu izquierda hay un mueble con una TV vieja. Tal vez, las noticias ya están hablando de tu desaparición, mejor no encenderla...ya no...<div align=\"justify\"></p>",
			},
			'Sierras y cuchillos': {
				'text': "<p><div align=\"justify\">\nUna mesa a tu izquierda te da escalofrios, esta llena de sierras y cuchillos, algunos manchados con líquido rojo oscuro. Necesitas algo con que defenderte, el <a class=\"squiffy-link link-passage\" data-passage=\"Machete\" role=\"link\" tabindex=\"0\">Machete</a> parece una buena opción para defenderse. Hay un cajón semiabierto, parece que es aquel que el hombre gordo abrió. No ves nada interesante. <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el cajón\" role=\"link\" tabindex=\"0\">Abrir el cajón</a><div align=\"justify\"></p>",
			},
			'Machete': {
				'text': "<p><div align=\"justify\">\nCuando estabas a punto de tomarlo, alejas tu mano. No te sientes cómodo con esto. La violencia no es lo tuyo, no sabrías que hacer con el arma.<div align=\"justify\"></p>",
			},
			'Abrir el cajón': {
				'text': "<p>Abres el cajón.<br><br>        {if Llave=1:<em> <a class=\"squiffy-link link-section\" data-section=\"Observar2\" role=\"link\" tabindex=\"0\">A</a> No hay nada más...} {else:</em> <a class=\"squiffy-link link-section\" data-section=\"Habitaciónf\" role=\"link\" tabindex=\"0\">A</a> Ves una llave, la agarras...}      </p>",
			},
			'nota': {
				'text': "<p><div align=\"justify\">\nPuedes leer en la nota &quot;Gulli nunca duerme, Gulli trabaja siempre, Gulli quiere complacer a las voces...Gulli necesita más cuerpos para trabajar...&quot;.<div align=\"justify\"></p>",
			},
			'Ventanilla': {
				'text': "<p><div align=\"justify\">\nUna ventanilla ya hace encima de la mesa con sierras y cuchillos a tu izquierda, estás en un sótano. Además, esta reforzada con barrotes de metal. No tienes tiempo para intentar salir por ahí.<div align=\"justify\"></p>",
			},
			'Casillero': {
				'text': "<p><div align=\"justify\">\nUn casillero de metal oxidado al derecha del congelador. Su puerta esta abierta, no tiene nada en su interior más que suciedad.<div align=\"justify\"></p>",
			},
		},
	},
	'Habitaciónf': {
		'text': "<div align=\"justify\">\nHas tomado la llave. Para algo tiene que servir, puede ser la clave para escapar de aquí.\n <div align=\"justify\">\n <br>\n<b><p><em>Has obtenido &quot;Llave&quot;.</em></p></b>\n\n<div align=\"center\">\n<img src=\"7.png\">\n</div> \n\n\n<p>En la habitación hay:<br>\n<a class=\"squiffy-link link-passage\" data-passage=\"Un viejo congelador\" role=\"link\" tabindex=\"0\">Un viejo congelador</a> | <a class=\"squiffy-link link-passage\" data-passage=\"TV vieja\" role=\"link\" tabindex=\"0\">TV vieja</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Sierras y cuchillos\" role=\"link\" tabindex=\"0\">Sierras y cuchillos</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Ventanilla\" role=\"link\" tabindex=\"0\">Ventanilla</a> | <a class=\"squiffy-link link-passage\" data-passage=\"Casillero\" role=\"link\" tabindex=\"0\">Casillero</a></p>\n<p>Ir a:<br>\n<a class=\"squiffy-link link-section\" data-section=\"EscenaPasillo3\" role=\"link\" tabindex=\"0\">Pasillo</a></p>",
		'passages': {
			'Un viejo congelador': {
				'text': "<p><div align=\"justify\">\nHay un viejo congelador a tu lado derecho. Parece que esta en funcionamiento, tal vez puedes <a class=\"squiffy-link link-passage\" data-passage=\"Abrir el congelador\" role=\"link\" tabindex=\"0\">Abrir el congelador</a> para ver si hay algo útil.<div align=\"justify\"></p>",
			},
			'Abrir el congelador': {
				'text': "<p><div align=\"justify\">\nAl abrirlo, una densa neblina emana, al ver con más atención...te horrorizas al darte cuenta que esta repleto de brazos humanos. Es mejor que se mantenga cerrado.<div align=\"justify\"></p>\n<p><br>\n<b><p><em>Has ganado 1 punto de locura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["Locura+=1"],
			},
			'TV vieja': {
				'text': "<p><div align=\"justify\">\nA tu izquierda hay un mueble con una TV vieja. Tal vez, las noticias ya están hablando de tu desaparición, mejor no encenderla...ya no...<div align=\"justify\"></p>",
			},
			'Sierras y cuchillos': {
				'text': "<p><div align=\"justify\">\nUna mesa a tu izquierda te da escalofrios, esta llena de sierras y cuchillos, algunos manchados con líquido rojo oscuro. Necesitas algo con que defenderte, el machete ya no te interesa. Hay un cajón semiabierto, parece que es aquel que el hombre gordo abrió. No hay nada más. <div align=\"justify\"></p>",
			},
			'Ventanilla': {
				'text': "<p><div align=\"justify\">\nUna ventanilla ya hace encima de la mesa con sierras y cuchillos a tu izquierda, estás en un sótano. Además, esta reforzada con barrotes de metal. No tienes tiempo para intentar salir por ahí.<div align=\"justify\"></p>",
			},
			'Casillero': {
				'text': "<p><div align=\"justify\">\nUn casillero de metal oxidado al derecha del congelador. Su puerta esta abierta, no tiene nada en su interior más que suciedad.<div align=\"justify\"></p>",
			},
		},
	},
	'EscenaPasillo': {
		'text': "<p><div align=\"justify\">\nEntras con precaución al pasillo. Esta semioscuro. A tu derecha ves unos escalones que llevan a una puerta. La puerta tiene una cadena en la perilla con un gran candado. A tu izquierda hay una habitación oscura que te da escalofríos solo verla.<div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Regresar a la habitación.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Ir hacia la puerta.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Ir hacia la habitación oscura.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score+=20"],
				'js': function() {
					squiffy.story.go("Observarcuarto");
				},
			},
			'B': {
				'text': "<p>¿Y para qué? No tienes una llave...</p>",
				'attributes': ["score-=10"],
			},
			'C': {
				'text': "<p>No es buena idea, ¿y si ahí se encuentra el hombre gordo?</p>\n<pre><code>    {if Locura&gt;3:* &lt;a class=&quot;squiffy-link link-section&quot; data-section=&quot;danger&quot; role=&quot;link&quot; tabindex=&quot;0&quot;&gt;Continuar...&lt;/a&gt;} {else: Sientes que un escalofrío hiela tu columna vertebral...}  \n</code></pre><p><br>\n<b><p><em>Has ganado 1 punto de locura. Estás perdiendo la cordura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["score-=50","Locura+=1"],
			},
		},
	},
	'danger': {
		'text': "<div align=\"center\">\n<img src=\"9.png\">\n</div> \n\n\n<div align=\"justify\">\nCaminas tembloroso hacia la habitación. Las luces encendiéndose y apagándose de manera intermitente te pone de nervios. Cuando entras, te horrorizas al ver cuerpos apilados uno encima de otro, sobre un charco de sangre, iluminados por una luz azul en la esquina de la habitación. De repente, Gulli, aparece detrás de tí y te dice:\n\n- ¡No debes estar aquí, malnacido! - exclama, luego enciende la motosierra que tiene entre las manos. Ha llegado tu fin.<div align=\"justify\">\n\n<div align=\"center\">\n<img src=\"10.png\">\n</div> \n\n\n<p><a class=\"squiffy-link link-section\" data-section=\"Findeljuego\" role=\"link\" tabindex=\"0\">Continuar...</a></p>",
		'passages': {
		},
	},
	'EscenaPasillo3': {
		'text': "<p><div align=\"justify\">\nEntras con precaución al pasillo. Esta semioscuro. A tu derecha ves unos escalones que llevan a una puerta. La puerta tiene una cadena en la perilla con un gran candado. A tu izquierda hay una habitación oscura que te da escalofríos solo verla.<div align=\"justify\"></p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Regresar a la habitación.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Ir hacia la puerta.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Ir hacia la habitación oscura.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score+=10"],
				'js': function() {
					squiffy.story.go("Habitaciónf");
				},
			},
			'B': {
				'text': "",
				'attributes': ["score+=30"],
				'js': function() {
					squiffy.story.go("PuertaCandado2");
				},
			},
			'C': {
				'text': "<p>No es buena idea, ¿y si ahí se encuentra el hombre gordo?\n        {if Locura&gt;3:* <a class=\"squiffy-link link-section\" data-section=\"danger\" role=\"link\" tabindex=\"0\">Continuar...</a>} {else: Sientes que un escalofrío hiela tu columna vertebral...}<br><br>\n<b><p><em>Has ganado 1 punto de locura. Estás perdiendo la cordura. Tus puntos de locura son {Locura}.</em></p></b></p>",
				'attributes': ["score-=50","Locura+=1"],
			},
		},
	},
	'PuertaCandado2': {
		'text': "<div align=\"center\">\n<img src=\"8.png\">\n</div> \n\n<p>La puerta tiene una cadena con un enorme candado atravesado por la perilla.</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Regresar al pasillo.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Regresar a la habitación.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Quitar candado.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'attributes': ["score-=10"],
				'js': function() {
					squiffy.story.go("EscenaPasillo3");
				},
			},
			'B': {
				'text': "",
				'attributes': ["score-=30"],
				'js': function() {
					squiffy.story.go("Habitacionf");
				},
			},
			'C': {
				'text': "<p>Observar el candado.<br>\n    {if Llave=1:<em> <a class=\"squiffy-link link-section\" data-section=\"FinalEpisodio\" role=\"link\" tabindex=\"0\">A</a> Sacas la llave de tu bolsillo y la introduces en el candado...} {else:</em> <a class=\"squiffy-link link-section\" data-section=\"PuertaCandado2\" role=\"link\" tabindex=\"0\">B</a> No tienes la llave...}  </p>",
				'attributes': ["score+=40"],
			},
		},
	},
	'FinalEpisodio': {
		'clear': true,
		'text': "<p><audio\n  src=\"haunt.mp3\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio></p>\n<p><div align=\"justify\">\nQuitas el candado, cuidadosamente, y empujas la puerta. Sales del sótano, ahora estas en una habitación repletas de libros. A lo lejos escuchas pasos, parecen provenir del sótano...<div align=\"justify\"></p>\n<p><div align=\"center\"><b><p><em>FIN DEL EPISODIO I</em></p></b></div></p>\n<p><div align=\"center\"><b><p><em>Presiona continuar para conocer tu status. Tal vez, este es un buen momento para que descanses tu vista.</em></p></b></div>\n<br>\n<a class=\"squiffy-link link-section\" data-section=\"Status1\" role=\"link\" tabindex=\"0\">Continuar...</a></p>",
		'js': function() {
			   
		},
		'passages': {
		},
	},
	'Status1': {
		'text': "<p><div align=\"center\"><b><p><em>STATUS</em></p></b></div></p>\n<p><div align=\"center\"><p><em>Puntos de vida: {Health}</em></p></div></p>\n<p><div align=\"center\"><p><em>Cordura: {Locura}</em></p></div>\n<br>\n<br>\n        {if Health&gt;3:<em> Te han herido, pero has sabido manejar la situación.} {else:</em> Has estado a punto de morir...}</p>\n<pre><code>    {if Locura&gt;3:* Tus nervios y cordura casi te hacen morir.} {else:* Tienes nervios de acero...}\n</code></pre><p><a class=\"squiffy-link link-section\" data-section=\"start\" role=\"link\" tabindex=\"0\">Continuar...</a></p>",
		'passages': {
		},
	},
}
})();