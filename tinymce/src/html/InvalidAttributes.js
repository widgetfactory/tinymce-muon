(function (tinymce) {
    function compileInvalidAttributeMatchers(list) {
        var items = tinymce.explode(list);
        var matchers = [];
        var i, s, rx;

        for (i = 0; i < items.length; i++) {
            s = (items[i] || '').trim();

            if (!s) {
                continue;
            }

            // Treat as regex pattern. Anchor to whole attribute name.
            // So "class" matches only "class", and "data-(start|end)" matches those exactly.
            try {
                rx = new RegExp('^(?:' + s + ')$', 'i');
                matchers.push(rx);
            } catch (e) {
                // Fallback: escape as literal if regex is invalid
                s = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                matchers.push(new RegExp('^' + s + '$', 'i'));
            }
        }

        return matchers;
    }

    var compiledRules = [];

    function isInvalid(name, invalidAttributes) {
        var i;

        if (!name) {
            return false;
        }

        if (compiledRules.length === 0) {
            compiledRules = compileInvalidAttributeMatchers(invalidAttributes);
        }

        for (i = 0; i < compiledRules.length; i++) {
            if (compiledRules[i].test(name)) {
                return true;
            }
        }

        return false;
    }

    tinymce.html.InvalidAttributes = {
        isInvalid: isInvalid
    };

})(tinymce);