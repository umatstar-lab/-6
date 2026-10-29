(function () {
    'use strict';

    const options = (window.Joomla && Joomla.getOptions)
        ? Joomla.getOptions('plg_system_nobreaktitles', {})
        : {};

    function list(value) {
        return String(value || '')
            .split(/[\n,;]+/)
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
    }

    function unique(values) {
        return Array.from(new Set(values));
    }

    function getWords() {
        let words = [];

        if (options.mode === 'uk') {
            words = list(options.uk);
        } else if (options.mode === 'ru') {
            words = list(options.ru);
        } else if (options.mode === 'en') {
            words = list(options.en);
        } else if (options.mode === 'all') {
            words = list(options.uk).concat(list(options.ru), list(options.en));
        } else {
            const lang = (document.documentElement.lang || '').toLowerCase();

            if (lang.indexOf('uk') === 0) {
                words = list(options.uk);
            } else if (lang.indexOf('ru') === 0) {
                words = list(options.ru);
            } else if (lang.indexOf('en') === 0) {
                words = list(options.en);
            } else {
                words = list(options.uk).concat(list(options.ru), list(options.en));
            }
        }

        return unique(words.concat(list(options.abbr)));
    }

    function escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function buildPattern() {
        const words = getWords()
            .sort(function (a, b) { return b.length - a.length; })
            .map(escapeRegex);

        if (!words.length) {
            return null;
        }

        /*
         * A short word/abbreviation must be followed by a normal space,
         * NBSP, tab or line break and then a letter/number.
         */
        return new RegExp(
            '(?<![\\p{L}\\p{N}])(' +
            words.join('|') +
            ')(?:[\\u0020\\u00A0\\t\\r\\n]+)(?=[\\p{L}\\p{N}])',
            'giu'
        );
    }

    // Work with text nodes only: never reserialize component/module markup.
    const excludedSelector = 'script, style, textarea, input, select, option, pre, code, kbd, samp, noscript, template, iframe, svg, math, [contenteditable]:not([contenteditable="false"]), [data-nobreaktitles="off"]';

    function eligible(node) {
        return node.parentElement && !node.parentElement.closest(excludedSelector);
    }

    function processTextNode(node, pattern) {
        if (!eligible(node) || !node.nodeValue) return;
        pattern.lastIndex = 0;
        const result = node.nodeValue.replace(pattern, '$1\u00A0');
        if (result !== node.nodeValue) node.nodeValue = result;
    }

    function process(root, pattern) {
        if (root.nodeType === Node.TEXT_NODE) {
            processTextNode(root, pattern);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excludedSelector)) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) processTextNode(node, pattern);
    }

    function init() {
        const pattern = buildPattern();
        if (!pattern || !document.body) return;
        process(document.body, pattern);

        // Covers AJAX modules and updates to existing text as well as new nodes.
        const observer = new MutationObserver(function (mutations) {
            const roots = new Set();
            mutations.forEach(function (mutation) {
                if (mutation.type === 'characterData') {
                    roots.add(mutation.target);
                } else {
                    mutation.addedNodes.forEach(function (node) { roots.add(node); });
                }
            });
            roots.forEach(function (node) {
                if (document.body.contains(node)) process(node, pattern);
            });
        });
        observer.observe(document.body, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
