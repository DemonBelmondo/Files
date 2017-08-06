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
		'text': "<audio\n  src=\"gamebook.ogg\"\n  autoplay>\n  Your browser does not support the <code>audio</code> element.\n</audio>\n\n\n<div align=\"center\">\n<img src=\"smilingg.png\">\n</div> \n\n<p>Descubre el camino a la supervivencia. Este es un Gamebook tambíen conocido como Text adventure, en el cual tendrás que tomar desiciones que afectarán el juego. </p>\n<p>Si tus puntos de vida llegan a 0, entonces habrás perdido. </p>\n<p><b><p><em>Tus puntos de vida son {Health}</em></p></b></p>\n<div align=\"center\">\n<a class=\"squiffy-link link-passage\" data-passage=\"Empezar\" role=\"link\" tabindex=\"0\">Empezar</a>\n</div>",
		'attributes': ["Health = 5"],
		'passages': {
			'Empezar': {
				'text': "",
				'js': function() {
					setTimeout(function(){
					   squiffy.story.go("Capitulo1");
					},5000);
					    
				},
			},
		},
	},
	'Capitulo1': {
		'clear': true,
		'text': "<audio\n  src=\"resident.mp3\"\n  autoplay>\n  <loop>\n  Your browser does not support the <code>audio</code> element.\n</audio>\n\n<h1>El cadaver sonriente</h1>\n\n<h2>Capítulo 1</h2>\n\n<p>Te has despertado con un fuerte dolor de cabeza. Estás sentado con las manos atadas a una silla de madera. Te encuentras en una habitación oscura con un foco colgando, exactamente, encima de tu cabeza. Un hombre, gordo, con una sonrisa te observa a lo lejos, su expresión perdida y carente de cordura te hiela la sangre. Se acerca lentamente sobandose las manos, curioso, tímido, decidido...</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Mueves tus manos desesperadamente, esperanzado a escapar.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Lo observas fijamente, intentas permanecer tranquilo.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Le preguntas &quot;¿Quién eres?&quot;.</p>\n</li>\n</ul>",
		'js': function() {
			            
		},
		'passages': {
			'A': {
				'text': "<p>Te mueves enérgicamente, pero notas que es imposible quitarse las ataduras. La expresión del hombre es de sorpresa al ver tu intento fallido; se detiene, abre los ojos, dibuja una &quot;o&quot; con sus labios, después de unos segundos, vuelve a sonreir.</p>",
			},
			'B': {
				'text': "<p>El hombre gordo lleva un mandil blanco, muy sucio, su aspecto es desaliñado; sus gordas mejillas casi le cubren los ojos; su sonrisa, blanca, impecable...desentona con su aspecto y lo vuelve inquietante; viste con una camisa blanca, un pantalón y zapatos negros.</p>",
			},
			'C': {
				'text': "<p>El hombre no da ninguna respuesta.</p>",
			},
			'@1': {
				'text': "<p>El hombre continua acercándose lentamente.</p>",
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
		'text': "<p>El hombre se postra frente a ti. Sonríe y con una reverencia majestuosa dice:</p>\n<p>-Buenas noches, mi nombre es..., bueno no creo que le importe. Pero debo decirle a usted que yo no soy de esas personas que se dejan asustar por cualquier cosa. No, señor. Soy un hombre, hecho y derecho. Más que eso, soy alguien quién inspira el miedo. Un hombre de la vida galante con la sangre fría y traicionera. Así es, una persona que tiene por pasatiempo matar personas por el simple hecho de hacerlo; sin embargo, últimamente me he olvidado de tales pasiones, debido a que no puedo controlar esta cruda sensación. Dios me protega, en verdad, Dios me protega, ya que está imagen me sigue a todos lados y no deja de atormentarme. ¡Ay de mí y de mi benevolente alma! Qué si de algo ha pecado, ha sido de asesinar, porque soy un hombre ejemplo, incluso doy limosna en misa. Si es que, siendo honestos, no hay persona como yo. Las voces dentro de mi cabeza me piden a gritos que termine mi obra maestra, esa imagen en mi cabeza. Crearé el cuerpo perfecto, tu tienes una sonrisa perfecta...</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Aterrado por las locuras que habla el hombre comienzas a gritar.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Lo observas fijamente, intentas no mostrar emoción alguna.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Observas la habitación en la que te encuentras.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "<p>Sueltas una alarido de terror. El hombre te observa, suelta una carcajada, y después de unos segundos empieza a toser grotescamente. Luego se acerca y te da una bofetada. </p>\n<p>-¡Silencio! Nos puede escuchar...No quiero que nos escuche...\n<br>\n<br>\n<b><p><em>Has perdido 1 punto de vida. Tus puntos de vida son {Health}.</em></p></b>\n<br>\n<br></p>",
				'attributes': ["Health-=1"],
			},
			'B': {
				'text': "<p>El hombre gordo te observa fijamente, luego alza las manos con magnificiencias como si agarrara de la cintura y la mano a alguien, a continuación empieza a dar pasos atrás, pasos adelante, con los ojos cerrados, por toda la habitación; pareciese que bailara al ritmo de una melodía. solo ves la silueta de aquel hombre que va y viene de entre la sombras al cículo de luz en el que te encuentras.</p>",
			},
			'C': {
				'text': "<p>Giras tu cabeza alrededor, todo es oscuro, a excepción de la luz que tienes encima de tu cabeza. Aquel hombre sonrie mientras baila...es como si siguiera el ritmo de algún vals de opera. </p>",
			},
			'@1': {
				'text': "<p>El hombre baila, baila...baila con magnificencia. Baila...</p>",
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
		'text': "<p>El hombre paró en seco, gira hacia a ti y dice:</p>\n<p>-Es hora, me están hablando. - El loco se adentra en la sombras de la habitación. Se escucha al fondo que se abre un cajón. Luego unos sonidos metálicos y, finalmente, el hombre regresa con un cuchillo de carnicero oxidado. Respira muy fuerte y parece muy ansioso.</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Le preguntas que tiene planeado hacer con el cuchillo. Intentas no vacilar.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Le preguntas por su nombre.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "",
				'js': function() {
					    squiffy.story.go("Escena3");
				},
			},
			'B': {
				'text': "<p>-¿Nombre? - El hombre suelta una carcajada, pareciese que estuviera haciendo gárgaras- Ellos me han dicho que preguntarías por mi nombre. Yo no tengo nombre. No, si tienes. No, no debo...debería saberlo...no...</p>\n<p>Parece que el hombre tiene una batalla interna. Empiezas a pensar que le falta un tornillo, ya no luce tan cuerdo. </p>",
			},
		},
	},
	'Escena3': {
		'text': "<p>El hombre gordo sonríe ampliamente, mostrando su dentadura perfecta, tan perfecta que te resulta antinatural, surreal. Te apunta con el cuchillo y dice:</p>\n<p>-Tu serás el indicado. Si, señor, usted, buen hombre, ha sido elegido por ellos. Tiene que ser como ellos, mejor que ellos...</p>\n<ul>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"A\" role=\"link\" tabindex=\"0\">A</a> Preguntas: &quot;¿De que me hablas?&quot;.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"B\" role=\"link\" tabindex=\"0\">B</a> Exclamas: &quot;Eres un enfermo&quot;. Luego le escupes.</p>\n</li>\n<li><p><a class=\"squiffy-link link-passage\" data-passage=\"C\" role=\"link\" tabindex=\"0\">C</a> Le sigues el juego: &quot;¿Mejor que quiénes?&quot;.</p>\n</li>\n</ul>",
		'passages': {
			'A': {
				'text': "<p>-¿Quieres ver? - pregunta, y sin esperar una respuesta, suelta el cuchillo, y camina con una cojera hacia a las sombras de la habitación. Luego abre una puerta y sale por ella, escuchas como se aleja. Al fondo puedes divisar un pasillo iluminado. </p>",
				'js': function() {
					      squiffy.story.go("Escena4");
					      
				},
			},
			'B': {
				'text': "<p>Tu escupitajo alcanzo uno de sus zapatos.</p>\n<p>-¡¿Que?! - Su rostro se deforma terriblemente en un arrebato de ira - ¡¿Como te atreves a insultarme de esta forma?! ¡Tú que eres mi ser perfecto!</p>\n<p>El hombre gordo se acerca y te encaja el cuchillo en una pierna. Sueltas un alarido de dolor.</p>\n<p>-¡Ellos pensaban igual que tú! - Exclama mientras saca, sin remordimiento, el cuchillo.</p>\n<p>Casi te desmayas, pero por alguna razón la adrenalina y el pánico generado te mantiene despierto...tú odio hacia aquel ser repugnante ha despertado, pero tienes más miedo a no saber que será de ti si te quedas inconciente.\n<br>\n<br>\n<b><p><em>Has perdido 1 punto de vida. Tus puntos de vida son {Health}.</em></p></b></p>",
				'attributes': ["Health-=1"],
			},
			'C': {
				'text': "<p>De repente, el maníaco se torna nervioso e inseguro...</p>\n<p>-Aquellos...los de la sonrisa - dice con cierto temor - Ellos me hablan, siempre me exigen más y más, caballero. No puedo decirles que no. Si me negara acabarían conmigo y mi dulce Marian. Eres el ser perfecto, eres empático, a pesar de todo...creo que te presentaré a Marian. Sí, ella es buena, ya verás...</p>\n<p>El hombre sin esperar una respuesta, suelta el cuchillo, y camina con una cojera hacia a las sombras de la habitación. Luego abre una puerta y sale por ella, escuchas como se aleja. Al fondo puedes divisar un pasillo iluminado. </p>",
				'js': function() {
					    squiffy.story.go("Escena4");
					    
				},
			},
		},
	},
	'Escena4': {
		'text': "<p>lolol</p>",
		'passages': {
		},
	},
}
})();