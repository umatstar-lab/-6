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
            ')([\\u0020\\u00A0\\t\\r\\n]+)(?=[\\p{L}\\p{N}])',
            'giu'
        );
    }

    // Work with text nodes only: never reserialize component/module markup.
    const excludedSelector = 'script, style, textarea, input, select, option, pre, code, kbd, samp, noscript, template, iframe, svg, math, [contenteditable]:not([contenteditable="false"]), [data-nobreaktitles="off"]';

    function isInline(element) {
        const display = window.getComputedStyle(element).display;
        return display === 'inline' || display === 'contents';
    }

    function blockRoot(node) {
        let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        while (element && element !== document.body && isInline(element)) element = element.parentElement;
        return element;
    }

    function numberPattern() {
        const words = unique(list(options.numberAbbr === undefined ? 'р., рр., г., гг.' : options.numberAbbr))
            .sort(function (a, b) { return b.length - a.length; }).map(escapeRegex);
        if (!words.length) return null;
        return new RegExp('(\\p{N})([\\u0020\\u00A0\\t\\r\\n]+)(?=(?:' + words.join('|') + ')(?![\\p{L}\\p{N}]))', 'giu');
    }

    // Match across inline tags, but edit only whitespace inside existing text nodes.
    // Element identity, event listeners and component markup remain intact.
    function processRun(nodes, patterns) {
        if (!nodes.length) return;
        const text = nodes.map(function (node) { return node.nodeValue; }).join('');
        const edits = new Map();
        patterns.forEach(function (pattern) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text))) {
                const start = match.index + match[1].length;
                const end = start + match[2].length;
                if (text.slice(start, end) !== '\u00A0') edits.set(start, { start: start, end: end });
            }
        });
        if (!edits.size) return;
        let offset = 0;
        nodes.forEach(function (node) {
            const original = node.nodeValue;
            const limit = offset + original.length;
            const changes = [];
            edits.forEach(function (edit) {
                if (edit.start < limit && edit.end > offset) {
                    changes.push({
                        start: Math.max(0, edit.start - offset),
                        end: Math.min(original.length, edit.end - offset),
                        value: edit.start >= offset ? '\u00A0' : ''
                    });
                }
            });
            changes.sort(function (a, b) { return b.start - a.start; });
            let result = original;
            changes.forEach(function (change) {
                result = result.slice(0, change.start) + change.value + result.slice(change.end);
            });
            if (result !== original) node.nodeValue = result;
            offset = limit;
        });
    }

    function process(root, patterns) {
        if (!root || root.closest(excludedSelector)) return;
        let run = [];
        function flush() { processRun(run, patterns); run = []; }
        function visit(element) {
            element.childNodes.forEach(function (node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    run.push(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches(excludedSelector + ', br, wbr')) {
                        flush();
                    } else if (isInline(node)) {
                        visit(node);
                    } else {
                        flush(); visit(node); flush();
                    }
                }
            });
        }
        visit(root); flush();
    }

    function init() {
        const patterns = [buildPattern(), numberPattern()].filter(Boolean);
        if (!patterns.length || !document.body) return;
        process(document.body, patterns);
        const observerOptions = { childList: true, characterData: true, subtree: true };
        const observer = new MutationObserver(function (mutations) {
            const roots = new Set();
            mutations.forEach(function (mutation) {
                const root = blockRoot(mutation.target);
                if (root && document.body.contains(root)) roots.add(root);
            });
            // Do not observe our own whitespace edits or repeatedly scan nested roots.
            observer.disconnect();
            try {
                roots.forEach(function (root) {
                    let parent = root.parentElement;
                    while (parent) {
                        if (roots.has(parent)) return;
                        parent = parent.parentElement;
                    }
                    process(root, patterns);
                });
            } finally { observer.observe(document.body, observerOptions); }
        });
        observer.observe(document.body, observerOptions);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
