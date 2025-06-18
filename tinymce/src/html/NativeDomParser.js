/**
 * Originally based on TinyMCE 3.x and TinyMCE 4.x.
 * Includes modified code from TinyMCE 7.x, licensed under the GNU General Public License v2.0 or later
 *
 * Copyright (c) Moxiecode Systems AB
 * Copyright (c) 1999–2025 Ephox Corporation. All rights reserved.
 * Licensed under the GNU Lesser General Public License v2.1 or later.
 * See LICENSE.TXT in the original TinyMCE project.
 *
 * This version:
 * Copyright (c) 2025 Ryan Demmer
 * Relicensed under the GNU General Public License v2.0 or later,
 * as permitted by Section 3 of the LGPL.
 *
 * See LICENSE for GPL terms.
 */

(function (tinymce) {
  var Node = tinymce.html.Node,
    each = tinymce.each,
    explode = tinymce.explode,
    extend = tinymce.extend,
    makeMap = tinymce.makeMap;

  var NBSP = '\u00A0';

  /**
   * This class parses HTML code into a DOM like structure of nodes it will remove redundant whitespace and make
   * sure that the node tree is valid according to the specified schema. So for example: <p>a<p>b</p>c</p> will become <p>a</p><p>b</p><p>c</p>
   *
   * @example
   * var parser = new tinymce.html.DomParser({validate: true}, schema);
   * var rootNode = parser.parse('<h1>content</h1>');
   *
   * @class tinymce.html.DomParser
   */

  /**
   * Constructs a new DomParser instance.
   *
   * @constructor
   * @method DomParser
   * @param {Object} settings Name/value collection of settings. comment, cdata, text, start and end are callbacks.
   * @param {tinymce.html.Schema} schema HTML Schema class to use when parsing.
   */
  tinymce.html.DomParser = function (settings, schema) {
    var self = this,
      nodeFilters = [],
      attributeFilters = [];

    settings = settings || {};
    settings.validate = "validate" in settings ? settings.validate : true;
    settings.root_name = settings.root_name || 'body';
    self.schema = schema = schema || new tinymce.html.Schema();

    self.purifier = new tinymce.html.Purifier(settings, schema);

    /**
     * Recursively finds invalid children of a node according to the schema.
     * Populates the `invalids` array with nodes that are not allowed in their parent.
     *
     * @param {Node} node - The root node to validate from.
     * @param {Array} invalids - Accumulator array for invalid children.
     */
    function findInvalidChildren(node, invalids) {
      for (var child = node.firstChild; child; child = child.next) {

        if (!schema.isValidChild(node.name, child.name)) {
          invalids.push(child);
        }

        findInvalidChildren(child, invalids);
      }
    }

    var FilterNode = {
      matchNode: function (nodeFilters, attributeFilters, node, matches) {
        var name = node.name;

        for (var ni = 0, nl = nodeFilters.length; ni < nl; ni++) {
          var filter = nodeFilters[ni];

          if (filter.name === name) {
            var match = matches.nodes[name];

            if (match) {
              match.nodes.push(node);
            } else {
              matches.nodes[name] = { filter, nodes: [node] };
            }
          }
        }

        // Match attribute filters
        if (node.attributes) {
          for (var ai = 0, al = attributeFilters.length; ai < al; ai++) {
            var filter = attributeFilters[ai];
            var attrName = filter.name;

            if (attrName in node.attributes.map) {
              var match = matches.attributes[attrName];

              if (match) {
                match.nodes.push(node);
              } else {
                matches.attributes[attrName] = { filter, nodes: [node] };
              }
            }
          }
        }
      }
    };

    /**
     * Executes all node and attribute filters on matching nodes.
     * Filters are only applied to nodes that still match after tree manipulation.
     *
     * @param {Object} matches - Contains { nodes, attributes } records of matched filters.
     * @param {Object} args - Additional arguments passed to filter callbacks.
     */
    function runFilters(matches, args) {

      function run(matchRecord, isAttributeFilter) {

        each(matchRecord, function (match) {

          var originalNodes = match.nodes;
          var filterName = match.filter.name;
          var callbacks = match.filter.callbacks;

          // Copy the node array
          var nodes = originalNodes.slice();

          for (var ci = 0; ci < callbacks.length; ci++) {
            var callback = callbacks[ci];
            var validNodes = [];

            for (var i = 0; i < nodes.length; i++) {
              var node = nodes[i];

              var stillMatches = isAttributeFilter ? node.attr(filterName) !== undefined : node.name === filterName;

              if (stillMatches && node.parent != null) {
                validNodes.push(node);
              }
            }

            if (validNodes.length > 0) {
              callback(validNodes, filterName, args);
            }
          }
        });
      }

      run(matches.nodes, false);
      run(matches.attributes, true);
    }

    /**
     * Attempts to fix or remove invalid children in the DOM tree.
     * It either unwraps, repositions, or removes invalid nodes depending on schema rules.
     *
     * @param {Array} nodes - List of invalid child nodes to process.
     */
    function fixInvalidChildren(nodes) {
      var ni, node, parent, parents, newParent, currentNode, tempNode, childNode, i;
      var nonEmptyElements, nonSplitableElements, textBlockElements, specialElements, sibling, nextNode;

      nonSplitableElements = makeMap('tr,td,th,tbody,thead,tfoot,table');
      nonEmptyElements = schema.getNonEmptyElements();
      textBlockElements = schema.getTextBlockElements();
      specialElements = schema.getSpecialElements();

      var removeOrUnwrapInvalidNode = function (node, originalNodeParent) {
        if (specialElements[node.name]) {
          node.empty().remove();
        } else {
          // are the children of `node` valid children of the top level parent?
          // if not, remove or unwrap them too
          var children = node.children();

          for (var childNode of children) {
            if (!schema.isValidChild(originalNodeParent.name, childNode.name)) {
              removeOrUnwrapInvalidNode(childNode, originalNodeParent);
            }
          }

          node.unwrap();
        }
      };

      for (ni = 0; ni < nodes.length; ni++) {
        node = nodes[ni];

        // Already removed or fixed
        if (!node.parent || node.fixed) {
          continue;
        }

        // If the invalid element is a text block and the text block is within a parent LI element
        // Then unwrap the first text block and convert other sibling text blocks to LI elements similar to Word/Open Office
        if (textBlockElements[node.name] && node.parent.name == 'li') {
          // Move sibling text blocks after LI element
          sibling = node.next;
          while (sibling) {
            if (textBlockElements[sibling.name]) {
              sibling.name = 'li';
              sibling.fixed = true;
              node.parent.insert(sibling, node.parent);
            } else {
              break;
            }

            sibling = sibling.next;
          }

          // Unwrap current text block
          node.unwrap(node);
          continue;
        }

        // Get list of all parent nodes until we find a valid parent to stick the child into
        parents = [node];

        for (parent = node.parent; parent && !schema.isValidChild(parent.name, node.name) &&
          !nonSplitableElements[parent.name]; parent = parent.parent) {
          parents.push(parent);
        }

        // Found a suitable parent
        if (parent && parents.length > 1) {
          // If the node is a valid child of the parent, then try to move it. Otherwise unwrap it
          if (schema.isValidChild(parent.name, node.name)) {
            // Reverse the array since it makes looping easier
            parents.reverse();

            // Clone the related parent and insert that after the moved node
            newParent = currentNode = parents[0].clone();

            // Start cloning and moving children on the left side of the target node
            for (i = 0; i < parents.length - 1; i++) {
              if (schema.isValidChild(currentNode.name, parents[i].name)) {
                tempNode = parents[i].clone();
                currentNode.append(tempNode);
              } else {
                tempNode = currentNode;
              }

              for (childNode = parents[i].firstChild; childNode && childNode != parents[i + 1];) {
                nextNode = childNode.next;
                tempNode.append(childNode);
                childNode = nextNode;
              }

              currentNode = tempNode;
            }

            if (!newParent.isEmpty(nonEmptyElements)) {
              parent.insert(newParent, parents[0], true);
              parent.insert(node, newParent);
            } else {
              parent.insert(node, parents[0], true);
            }

            // Check if the element is empty by looking through it's contents and special treatment for <p><br /></p>
            parent = parents[0];

            if (parent.isEmpty(nonEmptyElements) || parent.firstChild === parent.lastChild && parent.firstChild.name === 'br') {
              parent.empty().remove();
            }
          } else {
            removeOrUnwrapInvalidNode(node, node.parent);
          }
        } else if (node.parent) {
          // If it's an LI try to find a UL/OL for it or wrap it
          if (node.name === 'li') {
            sibling = node.prev;
            if (sibling && (sibling.name === 'ul' || sibling.name === 'ul')) {
              sibling.append(node);
              continue;
            }

            sibling = node.next;
            if (sibling && (sibling.name === 'ul' || sibling.name === 'ul')) {
              sibling.insert(node, sibling.firstChild, true);
              continue;
            }

            node.wrap(new Node('ul', 1));
            continue;
          }

          // Try wrapping the element in a DIV
          if (schema.isValidChild(node.parent.name, 'div') && schema.isValidChild('div', node.name)) {
            node.wrap(new Node('div', 1));
          } else {
            // We failed wrapping it, remove or unwrap it
            removeOrUnwrapInvalidNode(node, node.parent);
          }
        }
      }
    }

    /**
     * Adds a node filter function to the parser, the parser will collect the specified nodes by name
     * and then execute the callback ones it has finished parsing the document.
     *
     * @example
     * parser.addNodeFilter('p,h1', function(nodes, name) {
     *		for (var i = 0; i < nodes.length; i++) {
     *			console.log(nodes[i].name);
     *		}
     * });
     * @method addNodeFilter
     * @method {String} name Comma separated list of nodes to collect.
     * @param {function} callback Callback function to execute once it has collected nodes.
     */
    self.addNodeFilter = function (name, callback) {
      each(explode(name), function (name) {
        var i;

        for (i = 0; i < nodeFilters.length; i++) {
          if (nodeFilters[i].name === name) {
            nodeFilters[i].callbacks.push(callback);
            return;
          }
        }

        nodeFilters.push({
          name: name,
          callbacks: [callback]
        });
      });
    };

    /**
     * Adds a attribute filter function to the parser, the parser will collect nodes that has the specified attributes
     * and then execute the callback ones it has finished parsing the document.
     *
     * @example
     * parser.addAttributeFilter('src,href', function(nodes, name) {
     *		for (var i = 0; i < nodes.length; i++) {
     *			console.log(nodes[i].name);
     *		}
     * });
     * @method addAttributeFilter
     * @method {String} name Comma separated list of nodes to collect.
     * @param {function} callback Callback function to execute once it has collected nodes.
     */
    self.addAttributeFilter = function (name, callback) {
      each(explode(name), function (name) {
        var i;

        for (i = 0; i < attributeFilters.length; i++) {
          if (attributeFilters[i].name === name) {
            attributeFilters[i].callbacks.push(callback);
            return;
          }
        }

        attributeFilters.push({
          name: name,
          callbacks: [callback]
        });
      });
    };

    /**
     * Parses the specified HTML string into a DOM like node tree and returns the result.
     *
     * @example
     * var rootNode = new DomParser({...}).parse('<b>text</b>');
     * @method parse
     * @param {String} html Html string to sax parse.
     * @param {Object} args Optional args object that gets passed to all filter functions.
     * @return {tinymce.html.Node} Root node containing the tree.
     */
    self.parse = function (html, args) {
      var rootNode, validate;
      var blockElements, startWhiteSpaceRegExp, invalidChildren = [];

      var endWhiteSpaceRegExp, allWhiteSpaceRegExp, whitespaceElements, textRootBlockElements;
      var nonEmptyElements, rootBlockName;

      args = args || {};
      blockElements = extend(makeMap('script,style,head,html,body,title,meta,param'), schema.getBlockElements());
      nonEmptyElements = schema.getNonEmptyElements();
      validate = settings.validate;
      rootBlockName = "forced_root_block" in args ? args.forced_root_block : settings.forced_root_block;

      whitespaceElements = schema.getWhiteSpaceElements();
      textRootBlockElements = schema.getTextRootBlockElements(schema);

      startWhiteSpaceRegExp = /^[ \t\r\n]+/;
      endWhiteSpaceRegExp = /[ \t\r\n]+$/;
      allWhiteSpaceRegExp = /[ \t\r\n]+/g;

      /**
       * Checks if any ancestor node preserves whitespace (e.g., <pre>, <code>).
       * @param {tinymce.html.Node} node - The node to inspect.
       * @returns {boolean} True if any parent element preserves whitespace.
       */
      function hasWhitespaceParent(node) {
        var tempNode = node.parent;

        while (tempNode) {
          if (whitespaceElements[tempNode.name]) {
            return true;
          }

          tempNode = tempNode.parent;
        }

        return false;
      }

      /**
       * Determines if the current node resides within an empty text-root block.
       * Walks up until a text-root block element is found, then tests emptiness.
       * @param {tinymce.html.Node} node - The node to check.
       * @returns {boolean} True if that text-root block is empty.
       */
      function isTextRootBlockEmpty(node) {
        var tempNode = node;
        while (tempNode) {
          if (textRootBlockElements[tempNode.name]) {
            return isEmpty(tempNode);
          }
          tempNode = tempNode.parent;
        }
        return false;
      }

      /**
       * Tests whether a node is block-level according to schema rules.
       * @param {tinymce.html.Node} node - Node to test.
       * @returns {boolean} True if the node is a block element.
       */
      function isBlock(node) {
        return blockElements[node.name];
      }

      /**
       * Checks if a node lies at the start or end edge of its block parent.
       * Helpful for trimming whitespace at block boundaries.
       * @param {tinymce.html.Node} node - Node to evaluate.
       * @param {boolean} start - True to test start edge, false for end edge.
       * @param {tinymce.html.Node} root - Root context node.
       * @returns {boolean} True if node is at specified edge of block.
       */
      function isAtEdgeOfBlock(node, start, root) {
        var neighbour = start ? node.prev : node.next;

        if (neighbour || !node.parent) {
          return false;
        }

        return isBlock(node.parent) && (node.parent !== root || args.isRootContent === true);
      }

      /**
       * Identifies line-break candidates: next to a block boundary or a <br> tag.
       * @param {tinymce.html.Node} node - Node to test.
       * @param {Function} isBlockFn - Function to determine block nodes.
       * @returns {boolean} True if node acts as a line break.
       */
      function walkTree(root, preprocessors, postprocessors) {
        var traverseOrder = [];
        var node = root, lastNode = root;

        while (node) {
          var tempNode = node;

          for (var i = 0; i < preprocessors.length; i++) {
            preprocessors[i](tempNode);
          }

          if ((!tempNode.parent) && tempNode !== root) {
            node = lastNode;
          } else {
            traverseOrder.push(tempNode);
          }

          lastNode = node;
          node = node.walk();
        }

        for (var i = traverseOrder.length - 1; i >= 0; i--) {
          var postNode = traverseOrder[i];
          for (var j = 0; j < postprocessors.length; j++) {
            postprocessors[j](postNode);
          }
        }
      }

      /**
       * Pads an empty node: inserts <br> for blocks or a non-breaking space for inline.
       * @param {tinymce.html.Node} node - The empty node to pad or replace.
       */
      function paddEmptyNode(node) {
        var brPreferred = settings.pad_empty_with_br || args.insert;

        if (brPreferred && isBlock(node)) {
          var newNode = new Node('br', 1);

          if (args.insert) {
            newNode.attr('data-mce-bogus', '1');
          }

          node.empty().append(newNode);
        } else {
          var nbspNode = new Node('#text', 3);
          nbspNode.value = NBSP;
          node.empty().append(nbspNode);
        }
      }

      /**
       * Checks if node has exactly one child of given name.
       * @param {tinymce.html.Node} node - Node to inspect.
       * @param {string} name - Child node name to match.
       * @returns {boolean} True if only child matches name.
       */
      function hasOnlyChild(node, name) {
        var firstChild = node.firstChild;
        return firstChild && firstChild === node.lastChild && firstChild.name === name;
      }

      /**
       * Detects if a node contains a single non-breaking space as its child.
       * @param {tinymce.html.Node} node - Node to inspect.
       * @returns {boolean} True if node is padded with &nbsp; only.
       */
      function isPaddedWithNbsp(node) {
        return hasOnlyChild(node, '#text') && node.firstChild && node.firstChild.value === NBSP;
      }

      /**
       * Determines if a node is a line break node.
       * @param {tinymce.html.Node} node - Node to inspect.
       * @param {boolean} isBlock - Function to check if a node is block-level. 
       * @returns {boolean} True if node is a line break or <br>.
       */
      function isLineBreakNode(node, isBlock) {
        return node && (isBlock(node) || node.name === 'br');
      }

      /**
       * Determines if a node is empty according to schema rules.
       * @param {tinymce.html.Node} node - Node to inspect.
       * @returns {boolean} True if node is empty.
       */
      function isEmpty(node) {
        return node.isEmpty(nonEmptyElements);
      }

      /**
       * Creates pre- and post-processors to normalize whitespace in text nodes.
       * Removes redundant spaces and pads/unwraps empty inline and block elements as needed.
       *
       * @param {Node} root - The root node of the parsed document.
       * @return {[Function, Function]} Array containing preprocessor and postprocessor functions.
       */
      function whitespaceCleaner(root) {

        function preprocess(node) {
          if (node.type === 3) {
            if (!hasWhitespaceParent(node)) {
              var text = node.value || '';
              text = text.replace(allWhiteSpaceRegExp, ' ');

              if (isLineBreakNode(node.prev, isBlock) || isAtEdgeOfBlock(node, true, root)) {
                text = text.replace(startWhiteSpaceRegExp, '');
              }

              if (text.length === 0) {
                node.remove();
              } else {
                node.value = text;
              }
            }
          }
        }

        function postprocess(node) {
          if (node.type === 1) {
            var elementRule = schema.getElementRule(node.name);
            if (validate && elementRule) {
              var isNodeEmpty = isEmpty(node);

              if (elementRule.paddInEmptyBlock && isNodeEmpty && isTextRootBlockEmpty(node)) {
                paddEmptyNode(node);
              } else if (elementRule.removeEmpty && isNodeEmpty) {
                if (isBlock(node)) {
                  node.remove();
                } else {
                  node.unwrap();
                }
              } else if (elementRule.paddEmpty && (isNodeEmpty || isPaddedWithNbsp(node))) {
                paddEmptyNode(node);
              }
            }
          } else if (node.type === 3) {
            if (!hasWhitespaceParent(node)) {
              var text = node.value || '';

              if ((node.next && isBlock(node.next)) || isAtEdgeOfBlock(node, false)) {
                text = text.replace(endWhiteSpaceRegExp, '');
              }

              if (text.length === 0) {
                node.remove();
              } else {
                node.value = text;
              }
            }
          }
        }

        return [preprocess, postprocess];
      }

      const DomParser = new DOMParser();

      settings.purify_html = false;

      /**
       * Sanitizes the body element using DomPurify if configured.
       * @param {Element} body - The body element to sanitize.
       * @returns {Element} Sanitized body element.
       */
      function sanitize(body) {
        
        function isValidNode(node) {
          if (node.tagName === 'body' || node.nodeType !== 1) {
                return true;
            }

            if (schema.isValid(node.tagName)) {
                return true;
            }

            return false;
        }

        function filterAttributes(node) {
          var attributes = node.attributes;
          var attrName, attrValue;

          for (var i = attributes.length - 1; i >= 0; i--) {
            attrName = attributes[i].name.toLowerCase();
            attrValue = attributes[i].value;

            // Allow all data-*, aria-*, uk-*, etc.
            if (/-/.test(attrName)) {
              continue;
            }

            // Allow on* if permitted in settings
            if (settings.allow_event_attributes && /^on[a-z]+/i.test(attrName)) {
              continue;
            }

            // Check if the attribute is valid according to the schema
            if (!schema.isValid(node.tagName, attrName)) {
              node.removeAttribute(attrName);
            }
          }
        }
        
        if (settings.purify_html) {
          return self.purifier.purify(body);
        } else {
          var nodeIterator = document.createNodeIterator(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT);

          var node;

          while ((node = nodeIterator.nextNode())) {
            if (!isValidNode(node)) {
              node.parentNode && node.parentNode.removeChild(node);
              continue;
            }
            
            if (node.nodeType == 1) {
              filterAttributes(node);
            }
          }

          return body;
        }
      }

      /**
       * Parses and sanitizes an HTML fragment in its proper context.
       *
       * 1. Wraps the raw `html` string in a temporary root element (<body> or
       *    a special element defined by the schema) so that fragments like
       *    `<tr>…</tr>` parse correctly.
       * 2. Uses the native DOMParser (with the correct MIME type for `format`)
       *    to turn that string into a real DOM tree.
       * 3. Passes the resulting `<body>` element through DomPurify to strip
       *    unsafe tags/attributes.
       * 4. Returns either the sanitized body or, if it was a “special” root,
       *    the first child of that body (so you get back the wrapper element).
       *
       * @param {String} html     - The raw HTML to parse.
       * @param {String} rootName - Tag to use as the fragment root (e.g. 'table', 'tr').
       * @param {String} format   - Either 'html' or 'xhtml', which picks the parsing MIME type.
       * @return {Element}        - The sanitized DOM element (body or its firstChild).
       */
      function parseAndSanitizeWithContext(html, rootName, format) {
        var mimeType = format === 'xhtml' ? 'application/xhtml+xml' : 'text/html';

        var specialElements = schema.getSpecialElements();

        // Determine the root element to wrap the HTML in when parsing. If we're dealing with a
        // special element then we need to wrap it so the internal content is handled appropriately.
        var isSpecialRoot = specialElements[rootName.toLowerCase()] ? true : false;

        var content = isSpecialRoot ? `<${rootName}>${html}</${rootName}>` : html;

        // If parsing XHTML then the content must contain the xmlns declaration, see https://www.w3.org/TR/xhtml1/normative.html#strict
        var wrappedHtml = format === 'xhtml' ? `<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>${content}</body></html>` : `<body>${content}</body>`;

        var body = DomParser.parseFromString(wrappedHtml, mimeType).body;

        // sanitize the body content with DomPurify
        body = sanitize(body, mimeType);

        return isSpecialRoot ? body.firstChild : body;
      }

      /**
       * Transfers children from a native DOM element to a TinyMCE Node tree,
       * optionally skipping over disallowed attributes and handling special cases.
       *
       * @param {Node} parent - The TinyMCE Node to populate.
       * @param {Element} nativeParent - The native browser DOM element.
       * @param {Object} specialElements - A map of element names considered special (e.g., script, textarea).
       */
      function transferChildren(parent, nativeParent, specialElements) {
        var parentName = parent.name;

        // Exclude the special elements where the content is RCDATA as their content needs to be parsed instead of being left as plain text
        // See: https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
        var isSpecial = parentName in specialElements && parentName !== 'title' && parentName !== 'textarea';

        var childNodes = nativeParent.childNodes;

        for (var ni = 0, nl = childNodes.length; ni < nl; ni++) {
          var nativeChild = childNodes[ni], nodeType = nativeChild.nodeType, nodeName = nativeChild.nodeName.toLowerCase();

          if (nodeType == 1) { // ELEMENT_NODE
            var attributes = nativeChild.attributes;

            var newNode, elementRule;

            elementRule = validate ? schema.getElementRule(nodeName) : {};

            if (elementRule) {
              newNode = new Node(nodeName, nodeType);

              for (var ai = 0, al = attributes.length; ai < al; ai++) {
                var attr = attributes[ai];

                // Skip event attributes
                if (!settings.allow_event_attributes && /^on[a-z]+/i.test(attr.name)) {
                  continue;
                }

                newNode.attr(attr.name, attr.value);
              }
            }
          }

          if (nodeType == 3) { // TEXT_NODE
            newNode = new Node('#text', nodeType);

            newNode.value = nativeChild.data;

            if (isSpecial) {
              newNode.raw = true;
            }
          }

          if (nodeType == 8 || nodeType == 4 || nodeType == 7) { // COMMENT_NODE, CDATA_SECTION_NODE, PROCESSING_INSTRUCTION_NODE
            newNode = new Node(nodeName, nodeType);

            var value = nativeChild.data;

            if (nodeType == 8) { // COMMENT_NODE
              // If conditional comments are not allowed then prefix with a space
              if (!settings.allow_conditional_comments && value.toLowerCase().indexOf('[if') === 0) {
                value = ' ' + value;
              }
            }

            newNode.value = value;
          }

          if (newNode) {
            transferChildren(newNode, nativeChild, specialElements);
            parent.append(newNode);
          }
        }
      }

      /**
       * Wraps consecutive inline or text nodes into forced block elements.
       * Ensures top-level content is enclosed in the configured root block (e.g., <p>).
       * Trims leading and trailing whitespace within each created block for cleanliness.
       *
       * @method addRootBlocks
       * @private
       */
      function addRootBlocks() {
        var node = rootNode.firstChild,
          next, rootBlockNode;

        // Removes whitespace at beginning and end of block so:
        // <p> x </p> -> <p>x</p>
        function trim(rootBlockNode) {
          if (rootBlockNode) {
            node = rootBlockNode.firstChild;
            if (node && node.type == 3) {
              node.value = node.value.replace(startWhiteSpaceRegExp, '');
            }

            node = rootBlockNode.lastChild;
            if (node && node.type == 3) {
              node.value = node.value.replace(endWhiteSpaceRegExp, '');
            }
          }
        }

        // Check if rootBlock is valid within rootNode for example if P is valid in H1 if H1 is the contentEditabe root
        if (!schema.isValidChild(rootNode.name, rootBlockName.toLowerCase())) {
          return;
        }

        while (node) {
          next = node.next;

          if ((node.type == 3 && tinymce.trim(node.value)) || (node.type == 1 && node.name !== 'p' && !blockElements[node.name] && !node.attr('data-mce-type'))) {
            if (!rootBlockNode) {
              // Create a new root block element
              rootBlockNode = new Node(rootBlockName, 1);
              rootBlockNode.attr(settings.forced_root_block_attrs);
              rootNode.insert(rootBlockNode, node);
              rootBlockNode.append(node);
            } else {
              rootBlockNode.append(node);
            }
          } else {
            trim(rootBlockNode);
            rootBlockNode = null;
          }

          node = next;
        }

        trim(rootBlockNode);
      }

      var element = parseAndSanitizeWithContext(html, settings.root_name, settings.format);

      rootNode = new Node(args.context || settings.root_name, 11);

      transferChildren(rootNode, element, schema.getSpecialElements());

      // empty element to prevent memory leak
      element.innerHTML = '';

      // Run whitespace and filter passes
      var [whitespacePre, whitespacePost] = whitespaceCleaner(rootNode);

      var invalidFinder = validate ? function (node) {
        findInvalidChildren(node, invalidChildren);
      } : function () { };

      var matches = { nodes: {}, attributes: {} };

      var matchFinder = function (node) {
        FilterNode.matchNode(nodeFilters, attributeFilters, node, matches);
      };

      walkTree(rootNode, [whitespacePre, matchFinder], [whitespacePost, invalidFinder]);

      // Reverse collected invalid children for bottom-up cleanup
      invalidChildren.reverse();

      // Fix invalid children or report invalid children in a contextual parsing
      if (validate && invalidChildren.length) {
        if (!args.context) {
          fixInvalidChildren(invalidChildren);
        } else {
          args.invalid = true;
        }
      }

      // Wrap nodes in the root into block elements if the root is body
      if (rootBlockName && (rootNode.name == 'body' || args.isRootContent)) {
        addRootBlocks();
      }

      // Run filters only when the contents is valid
      if (!args.invalid) {
        runFilters(matches, args);
      }

      return rootNode;
    };

    // Remove <br> at end of block elements Gecko and WebKit injects BR elements to
    // make it possible to place the caret inside empty blocks. This logic tries to remove
    // these elements and keep br elements that where intended to be there intact
    if (settings.remove_trailing_brs) {
      self.addNodeFilter('br', function (nodes) {
        var i, l = nodes.length,
          node, blockElements = extend({}, schema.getBlockElements());
        var nonEmptyElements = schema.getNonEmptyElements(),
          parent, lastParent, prev, prevName;
        var textNode, elementRule;

        // Remove brs from body element as well
        blockElements.body = 1;

        // Must loop forwards since it will otherwise remove all brs in <p>a<br><br><br></p>
        for (i = 0; i < l; i++) {
          node = nodes[i];
          parent = node.parent;

          if (blockElements[node.parent.name] && node === parent.lastChild) {
            // Loop all nodes to the left of the current node and check for other BR elements
            // excluding bookmarks since they are invisible
            prev = node.prev;
            while (prev) {
              prevName = prev.name;

              // Ignore bookmarks
              if (prevName !== "span" || prev.attr('data-mce-type') !== 'bookmark') {
                // Found a non BR element
                if (prevName !== "br") {
                  break;
                }

                // Found another br it's a <br><br> structure then don't remove anything
                if (prevName === 'br') {
                  node = null;
                  break;
                }
              }

              prev = prev.prev;
            }

            if (node) {

              // skip breaks with attributes
              if (node.attributes.length && node.attributes[0].name !== 'data-mce-bogus') {
                continue;
              }

              node.remove();

              // Is the parent to be considered empty after we removed the BR
              if (parent.isEmpty(nonEmptyElements)) {
                elementRule = schema.getElementRule(parent.name);

                // Remove or padd the element depending on schema rule
                if (elementRule) {
                  if (elementRule.removeEmpty) {
                    parent.remove();
                  } else if (elementRule.paddEmpty) {
                    parent.empty().append(new Node('#text', 3)).value = '\u00a0';
                  }
                }
              }
            }
          } else {
            // Replaces BR elements inside inline elements like <p><b><i><br></i></b></p>
            // so they become <p><b><i>&nbsp;</i></b></p>
            lastParent = node;
            while (parent && parent.firstChild === lastParent && parent.lastChild === lastParent) {
              lastParent = parent;

              if (blockElements[parent.name]) {
                break;
              }

              parent = parent.parent;
            }

            if (lastParent === parent) {
              textNode = new Node('#text', 3);
              textNode.value = '\u00a0';
              node.replace(textNode);
            }
          }
        }
      });
    }

    self.addAttributeFilter('href', function (nodes) {
      var i = nodes.length,
        node;

      var appendRel = function (rel) {
        var parts = rel.split(' ').filter(function (p) {
          return p.length > 0;
        });
        return parts.concat(['noopener']).sort().join(' ');
      };

      var addNoOpener = function (rel) {
        var newRel = rel ? tinymce.trim(rel) : '';
        if (!/\b(noopener)\b/g.test(newRel)) {
          return appendRel(newRel);
        } else {
          return newRel;
        }
      };

      if (!settings.allow_unsafe_link_target) {
        while (i--) {
          node = nodes[i];
          if (node.name === 'a' && node.attr('target') === '_blank' && /:\/\//.test(node.attr('href'))) {
            node.attr('rel', addNoOpener(node.attr('rel')));
          }
        }
      }
    });

    // Force anchor names closed, unless the setting "allow_html_in_named_anchor" is explicitly included.
    if (!settings.allow_html_in_named_anchor) {
      self.addAttributeFilter('id,name', function (nodes) {
        var i = nodes.length,
          sibling, prevSibling, parent, node;

        while (i--) {
          node = nodes[i];
          if (node.name === 'a' && node.firstChild && !node.attr('href')) {
            parent = node.parent;

            // Move children after current node
            sibling = node.lastChild;
            do {
              prevSibling = sibling.prev;
              parent.insert(sibling, node);
              sibling = prevSibling;
            } while (sibling);
          }
        }
      });
    }

    if (settings.validate && schema.getValidClasses()) {
      self.addAttributeFilter('class', function (nodes) {
        var i = nodes.length,
          node, classList, ci, className, classValue;
        var validClasses = schema.getValidClasses(),
          validClassesMap, valid;

        while (i--) {
          node = nodes[i];
          classList = node.attr('class').split(' ');
          classValue = '';

          for (ci = 0; ci < classList.length; ci++) {
            className = classList[ci];
            valid = false;

            validClassesMap = validClasses['*'];

            if (validClassesMap && validClassesMap[className]) {
              valid = true;
            }

            validClassesMap = validClasses[node.name];

            if (!valid && validClassesMap && validClassesMap[className]) {
              valid = true;
            }

            if (valid) {
              if (classValue) {
                classValue += ' ';
              }

              classValue += className;
            }
          }

          if (!classValue.length) {
            classValue = null;
          }

          node.attr('class', classValue);
        }
      });
    }
  };
})(tinymce);