(function (tinymce) {
    function buildInvalidAttributeRules(value) {
        var rules = [];
        var items = tinymce.explode(value);

        tinymce.each(items, function (item) {
            item = (item || '').trim();
            if (!item) {
                return;
            }

            // 1) Bracket syntax: tag[attr^=value]
            var m = /([a-z0-9\*]+)\[([a-z0-9\-]+)([\^\$\!~\*]?=)?["']?([^"']+)?["']?\]/i.exec(item);

            if (m && m.length === 5) {
                rules.push({
                    type: 'bracket',
                    tag: m[1].toLowerCase(),
                    attrib: m[2].toLowerCase(),
                    expr: typeof m[3] === 'undefined' ? null : (m[3] || ''), // '' means remove attr regardless
                    check: (m[4] || '')
                });
                return;
            }

            // 2) Plain attribute name or pattern (treat as regex-ish)
            // e.g. "dynsrc", "lowsrc", "data-(start|end)", "class"
            rules.push({
                type: 'pattern',
                tag: '*',
                pattern: item
            });
        });

        return rules;
    }

    var compiledRules = [];

    function attrFilter(value, expr, check) {
        return !expr ? !!check :
            expr === "=" ? value === check :
                expr === "*=" ? value.indexOf(check) >= 0 :
                    expr === "~=" ? (" " + value + " ").indexOf(" " + check + " ") >= 0 :
                        expr === "!=" ? value != check :
                            expr === "^=" ? value.indexOf(check) === 0 :
                                expr === "$=" ? value.substr(value.length - check.length) === check :
                                    false;
    }

    function applyInvalidAttributeRules(tag, name, value, rules) {
        var r, rx;

        if (value === '' || value === null || value === undefined) {
            return value;
        }

        if (compiledRules.length === 0) {
            compiledRules = buildInvalidAttributeRules(rules);
        }

        if (compiledRules.length === 0) {
            return value;
        }

        name = name.toLowerCase();

        // Rule type: pattern (supports regex-like strings)
        for (var k = 0; k < compiledRules.length; k++) {
            r = compiledRules[k];

            if (r.type === 'pattern') {
                // Anchor by default so "class" doesn't match "className" etc.
                // If they supply regex groups, allow them.
                try {
                    rx = new RegExp('^' + r.pattern + '$', 'i');
                } catch (e) {
                    rx = null;
                }

                if ((rx && rx.test(name)) || r.pattern.toLowerCase() === name) {
                    return null; // Remove the attribute
                }
            }

            if (r.type === 'bracket') {                
                if (r.tag !== '*' && tag !== r.tag) {
                    continue;
                }

                if (name !== r.attrib) {
                    continue;
                }

                if (!r.expr || attrFilter(value, r.expr, r.check)) {
                    return null; // Remove the attribute
                }
            }
        }

        return value;
    }

    tinymce.html.InvalidAttributeValue = {
        applyRules: applyInvalidAttributeRules
    };

})(tinymce);