// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will write out Closure's deps file, unless the
 * global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects to
 * include their own deps file(s) from different locations.
 *
 */


/**
 * @define {boolean} Overridden to true by the compiler when --closure_pass
 *     or --mark_as_compiled is specified.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is
 * already defined in the current scope before assigning to prevent
 * clobbering if base.js is loaded more than once.
 *
 * @const
 */
var goog = goog || {}; // Identifies this file as the Closure base.


/**
 * @define {boolean}
 */
goog.NODE_JS = true;


// eval() is used so that "global" does not need to be an extern.
goog.global = goog.NODE_JS ? eval('global') : this;


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define goog.DEBUG=false to the JSCompiler. For example, most
 * toString() methods should be declared inside an "if (goog.DEBUG)" conditional
 * because they are generally used for debugging purposes and it is difficult
 * for the JSCompiler to statically determine whether they are used.
 */
goog.DEBUG = true;


/**
 * Creates object stubs for a namespace.  The presence of one or more
 * goog.provide() calls indicate that the file defines the given
 * objects/namespaces.  Build tools also scan for provide/require statements
 * to discern dependencies, build dependency files (see deps.js), etc.
 * @see goog.require
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 */
goog.provide = function(name) {
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice. This is intended
    // to teach new developers that 'goog.provide' is effectively a variable
    // declaration. And when JSCompiler transforms goog.provide into a real
    // variable declaration, the compiled JS should work the same as the raw
    // JS--even when the raw JS uses goog.provide incorrectly.
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name);
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (COMPILED && !goog.DEBUG) {
    opt_message = opt_message || '';
    throw Error('Importing test-only code into non-debug environment' +
                opt_message ? ': ' + opt_message : '.');
  }
};


if (!COMPILED) {

  /**
   * Check if the given name has been goog.provided. This will return false for
   * names that are available only as implicit namespaces.
   * @param {string} name name of the object to look for.
   * @return {boolean} Whether the name has been provided.
   * @private
   */
  goog.isProvided_ = function(name) {
    return !goog.implicitNamespaces_[name] && !!goog.getObjectByName(name);
  };

  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares
   * that 'goog' and 'goog.events' must be namespaces.
   *
   * @type {Object}
   * @private
   */
  goog.implicitNamespaces_ = {};
}


/**
 * Used in the context of Node JS to determine whether the argument is an
 * existing variable in the global namespace, or if it should be added as a
 * property of goog.global in order to create it.
 *
 * @param {string} goog The namespace to test. This is deliberately named "goog"
 *     rather than "nameSpace" or something more appropriate because the goal is
 *     to avoid introducing any new variables into the scope of the function
 *     that would alter the behavior of eval().
 *
 *     Because it is known that "goog" is an existing global variable, shadowing
 *     it with a local variable here does not introduce a new variable in the
 *     scope of this function. Further, it is known that when the local variable
 *     goog is the value 'goog', this function should always return true, which
 *     it does.
 *
 *     Ideally, this function would not declare any arguments and would simply
 *     reference arguments[0], but that yields a WRONG_ARGUMENT_COUNT warning
 *     at the call sites of goog.isExistingGlobalVariable_() from the Closure
 *     Compiler when type-checking is enabled.
 * @return {boolean}
 * @private
 */
goog.isExistingGlobalVariable_ = function(goog) {
  // Note that if the variable is declared globally with "var" but is undefined,
  // then this function will return a false negative.
  // Similarly, if goog is 'arguments', 'parseInt', or any other member that is
  // in scope, it will return a false positive.
  return String(eval('typeof ' + goog)) !== 'undefined';
};


/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  if (goog.NODE_JS && cur === goog.global) {
    // If parts[0] is already a variable global scope such as "goog", then do
    // not access it from goog.global because then there will be a global
    // variable "goog" as well as a "global.goog", and they will be different
    // objects, causing all sorts of problems.
    if (goog.isExistingGlobalVariable_(parts[0])) {
      cur = eval(parts[0]);
      parts.shift();
    }
  }

  // Certain browsers cannot parse code in the form for((a in b); c;);
  // This pattern is produced by the JSCompiler when it collapses the
  // statement above into the conditional loop below. To prevent this from
  // happening, use a for-loop and reserve the init logic as below.

  // Parentheses added to eliminate strict JS warning in Firefox.
  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {?} The value (object or primitive) or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;

  if (goog.NODE_JS && cur === goog.global) {
    // If parts[0] is already a variable global scope such as "goog", then do
    // not access it from goog.global because then there will be a global
    // variable "goog" as well as a "global.goog", and they will be different
    // objects, causing all sorts of problems.
    if (goog.isExistingGlobalVariable_(parts[0])) {
      cur = eval(parts[0]);
      parts.shift();
    }
  }

  for (var part; part = parts.shift(); ) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {Object} obj The namespace to globalize.
 * @param {Object=} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = goog.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};




// NOTE(nnaze): The debug DOM loader was included in base.js as an orignal
// way to do "debug-mode" development.  The dependency system can sometimes
// be confusing, as can the debug DOM loader's asyncronous nature.
//
// With the DOM loader, a call to goog.require() is not blocking -- the
// script will not load until some point after the current script.  If a
// namespace is needed at runtime, it needs to be defined in a previous
// script, or loaded via require() with its registered dependencies.
// User-defined namespaces may need their own deps file.  See http://go/js_deps,
// http://go/genjsdeps, or, externally, DepsWriter.
// http://code.google.com/closure/library/docs/depswriter.html
//
// Because of legacy clients, the DOM loader can't be easily removed from
// base.js.  Work is being done to make it disableable or replaceable for
// different environments (DOM-less JavaScript interpreters like Rhino or V8,
// for example). See bootstrap/ for more information.


/**
 * @define {boolean} Whether to enable the debug loader.
 *
 * If enabled, a call to goog.require() will attempt to load the namespace by
 * appending a script tag to the DOM (if the namespace has been registered).
 *
 * If disabled, goog.require() will simply assert that the namespace has been
 * provided (and depend on the fact that some outside tool correctly ordered
 * the script).
 */
goog.ENABLE_DEBUG_LOADER = true;


/**
 * Implements a system for the dynamic resolution of dependencies
 * that works in parallel with the BUILD system. Note that all calls
 * to goog.require will be stripped by the JSCompiler when the
 * --closure_pass option is used.
 * @see goog.provide
 * @param {string} name Namespace to include (as was given in goog.provide())
 *     in the form "goog.package.part".
 */
goog.require = function(name) {

  // if the object already exists we do not need do do anything
  // TODO(arv): If we start to support require based on file name this has
  //            to change
  // TODO(arv): If we allow goog.foo.* this has to change
  // TODO(arv): If we implement dynamic load after page load we should probably
  //            not remove this code for the compiled output
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      return;
    }

    if (goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if (path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return;
      }
    }

    var errorMessage = 'goog.require could not find: ' + name;
    if (goog.global.console) {
      goog.global.console['error'](errorMessage);
    }


      throw Error(errorMessage);

  }
};


/**
 * Path for included scripts
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to write out Closure's deps file. By default,
 * the deps are written.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The function is passed the script source, which is a relative URI. It should
 * return true if the script was imported, false otherwise.
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 */
goog.nullFunction = function() {};


/**
 * The identity function. Returns its first argument.
 *
 * @param {...*} var_args The arguments of the function.
 * @return {*} The first argument.
 * @deprecated Use goog.functions.identity instead.
 */
goog.identityFunction = function(var_args) {
  return arguments[0];
};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 *
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error
 * will be thrown when bar() is invoked.
 *
 * Note: This does not take the name of the function to override as
 * an argument because that would make it more difficult to obfuscate
 * our JavaScript code.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be
 *   overridden.
 */
goog.abstractMethod = function() {
  throw Error('unimplemented abstract method');
};


/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 */
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor());
  };
};


if (!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  /**
   * Object used to keep track of urls that have already been added. This
   * record allows the prevention of circular dependencies.
   * @type {Object}
   * @private
   */
  goog.included_ = {};


  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  goog.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    // used when resolving dependencies to prevent us from
    // visiting the file twice
    visited: {},
    written: {} // used to keep track of script files we have written
  };


  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != 'undefined' &&
           'write' in doc;  // XULDocument misses write.
  };


  /**
   * Tries to detect the base path of the base.js script that bootstraps Closure
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName('script');
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };


  /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
        goog.writeScriptTag_;
    if (!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true;
    }
  };


  /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script source.
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.writeScriptTag_ = function(src) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write(
          '<script type="text/javascript" src="' + src + '"></' + 'script>');
      return true;
    } else {
      return false;
    }
  };


  /**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls importScript_ in the correct order.
   * @private
   */
  goog.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          // If the required name is defined, we assume that it was already
          // bootstrapped by other means.
          if (!goog.isProvided_(requireName)) {
            if (requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName]);
            } else {
              throw Error('Undefined nameToPath for ' + requireName);
            }
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };

  goog.findBasePath_();

  // Allow projects to manage the deps files themselves.
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + 'deps.js');
  }
}



//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // Check these first, so we can avoid calling Object.prototype.toString if
      // possible.
      //
      // IE improperly marshals tyepof across execution contexts, but a
      // cross-context object will still return false for "instanceof Object".
      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }

      // HACK: In order to use an Object prototype method on the arbitrary
      //   value, the compiler requires the value be cast to type Object,
      //   even though the ECMA spec explicitly allows it.
      var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
      // In Firefox 3.6, attempting to access iframe window objects' length
      // property throws an NS_ERROR_FAILURE, so we need to special-case it
      // here.
      if (className == '[object Window]') {
        return 'object';
      }

      // We cannot always use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if ((className == '[object Array]' ||
           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if ((className == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox
    // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
    // and RegExps.  We would like to return object for those and we can
    // detect an invalid function by making sure that the function
    // object has a call method.
    return 'object';
  }
  return s;
};


/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.  Additionally, this function assumes that the global
 * undefined variable has not been redefined.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  return val !== undefined;
};


/**
 * Returns true if the specified value is |null|
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  // Note that undefined == null.
  return val != null;
};


/**
 * Returns true if the specified value is an array
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like
 * the value needs to be an object and have a getFullYear() function.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a string
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Returns true if the specified value is a function
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays
 * and functions.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = typeof val;
  return type == 'object' && val != null || type == 'function';
  // return Object(val) === val also works, but is slower, especially if val is
  // not an object.
};


/**
 * Gets a unique ID for an object. This mutates the object so that further
 * calls with the same object as a parameter returns the same value. The unique
 * ID is guaranteed to be unique across the current session amongst objects that
 * are passed into {@code getUid}. There is no guarantee that the ID is unique
 * or consistent across sessions. It is unsafe to generate unique ID for
 * function prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using {@code goog.getUid} in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure javascript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' +
    Math.floor(Math.random() * 2147483648).toString(36);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 * @deprecated Use goog.getUid instead.
 */
goog.getHashCode = goog.getUid;


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 * @deprecated Use goog.removeUid instead.
 */
goog.removeHashCode = goog.removeUid;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * Forward declaration for the clone method. This is necessary until the
 * compiler can better support duck-typing constructs as used in
 * goog.cloneObject.
 *
 * TODO(brenneman): Remove once the JSCompiler can infer that the check for
 * proto.clone is safe in goog.cloneObject.
 *
 * @type {Function}
 */
Object.prototype.clone;


/**
 * A native implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 * @suppress {deprecated} The compiler thinks that Function.prototype.bind
 *     is deprecated because some people have declared a pure-JS version.
 *     Only the pure-JS version is truly deprecated.
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error();
  }

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };

  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of |this| 'pre-specified'.<br><br>
 *
 * Remaining arguments specified at call-time are appended to the pre-
 * specified ones.<br><br>
 *
 * Also see: {@link #partial}.<br><br>
 *
 * Usage:
 * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @suppress {deprecated} See above.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default
      // Chrome extension environment. This means that for Chrome extensions,
      // they get the implementation of Function.prototype.bind that
      // calls goog.bind instead of the native one. Even worse, we don't want
      // to introduce a circular dependency between goog.bind and
      // Function.prototype.bind, so we have to hack this to make sure it
      // works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like bind(), except that a 'this object' is not required. Useful when the
 * target function is already bound.
 *
 * Usage:
 * var g = partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to fn.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Prepend the bound arguments to the current arguments.
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 * @param {Object} target Target.
 * @param {Object} source Source.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = Date.now || (function() {
  // Unary plus operator converts its operand to a number which in the case of
  // a date is done by calling getTime().
  return +new Date();
});


/**
 * Evals javascript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      goog.global.eval('var _et_ = 1;');
      if (typeof goog.global['_et_'] != 'undefined') {
        delete goog.global['_et_'];
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      var doc = goog.global.document;
      var scriptElt = doc.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(user): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.body.appendChild(scriptElt);
      doc.body.removeChild(scriptElt);
    }
  } else {
    throw Error('goog.globalEval not available');
  }
};


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {?boolean}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @type {Object|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a
 * hyphen and passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which
 * these mappings are used. In the BY_PART style, each part (i.e. in
 * between hyphens) of the passed in css name is rewritten according
 * to the map. In the BY_WHOLE style, the full css name is looked up in
 * the map directly. If a rewrite is not specified by the map, the
 * compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls
 * to goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x= 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed
 * only the modifier will be processed, as it is assumed the first
 * argument was generated as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == 'BY_WHOLE' ?
        getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  if (opt_modifier) {
    return className + '-' + rename(opt_modifier);
  } else {
    return rename(className);
  }
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --closure_pass flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} opt_style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};


/**
 * To use CSS renaming in compiled mode, one of the input files should have a
 * call to goog.setCssNameMapping() with an object literal that the JSCompiler
 * can extract and use to replace all calls to goog.getCssName(). In uncompiled
 * mode, JavaScript code should be loaded before this base.js file that declares
 * a global variable, CLOSURE_CSS_NAME_MAPPING, which is used below. This is
 * to ensure that the mapping is loaded before any calls to goog.getCssName()
 * are made in uncompiled mode.
 *
 * A hook for overriding the CSS name mapping.
 * @type {Object|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAPPING;


if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  // This does not call goog.setCssNameMapping() because the JSCompiler
  // requires that goog.setCssNameMapping() be called with an object literal.
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}


/**
 * Abstract implementation of goog.getMsg for use with localized messages.
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object=} opt_values Map of place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    var value = ('' + values[key]).replace(/\$/g, '$$$$');
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return str;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * goog.exportProperty
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. goog.exportSymbol('Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction',
 *                       Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   goog.base(this, a, b);
 * }
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};


/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * contructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass
 * the name of the method as the second argument to this function. If
 * you do not, you will get a runtime error. This calls the superclass'
 * method with arguments 2-N.
 *
 * This function only works if you use goog.inherits to express
 * inheritance relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the
 * compiler will do macro expansion to remove a lot of
 * the extra overhead that this function introduces. The compiler
 * will also enforce a lot of the assumptions that this function
 * makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 */
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (caller.superClass_) {
    // This is a constructor. Call the superclass constructor.
    return caller.superClass_.constructor.apply(
        me, Array.prototype.slice.call(arguments, 1));
  }

  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for (var ctor = me.constructor;
       ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }

  // If we did not find the caller in the prototype chain,
  // then one of two things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error(
        'goog.base called from a method of one name ' +
        'to a method of a different name');
  }
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the
 * aliases applied.  In uncompiled code the function is simply run since the
 * aliases as written are valid JavaScript.
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *    (e.g. "var Timer = goog.Timer").
 */
goog.scope = function(fn) {
  fn.call(goog.global);
};


goog.addDependency("/closure/goog/array/array.js", ["goog.array", "goog.array.ArrayLike"], ["goog.asserts"]);
goog.addDependency("/closure/goog/asserts/asserts.js", ["goog.asserts", "goog.asserts.AssertionError"], ["goog.debug.Error", "goog.string"]);
goog.addDependency("/closure/goog/async/conditionaldelay.js", ["goog.async.ConditionalDelay"], ["goog.Disposable", "goog.async.Delay"]);
goog.addDependency("/closure/goog/async/delay.js", ["goog.Delay", "goog.async.Delay"], ["goog.Disposable", "goog.Timer"]);
goog.addDependency("/closure/goog/async/throttle.js", ["goog.Throttle", "goog.async.Throttle"], ["goog.Disposable", "goog.Timer"]);
goog.addDependency("/closure/goog/base.js", [], []);
goog.addDependency("/closure/goog/bootstrap/webworkers.js", [], []);
goog.addDependency("/closure/goog/color/alpha.js", ["goog.color.alpha"], ["goog.color"]);
goog.addDependency("/closure/goog/color/color.js", ["goog.color"], ["goog.color.names", "goog.math"]);
goog.addDependency("/closure/goog/color/names.js", ["goog.color.names"], []);
goog.addDependency("/closure/goog/crypt/arc4.js", ["goog.crypt.Arc4"], ["goog.asserts"]);
goog.addDependency("/closure/goog/crypt/base64.js", ["goog.crypt.base64"], ["goog.crypt", "goog.userAgent"]);
goog.addDependency("/closure/goog/crypt/basen.js", ["goog.crypt.baseN"], []);
goog.addDependency("/closure/goog/crypt/blobhasher.js", ["goog.crypt.BlobHasher", "goog.crypt.BlobHasher.EventType"], ["goog.asserts", "goog.crypt", "goog.crypt.Hash", "goog.debug.Logger", "goog.events.EventTarget", "goog.fs"]);
goog.addDependency("/closure/goog/crypt/crypt.js", ["goog.crypt"], ["goog.array"]);
goog.addDependency("/closure/goog/crypt/hash.js", ["goog.crypt.Hash"], []);
goog.addDependency("/closure/goog/crypt/hash32.js", ["goog.crypt.hash32"], ["goog.crypt"]);
goog.addDependency("/closure/goog/crypt/hash_test.js", ["goog.crypt.hash_test"], ["goog.testing.asserts"]);
goog.addDependency("/closure/goog/crypt/hmac.js", ["goog.crypt.Hmac"], ["goog.asserts", "goog.crypt.Hash"]);
goog.addDependency("/closure/goog/crypt/md5.js", ["goog.crypt.Md5"], ["goog.crypt.Hash"]);
goog.addDependency("/closure/goog/crypt/sha1.js", ["goog.crypt.Sha1"], ["goog.crypt.Hash"]);
goog.addDependency("/closure/goog/cssom/cssom.js", ["goog.cssom", "goog.cssom.CssRuleType"], ["goog.array", "goog.dom"]);
goog.addDependency("/closure/goog/cssom/iframe/style.js", ["goog.cssom.iframe.style"], ["goog.cssom", "goog.dom", "goog.dom.NodeType", "goog.dom.classes", "goog.string", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/datasource/datamanager.js", ["goog.ds.DataManager"], ["goog.ds.BasicNodeList", "goog.ds.DataNode", "goog.ds.Expr", "goog.string", "goog.structs", "goog.structs.Map"]);
goog.addDependency("/closure/goog/datasource/datasource.js", ["goog.ds.BaseDataNode", "goog.ds.BasicNodeList", "goog.ds.DataNode", "goog.ds.DataNodeList", "goog.ds.EmptyNodeList", "goog.ds.LoadState", "goog.ds.SortedNodeList", "goog.ds.Util", "goog.ds.logger"], ["goog.array", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/datasource/expr.js", ["goog.ds.Expr"], ["goog.ds.BasicNodeList", "goog.ds.EmptyNodeList", "goog.string"]);
goog.addDependency("/closure/goog/datasource/fastdatanode.js", ["goog.ds.AbstractFastDataNode", "goog.ds.FastDataNode", "goog.ds.FastListNode", "goog.ds.PrimitiveFastDataNode"], ["goog.ds.DataManager", "goog.ds.EmptyNodeList", "goog.string"]);
goog.addDependency("/closure/goog/datasource/jsdatasource.js", ["goog.ds.JsDataSource", "goog.ds.JsPropertyDataSource"], ["goog.ds.BaseDataNode", "goog.ds.BasicNodeList", "goog.ds.DataManager", "goog.ds.EmptyNodeList", "goog.ds.LoadState"]);
goog.addDependency("/closure/goog/datasource/jsondatasource.js", ["goog.ds.JsonDataSource"], ["goog.Uri", "goog.dom", "goog.ds.DataManager", "goog.ds.JsDataSource", "goog.ds.LoadState", "goog.ds.logger"]);
goog.addDependency("/closure/goog/datasource/jsxmlhttpdatasource.js", ["goog.ds.JsXmlHttpDataSource"], ["goog.Uri", "goog.ds.DataManager", "goog.ds.FastDataNode", "goog.ds.LoadState", "goog.ds.logger", "goog.events", "goog.net.EventType", "goog.net.XhrIo"]);
goog.addDependency("/closure/goog/datasource/xmldatasource.js", ["goog.ds.XmlDataSource", "goog.ds.XmlHttpDataSource"], ["goog.Uri", "goog.dom.NodeType", "goog.dom.xml", "goog.ds.BasicNodeList", "goog.ds.DataManager", "goog.ds.LoadState", "goog.ds.logger", "goog.net.XhrIo", "goog.string"]);
goog.addDependency("/closure/goog/date/date.js", ["goog.date", "goog.date.Date", "goog.date.DateTime", "goog.date.Interval", "goog.date.month", "goog.date.weekDay"], ["goog.asserts", "goog.date.DateLike", "goog.i18n.DateTimeSymbols", "goog.string"]);
goog.addDependency("/closure/goog/date/datelike.js", ["goog.date.DateLike"], []);
goog.addDependency("/closure/goog/date/daterange.js", ["goog.date.DateRange", "goog.date.DateRange.Iterator", "goog.date.DateRange.StandardDateRangeKeys"], ["goog.date.Date", "goog.date.Interval", "goog.iter.Iterator", "goog.iter.StopIteration"]);
goog.addDependency("/closure/goog/date/relative.js", ["goog.date.relative"], ["goog.i18n.DateTimeFormat"]);
goog.addDependency("/closure/goog/date/utcdatetime.js", ["goog.date.UtcDateTime"], ["goog.date", "goog.date.Date", "goog.date.DateTime", "goog.date.Interval"]);
goog.addDependency("/closure/goog/db/db.js", ["goog.db"], ["goog.async.Deferred", "goog.db.Error", "goog.db.IndexedDb"]);
goog.addDependency("/closure/goog/db/error.js", ["goog.db.Error", "goog.db.Error.ErrorCode", "goog.db.Error.VersionChangeBlockedError"], ["goog.debug.Error"]);
goog.addDependency("/closure/goog/db/index.js", ["goog.db.Index"], ["goog.async.Deferred", "goog.db.Error", "goog.debug"]);
goog.addDependency("/closure/goog/db/indexeddb.js", ["goog.db.IndexedDb"], ["goog.async.Deferred", "goog.db.Error", "goog.db.Error.VersionChangeBlockedError", "goog.db.ObjectStore", "goog.db.Transaction", "goog.db.Transaction.TransactionMode"]);
goog.addDependency("/closure/goog/db/objectstore.js", ["goog.db.ObjectStore"], ["goog.async.Deferred", "goog.db.Error", "goog.db.Index", "goog.debug"]);
goog.addDependency("/closure/goog/db/transaction.js", ["goog.db.Transaction", "goog.db.Transaction.TransactionMode"], ["goog.db.Error", "goog.db.ObjectStore", "goog.events.EventHandler", "goog.events.EventTarget"]);
goog.addDependency("/closure/goog/debug/console.js", ["goog.debug.Console"], ["goog.debug.LogManager", "goog.debug.Logger.Level", "goog.debug.TextFormatter"]);
goog.addDependency("/closure/goog/debug/debug.js", ["goog.debug"], ["goog.array", "goog.string", "goog.structs.Set", "goog.userAgent"]);
goog.addDependency("/closure/goog/debug/debugwindow.js", ["goog.debug.DebugWindow"], ["goog.debug.HtmlFormatter", "goog.debug.LogManager", "goog.structs.CircularBuffer", "goog.userAgent"]);
goog.addDependency("/closure/goog/debug/devcss/devcss.js", ["goog.debug.DevCss", "goog.debug.DevCss.UserAgent"], ["goog.cssom", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/debug/devcss/devcssrunner.js", ["goog.debug.devCssRunner"], ["goog.debug.DevCss"]);
goog.addDependency("/closure/goog/debug/divconsole.js", ["goog.debug.DivConsole"], ["goog.debug.HtmlFormatter", "goog.debug.LogManager", "goog.style"]);
goog.addDependency("/closure/goog/debug/entrypointregistry.js", ["goog.debug.EntryPointMonitor", "goog.debug.entryPointRegistry"], ["goog.asserts"]);
goog.addDependency("/closure/goog/debug/error.js", ["goog.debug.Error"], []);
goog.addDependency("/closure/goog/debug/errorhandler.js", ["goog.debug.ErrorHandler", "goog.debug.ErrorHandler.ProtectedFunctionError"], ["goog.asserts", "goog.debug", "goog.debug.EntryPointMonitor", "goog.debug.Trace"]);
goog.addDependency("/closure/goog/debug/errorhandlerweakdep.js", ["goog.debug.errorHandlerWeakDep"], []);
goog.addDependency("/closure/goog/debug/errorreporter.js", ["goog.debug.ErrorReporter", "goog.debug.ErrorReporter.ExceptionEvent"], ["goog.debug", "goog.debug.ErrorHandler", "goog.debug.Logger", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.net.XhrIo", "goog.object", "goog.string", "goog.uri.utils"]);
goog.addDependency("/closure/goog/debug/fancywindow.js", ["goog.debug.FancyWindow"], ["goog.debug.DebugWindow", "goog.debug.LogManager", "goog.debug.Logger", "goog.debug.Logger.Level", "goog.dom.DomHelper", "goog.object", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/debug/formatter.js", ["goog.debug.Formatter", "goog.debug.HtmlFormatter", "goog.debug.TextFormatter"], ["goog.debug.RelativeTimeProvider", "goog.string"]);
goog.addDependency("/closure/goog/debug/fpsdisplay.js", ["goog.debug.FpsDisplay"], ["goog.asserts", "goog.fx.anim", "goog.ui.Component"]);
goog.addDependency("/closure/goog/debug/gcdiagnostics.js", ["goog.debug.GcDiagnostics"], ["goog.debug.Logger", "goog.debug.Trace", "goog.userAgent"]);
goog.addDependency("/closure/goog/debug/logbuffer.js", ["goog.debug.LogBuffer"], ["goog.asserts", "goog.debug.LogRecord"]);
goog.addDependency("/closure/goog/debug/logger.js", ["goog.debug.LogManager", "goog.debug.Logger", "goog.debug.Logger.Level"], ["goog.array", "goog.asserts", "goog.debug", "goog.debug.LogBuffer", "goog.debug.LogRecord"]);
goog.addDependency("/closure/goog/debug/logrecord.js", ["goog.debug.LogRecord"], []);
goog.addDependency("/closure/goog/debug/logrecordserializer.js", ["goog.debug.logRecordSerializer"], ["goog.debug.LogRecord", "goog.debug.Logger.Level", "goog.json", "goog.object"]);
goog.addDependency("/closure/goog/debug/reflect.js", ["goog.debug.reflect"], []);
goog.addDependency("/closure/goog/debug/relativetimeprovider.js", ["goog.debug.RelativeTimeProvider"], []);
goog.addDependency("/closure/goog/debug/tracer.js", ["goog.debug.Trace"], ["goog.array", "goog.debug.Logger", "goog.iter", "goog.structs.Map", "goog.structs.SimplePool"]);
goog.addDependency("/closure/goog/demos/autocompleteremotedata.js", [], []);
goog.addDependency("/closure/goog/demos/autocompleterichremotedata.js", [], []);
goog.addDependency("/closure/goog/demos/editor/equationeditor.js", ["goog.demos.editor.EquationEditor"], ["goog.ui.equation.EquationEditorDialog"]);
goog.addDependency("/closure/goog/demos/editor/helloworld.js", ["goog.demos.editor.HelloWorld"], ["goog.dom", "goog.dom.TagName", "goog.editor.Plugin"]);
goog.addDependency("/closure/goog/demos/editor/helloworlddialog.js", ["goog.demos.editor.HelloWorldDialog", "goog.demos.editor.HelloWorldDialog.OkEvent"], ["goog.dom.TagName", "goog.events.Event", "goog.string", "goog.ui.editor.AbstractDialog", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.AbstractDialog.EventType"]);
goog.addDependency("/closure/goog/demos/editor/helloworlddialogplugin.js", ["goog.demos.editor.HelloWorldDialogPlugin", "goog.demos.editor.HelloWorldDialogPlugin.Command"], ["goog.demos.editor.HelloWorldDialog", "goog.dom.TagName", "goog.editor.plugins.AbstractDialogPlugin", "goog.editor.range", "goog.functions", "goog.ui.editor.AbstractDialog.EventType"]);
goog.addDependency("/closure/goog/demos/graphics/tigerdata.js", [], []);
goog.addDependency("/closure/goog/demos/samplecomponent.js", ["goog.demos.SampleComponent"], ["goog.dom", "goog.dom.classes", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.ui.Component"]);
goog.addDependency("/closure/goog/demos/tree/testdata.js", [], []);
goog.addDependency("/closure/goog/demos/xpc/xpcdemo.js", [], ["goog.Uri", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.EventType", "goog.json", "goog.net.xpc.CrossPageChannel"]);
goog.addDependency("/closure/goog/disposable/disposable.js", ["goog.Disposable", "goog.dispose"], ["goog.disposable.IDisposable"]);
goog.addDependency("/closure/goog/disposable/idisposable.js", ["goog.disposable.IDisposable"], []);
goog.addDependency("/closure/goog/dom/a11y.js", ["goog.dom.a11y", "goog.dom.a11y.Announcer", "goog.dom.a11y.LivePriority", "goog.dom.a11y.Role", "goog.dom.a11y.State"], ["goog.Disposable", "goog.dom", "goog.object"]);
goog.addDependency("/closure/goog/dom/abstractmultirange.js", ["goog.dom.AbstractMultiRange"], ["goog.array", "goog.dom", "goog.dom.AbstractRange"]);
goog.addDependency("/closure/goog/dom/abstractrange.js", ["goog.dom.AbstractRange", "goog.dom.RangeIterator", "goog.dom.RangeType"], ["goog.dom", "goog.dom.NodeType", "goog.dom.SavedCaretRange", "goog.dom.TagIterator", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/annotate.js", ["goog.dom.annotate"], ["goog.array", "goog.dom", "goog.dom.NodeType", "goog.string"]);
goog.addDependency("/closure/goog/dom/browserfeature.js", ["goog.dom.BrowserFeature"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/dom/browserrange/abstractrange.js", ["goog.dom.browserrange.AbstractRange"], ["goog.dom", "goog.dom.NodeType", "goog.dom.RangeEndpoint", "goog.dom.TagName", "goog.dom.TextRangeIterator", "goog.iter", "goog.string", "goog.string.StringBuffer", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/browserrange/browserrange.js", ["goog.dom.browserrange", "goog.dom.browserrange.Error"], ["goog.dom", "goog.dom.browserrange.GeckoRange", "goog.dom.browserrange.IeRange", "goog.dom.browserrange.OperaRange", "goog.dom.browserrange.W3cRange", "goog.dom.browserrange.WebKitRange", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/browserrange/geckorange.js", ["goog.dom.browserrange.GeckoRange"], ["goog.dom.browserrange.W3cRange"]);
goog.addDependency("/closure/goog/dom/browserrange/ierange.js", ["goog.dom.browserrange.IeRange"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.dom.NodeIterator", "goog.dom.NodeType", "goog.dom.RangeEndpoint", "goog.dom.TagName", "goog.dom.browserrange.AbstractRange", "goog.iter", "goog.iter.StopIteration", "goog.string"]);
goog.addDependency("/closure/goog/dom/browserrange/operarange.js", ["goog.dom.browserrange.OperaRange"], ["goog.dom.browserrange.W3cRange"]);
goog.addDependency("/closure/goog/dom/browserrange/w3crange.js", ["goog.dom.browserrange.W3cRange"], ["goog.dom", "goog.dom.NodeType", "goog.dom.RangeEndpoint", "goog.dom.browserrange.AbstractRange", "goog.string"]);
goog.addDependency("/closure/goog/dom/browserrange/webkitrange.js", ["goog.dom.browserrange.WebKitRange"], ["goog.dom.RangeEndpoint", "goog.dom.browserrange.W3cRange", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/classes.js", ["goog.dom.classes"], ["goog.array"]);
goog.addDependency("/closure/goog/dom/controlrange.js", ["goog.dom.ControlRange", "goog.dom.ControlRangeIterator"], ["goog.array", "goog.dom", "goog.dom.AbstractMultiRange", "goog.dom.AbstractRange", "goog.dom.RangeIterator", "goog.dom.RangeType", "goog.dom.SavedRange", "goog.dom.TagWalkType", "goog.dom.TextRange", "goog.iter.StopIteration", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/dataset.js", ["goog.dom.dataset"], ["goog.string"]);
goog.addDependency("/closure/goog/dom/dom.js", ["goog.dom", "goog.dom.DomHelper", "goog.dom.NodeType"], ["goog.array", "goog.dom.BrowserFeature", "goog.dom.TagName", "goog.dom.classes", "goog.math.Coordinate", "goog.math.Size", "goog.object", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/dom_test.js", ["goog.dom.dom_test"], ["goog.dom", "goog.dom.DomHelper", "goog.dom.NodeType", "goog.dom.TagName", "goog.testing.asserts", "goog.userAgent", "goog.userAgent.product", "goog.userAgent.product.isVersion"]);
goog.addDependency("/closure/goog/dom/fontsizemonitor.js", ["goog.dom.FontSizeMonitor", "goog.dom.FontSizeMonitor.EventType"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/forms.js", ["goog.dom.forms"], ["goog.structs.Map"]);
goog.addDependency("/closure/goog/dom/iframe.js", ["goog.dom.iframe"], ["goog.dom"]);
goog.addDependency("/closure/goog/dom/iter.js", ["goog.dom.iter.AncestorIterator", "goog.dom.iter.ChildIterator", "goog.dom.iter.SiblingIterator"], ["goog.iter.Iterator", "goog.iter.StopIteration"]);
goog.addDependency("/closure/goog/dom/multirange.js", ["goog.dom.MultiRange", "goog.dom.MultiRangeIterator"], ["goog.array", "goog.debug.Logger", "goog.dom.AbstractMultiRange", "goog.dom.AbstractRange", "goog.dom.RangeIterator", "goog.dom.RangeType", "goog.dom.SavedRange", "goog.dom.TextRange", "goog.iter.StopIteration"]);
goog.addDependency("/closure/goog/dom/nodeiterator.js", ["goog.dom.NodeIterator"], ["goog.dom.TagIterator"]);
goog.addDependency("/closure/goog/dom/nodeoffset.js", ["goog.dom.NodeOffset"], ["goog.Disposable", "goog.dom.TagName"]);
goog.addDependency("/closure/goog/dom/pattern/abstractpattern.js", ["goog.dom.pattern.AbstractPattern"], ["goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/pattern/allchildren.js", ["goog.dom.pattern.AllChildren"], ["goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/pattern/callback/callback.js", ["goog.dom.pattern.callback"], ["goog.dom", "goog.dom.TagWalkType", "goog.iter"]);
goog.addDependency("/closure/goog/dom/pattern/callback/counter.js", ["goog.dom.pattern.callback.Counter"], []);
goog.addDependency("/closure/goog/dom/pattern/callback/test.js", ["goog.dom.pattern.callback.Test"], ["goog.iter.StopIteration"]);
goog.addDependency("/closure/goog/dom/pattern/childmatches.js", ["goog.dom.pattern.ChildMatches"], ["goog.dom.pattern.AllChildren", "goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/pattern/endtag.js", ["goog.dom.pattern.EndTag"], ["goog.dom.TagWalkType", "goog.dom.pattern.Tag"]);
goog.addDependency("/closure/goog/dom/pattern/fulltag.js", ["goog.dom.pattern.FullTag"], ["goog.dom.pattern.MatchType", "goog.dom.pattern.StartTag", "goog.dom.pattern.Tag"]);
goog.addDependency("/closure/goog/dom/pattern/matcher.js", ["goog.dom.pattern.Matcher"], ["goog.dom.TagIterator", "goog.dom.pattern.MatchType", "goog.iter"]);
goog.addDependency("/closure/goog/dom/pattern/nodetype.js", ["goog.dom.pattern.NodeType"], ["goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/pattern/pattern.js", ["goog.dom.pattern", "goog.dom.pattern.MatchType"], []);
goog.addDependency("/closure/goog/dom/pattern/repeat.js", ["goog.dom.pattern.Repeat"], ["goog.dom.NodeType", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/pattern/sequence.js", ["goog.dom.pattern.Sequence"], ["goog.dom.NodeType", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/pattern/starttag.js", ["goog.dom.pattern.StartTag"], ["goog.dom.TagWalkType", "goog.dom.pattern.Tag"]);
goog.addDependency("/closure/goog/dom/pattern/tag.js", ["goog.dom.pattern.Tag"], ["goog.dom.pattern", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType", "goog.object"]);
goog.addDependency("/closure/goog/dom/pattern/text.js", ["goog.dom.pattern.Text"], ["goog.dom.NodeType", "goog.dom.pattern", "goog.dom.pattern.AbstractPattern", "goog.dom.pattern.MatchType"]);
goog.addDependency("/closure/goog/dom/range.js", ["goog.dom.Range"], ["goog.dom", "goog.dom.AbstractRange", "goog.dom.ControlRange", "goog.dom.MultiRange", "goog.dom.NodeType", "goog.dom.TextRange", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/rangeendpoint.js", ["goog.dom.RangeEndpoint"], []);
goog.addDependency("/closure/goog/dom/savedcaretrange.js", ["goog.dom.SavedCaretRange"], ["goog.array", "goog.dom", "goog.dom.SavedRange", "goog.dom.TagName", "goog.string"]);
goog.addDependency("/closure/goog/dom/savedrange.js", ["goog.dom.SavedRange"], ["goog.Disposable", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/dom/selection.js", ["goog.dom.selection"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/tagiterator.js", ["goog.dom.TagIterator", "goog.dom.TagWalkType"], ["goog.dom.NodeType", "goog.iter.Iterator", "goog.iter.StopIteration"]);
goog.addDependency("/closure/goog/dom/tagname.js", ["goog.dom.TagName"], []);
goog.addDependency("/closure/goog/dom/textrange.js", ["goog.dom.TextRange"], ["goog.array", "goog.dom", "goog.dom.AbstractRange", "goog.dom.RangeType", "goog.dom.SavedRange", "goog.dom.TagName", "goog.dom.TextRangeIterator", "goog.dom.browserrange", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/textrangeiterator.js", ["goog.dom.TextRangeIterator"], ["goog.array", "goog.dom.NodeType", "goog.dom.RangeIterator", "goog.dom.TagName", "goog.iter.StopIteration"]);
goog.addDependency("/closure/goog/dom/viewportsizemonitor.js", ["goog.dom.ViewportSizeMonitor"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.math.Size", "goog.userAgent"]);
goog.addDependency("/closure/goog/dom/xml.js", ["goog.dom.xml"], ["goog.dom", "goog.dom.NodeType"]);
goog.addDependency("/closure/goog/editor/browserfeature.js", ["goog.editor.BrowserFeature"], ["goog.editor.defines", "goog.userAgent", "goog.userAgent.product", "goog.userAgent.product.isVersion"]);
goog.addDependency("/closure/goog/editor/clicktoeditwrapper.js", ["goog.editor.ClickToEditWrapper"], ["goog.Disposable", "goog.asserts", "goog.debug.Logger", "goog.dom", "goog.dom.Range", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Field.EventType", "goog.editor.range", "goog.events.BrowserEvent.MouseButton", "goog.events.EventHandler", "goog.events.EventType"]);
goog.addDependency("/closure/goog/editor/command.js", ["goog.editor.Command"], []);
goog.addDependency("/closure/goog/editor/defines.js", ["goog.editor.defines"], []);
goog.addDependency("/closure/goog/editor/field.js", ["goog.editor.Field", "goog.editor.Field.EventType"], ["goog.array", "goog.async.Delay", "goog.debug.Logger", "goog.dom", "goog.dom.Range", "goog.dom.TagName", "goog.dom.classes", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Plugin", "goog.editor.icontent", "goog.editor.icontent.FieldFormatInfo", "goog.editor.icontent.FieldStyleInfo", "goog.editor.node", "goog.editor.range", "goog.events", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.functions", "goog.string", "goog.string.Unicode", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/focus.js", ["goog.editor.focus"], ["goog.dom.selection"]);
goog.addDependency("/closure/goog/editor/icontent.js", ["goog.editor.icontent", "goog.editor.icontent.FieldFormatInfo", "goog.editor.icontent.FieldStyleInfo"], ["goog.editor.BrowserFeature", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/link.js", ["goog.editor.Link"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.node", "goog.editor.range", "goog.string", "goog.string.Unicode", "goog.uri.utils"]);
goog.addDependency("/closure/goog/editor/node.js", ["goog.editor.node"], ["goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.dom.iter.ChildIterator", "goog.dom.iter.SiblingIterator", "goog.iter", "goog.object", "goog.string", "goog.string.Unicode"]);
goog.addDependency("/closure/goog/editor/plugin.js", ["goog.editor.Plugin"], ["goog.debug.Logger", "goog.editor.Command", "goog.events.EventTarget", "goog.functions", "goog.object", "goog.reflect"]);
goog.addDependency("/closure/goog/editor/plugins/abstractbubbleplugin.js", ["goog.editor.plugins.AbstractBubblePlugin"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.TagName", "goog.editor.Plugin", "goog.editor.style", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.functions", "goog.string.Unicode", "goog.ui.Component.EventType", "goog.ui.editor.Bubble", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/plugins/abstractdialogplugin.js", ["goog.editor.plugins.AbstractDialogPlugin", "goog.editor.plugins.AbstractDialogPlugin.EventType"], ["goog.dom", "goog.dom.Range", "goog.editor.Field.EventType", "goog.editor.Plugin", "goog.editor.range", "goog.events", "goog.ui.editor.AbstractDialog.EventType"]);
goog.addDependency("/closure/goog/editor/plugins/abstracttabhandler.js", ["goog.editor.plugins.AbstractTabHandler"], ["goog.editor.Plugin", "goog.events.KeyCodes"]);
goog.addDependency("/closure/goog/editor/plugins/basictextformatter.js", ["goog.editor.plugins.BasicTextFormatter", "goog.editor.plugins.BasicTextFormatter.COMMAND"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Link", "goog.editor.Plugin", "goog.editor.node", "goog.editor.range", "goog.iter", "goog.object", "goog.string", "goog.string.Unicode", "goog.style", "goog.ui.editor.messages", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/plugins/blockquote.js", ["goog.editor.plugins.Blockquote"], ["goog.debug.Logger", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.dom.classes", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Plugin", "goog.editor.node", "goog.functions"]);
goog.addDependency("/closure/goog/editor/plugins/emoticons.js", ["goog.editor.plugins.Emoticons"], ["goog.dom.TagName", "goog.editor.Plugin", "goog.functions", "goog.ui.emoji.Emoji"]);
goog.addDependency("/closure/goog/editor/plugins/enterhandler.js", ["goog.editor.plugins.EnterHandler"], ["goog.dom", "goog.dom.AbstractRange", "goog.dom.NodeOffset", "goog.dom.NodeType", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Plugin", "goog.editor.node", "goog.editor.plugins.Blockquote", "goog.editor.range", "goog.editor.style", "goog.events.KeyCodes", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/plugins/equationeditorbubble.js", ["goog.editor.plugins.equation.EquationBubble"], ["goog.dom", "goog.dom.TagName", "goog.editor.Command", "goog.editor.plugins.AbstractBubblePlugin", "goog.string.Unicode", "goog.ui.editor.Bubble", "goog.ui.equation.ImageRenderer"]);
goog.addDependency("/closure/goog/editor/plugins/equationeditorplugin.js", ["goog.editor.plugins.EquationEditorPlugin"], ["goog.editor.Command", "goog.editor.plugins.AbstractDialogPlugin", "goog.editor.range", "goog.functions", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.EquationEditorDialog", "goog.ui.editor.EquationEditorOkEvent", "goog.ui.equation.EquationEditor", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexEditor"]);
goog.addDependency("/closure/goog/editor/plugins/headerformatter.js", ["goog.editor.plugins.HeaderFormatter"], ["goog.editor.Command", "goog.editor.Plugin", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/plugins/linkbubble.js", ["goog.editor.plugins.LinkBubble", "goog.editor.plugins.LinkBubble.Action"], ["goog.array", "goog.dom", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Link", "goog.editor.plugins.AbstractBubblePlugin", "goog.editor.range", "goog.string", "goog.style", "goog.ui.editor.messages", "goog.uri.utils", "goog.window"]);
goog.addDependency("/closure/goog/editor/plugins/linkdialogplugin.js", ["goog.editor.plugins.LinkDialogPlugin"], ["goog.array", "goog.editor.Command", "goog.editor.plugins.AbstractDialogPlugin", "goog.events.EventHandler", "goog.functions", "goog.ui.editor.AbstractDialog.EventType", "goog.ui.editor.LinkDialog", "goog.ui.editor.LinkDialog.EventType", "goog.ui.editor.LinkDialog.OkEvent", "goog.uri.utils"]);
goog.addDependency("/closure/goog/editor/plugins/linkshortcutplugin.js", ["goog.editor.plugins.LinkShortcutPlugin"], ["goog.editor.Command", "goog.editor.Link", "goog.editor.Plugin", "goog.string"]);
goog.addDependency("/closure/goog/editor/plugins/listtabhandler.js", ["goog.editor.plugins.ListTabHandler"], ["goog.dom.TagName", "goog.editor.Command", "goog.editor.plugins.AbstractTabHandler"]);
goog.addDependency("/closure/goog/editor/plugins/loremipsum.js", ["goog.editor.plugins.LoremIpsum"], ["goog.asserts", "goog.dom", "goog.editor.Command", "goog.editor.Plugin", "goog.editor.node", "goog.functions"]);
goog.addDependency("/closure/goog/editor/plugins/removeformatting.js", ["goog.editor.plugins.RemoveFormatting"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Plugin", "goog.editor.node", "goog.editor.range", "goog.string"]);
goog.addDependency("/closure/goog/editor/plugins/spacestabhandler.js", ["goog.editor.plugins.SpacesTabHandler"], ["goog.dom", "goog.dom.TagName", "goog.editor.plugins.AbstractTabHandler", "goog.editor.range"]);
goog.addDependency("/closure/goog/editor/plugins/tableeditor.js", ["goog.editor.plugins.TableEditor"], ["goog.array", "goog.dom", "goog.dom.TagName", "goog.editor.Plugin", "goog.editor.Table", "goog.editor.node", "goog.editor.range", "goog.object"]);
goog.addDependency("/closure/goog/editor/plugins/tagonenterhandler.js", ["goog.editor.plugins.TagOnEnterHandler"], ["goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.TagName", "goog.editor.Command", "goog.editor.node", "goog.editor.plugins.EnterHandler", "goog.editor.range", "goog.editor.style", "goog.events.KeyCodes", "goog.string", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/plugins/undoredo.js", ["goog.editor.plugins.UndoRedo"], ["goog.debug.Logger", "goog.dom", "goog.dom.NodeOffset", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.Command", "goog.editor.Field.EventType", "goog.editor.Plugin", "goog.editor.plugins.UndoRedoManager", "goog.editor.plugins.UndoRedoState", "goog.events", "goog.events.EventHandler"]);
goog.addDependency("/closure/goog/editor/plugins/undoredomanager.js", ["goog.editor.plugins.UndoRedoManager", "goog.editor.plugins.UndoRedoManager.EventType"], ["goog.editor.plugins.UndoRedoState", "goog.events.EventTarget"]);
goog.addDependency("/closure/goog/editor/plugins/undoredostate.js", ["goog.editor.plugins.UndoRedoState"], ["goog.events.EventTarget"]);
goog.addDependency("/closure/goog/editor/range.js", ["goog.editor.range", "goog.editor.range.Point"], ["goog.array", "goog.dom", "goog.dom.NodeType", "goog.dom.Range", "goog.dom.RangeEndpoint", "goog.dom.SavedCaretRange", "goog.editor.BrowserFeature", "goog.editor.node", "goog.editor.style", "goog.iter"]);
goog.addDependency("/closure/goog/editor/seamlessfield.js", ["goog.editor.SeamlessField"], ["goog.cssom.iframe.style", "goog.debug.Logger", "goog.dom", "goog.dom.Range", "goog.dom.TagName", "goog.editor.BrowserFeature", "goog.editor.Field", "goog.editor.Field.EventType", "goog.editor.icontent", "goog.editor.icontent.FieldFormatInfo", "goog.editor.icontent.FieldStyleInfo", "goog.editor.node", "goog.events", "goog.events.EventType", "goog.style"]);
goog.addDependency("/closure/goog/editor/seamlessfield_test.js", ["goog.editor.seamlessfield_test"], ["goog.dom", "goog.editor.BrowserFeature", "goog.editor.SeamlessField", "goog.events", "goog.style", "goog.testing.MockClock", "goog.testing.MockRange", "goog.testing.jsunit"]);
goog.addDependency("/closure/goog/editor/style.js", ["goog.editor.style"], ["goog.dom", "goog.dom.NodeType", "goog.editor.BrowserFeature", "goog.events.EventType", "goog.object", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/editor/table.js", ["goog.editor.Table", "goog.editor.TableCell", "goog.editor.TableRow"], ["goog.debug.Logger", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.string.Unicode", "goog.style"]);
goog.addDependency("/closure/goog/events/actioneventwrapper.js", ["goog.events.actionEventWrapper"], ["goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.events.EventWrapper", "goog.events.KeyCodes"]);
goog.addDependency("/closure/goog/events/actionhandler.js", ["goog.events.ActionEvent", "goog.events.ActionHandler", "goog.events.ActionHandler.EventType", "goog.events.BeforeActionEvent"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/browserevent.js", ["goog.events.BrowserEvent", "goog.events.BrowserEvent.MouseButton"], ["goog.events.BrowserFeature", "goog.events.Event", "goog.events.EventType", "goog.reflect", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/browserfeature.js", ["goog.events.BrowserFeature"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/events/event.js", ["goog.events.Event"], ["goog.Disposable"]);
goog.addDependency("/closure/goog/events/eventhandler.js", ["goog.events.EventHandler"], ["goog.Disposable", "goog.array", "goog.events", "goog.events.EventWrapper"]);
goog.addDependency("/closure/goog/events/events.js", ["goog.events"], ["goog.array", "goog.debug.entryPointRegistry", "goog.debug.errorHandlerWeakDep", "goog.events.BrowserEvent", "goog.events.BrowserFeature", "goog.events.Event", "goog.events.EventWrapper", "goog.events.Listener", "goog.object", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/eventtarget.js", ["goog.events.EventTarget"], ["goog.Disposable", "goog.events"]);
goog.addDependency("/closure/goog/events/eventtype.js", ["goog.events.EventType"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/events/eventwrapper.js", ["goog.events.EventWrapper"], []);
goog.addDependency("/closure/goog/events/filedrophandler.js", ["goog.events.FileDropHandler", "goog.events.FileDropHandler.EventType"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/closure/goog/events/focushandler.js", ["goog.events.FocusHandler", "goog.events.FocusHandler.EventType"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/imehandler.js", ["goog.events.ImeHandler", "goog.events.ImeHandler.Event", "goog.events.ImeHandler.EventType"], ["goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/closure/goog/events/inputhandler.js", ["goog.events.InputHandler", "goog.events.InputHandler.EventType"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.KeyCodes", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/keycodes.js", ["goog.events.KeyCodes"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/events/keyhandler.js", ["goog.events.KeyEvent", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/keynames.js", ["goog.events.KeyNames"], []);
goog.addDependency("/closure/goog/events/listener.js", ["goog.events.Listener"], []);
goog.addDependency("/closure/goog/events/mousewheelhandler.js", ["goog.events.MouseWheelEvent", "goog.events.MouseWheelHandler", "goog.events.MouseWheelHandler.EventType"], ["goog.events", "goog.events.BrowserEvent", "goog.events.EventTarget", "goog.math", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/onlinehandler.js", ["goog.events.OnlineHandler", "goog.events.OnlineHandler.EventType"], ["goog.Timer", "goog.events.BrowserFeature", "goog.events.EventHandler", "goog.events.EventTarget", "goog.userAgent"]);
goog.addDependency("/closure/goog/events/pastehandler.js", ["goog.events.PasteHandler", "goog.events.PasteHandler.EventType", "goog.events.PasteHandler.State"], ["goog.Timer", "goog.async.ConditionalDelay", "goog.debug.Logger", "goog.events.BrowserEvent", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes"]);
goog.addDependency("/closure/goog/format/emailaddress.js", ["goog.format.EmailAddress"], ["goog.string"]);
goog.addDependency("/closure/goog/format/format.js", ["goog.format"], ["goog.i18n.GraphemeBreak", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/format/htmlprettyprinter.js", ["goog.format.HtmlPrettyPrinter", "goog.format.HtmlPrettyPrinter.Buffer"], ["goog.object", "goog.string.StringBuffer"]);
goog.addDependency("/closure/goog/format/jsonprettyprinter.js", ["goog.format.JsonPrettyPrinter", "goog.format.JsonPrettyPrinter.HtmlDelimiters", "goog.format.JsonPrettyPrinter.TextDelimiters"], ["goog.json", "goog.json.Serializer", "goog.string", "goog.string.StringBuffer", "goog.string.format"]);
goog.addDependency("/closure/goog/fs/entry.js", ["goog.fs.DirectoryEntry", "goog.fs.DirectoryEntry.Behavior", "goog.fs.Entry", "goog.fs.FileEntry"], ["goog.array", "goog.async.Deferred", "goog.fs.Error", "goog.fs.FileWriter", "goog.functions", "goog.string"]);
goog.addDependency("/closure/goog/fs/error.js", ["goog.fs.Error", "goog.fs.Error.ErrorCode"], ["goog.debug.Error", "goog.string"]);
goog.addDependency("/closure/goog/fs/filereader.js", ["goog.fs.FileReader", "goog.fs.FileReader.EventType", "goog.fs.FileReader.ReadyState"], ["goog.async.Deferred", "goog.events.Event", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.ProgressEvent"]);
goog.addDependency("/closure/goog/fs/filesaver.js", ["goog.fs.FileSaver", "goog.fs.FileSaver.EventType", "goog.fs.FileSaver.ProgressEvent", "goog.fs.FileSaver.ReadyState"], ["goog.events.Event", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.ProgressEvent"]);
goog.addDependency("/closure/goog/fs/filesystem.js", ["goog.fs.FileSystem"], ["goog.fs.DirectoryEntry"]);
goog.addDependency("/closure/goog/fs/filewriter.js", ["goog.fs.FileWriter"], ["goog.fs.Error", "goog.fs.FileSaver"]);
goog.addDependency("/closure/goog/fs/fs.js", ["goog.fs"], ["goog.async.Deferred", "goog.events", "goog.fs.Error", "goog.fs.FileReader", "goog.fs.FileSystem"]);
goog.addDependency("/closure/goog/fs/progressevent.js", ["goog.fs.ProgressEvent"], ["goog.events.Event"]);
goog.addDependency("/closure/goog/functions/functions.js", ["goog.functions"], []);
goog.addDependency("/closure/goog/fx/abstractdragdrop.js", ["goog.fx.AbstractDragDrop", "goog.fx.AbstractDragDrop.EventType", "goog.fx.DragDropEvent", "goog.fx.DragDropItem"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.math.Box", "goog.math.Coordinate", "goog.style"]);
goog.addDependency("/closure/goog/fx/anim/anim.js", ["goog.fx.anim", "goog.fx.anim.Animated"], ["goog.Timer", "goog.events", "goog.object"]);
goog.addDependency("/closure/goog/fx/animation.js", ["goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Animation.State", "goog.fx.AnimationEvent"], ["goog.array", "goog.events.Event", "goog.fx.Transition", "goog.fx.Transition.EventType", "goog.fx.TransitionBase.State", "goog.fx.anim", "goog.fx.anim.Animated"]);
goog.addDependency("/closure/goog/fx/animationqueue.js", ["goog.fx.AnimationParallelQueue", "goog.fx.AnimationQueue", "goog.fx.AnimationSerialQueue"], ["goog.array", "goog.asserts", "goog.events.EventHandler", "goog.fx.Transition.EventType", "goog.fx.TransitionBase", "goog.fx.TransitionBase.State"]);
goog.addDependency("/closure/goog/fx/css3/fx.js", ["goog.fx.css3"], ["goog.fx.css3.Transition"]);
goog.addDependency("/closure/goog/fx/css3/transition.js", ["goog.fx.css3.Transition"], ["goog.Timer", "goog.fx.TransitionBase", "goog.style", "goog.style.transition"]);
goog.addDependency("/closure/goog/fx/cssspriteanimation.js", ["goog.fx.CssSpriteAnimation"], ["goog.fx.Animation"]);
goog.addDependency("/closure/goog/fx/dom.js", ["goog.fx.dom", "goog.fx.dom.BgColorTransform", "goog.fx.dom.ColorTransform", "goog.fx.dom.Fade", "goog.fx.dom.FadeIn", "goog.fx.dom.FadeInAndShow", "goog.fx.dom.FadeOut", "goog.fx.dom.FadeOutAndHide", "goog.fx.dom.PredefinedEffect", "goog.fx.dom.Resize", "goog.fx.dom.ResizeHeight", "goog.fx.dom.ResizeWidth", "goog.fx.dom.Scroll", "goog.fx.dom.Slide", "goog.fx.dom.SlideFrom", "goog.fx.dom.Swipe"], ["goog.color", "goog.events", "goog.fx.Animation", "goog.fx.Transition.EventType", "goog.style"]);
goog.addDependency("/closure/goog/fx/dragdrop.js", ["goog.fx.DragDrop"], ["goog.fx.AbstractDragDrop", "goog.fx.DragDropItem"]);
goog.addDependency("/closure/goog/fx/dragdropgroup.js", ["goog.fx.DragDropGroup"], ["goog.dom", "goog.fx.AbstractDragDrop", "goog.fx.DragDropItem"]);
goog.addDependency("/closure/goog/fx/dragger.js", ["goog.fx.DragEvent", "goog.fx.Dragger", "goog.fx.Dragger.EventType"], ["goog.dom", "goog.events", "goog.events.BrowserEvent.MouseButton", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.math.Coordinate", "goog.math.Rect", "goog.userAgent"]);
goog.addDependency("/closure/goog/fx/draglistgroup.js", ["goog.fx.DragListDirection", "goog.fx.DragListGroup", "goog.fx.DragListGroup.EventType", "goog.fx.DragListGroupEvent"], ["goog.asserts", "goog.dom", "goog.dom.NodeType", "goog.dom.classes", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.math.Coordinate", "goog.style"]);
goog.addDependency("/closure/goog/fx/dragscrollsupport.js", ["goog.fx.DragScrollSupport"], ["goog.Disposable", "goog.Timer", "goog.dom", "goog.events.EventHandler", "goog.events.EventType", "goog.math.Coordinate", "goog.style"]);
goog.addDependency("/closure/goog/fx/easing.js", ["goog.fx.easing"], []);
goog.addDependency("/closure/goog/fx/fx.js", ["goog.fx"], ["goog.asserts", "goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Animation.State", "goog.fx.AnimationEvent", "goog.fx.Transition.EventType", "goog.fx.easing"]);
goog.addDependency("/closure/goog/fx/transition.js", ["goog.fx.Transition", "goog.fx.Transition.EventType"], []);
goog.addDependency("/closure/goog/fx/transitionbase.js", ["goog.fx.TransitionBase", "goog.fx.TransitionBase.State"], ["goog.events.EventTarget", "goog.fx.Transition", "goog.fx.Transition.EventType"]);
goog.addDependency("/closure/goog/gears/basestore.js", ["goog.gears.BaseStore", "goog.gears.BaseStore.SchemaType"], ["goog.Disposable"]);
goog.addDependency("/closure/goog/gears/database.js", ["goog.gears.Database", "goog.gears.Database.EventType", "goog.gears.Database.TransactionEvent"], ["goog.array", "goog.debug", "goog.debug.Logger", "goog.events.Event", "goog.events.EventTarget", "goog.gears", "goog.json"]);
goog.addDependency("/closure/goog/gears/fakeworkerpool.js", ["goog.gears.FakeWorkerPool"], ["goog.Uri", "goog.gears", "goog.gears.WorkerPool", "goog.net.XmlHttp"]);
goog.addDependency("/closure/goog/gears/gears.js", ["goog.gears"], ["goog.string"]);
goog.addDependency("/closure/goog/gears/httprequest.js", ["goog.gears.HttpRequest"], ["goog.Timer", "goog.gears", "goog.net.WrapperXmlHttpFactory", "goog.net.XmlHttp"]);
goog.addDependency("/closure/goog/gears/loggerclient.js", ["goog.gears.LoggerClient"], ["goog.Disposable", "goog.debug", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/gears/loggerserver.js", ["goog.gears.LoggerServer"], ["goog.Disposable", "goog.debug.Logger", "goog.debug.Logger.Level", "goog.gears.Worker.EventType"]);
goog.addDependency("/closure/goog/gears/logstore.js", ["goog.gears.LogStore", "goog.gears.LogStore.Query"], ["goog.async.Delay", "goog.debug.LogManager", "goog.debug.LogRecord", "goog.debug.Logger", "goog.debug.Logger.Level", "goog.gears.BaseStore", "goog.gears.BaseStore.SchemaType", "goog.json"]);
goog.addDependency("/closure/goog/gears/managedresourcestore.js", ["goog.gears.ManagedResourceStore", "goog.gears.ManagedResourceStore.EventType", "goog.gears.ManagedResourceStore.UpdateStatus", "goog.gears.ManagedResourceStoreEvent"], ["goog.debug.Logger", "goog.events.Event", "goog.events.EventTarget", "goog.gears", "goog.string"]);
goog.addDependency("/closure/goog/gears/multipartformdata.js", ["goog.gears.MultipartFormData"], ["goog.asserts", "goog.gears", "goog.string"]);
goog.addDependency("/closure/goog/gears/statustype.js", ["goog.gears.StatusType"], []);
goog.addDependency("/closure/goog/gears/urlcapture.js", ["goog.gears.UrlCapture", "goog.gears.UrlCapture.Event", "goog.gears.UrlCapture.EventType"], ["goog.Uri", "goog.debug.Logger", "goog.events.Event", "goog.events.EventTarget", "goog.gears"]);
goog.addDependency("/closure/goog/gears/worker.js", ["goog.gears.Worker", "goog.gears.Worker.EventType", "goog.gears.WorkerEvent"], ["goog.events.Event", "goog.events.EventTarget"]);
goog.addDependency("/closure/goog/gears/workerchannel.js", ["goog.gears.WorkerChannel"], ["goog.Disposable", "goog.debug", "goog.debug.Logger", "goog.events", "goog.gears.Worker", "goog.gears.Worker.EventType", "goog.gears.WorkerEvent", "goog.json", "goog.messaging.AbstractChannel"]);
goog.addDependency("/closure/goog/gears/workerpool.js", ["goog.gears.WorkerPool", "goog.gears.WorkerPool.Event", "goog.gears.WorkerPool.EventType"], ["goog.events.Event", "goog.events.EventTarget", "goog.gears", "goog.gears.Worker"]);
goog.addDependency("/closure/goog/graphics/abstractgraphics.js", ["goog.graphics.AbstractGraphics"], ["goog.graphics.Path", "goog.math.Coordinate", "goog.math.Size", "goog.style", "goog.ui.Component"]);
goog.addDependency("/closure/goog/graphics/affinetransform.js", ["goog.graphics.AffineTransform"], ["goog.math"]);
goog.addDependency("/closure/goog/graphics/canvaselement.js", ["goog.graphics.CanvasEllipseElement", "goog.graphics.CanvasGroupElement", "goog.graphics.CanvasImageElement", "goog.graphics.CanvasPathElement", "goog.graphics.CanvasRectElement", "goog.graphics.CanvasTextElement"], ["goog.array", "goog.dom", "goog.dom.TagName", "goog.graphics.EllipseElement", "goog.graphics.GroupElement", "goog.graphics.ImageElement", "goog.graphics.Path", "goog.graphics.PathElement", "goog.graphics.RectElement", "goog.graphics.TextElement"]);
goog.addDependency("/closure/goog/graphics/canvasgraphics.js", ["goog.graphics.CanvasGraphics"], ["goog.dom", "goog.events.EventType", "goog.graphics.AbstractGraphics", "goog.graphics.CanvasEllipseElement", "goog.graphics.CanvasGroupElement", "goog.graphics.CanvasImageElement", "goog.graphics.CanvasPathElement", "goog.graphics.CanvasRectElement", "goog.graphics.CanvasTextElement", "goog.graphics.Font", "goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.math.Size"]);
goog.addDependency("/closure/goog/graphics/element.js", ["goog.graphics.Element"], ["goog.events", "goog.events.EventTarget", "goog.graphics.AffineTransform", "goog.math"]);
goog.addDependency("/closure/goog/graphics/ellipseelement.js", ["goog.graphics.EllipseElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/closure/goog/graphics/ext/coordinates.js", ["goog.graphics.ext.coordinates"], ["goog.string"]);
goog.addDependency("/closure/goog/graphics/ext/element.js", ["goog.graphics.ext.Element"], ["goog.events", "goog.events.EventTarget", "goog.functions", "goog.graphics", "goog.graphics.ext.coordinates"]);
goog.addDependency("/closure/goog/graphics/ext/ellipse.js", ["goog.graphics.ext.Ellipse"], ["goog.graphics.ext.StrokeAndFillElement"]);
goog.addDependency("/closure/goog/graphics/ext/ext.js", ["goog.graphics.ext"], ["goog.graphics.ext.Ellipse", "goog.graphics.ext.Graphics", "goog.graphics.ext.Group", "goog.graphics.ext.Image", "goog.graphics.ext.Rectangle", "goog.graphics.ext.Shape", "goog.graphics.ext.coordinates"]);
goog.addDependency("/closure/goog/graphics/ext/graphics.js", ["goog.graphics.ext.Graphics"], ["goog.events.EventType", "goog.graphics.ext.Group"]);
goog.addDependency("/closure/goog/graphics/ext/group.js", ["goog.graphics.ext.Group"], ["goog.graphics.ext.Element"]);
goog.addDependency("/closure/goog/graphics/ext/image.js", ["goog.graphics.ext.Image"], ["goog.graphics.ext.Element"]);
goog.addDependency("/closure/goog/graphics/ext/path.js", ["goog.graphics.ext.Path"], ["goog.graphics.AffineTransform", "goog.graphics.Path", "goog.math", "goog.math.Rect"]);
goog.addDependency("/closure/goog/graphics/ext/rectangle.js", ["goog.graphics.ext.Rectangle"], ["goog.graphics.ext.StrokeAndFillElement"]);
goog.addDependency("/closure/goog/graphics/ext/shape.js", ["goog.graphics.ext.Shape"], ["goog.graphics.ext.Path", "goog.graphics.ext.StrokeAndFillElement", "goog.math.Rect"]);
goog.addDependency("/closure/goog/graphics/ext/strokeandfillelement.js", ["goog.graphics.ext.StrokeAndFillElement"], ["goog.graphics.ext.Element"]);
goog.addDependency("/closure/goog/graphics/fill.js", ["goog.graphics.Fill"], []);
goog.addDependency("/closure/goog/graphics/font.js", ["goog.graphics.Font"], []);
goog.addDependency("/closure/goog/graphics/graphics.js", ["goog.graphics"], ["goog.graphics.CanvasGraphics", "goog.graphics.SvgGraphics", "goog.graphics.VmlGraphics", "goog.userAgent"]);
goog.addDependency("/closure/goog/graphics/groupelement.js", ["goog.graphics.GroupElement"], ["goog.graphics.Element"]);
goog.addDependency("/closure/goog/graphics/imageelement.js", ["goog.graphics.ImageElement"], ["goog.graphics.Element"]);
goog.addDependency("/closure/goog/graphics/lineargradient.js", ["goog.graphics.LinearGradient"], ["goog.asserts", "goog.graphics.Fill"]);
goog.addDependency("/closure/goog/graphics/path.js", ["goog.graphics.Path", "goog.graphics.Path.Segment"], ["goog.array", "goog.math"]);
goog.addDependency("/closure/goog/graphics/pathelement.js", ["goog.graphics.PathElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/closure/goog/graphics/paths.js", ["goog.graphics.paths"], ["goog.graphics.Path", "goog.math.Coordinate"]);
goog.addDependency("/closure/goog/graphics/rectelement.js", ["goog.graphics.RectElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/closure/goog/graphics/solidfill.js", ["goog.graphics.SolidFill"], ["goog.graphics.Fill"]);
goog.addDependency("/closure/goog/graphics/stroke.js", ["goog.graphics.Stroke"], []);
goog.addDependency("/closure/goog/graphics/strokeandfillelement.js", ["goog.graphics.StrokeAndFillElement"], ["goog.graphics.Element"]);
goog.addDependency("/closure/goog/graphics/svgelement.js", ["goog.graphics.SvgEllipseElement", "goog.graphics.SvgGroupElement", "goog.graphics.SvgImageElement", "goog.graphics.SvgPathElement", "goog.graphics.SvgRectElement", "goog.graphics.SvgTextElement"], ["goog.dom", "goog.graphics.EllipseElement", "goog.graphics.GroupElement", "goog.graphics.ImageElement", "goog.graphics.PathElement", "goog.graphics.RectElement", "goog.graphics.TextElement"]);
goog.addDependency("/closure/goog/graphics/svggraphics.js", ["goog.graphics.SvgGraphics"], ["goog.Timer", "goog.dom", "goog.events.EventHandler", "goog.events.EventType", "goog.graphics.AbstractGraphics", "goog.graphics.Font", "goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.graphics.SvgEllipseElement", "goog.graphics.SvgGroupElement", "goog.graphics.SvgImageElement", "goog.graphics.SvgPathElement", "goog.graphics.SvgRectElement", "goog.graphics.SvgTextElement", "goog.math.Size", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/graphics/textelement.js", ["goog.graphics.TextElement"], ["goog.graphics.StrokeAndFillElement"]);
goog.addDependency("/closure/goog/graphics/vmlelement.js", ["goog.graphics.VmlEllipseElement", "goog.graphics.VmlGroupElement", "goog.graphics.VmlImageElement", "goog.graphics.VmlPathElement", "goog.graphics.VmlRectElement", "goog.graphics.VmlTextElement"], ["goog.dom", "goog.graphics.EllipseElement", "goog.graphics.GroupElement", "goog.graphics.ImageElement", "goog.graphics.PathElement", "goog.graphics.RectElement", "goog.graphics.TextElement"]);
goog.addDependency("/closure/goog/graphics/vmlgraphics.js", ["goog.graphics.VmlGraphics"], ["goog.array", "goog.dom", "goog.events.EventHandler", "goog.events.EventType", "goog.graphics.AbstractGraphics", "goog.graphics.Font", "goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.graphics.VmlEllipseElement", "goog.graphics.VmlGroupElement", "goog.graphics.VmlImageElement", "goog.graphics.VmlPathElement", "goog.graphics.VmlRectElement", "goog.graphics.VmlTextElement", "goog.math.Size", "goog.string", "goog.style"]);
goog.addDependency("/closure/goog/history/event.js", ["goog.history.Event"], ["goog.events.Event", "goog.history.EventType"]);
goog.addDependency("/closure/goog/history/eventtype.js", ["goog.history.EventType"], []);
goog.addDependency("/closure/goog/history/history.js", ["goog.History", "goog.History.Event", "goog.History.EventType"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.BrowserEvent", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.history.Event", "goog.history.EventType", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/history/html5history.js", ["goog.history.Html5History", "goog.history.Html5History.TokenTransformer"], ["goog.asserts", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.history.Event", "goog.history.EventType"]);
goog.addDependency("/closure/goog/i18n/bidi.js", ["goog.i18n.bidi"], []);
goog.addDependency("/closure/goog/i18n/bidiformatter.js", ["goog.i18n.BidiFormatter"], ["goog.i18n.bidi", "goog.string"]);
goog.addDependency("/closure/goog/i18n/charlistdecompressor.js", ["goog.i18n.CharListDecompressor"], ["goog.array", "goog.i18n.uChar"]);
goog.addDependency("/closure/goog/i18n/charpickerdata.js", ["goog.i18n.CharPickerData"], []);
goog.addDependency("/closure/goog/i18n/currency.js", ["goog.i18n.currency"], []);
goog.addDependency("/closure/goog/i18n/currencycodemap.js", ["goog.i18n.currencyCodeMap", "goog.i18n.currencyCodeMapTier2"], []);
goog.addDependency("/closure/goog/i18n/datetimeformat.js", ["goog.i18n.DateTimeFormat", "goog.i18n.DateTimeFormat.Format"], ["goog.asserts", "goog.date.DateLike", "goog.i18n.DateTimeSymbols", "goog.i18n.TimeZone", "goog.string"]);
goog.addDependency("/closure/goog/i18n/datetimeparse.js", ["goog.i18n.DateTimeParse"], ["goog.date.DateLike", "goog.i18n.DateTimeFormat", "goog.i18n.DateTimeSymbols"]);
goog.addDependency("/closure/goog/i18n/datetimepatterns.js", ["goog.i18n.DateTimePatterns", "goog.i18n.DateTimePatterns_am", "goog.i18n.DateTimePatterns_ar", "goog.i18n.DateTimePatterns_bg", "goog.i18n.DateTimePatterns_bn", "goog.i18n.DateTimePatterns_ca", "goog.i18n.DateTimePatterns_cs", "goog.i18n.DateTimePatterns_da", "goog.i18n.DateTimePatterns_de", "goog.i18n.DateTimePatterns_de_AT", "goog.i18n.DateTimePatterns_de_CH", "goog.i18n.DateTimePatterns_el", "goog.i18n.DateTimePatterns_en", "goog.i18n.DateTimePatterns_en_AU", "goog.i18n.DateTimePatterns_en_GB", "goog.i18n.DateTimePatterns_en_IE", "goog.i18n.DateTimePatterns_en_IN", "goog.i18n.DateTimePatterns_en_SG", "goog.i18n.DateTimePatterns_en_US", "goog.i18n.DateTimePatterns_en_ZA", "goog.i18n.DateTimePatterns_es", "goog.i18n.DateTimePatterns_et", "goog.i18n.DateTimePatterns_eu", "goog.i18n.DateTimePatterns_fa", "goog.i18n.DateTimePatterns_fi", "goog.i18n.DateTimePatterns_fil", "goog.i18n.DateTimePatterns_fr", "goog.i18n.DateTimePatterns_fr_CA", "goog.i18n.DateTimePatterns_gl", "goog.i18n.DateTimePatterns_gsw", "goog.i18n.DateTimePatterns_gu", "goog.i18n.DateTimePatterns_he", "goog.i18n.DateTimePatterns_hi", "goog.i18n.DateTimePatterns_hr", "goog.i18n.DateTimePatterns_hu", "goog.i18n.DateTimePatterns_id", "goog.i18n.DateTimePatterns_in", "goog.i18n.DateTimePatterns_is", "goog.i18n.DateTimePatterns_it", "goog.i18n.DateTimePatterns_iw", "goog.i18n.DateTimePatterns_ja", "goog.i18n.DateTimePatterns_kn", "goog.i18n.DateTimePatterns_ko", "goog.i18n.DateTimePatterns_ln", "goog.i18n.DateTimePatterns_lt", "goog.i18n.DateTimePatterns_lv", "goog.i18n.DateTimePatterns_ml", "goog.i18n.DateTimePatterns_mo", "goog.i18n.DateTimePatterns_mr", "goog.i18n.DateTimePatterns_ms", "goog.i18n.DateTimePatterns_mt", "goog.i18n.DateTimePatterns_nl", "goog.i18n.DateTimePatterns_no", "goog.i18n.DateTimePatterns_or", "goog.i18n.DateTimePatterns_pl", "goog.i18n.DateTimePatterns_pt_BR", "goog.i18n.DateTimePatterns_pt_PT", "goog.i18n.DateTimePatterns_pt", "goog.i18n.DateTimePatterns_ro", "goog.i18n.DateTimePatterns_ru", "goog.i18n.DateTimePatterns_sk", "goog.i18n.DateTimePatterns_sl", "goog.i18n.DateTimePatterns_sq", "goog.i18n.DateTimePatterns_sr", "goog.i18n.DateTimePatterns_sv", "goog.i18n.DateTimePatterns_sw", "goog.i18n.DateTimePatterns_ta", "goog.i18n.DateTimePatterns_te", "goog.i18n.DateTimePatterns_th", "goog.i18n.DateTimePatterns_tl", "goog.i18n.DateTimePatterns_tr", "goog.i18n.DateTimePatterns_uk", "goog.i18n.DateTimePatterns_ur", "goog.i18n.DateTimePatterns_vi", "goog.i18n.DateTimePatterns_zh_TW", "goog.i18n.DateTimePatterns_zh_CN", "goog.i18n.DateTimePatterns_zh_HK", "goog.i18n.DateTimePatterns_zh"], []);
goog.addDependency("/closure/goog/i18n/datetimepatternsext.js", ["goog.i18n.DateTimePatternsExt", "goog.i18n.DateTimePatterns_af", "goog.i18n.DateTimePatterns_af_NA", "goog.i18n.DateTimePatterns_af_ZA", "goog.i18n.DateTimePatterns_ak", "goog.i18n.DateTimePatterns_ak_GH", "goog.i18n.DateTimePatterns_am_ET", "goog.i18n.DateTimePatterns_ar_AE", "goog.i18n.DateTimePatterns_ar_BH", "goog.i18n.DateTimePatterns_ar_DZ", "goog.i18n.DateTimePatterns_ar_EG", "goog.i18n.DateTimePatterns_ar_IQ", "goog.i18n.DateTimePatterns_ar_JO", "goog.i18n.DateTimePatterns_ar_KW", "goog.i18n.DateTimePatterns_ar_LB", "goog.i18n.DateTimePatterns_ar_LY", "goog.i18n.DateTimePatterns_ar_MA", "goog.i18n.DateTimePatterns_ar_OM", "goog.i18n.DateTimePatterns_ar_QA", "goog.i18n.DateTimePatterns_ar_SA", "goog.i18n.DateTimePatterns_ar_SD", "goog.i18n.DateTimePatterns_ar_SY", "goog.i18n.DateTimePatterns_ar_TN", "goog.i18n.DateTimePatterns_ar_YE", "goog.i18n.DateTimePatterns_as", "goog.i18n.DateTimePatterns_as_IN", "goog.i18n.DateTimePatterns_asa", "goog.i18n.DateTimePatterns_asa_TZ", "goog.i18n.DateTimePatterns_az", "goog.i18n.DateTimePatterns_az_Cyrl", "goog.i18n.DateTimePatterns_az_Cyrl_AZ", "goog.i18n.DateTimePatterns_az_Latn", "goog.i18n.DateTimePatterns_az_Latn_AZ", "goog.i18n.DateTimePatterns_be", "goog.i18n.DateTimePatterns_be_BY", "goog.i18n.DateTimePatterns_bem", "goog.i18n.DateTimePatterns_bem_ZM", "goog.i18n.DateTimePatterns_bez", "goog.i18n.DateTimePatterns_bez_TZ", "goog.i18n.DateTimePatterns_bg_BG", "goog.i18n.DateTimePatterns_bm", "goog.i18n.DateTimePatterns_bm_ML", "goog.i18n.DateTimePatterns_bn_BD", "goog.i18n.DateTimePatterns_bn_IN", "goog.i18n.DateTimePatterns_bo", "goog.i18n.DateTimePatterns_bo_CN", "goog.i18n.DateTimePatterns_bo_IN", "goog.i18n.DateTimePatterns_bs", "goog.i18n.DateTimePatterns_bs_BA", "goog.i18n.DateTimePatterns_ca_ES", "goog.i18n.DateTimePatterns_cgg", "goog.i18n.DateTimePatterns_cgg_UG", "goog.i18n.DateTimePatterns_chr", "goog.i18n.DateTimePatterns_chr_US", "goog.i18n.DateTimePatterns_cs_CZ", "goog.i18n.DateTimePatterns_cy", "goog.i18n.DateTimePatterns_cy_GB", "goog.i18n.DateTimePatterns_da_DK", "goog.i18n.DateTimePatterns_dav", "goog.i18n.DateTimePatterns_dav_KE", "goog.i18n.DateTimePatterns_de_BE", "goog.i18n.DateTimePatterns_de_DE", "goog.i18n.DateTimePatterns_de_LI", "goog.i18n.DateTimePatterns_de_LU", "goog.i18n.DateTimePatterns_ebu", "goog.i18n.DateTimePatterns_ebu_KE", "goog.i18n.DateTimePatterns_ee", "goog.i18n.DateTimePatterns_ee_GH", "goog.i18n.DateTimePatterns_ee_TG", "goog.i18n.DateTimePatterns_el_CY", "goog.i18n.DateTimePatterns_el_GR", "goog.i18n.DateTimePatterns_en_AS", "goog.i18n.DateTimePatterns_en_BE", "goog.i18n.DateTimePatterns_en_BW", "goog.i18n.DateTimePatterns_en_BZ", "goog.i18n.DateTimePatterns_en_CA", "goog.i18n.DateTimePatterns_en_GU", "goog.i18n.DateTimePatterns_en_HK", "goog.i18n.DateTimePatterns_en_JM", "goog.i18n.DateTimePatterns_en_MH", "goog.i18n.DateTimePatterns_en_MP", "goog.i18n.DateTimePatterns_en_MT", "goog.i18n.DateTimePatterns_en_MU", "goog.i18n.DateTimePatterns_en_NA", "goog.i18n.DateTimePatterns_en_NZ", "goog.i18n.DateTimePatterns_en_PH", "goog.i18n.DateTimePatterns_en_PK", "goog.i18n.DateTimePatterns_en_TT", "goog.i18n.DateTimePatterns_en_UM", "goog.i18n.DateTimePatterns_en_US_POSIX", "goog.i18n.DateTimePatterns_en_VI", "goog.i18n.DateTimePatterns_en_ZW", "goog.i18n.DateTimePatterns_eo", "goog.i18n.DateTimePatterns_es_419", "goog.i18n.DateTimePatterns_es_AR", "goog.i18n.DateTimePatterns_es_BO", "goog.i18n.DateTimePatterns_es_CL", "goog.i18n.DateTimePatterns_es_CO", "goog.i18n.DateTimePatterns_es_CR", "goog.i18n.DateTimePatterns_es_DO", "goog.i18n.DateTimePatterns_es_EC", "goog.i18n.DateTimePatterns_es_ES", "goog.i18n.DateTimePatterns_es_GQ", "goog.i18n.DateTimePatterns_es_GT", "goog.i18n.DateTimePatterns_es_HN", "goog.i18n.DateTimePatterns_es_MX", "goog.i18n.DateTimePatterns_es_NI", "goog.i18n.DateTimePatterns_es_PA", "goog.i18n.DateTimePatterns_es_PE", "goog.i18n.DateTimePatterns_es_PR", "goog.i18n.DateTimePatterns_es_PY", "goog.i18n.DateTimePatterns_es_SV", "goog.i18n.DateTimePatterns_es_US", "goog.i18n.DateTimePatterns_es_UY", "goog.i18n.DateTimePatterns_es_VE", "goog.i18n.DateTimePatterns_et_EE", "goog.i18n.DateTimePatterns_eu_ES", "goog.i18n.DateTimePatterns_fa_AF", "goog.i18n.DateTimePatterns_fa_IR", "goog.i18n.DateTimePatterns_ff", "goog.i18n.DateTimePatterns_ff_SN", "goog.i18n.DateTimePatterns_fi_FI", "goog.i18n.DateTimePatterns_fil_PH", "goog.i18n.DateTimePatterns_fo", "goog.i18n.DateTimePatterns_fo_FO", "goog.i18n.DateTimePatterns_fr_BE", "goog.i18n.DateTimePatterns_fr_BF", "goog.i18n.DateTimePatterns_fr_BI", "goog.i18n.DateTimePatterns_fr_BJ", "goog.i18n.DateTimePatterns_fr_BL", "goog.i18n.DateTimePatterns_fr_CD", "goog.i18n.DateTimePatterns_fr_CF", "goog.i18n.DateTimePatterns_fr_CG", "goog.i18n.DateTimePatterns_fr_CH", "goog.i18n.DateTimePatterns_fr_CI", "goog.i18n.DateTimePatterns_fr_CM", "goog.i18n.DateTimePatterns_fr_DJ", "goog.i18n.DateTimePatterns_fr_FR", "goog.i18n.DateTimePatterns_fr_GA", "goog.i18n.DateTimePatterns_fr_GN", "goog.i18n.DateTimePatterns_fr_GP", "goog.i18n.DateTimePatterns_fr_GQ", "goog.i18n.DateTimePatterns_fr_KM", "goog.i18n.DateTimePatterns_fr_LU", "goog.i18n.DateTimePatterns_fr_MC", "goog.i18n.DateTimePatterns_fr_MF", "goog.i18n.DateTimePatterns_fr_MG", "goog.i18n.DateTimePatterns_fr_ML", "goog.i18n.DateTimePatterns_fr_MQ", "goog.i18n.DateTimePatterns_fr_NE", "goog.i18n.DateTimePatterns_fr_RE", "goog.i18n.DateTimePatterns_fr_RW", "goog.i18n.DateTimePatterns_fr_SN", "goog.i18n.DateTimePatterns_fr_TD", "goog.i18n.DateTimePatterns_fr_TG", "goog.i18n.DateTimePatterns_ga", "goog.i18n.DateTimePatterns_ga_IE", "goog.i18n.DateTimePatterns_gl_ES", "goog.i18n.DateTimePatterns_gsw_CH", "goog.i18n.DateTimePatterns_gu_IN", "goog.i18n.DateTimePatterns_guz", "goog.i18n.DateTimePatterns_guz_KE", "goog.i18n.DateTimePatterns_gv", "goog.i18n.DateTimePatterns_gv_GB", "goog.i18n.DateTimePatterns_ha", "goog.i18n.DateTimePatterns_ha_Latn", "goog.i18n.DateTimePatterns_ha_Latn_GH", "goog.i18n.DateTimePatterns_ha_Latn_NE", "goog.i18n.DateTimePatterns_ha_Latn_NG", "goog.i18n.DateTimePatterns_haw", "goog.i18n.DateTimePatterns_haw_US", "goog.i18n.DateTimePatterns_he_IL", "goog.i18n.DateTimePatterns_hi_IN", "goog.i18n.DateTimePatterns_hr_HR", "goog.i18n.DateTimePatterns_hu_HU", "goog.i18n.DateTimePatterns_hy", "goog.i18n.DateTimePatterns_hy_AM", "goog.i18n.DateTimePatterns_id_ID", "goog.i18n.DateTimePatterns_ig", "goog.i18n.DateTimePatterns_ig_NG", "goog.i18n.DateTimePatterns_ii", "goog.i18n.DateTimePatterns_ii_CN", "goog.i18n.DateTimePatterns_is_IS", "goog.i18n.DateTimePatterns_it_CH", "goog.i18n.DateTimePatterns_it_IT", "goog.i18n.DateTimePatterns_ja_JP", "goog.i18n.DateTimePatterns_jmc", "goog.i18n.DateTimePatterns_jmc_TZ", "goog.i18n.DateTimePatterns_ka", "goog.i18n.DateTimePatterns_ka_GE", "goog.i18n.DateTimePatterns_kab", "goog.i18n.DateTimePatterns_kab_DZ", "goog.i18n.DateTimePatterns_kam", "goog.i18n.DateTimePatterns_kam_KE", "goog.i18n.DateTimePatterns_kde", "goog.i18n.DateTimePatterns_kde_TZ", "goog.i18n.DateTimePatterns_kea", "goog.i18n.DateTimePatterns_kea_CV", "goog.i18n.DateTimePatterns_khq", "goog.i18n.DateTimePatterns_khq_ML", "goog.i18n.DateTimePatterns_ki", "goog.i18n.DateTimePatterns_ki_KE", "goog.i18n.DateTimePatterns_kk", "goog.i18n.DateTimePatterns_kk_Cyrl", "goog.i18n.DateTimePatterns_kk_Cyrl_KZ", "goog.i18n.DateTimePatterns_kl", "goog.i18n.DateTimePatterns_kl_GL", "goog.i18n.DateTimePatterns_kln", "goog.i18n.DateTimePatterns_kln_KE", "goog.i18n.DateTimePatterns_km", "goog.i18n.DateTimePatterns_km_KH", "goog.i18n.DateTimePatterns_kn_IN", "goog.i18n.DateTimePatterns_ko_KR", "goog.i18n.DateTimePatterns_kok", "goog.i18n.DateTimePatterns_kok_IN", "goog.i18n.DateTimePatterns_kw", "goog.i18n.DateTimePatterns_kw_GB", "goog.i18n.DateTimePatterns_lag", "goog.i18n.DateTimePatterns_lag_TZ", "goog.i18n.DateTimePatterns_lg", "goog.i18n.DateTimePatterns_lg_UG", "goog.i18n.DateTimePatterns_lt_LT", "goog.i18n.DateTimePatterns_luo", "goog.i18n.DateTimePatterns_luo_KE", "goog.i18n.DateTimePatterns_luy", "goog.i18n.DateTimePatterns_luy_KE", "goog.i18n.DateTimePatterns_lv_LV", "goog.i18n.DateTimePatterns_mas", "goog.i18n.DateTimePatterns_mas_KE", "goog.i18n.DateTimePatterns_mas_TZ", "goog.i18n.DateTimePatterns_mer", "goog.i18n.DateTimePatterns_mer_KE", "goog.i18n.DateTimePatterns_mfe", "goog.i18n.DateTimePatterns_mfe_MU", "goog.i18n.DateTimePatterns_mg", "goog.i18n.DateTimePatterns_mg_MG", "goog.i18n.DateTimePatterns_mk", "goog.i18n.DateTimePatterns_mk_MK", "goog.i18n.DateTimePatterns_ml_IN", "goog.i18n.DateTimePatterns_mr_IN", "goog.i18n.DateTimePatterns_ms_BN", "goog.i18n.DateTimePatterns_ms_MY", "goog.i18n.DateTimePatterns_mt_MT", "goog.i18n.DateTimePatterns_my", "goog.i18n.DateTimePatterns_my_MM", "goog.i18n.DateTimePatterns_naq", "goog.i18n.DateTimePatterns_naq_NA", "goog.i18n.DateTimePatterns_nb", "goog.i18n.DateTimePatterns_nb_NO", "goog.i18n.DateTimePatterns_nd", "goog.i18n.DateTimePatterns_nd_ZW", "goog.i18n.DateTimePatterns_ne", "goog.i18n.DateTimePatterns_ne_IN", "goog.i18n.DateTimePatterns_ne_NP", "goog.i18n.DateTimePatterns_nl_BE", "goog.i18n.DateTimePatterns_nl_NL", "goog.i18n.DateTimePatterns_nn", "goog.i18n.DateTimePatterns_nn_NO", "goog.i18n.DateTimePatterns_nyn", "goog.i18n.DateTimePatterns_nyn_UG", "goog.i18n.DateTimePatterns_om", "goog.i18n.DateTimePatterns_om_ET", "goog.i18n.DateTimePatterns_om_KE", "goog.i18n.DateTimePatterns_or_IN", "goog.i18n.DateTimePatterns_pa", "goog.i18n.DateTimePatterns_pa_Arab", "goog.i18n.DateTimePatterns_pa_Arab_PK", "goog.i18n.DateTimePatterns_pa_Guru", "goog.i18n.DateTimePatterns_pa_Guru_IN", "goog.i18n.DateTimePatterns_pl_PL", "goog.i18n.DateTimePatterns_ps", "goog.i18n.DateTimePatterns_ps_AF", "goog.i18n.DateTimePatterns_pt_GW", "goog.i18n.DateTimePatterns_pt_MZ", "goog.i18n.DateTimePatterns_rm", "goog.i18n.DateTimePatterns_rm_CH", "goog.i18n.DateTimePatterns_ro_MD", "goog.i18n.DateTimePatterns_ro_RO", "goog.i18n.DateTimePatterns_rof", "goog.i18n.DateTimePatterns_rof_TZ", "goog.i18n.DateTimePatterns_ru_MD", "goog.i18n.DateTimePatterns_ru_RU", "goog.i18n.DateTimePatterns_ru_UA", "goog.i18n.DateTimePatterns_rw", "goog.i18n.DateTimePatterns_rw_RW", "goog.i18n.DateTimePatterns_rwk", "goog.i18n.DateTimePatterns_rwk_TZ", "goog.i18n.DateTimePatterns_saq", "goog.i18n.DateTimePatterns_saq_KE", "goog.i18n.DateTimePatterns_seh", "goog.i18n.DateTimePatterns_seh_MZ", "goog.i18n.DateTimePatterns_ses", "goog.i18n.DateTimePatterns_ses_ML", "goog.i18n.DateTimePatterns_sg", "goog.i18n.DateTimePatterns_sg_CF", "goog.i18n.DateTimePatterns_shi", "goog.i18n.DateTimePatterns_shi_Latn", "goog.i18n.DateTimePatterns_shi_Latn_MA", "goog.i18n.DateTimePatterns_shi_Tfng", "goog.i18n.DateTimePatterns_shi_Tfng_MA", "goog.i18n.DateTimePatterns_si", "goog.i18n.DateTimePatterns_si_LK", "goog.i18n.DateTimePatterns_sk_SK", "goog.i18n.DateTimePatterns_sl_SI", "goog.i18n.DateTimePatterns_sn", "goog.i18n.DateTimePatterns_sn_ZW", "goog.i18n.DateTimePatterns_so", "goog.i18n.DateTimePatterns_so_DJ", "goog.i18n.DateTimePatterns_so_ET", "goog.i18n.DateTimePatterns_so_KE", "goog.i18n.DateTimePatterns_so_SO", "goog.i18n.DateTimePatterns_sq_AL", "goog.i18n.DateTimePatterns_sr_Cyrl", "goog.i18n.DateTimePatterns_sr_Cyrl_BA", "goog.i18n.DateTimePatterns_sr_Cyrl_ME", "goog.i18n.DateTimePatterns_sr_Cyrl_RS", "goog.i18n.DateTimePatterns_sr_Latn", "goog.i18n.DateTimePatterns_sr_Latn_BA", "goog.i18n.DateTimePatterns_sr_Latn_ME", "goog.i18n.DateTimePatterns_sr_Latn_RS", "goog.i18n.DateTimePatterns_sv_FI", "goog.i18n.DateTimePatterns_sv_SE", "goog.i18n.DateTimePatterns_sw_KE", "goog.i18n.DateTimePatterns_sw_TZ", "goog.i18n.DateTimePatterns_ta_IN", "goog.i18n.DateTimePatterns_ta_LK", "goog.i18n.DateTimePatterns_te_IN", "goog.i18n.DateTimePatterns_teo", "goog.i18n.DateTimePatterns_teo_KE", "goog.i18n.DateTimePatterns_teo_UG", "goog.i18n.DateTimePatterns_th_TH", "goog.i18n.DateTimePatterns_ti", "goog.i18n.DateTimePatterns_ti_ER", "goog.i18n.DateTimePatterns_ti_ET", "goog.i18n.DateTimePatterns_to", "goog.i18n.DateTimePatterns_to_TO", "goog.i18n.DateTimePatterns_tr_TR", "goog.i18n.DateTimePatterns_tzm", "goog.i18n.DateTimePatterns_tzm_Latn", "goog.i18n.DateTimePatterns_tzm_Latn_MA", "goog.i18n.DateTimePatterns_uk_UA", "goog.i18n.DateTimePatterns_ur_IN", "goog.i18n.DateTimePatterns_ur_PK", "goog.i18n.DateTimePatterns_uz", "goog.i18n.DateTimePatterns_uz_Arab", "goog.i18n.DateTimePatterns_uz_Arab_AF", "goog.i18n.DateTimePatterns_uz_Cyrl", "goog.i18n.DateTimePatterns_uz_Cyrl_UZ", "goog.i18n.DateTimePatterns_uz_Latn", "goog.i18n.DateTimePatterns_uz_Latn_UZ", "goog.i18n.DateTimePatterns_vi_VN", "goog.i18n.DateTimePatterns_vun", "goog.i18n.DateTimePatterns_vun_TZ", "goog.i18n.DateTimePatterns_xog", "goog.i18n.DateTimePatterns_xog_UG", "goog.i18n.DateTimePatterns_yo", "goog.i18n.DateTimePatterns_yo_NG", "goog.i18n.DateTimePatterns_zh_Hans", "goog.i18n.DateTimePatterns_zh_Hans_CN", "goog.i18n.DateTimePatterns_zh_Hans_HK", "goog.i18n.DateTimePatterns_zh_Hans_MO", "goog.i18n.DateTimePatterns_zh_Hans_SG", "goog.i18n.DateTimePatterns_zh_Hant", "goog.i18n.DateTimePatterns_zh_Hant_HK", "goog.i18n.DateTimePatterns_zh_Hant_MO", "goog.i18n.DateTimePatterns_zh_Hant_TW", "goog.i18n.DateTimePatterns_zu", "goog.i18n.DateTimePatterns_zu_ZA"], ["goog.i18n.DateTimePatterns"]);
goog.addDependency("/closure/goog/i18n/datetimesymbols.js", ["goog.i18n.DateTimeSymbols", "goog.i18n.DateTimeSymbols_am", "goog.i18n.DateTimeSymbols_ar", "goog.i18n.DateTimeSymbols_bg", "goog.i18n.DateTimeSymbols_bn", "goog.i18n.DateTimeSymbols_ca", "goog.i18n.DateTimeSymbols_cs", "goog.i18n.DateTimeSymbols_da", "goog.i18n.DateTimeSymbols_de", "goog.i18n.DateTimeSymbols_de_AT", "goog.i18n.DateTimeSymbols_de_CH", "goog.i18n.DateTimeSymbols_el", "goog.i18n.DateTimeSymbols_en", "goog.i18n.DateTimeSymbols_en_AU", "goog.i18n.DateTimeSymbols_en_GB", "goog.i18n.DateTimeSymbols_en_IE", "goog.i18n.DateTimeSymbols_en_IN", "goog.i18n.DateTimeSymbols_en_ISO", "goog.i18n.DateTimeSymbols_en_SG", "goog.i18n.DateTimeSymbols_en_US", "goog.i18n.DateTimeSymbols_en_ZA", "goog.i18n.DateTimeSymbols_es", "goog.i18n.DateTimeSymbols_es_419", "goog.i18n.DateTimeSymbols_et", "goog.i18n.DateTimeSymbols_eu", "goog.i18n.DateTimeSymbols_fa", "goog.i18n.DateTimeSymbols_fi", "goog.i18n.DateTimeSymbols_fil", "goog.i18n.DateTimeSymbols_fr", "goog.i18n.DateTimeSymbols_fr_CA", "goog.i18n.DateTimeSymbols_gl", "goog.i18n.DateTimeSymbols_gsw", "goog.i18n.DateTimeSymbols_gu", "goog.i18n.DateTimeSymbols_he", "goog.i18n.DateTimeSymbols_hi", "goog.i18n.DateTimeSymbols_hr", "goog.i18n.DateTimeSymbols_hu", "goog.i18n.DateTimeSymbols_id", "goog.i18n.DateTimeSymbols_in", "goog.i18n.DateTimeSymbols_is", "goog.i18n.DateTimeSymbols_it", "goog.i18n.DateTimeSymbols_iw", "goog.i18n.DateTimeSymbols_ja", "goog.i18n.DateTimeSymbols_kn", "goog.i18n.DateTimeSymbols_ko", "goog.i18n.DateTimeSymbols_ln", "goog.i18n.DateTimeSymbols_lt", "goog.i18n.DateTimeSymbols_lv", "goog.i18n.DateTimeSymbols_ml", "goog.i18n.DateTimeSymbols_mr", "goog.i18n.DateTimeSymbols_ms", "goog.i18n.DateTimeSymbols_mt", "goog.i18n.DateTimeSymbols_nl", "goog.i18n.DateTimeSymbols_no", "goog.i18n.DateTimeSymbols_or", "goog.i18n.DateTimeSymbols_pl", "goog.i18n.DateTimeSymbols_pt", "goog.i18n.DateTimeSymbols_pt_BR", "goog.i18n.DateTimeSymbols_pt_PT", "goog.i18n.DateTimeSymbols_ro", "goog.i18n.DateTimeSymbols_ru", "goog.i18n.DateTimeSymbols_sk", "goog.i18n.DateTimeSymbols_sl", "goog.i18n.DateTimeSymbols_sq", "goog.i18n.DateTimeSymbols_sr", "goog.i18n.DateTimeSymbols_sv", "goog.i18n.DateTimeSymbols_sw", "goog.i18n.DateTimeSymbols_ta", "goog.i18n.DateTimeSymbols_te", "goog.i18n.DateTimeSymbols_th", "goog.i18n.DateTimeSymbols_tl", "goog.i18n.DateTimeSymbols_tr", "goog.i18n.DateTimeSymbols_uk", "goog.i18n.DateTimeSymbols_ur", "goog.i18n.DateTimeSymbols_vi", "goog.i18n.DateTimeSymbols_zh", "goog.i18n.DateTimeSymbols_zh_CN", "goog.i18n.DateTimeSymbols_zh_HK", "goog.i18n.DateTimeSymbols_zh_TW"], []);
goog.addDependency("/closure/goog/i18n/datetimesymbolsext.js", ["goog.i18n.DateTimeSymbolsExt", "goog.i18n.DateTimeSymbols_aa", "goog.i18n.DateTimeSymbols_aa_DJ", "goog.i18n.DateTimeSymbols_aa_ER", "goog.i18n.DateTimeSymbols_aa_ET", "goog.i18n.DateTimeSymbols_af", "goog.i18n.DateTimeSymbols_af_NA", "goog.i18n.DateTimeSymbols_af_ZA", "goog.i18n.DateTimeSymbols_ak", "goog.i18n.DateTimeSymbols_ak_GH", "goog.i18n.DateTimeSymbols_am_ET", "goog.i18n.DateTimeSymbols_ar_AE", "goog.i18n.DateTimeSymbols_ar_BH", "goog.i18n.DateTimeSymbols_ar_DZ", "goog.i18n.DateTimeSymbols_ar_EG", "goog.i18n.DateTimeSymbols_ar_IQ", "goog.i18n.DateTimeSymbols_ar_JO", "goog.i18n.DateTimeSymbols_ar_KW", "goog.i18n.DateTimeSymbols_ar_LB", "goog.i18n.DateTimeSymbols_ar_LY", "goog.i18n.DateTimeSymbols_ar_MA", "goog.i18n.DateTimeSymbols_ar_OM", "goog.i18n.DateTimeSymbols_ar_QA", "goog.i18n.DateTimeSymbols_ar_SA", "goog.i18n.DateTimeSymbols_ar_SD", "goog.i18n.DateTimeSymbols_ar_SY", "goog.i18n.DateTimeSymbols_ar_TN", "goog.i18n.DateTimeSymbols_ar_YE", "goog.i18n.DateTimeSymbols_as", "goog.i18n.DateTimeSymbols_as_IN", "goog.i18n.DateTimeSymbols_asa", "goog.i18n.DateTimeSymbols_asa_TZ", "goog.i18n.DateTimeSymbols_az", "goog.i18n.DateTimeSymbols_az_Cyrl", "goog.i18n.DateTimeSymbols_az_Cyrl_AZ", "goog.i18n.DateTimeSymbols_az_Latn", "goog.i18n.DateTimeSymbols_az_Latn_AZ", "goog.i18n.DateTimeSymbols_be", "goog.i18n.DateTimeSymbols_be_BY", "goog.i18n.DateTimeSymbols_bem", "goog.i18n.DateTimeSymbols_bem_ZM", "goog.i18n.DateTimeSymbols_bez", "goog.i18n.DateTimeSymbols_bez_TZ", "goog.i18n.DateTimeSymbols_bg_BG", "goog.i18n.DateTimeSymbols_bm", "goog.i18n.DateTimeSymbols_bm_ML", "goog.i18n.DateTimeSymbols_bn_BD", "goog.i18n.DateTimeSymbols_bn_IN", "goog.i18n.DateTimeSymbols_bo", "goog.i18n.DateTimeSymbols_bo_CN", "goog.i18n.DateTimeSymbols_bo_IN", "goog.i18n.DateTimeSymbols_br", "goog.i18n.DateTimeSymbols_br_FR", "goog.i18n.DateTimeSymbols_brx", "goog.i18n.DateTimeSymbols_brx_IN", "goog.i18n.DateTimeSymbols_bs", "goog.i18n.DateTimeSymbols_bs_BA", "goog.i18n.DateTimeSymbols_byn", "goog.i18n.DateTimeSymbols_byn_ER", "goog.i18n.DateTimeSymbols_ca_ES", "goog.i18n.DateTimeSymbols_cch", "goog.i18n.DateTimeSymbols_cch_NG", "goog.i18n.DateTimeSymbols_cgg", "goog.i18n.DateTimeSymbols_cgg_UG", "goog.i18n.DateTimeSymbols_chr", "goog.i18n.DateTimeSymbols_chr_US", "goog.i18n.DateTimeSymbols_ckb", "goog.i18n.DateTimeSymbols_ckb_Arab", "goog.i18n.DateTimeSymbols_ckb_Arab_IQ", "goog.i18n.DateTimeSymbols_ckb_Arab_IR", "goog.i18n.DateTimeSymbols_ckb_IQ", "goog.i18n.DateTimeSymbols_ckb_IR", "goog.i18n.DateTimeSymbols_ckb_Latn", "goog.i18n.DateTimeSymbols_ckb_Latn_IQ", "goog.i18n.DateTimeSymbols_cs_CZ", "goog.i18n.DateTimeSymbols_cy", "goog.i18n.DateTimeSymbols_cy_GB", "goog.i18n.DateTimeSymbols_da_DK", "goog.i18n.DateTimeSymbols_dav", "goog.i18n.DateTimeSymbols_dav_KE", "goog.i18n.DateTimeSymbols_de_BE", "goog.i18n.DateTimeSymbols_de_DE", "goog.i18n.DateTimeSymbols_de_LI", "goog.i18n.DateTimeSymbols_de_LU", "goog.i18n.DateTimeSymbols_dz", "goog.i18n.DateTimeSymbols_dz_BT", "goog.i18n.DateTimeSymbols_ebu", "goog.i18n.DateTimeSymbols_ebu_KE", "goog.i18n.DateTimeSymbols_ee", "goog.i18n.DateTimeSymbols_ee_GH", "goog.i18n.DateTimeSymbols_ee_TG", "goog.i18n.DateTimeSymbols_el_CY", "goog.i18n.DateTimeSymbols_el_GR", "goog.i18n.DateTimeSymbols_el_POLYTON", "goog.i18n.DateTimeSymbols_en_AS", "goog.i18n.DateTimeSymbols_en_BE", "goog.i18n.DateTimeSymbols_en_BW", "goog.i18n.DateTimeSymbols_en_BZ", "goog.i18n.DateTimeSymbols_en_CA", "goog.i18n.DateTimeSymbols_en_Dsrt", "goog.i18n.DateTimeSymbols_en_Dsrt_US", "goog.i18n.DateTimeSymbols_en_GU", "goog.i18n.DateTimeSymbols_en_HK", "goog.i18n.DateTimeSymbols_en_JM", "goog.i18n.DateTimeSymbols_en_MH", "goog.i18n.DateTimeSymbols_en_MP", "goog.i18n.DateTimeSymbols_en_MT", "goog.i18n.DateTimeSymbols_en_MU", "goog.i18n.DateTimeSymbols_en_NA", "goog.i18n.DateTimeSymbols_en_NZ", "goog.i18n.DateTimeSymbols_en_PH", "goog.i18n.DateTimeSymbols_en_PK", "goog.i18n.DateTimeSymbols_en_Shaw", "goog.i18n.DateTimeSymbols_en_TT", "goog.i18n.DateTimeSymbols_en_UM", "goog.i18n.DateTimeSymbols_en_VI", "goog.i18n.DateTimeSymbols_en_ZW", "goog.i18n.DateTimeSymbols_eo", "goog.i18n.DateTimeSymbols_es_AR", "goog.i18n.DateTimeSymbols_es_BO", "goog.i18n.DateTimeSymbols_es_CL", "goog.i18n.DateTimeSymbols_es_CO", "goog.i18n.DateTimeSymbols_es_CR", "goog.i18n.DateTimeSymbols_es_DO", "goog.i18n.DateTimeSymbols_es_EC", "goog.i18n.DateTimeSymbols_es_ES", "goog.i18n.DateTimeSymbols_es_GQ", "goog.i18n.DateTimeSymbols_es_GT", "goog.i18n.DateTimeSymbols_es_HN", "goog.i18n.DateTimeSymbols_es_MX", "goog.i18n.DateTimeSymbols_es_NI", "goog.i18n.DateTimeSymbols_es_PA", "goog.i18n.DateTimeSymbols_es_PE", "goog.i18n.DateTimeSymbols_es_PR", "goog.i18n.DateTimeSymbols_es_PY", "goog.i18n.DateTimeSymbols_es_SV", "goog.i18n.DateTimeSymbols_es_US", "goog.i18n.DateTimeSymbols_es_UY", "goog.i18n.DateTimeSymbols_es_VE", "goog.i18n.DateTimeSymbols_et_EE", "goog.i18n.DateTimeSymbols_eu_ES", "goog.i18n.DateTimeSymbols_fa_AF", "goog.i18n.DateTimeSymbols_fa_IR", "goog.i18n.DateTimeSymbols_ff", "goog.i18n.DateTimeSymbols_ff_SN", "goog.i18n.DateTimeSymbols_fi_FI", "goog.i18n.DateTimeSymbols_fil_PH", "goog.i18n.DateTimeSymbols_fo", "goog.i18n.DateTimeSymbols_fo_FO", "goog.i18n.DateTimeSymbols_fr_BE", "goog.i18n.DateTimeSymbols_fr_BF", "goog.i18n.DateTimeSymbols_fr_BI", "goog.i18n.DateTimeSymbols_fr_BJ", "goog.i18n.DateTimeSymbols_fr_BL", "goog.i18n.DateTimeSymbols_fr_CD", "goog.i18n.DateTimeSymbols_fr_CF", "goog.i18n.DateTimeSymbols_fr_CG", "goog.i18n.DateTimeSymbols_fr_CH", "goog.i18n.DateTimeSymbols_fr_CI", "goog.i18n.DateTimeSymbols_fr_CM", "goog.i18n.DateTimeSymbols_fr_DJ", "goog.i18n.DateTimeSymbols_fr_FR", "goog.i18n.DateTimeSymbols_fr_GA", "goog.i18n.DateTimeSymbols_fr_GN", "goog.i18n.DateTimeSymbols_fr_GP", "goog.i18n.DateTimeSymbols_fr_GQ", "goog.i18n.DateTimeSymbols_fr_KM", "goog.i18n.DateTimeSymbols_fr_LU", "goog.i18n.DateTimeSymbols_fr_MC", "goog.i18n.DateTimeSymbols_fr_MF", "goog.i18n.DateTimeSymbols_fr_MG", "goog.i18n.DateTimeSymbols_fr_ML", "goog.i18n.DateTimeSymbols_fr_MQ", "goog.i18n.DateTimeSymbols_fr_NE", "goog.i18n.DateTimeSymbols_fr_RE", "goog.i18n.DateTimeSymbols_fr_RW", "goog.i18n.DateTimeSymbols_fr_SN", "goog.i18n.DateTimeSymbols_fr_TD", "goog.i18n.DateTimeSymbols_fr_TG", "goog.i18n.DateTimeSymbols_fur", "goog.i18n.DateTimeSymbols_fur_IT", "goog.i18n.DateTimeSymbols_ga", "goog.i18n.DateTimeSymbols_ga_IE", "goog.i18n.DateTimeSymbols_gaa", "goog.i18n.DateTimeSymbols_gaa_GH", "goog.i18n.DateTimeSymbols_gl_ES", "goog.i18n.DateTimeSymbols_gsw_CH", "goog.i18n.DateTimeSymbols_gu_IN", "goog.i18n.DateTimeSymbols_guz", "goog.i18n.DateTimeSymbols_guz_KE", "goog.i18n.DateTimeSymbols_gv", "goog.i18n.DateTimeSymbols_gv_GB", "goog.i18n.DateTimeSymbols_ha", "goog.i18n.DateTimeSymbols_ha_Latn", "goog.i18n.DateTimeSymbols_ha_Latn_GH", "goog.i18n.DateTimeSymbols_ha_Latn_NE", "goog.i18n.DateTimeSymbols_ha_Latn_NG", "goog.i18n.DateTimeSymbols_haw", "goog.i18n.DateTimeSymbols_haw_US", "goog.i18n.DateTimeSymbols_he_IL", "goog.i18n.DateTimeSymbols_hi_IN", "goog.i18n.DateTimeSymbols_hr_HR", "goog.i18n.DateTimeSymbols_hu_HU", "goog.i18n.DateTimeSymbols_hy", "goog.i18n.DateTimeSymbols_hy_AM", "goog.i18n.DateTimeSymbols_ia", "goog.i18n.DateTimeSymbols_id_ID", "goog.i18n.DateTimeSymbols_ig", "goog.i18n.DateTimeSymbols_ig_NG", "goog.i18n.DateTimeSymbols_ii", "goog.i18n.DateTimeSymbols_ii_CN", "goog.i18n.DateTimeSymbols_is_IS", "goog.i18n.DateTimeSymbols_it_CH", "goog.i18n.DateTimeSymbols_it_IT", "goog.i18n.DateTimeSymbols_ja_JP", "goog.i18n.DateTimeSymbols_jmc", "goog.i18n.DateTimeSymbols_jmc_TZ", "goog.i18n.DateTimeSymbols_ka", "goog.i18n.DateTimeSymbols_ka_GE", "goog.i18n.DateTimeSymbols_kab", "goog.i18n.DateTimeSymbols_kab_DZ", "goog.i18n.DateTimeSymbols_kaj", "goog.i18n.DateTimeSymbols_kaj_NG", "goog.i18n.DateTimeSymbols_kam", "goog.i18n.DateTimeSymbols_kam_KE", "goog.i18n.DateTimeSymbols_kcg", "goog.i18n.DateTimeSymbols_kcg_NG", "goog.i18n.DateTimeSymbols_kde", "goog.i18n.DateTimeSymbols_kde_TZ", "goog.i18n.DateTimeSymbols_kea", "goog.i18n.DateTimeSymbols_kea_CV", "goog.i18n.DateTimeSymbols_khq", "goog.i18n.DateTimeSymbols_khq_ML", "goog.i18n.DateTimeSymbols_ki", "goog.i18n.DateTimeSymbols_ki_KE", "goog.i18n.DateTimeSymbols_kk", "goog.i18n.DateTimeSymbols_kk_Cyrl", "goog.i18n.DateTimeSymbols_kk_Cyrl_KZ", "goog.i18n.DateTimeSymbols_kl", "goog.i18n.DateTimeSymbols_kl_GL", "goog.i18n.DateTimeSymbols_kln", "goog.i18n.DateTimeSymbols_kln_KE", "goog.i18n.DateTimeSymbols_km", "goog.i18n.DateTimeSymbols_km_KH", "goog.i18n.DateTimeSymbols_kn_IN", "goog.i18n.DateTimeSymbols_ko_KR", "goog.i18n.DateTimeSymbols_kok", "goog.i18n.DateTimeSymbols_kok_IN", "goog.i18n.DateTimeSymbols_ksb", "goog.i18n.DateTimeSymbols_ksb_TZ", "goog.i18n.DateTimeSymbols_ksh", "goog.i18n.DateTimeSymbols_ksh_DE", "goog.i18n.DateTimeSymbols_ku", "goog.i18n.DateTimeSymbols_ku_Arab", "goog.i18n.DateTimeSymbols_ku_Arab_IQ", "goog.i18n.DateTimeSymbols_ku_Arab_IR", "goog.i18n.DateTimeSymbols_ku_Latn", "goog.i18n.DateTimeSymbols_ku_Latn_SY", "goog.i18n.DateTimeSymbols_ku_Latn_TR", "goog.i18n.DateTimeSymbols_kw", "goog.i18n.DateTimeSymbols_kw_GB", "goog.i18n.DateTimeSymbols_ky", "goog.i18n.DateTimeSymbols_ky_KG", "goog.i18n.DateTimeSymbols_lag", "goog.i18n.DateTimeSymbols_lag_TZ", "goog.i18n.DateTimeSymbols_lg", "goog.i18n.DateTimeSymbols_lg_UG", "goog.i18n.DateTimeSymbols_ln_CD", "goog.i18n.DateTimeSymbols_ln_CG", "goog.i18n.DateTimeSymbols_lo", "goog.i18n.DateTimeSymbols_lo_LA", "goog.i18n.DateTimeSymbols_lt_LT", "goog.i18n.DateTimeSymbols_luo", "goog.i18n.DateTimeSymbols_luo_KE", "goog.i18n.DateTimeSymbols_luy", "goog.i18n.DateTimeSymbols_luy_KE", "goog.i18n.DateTimeSymbols_lv_LV", "goog.i18n.DateTimeSymbols_mas", "goog.i18n.DateTimeSymbols_mas_KE", "goog.i18n.DateTimeSymbols_mas_TZ", "goog.i18n.DateTimeSymbols_mer", "goog.i18n.DateTimeSymbols_mer_KE", "goog.i18n.DateTimeSymbols_mfe", "goog.i18n.DateTimeSymbols_mfe_MU", "goog.i18n.DateTimeSymbols_mg", "goog.i18n.DateTimeSymbols_mg_MG", "goog.i18n.DateTimeSymbols_mk", "goog.i18n.DateTimeSymbols_mk_MK", "goog.i18n.DateTimeSymbols_ml_IN", "goog.i18n.DateTimeSymbols_mn", "goog.i18n.DateTimeSymbols_mn_Cyrl", "goog.i18n.DateTimeSymbols_mn_Cyrl_MN", "goog.i18n.DateTimeSymbols_mn_Mong", "goog.i18n.DateTimeSymbols_mn_Mong_CN", "goog.i18n.DateTimeSymbols_mr_IN", "goog.i18n.DateTimeSymbols_ms_BN", "goog.i18n.DateTimeSymbols_ms_MY", "goog.i18n.DateTimeSymbols_mt_MT", "goog.i18n.DateTimeSymbols_my", "goog.i18n.DateTimeSymbols_my_MM", "goog.i18n.DateTimeSymbols_naq", "goog.i18n.DateTimeSymbols_naq_NA", "goog.i18n.DateTimeSymbols_nb", "goog.i18n.DateTimeSymbols_nb_NO", "goog.i18n.DateTimeSymbols_nd", "goog.i18n.DateTimeSymbols_nd_ZW", "goog.i18n.DateTimeSymbols_nds", "goog.i18n.DateTimeSymbols_nds_DE", "goog.i18n.DateTimeSymbols_ne", "goog.i18n.DateTimeSymbols_ne_IN", "goog.i18n.DateTimeSymbols_ne_NP", "goog.i18n.DateTimeSymbols_nl_BE", "goog.i18n.DateTimeSymbols_nl_NL", "goog.i18n.DateTimeSymbols_nn", "goog.i18n.DateTimeSymbols_nn_NO", "goog.i18n.DateTimeSymbols_nr", "goog.i18n.DateTimeSymbols_nr_ZA", "goog.i18n.DateTimeSymbols_nso", "goog.i18n.DateTimeSymbols_nso_ZA", "goog.i18n.DateTimeSymbols_nyn", "goog.i18n.DateTimeSymbols_nyn_UG", "goog.i18n.DateTimeSymbols_oc", "goog.i18n.DateTimeSymbols_oc_FR", "goog.i18n.DateTimeSymbols_om", "goog.i18n.DateTimeSymbols_om_ET", "goog.i18n.DateTimeSymbols_om_KE", "goog.i18n.DateTimeSymbols_or_IN", "goog.i18n.DateTimeSymbols_pa", "goog.i18n.DateTimeSymbols_pa_Arab", "goog.i18n.DateTimeSymbols_pa_Arab_PK", "goog.i18n.DateTimeSymbols_pa_Guru", "goog.i18n.DateTimeSymbols_pa_Guru_IN", "goog.i18n.DateTimeSymbols_pl_PL", "goog.i18n.DateTimeSymbols_ps", "goog.i18n.DateTimeSymbols_ps_AF", "goog.i18n.DateTimeSymbols_pt_AO", "goog.i18n.DateTimeSymbols_pt_GW", "goog.i18n.DateTimeSymbols_pt_MZ", "goog.i18n.DateTimeSymbols_rm", "goog.i18n.DateTimeSymbols_rm_CH", "goog.i18n.DateTimeSymbols_ro_MD", "goog.i18n.DateTimeSymbols_ro_RO", "goog.i18n.DateTimeSymbols_rof", "goog.i18n.DateTimeSymbols_rof_TZ", "goog.i18n.DateTimeSymbols_ru_MD", "goog.i18n.DateTimeSymbols_ru_RU", "goog.i18n.DateTimeSymbols_ru_UA", "goog.i18n.DateTimeSymbols_rw", "goog.i18n.DateTimeSymbols_rw_RW", "goog.i18n.DateTimeSymbols_rwk", "goog.i18n.DateTimeSymbols_rwk_TZ", "goog.i18n.DateTimeSymbols_saq", "goog.i18n.DateTimeSymbols_saq_KE", "goog.i18n.DateTimeSymbols_se", "goog.i18n.DateTimeSymbols_se_FI", "goog.i18n.DateTimeSymbols_se_NO", "goog.i18n.DateTimeSymbols_seh", "goog.i18n.DateTimeSymbols_seh_MZ", "goog.i18n.DateTimeSymbols_ses", "goog.i18n.DateTimeSymbols_ses_ML", "goog.i18n.DateTimeSymbols_sg", "goog.i18n.DateTimeSymbols_sg_CF", "goog.i18n.DateTimeSymbols_shi", "goog.i18n.DateTimeSymbols_shi_Latn", "goog.i18n.DateTimeSymbols_shi_Latn_MA", "goog.i18n.DateTimeSymbols_shi_Tfng", "goog.i18n.DateTimeSymbols_shi_Tfng_MA", "goog.i18n.DateTimeSymbols_si", "goog.i18n.DateTimeSymbols_si_LK", "goog.i18n.DateTimeSymbols_sid", "goog.i18n.DateTimeSymbols_sid_ET", "goog.i18n.DateTimeSymbols_sk_SK", "goog.i18n.DateTimeSymbols_sl_SI", "goog.i18n.DateTimeSymbols_sn", "goog.i18n.DateTimeSymbols_sn_ZW", "goog.i18n.DateTimeSymbols_so", "goog.i18n.DateTimeSymbols_so_DJ", "goog.i18n.DateTimeSymbols_so_ET", "goog.i18n.DateTimeSymbols_so_KE", "goog.i18n.DateTimeSymbols_so_SO", "goog.i18n.DateTimeSymbols_sq_AL", "goog.i18n.DateTimeSymbols_sr_Cyrl", "goog.i18n.DateTimeSymbols_sr_Cyrl_BA", "goog.i18n.DateTimeSymbols_sr_Cyrl_ME", "goog.i18n.DateTimeSymbols_sr_Cyrl_RS", "goog.i18n.DateTimeSymbols_sr_Latn", "goog.i18n.DateTimeSymbols_sr_Latn_BA", "goog.i18n.DateTimeSymbols_sr_Latn_ME", "goog.i18n.DateTimeSymbols_sr_Latn_RS", "goog.i18n.DateTimeSymbols_ss", "goog.i18n.DateTimeSymbols_ss_SZ", "goog.i18n.DateTimeSymbols_ss_ZA", "goog.i18n.DateTimeSymbols_ssy", "goog.i18n.DateTimeSymbols_ssy_ER", "goog.i18n.DateTimeSymbols_st", "goog.i18n.DateTimeSymbols_st_LS", "goog.i18n.DateTimeSymbols_st_ZA", "goog.i18n.DateTimeSymbols_sv_FI", "goog.i18n.DateTimeSymbols_sv_SE", "goog.i18n.DateTimeSymbols_sw_KE", "goog.i18n.DateTimeSymbols_sw_TZ", "goog.i18n.DateTimeSymbols_ta_IN", "goog.i18n.DateTimeSymbols_ta_LK", "goog.i18n.DateTimeSymbols_te_IN", "goog.i18n.DateTimeSymbols_teo", "goog.i18n.DateTimeSymbols_teo_KE", "goog.i18n.DateTimeSymbols_teo_UG", "goog.i18n.DateTimeSymbols_tg", "goog.i18n.DateTimeSymbols_tg_Cyrl", "goog.i18n.DateTimeSymbols_tg_Cyrl_TJ", "goog.i18n.DateTimeSymbols_th_TH", "goog.i18n.DateTimeSymbols_ti", "goog.i18n.DateTimeSymbols_ti_ER", "goog.i18n.DateTimeSymbols_ti_ET", "goog.i18n.DateTimeSymbols_tig", "goog.i18n.DateTimeSymbols_tig_ER", "goog.i18n.DateTimeSymbols_tn", "goog.i18n.DateTimeSymbols_tn_ZA", "goog.i18n.DateTimeSymbols_to", "goog.i18n.DateTimeSymbols_to_TO", "goog.i18n.DateTimeSymbols_tr_TR", "goog.i18n.DateTimeSymbols_trv", "goog.i18n.DateTimeSymbols_trv_TW", "goog.i18n.DateTimeSymbols_ts", "goog.i18n.DateTimeSymbols_ts_ZA", "goog.i18n.DateTimeSymbols_tzm", "goog.i18n.DateTimeSymbols_tzm_Latn", "goog.i18n.DateTimeSymbols_tzm_Latn_MA", "goog.i18n.DateTimeSymbols_uk_UA", "goog.i18n.DateTimeSymbols_ur_IN", "goog.i18n.DateTimeSymbols_ur_PK", "goog.i18n.DateTimeSymbols_uz", "goog.i18n.DateTimeSymbols_uz_Arab", "goog.i18n.DateTimeSymbols_uz_Arab_AF", "goog.i18n.DateTimeSymbols_uz_Cyrl", "goog.i18n.DateTimeSymbols_uz_Cyrl_UZ", "goog.i18n.DateTimeSymbols_uz_Latn", "goog.i18n.DateTimeSymbols_uz_Latn_UZ", "goog.i18n.DateTimeSymbols_ve", "goog.i18n.DateTimeSymbols_ve_ZA", "goog.i18n.DateTimeSymbols_vi_VN", "goog.i18n.DateTimeSymbols_vun", "goog.i18n.DateTimeSymbols_vun_TZ", "goog.i18n.DateTimeSymbols_wal", "goog.i18n.DateTimeSymbols_wal_ET", "goog.i18n.DateTimeSymbols_xh", "goog.i18n.DateTimeSymbols_xh_ZA", "goog.i18n.DateTimeSymbols_xog", "goog.i18n.DateTimeSymbols_xog_UG", "goog.i18n.DateTimeSymbols_yo", "goog.i18n.DateTimeSymbols_yo_NG", "goog.i18n.DateTimeSymbols_zh_Hans", "goog.i18n.DateTimeSymbols_zh_Hans_CN", "goog.i18n.DateTimeSymbols_zh_Hans_HK", "goog.i18n.DateTimeSymbols_zh_Hans_MO", "goog.i18n.DateTimeSymbols_zh_Hans_SG", "goog.i18n.DateTimeSymbols_zh_Hant", "goog.i18n.DateTimeSymbols_zh_Hant_HK", "goog.i18n.DateTimeSymbols_zh_Hant_MO", "goog.i18n.DateTimeSymbols_zh_Hant_TW", "goog.i18n.DateTimeSymbols_zu", "goog.i18n.DateTimeSymbols_zu_ZA"], ["goog.i18n.DateTimeSymbols"]);
goog.addDependency("/closure/goog/i18n/graphemebreak.js", ["goog.i18n.GraphemeBreak"], ["goog.structs.InversionMap"]);
goog.addDependency("/closure/goog/i18n/messageformat.js", ["goog.i18n.MessageFormat"], ["goog.asserts", "goog.i18n.NumberFormat", "goog.i18n.pluralRules"]);
goog.addDependency("/closure/goog/i18n/mime.js", ["goog.i18n.mime", "goog.i18n.mime.encode"], []);
goog.addDependency("/closure/goog/i18n/numberformat.js", ["goog.i18n.NumberFormat", "goog.i18n.NumberFormat.CurrencyStyle", "goog.i18n.NumberFormat.Format"], ["goog.i18n.NumberFormatSymbols", "goog.i18n.currency"]);
goog.addDependency("/closure/goog/i18n/numberformatsymbols.js", ["goog.i18n.NumberFormatSymbols", "goog.i18n.NumberFormatSymbols_am", "goog.i18n.NumberFormatSymbols_am_ET", "goog.i18n.NumberFormatSymbols_ar", "goog.i18n.NumberFormatSymbols_ar_EG", "goog.i18n.NumberFormatSymbols_bg", "goog.i18n.NumberFormatSymbols_bg_BG", "goog.i18n.NumberFormatSymbols_bn", "goog.i18n.NumberFormatSymbols_bn_BD", "goog.i18n.NumberFormatSymbols_ca", "goog.i18n.NumberFormatSymbols_ca_ES", "goog.i18n.NumberFormatSymbols_cs", "goog.i18n.NumberFormatSymbols_cs_CZ", "goog.i18n.NumberFormatSymbols_da", "goog.i18n.NumberFormatSymbols_da_DK", "goog.i18n.NumberFormatSymbols_de", "goog.i18n.NumberFormatSymbols_de_AT", "goog.i18n.NumberFormatSymbols_de_BE", "goog.i18n.NumberFormatSymbols_de_CH", "goog.i18n.NumberFormatSymbols_de_DE", "goog.i18n.NumberFormatSymbols_de_LU", "goog.i18n.NumberFormatSymbols_el", "goog.i18n.NumberFormatSymbols_el_GR", "goog.i18n.NumberFormatSymbols_el_POLYTON", "goog.i18n.NumberFormatSymbols_en", "goog.i18n.NumberFormatSymbols_en_AS", "goog.i18n.NumberFormatSymbols_en_AU", "goog.i18n.NumberFormatSymbols_en_Dsrt", "goog.i18n.NumberFormatSymbols_en_Dsrt_US", "goog.i18n.NumberFormatSymbols_en_GB", "goog.i18n.NumberFormatSymbols_en_GU", "goog.i18n.NumberFormatSymbols_en_IE", "goog.i18n.NumberFormatSymbols_en_IN", "goog.i18n.NumberFormatSymbols_en_MH", "goog.i18n.NumberFormatSymbols_en_MP", "goog.i18n.NumberFormatSymbols_en_SG", "goog.i18n.NumberFormatSymbols_en_UM", "goog.i18n.NumberFormatSymbols_en_US", "goog.i18n.NumberFormatSymbols_en_VI", "goog.i18n.NumberFormatSymbols_en_ZA", "goog.i18n.NumberFormatSymbols_es", "goog.i18n.NumberFormatSymbols_es_ES", "goog.i18n.NumberFormatSymbols_et", "goog.i18n.NumberFormatSymbols_et_EE", "goog.i18n.NumberFormatSymbols_eu", "goog.i18n.NumberFormatSymbols_eu_ES", "goog.i18n.NumberFormatSymbols_fa", "goog.i18n.NumberFormatSymbols_fa_IR", "goog.i18n.NumberFormatSymbols_fi", "goog.i18n.NumberFormatSymbols_fi_FI", "goog.i18n.NumberFormatSymbols_fil", "goog.i18n.NumberFormatSymbols_fil_PH", "goog.i18n.NumberFormatSymbols_fr", "goog.i18n.NumberFormatSymbols_fr_BL", "goog.i18n.NumberFormatSymbols_fr_CA", "goog.i18n.NumberFormatSymbols_fr_FR", "goog.i18n.NumberFormatSymbols_fr_GF", "goog.i18n.NumberFormatSymbols_fr_GP", "goog.i18n.NumberFormatSymbols_fr_MC", "goog.i18n.NumberFormatSymbols_fr_MF", "goog.i18n.NumberFormatSymbols_fr_MQ", "goog.i18n.NumberFormatSymbols_fr_RE", "goog.i18n.NumberFormatSymbols_fr_YT", "goog.i18n.NumberFormatSymbols_gl", "goog.i18n.NumberFormatSymbols_gl_ES", "goog.i18n.NumberFormatSymbols_gsw", "goog.i18n.NumberFormatSymbols_gsw_CH", "goog.i18n.NumberFormatSymbols_gu", "goog.i18n.NumberFormatSymbols_gu_IN", "goog.i18n.NumberFormatSymbols_he", "goog.i18n.NumberFormatSymbols_he_IL", "goog.i18n.NumberFormatSymbols_hi", "goog.i18n.NumberFormatSymbols_hi_IN", "goog.i18n.NumberFormatSymbols_hr", "goog.i18n.NumberFormatSymbols_hr_HR", "goog.i18n.NumberFormatSymbols_hu", "goog.i18n.NumberFormatSymbols_hu_HU", "goog.i18n.NumberFormatSymbols_id", "goog.i18n.NumberFormatSymbols_id_ID", "goog.i18n.NumberFormatSymbols_in", "goog.i18n.NumberFormatSymbols_is", "goog.i18n.NumberFormatSymbols_is_IS", "goog.i18n.NumberFormatSymbols_it", "goog.i18n.NumberFormatSymbols_it_IT", "goog.i18n.NumberFormatSymbols_iw", "goog.i18n.NumberFormatSymbols_ja", "goog.i18n.NumberFormatSymbols_ja_JP", "goog.i18n.NumberFormatSymbols_kn", "goog.i18n.NumberFormatSymbols_kn_IN", "goog.i18n.NumberFormatSymbols_ko", "goog.i18n.NumberFormatSymbols_ko_KR", "goog.i18n.NumberFormatSymbols_ln", "goog.i18n.NumberFormatSymbols_ln_CD", "goog.i18n.NumberFormatSymbols_lt", "goog.i18n.NumberFormatSymbols_lt_LT", "goog.i18n.NumberFormatSymbols_lv", "goog.i18n.NumberFormatSymbols_lv_LV", "goog.i18n.NumberFormatSymbols_ml", "goog.i18n.NumberFormatSymbols_ml_IN", "goog.i18n.NumberFormatSymbols_mr", "goog.i18n.NumberFormatSymbols_mr_IN", "goog.i18n.NumberFormatSymbols_ms", "goog.i18n.NumberFormatSymbols_ms_MY", "goog.i18n.NumberFormatSymbols_mt", "goog.i18n.NumberFormatSymbols_mt_MT", "goog.i18n.NumberFormatSymbols_nl", "goog.i18n.NumberFormatSymbols_nl_NL", "goog.i18n.NumberFormatSymbols_no", "goog.i18n.NumberFormatSymbols_or", "goog.i18n.NumberFormatSymbols_or_IN", "goog.i18n.NumberFormatSymbols_pl", "goog.i18n.NumberFormatSymbols_pl_PL", "goog.i18n.NumberFormatSymbols_pt", "goog.i18n.NumberFormatSymbols_pt_BR", "goog.i18n.NumberFormatSymbols_pt_PT", "goog.i18n.NumberFormatSymbols_ro", "goog.i18n.NumberFormatSymbols_ro_RO", "goog.i18n.NumberFormatSymbols_ru", "goog.i18n.NumberFormatSymbols_ru_RU", "goog.i18n.NumberFormatSymbols_sk", "goog.i18n.NumberFormatSymbols_sk_SK", "goog.i18n.NumberFormatSymbols_sl", "goog.i18n.NumberFormatSymbols_sl_SI", "goog.i18n.NumberFormatSymbols_sq", "goog.i18n.NumberFormatSymbols_sq_AL", "goog.i18n.NumberFormatSymbols_sr", "goog.i18n.NumberFormatSymbols_sr_Cyrl_RS", "goog.i18n.NumberFormatSymbols_sr_Latn_RS", "goog.i18n.NumberFormatSymbols_sv", "goog.i18n.NumberFormatSymbols_sv_SE", "goog.i18n.NumberFormatSymbols_sw", "goog.i18n.NumberFormatSymbols_sw_TZ", "goog.i18n.NumberFormatSymbols_ta", "goog.i18n.NumberFormatSymbols_ta_IN", "goog.i18n.NumberFormatSymbols_te", "goog.i18n.NumberFormatSymbols_te_IN", "goog.i18n.NumberFormatSymbols_th", "goog.i18n.NumberFormatSymbols_th_TH", "goog.i18n.NumberFormatSymbols_tl", "goog.i18n.NumberFormatSymbols_tr", "goog.i18n.NumberFormatSymbols_tr_TR", "goog.i18n.NumberFormatSymbols_uk", "goog.i18n.NumberFormatSymbols_uk_UA", "goog.i18n.NumberFormatSymbols_ur", "goog.i18n.NumberFormatSymbols_ur_PK", "goog.i18n.NumberFormatSymbols_vi", "goog.i18n.NumberFormatSymbols_vi_VN", "goog.i18n.NumberFormatSymbols_zh", "goog.i18n.NumberFormatSymbols_zh_CN", "goog.i18n.NumberFormatSymbols_zh_HK", "goog.i18n.NumberFormatSymbols_zh_Hans", "goog.i18n.NumberFormatSymbols_zh_Hans_CN", "goog.i18n.NumberFormatSymbols_zh_TW"], []);
goog.addDependency("/closure/goog/i18n/numberformatsymbolsext.js", ["goog.i18n.NumberFormatSymbolsExt", "goog.i18n.NumberFormatSymbols_aa", "goog.i18n.NumberFormatSymbols_aa_DJ", "goog.i18n.NumberFormatSymbols_aa_ER", "goog.i18n.NumberFormatSymbols_aa_ET", "goog.i18n.NumberFormatSymbols_af", "goog.i18n.NumberFormatSymbols_af_NA", "goog.i18n.NumberFormatSymbols_af_ZA", "goog.i18n.NumberFormatSymbols_agq", "goog.i18n.NumberFormatSymbols_agq_CM", "goog.i18n.NumberFormatSymbols_ak", "goog.i18n.NumberFormatSymbols_ak_GH", "goog.i18n.NumberFormatSymbols_ar_AE", "goog.i18n.NumberFormatSymbols_ar_BH", "goog.i18n.NumberFormatSymbols_ar_DZ", "goog.i18n.NumberFormatSymbols_ar_IQ", "goog.i18n.NumberFormatSymbols_ar_JO", "goog.i18n.NumberFormatSymbols_ar_KW", "goog.i18n.NumberFormatSymbols_ar_LB", "goog.i18n.NumberFormatSymbols_ar_LY", "goog.i18n.NumberFormatSymbols_ar_MA", "goog.i18n.NumberFormatSymbols_ar_OM", "goog.i18n.NumberFormatSymbols_ar_QA", "goog.i18n.NumberFormatSymbols_ar_SA", "goog.i18n.NumberFormatSymbols_ar_SD", "goog.i18n.NumberFormatSymbols_ar_SY", "goog.i18n.NumberFormatSymbols_ar_TN", "goog.i18n.NumberFormatSymbols_ar_YE", "goog.i18n.NumberFormatSymbols_as", "goog.i18n.NumberFormatSymbols_as_IN", "goog.i18n.NumberFormatSymbols_asa", "goog.i18n.NumberFormatSymbols_asa_TZ", "goog.i18n.NumberFormatSymbols_az", "goog.i18n.NumberFormatSymbols_az_Cyrl", "goog.i18n.NumberFormatSymbols_az_Cyrl_AZ", "goog.i18n.NumberFormatSymbols_az_Latn", "goog.i18n.NumberFormatSymbols_az_Latn_AZ", "goog.i18n.NumberFormatSymbols_bas", "goog.i18n.NumberFormatSymbols_bas_CM", "goog.i18n.NumberFormatSymbols_be", "goog.i18n.NumberFormatSymbols_be_BY", "goog.i18n.NumberFormatSymbols_bem", "goog.i18n.NumberFormatSymbols_bem_ZM", "goog.i18n.NumberFormatSymbols_bez", "goog.i18n.NumberFormatSymbols_bez_TZ", "goog.i18n.NumberFormatSymbols_bm", "goog.i18n.NumberFormatSymbols_bm_ML", "goog.i18n.NumberFormatSymbols_bn_IN", "goog.i18n.NumberFormatSymbols_bo", "goog.i18n.NumberFormatSymbols_bo_CN", "goog.i18n.NumberFormatSymbols_bo_IN", "goog.i18n.NumberFormatSymbols_br", "goog.i18n.NumberFormatSymbols_br_FR", "goog.i18n.NumberFormatSymbols_brx", "goog.i18n.NumberFormatSymbols_brx_IN", "goog.i18n.NumberFormatSymbols_bs", "goog.i18n.NumberFormatSymbols_bs_BA", "goog.i18n.NumberFormatSymbols_byn", "goog.i18n.NumberFormatSymbols_byn_ER", "goog.i18n.NumberFormatSymbols_cch", "goog.i18n.NumberFormatSymbols_cch_NG", "goog.i18n.NumberFormatSymbols_cgg", "goog.i18n.NumberFormatSymbols_cgg_UG", "goog.i18n.NumberFormatSymbols_chr", "goog.i18n.NumberFormatSymbols_chr_US", "goog.i18n.NumberFormatSymbols_ckb", "goog.i18n.NumberFormatSymbols_ckb_Arab", "goog.i18n.NumberFormatSymbols_ckb_Arab_IQ", "goog.i18n.NumberFormatSymbols_ckb_Arab_IR", "goog.i18n.NumberFormatSymbols_ckb_IQ", "goog.i18n.NumberFormatSymbols_ckb_IR", "goog.i18n.NumberFormatSymbols_ckb_Latn", "goog.i18n.NumberFormatSymbols_ckb_Latn_IQ", "goog.i18n.NumberFormatSymbols_cy", "goog.i18n.NumberFormatSymbols_cy_GB", "goog.i18n.NumberFormatSymbols_dav", "goog.i18n.NumberFormatSymbols_dav_KE", "goog.i18n.NumberFormatSymbols_de_LI", "goog.i18n.NumberFormatSymbols_dje", "goog.i18n.NumberFormatSymbols_dje_NE", "goog.i18n.NumberFormatSymbols_dua", "goog.i18n.NumberFormatSymbols_dua_CM", "goog.i18n.NumberFormatSymbols_dyo", "goog.i18n.NumberFormatSymbols_dyo_SN", "goog.i18n.NumberFormatSymbols_dz", "goog.i18n.NumberFormatSymbols_dz_BT", "goog.i18n.NumberFormatSymbols_ebu", "goog.i18n.NumberFormatSymbols_ebu_KE", "goog.i18n.NumberFormatSymbols_ee", "goog.i18n.NumberFormatSymbols_ee_GH", "goog.i18n.NumberFormatSymbols_ee_TG", "goog.i18n.NumberFormatSymbols_el_CY", "goog.i18n.NumberFormatSymbols_en_BB", "goog.i18n.NumberFormatSymbols_en_BE", "goog.i18n.NumberFormatSymbols_en_BM", "goog.i18n.NumberFormatSymbols_en_BW", "goog.i18n.NumberFormatSymbols_en_BZ", "goog.i18n.NumberFormatSymbols_en_CA", "goog.i18n.NumberFormatSymbols_en_GY", "goog.i18n.NumberFormatSymbols_en_HK", "goog.i18n.NumberFormatSymbols_en_JM", "goog.i18n.NumberFormatSymbols_en_MT", "goog.i18n.NumberFormatSymbols_en_MU", "goog.i18n.NumberFormatSymbols_en_NA", "goog.i18n.NumberFormatSymbols_en_NZ", "goog.i18n.NumberFormatSymbols_en_PH", "goog.i18n.NumberFormatSymbols_en_PK", "goog.i18n.NumberFormatSymbols_en_Shaw", "goog.i18n.NumberFormatSymbols_en_TT", "goog.i18n.NumberFormatSymbols_en_ZW", "goog.i18n.NumberFormatSymbols_eo", "goog.i18n.NumberFormatSymbols_es_419", "goog.i18n.NumberFormatSymbols_es_AR", "goog.i18n.NumberFormatSymbols_es_BO", "goog.i18n.NumberFormatSymbols_es_CL", "goog.i18n.NumberFormatSymbols_es_CO", "goog.i18n.NumberFormatSymbols_es_CR", "goog.i18n.NumberFormatSymbols_es_DO", "goog.i18n.NumberFormatSymbols_es_EC", "goog.i18n.NumberFormatSymbols_es_GQ", "goog.i18n.NumberFormatSymbols_es_GT", "goog.i18n.NumberFormatSymbols_es_HN", "goog.i18n.NumberFormatSymbols_es_MX", "goog.i18n.NumberFormatSymbols_es_NI", "goog.i18n.NumberFormatSymbols_es_PA", "goog.i18n.NumberFormatSymbols_es_PE", "goog.i18n.NumberFormatSymbols_es_PR", "goog.i18n.NumberFormatSymbols_es_PY", "goog.i18n.NumberFormatSymbols_es_SV", "goog.i18n.NumberFormatSymbols_es_US", "goog.i18n.NumberFormatSymbols_es_UY", "goog.i18n.NumberFormatSymbols_es_VE", "goog.i18n.NumberFormatSymbols_ewo", "goog.i18n.NumberFormatSymbols_ewo_CM", "goog.i18n.NumberFormatSymbols_fa_AF", "goog.i18n.NumberFormatSymbols_ff", "goog.i18n.NumberFormatSymbols_ff_SN", "goog.i18n.NumberFormatSymbols_fo", "goog.i18n.NumberFormatSymbols_fo_FO", "goog.i18n.NumberFormatSymbols_fr_BE", "goog.i18n.NumberFormatSymbols_fr_BF", "goog.i18n.NumberFormatSymbols_fr_BI", "goog.i18n.NumberFormatSymbols_fr_BJ", "goog.i18n.NumberFormatSymbols_fr_CD", "goog.i18n.NumberFormatSymbols_fr_CF", "goog.i18n.NumberFormatSymbols_fr_CG", "goog.i18n.NumberFormatSymbols_fr_CH", "goog.i18n.NumberFormatSymbols_fr_CI", "goog.i18n.NumberFormatSymbols_fr_CM", "goog.i18n.NumberFormatSymbols_fr_DJ", "goog.i18n.NumberFormatSymbols_fr_GA", "goog.i18n.NumberFormatSymbols_fr_GN", "goog.i18n.NumberFormatSymbols_fr_GQ", "goog.i18n.NumberFormatSymbols_fr_KM", "goog.i18n.NumberFormatSymbols_fr_LU", "goog.i18n.NumberFormatSymbols_fr_MG", "goog.i18n.NumberFormatSymbols_fr_ML", "goog.i18n.NumberFormatSymbols_fr_NE", "goog.i18n.NumberFormatSymbols_fr_RW", "goog.i18n.NumberFormatSymbols_fr_SN", "goog.i18n.NumberFormatSymbols_fr_TD", "goog.i18n.NumberFormatSymbols_fr_TG", "goog.i18n.NumberFormatSymbols_fur", "goog.i18n.NumberFormatSymbols_fur_IT", "goog.i18n.NumberFormatSymbols_ga", "goog.i18n.NumberFormatSymbols_ga_IE", "goog.i18n.NumberFormatSymbols_gaa", "goog.i18n.NumberFormatSymbols_gaa_GH", "goog.i18n.NumberFormatSymbols_guz", "goog.i18n.NumberFormatSymbols_guz_KE", "goog.i18n.NumberFormatSymbols_gv", "goog.i18n.NumberFormatSymbols_gv_GB", "goog.i18n.NumberFormatSymbols_ha", "goog.i18n.NumberFormatSymbols_ha_Latn", "goog.i18n.NumberFormatSymbols_ha_Latn_GH", "goog.i18n.NumberFormatSymbols_ha_Latn_NE", "goog.i18n.NumberFormatSymbols_ha_Latn_NG", "goog.i18n.NumberFormatSymbols_haw", "goog.i18n.NumberFormatSymbols_haw_US", "goog.i18n.NumberFormatSymbols_hy", "goog.i18n.NumberFormatSymbols_hy_AM", "goog.i18n.NumberFormatSymbols_ia", "goog.i18n.NumberFormatSymbols_ig", "goog.i18n.NumberFormatSymbols_ig_NG", "goog.i18n.NumberFormatSymbols_ii", "goog.i18n.NumberFormatSymbols_ii_CN", "goog.i18n.NumberFormatSymbols_it_CH", "goog.i18n.NumberFormatSymbols_jmc", "goog.i18n.NumberFormatSymbols_jmc_TZ", "goog.i18n.NumberFormatSymbols_ka", "goog.i18n.NumberFormatSymbols_ka_GE", "goog.i18n.NumberFormatSymbols_kab", "goog.i18n.NumberFormatSymbols_kab_DZ", "goog.i18n.NumberFormatSymbols_kaj", "goog.i18n.NumberFormatSymbols_kaj_NG", "goog.i18n.NumberFormatSymbols_kam", "goog.i18n.NumberFormatSymbols_kam_KE", "goog.i18n.NumberFormatSymbols_kcg", "goog.i18n.NumberFormatSymbols_kcg_NG", "goog.i18n.NumberFormatSymbols_kde", "goog.i18n.NumberFormatSymbols_kde_TZ", "goog.i18n.NumberFormatSymbols_kea", "goog.i18n.NumberFormatSymbols_kea_CV", "goog.i18n.NumberFormatSymbols_khq", "goog.i18n.NumberFormatSymbols_khq_ML", "goog.i18n.NumberFormatSymbols_ki", "goog.i18n.NumberFormatSymbols_ki_KE", "goog.i18n.NumberFormatSymbols_kk", "goog.i18n.NumberFormatSymbols_kk_Cyrl", "goog.i18n.NumberFormatSymbols_kk_Cyrl_KZ", "goog.i18n.NumberFormatSymbols_kl", "goog.i18n.NumberFormatSymbols_kl_GL", "goog.i18n.NumberFormatSymbols_kln", "goog.i18n.NumberFormatSymbols_kln_KE", "goog.i18n.NumberFormatSymbols_km", "goog.i18n.NumberFormatSymbols_km_KH", "goog.i18n.NumberFormatSymbols_kok", "goog.i18n.NumberFormatSymbols_kok_IN", "goog.i18n.NumberFormatSymbols_ksb", "goog.i18n.NumberFormatSymbols_ksb_TZ", "goog.i18n.NumberFormatSymbols_ksf", "goog.i18n.NumberFormatSymbols_ksf_CM", "goog.i18n.NumberFormatSymbols_ksh", "goog.i18n.NumberFormatSymbols_ksh_DE", "goog.i18n.NumberFormatSymbols_ku", "goog.i18n.NumberFormatSymbols_ku_Arab", "goog.i18n.NumberFormatSymbols_ku_Arab_IQ", "goog.i18n.NumberFormatSymbols_ku_Arab_IR", "goog.i18n.NumberFormatSymbols_ku_Latn", "goog.i18n.NumberFormatSymbols_ku_Latn_SY", "goog.i18n.NumberFormatSymbols_ku_Latn_TR", "goog.i18n.NumberFormatSymbols_kw", "goog.i18n.NumberFormatSymbols_kw_GB", "goog.i18n.NumberFormatSymbols_ky", "goog.i18n.NumberFormatSymbols_ky_KG", "goog.i18n.NumberFormatSymbols_lag", "goog.i18n.NumberFormatSymbols_lag_TZ", "goog.i18n.NumberFormatSymbols_lg", "goog.i18n.NumberFormatSymbols_lg_UG", "goog.i18n.NumberFormatSymbols_ln_CG", "goog.i18n.NumberFormatSymbols_lo", "goog.i18n.NumberFormatSymbols_lo_LA", "goog.i18n.NumberFormatSymbols_lu", "goog.i18n.NumberFormatSymbols_lu_CD", "goog.i18n.NumberFormatSymbols_luo", "goog.i18n.NumberFormatSymbols_luo_KE", "goog.i18n.NumberFormatSymbols_luy", "goog.i18n.NumberFormatSymbols_luy_KE", "goog.i18n.NumberFormatSymbols_mas", "goog.i18n.NumberFormatSymbols_mas_KE", "goog.i18n.NumberFormatSymbols_mas_TZ", "goog.i18n.NumberFormatSymbols_mer", "goog.i18n.NumberFormatSymbols_mer_KE", "goog.i18n.NumberFormatSymbols_mfe", "goog.i18n.NumberFormatSymbols_mfe_MU", "goog.i18n.NumberFormatSymbols_mg", "goog.i18n.NumberFormatSymbols_mg_MG", "goog.i18n.NumberFormatSymbols_mgh", "goog.i18n.NumberFormatSymbols_mgh_MZ", "goog.i18n.NumberFormatSymbols_mk", "goog.i18n.NumberFormatSymbols_mk_MK", "goog.i18n.NumberFormatSymbols_mn", "goog.i18n.NumberFormatSymbols_mn_Cyrl", "goog.i18n.NumberFormatSymbols_mn_Cyrl_MN", "goog.i18n.NumberFormatSymbols_mn_Mong", "goog.i18n.NumberFormatSymbols_mn_Mong_CN", "goog.i18n.NumberFormatSymbols_ms_BN", "goog.i18n.NumberFormatSymbols_mua", "goog.i18n.NumberFormatSymbols_mua_CM", "goog.i18n.NumberFormatSymbols_my", "goog.i18n.NumberFormatSymbols_my_MM", "goog.i18n.NumberFormatSymbols_naq", "goog.i18n.NumberFormatSymbols_naq_NA", "goog.i18n.NumberFormatSymbols_nb", "goog.i18n.NumberFormatSymbols_nb_NO", "goog.i18n.NumberFormatSymbols_nd", "goog.i18n.NumberFormatSymbols_nd_ZW", "goog.i18n.NumberFormatSymbols_nds", "goog.i18n.NumberFormatSymbols_nds_DE", "goog.i18n.NumberFormatSymbols_ne", "goog.i18n.NumberFormatSymbols_ne_IN", "goog.i18n.NumberFormatSymbols_ne_NP", "goog.i18n.NumberFormatSymbols_nl_AW", "goog.i18n.NumberFormatSymbols_nl_BE", "goog.i18n.NumberFormatSymbols_nmg", "goog.i18n.NumberFormatSymbols_nmg_CM", "goog.i18n.NumberFormatSymbols_nn", "goog.i18n.NumberFormatSymbols_nn_NO", "goog.i18n.NumberFormatSymbols_nr", "goog.i18n.NumberFormatSymbols_nr_ZA", "goog.i18n.NumberFormatSymbols_nso", "goog.i18n.NumberFormatSymbols_nso_ZA", "goog.i18n.NumberFormatSymbols_nus", "goog.i18n.NumberFormatSymbols_nus_SD", "goog.i18n.NumberFormatSymbols_nyn", "goog.i18n.NumberFormatSymbols_nyn_UG", "goog.i18n.NumberFormatSymbols_oc", "goog.i18n.NumberFormatSymbols_oc_FR", "goog.i18n.NumberFormatSymbols_om", "goog.i18n.NumberFormatSymbols_om_ET", "goog.i18n.NumberFormatSymbols_om_KE", "goog.i18n.NumberFormatSymbols_pa", "goog.i18n.NumberFormatSymbols_pa_Arab", "goog.i18n.NumberFormatSymbols_pa_Arab_PK", "goog.i18n.NumberFormatSymbols_pa_Guru", "goog.i18n.NumberFormatSymbols_pa_Guru_IN", "goog.i18n.NumberFormatSymbols_ps", "goog.i18n.NumberFormatSymbols_ps_AF", "goog.i18n.NumberFormatSymbols_pt_AO", "goog.i18n.NumberFormatSymbols_pt_GW", "goog.i18n.NumberFormatSymbols_pt_MZ", "goog.i18n.NumberFormatSymbols_pt_ST", "goog.i18n.NumberFormatSymbols_rm", "goog.i18n.NumberFormatSymbols_rm_CH", "goog.i18n.NumberFormatSymbols_rn", "goog.i18n.NumberFormatSymbols_rn_BI", "goog.i18n.NumberFormatSymbols_ro_MD", "goog.i18n.NumberFormatSymbols_rof", "goog.i18n.NumberFormatSymbols_rof_TZ", "goog.i18n.NumberFormatSymbols_ru_MD", "goog.i18n.NumberFormatSymbols_ru_UA", "goog.i18n.NumberFormatSymbols_rw", "goog.i18n.NumberFormatSymbols_rw_RW", "goog.i18n.NumberFormatSymbols_rwk", "goog.i18n.NumberFormatSymbols_rwk_TZ", "goog.i18n.NumberFormatSymbols_sah", "goog.i18n.NumberFormatSymbols_sah_RU", "goog.i18n.NumberFormatSymbols_saq", "goog.i18n.NumberFormatSymbols_saq_KE", "goog.i18n.NumberFormatSymbols_sbp", "goog.i18n.NumberFormatSymbols_sbp_TZ", "goog.i18n.NumberFormatSymbols_se", "goog.i18n.NumberFormatSymbols_se_FI", "goog.i18n.NumberFormatSymbols_se_NO", "goog.i18n.NumberFormatSymbols_seh", "goog.i18n.NumberFormatSymbols_seh_MZ", "goog.i18n.NumberFormatSymbols_ses", "goog.i18n.NumberFormatSymbols_ses_ML", "goog.i18n.NumberFormatSymbols_sg", "goog.i18n.NumberFormatSymbols_sg_CF", "goog.i18n.NumberFormatSymbols_shi", "goog.i18n.NumberFormatSymbols_shi_Latn", "goog.i18n.NumberFormatSymbols_shi_Latn_MA", "goog.i18n.NumberFormatSymbols_shi_Tfng", "goog.i18n.NumberFormatSymbols_shi_Tfng_MA", "goog.i18n.NumberFormatSymbols_si", "goog.i18n.NumberFormatSymbols_si_LK", "goog.i18n.NumberFormatSymbols_sid", "goog.i18n.NumberFormatSymbols_sid_ET", "goog.i18n.NumberFormatSymbols_sn", "goog.i18n.NumberFormatSymbols_sn_ZW", "goog.i18n.NumberFormatSymbols_so", "goog.i18n.NumberFormatSymbols_so_DJ", "goog.i18n.NumberFormatSymbols_so_ET", "goog.i18n.NumberFormatSymbols_so_KE", "goog.i18n.NumberFormatSymbols_so_SO", "goog.i18n.NumberFormatSymbols_sr_Cyrl", "goog.i18n.NumberFormatSymbols_sr_Cyrl_BA", "goog.i18n.NumberFormatSymbols_sr_Cyrl_ME", "goog.i18n.NumberFormatSymbols_sr_Latn", "goog.i18n.NumberFormatSymbols_sr_Latn_BA", "goog.i18n.NumberFormatSymbols_sr_Latn_ME", "goog.i18n.NumberFormatSymbols_ss", "goog.i18n.NumberFormatSymbols_ss_SZ", "goog.i18n.NumberFormatSymbols_ss_ZA", "goog.i18n.NumberFormatSymbols_ssy", "goog.i18n.NumberFormatSymbols_ssy_ER", "goog.i18n.NumberFormatSymbols_st", "goog.i18n.NumberFormatSymbols_st_LS", "goog.i18n.NumberFormatSymbols_st_ZA", "goog.i18n.NumberFormatSymbols_sv_FI", "goog.i18n.NumberFormatSymbols_sw_KE", "goog.i18n.NumberFormatSymbols_swc", "goog.i18n.NumberFormatSymbols_swc_CD", "goog.i18n.NumberFormatSymbols_ta_LK", "goog.i18n.NumberFormatSymbols_teo", "goog.i18n.NumberFormatSymbols_teo_KE", "goog.i18n.NumberFormatSymbols_teo_UG", "goog.i18n.NumberFormatSymbols_tg", "goog.i18n.NumberFormatSymbols_tg_Cyrl", "goog.i18n.NumberFormatSymbols_tg_Cyrl_TJ", "goog.i18n.NumberFormatSymbols_ti", "goog.i18n.NumberFormatSymbols_ti_ER", "goog.i18n.NumberFormatSymbols_ti_ET", "goog.i18n.NumberFormatSymbols_tig", "goog.i18n.NumberFormatSymbols_tig_ER", "goog.i18n.NumberFormatSymbols_tn", "goog.i18n.NumberFormatSymbols_tn_ZA", "goog.i18n.NumberFormatSymbols_to", "goog.i18n.NumberFormatSymbols_to_TO", "goog.i18n.NumberFormatSymbols_trv", "goog.i18n.NumberFormatSymbols_trv_TW", "goog.i18n.NumberFormatSymbols_ts", "goog.i18n.NumberFormatSymbols_ts_ZA", "goog.i18n.NumberFormatSymbols_twq", "goog.i18n.NumberFormatSymbols_twq_NE", "goog.i18n.NumberFormatSymbols_tzm", "goog.i18n.NumberFormatSymbols_tzm_Latn", "goog.i18n.NumberFormatSymbols_tzm_Latn_MA", "goog.i18n.NumberFormatSymbols_ur_IN", "goog.i18n.NumberFormatSymbols_uz", "goog.i18n.NumberFormatSymbols_uz_Arab", "goog.i18n.NumberFormatSymbols_uz_Arab_AF", "goog.i18n.NumberFormatSymbols_uz_Cyrl", "goog.i18n.NumberFormatSymbols_uz_Cyrl_UZ", "goog.i18n.NumberFormatSymbols_uz_Latn", "goog.i18n.NumberFormatSymbols_uz_Latn_UZ", "goog.i18n.NumberFormatSymbols_vai", "goog.i18n.NumberFormatSymbols_vai_Latn", "goog.i18n.NumberFormatSymbols_vai_Latn_LR", "goog.i18n.NumberFormatSymbols_vai_Vaii", "goog.i18n.NumberFormatSymbols_vai_Vaii_LR", "goog.i18n.NumberFormatSymbols_ve", "goog.i18n.NumberFormatSymbols_ve_ZA", "goog.i18n.NumberFormatSymbols_vun", "goog.i18n.NumberFormatSymbols_vun_TZ", "goog.i18n.NumberFormatSymbols_wae", "goog.i18n.NumberFormatSymbols_wae_CH", "goog.i18n.NumberFormatSymbols_wal", "goog.i18n.NumberFormatSymbols_wal_ET", "goog.i18n.NumberFormatSymbols_xh", "goog.i18n.NumberFormatSymbols_xh_ZA", "goog.i18n.NumberFormatSymbols_xog", "goog.i18n.NumberFormatSymbols_xog_UG", "goog.i18n.NumberFormatSymbols_yav", "goog.i18n.NumberFormatSymbols_yav_CM", "goog.i18n.NumberFormatSymbols_yo", "goog.i18n.NumberFormatSymbols_yo_NG", "goog.i18n.NumberFormatSymbols_zh_Hans_HK", "goog.i18n.NumberFormatSymbols_zh_Hans_MO", "goog.i18n.NumberFormatSymbols_zh_Hans_SG", "goog.i18n.NumberFormatSymbols_zh_Hant", "goog.i18n.NumberFormatSymbols_zh_Hant_HK", "goog.i18n.NumberFormatSymbols_zh_Hant_MO", "goog.i18n.NumberFormatSymbols_zh_Hant_TW", "goog.i18n.NumberFormatSymbols_zu", "goog.i18n.NumberFormatSymbols_zu_ZA"], ["goog.i18n.NumberFormatSymbols"]);
goog.addDependency("/closure/goog/i18n/pluralrules.js", ["goog.i18n.pluralRules"], []);
goog.addDependency("/closure/goog/i18n/timezone.js", ["goog.i18n.TimeZone"], ["goog.array", "goog.date.DateLike", "goog.string"]);
goog.addDependency("/closure/goog/i18n/uchar.js", ["goog.i18n.uChar"], []);
goog.addDependency("/closure/goog/iter/iter.js", ["goog.iter", "goog.iter.Iterator", "goog.iter.StopIteration"], ["goog.array", "goog.asserts"]);
goog.addDependency("/closure/goog/jsaction/context.js", ["goog.jsaction.Context"], []);
goog.addDependency("/closure/goog/jsaction/dispatcher.js", ["goog.jsaction.Dispatcher", "goog.jsaction.HandlerFunction", "goog.jsaction.LoaderFunction"], ["goog.asserts", "goog.jsaction.Context", "goog.jsaction.EventContract", "goog.jsaction.replay", "goog.jsaction.util"]);
goog.addDependency("/closure/goog/jsaction/eventcontract.js", ["goog.jsaction.EventContract", "goog.jsaction.EventType", "goog.jsaction.ReplayInfo"], ["goog.jsaction.util", "goog.object"]);
goog.addDependency("/closure/goog/jsaction/jsprops.js", ["goog.jsaction.jsprops"], ["goog.json"]);
goog.addDependency("/closure/goog/jsaction/replay.js", ["goog.jsaction.replay"], ["goog.asserts", "goog.jsaction.EventContract"]);
goog.addDependency("/closure/goog/jsaction/util.js", ["goog.jsaction.util"], []);
goog.addDependency("/closure/goog/json/json.js", ["goog.json", "goog.json.Serializer"], []);
goog.addDependency("/closure/goog/labs/net/xhr.js", ["goog.labs.net.xhr", "goog.labs.net.xhr.Error", "goog.labs.net.xhr.HttpError", "goog.labs.net.xhr.TimeoutError"], ["goog.async.Deferred", "goog.debug.Error", "goog.json", "goog.net.HttpStatus", "goog.net.XmlHttp", "goog.string", "goog.uri.utils"]);
goog.addDependency("/closure/goog/locale/countries.js", ["goog.locale.countries"], []);
goog.addDependency("/closure/goog/locale/defaultlocalenameconstants.js", ["goog.locale.defaultLocaleNameConstants"], []);
goog.addDependency("/closure/goog/locale/genericfontnames.js", ["goog.locale.genericFontNames"], []);
goog.addDependency("/closure/goog/locale/genericfontnamesdata.js", ["goog.locale.genericFontNamesData"], ["goog.locale"]);
goog.addDependency("/closure/goog/locale/locale.js", ["goog.locale"], ["goog.locale.nativeNameConstants"]);
goog.addDependency("/closure/goog/locale/nativenameconstants.js", ["goog.locale.nativeNameConstants"], []);
goog.addDependency("/closure/goog/locale/scriptToLanguages.js", ["goog.locale.scriptToLanguages"], ["goog.locale"]);
goog.addDependency("/closure/goog/locale/timezonedetection.js", ["goog.locale.timeZoneDetection"], ["goog.locale", "goog.locale.TimeZoneFingerprint"]);
goog.addDependency("/closure/goog/locale/timezonefingerprint.js", ["goog.locale.TimeZoneFingerprint"], ["goog.locale"]);
goog.addDependency("/closure/goog/locale/timezonelist.js", ["goog.locale.TimeZoneList"], ["goog.locale"]);
goog.addDependency("/closure/goog/math/bezier.js", ["goog.math.Bezier"], ["goog.math", "goog.math.Coordinate"]);
goog.addDependency("/closure/goog/math/box.js", ["goog.math.Box"], ["goog.math.Coordinate"]);
goog.addDependency("/closure/goog/math/coordinate.js", ["goog.math.Coordinate"], []);
goog.addDependency("/closure/goog/math/coordinate3.js", ["goog.math.Coordinate3"], []);
goog.addDependency("/closure/goog/math/exponentialbackoff.js", ["goog.math.ExponentialBackoff"], ["goog.asserts"]);
goog.addDependency("/closure/goog/math/integer.js", ["goog.math.Integer"], []);
goog.addDependency("/closure/goog/math/line.js", ["goog.math.Line"], ["goog.math", "goog.math.Coordinate"]);
goog.addDependency("/closure/goog/math/long.js", ["goog.math.Long"], []);
goog.addDependency("/closure/goog/math/math.js", ["goog.math"], ["goog.array"]);
goog.addDependency("/closure/goog/math/matrix.js", ["goog.math.Matrix"], ["goog.array", "goog.math", "goog.math.Size"]);
goog.addDependency("/closure/goog/math/range.js", ["goog.math.Range"], []);
goog.addDependency("/closure/goog/math/rangeset.js", ["goog.math.RangeSet"], ["goog.array", "goog.iter.Iterator", "goog.iter.StopIteration", "goog.math.Range"]);
goog.addDependency("/closure/goog/math/rect.js", ["goog.math.Rect"], ["goog.math.Box", "goog.math.Size"]);
goog.addDependency("/closure/goog/math/size.js", ["goog.math.Size"], []);
goog.addDependency("/closure/goog/math/vec2.js", ["goog.math.Vec2"], ["goog.math", "goog.math.Coordinate"]);
goog.addDependency("/closure/goog/math/vec3.js", ["goog.math.Vec3"], ["goog.math", "goog.math.Coordinate3"]);
goog.addDependency("/closure/goog/memoize/memoize.js", ["goog.memoize"], []);
goog.addDependency("/closure/goog/messaging/abstractchannel.js", ["goog.messaging.AbstractChannel"], ["goog.Disposable", "goog.debug", "goog.debug.Logger", "goog.json", "goog.messaging.MessageChannel"]);
goog.addDependency("/closure/goog/messaging/bufferedchannel.js", ["goog.messaging.BufferedChannel"], ["goog.Timer", "goog.Uri", "goog.debug.Error", "goog.debug.Logger", "goog.events", "goog.messaging.MessageChannel", "goog.messaging.MultiChannel"]);
goog.addDependency("/closure/goog/messaging/deferredchannel.js", ["goog.messaging.DeferredChannel"], ["goog.async.Deferred", "goog.messaging.MessageChannel"]);
goog.addDependency("/closure/goog/messaging/loggerclient.js", ["goog.messaging.LoggerClient"], ["goog.Disposable", "goog.debug", "goog.debug.LogManager", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/messaging/loggerserver.js", ["goog.messaging.LoggerServer"], ["goog.Disposable", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/messaging/messagechannel.js", ["goog.messaging.MessageChannel"], []);
goog.addDependency("/closure/goog/messaging/messaging.js", ["goog.messaging"], ["goog.messaging.MessageChannel"]);
goog.addDependency("/closure/goog/messaging/multichannel.js", ["goog.messaging.MultiChannel", "goog.messaging.MultiChannel.VirtualChannel"], ["goog.Disposable", "goog.debug.Logger", "goog.events.EventHandler", "goog.messaging.MessageChannel", "goog.object"]);
goog.addDependency("/closure/goog/messaging/portcaller.js", ["goog.messaging.PortCaller"], ["goog.Disposable", "goog.async.Deferred", "goog.messaging.DeferredChannel", "goog.messaging.PortChannel", "goog.messaging.PortNetwork", "goog.object"]);
goog.addDependency("/closure/goog/messaging/portchannel.js", ["goog.messaging.PortChannel"], ["goog.Timer", "goog.array", "goog.async.Deferred", "goog.debug", "goog.debug.Logger", "goog.dom", "goog.dom.DomHelper", "goog.events", "goog.events.EventType", "goog.json", "goog.messaging.AbstractChannel", "goog.messaging.DeferredChannel", "goog.object", "goog.string"]);
goog.addDependency("/closure/goog/messaging/portnetwork.js", ["goog.messaging.PortNetwork"], []);
goog.addDependency("/closure/goog/messaging/portoperator.js", ["goog.messaging.PortOperator"], ["goog.Disposable", "goog.asserts", "goog.debug.Logger", "goog.messaging.PortChannel", "goog.messaging.PortNetwork", "goog.object"]);
goog.addDependency("/closure/goog/messaging/respondingchannel.js", ["goog.messaging.RespondingChannel"], ["goog.Disposable", "goog.debug.Logger", "goog.messaging.MessageChannel", "goog.messaging.MultiChannel", "goog.messaging.MultiChannel.VirtualChannel"]);
goog.addDependency("/closure/goog/messaging/testdata/portchannel_worker.js", ["goog.messaging.testdata.portchannel_worker"], ["goog.messaging.PortChannel"]);
goog.addDependency("/closure/goog/messaging/testdata/portnetwork_worker1.js", ["goog.messaging.testdata.portnetwork_worker1"], ["goog.messaging.PortCaller", "goog.messaging.PortChannel"]);
goog.addDependency("/closure/goog/messaging/testdata/portnetwork_worker2.js", ["goog.messaging.testdata.portnetwork_worker2"], ["goog.messaging.PortCaller", "goog.messaging.PortChannel"]);
goog.addDependency("/closure/goog/module/abstractmoduleloader.js", ["goog.module.AbstractModuleLoader"], []);
goog.addDependency("/closure/goog/module/basemodule.js", ["goog.module.BaseModule"], ["goog.Disposable"]);
goog.addDependency("/closure/goog/module/basemoduleloader.js", ["goog.module.BaseModuleLoader"], ["goog.Disposable", "goog.debug.Logger", "goog.module.AbstractModuleLoader"]);
goog.addDependency("/closure/goog/module/loader.js", ["goog.module.Loader"], ["goog.Timer", "goog.array", "goog.dom", "goog.object"]);
goog.addDependency("/closure/goog/module/module.js", ["goog.module"], ["goog.array", "goog.module.Loader"]);
goog.addDependency("/closure/goog/module/moduleinfo.js", ["goog.module.ModuleInfo"], ["goog.Disposable", "goog.functions", "goog.module.BaseModule", "goog.module.ModuleLoadCallback"]);
goog.addDependency("/closure/goog/module/moduleloadcallback.js", ["goog.module.ModuleLoadCallback"], ["goog.debug.entryPointRegistry", "goog.debug.errorHandlerWeakDep"]);
goog.addDependency("/closure/goog/module/moduleloader.js", ["goog.module.ModuleLoader"], ["goog.array", "goog.debug.Logger", "goog.dom", "goog.events.EventHandler", "goog.module.BaseModuleLoader", "goog.net.BulkLoader", "goog.net.EventType", "goog.net.jsloader"]);
goog.addDependency("/closure/goog/module/modulemanager.js", ["goog.module.ModuleManager", "goog.module.ModuleManager.CallbackType", "goog.module.ModuleManager.FailureType"], ["goog.Disposable", "goog.array", "goog.asserts", "goog.async.Deferred", "goog.debug.Logger", "goog.debug.Trace", "goog.module.AbstractModuleLoader", "goog.module.ModuleInfo", "goog.module.ModuleLoadCallback"]);
goog.addDependency("/closure/goog/module/testdata/modA_1.js", ["goog.module.testdata.modA_1"], []);
goog.addDependency("/closure/goog/module/testdata/modA_2.js", ["goog.module.testdata.modA_2"], ["goog.module.ModuleManager"]);
goog.addDependency("/closure/goog/module/testdata/modB_1.js", ["goog.module.testdata.modB_1"], ["goog.module.ModuleManager"]);
goog.addDependency("/closure/goog/net/browserchannel.js", ["goog.net.BrowserChannel", "goog.net.BrowserChannel.Error", "goog.net.BrowserChannel.Event", "goog.net.BrowserChannel.Handler", "goog.net.BrowserChannel.LogSaver", "goog.net.BrowserChannel.QueuedMap", "goog.net.BrowserChannel.Stat", "goog.net.BrowserChannel.StatEvent", "goog.net.BrowserChannel.State", "goog.net.BrowserChannel.TimingEvent"], ["goog.Uri", "goog.array", "goog.debug.Logger", "goog.debug.TextFormatter", "goog.events.Event", "goog.events.EventTarget", "goog.json", "goog.net.BrowserTestChannel", "goog.net.ChannelDebug", "goog.net.ChannelRequest", "goog.net.ChannelRequest.Error", "goog.net.XhrIo", "goog.net.tmpnetwork", "goog.string", "goog.structs", "goog.structs.CircularBuffer", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/browsertestchannel.js", ["goog.net.BrowserTestChannel"], ["goog.json", "goog.net.ChannelRequest", "goog.net.ChannelRequest.Error", "goog.net.tmpnetwork", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/bulkloader.js", ["goog.net.BulkLoader"], ["goog.debug.Logger", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.net.BulkLoaderHelper", "goog.net.EventType", "goog.net.XhrIo"]);
goog.addDependency("/closure/goog/net/bulkloaderhelper.js", ["goog.net.BulkLoaderHelper"], ["goog.Disposable", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/net/channeldebug.js", ["goog.net.ChannelDebug"], ["goog.debug.Logger", "goog.json"]);
goog.addDependency("/closure/goog/net/channelrequest.js", ["goog.net.ChannelRequest", "goog.net.ChannelRequest.Error"], ["goog.Timer", "goog.events", "goog.events.EventHandler", "goog.net.EventType", "goog.net.XmlHttp.ReadyState", "goog.object", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/cookies.js", ["goog.net.Cookies", "goog.net.cookies"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/net/crossdomainrpc.js", ["goog.net.CrossDomainRpc"], ["goog.Uri.QueryData", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.json", "goog.net.EventType", "goog.net.HttpStatus", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/errorcode.js", ["goog.net.ErrorCode"], []);
goog.addDependency("/closure/goog/net/eventtype.js", ["goog.net.EventType"], []);
goog.addDependency("/closure/goog/net/filedownloader.js", ["goog.net.FileDownloader", "goog.net.FileDownloader.Error"], ["goog.Disposable", "goog.asserts", "goog.async.Deferred", "goog.crypt.hash32", "goog.debug.Error", "goog.events.EventHandler", "goog.fs", "goog.fs.DirectoryEntry.Behavior", "goog.fs.Error.ErrorCode", "goog.fs.FileSaver.EventType", "goog.net.EventType", "goog.net.XhrIo.ResponseType", "goog.net.XhrIoPool"]);
goog.addDependency("/closure/goog/net/httpstatus.js", ["goog.net.HttpStatus"], []);
goog.addDependency("/closure/goog/net/iframeio.js", ["goog.net.IframeIo", "goog.net.IframeIo.IncrementalDataEvent"], ["goog.Timer", "goog.Uri", "goog.debug", "goog.debug.Logger", "goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.json", "goog.net.ErrorCode", "goog.net.EventType", "goog.reflect", "goog.string", "goog.structs", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/iframeloadmonitor.js", ["goog.net.IframeLoadMonitor"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/imageloader.js", ["goog.net.ImageLoader"], ["goog.dom", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.net.EventType", "goog.object", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/ipaddress.js", ["goog.net.IpAddress", "goog.net.Ipv4Address", "goog.net.Ipv6Address"], ["goog.array", "goog.math.Integer", "goog.object", "goog.string"]);
goog.addDependency("/closure/goog/net/jsloader.js", ["goog.net.jsloader", "goog.net.jsloader.Error"], ["goog.array", "goog.async.Deferred", "goog.debug.Error", "goog.dom", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/jsonp.js", ["goog.net.Jsonp"], ["goog.Uri", "goog.dom", "goog.net.jsloader"]);
goog.addDependency("/closure/goog/net/mockiframeio.js", ["goog.net.MockIFrameIo"], ["goog.events.EventTarget", "goog.net.ErrorCode", "goog.net.IframeIo", "goog.net.IframeIo.IncrementalDataEvent"]);
goog.addDependency("/closure/goog/net/mockxhrlite.js", ["goog.net.MockXhrLite"], ["goog.testing.net.XhrIo"]);
goog.addDependency("/closure/goog/net/multiiframeloadmonitor.js", ["goog.net.MultiIframeLoadMonitor"], ["goog.net.IframeLoadMonitor"]);
goog.addDependency("/closure/goog/net/networktester.js", ["goog.net.NetworkTester"], ["goog.Timer", "goog.Uri", "goog.debug.Logger"]);
goog.addDependency("/closure/goog/net/testdata/jsloader_test1.js", ["goog.net.testdata.jsloader_test1"], []);
goog.addDependency("/closure/goog/net/testdata/jsloader_test2.js", ["goog.net.testdata.jsloader_test2"], []);
goog.addDependency("/closure/goog/net/testdata/jsloader_test3.js", ["goog.net.testdata.jsloader_test3"], []);
goog.addDependency("/closure/goog/net/testdata/jsloader_test4.js", ["goog.net.testdata.jsloader_test4"], []);
goog.addDependency("/closure/goog/net/tmpnetwork.js", ["goog.net.tmpnetwork"], ["goog.Uri", "goog.net.ChannelDebug"]);
goog.addDependency("/closure/goog/net/websocket.js", ["goog.net.WebSocket", "goog.net.WebSocket.ErrorEvent", "goog.net.WebSocket.EventType", "goog.net.WebSocket.MessageEvent"], ["goog.Timer", "goog.asserts", "goog.debug.Logger", "goog.debug.entryPointRegistry", "goog.events", "goog.events.Event", "goog.events.EventTarget"]);
goog.addDependency("/closure/goog/net/wrapperxmlhttpfactory.js", ["goog.net.WrapperXmlHttpFactory"], ["goog.net.XmlHttpFactory"]);
goog.addDependency("/closure/goog/net/xhrio.js", ["goog.net.XhrIo", "goog.net.XhrIo.ResponseType"], ["goog.Timer", "goog.debug.Logger", "goog.debug.entryPointRegistry", "goog.debug.errorHandlerWeakDep", "goog.events.EventTarget", "goog.json", "goog.net.ErrorCode", "goog.net.EventType", "goog.net.HttpStatus", "goog.net.XmlHttp", "goog.object", "goog.structs", "goog.structs.Map", "goog.uri.utils"]);
goog.addDependency("/closure/goog/net/xhriopool.js", ["goog.net.XhrIoPool"], ["goog.net.XhrIo", "goog.structs", "goog.structs.PriorityPool"]);
goog.addDependency("/closure/goog/net/xhrlite.js", ["goog.net.XhrLite"], ["goog.net.XhrIo"]);
goog.addDependency("/closure/goog/net/xhrlitepool.js", ["goog.net.XhrLitePool"], ["goog.net.XhrIoPool"]);
goog.addDependency("/closure/goog/net/xhrmanager.js", ["goog.net.XhrManager", "goog.net.XhrManager.Event", "goog.net.XhrManager.Request"], ["goog.Disposable", "goog.events", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.net.EventType", "goog.net.XhrIo", "goog.net.XhrIoPool", "goog.structs.Map"]);
goog.addDependency("/closure/goog/net/xmlhttp.js", ["goog.net.DefaultXmlHttpFactory", "goog.net.XmlHttp", "goog.net.XmlHttp.OptionType", "goog.net.XmlHttp.ReadyState"], ["goog.net.WrapperXmlHttpFactory", "goog.net.XmlHttpFactory"]);
goog.addDependency("/closure/goog/net/xmlhttpfactory.js", ["goog.net.XmlHttpFactory"], []);
goog.addDependency("/closure/goog/net/xpc/crosspagechannel.js", ["goog.net.xpc.CrossPageChannel"], ["goog.Disposable", "goog.Uri", "goog.dom", "goog.events", "goog.json", "goog.messaging.AbstractChannel", "goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.FrameElementMethodTransport", "goog.net.xpc.IframePollingTransport", "goog.net.xpc.IframeRelayTransport", "goog.net.xpc.NativeMessagingTransport", "goog.net.xpc.NixTransport", "goog.net.xpc.Transport", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/xpc/crosspagechannelrole.js", ["goog.net.xpc.CrossPageChannelRole"], []);
goog.addDependency("/closure/goog/net/xpc/frameelementmethodtransport.js", ["goog.net.xpc.FrameElementMethodTransport"], ["goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport"]);
goog.addDependency("/closure/goog/net/xpc/iframepollingtransport.js", ["goog.net.xpc.IframePollingTransport", "goog.net.xpc.IframePollingTransport.Receiver", "goog.net.xpc.IframePollingTransport.Sender"], ["goog.array", "goog.dom", "goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/xpc/iframerelaytransport.js", ["goog.net.xpc.IframeRelayTransport"], ["goog.dom", "goog.events", "goog.net.xpc", "goog.net.xpc.Transport", "goog.userAgent"]);
goog.addDependency("/closure/goog/net/xpc/nativemessagingtransport.js", ["goog.net.xpc.NativeMessagingTransport"], ["goog.events", "goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport"]);
goog.addDependency("/closure/goog/net/xpc/nixtransport.js", ["goog.net.xpc.NixTransport"], ["goog.net.xpc", "goog.net.xpc.CrossPageChannelRole", "goog.net.xpc.Transport", "goog.reflect"]);
goog.addDependency("/closure/goog/net/xpc/relay.js", ["goog.net.xpc.relay"], []);
goog.addDependency("/closure/goog/net/xpc/transport.js", ["goog.net.xpc.Transport"], ["goog.Disposable", "goog.dom", "goog.net.xpc"]);
goog.addDependency("/closure/goog/net/xpc/xpc.js", ["goog.net.xpc", "goog.net.xpc.CfgFields", "goog.net.xpc.ChannelStates", "goog.net.xpc.TransportNames", "goog.net.xpc.TransportTypes", "goog.net.xpc.UriCfgFields"], ["goog.debug.Logger"]);
goog.addDependency("/closure/goog/object/object.js", ["goog.object"], []);
goog.addDependency("/closure/goog/positioning/absoluteposition.js", ["goog.positioning.AbsolutePosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning", "goog.positioning.AbstractPosition"]);
goog.addDependency("/closure/goog/positioning/abstractposition.js", ["goog.positioning.AbstractPosition"], ["goog.math.Box", "goog.math.Size", "goog.positioning.Corner"]);
goog.addDependency("/closure/goog/positioning/anchoredposition.js", ["goog.positioning.AnchoredPosition"], ["goog.math.Box", "goog.positioning", "goog.positioning.AbstractPosition"]);
goog.addDependency("/closure/goog/positioning/anchoredviewportposition.js", ["goog.positioning.AnchoredViewportPosition"], ["goog.functions", "goog.math.Box", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.positioning.OverflowStatus"]);
goog.addDependency("/closure/goog/positioning/clientposition.js", ["goog.positioning.ClientPosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning", "goog.positioning.AbstractPosition"]);
goog.addDependency("/closure/goog/positioning/menuanchoredposition.js", ["goog.positioning.MenuAnchoredPosition"], ["goog.math.Box", "goog.math.Size", "goog.positioning", "goog.positioning.AnchoredViewportPosition", "goog.positioning.Corner", "goog.positioning.Overflow"]);
goog.addDependency("/closure/goog/positioning/positioning.js", ["goog.positioning", "goog.positioning.Corner", "goog.positioning.CornerBit", "goog.positioning.Overflow", "goog.positioning.OverflowStatus"], ["goog.dom", "goog.dom.TagName", "goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.style"]);
goog.addDependency("/closure/goog/positioning/viewportclientposition.js", ["goog.positioning.ViewportClientPosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning.ClientPosition"]);
goog.addDependency("/closure/goog/positioning/viewportposition.js", ["goog.positioning.ViewportPosition"], ["goog.math.Box", "goog.math.Coordinate", "goog.math.Size", "goog.positioning.AbstractPosition"]);
goog.addDependency("/closure/goog/proto/proto.js", ["goog.proto"], ["goog.proto.Serializer"]);
goog.addDependency("/closure/goog/proto/serializer.js", ["goog.proto.Serializer"], ["goog.json.Serializer", "goog.string"]);
goog.addDependency("/closure/goog/proto2/descriptor.js", ["goog.proto2.Descriptor", "goog.proto2.Metadata"], ["goog.array", "goog.object", "goog.proto2.Util"]);
goog.addDependency("/closure/goog/proto2/fielddescriptor.js", ["goog.proto2.FieldDescriptor"], ["goog.proto2.Util", "goog.string"]);
goog.addDependency("/closure/goog/proto2/lazydeserializer.js", ["goog.proto2.LazyDeserializer"], ["goog.proto2.Serializer", "goog.proto2.Util"]);
goog.addDependency("/closure/goog/proto2/message.js", ["goog.proto2.Message"], ["goog.proto2.Descriptor", "goog.proto2.FieldDescriptor", "goog.proto2.Util", "goog.string"]);
goog.addDependency("/closure/goog/proto2/objectserializer.js", ["goog.proto2.ObjectSerializer"], ["goog.proto2.Serializer", "goog.proto2.Util", "goog.string"]);
goog.addDependency("/closure/goog/proto2/package_test.pb.js", ["someprotopackage.TestPackageTypes"], ["goog.proto2.Message", "proto2.TestAllTypes"]);
goog.addDependency("/closure/goog/proto2/pbliteserializer.js", ["goog.proto2.PbLiteSerializer"], ["goog.proto2.LazyDeserializer", "goog.proto2.Util"]);
goog.addDependency("/closure/goog/proto2/serializer.js", ["goog.proto2.Serializer"], ["goog.proto2.Descriptor", "goog.proto2.FieldDescriptor", "goog.proto2.Message", "goog.proto2.Util"]);
goog.addDependency("/closure/goog/proto2/test.pb.js", ["proto2.TestAllTypes", "proto2.TestAllTypes.NestedMessage", "proto2.TestAllTypes.OptionalGroup", "proto2.TestAllTypes.RepeatedGroup", "proto2.TestAllTypes.NestedEnum"], ["goog.proto2.Message"]);
goog.addDependency("/closure/goog/proto2/textformatserializer.js", ["goog.proto2.TextFormatSerializer", "goog.proto2.TextFormatSerializer.Parser"], ["goog.json", "goog.proto2.Serializer", "goog.proto2.Util", "goog.string"]);
goog.addDependency("/closure/goog/proto2/util.js", ["goog.proto2.Util"], ["goog.asserts"]);
goog.addDependency("/closure/goog/pubsub/pubsub.js", ["goog.pubsub.PubSub"], ["goog.Disposable", "goog.array"]);
goog.addDependency("/closure/goog/reflect/reflect.js", ["goog.reflect"], []);
goog.addDependency("/closure/goog/soy/renderer.js", ["goog.soy.InjectedDataSupplier", "goog.soy.Renderer"], ["goog.dom", "goog.soy"]);
goog.addDependency("/closure/goog/soy/soy.js", ["goog.soy"], ["goog.dom", "goog.dom.NodeType", "goog.dom.TagName"]);
goog.addDependency("/closure/goog/soy/soy_test.js", ["goog.soy.testHelper"], ["goog.dom", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/spell/spellcheck.js", ["goog.spell.SpellCheck", "goog.spell.SpellCheck.WordChangedEvent"], ["goog.Timer", "goog.events.EventTarget", "goog.structs.Set"]);
goog.addDependency("/closure/goog/stats/basicstat.js", ["goog.stats.BasicStat"], ["goog.array", "goog.debug.Logger", "goog.iter", "goog.object", "goog.string.format", "goog.structs.CircularBuffer"]);
goog.addDependency("/closure/goog/storage/collectablestorage.js", ["goog.storage.CollectableStorage"], ["goog.array", "goog.asserts", "goog.iter", "goog.storage.ErrorCode", "goog.storage.ExpiringStorage", "goog.storage.RichStorage.Wrapper", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/closure/goog/storage/encryptedstorage.js", ["goog.storage.EncryptedStorage"], ["goog.crypt", "goog.crypt.Arc4", "goog.crypt.Sha1", "goog.crypt.base64", "goog.json", "goog.json.Serializer", "goog.storage.CollectableStorage", "goog.storage.ErrorCode", "goog.storage.RichStorage", "goog.storage.RichStorage.Wrapper", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/closure/goog/storage/errorcode.js", ["goog.storage.ErrorCode"], []);
goog.addDependency("/closure/goog/storage/expiringstorage.js", ["goog.storage.ExpiringStorage"], ["goog.storage.RichStorage", "goog.storage.RichStorage.Wrapper", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/closure/goog/storage/mechanism/errorcode.js", ["goog.storage.mechanism.ErrorCode"], []);
goog.addDependency("/closure/goog/storage/mechanism/html5localstorage.js", ["goog.storage.mechanism.HTML5LocalStorage"], ["goog.storage.mechanism.HTML5WebStorage"]);
goog.addDependency("/closure/goog/storage/mechanism/html5sessionstorage.js", ["goog.storage.mechanism.HTML5SessionStorage"], ["goog.storage.mechanism.HTML5WebStorage"]);
goog.addDependency("/closure/goog/storage/mechanism/html5webstorage.js", ["goog.storage.mechanism.HTML5WebStorage"], ["goog.asserts", "goog.iter.Iterator", "goog.iter.StopIteration", "goog.storage.mechanism.ErrorCode", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/closure/goog/storage/mechanism/ieuserdata.js", ["goog.storage.mechanism.IEUserData"], ["goog.asserts", "goog.iter.Iterator", "goog.iter.StopIteration", "goog.storage.mechanism.ErrorCode", "goog.storage.mechanism.IterableMechanism", "goog.structs.Map", "goog.userAgent"]);
goog.addDependency("/closure/goog/storage/mechanism/iterablemechanism.js", ["goog.storage.mechanism.IterableMechanism"], ["goog.array", "goog.asserts", "goog.iter", "goog.iter.Iterator", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/closure/goog/storage/mechanism/iterablemechanism_test.js", ["goog.storage.mechanism.iterablemechanism_test"], ["goog.iter.Iterator", "goog.storage.mechanism.IterableMechanism", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/storage/mechanism/mechanism.js", ["goog.storage.mechanism.Mechanism"], []);
goog.addDependency("/closure/goog/storage/mechanism/mechanism_test.js", ["goog.storage.mechanism.mechanism_test"], ["goog.storage.mechanism.ErrorCode", "goog.storage.mechanism.HTML5LocalStorage", "goog.storage.mechanism.Mechanism", "goog.testing.asserts", "goog.userAgent.product", "goog.userAgent.product.isVersion"]);
goog.addDependency("/closure/goog/storage/mechanism/mechanismfactory.js", ["goog.storage.mechanism.mechanismfactory"], ["goog.storage.mechanism.HTML5LocalStorage", "goog.storage.mechanism.HTML5SessionStorage", "goog.storage.mechanism.IEUserData", "goog.storage.mechanism.IterableMechanism", "goog.storage.mechanism.PrefixedMechanism"]);
goog.addDependency("/closure/goog/storage/mechanism/prefixedmechanism.js", ["goog.storage.mechanism.PrefixedMechanism"], ["goog.iter.Iterator", "goog.storage.mechanism.IterableMechanism"]);
goog.addDependency("/closure/goog/storage/mechanism/prefixedmechanism_test.js", ["goog.storage.mechanism.prefixedmechanism_test"], ["goog.iter.Iterator", "goog.storage.mechanism.IterableMechanism", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/storage/richstorage.js", ["goog.storage.RichStorage", "goog.storage.RichStorage.Wrapper"], ["goog.storage.ErrorCode", "goog.storage.Storage", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/closure/goog/storage/storage.js", ["goog.storage.Storage"], ["goog.json", "goog.json.Serializer", "goog.storage.ErrorCode", "goog.storage.mechanism.Mechanism"]);
goog.addDependency("/closure/goog/storage/storage_test.js", ["goog.storage.storage_test"], ["goog.storage.Storage", "goog.structs.Map", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/string/linkify.js", ["goog.string.linkify"], ["goog.string"]);
goog.addDependency("/closure/goog/string/path.js", ["goog.string.path"], ["goog.array", "goog.string"]);
goog.addDependency("/closure/goog/string/string.js", ["goog.string", "goog.string.Unicode"], []);
goog.addDependency("/closure/goog/string/stringbuffer.js", ["goog.string.StringBuffer"], ["goog.userAgent.jscript"]);
goog.addDependency("/closure/goog/string/stringformat.js", ["goog.string.format"], ["goog.string"]);
goog.addDependency("/closure/goog/structs/avltree.js", ["goog.structs.AvlTree", "goog.structs.AvlTree.Node"], ["goog.structs", "goog.structs.Collection"]);
goog.addDependency("/closure/goog/structs/circularbuffer.js", ["goog.structs.CircularBuffer"], []);
goog.addDependency("/closure/goog/structs/collection.js", ["goog.structs.Collection"], []);
goog.addDependency("/closure/goog/structs/heap.js", ["goog.structs.Heap"], ["goog.array", "goog.object", "goog.structs.Node"]);
goog.addDependency("/closure/goog/structs/inversionmap.js", ["goog.structs.InversionMap"], ["goog.array"]);
goog.addDependency("/closure/goog/structs/linkedmap.js", ["goog.structs.LinkedMap"], ["goog.structs.Map"]);
goog.addDependency("/closure/goog/structs/map.js", ["goog.structs.Map"], ["goog.iter.Iterator", "goog.iter.StopIteration", "goog.object", "goog.structs"]);
goog.addDependency("/closure/goog/structs/node.js", ["goog.structs.Node"], []);
goog.addDependency("/closure/goog/structs/pool.js", ["goog.structs.Pool"], ["goog.Disposable", "goog.structs.Queue", "goog.structs.Set"]);
goog.addDependency("/closure/goog/structs/prioritypool.js", ["goog.structs.PriorityPool"], ["goog.structs.Pool", "goog.structs.PriorityQueue"]);
goog.addDependency("/closure/goog/structs/priorityqueue.js", ["goog.structs.PriorityQueue"], ["goog.structs", "goog.structs.Heap"]);
goog.addDependency("/closure/goog/structs/quadtree.js", ["goog.structs.QuadTree", "goog.structs.QuadTree.Node", "goog.structs.QuadTree.Point"], ["goog.math.Coordinate"]);
goog.addDependency("/closure/goog/structs/queue.js", ["goog.structs.Queue"], ["goog.array"]);
goog.addDependency("/closure/goog/structs/set.js", ["goog.structs.Set"], ["goog.structs", "goog.structs.Collection", "goog.structs.Map"]);
goog.addDependency("/closure/goog/structs/simplepool.js", ["goog.structs.SimplePool"], ["goog.Disposable"]);
goog.addDependency("/closure/goog/structs/stringset.js", ["goog.structs.StringSet"], ["goog.iter"]);
goog.addDependency("/closure/goog/structs/structs.js", ["goog.structs"], ["goog.array", "goog.object"]);
goog.addDependency("/closure/goog/structs/treenode.js", ["goog.structs.TreeNode"], ["goog.array", "goog.asserts", "goog.structs.Node"]);
goog.addDependency("/closure/goog/structs/trie.js", ["goog.structs.Trie"], ["goog.object", "goog.structs"]);
goog.addDependency("/closure/goog/style/bidi.js", ["goog.style.bidi"], ["goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/style/cursor.js", ["goog.style.cursor"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/style/style.js", ["goog.style"], ["goog.array", "goog.dom", "goog.math.Box", "goog.math.Coordinate", "goog.math.Rect", "goog.math.Size", "goog.object", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/style/style_test.js", ["goog.style_test"], ["goog.dom", "goog.style", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/style/transition.js", ["goog.style.transition", "goog.style.transition.Css3Property"], ["goog.array", "goog.asserts"]);
goog.addDependency("/closure/goog/testing/asserts.js", ["goog.testing.JsUnitException", "goog.testing.asserts"], ["goog.testing.stacktrace"]);
goog.addDependency("/closure/goog/testing/async/mockcontrol.js", ["goog.testing.async.MockControl"], ["goog.asserts", "goog.async.Deferred", "goog.debug", "goog.testing.asserts", "goog.testing.mockmatchers.IgnoreArgument"]);
goog.addDependency("/closure/goog/testing/asynctestcase.js", ["goog.testing.AsyncTestCase", "goog.testing.AsyncTestCase.ControlBreakingException"], ["goog.testing.TestCase", "goog.testing.TestCase.Test", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/benchmark.js", ["goog.testing.benchmark"], ["goog.dom", "goog.dom.TagName", "goog.testing.PerformanceTable", "goog.testing.PerformanceTimer", "goog.testing.TestCase"]);
goog.addDependency("/closure/goog/testing/benchmarks/jsbinarysizebutton.js", ["goog.ui.benchmarks.jsbinarysizebutton"], ["goog.array", "goog.dom", "goog.events", "goog.ui.Button", "goog.ui.ButtonSide", "goog.ui.Component.EventType", "goog.ui.CustomButton"]);
goog.addDependency("/closure/goog/testing/benchmarks/jsbinarysizetoolbar.js", ["goog.ui.benchmarks.jsbinarysizetoolbar"], ["goog.array", "goog.dom", "goog.events", "goog.object", "goog.ui.Component.EventType", "goog.ui.Option", "goog.ui.Toolbar", "goog.ui.ToolbarButton", "goog.ui.ToolbarSelect", "goog.ui.ToolbarSeparator"]);
goog.addDependency("/closure/goog/testing/continuationtestcase.js", ["goog.testing.ContinuationTestCase", "goog.testing.ContinuationTestCase.Step", "goog.testing.ContinuationTestCase.Test"], ["goog.array", "goog.events.EventHandler", "goog.testing.TestCase", "goog.testing.TestCase.Test", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/deferredtestcase.js", ["goog.testing.DeferredTestCase"], ["goog.async.Deferred", "goog.testing.AsyncTestCase", "goog.testing.TestCase"]);
goog.addDependency("/closure/goog/testing/dom.js", ["goog.testing.dom"], ["goog.dom", "goog.dom.NodeIterator", "goog.dom.NodeType", "goog.dom.TagIterator", "goog.dom.TagName", "goog.dom.classes", "goog.iter", "goog.object", "goog.string", "goog.style", "goog.testing.asserts", "goog.userAgent"]);
goog.addDependency("/closure/goog/testing/editor/dom.js", ["goog.testing.editor.dom"], ["goog.dom.NodeType", "goog.dom.TagIterator", "goog.dom.TagWalkType", "goog.iter", "goog.string", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/editor/fieldmock.js", ["goog.testing.editor.FieldMock"], ["goog.dom", "goog.dom.Range", "goog.editor.Field", "goog.testing.LooseMock"]);
goog.addDependency("/closure/goog/testing/editor/testhelper.js", ["goog.testing.editor.TestHelper"], ["goog.Disposable", "goog.dom", "goog.dom.Range", "goog.editor.BrowserFeature", "goog.editor.node", "goog.testing.dom"]);
goog.addDependency("/closure/goog/testing/events/eventobserver.js", ["goog.testing.events.EventObserver"], ["goog.array"]);
goog.addDependency("/closure/goog/testing/events/events.js", ["goog.testing.events", "goog.testing.events.Event"], ["goog.events", "goog.events.BrowserEvent", "goog.events.BrowserEvent.MouseButton", "goog.events.BrowserFeature", "goog.events.Event", "goog.events.EventType", "goog.events.KeyCodes", "goog.object", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/testing/events/matchers.js", ["goog.testing.events.EventMatcher"], ["goog.events.Event", "goog.testing.mockmatchers.ArgumentMatcher"]);
goog.addDependency("/closure/goog/testing/expectedfailures.js", ["goog.testing.ExpectedFailures"], ["goog.debug.DivConsole", "goog.debug.Logger", "goog.dom", "goog.dom.TagName", "goog.events", "goog.events.EventType", "goog.style", "goog.testing.JsUnitException", "goog.testing.TestCase", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/fs/blob.js", ["goog.testing.fs.Blob"], ["goog.crypt.base64"]);
goog.addDependency("/closure/goog/testing/fs/entry.js", ["goog.testing.fs.DirectoryEntry", "goog.testing.fs.Entry", "goog.testing.fs.FileEntry"], ["goog.Timer", "goog.array", "goog.async.Deferred", "goog.fs.DirectoryEntry", "goog.fs.DirectoryEntry.Behavior", "goog.fs.Error", "goog.functions", "goog.object", "goog.string", "goog.testing.fs.File", "goog.testing.fs.FileWriter"]);
goog.addDependency("/closure/goog/testing/fs/file.js", ["goog.testing.fs.File"], ["goog.testing.fs.Blob"]);
goog.addDependency("/closure/goog/testing/fs/filereader.js", ["goog.testing.fs.FileReader"], ["goog.Timer", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.FileReader.EventType", "goog.fs.FileReader.ReadyState", "goog.testing.fs.File", "goog.testing.fs.ProgressEvent"]);
goog.addDependency("/closure/goog/testing/fs/filesystem.js", ["goog.testing.fs.FileSystem"], ["goog.testing.fs.DirectoryEntry"]);
goog.addDependency("/closure/goog/testing/fs/filewriter.js", ["goog.testing.fs.FileWriter"], ["goog.Timer", "goog.events.Event", "goog.events.EventTarget", "goog.fs.Error", "goog.fs.FileSaver.EventType", "goog.fs.FileSaver.ReadyState", "goog.string", "goog.testing.fs.File", "goog.testing.fs.ProgressEvent"]);
goog.addDependency("/closure/goog/testing/fs/fs.js", ["goog.testing.fs"], ["goog.Timer", "goog.array", "goog.fs", "goog.testing.fs.Blob", "goog.testing.fs.FileSystem"]);
goog.addDependency("/closure/goog/testing/fs/progressevent.js", ["goog.testing.fs.ProgressEvent"], ["goog.events.Event"]);
goog.addDependency("/closure/goog/testing/functionmock.js", ["goog.testing", "goog.testing.FunctionMock", "goog.testing.GlobalFunctionMock", "goog.testing.MethodMock"], ["goog.object", "goog.testing.LooseMock", "goog.testing.Mock", "goog.testing.MockInterface", "goog.testing.PropertyReplacer", "goog.testing.StrictMock"]);
goog.addDependency("/closure/goog/testing/graphics.js", ["goog.testing.graphics"], ["goog.graphics.Path.Segment", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/jsunit.js", ["goog.testing.jsunit"], ["goog.testing.TestCase", "goog.testing.TestRunner"]);
goog.addDependency("/closure/goog/testing/loosemock.js", ["goog.testing.LooseExpectationCollection", "goog.testing.LooseMock"], ["goog.array", "goog.structs.Map", "goog.testing.Mock"]);
goog.addDependency("/closure/goog/testing/messaging/mockmessagechannel.js", ["goog.testing.messaging.MockMessageChannel"], ["goog.messaging.AbstractChannel", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/messaging/mockmessageevent.js", ["goog.testing.messaging.MockMessageEvent"], ["goog.events.BrowserEvent", "goog.events.EventType", "goog.testing.events"]);
goog.addDependency("/closure/goog/testing/messaging/mockmessageport.js", ["goog.testing.messaging.MockMessagePort"], ["goog.events.EventTarget"]);
goog.addDependency("/closure/goog/testing/messaging/mockportnetwork.js", ["goog.testing.messaging.MockPortNetwork"], ["goog.messaging.PortNetwork", "goog.testing.messaging.MockMessageChannel"]);
goog.addDependency("/closure/goog/testing/mock.js", ["goog.testing.Mock", "goog.testing.MockExpectation"], ["goog.array", "goog.testing.JsUnitException", "goog.testing.MockInterface", "goog.testing.mockmatchers"]);
goog.addDependency("/closure/goog/testing/mockclassfactory.js", ["goog.testing.MockClassFactory", "goog.testing.MockClassRecord"], ["goog.array", "goog.object", "goog.testing.LooseMock", "goog.testing.StrictMock", "goog.testing.TestCase", "goog.testing.mockmatchers"]);
goog.addDependency("/closure/goog/testing/mockclock.js", ["goog.testing.MockClock"], ["goog.Disposable", "goog.testing.PropertyReplacer"]);
goog.addDependency("/closure/goog/testing/mockcontrol.js", ["goog.testing.MockControl"], ["goog.array", "goog.testing", "goog.testing.LooseMock", "goog.testing.MockInterface", "goog.testing.StrictMock"]);
goog.addDependency("/closure/goog/testing/mockinterface.js", ["goog.testing.MockInterface"], []);
goog.addDependency("/closure/goog/testing/mockmatchers.js", ["goog.testing.mockmatchers", "goog.testing.mockmatchers.ArgumentMatcher", "goog.testing.mockmatchers.IgnoreArgument", "goog.testing.mockmatchers.InstanceOf", "goog.testing.mockmatchers.ObjectEquals", "goog.testing.mockmatchers.RegexpMatch", "goog.testing.mockmatchers.SaveArgument", "goog.testing.mockmatchers.TypeOf"], ["goog.array", "goog.dom", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/mockrandom.js", ["goog.testing.MockRandom"], ["goog.Disposable"]);
goog.addDependency("/closure/goog/testing/mockrange.js", ["goog.testing.MockRange"], ["goog.dom.AbstractRange", "goog.testing.LooseMock"]);
goog.addDependency("/closure/goog/testing/mockstorage.js", ["goog.testing.MockStorage"], ["goog.structs.Map"]);
goog.addDependency("/closure/goog/testing/mockuseragent.js", ["goog.testing.MockUserAgent"], ["goog.Disposable", "goog.userAgent"]);
goog.addDependency("/closure/goog/testing/multitestrunner.js", ["goog.testing.MultiTestRunner", "goog.testing.MultiTestRunner.TestFrame"], ["goog.Timer", "goog.array", "goog.dom", "goog.dom.classes", "goog.events.EventHandler", "goog.functions", "goog.string", "goog.ui.Component", "goog.ui.ServerChart", "goog.ui.ServerChart.ChartType", "goog.ui.TableSorter"]);
goog.addDependency("/closure/goog/testing/net/xhrio.js", ["goog.testing.net.XhrIo"], ["goog.array", "goog.dom.xml", "goog.events", "goog.events.EventTarget", "goog.json", "goog.net.ErrorCode", "goog.net.EventType", "goog.net.HttpStatus", "goog.net.XhrIo.ResponseType", "goog.net.XmlHttp", "goog.object", "goog.structs.Map", "goog.uri.utils"]);
goog.addDependency("/closure/goog/testing/net/xhriopool.js", ["goog.testing.net.XhrIoPool"], ["goog.net.XhrIoPool", "goog.testing.net.XhrIo"]);
goog.addDependency("/closure/goog/testing/objectpropertystring.js", ["goog.testing.ObjectPropertyString"], []);
goog.addDependency("/closure/goog/testing/performancetable.js", ["goog.testing.PerformanceTable"], ["goog.dom", "goog.testing.PerformanceTimer"]);
goog.addDependency("/closure/goog/testing/performancetimer.js", ["goog.testing.PerformanceTimer"], ["goog.array", "goog.math"]);
goog.addDependency("/closure/goog/testing/propertyreplacer.js", ["goog.testing.PropertyReplacer"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/testing/pseudorandom.js", ["goog.testing.PseudoRandom"], ["goog.Disposable"]);
goog.addDependency("/closure/goog/testing/recordfunction.js", ["goog.testing.FunctionCall", "goog.testing.recordConstructor", "goog.testing.recordFunction"], []);
goog.addDependency("/closure/goog/testing/shardingtestcase.js", ["goog.testing.ShardingTestCase"], ["goog.asserts", "goog.testing.TestCase"]);
goog.addDependency("/closure/goog/testing/singleton.js", ["goog.testing.singleton"], ["goog.array"]);
goog.addDependency("/closure/goog/testing/stacktrace.js", ["goog.testing.stacktrace", "goog.testing.stacktrace.Frame"], []);
goog.addDependency("/closure/goog/testing/strictmock.js", ["goog.testing.StrictMock"], ["goog.array", "goog.testing.Mock"]);
goog.addDependency("/closure/goog/testing/style/layoutasserts.js", ["goog.testing.style.layoutasserts"], ["goog.style", "goog.testing.asserts", "goog.testing.style"]);
goog.addDependency("/closure/goog/testing/style/style.js", ["goog.testing.style"], ["goog.math.Rect", "goog.style"]);
goog.addDependency("/closure/goog/testing/testcase.js", ["goog.testing.TestCase", "goog.testing.TestCase.Error", "goog.testing.TestCase.Order", "goog.testing.TestCase.Result", "goog.testing.TestCase.Test"], ["goog.testing.asserts", "goog.testing.stacktrace"]);
goog.addDependency("/closure/goog/testing/testqueue.js", ["goog.testing.TestQueue"], []);
goog.addDependency("/closure/goog/testing/testrunner.js", ["goog.testing.TestRunner"], ["goog.testing.TestCase"]);
goog.addDependency("/closure/goog/testing/ui/rendererasserts.js", ["goog.testing.ui.rendererasserts"], ["goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/ui/rendererharness.js", ["goog.testing.ui.RendererHarness"], ["goog.Disposable", "goog.dom.NodeType", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/testing/ui/style.js", ["goog.testing.ui.style"], ["goog.array", "goog.dom", "goog.dom.classes", "goog.testing.asserts"]);
goog.addDependency("/closure/goog/timer/timer.js", ["goog.Timer"], ["goog.events.EventTarget"]);
goog.addDependency("/closure/goog/tweak/entries.js", ["goog.tweak.BaseEntry", "goog.tweak.BasePrimitiveSetting", "goog.tweak.BaseSetting", "goog.tweak.BooleanGroup", "goog.tweak.BooleanInGroupSetting", "goog.tweak.BooleanSetting", "goog.tweak.ButtonAction", "goog.tweak.NumericSetting", "goog.tweak.StringSetting"], ["goog.array", "goog.asserts", "goog.debug.Logger", "goog.object"]);
goog.addDependency("/closure/goog/tweak/registry.js", ["goog.tweak.Registry"], ["goog.asserts", "goog.debug.Logger", "goog.object", "goog.string", "goog.tweak.BaseEntry", "goog.uri.utils"]);
goog.addDependency("/closure/goog/tweak/testhelpers.js", ["goog.tweak.testhelpers"], ["goog.tweak"]);
goog.addDependency("/closure/goog/tweak/tweak.js", ["goog.tweak", "goog.tweak.ConfigParams"], ["goog.asserts", "goog.tweak.BooleanGroup", "goog.tweak.BooleanInGroupSetting", "goog.tweak.BooleanSetting", "goog.tweak.ButtonAction", "goog.tweak.NumericSetting", "goog.tweak.Registry", "goog.tweak.StringSetting"]);
goog.addDependency("/closure/goog/tweak/tweakui.js", ["goog.tweak.EntriesPanel", "goog.tweak.TweakUi"], ["goog.array", "goog.asserts", "goog.dom.DomHelper", "goog.object", "goog.style", "goog.tweak", "goog.ui.Zippy", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/abstractspellchecker.js", ["goog.ui.AbstractSpellChecker", "goog.ui.AbstractSpellChecker.AsyncResult"], ["goog.asserts", "goog.dom", "goog.dom.classes", "goog.dom.selection", "goog.events.EventType", "goog.math.Coordinate", "goog.spell.SpellCheck", "goog.structs.Set", "goog.style", "goog.ui.MenuItem", "goog.ui.MenuSeparator", "goog.ui.PopupMenu"]);
goog.addDependency("/closure/goog/ui/activitymonitor.js", ["goog.ui.ActivityMonitor"], ["goog.array", "goog.dom", "goog.events", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/closure/goog/ui/advancedtooltip.js", ["goog.ui.AdvancedTooltip"], ["goog.events.EventType", "goog.math.Coordinate", "goog.ui.Tooltip", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/animatedzippy.js", ["goog.ui.AnimatedZippy"], ["goog.dom", "goog.events", "goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Transition.EventType", "goog.fx.easing", "goog.ui.Zippy", "goog.ui.ZippyEvent"]);
goog.addDependency("/closure/goog/ui/attachablemenu.js", ["goog.ui.AttachableMenu"], ["goog.dom.a11y", "goog.dom.a11y.State", "goog.events.KeyCodes", "goog.ui.ItemEvent", "goog.ui.MenuBase"]);
goog.addDependency("/closure/goog/ui/autocomplete/arraymatcher.js", ["goog.ui.AutoComplete.ArrayMatcher"], ["goog.iter", "goog.string", "goog.ui.AutoComplete"]);
goog.addDependency("/closure/goog/ui/autocomplete/autocomplete.js", ["goog.ui.AutoComplete", "goog.ui.AutoComplete.EventType"], ["goog.events", "goog.events.EventTarget"]);
goog.addDependency("/closure/goog/ui/autocomplete/basic.js", ["goog.ui.AutoComplete.Basic"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.ArrayMatcher", "goog.ui.AutoComplete.InputHandler", "goog.ui.AutoComplete.Renderer"]);
goog.addDependency("/closure/goog/ui/autocomplete/inputhandler.js", ["goog.ui.AutoComplete.InputHandler"], ["goog.Disposable", "goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.selection", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.string", "goog.ui.AutoComplete", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/closure/goog/ui/autocomplete/remote.js", ["goog.ui.AutoComplete.Remote"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.InputHandler", "goog.ui.AutoComplete.RemoteArrayMatcher", "goog.ui.AutoComplete.Renderer"]);
goog.addDependency("/closure/goog/ui/autocomplete/remotearraymatcher.js", ["goog.ui.AutoComplete.RemoteArrayMatcher"], ["goog.Disposable", "goog.Uri", "goog.events", "goog.json", "goog.net.XhrIo", "goog.ui.AutoComplete"]);
goog.addDependency("/closure/goog/ui/autocomplete/renderer.js", ["goog.ui.AutoComplete.Renderer", "goog.ui.AutoComplete.Renderer.CustomRenderer"], ["goog.dispose", "goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.fx.dom.FadeInAndShow", "goog.fx.dom.FadeOutAndHide", "goog.iter", "goog.string", "goog.style", "goog.ui.AutoComplete", "goog.ui.AutoComplete.EventType", "goog.ui.IdGenerator", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/autocomplete/richinputhandler.js", ["goog.ui.AutoComplete.RichInputHandler"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.InputHandler"]);
goog.addDependency("/closure/goog/ui/autocomplete/richremote.js", ["goog.ui.AutoComplete.RichRemote"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.Remote", "goog.ui.AutoComplete.Renderer", "goog.ui.AutoComplete.RichInputHandler", "goog.ui.AutoComplete.RichRemoteArrayMatcher"]);
goog.addDependency("/closure/goog/ui/autocomplete/richremotearraymatcher.js", ["goog.ui.AutoComplete.RichRemoteArrayMatcher"], ["goog.ui.AutoComplete", "goog.ui.AutoComplete.RemoteArrayMatcher"]);
goog.addDependency("/closure/goog/ui/basicmenu.js", ["goog.ui.BasicMenu", "goog.ui.BasicMenu.Item", "goog.ui.BasicMenu.Separator"], ["goog.array", "goog.dom", "goog.dom.a11y", "goog.events.EventType", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.ui.AttachableMenu", "goog.ui.ItemEvent"]);
goog.addDependency("/closure/goog/ui/bidiinput.js", ["goog.ui.BidiInput"], ["goog.events", "goog.events.InputHandler", "goog.i18n.bidi", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/bubble.js", ["goog.ui.Bubble"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.math.Box", "goog.positioning", "goog.positioning.AbsolutePosition", "goog.positioning.AbstractPosition", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.style", "goog.ui.Component", "goog.ui.Popup", "goog.ui.Popup.AnchoredPosition"]);
goog.addDependency("/closure/goog/ui/button.js", ["goog.ui.Button", "goog.ui.Button.Side"], ["goog.events.KeyCodes", "goog.ui.ButtonRenderer", "goog.ui.ButtonSide", "goog.ui.Control", "goog.ui.ControlContent", "goog.ui.NativeButtonRenderer"]);
goog.addDependency("/closure/goog/ui/buttonrenderer.js", ["goog.ui.ButtonRenderer"], ["goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.ui.ButtonSide", "goog.ui.Component.State", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/buttonside.js", ["goog.ui.ButtonSide"], []);
goog.addDependency("/closure/goog/ui/cccbutton.js", ["goog.ui.CccButton"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.ui.DeprecatedButton", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/charcounter.js", ["goog.ui.CharCounter", "goog.ui.CharCounter.Display"], ["goog.dom", "goog.events", "goog.events.EventTarget", "goog.events.InputHandler"]);
goog.addDependency("/closure/goog/ui/charpicker.js", ["goog.ui.CharPicker"], ["goog.array", "goog.dom", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.events.InputHandler", "goog.events.KeyHandler", "goog.i18n.CharListDecompressor", "goog.i18n.uChar", "goog.structs.Set", "goog.style", "goog.ui.Button", "goog.ui.Component", "goog.ui.ContainerScroller", "goog.ui.FlatButtonRenderer", "goog.ui.HoverCard", "goog.ui.LabelInput", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.MenuItem", "goog.ui.Tooltip.ElementTooltipPosition"]);
goog.addDependency("/closure/goog/ui/checkbox.js", ["goog.ui.Checkbox", "goog.ui.Checkbox.State"], ["goog.dom.a11y", "goog.dom.a11y.State", "goog.events.EventType", "goog.events.KeyCodes", "goog.ui.CheckboxRenderer", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/checkboxmenuitem.js", ["goog.ui.CheckBoxMenuItem"], ["goog.ui.ControlContent", "goog.ui.MenuItem", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/checkboxrenderer.js", ["goog.ui.CheckboxRenderer"], ["goog.array", "goog.asserts", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.dom.classes", "goog.object", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/colorbutton.js", ["goog.ui.ColorButton"], ["goog.ui.Button", "goog.ui.ColorButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/colorbuttonrenderer.js", ["goog.ui.ColorButtonRenderer"], ["goog.dom.classes", "goog.functions", "goog.ui.ColorMenuButtonRenderer"]);
goog.addDependency("/closure/goog/ui/colormenubutton.js", ["goog.ui.ColorMenuButton"], ["goog.array", "goog.object", "goog.ui.ColorMenuButtonRenderer", "goog.ui.ColorPalette", "goog.ui.Component.EventType", "goog.ui.ControlContent", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/colormenubuttonrenderer.js", ["goog.ui.ColorMenuButtonRenderer"], ["goog.color", "goog.dom.classes", "goog.ui.ControlContent", "goog.ui.MenuButtonRenderer", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/colorpalette.js", ["goog.ui.ColorPalette"], ["goog.array", "goog.color", "goog.dom", "goog.style", "goog.ui.Palette", "goog.ui.PaletteRenderer"]);
goog.addDependency("/closure/goog/ui/colorpicker.js", ["goog.ui.ColorPicker", "goog.ui.ColorPicker.EventType"], ["goog.ui.ColorPalette", "goog.ui.Component", "goog.ui.Component.State"]);
goog.addDependency("/closure/goog/ui/colorsplitbehavior.js", ["goog.ui.ColorSplitBehavior"], ["goog.ui.ColorButton", "goog.ui.ColorMenuButton", "goog.ui.SplitBehavior"]);
goog.addDependency("/closure/goog/ui/combobox.js", ["goog.ui.ComboBox", "goog.ui.ComboBoxItem"], ["goog.Timer", "goog.debug.Logger", "goog.dom.classes", "goog.events", "goog.events.InputHandler", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.string", "goog.style", "goog.ui.Component", "goog.ui.ItemEvent", "goog.ui.LabelInput", "goog.ui.Menu", "goog.ui.MenuItem", "goog.ui.registry", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/component.js", ["goog.ui.Component", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Component.State"], ["goog.array", "goog.array.ArrayLike", "goog.dom", "goog.events.EventHandler", "goog.events.EventTarget", "goog.object", "goog.style", "goog.ui.IdGenerator"]);
goog.addDependency("/closure/goog/ui/container.js", ["goog.ui.Container", "goog.ui.Container.EventType", "goog.ui.Container.Orientation"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.style", "goog.ui.Component", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ContainerRenderer"]);
goog.addDependency("/closure/goog/ui/containerrenderer.js", ["goog.ui.ContainerRenderer"], ["goog.array", "goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.string", "goog.style", "goog.ui.Separator", "goog.ui.registry", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/containerscroller.js", ["goog.ui.ContainerScroller"], ["goog.Timer", "goog.events.EventHandler", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.Container.EventType"]);
goog.addDependency("/closure/goog/ui/control.js", ["goog.ui.Control"], ["goog.array", "goog.dom", "goog.events.BrowserEvent.MouseButton", "goog.events.Event", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.string", "goog.ui.Component", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.ControlRenderer", "goog.ui.decorate", "goog.ui.registry", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/controlcontent.js", ["goog.ui.ControlContent"], []);
goog.addDependency("/closure/goog/ui/controlrenderer.js", ["goog.ui.ControlRenderer"], ["goog.array", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.dom.classes", "goog.object", "goog.style", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/cookieeditor.js", ["goog.ui.CookieEditor"], ["goog.dom", "goog.dom.TagName", "goog.events.EventType", "goog.net.cookies", "goog.string", "goog.style", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/css3buttonrenderer.js", ["goog.ui.Css3ButtonRenderer"], ["goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.ui.Button", "goog.ui.ButtonRenderer", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/css3menubuttonrenderer.js", ["goog.ui.Css3MenuButtonRenderer"], ["goog.dom", "goog.dom.TagName", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.MenuButton", "goog.ui.MenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/cssnames.js", ["goog.ui.INLINE_BLOCK_CLASSNAME"], []);
goog.addDependency("/closure/goog/ui/custombutton.js", ["goog.ui.CustomButton"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/custombuttonrenderer.js", ["goog.ui.CustomButtonRenderer"], ["goog.dom", "goog.dom.classes", "goog.string", "goog.ui.ButtonRenderer", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME"]);
goog.addDependency("/closure/goog/ui/customcolorpalette.js", ["goog.ui.CustomColorPalette"], ["goog.color", "goog.dom", "goog.ui.ColorPalette"]);
goog.addDependency("/closure/goog/ui/datepicker.js", ["goog.ui.DatePicker", "goog.ui.DatePicker.Events", "goog.ui.DatePickerEvent"], ["goog.date", "goog.date.Date", "goog.date.Interval", "goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.i18n.DateTimeFormat", "goog.i18n.DateTimeSymbols", "goog.style", "goog.ui.Component", "goog.ui.IdGenerator"]);
goog.addDependency("/closure/goog/ui/decorate.js", ["goog.ui.decorate"], ["goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/deprecatedbutton.js", ["goog.ui.DeprecatedButton"], ["goog.dom", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/closure/goog/ui/dialog.js", ["goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.ButtonSet.DefaultButtons", "goog.ui.Dialog.DefaultButtonCaptions", "goog.ui.Dialog.DefaultButtonKeys", "goog.ui.Dialog.Event", "goog.ui.Dialog.EventType"], ["goog.asserts", "goog.dom", "goog.dom.NodeType", "goog.dom.TagName", "goog.dom.a11y", "goog.dom.classes", "goog.events.Event", "goog.events.EventType", "goog.events.KeyCodes", "goog.fx.Dragger", "goog.math.Rect", "goog.structs", "goog.structs.Map", "goog.style", "goog.ui.ModalPopup", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/dimensionpicker.js", ["goog.ui.DimensionPicker"], ["goog.events.EventType", "goog.math.Size", "goog.ui.Control", "goog.ui.DimensionPickerRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/dimensionpickerrenderer.js", ["goog.ui.DimensionPickerRenderer"], ["goog.dom", "goog.dom.TagName", "goog.i18n.bidi", "goog.style", "goog.ui.ControlRenderer", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/dragdropdetector.js", ["goog.ui.DragDropDetector", "goog.ui.DragDropDetector.EventType", "goog.ui.DragDropDetector.ImageDropEvent", "goog.ui.DragDropDetector.LinkDropEvent"], ["goog.dom", "goog.dom.TagName", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.math.Coordinate", "goog.string", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/drilldownrow.js", ["goog.ui.DrilldownRow"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/editor/abstractdialog.js", ["goog.ui.editor.AbstractDialog", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.AbstractDialog.EventType"], ["goog.dom", "goog.dom.classes", "goog.events.EventTarget", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.DefaultButtonKeys", "goog.ui.Dialog.Event", "goog.ui.Dialog.EventType"]);
goog.addDependency("/closure/goog/ui/editor/bubble.js", ["goog.ui.editor.Bubble"], ["goog.debug.Logger", "goog.dom", "goog.dom.ViewportSizeMonitor", "goog.editor.style", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.positioning", "goog.string", "goog.style", "goog.ui.Component.EventType", "goog.ui.PopupBase", "goog.ui.PopupBase.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/editor/defaulttoolbar.js", ["goog.ui.editor.DefaultToolbar"], ["goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.editor.Command", "goog.string.StringBuffer", "goog.style", "goog.ui.ControlContent", "goog.ui.editor.ToolbarFactory", "goog.ui.editor.messages"]);
goog.addDependency("/closure/goog/ui/editor/equationeditordialog.js", ["goog.ui.editor.EquationEditorDialog"], ["goog.editor.Command", "goog.ui.editor.AbstractDialog", "goog.ui.editor.EquationEditorOkEvent", "goog.ui.equation.ChangeEvent", "goog.ui.equation.TexEditor"]);
goog.addDependency("/closure/goog/ui/editor/equationeditorokevent.js", ["goog.ui.editor.EquationEditorOkEvent"], ["goog.events.Event", "goog.ui.editor.AbstractDialog"]);
goog.addDependency("/closure/goog/ui/editor/linkdialog.js", ["goog.ui.editor.LinkDialog", "goog.ui.editor.LinkDialog.BeforeTestLinkEvent", "goog.ui.editor.LinkDialog.EventType", "goog.ui.editor.LinkDialog.OkEvent"], ["goog.dom", "goog.dom.DomHelper", "goog.dom.TagName", "goog.dom.classes", "goog.dom.selection", "goog.editor.BrowserFeature", "goog.editor.Link", "goog.editor.focus", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.events.InputHandler", "goog.events.InputHandler.EventType", "goog.string", "goog.style", "goog.ui.Button", "goog.ui.LinkButtonRenderer", "goog.ui.editor.AbstractDialog", "goog.ui.editor.AbstractDialog.Builder", "goog.ui.editor.AbstractDialog.EventType", "goog.ui.editor.TabPane", "goog.ui.editor.messages", "goog.userAgent", "goog.window"]);
goog.addDependency("/closure/goog/ui/editor/messages.js", ["goog.ui.editor.messages"], []);
goog.addDependency("/closure/goog/ui/editor/tabpane.js", ["goog.ui.editor.TabPane"], ["goog.dom.TagName", "goog.events.EventHandler", "goog.ui.Component", "goog.ui.Control", "goog.ui.Tab", "goog.ui.TabBar"]);
goog.addDependency("/closure/goog/ui/editor/toolbarcontroller.js", ["goog.ui.editor.ToolbarController"], ["goog.editor.Field.EventType", "goog.events.EventHandler", "goog.events.EventTarget", "goog.ui.Component.EventType"]);
goog.addDependency("/closure/goog/ui/editor/toolbarfactory.js", ["goog.ui.editor.ToolbarFactory"], ["goog.array", "goog.dom", "goog.string", "goog.string.Unicode", "goog.style", "goog.ui.Component.State", "goog.ui.Container.Orientation", "goog.ui.ControlContent", "goog.ui.Option", "goog.ui.Toolbar", "goog.ui.ToolbarButton", "goog.ui.ToolbarColorMenuButton", "goog.ui.ToolbarMenuButton", "goog.ui.ToolbarRenderer", "goog.ui.ToolbarSelect", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/emoji/emoji.js", ["goog.ui.emoji.Emoji"], []);
goog.addDependency("/closure/goog/ui/emoji/emojipalette.js", ["goog.ui.emoji.EmojiPalette"], ["goog.events.Event", "goog.events.EventType", "goog.net.ImageLoader", "goog.ui.Palette", "goog.ui.emoji.Emoji", "goog.ui.emoji.EmojiPaletteRenderer"]);
goog.addDependency("/closure/goog/ui/emoji/emojipaletterenderer.js", ["goog.ui.emoji.EmojiPaletteRenderer"], ["goog.dom", "goog.dom.a11y", "goog.ui.PaletteRenderer", "goog.ui.emoji.Emoji", "goog.ui.emoji.SpriteInfo"]);
goog.addDependency("/closure/goog/ui/emoji/emojipicker.js", ["goog.ui.emoji.EmojiPicker"], ["goog.debug.Logger", "goog.dom", "goog.ui.Component", "goog.ui.TabPane", "goog.ui.TabPane.TabPage", "goog.ui.emoji.Emoji", "goog.ui.emoji.EmojiPalette", "goog.ui.emoji.EmojiPaletteRenderer", "goog.ui.emoji.ProgressiveEmojiPaletteRenderer"]);
goog.addDependency("/closure/goog/ui/emoji/popupemojipicker.js", ["goog.ui.emoji.PopupEmojiPicker"], ["goog.dom", "goog.events.EventType", "goog.positioning.AnchoredPosition", "goog.ui.Component", "goog.ui.Popup", "goog.ui.emoji.EmojiPicker"]);
goog.addDependency("/closure/goog/ui/emoji/progressiveemojipaletterenderer.js", ["goog.ui.emoji.ProgressiveEmojiPaletteRenderer"], ["goog.ui.emoji.EmojiPaletteRenderer"]);
goog.addDependency("/closure/goog/ui/emoji/spriteinfo.js", ["goog.ui.emoji.SpriteInfo"], []);
goog.addDependency("/closure/goog/ui/equation/arrowpalette.js", ["goog.ui.equation.ArrowPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/closure/goog/ui/equation/changeevent.js", ["goog.ui.equation.ChangeEvent"], ["goog.events.Event", "goog.events.EventType"]);
goog.addDependency("/closure/goog/ui/equation/comparisonpalette.js", ["goog.ui.equation.ComparisonPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/closure/goog/ui/equation/editorpane.js", ["goog.ui.equation.EditorPane"], ["goog.dom", "goog.style", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/equation/equationeditor.js", ["goog.ui.equation.EquationEditor"], ["goog.dom", "goog.events", "goog.ui.Component", "goog.ui.Tab", "goog.ui.TabBar", "goog.ui.equation.EditorPane", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexPane"]);
goog.addDependency("/closure/goog/ui/equation/equationeditordialog.js", ["goog.ui.equation.EquationEditorDialog"], ["goog.dom", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.equation.EquationEditor", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexEditor"]);
goog.addDependency("/closure/goog/ui/equation/greekpalette.js", ["goog.ui.equation.GreekPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/closure/goog/ui/equation/imagerenderer.js", ["goog.ui.equation.ImageRenderer"], ["goog.dom.TagName", "goog.dom.classes", "goog.string", "goog.uri.utils"]);
goog.addDependency("/closure/goog/ui/equation/mathpalette.js", ["goog.ui.equation.MathPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/closure/goog/ui/equation/menupalette.js", ["goog.ui.equation.MenuPalette", "goog.ui.equation.MenuPaletteRenderer"], ["goog.math.Size", "goog.style", "goog.ui.equation.Palette", "goog.ui.equation.PaletteRenderer"]);
goog.addDependency("/closure/goog/ui/equation/palette.js", ["goog.ui.equation.Palette", "goog.ui.equation.PaletteEvent", "goog.ui.equation.PaletteRenderer"], ["goog.dom", "goog.dom.TagName", "goog.ui.Palette", "goog.ui.equation.ImageRenderer"]);
goog.addDependency("/closure/goog/ui/equation/palettemanager.js", ["goog.ui.equation.PaletteManager"], ["goog.Timer", "goog.events.EventTarget", "goog.ui.equation.ArrowPalette", "goog.ui.equation.ComparisonPalette", "goog.ui.equation.GreekPalette", "goog.ui.equation.MathPalette", "goog.ui.equation.MenuPalette", "goog.ui.equation.Palette", "goog.ui.equation.SymbolPalette"]);
goog.addDependency("/closure/goog/ui/equation/symbolpalette.js", ["goog.ui.equation.SymbolPalette"], ["goog.math.Size", "goog.ui.equation.Palette"]);
goog.addDependency("/closure/goog/ui/equation/texeditor.js", ["goog.ui.equation.TexEditor"], ["goog.dom", "goog.ui.Component", "goog.ui.equation.ImageRenderer", "goog.ui.equation.TexPane"]);
goog.addDependency("/closure/goog/ui/equation/texpane.js", ["goog.ui.equation.TexPane"], ["goog.Timer", "goog.dom", "goog.dom.TagName", "goog.dom.selection", "goog.events", "goog.events.EventType", "goog.events.InputHandler", "goog.string", "goog.style", "goog.ui.Component", "goog.ui.equation.ChangeEvent", "goog.ui.equation.EditorPane", "goog.ui.equation.ImageRenderer", "goog.ui.equation.PaletteManager"]);
goog.addDependency("/closure/goog/ui/filteredmenu.js", ["goog.ui.FilteredMenu"], ["goog.dom", "goog.events.EventType", "goog.events.InputHandler", "goog.events.KeyCodes", "goog.string", "goog.ui.FilterObservingMenuItem", "goog.ui.Menu"]);
goog.addDependency("/closure/goog/ui/filterobservingmenuitem.js", ["goog.ui.FilterObservingMenuItem"], ["goog.ui.ControlContent", "goog.ui.FilterObservingMenuItemRenderer", "goog.ui.MenuItem", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/filterobservingmenuitemrenderer.js", ["goog.ui.FilterObservingMenuItemRenderer"], ["goog.ui.MenuItemRenderer"]);
goog.addDependency("/closure/goog/ui/flatbuttonrenderer.js", ["goog.ui.FlatButtonRenderer"], ["goog.dom.classes", "goog.ui.Button", "goog.ui.ButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/flatmenubuttonrenderer.js", ["goog.ui.FlatMenuButtonRenderer"], ["goog.style", "goog.ui.ControlContent", "goog.ui.FlatButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.MenuRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/formpost.js", ["goog.ui.FormPost"], ["goog.array", "goog.dom.TagName", "goog.string", "goog.string.StringBuffer", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/gauge.js", ["goog.ui.Gauge", "goog.ui.GaugeColoredRange"], ["goog.dom", "goog.dom.a11y", "goog.fx.Animation", "goog.fx.Animation.EventType", "goog.fx.Transition.EventType", "goog.fx.easing", "goog.graphics", "goog.graphics.Font", "goog.graphics.Path", "goog.graphics.SolidFill", "goog.ui.Component", "goog.ui.GaugeTheme"]);
goog.addDependency("/closure/goog/ui/gaugetheme.js", ["goog.ui.GaugeTheme"], ["goog.graphics.LinearGradient", "goog.graphics.SolidFill", "goog.graphics.Stroke"]);
goog.addDependency("/closure/goog/ui/hovercard.js", ["goog.ui.HoverCard", "goog.ui.HoverCard.EventType", "goog.ui.HoverCard.TriggerEvent"], ["goog.dom", "goog.events", "goog.events.EventType", "goog.ui.AdvancedTooltip"]);
goog.addDependency("/closure/goog/ui/hsvapalette.js", ["goog.ui.HsvaPalette"], ["goog.array", "goog.color", "goog.color.alpha", "goog.events.EventType", "goog.ui.Component.EventType", "goog.ui.HsvPalette"]);
goog.addDependency("/closure/goog/ui/hsvpalette.js", ["goog.ui.HsvPalette"], ["goog.color", "goog.dom", "goog.dom.DomHelper", "goog.events", "goog.events.Event", "goog.events.EventType", "goog.events.InputHandler", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/idgenerator.js", ["goog.ui.IdGenerator"], []);
goog.addDependency("/closure/goog/ui/idletimer.js", ["goog.ui.IdleTimer"], ["goog.Timer", "goog.events", "goog.events.EventTarget", "goog.structs.Set", "goog.ui.ActivityMonitor"]);
goog.addDependency("/closure/goog/ui/iframemask.js", ["goog.ui.IframeMask"], ["goog.Disposable", "goog.Timer", "goog.dom", "goog.dom.DomHelper", "goog.dom.iframe", "goog.events.EventHandler", "goog.events.EventTarget", "goog.style"]);
goog.addDependency("/closure/goog/ui/imagelessbuttonrenderer.js", ["goog.ui.ImagelessButtonRenderer"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/imagelessmenubuttonrenderer.js", ["goog.ui.ImagelessMenuButtonRenderer"], ["goog.dom", "goog.dom.TagName", "goog.ui.ControlContent", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.MenuButton", "goog.ui.MenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/imagelessroundedcorner.js", ["goog.ui.AbstractImagelessRoundedCorner", "goog.ui.CanvasRoundedCorner", "goog.ui.ImagelessRoundedCorner", "goog.ui.VmlRoundedCorner"], ["goog.dom.DomHelper", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.graphics.Path", "goog.graphics.VmlGraphics", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/inputdatepicker.js", ["goog.ui.InputDatePicker"], ["goog.date.DateTime", "goog.dom", "goog.i18n.DateTimeParse", "goog.string", "goog.ui.Component", "goog.ui.PopupDatePicker"]);
goog.addDependency("/closure/goog/ui/itemevent.js", ["goog.ui.ItemEvent"], ["goog.events.Event"]);
goog.addDependency("/closure/goog/ui/keyboardshortcuthandler.js", ["goog.ui.KeyboardShortcutEvent", "goog.ui.KeyboardShortcutHandler", "goog.ui.KeyboardShortcutHandler.EventType"], ["goog.Timer", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyNames", "goog.object"]);
goog.addDependency("/closure/goog/ui/labelinput.js", ["goog.ui.LabelInput"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.dom.classes", "goog.events.EventHandler", "goog.events.EventType", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/linkbuttonrenderer.js", ["goog.ui.LinkButtonRenderer"], ["goog.ui.Button", "goog.ui.FlatButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/media/flashobject.js", ["goog.ui.media.FlashObject", "goog.ui.media.FlashObject.ScriptAccessLevel", "goog.ui.media.FlashObject.Wmodes"], ["goog.asserts", "goog.debug.Logger", "goog.events.EventHandler", "goog.string", "goog.structs.Map", "goog.style", "goog.ui.Component", "goog.ui.Component.Error", "goog.userAgent", "goog.userAgent.flash"]);
goog.addDependency("/closure/goog/ui/media/flickr.js", ["goog.ui.media.FlickrSet", "goog.ui.media.FlickrSetModel"], ["goog.object", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/media/googlevideo.js", ["goog.ui.media.GoogleVideo", "goog.ui.media.GoogleVideoModel"], ["goog.string", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/media/media.js", ["goog.ui.media.Media", "goog.ui.media.MediaRenderer"], ["goog.style", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/media/mediamodel.js", ["goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Category", "goog.ui.media.MediaModel.Credit", "goog.ui.media.MediaModel.Credit.Role", "goog.ui.media.MediaModel.Credit.Scheme", "goog.ui.media.MediaModel.Medium", "goog.ui.media.MediaModel.MimeType", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaModel.SubTitle", "goog.ui.media.MediaModel.Thumbnail"], ["goog.array"]);
goog.addDependency("/closure/goog/ui/media/mp3.js", ["goog.ui.media.Mp3"], ["goog.string", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/media/photo.js", ["goog.ui.media.Photo"], ["goog.ui.media.Media", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/media/picasa.js", ["goog.ui.media.PicasaAlbum", "goog.ui.media.PicasaAlbumModel"], ["goog.object", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/media/vimeo.js", ["goog.ui.media.Vimeo", "goog.ui.media.VimeoModel"], ["goog.string", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/media/youtube.js", ["goog.ui.media.Youtube", "goog.ui.media.YoutubeModel"], ["goog.string", "goog.ui.Component.Error", "goog.ui.Component.State", "goog.ui.media.FlashObject", "goog.ui.media.Media", "goog.ui.media.MediaModel", "goog.ui.media.MediaModel.Player", "goog.ui.media.MediaModel.Thumbnail", "goog.ui.media.MediaRenderer"]);
goog.addDependency("/closure/goog/ui/menu.js", ["goog.ui.Menu", "goog.ui.Menu.EventType"], ["goog.math.Coordinate", "goog.string", "goog.style", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.Container", "goog.ui.Container.Orientation", "goog.ui.MenuHeader", "goog.ui.MenuItem", "goog.ui.MenuRenderer", "goog.ui.MenuSeparator"]);
goog.addDependency("/closure/goog/ui/menubase.js", ["goog.ui.MenuBase"], ["goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.ui.Popup"]);
goog.addDependency("/closure/goog/ui/menubutton.js", ["goog.ui.MenuButton"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler.EventType", "goog.math.Box", "goog.math.Rect", "goog.positioning", "goog.positioning.Corner", "goog.positioning.MenuAnchoredPosition", "goog.style", "goog.ui.Button", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.Menu", "goog.ui.MenuButtonRenderer", "goog.ui.registry", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/closure/goog/ui/menubuttonrenderer.js", ["goog.ui.MenuButtonRenderer"], ["goog.dom", "goog.style", "goog.ui.CustomButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.Menu", "goog.ui.MenuRenderer", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/menuheader.js", ["goog.ui.MenuHeader"], ["goog.ui.Component.State", "goog.ui.Control", "goog.ui.MenuHeaderRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/menuheaderrenderer.js", ["goog.ui.MenuHeaderRenderer"], ["goog.dom", "goog.dom.classes", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/menuitem.js", ["goog.ui.MenuItem"], ["goog.array", "goog.dom", "goog.dom.classes", "goog.events.KeyCodes", "goog.math.Coordinate", "goog.string", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.ControlContent", "goog.ui.MenuItemRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/menuitemrenderer.js", ["goog.ui.MenuItemRenderer"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.classes", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/menurenderer.js", ["goog.ui.MenuRenderer"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.ui.ContainerRenderer", "goog.ui.Separator"]);
goog.addDependency("/closure/goog/ui/menuseparator.js", ["goog.ui.MenuSeparator"], ["goog.ui.MenuSeparatorRenderer", "goog.ui.Separator", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/menuseparatorrenderer.js", ["goog.ui.MenuSeparatorRenderer"], ["goog.dom", "goog.dom.classes", "goog.ui.ControlContent", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/mockactivitymonitor.js", ["goog.ui.MockActivityMonitor"], ["goog.events.EventType", "goog.ui.ActivityMonitor"]);
goog.addDependency("/closure/goog/ui/modalpopup.js", ["goog.ui.ModalPopup"], ["goog.Timer", "goog.asserts", "goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.dom.iframe", "goog.events", "goog.events.EventType", "goog.events.FocusHandler", "goog.fx.Transition", "goog.style", "goog.ui.Component", "goog.ui.PopupBase.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/nativebuttonrenderer.js", ["goog.ui.NativeButtonRenderer"], ["goog.dom.classes", "goog.events.EventType", "goog.ui.ButtonRenderer", "goog.ui.Component.State"]);
goog.addDependency("/closure/goog/ui/offlineinstalldialog.js", ["goog.ui.OfflineInstallDialog", "goog.ui.OfflineInstallDialog.ButtonKeyType", "goog.ui.OfflineInstallDialog.EnableScreen", "goog.ui.OfflineInstallDialog.InstallScreen", "goog.ui.OfflineInstallDialog.InstallingGearsScreen", "goog.ui.OfflineInstallDialog.ScreenType", "goog.ui.OfflineInstallDialog.UpgradeScreen", "goog.ui.OfflineInstallDialogScreen"], ["goog.Disposable", "goog.dom.classes", "goog.gears", "goog.string", "goog.string.StringBuffer", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.EventType", "goog.window"]);
goog.addDependency("/closure/goog/ui/offlinestatuscard.js", ["goog.ui.OfflineStatusCard", "goog.ui.OfflineStatusCard.EventType"], ["goog.dom", "goog.events.EventType", "goog.gears.StatusType", "goog.structs.Map", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.ProgressBar"]);
goog.addDependency("/closure/goog/ui/offlinestatuscomponent.js", ["goog.ui.OfflineStatusComponent", "goog.ui.OfflineStatusComponent.StatusClassNames"], ["goog.dom.classes", "goog.events.EventType", "goog.gears.StatusType", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.ui.Component", "goog.ui.OfflineStatusCard.EventType", "goog.ui.Popup"]);
goog.addDependency("/closure/goog/ui/option.js", ["goog.ui.Option"], ["goog.ui.Component.EventType", "goog.ui.ControlContent", "goog.ui.MenuItem", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/palette.js", ["goog.ui.Palette"], ["goog.array", "goog.dom", "goog.events.EventType", "goog.events.KeyCodes", "goog.math.Size", "goog.ui.Component.Error", "goog.ui.Component.EventType", "goog.ui.Control", "goog.ui.PaletteRenderer", "goog.ui.SelectionModel"]);
goog.addDependency("/closure/goog/ui/paletterenderer.js", ["goog.ui.PaletteRenderer"], ["goog.array", "goog.dom", "goog.dom.NodeType", "goog.dom.a11y", "goog.dom.classes", "goog.style", "goog.ui.ControlRenderer", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/plaintextspellchecker.js", ["goog.ui.PlainTextSpellChecker"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.events.EventHandler", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.style", "goog.ui.AbstractSpellChecker", "goog.ui.AbstractSpellChecker.AsyncResult", "goog.ui.Component.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/popup.js", ["goog.ui.Popup", "goog.ui.Popup.AbsolutePosition", "goog.ui.Popup.AnchoredPosition", "goog.ui.Popup.AnchoredViewPortPosition", "goog.ui.Popup.ClientPosition", "goog.ui.Popup.Corner", "goog.ui.Popup.Overflow", "goog.ui.Popup.ViewPortClientPosition", "goog.ui.Popup.ViewPortPosition"], ["goog.math.Box", "goog.positioning", "goog.positioning.AbsolutePosition", "goog.positioning.AnchoredPosition", "goog.positioning.AnchoredViewportPosition", "goog.positioning.ClientPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.positioning.OverflowStatus", "goog.positioning.ViewportClientPosition", "goog.positioning.ViewportPosition", "goog.style", "goog.ui.PopupBase"]);
goog.addDependency("/closure/goog/ui/popupbase.js", ["goog.ui.PopupBase", "goog.ui.PopupBase.EventType", "goog.ui.PopupBase.Type"], ["goog.Timer", "goog.dom", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.fx.Transition", "goog.fx.Transition.EventType", "goog.style", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/popupcolorpicker.js", ["goog.ui.PopupColorPicker"], ["goog.dom.classes", "goog.events.EventType", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.ui.ColorPicker", "goog.ui.ColorPicker.EventType", "goog.ui.Component", "goog.ui.Popup"]);
goog.addDependency("/closure/goog/ui/popupdatepicker.js", ["goog.ui.PopupDatePicker"], ["goog.events.EventType", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.style", "goog.ui.Component", "goog.ui.DatePicker", "goog.ui.DatePicker.Events", "goog.ui.Popup", "goog.ui.PopupBase.EventType"]);
goog.addDependency("/closure/goog/ui/popupmenu.js", ["goog.ui.PopupMenu"], ["goog.events.EventType", "goog.positioning.AnchoredViewportPosition", "goog.positioning.Corner", "goog.positioning.MenuAnchoredPosition", "goog.positioning.ViewportClientPosition", "goog.structs", "goog.structs.Map", "goog.style", "goog.ui.Component.EventType", "goog.ui.Menu", "goog.ui.PopupBase", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/progressbar.js", ["goog.ui.ProgressBar", "goog.ui.ProgressBar.Orientation"], ["goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.RangeModel", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/prompt.js", ["goog.ui.Prompt"], ["goog.Timer", "goog.dom", "goog.events", "goog.events.EventType", "goog.functions", "goog.ui.Component.Error", "goog.ui.Dialog", "goog.ui.Dialog.ButtonSet", "goog.ui.Dialog.DefaultButtonKeys", "goog.ui.Dialog.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/rangemodel.js", ["goog.ui.RangeModel"], ["goog.events.EventTarget", "goog.ui.Component.EventType"]);
goog.addDependency("/closure/goog/ui/ratings.js", ["goog.ui.Ratings", "goog.ui.Ratings.EventType"], ["goog.dom.a11y", "goog.dom.classes", "goog.events.EventType", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/registry.js", ["goog.ui.registry"], ["goog.dom.classes"]);
goog.addDependency("/closure/goog/ui/richtextspellchecker.js", ["goog.ui.RichTextSpellChecker"], ["goog.Timer", "goog.dom", "goog.dom.NodeType", "goog.events", "goog.events.EventType", "goog.string.StringBuffer", "goog.ui.AbstractSpellChecker", "goog.ui.AbstractSpellChecker.AsyncResult"]);
goog.addDependency("/closure/goog/ui/roundedpanel.js", ["goog.ui.BaseRoundedPanel", "goog.ui.CssRoundedPanel", "goog.ui.GraphicsRoundedPanel", "goog.ui.RoundedPanel", "goog.ui.RoundedPanel.Corner"], ["goog.dom", "goog.dom.classes", "goog.graphics", "goog.graphics.SolidFill", "goog.graphics.Stroke", "goog.math.Coordinate", "goog.style", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/roundedtabrenderer.js", ["goog.ui.RoundedTabRenderer"], ["goog.dom", "goog.ui.Tab", "goog.ui.TabBar.Location", "goog.ui.TabRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/scrollfloater.js", ["goog.ui.ScrollFloater", "goog.ui.ScrollFloater.EventType"], ["goog.dom", "goog.dom.classes", "goog.events.EventType", "goog.object", "goog.style", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/select.js", ["goog.ui.Select"], ["goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.events.EventType", "goog.ui.Component.EventType", "goog.ui.ControlContent", "goog.ui.MenuButton", "goog.ui.SelectionModel", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/selectionmenubutton.js", ["goog.ui.SelectionMenuButton", "goog.ui.SelectionMenuButton.SelectionState"], ["goog.events.EventType", "goog.ui.Component.EventType", "goog.ui.Menu", "goog.ui.MenuButton", "goog.ui.MenuItem"]);
goog.addDependency("/closure/goog/ui/selectionmodel.js", ["goog.ui.SelectionModel"], ["goog.array", "goog.events.EventTarget", "goog.events.EventType"]);
goog.addDependency("/closure/goog/ui/separator.js", ["goog.ui.Separator"], ["goog.dom.a11y", "goog.ui.Component.State", "goog.ui.Control", "goog.ui.MenuSeparatorRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/serverchart.js", ["goog.ui.ServerChart", "goog.ui.ServerChart.AxisDisplayType", "goog.ui.ServerChart.ChartType", "goog.ui.ServerChart.EncodingType", "goog.ui.ServerChart.Event", "goog.ui.ServerChart.LegendPosition", "goog.ui.ServerChart.MaximumValue", "goog.ui.ServerChart.MultiAxisAlignment", "goog.ui.ServerChart.MultiAxisType", "goog.ui.ServerChart.UriParam", "goog.ui.ServerChart.UriTooLongEvent"], ["goog.Uri", "goog.array", "goog.asserts", "goog.events.Event", "goog.string", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/slider.js", ["goog.ui.Slider", "goog.ui.Slider.Orientation"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.ui.SliderBase", "goog.ui.SliderBase.Orientation"]);
goog.addDependency("/closure/goog/ui/sliderbase.js", ["goog.ui.SliderBase", "goog.ui.SliderBase.Orientation"], ["goog.Timer", "goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.dom.a11y.State", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.events.KeyCodes", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.events.MouseWheelHandler", "goog.events.MouseWheelHandler.EventType", "goog.fx.AnimationParallelQueue", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.fx.Transition.EventType", "goog.fx.dom.ResizeHeight", "goog.fx.dom.ResizeWidth", "goog.fx.dom.SlideFrom", "goog.math", "goog.math.Coordinate", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.RangeModel"]);
goog.addDependency("/closure/goog/ui/splitbehavior.js", ["goog.ui.SplitBehavior", "goog.ui.SplitBehavior.DefaultHandlers"], ["goog.Disposable", "goog.array", "goog.dispose", "goog.dom", "goog.dom.DomHelper", "goog.dom.classes", "goog.events", "goog.events.EventHandler", "goog.events.EventType", "goog.string", "goog.ui.ButtonSide", "goog.ui.Component", "goog.ui.Component.Error", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.decorate", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/splitpane.js", ["goog.ui.SplitPane", "goog.ui.SplitPane.Orientation"], ["goog.dom", "goog.dom.classes", "goog.events.EventType", "goog.fx.Dragger", "goog.fx.Dragger.EventType", "goog.math.Rect", "goog.math.Size", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/style/app/buttonrenderer.js", ["goog.ui.style.app.ButtonRenderer"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/style/app/menubuttonrenderer.js", ["goog.ui.style.app.MenuButtonRenderer"], ["goog.array", "goog.dom", "goog.dom.a11y.Role", "goog.style", "goog.ui.ControlContent", "goog.ui.Menu", "goog.ui.MenuRenderer", "goog.ui.style.app.ButtonRenderer"]);
goog.addDependency("/closure/goog/ui/style/app/primaryactionbuttonrenderer.js", ["goog.ui.style.app.PrimaryActionButtonRenderer"], ["goog.ui.Button", "goog.ui.registry", "goog.ui.style.app.ButtonRenderer"]);
goog.addDependency("/closure/goog/ui/submenu.js", ["goog.ui.SubMenu"], ["goog.Timer", "goog.dom", "goog.dom.classes", "goog.events.KeyCodes", "goog.positioning.AnchoredViewportPosition", "goog.positioning.Corner", "goog.style", "goog.ui.Component", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.Menu", "goog.ui.MenuItem", "goog.ui.SubMenuRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/submenurenderer.js", ["goog.ui.SubMenuRenderer"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.State", "goog.dom.classes", "goog.style", "goog.ui.Menu", "goog.ui.MenuItemRenderer"]);
goog.addDependency("/closure/goog/ui/tab.js", ["goog.ui.Tab"], ["goog.ui.Component.State", "goog.ui.Control", "goog.ui.ControlContent", "goog.ui.TabRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/tabbar.js", ["goog.ui.TabBar", "goog.ui.TabBar.Location"], ["goog.ui.Component.EventType", "goog.ui.Container", "goog.ui.Container.Orientation", "goog.ui.Tab", "goog.ui.TabBarRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/tabbarrenderer.js", ["goog.ui.TabBarRenderer"], ["goog.dom.a11y.Role", "goog.object", "goog.ui.ContainerRenderer"]);
goog.addDependency("/closure/goog/ui/tablesorter.js", ["goog.ui.TableSorter", "goog.ui.TableSorter.EventType"], ["goog.array", "goog.dom", "goog.dom.TagName", "goog.dom.classes", "goog.events", "goog.events.EventType", "goog.functions", "goog.ui.Component"]);
goog.addDependency("/closure/goog/ui/tabpane.js", ["goog.ui.TabPane", "goog.ui.TabPane.Events", "goog.ui.TabPane.TabLocation", "goog.ui.TabPane.TabPage", "goog.ui.TabPaneEvent"], ["goog.dom", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.style"]);
goog.addDependency("/closure/goog/ui/tabrenderer.js", ["goog.ui.TabRenderer"], ["goog.dom.a11y.Role", "goog.ui.Component.State", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/textarea.js", ["goog.ui.Textarea"], ["goog.Timer", "goog.events.EventType", "goog.events.KeyCodes", "goog.style", "goog.ui.Control", "goog.ui.TextareaRenderer", "goog.userAgent", "goog.userAgent.product"]);
goog.addDependency("/closure/goog/ui/textarearenderer.js", ["goog.ui.TextareaRenderer"], ["goog.ui.Component.State", "goog.ui.ControlRenderer"]);
goog.addDependency("/closure/goog/ui/togglebutton.js", ["goog.ui.ToggleButton"], ["goog.ui.Button", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.CustomButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/toolbar.js", ["goog.ui.Toolbar"], ["goog.ui.Container", "goog.ui.ToolbarRenderer"]);
goog.addDependency("/closure/goog/ui/toolbarbutton.js", ["goog.ui.ToolbarButton"], ["goog.ui.Button", "goog.ui.ControlContent", "goog.ui.ToolbarButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/toolbarbuttonrenderer.js", ["goog.ui.ToolbarButtonRenderer"], ["goog.ui.CustomButtonRenderer"]);
goog.addDependency("/closure/goog/ui/toolbarcolormenubutton.js", ["goog.ui.ToolbarColorMenuButton"], ["goog.ui.ColorMenuButton", "goog.ui.ControlContent", "goog.ui.ToolbarColorMenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/toolbarcolormenubuttonrenderer.js", ["goog.ui.ToolbarColorMenuButtonRenderer"], ["goog.dom.classes", "goog.ui.ColorMenuButtonRenderer", "goog.ui.ControlContent", "goog.ui.MenuButtonRenderer", "goog.ui.ToolbarMenuButtonRenderer"]);
goog.addDependency("/closure/goog/ui/toolbarmenubutton.js", ["goog.ui.ToolbarMenuButton"], ["goog.ui.ControlContent", "goog.ui.MenuButton", "goog.ui.ToolbarMenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/toolbarmenubuttonrenderer.js", ["goog.ui.ToolbarMenuButtonRenderer"], ["goog.ui.MenuButtonRenderer"]);
goog.addDependency("/closure/goog/ui/toolbarrenderer.js", ["goog.ui.ToolbarRenderer"], ["goog.dom.a11y.Role", "goog.ui.Container.Orientation", "goog.ui.ContainerRenderer", "goog.ui.Separator", "goog.ui.ToolbarSeparatorRenderer"]);
goog.addDependency("/closure/goog/ui/toolbarselect.js", ["goog.ui.ToolbarSelect"], ["goog.ui.ControlContent", "goog.ui.Select", "goog.ui.ToolbarMenuButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/toolbarseparator.js", ["goog.ui.ToolbarSeparator"], ["goog.ui.Separator", "goog.ui.ToolbarSeparatorRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/toolbarseparatorrenderer.js", ["goog.ui.ToolbarSeparatorRenderer"], ["goog.dom.classes", "goog.ui.INLINE_BLOCK_CLASSNAME", "goog.ui.MenuSeparatorRenderer"]);
goog.addDependency("/closure/goog/ui/toolbartogglebutton.js", ["goog.ui.ToolbarToggleButton"], ["goog.ui.ControlContent", "goog.ui.ToggleButton", "goog.ui.ToolbarButtonRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/tooltip.js", ["goog.ui.Tooltip", "goog.ui.Tooltip.CursorTooltipPosition", "goog.ui.Tooltip.ElementTooltipPosition", "goog.ui.Tooltip.State"], ["goog.Timer", "goog.array", "goog.dom", "goog.events", "goog.events.EventType", "goog.math.Box", "goog.math.Coordinate", "goog.positioning", "goog.positioning.AnchoredPosition", "goog.positioning.Corner", "goog.positioning.Overflow", "goog.positioning.OverflowStatus", "goog.positioning.ViewportPosition", "goog.structs.Set", "goog.style", "goog.ui.Popup", "goog.ui.PopupBase"]);
goog.addDependency("/closure/goog/ui/tree/basenode.js", ["goog.ui.tree.BaseNode", "goog.ui.tree.BaseNode.EventType"], ["goog.Timer", "goog.asserts", "goog.dom.a11y", "goog.events.KeyCodes", "goog.string", "goog.string.StringBuffer", "goog.style", "goog.ui.Component", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/tree/treecontrol.js", ["goog.ui.tree.TreeControl"], ["goog.debug.Logger", "goog.dom.a11y", "goog.dom.classes", "goog.events.EventType", "goog.events.FocusHandler", "goog.events.KeyHandler", "goog.events.KeyHandler.EventType", "goog.ui.tree.BaseNode", "goog.ui.tree.TreeNode", "goog.ui.tree.TypeAhead", "goog.userAgent"]);
goog.addDependency("/closure/goog/ui/tree/treenode.js", ["goog.ui.tree.TreeNode"], ["goog.ui.tree.BaseNode"]);
goog.addDependency("/closure/goog/ui/tree/typeahead.js", ["goog.ui.tree.TypeAhead", "goog.ui.tree.TypeAhead.Offset"], ["goog.array", "goog.events.KeyCodes", "goog.string", "goog.structs.Trie"]);
goog.addDependency("/closure/goog/ui/tristatemenuitem.js", ["goog.ui.TriStateMenuItem", "goog.ui.TriStateMenuItem.State"], ["goog.dom.classes", "goog.ui.Component.EventType", "goog.ui.Component.State", "goog.ui.ControlContent", "goog.ui.MenuItem", "goog.ui.TriStateMenuItemRenderer", "goog.ui.registry"]);
goog.addDependency("/closure/goog/ui/tristatemenuitemrenderer.js", ["goog.ui.TriStateMenuItemRenderer"], ["goog.dom.classes", "goog.ui.MenuItemRenderer"]);
goog.addDependency("/closure/goog/ui/twothumbslider.js", ["goog.ui.TwoThumbSlider"], ["goog.dom", "goog.dom.a11y", "goog.dom.a11y.Role", "goog.ui.SliderBase"]);
goog.addDependency("/closure/goog/ui/zippy.js", ["goog.ui.Zippy", "goog.ui.Zippy.Events", "goog.ui.ZippyEvent"], ["goog.dom", "goog.dom.a11y", "goog.dom.classes", "goog.events", "goog.events.Event", "goog.events.EventHandler", "goog.events.EventTarget", "goog.events.EventType", "goog.events.KeyCodes", "goog.style"]);
goog.addDependency("/closure/goog/uri/uri.js", ["goog.Uri", "goog.Uri.QueryData"], ["goog.array", "goog.string", "goog.structs", "goog.structs.Map", "goog.uri.utils", "goog.uri.utils.ComponentIndex"]);
goog.addDependency("/closure/goog/uri/utils.js", ["goog.uri.utils", "goog.uri.utils.ComponentIndex", "goog.uri.utils.QueryArray", "goog.uri.utils.QueryValue", "goog.uri.utils.StandardQueryParam"], ["goog.asserts", "goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/useragent/adobereader.js", ["goog.userAgent.adobeReader"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/useragent/flash.js", ["goog.userAgent.flash"], ["goog.string"]);
goog.addDependency("/closure/goog/useragent/iphoto.js", ["goog.userAgent.iphoto"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/useragent/jscript.js", ["goog.userAgent.jscript"], ["goog.string"]);
goog.addDependency("/closure/goog/useragent/picasa.js", ["goog.userAgent.picasa"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/closure/goog/useragent/platform.js", ["goog.userAgent.platform"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/useragent/product.js", ["goog.userAgent.product"], ["goog.userAgent"]);
goog.addDependency("/closure/goog/useragent/product_isversion.js", ["goog.userAgent.product.isVersion"], ["goog.userAgent.product"]);
goog.addDependency("/closure/goog/useragent/useragent.js", ["goog.userAgent"], ["goog.string"]);
goog.addDependency("/closure/goog/vec/float32array.js", ["goog.vec.Float32Array"], []);
goog.addDependency("/closure/goog/vec/float64array.js", ["goog.vec.Float64Array"], []);
goog.addDependency("/closure/goog/vec/mat3.js", ["goog.vec.Mat3"], ["goog.vec", "goog.vec.Vec3"]);
goog.addDependency("/closure/goog/vec/mat4.js", ["goog.vec.Mat4"], ["goog.vec", "goog.vec.Vec3", "goog.vec.Vec4"]);
goog.addDependency("/closure/goog/vec/matrix3.js", ["goog.vec.Matrix3"], ["goog.vec"]);
goog.addDependency("/closure/goog/vec/matrix4.js", ["goog.vec.Matrix4"], ["goog.vec", "goog.vec.Vec3", "goog.vec.Vec4"]);
goog.addDependency("/closure/goog/vec/quaternion.js", ["goog.vec.Quaternion"], ["goog.vec", "goog.vec.Vec3", "goog.vec.Vec4"]);
goog.addDependency("/closure/goog/vec/ray.js", ["goog.vec.Ray"], ["goog.vec.Vec3"]);
goog.addDependency("/closure/goog/vec/vec.js", ["goog.vec"], ["goog.vec.Float32Array", "goog.vec.Float64Array"]);
goog.addDependency("/closure/goog/vec/vec2.js", ["goog.vec.Vec2"], ["goog.vec"]);
goog.addDependency("/closure/goog/vec/vec3.js", ["goog.vec.Vec3"], ["goog.vec"]);
goog.addDependency("/closure/goog/vec/vec4.js", ["goog.vec.Vec4"], ["goog.vec"]);
goog.addDependency("/closure/goog/webgl/webgl.js", ["goog.webgl"], []);
goog.addDependency("/closure/goog/window/window.js", ["goog.window"], ["goog.string", "goog.userAgent"]);
goog.addDependency("/soy/soyutils.js", [], []);
goog.addDependency("/soy/soyutils_usegoog.js", ["soy", "soy.StringBuilder", "soy.esc", "soydata", "soydata.SanitizedHtml", "soydata.SanitizedHtmlAttribute", "soydata.SanitizedJsStrChars", "soydata.SanitizedUri"], ["goog.asserts", "goog.dom.DomHelper", "goog.format", "goog.i18n.BidiFormatter", "goog.i18n.bidi", "goog.soy", "goog.string", "goog.string.StringBuffer"]);
goog.addDependency("/third_party/closure/goog/base.js", [], []);
goog.addDependency("/third_party/closure/goog/caja/string/html/htmlparser.js", ["goog.string.html.HtmlParser", "goog.string.html.HtmlParser.EFlags", "goog.string.html.HtmlParser.Elements", "goog.string.html.HtmlParser.Entities", "goog.string.html.HtmlSaxHandler"], []);
goog.addDependency("/third_party/closure/goog/caja/string/html/htmlsanitizer.js", ["goog.string.html.HtmlSanitizer", "goog.string.html.HtmlSanitizer.AttributeType", "goog.string.html.HtmlSanitizer.Attributes", "goog.string.html.htmlSanitize"], ["goog.string.StringBuffer", "goog.string.html.HtmlParser", "goog.string.html.HtmlParser.EFlags", "goog.string.html.HtmlParser.Elements", "goog.string.html.HtmlSaxHandler"]);
goog.addDependency("/third_party/closure/goog/dojo/dom/query.js", ["goog.dom.query"], ["goog.array", "goog.dom", "goog.functions", "goog.string", "goog.userAgent"]);
goog.addDependency("/third_party/closure/goog/dojo/dom/query_test.js", [], ["goog.dom", "goog.dom.query", "goog.testing.asserts"]);
goog.addDependency("/third_party/closure/goog/jpeg_encoder/jpeg_encoder_basic.js", ["goog.crypt.JpegEncoder"], ["goog.crypt.base64"]);
goog.addDependency("/third_party/closure/goog/loremipsum/text/loremipsum.js", ["goog.text.LoremIpsum"], ["goog.array", "goog.math", "goog.string", "goog.structs.Map", "goog.structs.Set"]);
goog.addDependency("/third_party/closure/goog/mochikit/async/deferred.js", ["goog.async.Deferred", "goog.async.Deferred.AlreadyCalledError", "goog.async.Deferred.CancelledError"], ["goog.array", "goog.asserts", "goog.debug.Error"]);
goog.addDependency("/third_party/closure/goog/mochikit/async/deferredlist.js", ["goog.async.DeferredList"], ["goog.array", "goog.async.Deferred"]);
goog.addDependency("/third_party/closure/goog/osapi/osapi.js", ["goog.osapi"], []);
goog.addDependency("/third_party/closure/goog/silverlight/clipboardbutton.js", ["goog.silverlight.ClipboardButton", "goog.silverlight.ClipboardButtonType", "goog.silverlight.ClipboardEvent", "goog.silverlight.CopyButton", "goog.silverlight.PasteButton", "goog.silverlight.PasteButtonEvent"], ["goog.asserts", "goog.events.Event", "goog.math.Size", "goog.silverlight", "goog.ui.Component"]);
goog.addDependency("/third_party/closure/goog/silverlight/silverlight.js", ["goog.silverlight"], []);
goog.addDependency("/third_party/closure/goog/silverlight/supporteduseragent.js", ["goog.silverlight.supportedUserAgent"], []);
goog.addDependency("msgf.js", ["gcin"], ["goog.i18n.MessageFormat"]);
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provides a base class for custom Error objects such that the
 * stack is correctly maintained.
 *
 * You should never need to throw goog.debug.Error(msg) directly, Error(msg) is
 * sufficient.
 *
 */

goog.provide('goog.debug.Error');



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
goog.debug.Error = function(opt_msg) {

  // Ensure there is a stack trace.
  this.stack = new Error().stack || '';

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(goog.debug.Error, Error);


/** @override */
goog.debug.Error.prototype.name = 'CustomError';
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for string manipulation.
 */


/**
 * Namespace for string utilities
 */
goog.provide('goog.string');
goog.provide('goog.string.Unicode');


/**
 * Common Unicode string characters.
 * @enum {string}
 */
goog.string.Unicode = {
  NBSP: '\xa0'
};


/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix}.
 */
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};


/**
 * Fast suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix}.
 */
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};


/**
 * Case-insensitive prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix  A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(
      prefix, str.substr(0, prefix.length)) == 0;
};


/**
 * Case-insensitive suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(
      suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} str The string containing the pattern.
 * @param {...*} var_args The items to substitute into the pattern.
 * @return {string} A copy of {@code str} in which each occurrence of
 *     {@code %s} has been replaced an argument from {@code var_args}.
 */
goog.string.subs = function(str, var_args) {
  // This appears to be slow, but testing shows it compares more or less
  // equivalent to the regex.exec method.
  for (var i = 1; i < arguments.length; i++) {
    // We cast to String in case an argument is a Function.  Replacing $&, for
    // example, with $$$& stops the replace from subsituting the whole match
    // into the resultant string.  $$$& in the first replace becomes $$& in the
    //  second, which leaves $& in the resultant string.  Also:
    // $$, $`, $', $n $nn
    var replacement = String(arguments[i]).replace(/\$/g, '$$$$');
    str = str.replace(/\%s/, replacement);
  }
  return str;
};


/**
 * Converts multiple whitespace chars (spaces, non-breaking-spaces, new lines
 * and tabs) to a single space, and strips leading and trailing whitespace.
 * @param {string} str Input string.
 * @return {string} A copy of {@code str} with collapsed whitespace.
 */
goog.string.collapseWhitespace = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
};


/**
 * Checks if a string is empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} True if {@code str} is empty or whitespace only.
 */
goog.string.isEmpty = function(str) {
  // testing length == 0 first is actually slower in all browsers (about the
  // same in Opera).
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return /^[\s\xa0]*$/.test(str);
};


/**
 * Checks if a string is null, empty or contains only whitespaces.
 * @param {*} str The string to check.
 * @return {boolean} True if{@code str} is null, empty, or whitespace only.
 */
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str));
};


/**
 * Checks if a string is all breaking whitespace.
 * @param {string} str The string to check.
 * @return {boolean} Whether the string is all breaking whitespace.
 */
goog.string.isBreakingWhitespace = function(str) {
  return !/[^\t\n\r ]/.test(str);
};


/**
 * Checks if a string contains all letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} consists entirely of letters.
 */
goog.string.isAlpha = function(str) {
  return !/[^a-zA-Z]/.test(str);
};


/**
 * Checks if a string contains only numbers.
 * @param {*} str string to check. If not a string, it will be
 *     casted to one.
 * @return {boolean} True if {@code str} is numeric.
 */
goog.string.isNumeric = function(str) {
  return !/[^0-9]/.test(str);
};


/**
 * Checks if a string contains only numbers or letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} is alphanumeric.
 */
goog.string.isAlphaNumeric = function(str) {
  return !/[^a-zA-Z0-9]/.test(str);
};


/**
 * Checks if a character is a space character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a space.
 */
goog.string.isSpace = function(ch) {
  return ch == ' ';
};


/**
 * Checks if a character is a valid unicode character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a valid unicode character.
 */
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= ' ' && ch <= '~' ||
         ch >= '\u0080' && ch <= '\uFFFD';
};


/**
 * Takes a string and replaces newlines with a space. Multiple lines are
 * replaced with a single space.
 * @param {string} str The string from which to strip newlines.
 * @return {string} A copy of {@code str} stripped of newlines.
 */
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, ' ');
};


/**
 * Replaces Windows and Mac new lines with unix style: \r or \r\n with \n.
 * @param {string} str The string to in which to canonicalize newlines.
 * @return {string} {@code str} A copy of {@code} with canonicalized newlines.
 */
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, '\n');
};


/**
 * Normalizes whitespace in a string, replacing all whitespace chars with
 * a space.
 * @param {string} str The string in which to normalize whitespace.
 * @return {string} A copy of {@code str} with all whitespace normalized.
 */
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, ' ');
};


/**
 * Normalizes spaces in a string, replacing all consecutive spaces and tabs
 * with a single space. Replaces non-breaking space with a space.
 * @param {string} str The string in which to normalize spaces.
 * @return {string} A copy of {@code str} with all consecutive spaces and tabs
 *    replaced with a single space.
 */
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, ' ');
};


/**
 * Removes the breaking spaces from the left and right of the string and
 * collapses the sequences of breaking spaces in the middle into single spaces.
 * The original and the result strings render the same way in HTML.
 * @param {string} str A string in which to collapse spaces.
 * @return {string} Copy of the string with normalized breaking spaces.
 */
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, ' ').replace(
      /^[\t\r\n ]+|[\t\r\n ]+$/g, '');
};


/**
 * Trims white spaces to the left and right of a string.
 * @param {string} str The string to trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trim = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
};


/**
 * Trims whitespaces at the left end of a string.
 * @param {string} str The string to left trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimLeft = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+/, '');
};


/**
 * Trims whitespaces at the right end of a string.
 * @param {string} str The string to right trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimRight = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+$/, '');
};


/**
 * A string comparator that ignores case.
 * -1 = str1 less than str2
 *  0 = str1 equals str2
 *  1 = str1 greater than str2
 *
 * @param {string} str1 The string to compare.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} The comparator result, as described above.
 */
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();

  if (test1 < test2) {
    return -1;
  } else if (test1 == test2) {
    return 0;
  } else {
    return 1;
  }
};


/**
 * Regular expression used for splitting a string into substrings of fractional
 * numbers, integers, and non-numeric characters.
 * @type {RegExp}
 * @private
 */
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;


/**
 * String comparison function that handles numbers in a way humans might expect.
 * Using this function, the string "File 2.jpg" sorts before "File 10.jpg". The
 * comparison is mostly case-insensitive, though strings that are identical
 * except for case are sorted with the upper-case strings before lower-case.
 *
 * This comparison function is significantly slower (about 500x) than either
 * the default or the case-insensitive compare. It should not be used in
 * time-critical code, but should be fast enough to sort several hundred short
 * strings (like filenames) with a reasonable delay.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return -1;
  }
  if (!str2) {
    return 1;
  }

  // Using match to split the entire string ahead of time turns out to be faster
  // for most inputs than using RegExp.exec or iterating over each character.
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);

  var count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i];
    var b = tokens2[i];

    // Compare pairs of tokens, returning if one token sorts before the other.
    if (a != b) {

      // Only if both tokens are integers is a special comparison required.
      // Decimal numbers are sorted as strings (e.g., '.09' < '.1').
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }

  // If one string is a substring of the other, the shorter string sorts first.
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }

  // The two strings must be equivalent except for case (perfect equality is
  // tested at the head of the function.) Revert to default ASCII-betical string
  // comparison to stablize the sort.
  return str1 < str2 ? -1 : 1;
};


/**
 * Regular expression used for determining if a string needs to be encoded.
 * @type {RegExp}
 * @private
 */
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;


/**
 * URL-encodes a string
 * @param {*} str The string to url-encode.
 * @return {string} An encoded copy of {@code str} that is safe for urls.
 *     Note that '#', ':', and other characters used to delimit portions
 *     of URLs *will* be encoded.
 */
goog.string.urlEncode = function(str) {
  str = String(str);
  // Checking if the search matches before calling encodeURIComponent avoids an
  // extra allocation in IE6. This adds about 10us time in FF and a similiar
  // over head in IE6 for lower working set apps, but for large working set
  // apps like Gmail, it saves about 70us per call.
  if (!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str);
  }
  return str;
};


/**
 * URL-decodes the string. We need to specially handle '+'s because
 * the javascript library doesn't convert them to spaces.
 * @param {string} str The string to url decode.
 * @return {string} The decoded {@code str}.
 */
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, ' '));
};


/**
 * Converts \n to <br>s or <br />s.
 * @param {string} str The string in which to convert newlines.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} A copy of {@code str} with converted newlines.
 */
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
};


/**
 * Escape double quote '"' characters in addition to '&', '<', and '>' so that a
 * string can be included in an HTML tag attribute value within double quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * NOTE(user):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {

  if (opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, '&amp;')
          .replace(goog.string.ltRe_, '&lt;')
          .replace(goog.string.gtRe_, '&gt;')
          .replace(goog.string.quotRe_, '&quot;');

  } else {
    // quick test helps in the case when there are no chars to replace, in
    // worst case this makes barely a difference to the time taken
    if (!goog.string.allRe_.test(str)) return str;

    // str.indexOf is faster than regex.test in this case
    if (str.indexOf('&') != -1) {
      str = str.replace(goog.string.amperRe_, '&amp;');
    }
    if (str.indexOf('<') != -1) {
      str = str.replace(goog.string.ltRe_, '&lt;');
    }
    if (str.indexOf('>') != -1) {
      str = str.replace(goog.string.gtRe_, '&gt;');
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, '&quot;');
    }
    return str;
  }
};


/**
 * Regular expression that matches an ampersand, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.amperRe_ = /&/g;


/**
 * Regular expression that matches a less than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.ltRe_ = /</g;


/**
 * Regular expression that matches a greater than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.gtRe_ = />/g;


/**
 * Regular expression that matches a double quote, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.quotRe_ = /\"/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @type {RegExp}
 * @private
 */
goog.string.allRe_ = /[&<>\"]/;


/**
 * Unescapes an HTML string.
 *
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, '&')) {
    // We are careful not to use a DOM if we do not have one. We use the []
    // notation so that the JSCompiler will not complain about these objects and
    // fields in the case where we have no DOM.
    if ('document' in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      // Fall back on pure XML entities
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};


/**
 * Unescapes an HTML string using a DOM to resolve non-XML, non-numeric
 * entities. This function is XSS-safe and whitespace-preserving.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} The unescaped {@code str} string.
 */
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"'};
  var div = document.createElement('div');
  // Match as many valid entity characters as possible. If the actual entity
  // happens to be shorter, it will still work as innerHTML will return the
  // trailing characters unchanged. Since the entity characters do not include
  // open angle bracket, there is no chance of XSS from the innerHTML use.
  // Since no whitespace is passed to innerHTML, whitespace is preserved.
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    // Check for cached entity.
    var value = seen[s];
    if (value) {
      return value;
    }
    // Check for numeric entity.
    if (entity.charAt(0) == '#') {
      // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex numbers.
      var n = Number('0' + entity.substr(1));
      if (!isNaN(n)) {
        value = String.fromCharCode(n);
      }
    }
    // Fall back to innerHTML otherwise.
    if (!value) {
      // Append a non-entity character to avoid a bug in Webkit that parses
      // an invalid entity at the end of innerHTML text as the empty string.
      div.innerHTML = s + ' ';
      // Then remove the trailing character from the result.
      value = div.firstChild.nodeValue.slice(0, -1);
    }
    // Cache and return.
    return seen[s] = value;
  });
};


/**
 * Unescapes XML entities.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch (entity) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      default:
        if (entity.charAt(0) == '#') {
          // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex.
          var n = Number('0' + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        // For invalid entities we just return the entity
        return s;
    }
  });
};


/**
 * Regular expression that matches an HTML entity.
 * See also HTML5: Tokenization / Tokenizing character references.
 * @private
 * @type {!RegExp}
 */
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;


/**
 * Do escaping of whitespace to preserve spatial formatting. We use character
 * entity #160 to make it safer for xml.
 * @param {string} str The string in which to escape whitespace.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, ' &#160;'), opt_xml);
};


/**
 * Strip quote characters around a string.  The second argument is a string of
 * characters to treat as quotes.  This can be a single character or a string of
 * multiple character and in that case each of those are treated as possible
 * quote characters. For example:
 *
 * <pre>
 * goog.string.stripQuotes('"abc"', '"`') --> 'abc'
 * goog.string.stripQuotes('`abc`', '"`') --> 'abc'
 * </pre>
 *
 * @param {string} str The string to strip.
 * @param {string} quoteChars The quote characters to strip.
 * @return {string} A copy of {@code str} without the quotes.
 */
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0; i < length; i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};


/**
 * Truncates a string to a certain length and adds '...' if necessary.  The
 * length also accounts for the ellipsis, so a maximum length of 10 and a string
 * 'Hello World!' produces 'Hello W...'.
 * @param {string} str The string to truncate.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cut off in the middle.
 * @return {string} The truncated {@code str} string.
 */
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    str = str.substring(0, chars - 3) + '...';
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Truncate a string in the middle, adding "..." if necessary,
 * and favoring the beginning of the string.
 * @param {string} str The string to truncate the middle of.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cutoff in the middle.
 * @param {number=} opt_trailingChars Optional number of trailing characters to
 *     leave at the end of the string, instead of truncating as close to the
 *     middle as possible.
 * @return {string} A truncated copy of {@code str}.
 */
goog.string.truncateMiddle = function(str, chars,
    opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (opt_trailingChars && str.length > chars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + '...' + str.substring(endPoint);
  } else if (str.length > chars) {
    // Favor the beginning of the string:
    var half = Math.floor(chars / 2);
    var endPos = str.length - half;
    half += chars % 2;
    str = str.substring(0, half) + '...' + str.substring(endPos);
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Special chars that need to be escaped for goog.string.quote.
 * @private
 * @type {Object}
 */
goog.string.specialEscapeChars_ = {
  '\0': '\\0',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\x0B': '\\x0B', // '\v' is not supported in JScript
  '"': '\\"',
  '\\': '\\\\'
};


/**
 * Character mappings used internally for goog.string.escapeChar.
 * @private
 * @type {Object}
 */
goog.string.jsEscapeCache_ = {
  '\'': '\\\''
};


/**
 * Encloses a string in double quotes and escapes characters so that the
 * string is a valid JS string.
 * @param {string} s The string to quote.
 * @return {string} A copy of {@code s} surrounded by double quotes.
 */
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] ||
          ((cc > 31 && cc < 127) ? ch : goog.string.escapeChar(ch));
    }
    sb.push('"');
    return sb.join('');
  }
};


/**
 * Takes a string and returns the escaped string for that character.
 * @param {string} str The string to escape.
 * @return {string} An escaped string representing {@code str}.
 */
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0; i < str.length; i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join('');
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\x0E".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing {@code c}.
 */
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }

  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }

  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    // tab is 9 but handled above
    if (cc < 256) {
      rv = '\\x';
      if (cc < 16 || cc > 256) {
        rv += '0';
      }
    } else {
      rv = '\\u';
      if (cc < 4096) { // \u1000
        rv += '0';
      }
    }
    rv += cc.toString(16).toUpperCase();
  }

  return goog.string.jsEscapeCache_[c] = rv;
};


/**
 * Takes a string and creates a map (Object) in which the keys are the
 * characters in the string. The value for the key is set to true. You can
 * then use goog.object.map or goog.array.map to change the values.
 * @param {string} s The string to build the map from.
 * @return {Object} The map of characters used.
 */
// TODO(arv): It seems like we should have a generic goog.array.toMap. But do
//            we want a dependency on goog.array in goog.string?
goog.string.toMap = function(s) {
  var rv = {};
  for (var i = 0; i < s.length; i++) {
    rv[s.charAt(i)] = true;
  }
  return rv;
};


/**
 * Checks whether a string contains a given character.
 * @param {string} s The string to test.
 * @param {string} ss The substring to test for.
 * @return {boolean} True if {@code s} contains {@code ss}.
 */
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1;
};


/**
 * Returns the non-overlapping occurrences of ss in s.
 * If either s or ss evalutes to false, then returns zero.
 * @param {string} s The string to look in.
 * @param {string} ss The string to look for.
 * @return {number} Number of occurrences of ss in s.
 */
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0;
};


/**
 * Removes a substring of a specified length at a specific
 * index in a string.
 * @param {string} s The base string from which to remove.
 * @param {number} index The index at which to remove the substring.
 * @param {number} stringLength The length of the substring to remove.
 * @return {string} A copy of {@code s} with the substring removed or the full
 *     string if nothing is removed or the input is invalid.
 */
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  // If the index is greater or equal to 0 then remove substring
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) +
        s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};


/**
 *  Removes the first occurrence of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), '');
  return s.replace(re, '');
};


/**
 *  Removes all occurrences of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, '');
};


/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 */
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
      replace(/\x08/g, '\\x08');
};


/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing {@code length} repetitions of
 *     {@code string}.
 */
goog.string.repeat = function(string, length) {
  return new Array(length + 1).join(string);
};


/**
 * Pads number to given length and optionally rounds it to a given precision.
 * For example:
 * <pre>padNumber(1.25, 2, 3) -> '01.250'
 * padNumber(1.25, 2) -> '01.25'
 * padNumber(1.25, 2, 1) -> '01.3'
 * padNumber(1.25, 0) -> '1.25'</pre>
 *
 * @param {number} num The number to pad.
 * @param {number} length The desired length.
 * @param {number=} opt_precision The desired precision.
 * @return {string} {@code num} as a string with the given options.
 */
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf('.');
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat('0', Math.max(0, length - index)) + s;
};


/**
 * Returns a string representation of the given object, with
 * null and undefined being returned as the empty string.
 *
 * @param {*} obj The object to convert.
 * @return {string} A string representation of the {@code obj}.
 */
goog.string.makeSafe = function(obj) {
  return obj == null ? '' : String(obj);
};


/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {...*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of {@code var_args}.
 */
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};


/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) +
         Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};


/**
 * Compares two version numbers.
 *
 * @param {string|number} version1 Version of first item.
 * @param {string|number} version2 Version of second item.
 *
 * @return {number}  1 if {@code version1} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code version2} is higher.
 */
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  // Trim leading and trailing whitespace and split the versions into
  // subversions.
  var v1Subs = goog.string.trim(String(version1)).split('.');
  var v2Subs = goog.string.trim(String(version2)).split('.');
  var subCount = Math.max(v1Subs.length, v2Subs.length);

  // Iterate over the subversions, as long as they appear to be equivalent.
  for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
    var v1Sub = v1Subs[subIdx] || '';
    var v2Sub = v2Subs[subIdx] || '';

    // Split the subversions into pairs of numbers and qualifiers (like 'b').
    // Two different RegExp objects are needed because they are both using
    // the 'g' flag.
    var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
      var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
      // Break if there are no more matches.
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }

      // Parse the numeric part of the subversion. A missing number is
      // equivalent to 0.
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

      // Compare the subversion components. The number has the highest
      // precedence. Next, if the numbers are equal, a subversion without any
      // qualifier is always higher than a subversion with any qualifier. Next,
      // the qualifiers are compared as strings.
      order = goog.string.compareElements_(v1CompNum, v2CompNum) ||
          goog.string.compareElements_(v1Comp[2].length == 0,
              v2Comp[2].length == 0) ||
          goog.string.compareElements_(v1Comp[2], v2Comp[2]);
      // Stop as soon as an inequality is discovered.
    } while (order == 0);
  }

  return order;
};


/**
 * Compares elements of a version number.
 *
 * @param {string|number|boolean} left An element from a version number.
 * @param {string|number|boolean} right An element from a version number.
 *
 * @return {number}  1 if {@code left} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code right} is higher.
 * @private
 */
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  }
  return 0;
};


/**
 * Maximum value of #goog.string.hashCode, exclusive. 2^32.
 * @type {number}
 * @private
 */
goog.string.HASHCODE_MAX_ = 0x100000000;


/**
 * String hash function similar to java.lang.String.hashCode().
 * The hash code for a string is computed as
 * s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
 * where s[i] is the ith character of the string and n is the length of
 * the string. We mod the result to make it between 0 (inclusive) and 2^32
 * (exclusive).
 * @param {string} str A string.
 * @return {number} Hash value for {@code str}, between 0 (inclusive) and 2^32
 *  (exclusive). The empty string returns 0.
 */
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    result = 31 * result + str.charCodeAt(i);
    // Normalize to 4 byte range, 0 ... 2^32.
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};


/**
 * The most recent unique ID. |0 is equivalent to Math.floor in this case.
 * @type {number}
 * @private
 */
goog.string.uniqueStringCounter_ = Math.random() * 0x80000000 | 0;


/**
 * Generates and returns a string which is unique in the current document.
 * This is useful, for example, to create unique IDs for DOM elements.
 * @return {string} A unique id.
 */
goog.string.createUniqueString = function() {
  return 'goog_' + goog.string.uniqueStringCounter_++;
};


/**
 * Converts the supplied string to a number, which may be Ininity or NaN.
 * This function strips whitespace: (toNumber(' 123') === 123)
 * This function accepts scientific notation: (toNumber('1e1') === 10)
 *
 * This is better than Javascript's built-in conversions because, sadly:
 *     (Number(' ') === 0) and (parseFloat('123a') === 123)
 *
 * @param {string} str The string to convert.
 * @return {number} The number the supplied string represents, or NaN.
 */
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmpty(str)) {
    return NaN;
  }
  return num;
};


/**
 * A memoized cache for goog.string.toCamelCase.
 * @type {Object.<string>}
 * @private
 */
goog.string.toCamelCaseCache_ = {};


/**
 * Converts a string from selector-case to camelCase (e.g. from
 * "multi-part-string" to "multiPartString"), useful for converting
 * CSS selectors and HTML dataset keys to their equivalent JS properties.
 * @param {string} str The string in selector-case form.
 * @return {string} The string in camelCase form.
 */
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] ||
      (goog.string.toCamelCaseCache_[str] =
          String(str).replace(/\-([a-z])/g, function(all, match) {
            return match.toUpperCase();
          }));
};


/**
 * A memoized cache for goog.string.toSelectorCase.
 * @type {Object.<string>}
 * @private
 */
goog.string.toSelectorCaseCache_ = {};


/**
 * Converts a string from camelCase to selector-case (e.g. from
 * "multiPartString" to "multi-part-string"), useful for converting JS
 * style and dataset properties to equivalent CSS selectors and HTML keys.
 * @param {string} str The string in camelCase form.
 * @return {string} The string in selector-case form.
 */
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] ||
      (goog.string.toSelectorCaseCache_[str] =
          String(str).replace(/([A-Z])/g, '-$1').toLowerCase());
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities to check the preconditions, postconditions and
 * invariants runtime.
 *
 * Methods in this package should be given special treatment by the compiler
 * for type-inference. For example, <code>goog.asserts.assert(foo)</code>
 * will restrict <code>foo</code> to a truthy value.
 *
 * The compiler has an option to disable asserts. So code like:
 * <code>
 * var x = goog.asserts.assert(foo()); goog.asserts.assert(bar());
 * </code>
 * will be transformed into:
 * <code>
 * var x = foo();
 * </code>
 * The compiler will leave in foo() (because its return value is used),
 * but it will remove bar() because it assumes it does not have side-effects.
 *
 */

goog.provide('goog.asserts');
goog.provide('goog.asserts.AssertionError');

goog.require('goog.debug.Error');
goog.require('goog.string');


/**
 * @define {boolean} Whether to strip out asserts or to leave them in.
 */
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;



/**
 * Error object for failed assertions.
 * @param {string} messagePattern The pattern that was used to form message.
 * @param {!Array.<*>} messageArgs The items to substitute into the pattern.
 * @constructor
 * @extends {goog.debug.Error}
 */
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  // Remove the messagePattern afterwards to avoid permenantly modifying the
  // passed in array.
  messageArgs.shift();

  /**
   * The message pattern used to format the error message. Error handlers can
   * use this to uniquely identify the assertion.
   * @type {string}
   */
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);


/** @override */
goog.asserts.AssertionError.prototype.name = 'AssertionError';


/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {Array.<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {Array.<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 * @private
 */
goog.asserts.doAssertFailure_ =
    function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = 'Assertion failed';
  if (givenMessage) {
    message += ': ' + givenMessage;
    var args = givenArgs;
  } else if (defaultMessage) {
    message += ': ' + defaultMessage;
    args = defaultArgs;
  }
  // The '' + works around an Opera 10 bug in the unit tests. Without it,
  // a stack trace is added to var message above. With this, a stack trace is
  // not added until this line (it causes the extra garbage to be added after
  // the assertion message instead of in the middle of it).
  throw message;
};


/**
 * Checks if the condition evaluates to true if goog.asserts.ENABLE_ASSERTS is
 * true.
 * @param {*} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {*} The value of the condition.
 * @throws {goog.asserts.AssertionError} When the condition evaluates to false.
 */
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_('', null, opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};


/**
 * Fails if goog.asserts.ENABLE_ASSERTS is true. This function is useful in case
 * when we want to add a check in the unreachable area like switch-case
 * statement:
 *
 * <pre>
 *  switch(type) {
 *    case FOO: doSomething(); break;
 *    case BAR: doSomethingElse(); break;
 *    default: goog.assert.fail('Unrecognized type: ' + type);
 *      // We have only 2 types - "default:" section is unreachable code.
 *  }
 * </pre>
 *
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} Failure.
 */
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    throw 'Failure' + (opt_message ? ': ' + opt_message : '');s
  }
};


/**
 * Checks if the value is a number if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {number} The value, guaranteed to be a number when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 */
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_('Expected number but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {number} */ (value);
};


/**
 * Checks if the value is a string if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a string.
 */
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_('Expected string but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is a function if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Function} The value, guaranteed to be a function when asserts
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a function.
 */
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_('Expected function but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Function} */ (value);
};


/**
 * Checks if the value is an Object if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Object} The value, guaranteed to be a non-null object.
 * @throws {goog.asserts.AssertionError} When the value is not an object.
 */
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_('Expected object but got %s: %s.',
        [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Object} */ (value);
};


/**
 * Checks if the value is an Array if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Array} The value, guaranteed to be a non-null array.
 * @throws {goog.asserts.AssertionError} When the value is not an array.
 */
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_('Expected array but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Array} */ (value);
};


/**
 * Checks if the value is a boolean if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {boolean} The value, guaranteed to be a boolean when asserts are
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a boolean.
 */
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_('Expected boolean but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {boolean} */ (value);
};


/**
 * Checks if the value is an instance of the user-defined type if
 * goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {!Function} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not an instance of
 *     type.
 */
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_('instanceof check failed.', null,
        opt_message, Array.prototype.slice.call(arguments, 3));
  }
};

// Copyright 2011 The Closure Library Authors. All Rights Reserved
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Number formatting symbols.
 *
 * This file is autogenerated by script:
 * http://go/generate_number_constants.py
 * using the --for_closure flag.
 *
 * To reduce the file size (which may cause issues in some JS
 * developing environments), this file will only contain locales
 * that are frequently used by web applications. This is defined as
 * closure_tier1_locales and will change (most likely addition)
 * over time.  Rest of the data can be found in another file named
 * "numberformatsymbolsext.js", which will be generated at the
 * same time together with this file.
 *
 * Before checkin, this file could have been manually edited. This is
 * to incorporate changes before we could fix CLDR. All manual
 * modification must be documented in this section, and should be
 * removed after those changes land to CLDR.
 */

goog.provide('goog.i18n.NumberFormatSymbols');
goog.provide('goog.i18n.NumberFormatSymbols_am');
goog.provide('goog.i18n.NumberFormatSymbols_am_ET');
goog.provide('goog.i18n.NumberFormatSymbols_ar');
goog.provide('goog.i18n.NumberFormatSymbols_ar_EG');
goog.provide('goog.i18n.NumberFormatSymbols_bg');
goog.provide('goog.i18n.NumberFormatSymbols_bg_BG');
goog.provide('goog.i18n.NumberFormatSymbols_bn');
goog.provide('goog.i18n.NumberFormatSymbols_bn_BD');
goog.provide('goog.i18n.NumberFormatSymbols_ca');
goog.provide('goog.i18n.NumberFormatSymbols_ca_ES');
goog.provide('goog.i18n.NumberFormatSymbols_cs');
goog.provide('goog.i18n.NumberFormatSymbols_cs_CZ');
goog.provide('goog.i18n.NumberFormatSymbols_da');
goog.provide('goog.i18n.NumberFormatSymbols_da_DK');
goog.provide('goog.i18n.NumberFormatSymbols_de');
goog.provide('goog.i18n.NumberFormatSymbols_de_AT');
goog.provide('goog.i18n.NumberFormatSymbols_de_BE');
goog.provide('goog.i18n.NumberFormatSymbols_de_CH');
goog.provide('goog.i18n.NumberFormatSymbols_de_DE');
goog.provide('goog.i18n.NumberFormatSymbols_de_LU');
goog.provide('goog.i18n.NumberFormatSymbols_el');
goog.provide('goog.i18n.NumberFormatSymbols_el_GR');
goog.provide('goog.i18n.NumberFormatSymbols_el_POLYTON');
goog.provide('goog.i18n.NumberFormatSymbols_en');
goog.provide('goog.i18n.NumberFormatSymbols_en_AS');
goog.provide('goog.i18n.NumberFormatSymbols_en_AU');
goog.provide('goog.i18n.NumberFormatSymbols_en_Dsrt');
goog.provide('goog.i18n.NumberFormatSymbols_en_Dsrt_US');
goog.provide('goog.i18n.NumberFormatSymbols_en_GB');
goog.provide('goog.i18n.NumberFormatSymbols_en_GU');
goog.provide('goog.i18n.NumberFormatSymbols_en_IE');
goog.provide('goog.i18n.NumberFormatSymbols_en_IN');
goog.provide('goog.i18n.NumberFormatSymbols_en_MH');
goog.provide('goog.i18n.NumberFormatSymbols_en_MP');
goog.provide('goog.i18n.NumberFormatSymbols_en_SG');
goog.provide('goog.i18n.NumberFormatSymbols_en_UM');
goog.provide('goog.i18n.NumberFormatSymbols_en_US');
goog.provide('goog.i18n.NumberFormatSymbols_en_VI');
goog.provide('goog.i18n.NumberFormatSymbols_en_ZA');
goog.provide('goog.i18n.NumberFormatSymbols_es');
goog.provide('goog.i18n.NumberFormatSymbols_es_ES');
goog.provide('goog.i18n.NumberFormatSymbols_et');
goog.provide('goog.i18n.NumberFormatSymbols_et_EE');
goog.provide('goog.i18n.NumberFormatSymbols_eu');
goog.provide('goog.i18n.NumberFormatSymbols_eu_ES');
goog.provide('goog.i18n.NumberFormatSymbols_fa');
goog.provide('goog.i18n.NumberFormatSymbols_fa_IR');
goog.provide('goog.i18n.NumberFormatSymbols_fi');
goog.provide('goog.i18n.NumberFormatSymbols_fi_FI');
goog.provide('goog.i18n.NumberFormatSymbols_fil');
goog.provide('goog.i18n.NumberFormatSymbols_fil_PH');
goog.provide('goog.i18n.NumberFormatSymbols_fr');
goog.provide('goog.i18n.NumberFormatSymbols_fr_BL');
goog.provide('goog.i18n.NumberFormatSymbols_fr_CA');
goog.provide('goog.i18n.NumberFormatSymbols_fr_FR');
goog.provide('goog.i18n.NumberFormatSymbols_fr_GF');
goog.provide('goog.i18n.NumberFormatSymbols_fr_GP');
goog.provide('goog.i18n.NumberFormatSymbols_fr_MC');
goog.provide('goog.i18n.NumberFormatSymbols_fr_MF');
goog.provide('goog.i18n.NumberFormatSymbols_fr_MQ');
goog.provide('goog.i18n.NumberFormatSymbols_fr_RE');
goog.provide('goog.i18n.NumberFormatSymbols_fr_YT');
goog.provide('goog.i18n.NumberFormatSymbols_gl');
goog.provide('goog.i18n.NumberFormatSymbols_gl_ES');
goog.provide('goog.i18n.NumberFormatSymbols_gsw');
goog.provide('goog.i18n.NumberFormatSymbols_gsw_CH');
goog.provide('goog.i18n.NumberFormatSymbols_gu');
goog.provide('goog.i18n.NumberFormatSymbols_gu_IN');
goog.provide('goog.i18n.NumberFormatSymbols_he');
goog.provide('goog.i18n.NumberFormatSymbols_he_IL');
goog.provide('goog.i18n.NumberFormatSymbols_hi');
goog.provide('goog.i18n.NumberFormatSymbols_hi_IN');
goog.provide('goog.i18n.NumberFormatSymbols_hr');
goog.provide('goog.i18n.NumberFormatSymbols_hr_HR');
goog.provide('goog.i18n.NumberFormatSymbols_hu');
goog.provide('goog.i18n.NumberFormatSymbols_hu_HU');
goog.provide('goog.i18n.NumberFormatSymbols_id');
goog.provide('goog.i18n.NumberFormatSymbols_id_ID');
goog.provide('goog.i18n.NumberFormatSymbols_in');
goog.provide('goog.i18n.NumberFormatSymbols_is');
goog.provide('goog.i18n.NumberFormatSymbols_is_IS');
goog.provide('goog.i18n.NumberFormatSymbols_it');
goog.provide('goog.i18n.NumberFormatSymbols_it_IT');
goog.provide('goog.i18n.NumberFormatSymbols_iw');
goog.provide('goog.i18n.NumberFormatSymbols_ja');
goog.provide('goog.i18n.NumberFormatSymbols_ja_JP');
goog.provide('goog.i18n.NumberFormatSymbols_kn');
goog.provide('goog.i18n.NumberFormatSymbols_kn_IN');
goog.provide('goog.i18n.NumberFormatSymbols_ko');
goog.provide('goog.i18n.NumberFormatSymbols_ko_KR');
goog.provide('goog.i18n.NumberFormatSymbols_ln');
goog.provide('goog.i18n.NumberFormatSymbols_ln_CD');
goog.provide('goog.i18n.NumberFormatSymbols_lt');
goog.provide('goog.i18n.NumberFormatSymbols_lt_LT');
goog.provide('goog.i18n.NumberFormatSymbols_lv');
goog.provide('goog.i18n.NumberFormatSymbols_lv_LV');
goog.provide('goog.i18n.NumberFormatSymbols_ml');
goog.provide('goog.i18n.NumberFormatSymbols_ml_IN');
goog.provide('goog.i18n.NumberFormatSymbols_mr');
goog.provide('goog.i18n.NumberFormatSymbols_mr_IN');
goog.provide('goog.i18n.NumberFormatSymbols_ms');
goog.provide('goog.i18n.NumberFormatSymbols_ms_MY');
goog.provide('goog.i18n.NumberFormatSymbols_mt');
goog.provide('goog.i18n.NumberFormatSymbols_mt_MT');
goog.provide('goog.i18n.NumberFormatSymbols_nl');
goog.provide('goog.i18n.NumberFormatSymbols_nl_NL');
goog.provide('goog.i18n.NumberFormatSymbols_no');
goog.provide('goog.i18n.NumberFormatSymbols_or');
goog.provide('goog.i18n.NumberFormatSymbols_or_IN');
goog.provide('goog.i18n.NumberFormatSymbols_pl');
goog.provide('goog.i18n.NumberFormatSymbols_pl_PL');
goog.provide('goog.i18n.NumberFormatSymbols_pt');
goog.provide('goog.i18n.NumberFormatSymbols_pt_BR');
goog.provide('goog.i18n.NumberFormatSymbols_pt_PT');
goog.provide('goog.i18n.NumberFormatSymbols_ro');
goog.provide('goog.i18n.NumberFormatSymbols_ro_RO');
goog.provide('goog.i18n.NumberFormatSymbols_ru');
goog.provide('goog.i18n.NumberFormatSymbols_ru_RU');
goog.provide('goog.i18n.NumberFormatSymbols_sk');
goog.provide('goog.i18n.NumberFormatSymbols_sk_SK');
goog.provide('goog.i18n.NumberFormatSymbols_sl');
goog.provide('goog.i18n.NumberFormatSymbols_sl_SI');
goog.provide('goog.i18n.NumberFormatSymbols_sq');
goog.provide('goog.i18n.NumberFormatSymbols_sq_AL');
goog.provide('goog.i18n.NumberFormatSymbols_sr');
goog.provide('goog.i18n.NumberFormatSymbols_sr_Cyrl_RS');
goog.provide('goog.i18n.NumberFormatSymbols_sr_Latn_RS');
goog.provide('goog.i18n.NumberFormatSymbols_sv');
goog.provide('goog.i18n.NumberFormatSymbols_sv_SE');
goog.provide('goog.i18n.NumberFormatSymbols_sw');
goog.provide('goog.i18n.NumberFormatSymbols_sw_TZ');
goog.provide('goog.i18n.NumberFormatSymbols_ta');
goog.provide('goog.i18n.NumberFormatSymbols_ta_IN');
goog.provide('goog.i18n.NumberFormatSymbols_te');
goog.provide('goog.i18n.NumberFormatSymbols_te_IN');
goog.provide('goog.i18n.NumberFormatSymbols_th');
goog.provide('goog.i18n.NumberFormatSymbols_th_TH');
goog.provide('goog.i18n.NumberFormatSymbols_tl');
goog.provide('goog.i18n.NumberFormatSymbols_tr');
goog.provide('goog.i18n.NumberFormatSymbols_tr_TR');
goog.provide('goog.i18n.NumberFormatSymbols_uk');
goog.provide('goog.i18n.NumberFormatSymbols_uk_UA');
goog.provide('goog.i18n.NumberFormatSymbols_ur');
goog.provide('goog.i18n.NumberFormatSymbols_ur_PK');
goog.provide('goog.i18n.NumberFormatSymbols_vi');
goog.provide('goog.i18n.NumberFormatSymbols_vi_VN');
goog.provide('goog.i18n.NumberFormatSymbols_zh');
goog.provide('goog.i18n.NumberFormatSymbols_zh_CN');
goog.provide('goog.i18n.NumberFormatSymbols_zh_HK');
goog.provide('goog.i18n.NumberFormatSymbols_zh_Hans');
goog.provide('goog.i18n.NumberFormatSymbols_zh_Hans_CN');
goog.provide('goog.i18n.NumberFormatSymbols_zh_TW');


/**
 * Number formatting symbols for locale am.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_am = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'ETB'
};


/**
 * Number formatting symbols for locale am_ET.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_am_ET = goog.i18n.NumberFormatSymbols_am;


/**
 * Number formatting symbols for locale ar.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ar = {
  DECIMAL_SEP: '\u066B',
  GROUP_SEP: '\u066C',
  PERCENT: '\u066A',
  ZERO_DIGIT: '\u0660',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u0627\u0633',
  PERMILL: '\u0609',
  INFINITY: '\u221E',
  NAN: '\u0644\u064A\u0633 \u0631\u0642\u0645',
  DECIMAL_PATTERN: '#,##0.###;#,##0.###-',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00;\u00A4\u00A0#,##0.00-',
  DEF_CURRENCY_CODE: 'EGP'
};


/**
 * Number formatting symbols for locale ar_EG.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ar_EG = goog.i18n.NumberFormatSymbols_ar;


/**
 * Number formatting symbols for locale bg.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_bg = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'BGN'
};


/**
 * Number formatting symbols for locale bg_BG.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_bg_BG = goog.i18n.NumberFormatSymbols_bg;


/**
 * Number formatting symbols for locale bn.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_bn = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '\u09e6',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u09B8\u0982\u0996\u09CD\u09AF\u09BE \u09A8\u09BE',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '#,##,##0.00\u00A4;(#,##,##0.00\u00A4)',
  DEF_CURRENCY_CODE: 'BDT'
};


/**
 * Number formatting symbols for locale bn_BD.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_bn_BD = goog.i18n.NumberFormatSymbols_bn;


/**
 * Number formatting symbols for locale ca.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ca = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale ca_ES.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ca_ES = goog.i18n.NumberFormatSymbols_ca;


/**
 * Number formatting symbols for locale cs.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_cs = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'CZK'
};


/**
 * Number formatting symbols for locale cs_CZ.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_cs_CZ = goog.i18n.NumberFormatSymbols_cs;


/**
 * Number formatting symbols for locale da.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_da = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'DKK'
};


/**
 * Number formatting symbols for locale da_DK.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_da_DK = goog.i18n.NumberFormatSymbols_da;


/**
 * Number formatting symbols for locale de.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_de = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale de_AT.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_de_AT = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale de_BE.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_de_BE = goog.i18n.NumberFormatSymbols_de;


/**
 * Number formatting symbols for locale de_CH.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_de_CH = {
  DECIMAL_SEP: '.',
  GROUP_SEP: '\'',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00;\u00A4-#,##0.00',
  DEF_CURRENCY_CODE: 'CHF'
};


/**
 * Number formatting symbols for locale de_DE.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_de_DE = goog.i18n.NumberFormatSymbols_de;


/**
 * Number formatting symbols for locale de_LU.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_de_LU = goog.i18n.NumberFormatSymbols_de;


/**
 * Number formatting symbols for locale el.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_el = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'e',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale el_GR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_el_GR = goog.i18n.NumberFormatSymbols_el;


/**
 * Number formatting symbols for locale el_POLYTON.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_el_POLYTON = goog.i18n.NumberFormatSymbols_el;


/**
 * Number formatting symbols for locale en.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'USD'
};


/**
 * Number formatting symbols for locale en_AS.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_AS = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_AU.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_AU = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'AUD'
};


/**
 * Number formatting symbols for locale en_Dsrt.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_Dsrt = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_Dsrt_US.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_Dsrt_US = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_GB.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_GB = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'GBP'
};


/**
 * Number formatting symbols for locale en_GU.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_GU = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_IE.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_IE = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale en_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_IN = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale en_MH.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_MH = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_MP.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_MP = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_SG.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_SG = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'SGD'
};


/**
 * Number formatting symbols for locale en_UM.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_UM = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_US.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_US = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_VI.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_VI = goog.i18n.NumberFormatSymbols_en;


/**
 * Number formatting symbols for locale en_ZA.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_en_ZA = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'ZAR'
};


/**
 * Number formatting symbols for locale es.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_es = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale es_ES.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_es_ES = goog.i18n.NumberFormatSymbols_es;


/**
 * Number formatting symbols for locale et.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_et = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale et_EE.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_et_EE = goog.i18n.NumberFormatSymbols_et;


/**
 * Number formatting symbols for locale eu.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_eu = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale eu_ES.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_eu_ES = goog.i18n.NumberFormatSymbols_eu;


/**
 * Number formatting symbols for locale fa.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fa = {
  DECIMAL_SEP: '\u066B',
  GROUP_SEP: '\u066C',
  PERCENT: '\u066A',
  ZERO_DIGIT: '\u06F0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u00D7\u06F1\u06F0^',
  PERMILL: '\u0609',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4;\u2212#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'IRR'
};


/**
 * Number formatting symbols for locale fa_IR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fa_IR = goog.i18n.NumberFormatSymbols_fa;


/**
 * Number formatting symbols for locale fi.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fi = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'ep\u00E4luku',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale fi_FI.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fi_FI = goog.i18n.NumberFormatSymbols_fi;


/**
 * Number formatting symbols for locale fil.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fil = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00',
  DEF_CURRENCY_CODE: 'PHP'
};


/**
 * Number formatting symbols for locale fil_PH.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fil_PH = goog.i18n.NumberFormatSymbols_fil;


/**
 * Number formatting symbols for locale fr.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale fr_BL.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_BL = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_CA.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_CA = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4;(#,##0.00\u00A0\u00A4)',
  DEF_CURRENCY_CODE: 'CAD'
};


/**
 * Number formatting symbols for locale fr_FR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_FR = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_GF.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_GF = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_GP.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_GP = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_MC.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_MC = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_MF.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_MF = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_MQ.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_MQ = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_RE.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_RE = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale fr_YT.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_fr_YT = goog.i18n.NumberFormatSymbols_fr;


/**
 * Number formatting symbols for locale gl.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_gl = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale gl_ES.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_gl_ES = goog.i18n.NumberFormatSymbols_gl;


/**
 * Number formatting symbols for locale gsw.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_gsw = {
  DECIMAL_SEP: '.',
  GROUP_SEP: '\u2019',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '\u2212',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'CHF'
};


/**
 * Number formatting symbols for locale gsw_CH.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_gsw_CH = goog.i18n.NumberFormatSymbols_gsw;


/**
 * Number formatting symbols for locale gu.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_gu = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u0AAA\u0AC2\u0AB0\u0ACD\u0AB5',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u0AB8\u0A82\u0A96\u0ACD\u0AAF\u0ABE \u0AA8\u0AA5\u0AC0\u0A82',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale gu_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_gu_IN = goog.i18n.NumberFormatSymbols_gu;


/**
 * Number formatting symbols for locale he.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_he = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'ILS'
};


/**
 * Number formatting symbols for locale he_IL.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_he_IL = goog.i18n.NumberFormatSymbols_he;


/**
 * Number formatting symbols for locale hi.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_hi = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale hi_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_hi_IN = goog.i18n.NumberFormatSymbols_hi;


/**
 * Number formatting symbols for locale hr.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_hr = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'HRK'
};


/**
 * Number formatting symbols for locale hr_HR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_hr_HR = goog.i18n.NumberFormatSymbols_hr;


/**
 * Number formatting symbols for locale hu.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_hu = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'HUF'
};


/**
 * Number formatting symbols for locale hu_HU.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_hu_HU = goog.i18n.NumberFormatSymbols_hu;


/**
 * Number formatting symbols for locale id.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_id = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'IDR'
};


/**
 * Number formatting symbols for locale id_ID.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_id_ID = goog.i18n.NumberFormatSymbols_id;


/**
 * Number formatting symbols for locale in.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_in = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'IDR'
};


/**
 * Number formatting symbols for locale is.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_is = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '\u2212',
  EXP_SYMBOL: '\u00D710^',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'EiTa',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'ISK'
};


/**
 * Number formatting symbols for locale is_IS.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_is_IS = goog.i18n.NumberFormatSymbols_is;


/**
 * Number formatting symbols for locale it.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_it = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale it_IT.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_it_IT = goog.i18n.NumberFormatSymbols_it;


/**
 * Number formatting symbols for locale iw.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_iw = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'ILS'
};


/**
 * Number formatting symbols for locale ja.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ja = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN\uFF08\u975E\u6570\uFF09',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'JPY'
};


/**
 * Number formatting symbols for locale ja_JP.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ja_JP = goog.i18n.NumberFormatSymbols_ja;


/**
 * Number formatting symbols for locale kn.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_kn = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u0CAA\u0CC2\u0CB0\u0CCD\u0CB5',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6\u0CAF\u0CB2\u0CCD\u0CB2',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale kn_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_kn_IN = goog.i18n.NumberFormatSymbols_kn;


/**
 * Number formatting symbols for locale ko.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ko = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'KRW'
};


/**
 * Number formatting symbols for locale ko_KR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ko_KR = goog.i18n.NumberFormatSymbols_ko;


/**
 * Number formatting symbols for locale ln.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ln = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'CDF'
};


/**
 * Number formatting symbols for locale ln_CD.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ln_CD = goog.i18n.NumberFormatSymbols_ln;


/**
 * Number formatting symbols for locale lt.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_lt = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '\u2212',
  EXP_SYMBOL: '\u00D710^',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u00A4\u00A4\u00A4',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'LTL'
};


/**
 * Number formatting symbols for locale lt_LT.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_lt_LT = goog.i18n.NumberFormatSymbols_lt;


/**
 * Number formatting symbols for locale lv.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_lv = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '\u2212',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'nav\u00A0skaitlis',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'LVL'
};


/**
 * Number formatting symbols for locale lv_LV.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_lv_LV = goog.i18n.NumberFormatSymbols_lv;


/**
 * Number formatting symbols for locale ml.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ml = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '#,##,##0.00\u00A4',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale ml_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ml_IN = goog.i18n.NumberFormatSymbols_ml;


/**
 * Number formatting symbols for locale mr.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_mr = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u092A\u0942',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u0928\u093E\u0928',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale mr_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_mr_IN = goog.i18n.NumberFormatSymbols_mr;


/**
 * Number formatting symbols for locale ms.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ms = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'MYR'
};


/**
 * Number formatting symbols for locale ms_MY.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ms_MY = goog.i18n.NumberFormatSymbols_ms;


/**
 * Number formatting symbols for locale mt.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_mt = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'MTL'
};


/**
 * Number formatting symbols for locale mt_MT.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_mt_MT = goog.i18n.NumberFormatSymbols_mt;


/**
 * Number formatting symbols for locale nl.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_nl = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00;\u00A4\u00A0#,##0.00-',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale nl_NL.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_nl_NL = goog.i18n.NumberFormatSymbols_nl;


/**
 * Number formatting symbols for locale no.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_no = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00',
  DEF_CURRENCY_CODE: 'NOK'
};


/**
 * Number formatting symbols for locale or.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_or = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale or_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_or_IN = goog.i18n.NumberFormatSymbols_or;


/**
 * Number formatting symbols for locale pl.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_pl = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'PLN'
};


/**
 * Number formatting symbols for locale pl_PL.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_pl_PL = goog.i18n.NumberFormatSymbols_pl;


/**
 * Number formatting symbols for locale pt.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_pt = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'BRL'
};


/**
 * Number formatting symbols for locale pt_BR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_pt_BR = goog.i18n.NumberFormatSymbols_pt;


/**
 * Number formatting symbols for locale pt_PT.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_pt_PT = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale ro.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ro = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'RON'
};


/**
 * Number formatting symbols for locale ro_RO.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ro_RO = goog.i18n.NumberFormatSymbols_ro;


/**
 * Number formatting symbols for locale ru.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ru = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u043D\u0435 \u0447\u0438\u0441\u043B\u043E',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'RUB'
};


/**
 * Number formatting symbols for locale ru_RU.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ru_RU = goog.i18n.NumberFormatSymbols_ru;


/**
 * Number formatting symbols for locale sk.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sk = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'SKK'
};


/**
 * Number formatting symbols for locale sk_SK.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sk_SK = goog.i18n.NumberFormatSymbols_sk;


/**
 * Number formatting symbols for locale sl.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sl = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'e',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'EUR'
};


/**
 * Number formatting symbols for locale sl_SI.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sl_SI = goog.i18n.NumberFormatSymbols_sl;


/**
 * Number formatting symbols for locale sq.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sq = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'ALL'
};


/**
 * Number formatting symbols for locale sq_AL.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sq_AL = goog.i18n.NumberFormatSymbols_sq;


/**
 * Number formatting symbols for locale sr.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sr = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'RSD'
};


/**
 * Number formatting symbols for locale sr_Cyrl_RS.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sr_Cyrl_RS = goog.i18n.NumberFormatSymbols_sr;


/**
 * Number formatting symbols for locale sr_Latn_RS.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sr_Latn_RS = goog.i18n.NumberFormatSymbols_sr;


/**
 * Number formatting symbols for locale sv.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sv = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '\u2212',
  EXP_SYMBOL: '\u00D710^',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u00A4\u00A4\u00A4',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0\u00A0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'SEK'
};


/**
 * Number formatting symbols for locale sv_SE.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sv_SE = goog.i18n.NumberFormatSymbols_sv;


/**
 * Number formatting symbols for locale sw.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sw = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'TZS'
};


/**
 * Number formatting symbols for locale sw_TZ.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_sw_TZ = goog.i18n.NumberFormatSymbols_sw;


/**
 * Number formatting symbols for locale ta.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ta = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u0B8E\u0BA3\u0BCD \u0B87\u0BB2\u0BCD\u0BB2\u0BC8',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale ta_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ta_IN = goog.i18n.NumberFormatSymbols_ta;


/**
 * Number formatting symbols for locale te.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_te = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u0C24\u0C42',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##,##0.00',
  DEF_CURRENCY_CODE: 'INR'
};


/**
 * Number formatting symbols for locale te_IN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_te_IN = goog.i18n.NumberFormatSymbols_te;


/**
 * Number formatting symbols for locale th.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_th = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;\u00A4-#,##0.00',
  DEF_CURRENCY_CODE: 'THB'
};


/**
 * Number formatting symbols for locale th_TH.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_th_TH = goog.i18n.NumberFormatSymbols_th;


/**
 * Number formatting symbols for locale tl.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_tl = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4\u00A0#,##0.00',
  DEF_CURRENCY_CODE: 'PHP'
};


/**
 * Number formatting symbols for locale tr.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_tr = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '%#,##0',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'TRY'
};


/**
 * Number formatting symbols for locale tr_TR.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_tr_TR = goog.i18n.NumberFormatSymbols_tr;


/**
 * Number formatting symbols for locale uk.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_uk = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '\u00A0',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: '\u0415',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u041D\u0435 \u0447\u0438\u0441\u043B\u043E',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'UAH'
};


/**
 * Number formatting symbols for locale uk_UA.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_uk_UA = goog.i18n.NumberFormatSymbols_uk;


/**
 * Number formatting symbols for locale ur.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ur = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'PKR'
};


/**
 * Number formatting symbols for locale ur_PK.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_ur_PK = goog.i18n.NumberFormatSymbols_ur;


/**
 * Number formatting symbols for locale vi.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_vi = {
  DECIMAL_SEP: ',',
  GROUP_SEP: '.',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '#,##0.00\u00A0\u00A4',
  DEF_CURRENCY_CODE: 'VND'
};


/**
 * Number formatting symbols for locale vi_VN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_vi_VN = goog.i18n.NumberFormatSymbols_vi;


/**
 * Number formatting symbols for locale zh.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_zh = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: 'NaN',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'CNY'
};


/**
 * Number formatting symbols for locale zh_CN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_zh_CN = goog.i18n.NumberFormatSymbols_zh;


/**
 * Number formatting symbols for locale zh_HK.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_zh_HK = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u975E\u6578\u503C',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00;(\u00A4#,##0.00)',
  DEF_CURRENCY_CODE: 'HKD'
};


/**
 * Number formatting symbols for locale zh_Hans.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_zh_Hans = goog.i18n.NumberFormatSymbols_zh;


/**
 * Number formatting symbols for locale zh_Hans_CN.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_zh_Hans_CN = goog.i18n.NumberFormatSymbols_zh;


/**
 * Number formatting symbols for locale zh_TW.
 * @enum {string}
 */
goog.i18n.NumberFormatSymbols_zh_TW = {
  DECIMAL_SEP: '.',
  GROUP_SEP: ',',
  PERCENT: '%',
  ZERO_DIGIT: '0',
  PLUS_SIGN: '+',
  MINUS_SIGN: '-',
  EXP_SYMBOL: 'E',
  PERMILL: '\u2030',
  INFINITY: '\u221E',
  NAN: '\u975E\u6578\u503C',
  DECIMAL_PATTERN: '#,##0.###',
  SCIENTIFIC_PATTERN: '#E0',
  PERCENT_PATTERN: '#,##0%',
  CURRENCY_PATTERN: '\u00A4#,##0.00',
  DEF_CURRENCY_CODE: 'TWD'
};

goog.i18n.NumberFormatSymbols = function() {
  if (_getLocale() == 'am') {
    return goog.i18n.NumberFormatSymbols_am;
  }

  if (_getLocale() == 'am_ET' || _getLocale() == 'am-ET') {
    return goog.i18n.NumberFormatSymbols_am;
  }

  if (_getLocale() == 'ar') {
    return goog.i18n.NumberFormatSymbols_ar;
  }

  if (_getLocale() == 'ar_EG' || _getLocale() == 'ar-EG') {
    return goog.i18n.NumberFormatSymbols_ar;
  }

  if (_getLocale() == 'bg') {
    return goog.i18n.NumberFormatSymbols_bg;
  }

  if (_getLocale() == 'bg_BG' || _getLocale() == 'bg-BG') {
    return goog.i18n.NumberFormatSymbols_bg;
  }

  if (_getLocale() == 'bn') {
    return goog.i18n.NumberFormatSymbols_bn;
  }

  if (_getLocale() == 'bn_BD' || _getLocale() == 'bn-BD') {
    return goog.i18n.NumberFormatSymbols_bn;
  }

  if (_getLocale() == 'ca') {
    return goog.i18n.NumberFormatSymbols_ca;
  }

  if (_getLocale() == 'ca_ES' || _getLocale() == 'ca-ES') {
    return goog.i18n.NumberFormatSymbols_ca;
  }

  if (_getLocale() == 'cs') {
    return goog.i18n.NumberFormatSymbols_cs;
  }

  if (_getLocale() == 'cs_CZ' || _getLocale() == 'cs-CZ') {
    return goog.i18n.NumberFormatSymbols_cs;
  }

  if (_getLocale() == 'da') {
    return goog.i18n.NumberFormatSymbols_da;
  }

  if (_getLocale() == 'da_DK' || _getLocale() == 'da-DK') {
    return goog.i18n.NumberFormatSymbols_da;
  }

  if (_getLocale() == 'de') {
    return goog.i18n.NumberFormatSymbols_de;
  }

  if (_getLocale() == 'de_AT' || _getLocale() == 'de-AT') {
    return goog.i18n.NumberFormatSymbols_de_AT;
  }

  if (_getLocale() == 'de_BE' || _getLocale() == 'de-BE') {
    return goog.i18n.NumberFormatSymbols_de;
  }

  if (_getLocale() == 'de_CH' || _getLocale() == 'de-CH') {
    return goog.i18n.NumberFormatSymbols_de_CH;
  }

  if (_getLocale() == 'de_DE' || _getLocale() == 'de-DE') {
    return goog.i18n.NumberFormatSymbols_de;
  }

  if (_getLocale() == 'de_LU' || _getLocale() == 'de-LU') {
    return goog.i18n.NumberFormatSymbols_de;
  }

  if (_getLocale() == 'el') {
    return goog.i18n.NumberFormatSymbols_el;
  }

  if (_getLocale() == 'el_GR' || _getLocale() == 'el-GR') {
    return goog.i18n.NumberFormatSymbols_el;
  }

  if (_getLocale() == 'el_POLYTON' || _getLocale() == 'el-POLYTON') {
    return goog.i18n.NumberFormatSymbols_el;
  }

  if (_getLocale() == 'en') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_AS' || _getLocale() == 'en-AS') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_AU' || _getLocale() == 'en-AU') {
    return goog.i18n.NumberFormatSymbols_en_AU;
  }

  if (_getLocale() == 'en_Dsrt' || _getLocale() == 'en-Dsrt') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_Dsrt_US' || _getLocale() == 'en-Dsrt-US') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_GB' || _getLocale() == 'en-GB') {
    return goog.i18n.NumberFormatSymbols_en_GB;
  }

  if (_getLocale() == 'en_GU' || _getLocale() == 'en-GU') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_IE' || _getLocale() == 'en-IE') {
    return goog.i18n.NumberFormatSymbols_en_IE;
  }

  if (_getLocale() == 'en_IN' || _getLocale() == 'en-IN') {
    return goog.i18n.NumberFormatSymbols_en_IN;
  }

  if (_getLocale() == 'en_MH' || _getLocale() == 'en-MH') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_MP' || _getLocale() == 'en-MP') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_SG' || _getLocale() == 'en-SG') {
    return goog.i18n.NumberFormatSymbols_en_SG;
  }

  if (_getLocale() == 'en_UM' || _getLocale() == 'en-UM') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_US' || _getLocale() == 'en-US') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_VI' || _getLocale() == 'en-VI') {
    return goog.i18n.NumberFormatSymbols_en;
  }

  if (_getLocale() == 'en_ZA' || _getLocale() == 'en-ZA') {
    return goog.i18n.NumberFormatSymbols_en_ZA;
  }

  if (_getLocale() == 'es') {
    return goog.i18n.NumberFormatSymbols_es;
  }

  if (_getLocale() == 'es_ES' || _getLocale() == 'es-ES') {
    return goog.i18n.NumberFormatSymbols_es;
  }

  if (_getLocale() == 'et') {
    return goog.i18n.NumberFormatSymbols_et;
  }

  if (_getLocale() == 'et_EE' || _getLocale() == 'et-EE') {
    return goog.i18n.NumberFormatSymbols_et;
  }

  if (_getLocale() == 'eu') {
    return goog.i18n.NumberFormatSymbols_eu;
  }

  if (_getLocale() == 'eu_ES' || _getLocale() == 'eu-ES') {
    return goog.i18n.NumberFormatSymbols_eu;
  }

  if (_getLocale() == 'fa') {
    return goog.i18n.NumberFormatSymbols_fa;
  }

  if (_getLocale() == 'fa_IR' || _getLocale() == 'fa-IR') {
    return goog.i18n.NumberFormatSymbols_fa;
  }

  if (_getLocale() == 'fi') {
    return goog.i18n.NumberFormatSymbols_fi;
  }

  if (_getLocale() == 'fi_FI' || _getLocale() == 'fi-FI') {
    return goog.i18n.NumberFormatSymbols_fi;
  }

  if (_getLocale() == 'fil') {
    return goog.i18n.NumberFormatSymbols_fil;
  }

  if (_getLocale() == 'fil_PH' || _getLocale() == 'fil-PH') {
    return goog.i18n.NumberFormatSymbols_fil;
  }

  if (_getLocale() == 'fr') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_BL' || _getLocale() == 'fr-BL') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_CA' || _getLocale() == 'fr-CA') {
    return goog.i18n.NumberFormatSymbols_fr_CA;
  }

  if (_getLocale() == 'fr_FR' || _getLocale() == 'fr-FR') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_GF' || _getLocale() == 'fr-GF') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_GP' || _getLocale() == 'fr-GP') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_MC' || _getLocale() == 'fr-MC') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_MF' || _getLocale() == 'fr-MF') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_MQ' || _getLocale() == 'fr-MQ') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_RE' || _getLocale() == 'fr-RE') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'fr_YT' || _getLocale() == 'fr-YT') {
    return goog.i18n.NumberFormatSymbols_fr;
  }

  if (_getLocale() == 'gl') {
    return goog.i18n.NumberFormatSymbols_gl;
  }

  if (_getLocale() == 'gl_ES' || _getLocale() == 'gl-ES') {
    return goog.i18n.NumberFormatSymbols_gl;
  }

  if (_getLocale() == 'gsw') {
    return goog.i18n.NumberFormatSymbols_gsw;
  }

  if (_getLocale() == 'gsw_CH' || _getLocale() == 'gsw-CH') {
    return goog.i18n.NumberFormatSymbols_gsw;
  }

  if (_getLocale() == 'gu') {
    return goog.i18n.NumberFormatSymbols_gu;
  }

  if (_getLocale() == 'gu_IN' || _getLocale() == 'gu-IN') {
    return goog.i18n.NumberFormatSymbols_gu;
  }

  if (_getLocale() == 'he') {
    return goog.i18n.NumberFormatSymbols_he;
  }

  if (_getLocale() == 'he_IL' || _getLocale() == 'he-IL') {
    return goog.i18n.NumberFormatSymbols_he;
  }

  if (_getLocale() == 'hi') {
    return goog.i18n.NumberFormatSymbols_hi;
  }

  if (_getLocale() == 'hi_IN' || _getLocale() == 'hi-IN') {
    return goog.i18n.NumberFormatSymbols_hi;
  }

  if (_getLocale() == 'hr') {
    return goog.i18n.NumberFormatSymbols_hr;
  }

  if (_getLocale() == 'hr_HR' || _getLocale() == 'hr-HR') {
    return goog.i18n.NumberFormatSymbols_hr;
  }

  if (_getLocale() == 'hu') {
    return goog.i18n.NumberFormatSymbols_hu;
  }

  if (_getLocale() == 'hu_HU' || _getLocale() == 'hu-HU') {
    return goog.i18n.NumberFormatSymbols_hu;
  }

  if (_getLocale() == 'id') {
    return goog.i18n.NumberFormatSymbols_id;
  }

  if (_getLocale() == 'id_ID' || _getLocale() == 'id-ID') {
    return goog.i18n.NumberFormatSymbols_id;
  }

  if (_getLocale() == 'in') {
    return goog.i18n.NumberFormatSymbols_in;
  }

  if (_getLocale() == 'is') {
    return goog.i18n.NumberFormatSymbols_is;
  }

  if (_getLocale() == 'is_IS' || _getLocale() == 'is-IS') {
    return goog.i18n.NumberFormatSymbols_is;
  }

  if (_getLocale() == 'it') {
    return goog.i18n.NumberFormatSymbols_it;
  }

  if (_getLocale() == 'it_IT' || _getLocale() == 'it-IT') {
    return goog.i18n.NumberFormatSymbols_it;
  }

  if (_getLocale() == 'iw') {
    return goog.i18n.NumberFormatSymbols_iw;
  }

  if (_getLocale() == 'ja') {
    return goog.i18n.NumberFormatSymbols_ja;
  }

  if (_getLocale() == 'ja_JP' || _getLocale() == 'ja-JP') {
    return goog.i18n.NumberFormatSymbols_ja;
  }

  if (_getLocale() == 'kn') {
    return goog.i18n.NumberFormatSymbols_kn;
  }

  if (_getLocale() == 'kn_IN' || _getLocale() == 'kn-IN') {
    return goog.i18n.NumberFormatSymbols_kn;
  }

  if (_getLocale() == 'ko') {
    return goog.i18n.NumberFormatSymbols_ko;
  }

  if (_getLocale() == 'ko_KR' || _getLocale() == 'ko-KR') {
    return goog.i18n.NumberFormatSymbols_ko;
  }

  if (_getLocale() == 'ln') {
    return goog.i18n.NumberFormatSymbols_ln;
  }

  if (_getLocale() == 'ln_CD' || _getLocale() == 'ln-CD') {
    return goog.i18n.NumberFormatSymbols_ln;
  }

  if (_getLocale() == 'lt') {
    return goog.i18n.NumberFormatSymbols_lt;
  }

  if (_getLocale() == 'lt_LT' || _getLocale() == 'lt-LT') {
    return goog.i18n.NumberFormatSymbols_lt;
  }

  if (_getLocale() == 'lv') {
    return goog.i18n.NumberFormatSymbols_lv;
  }

  if (_getLocale() == 'lv_LV' || _getLocale() == 'lv-LV') {
    return goog.i18n.NumberFormatSymbols_lv;
  }

  if (_getLocale() == 'ml') {
    return goog.i18n.NumberFormatSymbols_ml;
  }

  if (_getLocale() == 'ml_IN' || _getLocale() == 'ml-IN') {
    return goog.i18n.NumberFormatSymbols_ml;
  }

  if (_getLocale() == 'mr') {
    return goog.i18n.NumberFormatSymbols_mr;
  }

  if (_getLocale() == 'mr_IN' || _getLocale() == 'mr-IN') {
    return goog.i18n.NumberFormatSymbols_mr;
  }

  if (_getLocale() == 'ms') {
    return goog.i18n.NumberFormatSymbols_ms;
  }

  if (_getLocale() == 'ms_MY' || _getLocale() == 'ms-MY') {
    return goog.i18n.NumberFormatSymbols_ms;
  }

  if (_getLocale() == 'mt') {
    return goog.i18n.NumberFormatSymbols_mt;
  }

  if (_getLocale() == 'mt_MT' || _getLocale() == 'mt-MT') {
    return goog.i18n.NumberFormatSymbols_mt;
  }

  if (_getLocale() == 'nl') {
    return goog.i18n.NumberFormatSymbols_nl;
  }

  if (_getLocale() == 'nl_NL' || _getLocale() == 'nl-NL') {
    return goog.i18n.NumberFormatSymbols_nl;
  }

  if (_getLocale() == 'no') {
    return goog.i18n.NumberFormatSymbols_no;
  }

  if (_getLocale() == 'or') {
    return goog.i18n.NumberFormatSymbols_or;
  }

  if (_getLocale() == 'or_IN' || _getLocale() == 'or-IN') {
    return goog.i18n.NumberFormatSymbols_or;
  }

  if (_getLocale() == 'pl') {
    return goog.i18n.NumberFormatSymbols_pl;
  }

  if (_getLocale() == 'pl_PL' || _getLocale() == 'pl-PL') {
    return goog.i18n.NumberFormatSymbols_pl;
  }

  if (_getLocale() == 'pt') {
    return goog.i18n.NumberFormatSymbols_pt;
  }

  if (_getLocale() == 'pt_BR' || _getLocale() == 'pt-BR') {
    return goog.i18n.NumberFormatSymbols_pt;
  }

  if (_getLocale() == 'pt_PT' || _getLocale() == 'pt-PT') {
    return goog.i18n.NumberFormatSymbols_pt_PT;
  }

  if (_getLocale() == 'ro') {
    return goog.i18n.NumberFormatSymbols_ro;
  }

  if (_getLocale() == 'ro_RO' || _getLocale() == 'ro-RO') {
    return goog.i18n.NumberFormatSymbols_ro;
  }

  if (_getLocale() == 'ru') {
    return goog.i18n.NumberFormatSymbols_ru;
  }

  if (_getLocale() == 'ru_RU' || _getLocale() == 'ru-RU') {
    return goog.i18n.NumberFormatSymbols_ru;
  }

  if (_getLocale() == 'sk') {
    return goog.i18n.NumberFormatSymbols_sk;
  }

  if (_getLocale() == 'sk_SK' || _getLocale() == 'sk-SK') {
    return goog.i18n.NumberFormatSymbols_sk;
  }

  if (_getLocale() == 'sl') {
    return goog.i18n.NumberFormatSymbols_sl;
  }

  if (_getLocale() == 'sl_SI' || _getLocale() == 'sl-SI') {
    return goog.i18n.NumberFormatSymbols_sl;
  }

  if (_getLocale() == 'sq') {
    return goog.i18n.NumberFormatSymbols_sq;
  }

  if (_getLocale() == 'sq_AL' || _getLocale() == 'sq-AL') {
    return goog.i18n.NumberFormatSymbols_sq;
  }

  if (_getLocale() == 'sr') {
    return goog.i18n.NumberFormatSymbols_sr;
  }

  if (_getLocale() == 'sr_Cyrl_RS' || _getLocale() == 'sr-Cyrl-RS') {
    return goog.i18n.NumberFormatSymbols_sr;
  }

  if (_getLocale() == 'sr_Latn_RS' || _getLocale() == 'sr-Latn-RS') {
    return goog.i18n.NumberFormatSymbols_sr;
  }

  if (_getLocale() == 'sv') {
    return goog.i18n.NumberFormatSymbols_sv;
  }

  if (_getLocale() == 'sv_SE' || _getLocale() == 'sv-SE') {
    return goog.i18n.NumberFormatSymbols_sv;
  }

  if (_getLocale() == 'sw') {
    return goog.i18n.NumberFormatSymbols_sw;
  }

  if (_getLocale() == 'sw_TZ' || _getLocale() == 'sw-TZ') {
    return goog.i18n.NumberFormatSymbols_sw;
  }

  if (_getLocale() == 'ta') {
    return goog.i18n.NumberFormatSymbols_ta;
  }

  if (_getLocale() == 'ta_IN' || _getLocale() == 'ta-IN') {
    return goog.i18n.NumberFormatSymbols_ta;
  }

  if (_getLocale() == 'te') {
    return goog.i18n.NumberFormatSymbols_te;
  }

  if (_getLocale() == 'te_IN' || _getLocale() == 'te-IN') {
    return goog.i18n.NumberFormatSymbols_te;
  }

  if (_getLocale() == 'th') {
    return goog.i18n.NumberFormatSymbols_th;
  }

  if (_getLocale() == 'th_TH' || _getLocale() == 'th-TH') {
    return goog.i18n.NumberFormatSymbols_th;
  }

  if (_getLocale() == 'tl') {
    return goog.i18n.NumberFormatSymbols_tl;
  }

  if (_getLocale() == 'tr') {
    return goog.i18n.NumberFormatSymbols_tr;
  }

  if (_getLocale() == 'tr_TR' || _getLocale() == 'tr-TR') {
    return goog.i18n.NumberFormatSymbols_tr;
  }

  if (_getLocale() == 'uk') {
    return goog.i18n.NumberFormatSymbols_uk;
  }

  if (_getLocale() == 'uk_UA' || _getLocale() == 'uk-UA') {
    return goog.i18n.NumberFormatSymbols_uk;
  }

  if (_getLocale() == 'ur') {
    return goog.i18n.NumberFormatSymbols_ur;
  }

  if (_getLocale() == 'ur_PK' || _getLocale() == 'ur-PK') {
    return goog.i18n.NumberFormatSymbols_ur;
  }

  if (_getLocale() == 'vi') {
    return goog.i18n.NumberFormatSymbols_vi;
  }

  if (_getLocale() == 'vi_VN' || _getLocale() == 'vi-VN') {
    return goog.i18n.NumberFormatSymbols_vi;
  }

  if (_getLocale() == 'zh') {
    return goog.i18n.NumberFormatSymbols_zh;
  }

  if (_getLocale() == 'zh_CN' || _getLocale() == 'zh-CN') {
    return goog.i18n.NumberFormatSymbols_zh;
  }

  if (_getLocale() == 'zh_HK' || _getLocale() == 'zh-HK') {
    return goog.i18n.NumberFormatSymbols_zh_HK;
  }

  if (_getLocale() == 'zh_Hans' || _getLocale() == 'zh-Hans') {
    return goog.i18n.NumberFormatSymbols_zh;
  }

  if (_getLocale() == 'zh_Hans_CN' || _getLocale() == 'zh-Hans-CN') {
    return goog.i18n.NumberFormatSymbols_zh;
  }

  if (_getLocale() == 'zh_TW' || _getLocale() == 'zh-TW') {
    return goog.i18n.NumberFormatSymbols_zh_TW;
  }
}

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview A utility to get better currency format pattern.
 *
 * This module implement a new currency format representation model. It
 * provides 3 currency representation forms: global, portable and local. Local
 * format is the most popular format people use to represent currency in its
 * circulating country without worrying about how it should be distinguished
 * from other currencies.  Global format is a formal representation in context
 * of multiple currencies in same page, it is ISO 4217 currency code. Portable
 * format is a compromise between global and local. It looks similar to how
 * people would like to see how their currencies is being represented in other
 * media. While at the same time, it should be distinguishable to world's
 * popular currencies (like USD, EUR) and currencies somewhat relevant in the
 * area (like CNY in HK, though native currency is HKD). There is no guarantee
 * of uniqueness.
 *
 */


goog.provide('goog.i18n.currency');


/**
 * The mask of precision field.
 * @private
 */
goog.i18n.currency.PRECISION_MASK_ = 0x07;


/**
 * If this flag is set, it means the currency sign should position before
 * number.
 * @private
 */
goog.i18n.currency.POSITION_FLAG_ = 0x08;


/**
 * Should a space to inserted between number and currency sign.
 * @private
 */
goog.i18n.currency.SPACE_FLAG_ = 0x20;


/**
 * This function will add tier2 currency support. Be default, only tier1
 * (most popular currencies) are supportted. If an application really need
 * to support some of the rarely used currency, it should call this function
 * before any other functions in this namespace.
 */
goog.i18n.currency.addTier2Support = function() {
  for (var key in goog.i18n.currency.CurrencyInfoTier2) {
    goog.i18n.currency.CurrencyInfo[key] =
        goog.i18n.currency.CurrencyInfoTier2[key];
  }
};


/**
 * Global currency pattern always uses ISO-4217 currency code as prefix. Local
 * currency sign is added if it is different from currency code. Each currency
 * is unique in this form. The negative side is that ISO code looks weird in
 * some countries as poeple normally do not use it. Local currency sign
 * alleviate the problem, but also make it a little verbose.
 *
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {string} Global currency pattern string for given currency.
 */
goog.i18n.currency.getGlobalCurrencyPattern = function(currencyCode) {
  var info = goog.i18n.currency.CurrencyInfo[currencyCode];
  var patternNum = info[0];
  if (currencyCode == info[1]) {
    return goog.i18n.currency.getCurrencyPattern_(patternNum, info[1]);
  }
  return currencyCode + ' ' +
      goog.i18n.currency.getCurrencyPattern_(patternNum, info[1]);
};


/**
 * Return global currency sign string for those applications
 * that want to handle currency sign themselves.
 *
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {string} Global currency sign for given currency.
 */
goog.i18n.currency.getGlobalCurrencySign = function(currencyCode) {
  var info = goog.i18n.currency.CurrencyInfo[currencyCode];
  return (currencyCode == info[1]) ? currencyCode :
      currencyCode + ' ' + info[1];
};


/**
 * Local currency pattern is the most frequently used pattern in currency's
 * native region. It does not care about how it is distinguished from other
 * currencies.
 *
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {string} Local currency pattern string for given currency.
 */
goog.i18n.currency.getLocalCurrencyPattern = function(currencyCode) {
  var info = goog.i18n.currency.CurrencyInfo[currencyCode];
  return goog.i18n.currency.getCurrencyPattern_(info[0], info[1]);
};


/**
 * Returns local currency sign string for those applications that need to
 * handle currency sign separately.
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {string} Local currency sign for given currency.
 */
goog.i18n.currency.getLocalCurrencySign = function(currencyCode) {
  return goog.i18n.currency.CurrencyInfo[currencyCode][1];
};


/**
 * Portable currency pattern is a compromise between local and global. It is
 * not a mere blend or mid-way between the two. Currency sign is chosen so that
 * it looks familiar to native users. It also has enough information to
 * distinguish itself from other popular currencies in its native region.
 * In this pattern, currency sign symbols that has availability problem in
 * popular fonts are also avoided.
 *
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {string} Portable currency pattern string for given currency.
 */
goog.i18n.currency.getPortableCurrencyPattern = function(currencyCode) {
  var info = goog.i18n.currency.CurrencyInfo[currencyCode];
  return goog.i18n.currency.getCurrencyPattern_(info[0], info[2]);
};


/**
 * Return portable currency sign string for those applications that need to
 * handle currency sign themselves.
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {string} Portable currency sign for given currency.
 */
goog.i18n.currency.getPortableCurrencySign = function(currencyCode) {
  return goog.i18n.currency.CurrencyInfo[currencyCode][2];
};


/**
 * This function returns the default currency sign position. Some application
 * may want to handle currency sign and currency amount separately. This
 * function can be used in such situation to position the currency sign
 * relative to amount field correctly.
 * To match the behavior of ICU, position is not determined by display locale.
 * This method will always return true for now (because of the change of
 * data) and should be avoided if possible.
 * @param {string} currencyCode ISO-4217 3-letter currency code.
 * @return {boolean} true if currency should be positioned before amount field.
 */
goog.i18n.currency.isPrefixSignPosition = function(currencyCode) {
  return (goog.i18n.currency.CurrencyInfo[currencyCode][0] &
          goog.i18n.currency.POSITION_FLAG_) == 0;
};


/**
 * This function construct the currency pattern. Currency sign is provided. The
 * pattern information is encoded in patternNum.
 *
 * @param {number} patternNum Encoded pattern number that has
 *     currency pattern information.
 * @param {string} sign the currency sign that will be used in pattern.
 *
 * @return {string} currency pattern string.
 * @private
 */
goog.i18n.currency.getCurrencyPattern_ = function(patternNum, sign) {
  var strParts = ['#,##0'];
  var precision = patternNum & goog.i18n.currency.PRECISION_MASK_;
  if (precision > 0) {
    strParts.push('.');
    for (var i = 0; i < precision; i++) {
      strParts.push('0');
    }
  }
  if ((patternNum & goog.i18n.currency.POSITION_FLAG_) == 0) {
    strParts.unshift((patternNum & goog.i18n.currency.SPACE_FLAG_) ?
                     "' " : "'");
    strParts.unshift(sign);
    strParts.unshift("'");
  } else {
    strParts.push((patternNum & goog.i18n.currency.SPACE_FLAG_) ? " '" : "'",
                  sign, "'");
  }
  return strParts.join('');
};


/**
 * Modify currency pattern string by adjusting precision for given currency.
 * Standard currency pattern will have 2 digit after decimal point.
 * Examples:
 *   $#,##0.00 ->  $#,##0    (precision == 0)
 *   $#,##0.00 ->  $#,##0.0  (precision == 1)
 *   $#,##0.00 ->  $#,##0.000  (precision == 3)
 *
 * @param {string} pattern currency pattern string.
 * @param {string} currencyCode 3-letter currency code.
 *
 * @return {string} modified currency pattern string.
 */
goog.i18n.currency.adjustPrecision = function(pattern, currencyCode) {
  var strParts = ['0'];
  var info = goog.i18n.currency.CurrencyInfo[currencyCode];
  var precision = info[0] & goog.i18n.currency.PRECISION_MASK_;
  if (precision > 0) {
    strParts.push('.');
    for (var i = 0; i < precision; i++) {
      strParts.push('0');
    }
  }
  return pattern.replace(/0.00/g, strParts.join(''));
};


/**
 * Tier 1 currency information.
 * @type {!Object.<!Array>}
 */
goog.i18n.currency.CurrencyInfo = {
  'AED': [2, 'dh', '\u062f.\u0625.', 'DH'],
  'AUD': [2, '$', 'AU$'],
  'BDT': [2, '\u09F3', 'Tk'],
  'BRL': [2, 'R$', 'R$'],
  'CAD': [2, '$', 'C$'],
  'CHF': [2, 'CHF', 'CHF'],
  'CLP': [0, '$', 'CL$'],
  'CNY': [2, '¥', 'RMB¥'],
  'COP': [0, '$', 'COL$'],
  'CRC': [0, '\u20a1', 'CR\u20a1'],
  'CZK': [2, 'K\u010d', 'K\u010d'],
  'DKK': [18, 'kr', 'kr'],
  'DOP': [2, '$', 'RD$'],
  'EGP': [2, '£', 'LE'],
  'EUR': [18, '€', '€'],
  'GBP': [2, '£', 'GB£'],
  'HKD': [2, '$', 'HK$'],
  'ILS': [2, '\u20AA', 'IL\u20AA'],
  'INR': [2, '\u20B9', 'Rs'],
  'ISK': [0, 'kr', 'kr'],
  'JMD': [2, '$', 'JA$'],
  'JPY': [0, '¥', 'JP¥'],
  'KRW': [0, '\u20A9', 'KR₩'],
  'LKR': [2, 'Rs', 'SLRs'],
  'MNT': [0, '\u20AE', 'MN₮'],
  'MXN': [2, '$', 'Mex$'],
  'MYR': [2, 'RM', 'RM'],
  'NOK': [18, 'kr', 'NOkr'],
  'PAB': [2, 'B/.', 'B/.'],
  'PEN': [2, 'S/.', 'S/.'],
  'PHP': [2, '\u20B1', 'Php'],
  'PKR': [0, 'Rs', 'PKRs.'],
  'RUB': [2, 'Rup', 'Rup'],
  'SAR': [2, 'Rial', 'Rial'],
  'SEK': [2, 'kr', 'kr'],
  'SGD': [2, '$', 'S$'],
  'THB': [2, '\u0e3f', 'THB'],
  'TRY': [2, 'TL', 'YTL'],
  'TWD': [2, 'NT$', 'NT$'],
  'USD': [2, '$', 'US$'],
  'UYU': [2, '$', 'UY$'],
  'VND': [0, '\u20AB', 'VN\u20AB'],
  'YER': [0, 'Rial', 'Rial'],
  'ZAR': [2, 'R', 'ZAR']
};


/**
 * Tier 2 currency information.
 * @type {!Object.<!Array>}
 */
goog.i18n.currency.CurrencyInfoTier2 = {
  'AFN': [16, 'Af.', 'AFN'],
  'ALL': [0, 'Lek', 'Lek'],
  'AMD': [0, 'Dram', 'dram'],
  'AOA': [2, 'Kz', 'Kz'],
  'ARS': [2, '$', 'AR$'],
  'AWG': [2, 'Afl.', 'Afl.'],
  'AZN': [2, 'man.', 'man.'],
  'BAM': [18, 'KM', 'KM'],
  'BBD': [2, '$', 'Bds$'],
  'BGN': [2, 'lev', 'lev'],
  'BHD': [3, 'din', 'din'],
  'BIF': [0, 'FBu', 'FBu'],
  'BMD': [2, '$', 'BD$'],
  'BND': [2, '$', 'B$'],
  'BOB': [2, 'Bs', 'Bs'],
  'BSD': [2, '$', 'BS$'],
  'BTN': [2, 'Nu.', 'Nu.'],
  'BWP': [2, 'P', 'pula'],
  'BYR': [0, 'BYR', 'BYR'],
  'BZD': [2, '$', 'BZ$'],
  'CDF': [2, 'FrCD', 'CDF'],
  'CUC': [1, '$', 'CUC$'],
  'CUP': [2, '$', 'CU$'],
  'CVE': [2, 'CVE', 'Esc'],
  'DJF': [0, 'Fdj', 'Fdj'],
  'DZD': [2, 'din', 'din'],
  'ERN': [2, 'Nfk', 'Nfk'],
  'ETB': [2, 'Birr', 'Birr'],
  'FJD': [2, '$', 'FJ$'],
  'FKP': [2, '£', 'FK£'],
  'GEL': [2, 'GEL', 'GEL'],
  'GHS': [2, 'GHS', 'GHS'],
  'GIP': [2, '£', 'GI£'],
  'GMD': [2, 'GMD', 'GMD'],
  'GNF': [0, 'FG', 'FG'],
  'GTQ': [2, 'Q', 'GTQ'],
  'GYD': [0, '$', 'GY$'],
  'HNL': [2, 'L', 'HNL'],
  'HRK': [2, 'kn', 'kn'],
  'HTG': [2, 'HTG', 'HTG'],
  'HUF': [0, 'Ft', 'Ft'],
  'IDR': [0, 'Rp', 'Rp'],
  'IQD': [0, 'din', 'IQD'],
  'IRR': [0, 'Rial', 'IRR'],
  'JOD': [3, 'din', 'JOD'],
  'KES': [2, 'Ksh', 'Ksh'],
  'KGS': [2, 'KGS', 'KGS'],
  'KHR': [2, 'Riel', 'KHR'],
  'KMF': [0, 'CF', 'KMF'],
  'KPW': [0, '\u20A9KP', 'KPW'],
  'KWD': [3, 'din', 'KWD'],
  'KYD': [2, '$', 'KY$'],
  'KZT': [2, '\u20B8', 'KZT'],
  'LAK': [0, '\u20AD', '\u20AD'],
  'LBP': [0, 'L£', 'LBP'],
  'LRD': [2, '$', 'L$'],
  'LSL': [2, 'LSL', 'LSL'],
  'LTL': [2, 'Lt', 'Lt'],
  'LVL': [2, 'Ls', 'Ls'],
  'LYD': [3, 'din', 'LD'],
  'MAD': [2, 'dh', 'MAD'],
  'MDL': [2, 'MDL', 'MDL'],
  'MGA': [0, 'Ar', 'MGA'],
  'MKD': [2, 'din', 'MKD'],
  'MMK': [0, 'K', 'MMK'],
  'MOP': [2, 'MOP', 'MOP$'],
  'MRO': [0, 'MRO', 'MRO'],
  'MUR': [0, 'MURs', 'MURs'],
  'MWK': [2, 'MWK', 'MWK'],
  'MZN': [2, 'MTn', 'MTn'],
  'NAD': [2, '$', 'N$'],
  'NGN': [2, '\u20A6', 'NG\u20A6'],
  'NIO': [2, 'C$', 'C$'],
  'NPR': [2, 'Rs', 'NPRs'],
  'NZD': [2, '$', 'NZ$'],
  'OMR': [3, 'Rial', 'OMR'],
  'PGK': [2, 'PGK', 'PGK'],
  'PLN': [2, 'z\u0142', 'z\u0142'],
  'PYG': [0, 'Gs', 'PYG'],
  'QAR': [2, 'Rial', 'QR'],
  'RON': [2, 'RON', 'RON'],
  'RSD': [0, 'din', 'RSD'],
  'RWF': [0, 'RF', 'RF'],
  'SBD': [2, '$', 'SI$'],
  'SCR': [2, 'SCR', 'SCR'],
  'SDG': [2, 'SDG', 'SDG'],
  'SHP': [2, '£', 'SH£'],
  'SLL': [0, 'SLL', 'SLL'],
  'SOS': [0, 'SOS', 'SOS'],
  'SRD': [2, '$', 'SR$'],
  'STD': [0, 'Db', 'Db'],
  'SYP': [16, '£', 'SY£'],
  'SZL': [2, 'SZL', 'SZL'],
  'TJS': [2, 'Som', 'TJS'],
  'TND': [3, 'din', 'DT'],
  'TOP': [2, 'T$', 'T$'],
  'TTD': [2, '$', 'TT$'],
  'TZS': [0, 'TSh', 'TSh'],
  'UAH': [2, '\u20B4', 'UAH'],
  'UGX': [0, 'UGX', 'UGX'],
  'UYU': [1, '$', '$U'],
  'UZS': [0, 'so\u02bcm', 'UZS'],
  'VEF': [2, 'Bs', 'Bs'],
  'VUV': [0, 'VUV', 'VUV'],
  'WST': [2, 'WST', 'WST'],
  'XAF': [0, 'FCFA', 'FCFA'],
  'XCD': [2, '$', 'EC$'],
  'XOF': [0, 'CFA', 'CFA'],
  'XPF': [0, 'FCFP', 'FCFP'],
  'ZMK': [0, 'ZMK', 'ZMK']
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Number format/parse library with locale support.
 */


/**
 * Namespace for locale number format functions
 */
goog.provide('goog.i18n.NumberFormat');
goog.provide('goog.i18n.NumberFormat.CurrencyStyle');
goog.provide('goog.i18n.NumberFormat.Format');

goog.require('goog.i18n.NumberFormatSymbols');
goog.require('goog.i18n.currency');



/**
 * Constructor of NumberFormat.
 * @param {number|string} pattern The number that indicates a predefined
 *     number format pattern.
 * @param {string=} opt_currency Optional international currency
 *     code. This determines the currency code/symbol used in format/parse. If
 *     not given, the currency code for current locale will be used.
 * @param {number=} opt_currencyStyle currency style, value defined in
 *        goog.i18n.NumberFormat.CurrencyStyle.
 * @constructor
 */
goog.i18n.NumberFormat = function(pattern, opt_currency, opt_currencyStyle) {
  this.intlCurrencyCode_ = opt_currency ||
      goog.i18n.NumberFormatSymbols().DEF_CURRENCY_CODE;

  this.currencyStyle_ = opt_currencyStyle ||
      goog.i18n.NumberFormat.CurrencyStyle.LOCAL;

  this.maximumIntegerDigits_ = 40;
  this.minimumIntegerDigits_ = 1;
  this.maximumFractionDigits_ = 3; // invariant, >= minFractionDigits
  this.minimumFractionDigits_ = 0;
  this.minExponentDigits_ = 0;
  this.useSignForPositiveExponent_ = false;

  this.positivePrefix_ = '';
  this.positiveSuffix_ = '';
  this.negativePrefix_ = '-';
  this.negativeSuffix_ = '';

  // The multiplier for use in percent, per mille, etc.
  this.multiplier_ = 1;
  this.groupingSize_ = 3;
  this.decimalSeparatorAlwaysShown_ = false;
  this.useExponentialNotation_ = false;

  if (typeof pattern == 'number') {
    this.applyStandardPattern_(pattern);
  } else {
    this.applyPattern_(pattern);
  }
};


/**
 * Standard number formatting patterns.
 * @enum {number}
 */
goog.i18n.NumberFormat.Format = {
  DECIMAL: 1,
  SCIENTIFIC: 2,
  PERCENT: 3,
  CURRENCY: 4
};


/**
 * Currency styles.
 * @enum {number}
 */
goog.i18n.NumberFormat.CurrencyStyle = {
  LOCAL: 0,     // currency style as it is used in its circulating country.
  PORTABLE: 1,  // currency style that differentiate it from other popular ones.
  GLOBAL: 2     // currency style that is unique among all currencies.
};


/**
 * If the usage of Ascii digits should be enforced.
 * @type {boolean}
 * @private
 */
goog.i18n.NumberFormat.enforceAsciiDigits_ = false;


/**
 * Set if the usage of Ascii digits in formatting should be enforced.
 * @param {boolean} doEnforce Boolean value about if Ascii digits should be
 *     enforced.
 */
goog.i18n.NumberFormat.setEnforceAsciiDigits = function(doEnforce) {
  goog.i18n.NumberFormat.enforceAsciiDigits_ = doEnforce;
};


/**
 * Return if Ascii digits is enforced.
 * @return {boolean} If Ascii digits is enforced.
 */
goog.i18n.NumberFormat.isEnforceAsciiDigits = function() {
  return goog.i18n.NumberFormat.enforceAsciiDigits_;
};


/**
 * Apply provided pattern, result are stored in member variables.
 *
 * @param {string} pattern String pattern being applied.
 * @private
 */
goog.i18n.NumberFormat.prototype.applyPattern_ = function(pattern) {
  this.pattern_ = pattern.replace(/ /g, '\u00a0');
  var pos = [0];

  this.positivePrefix_ = this.parseAffix_(pattern, pos);
  var trunkStart = pos[0];
  this.parseTrunk_(pattern, pos);
  var trunkLen = pos[0] - trunkStart;
  this.positiveSuffix_ = this.parseAffix_(pattern, pos);
  if (pos[0] < pattern.length &&
      pattern.charAt(pos[0]) == goog.i18n.NumberFormat.PATTERN_SEPARATOR_) {
    pos[0]++;
    this.negativePrefix_ = this.parseAffix_(pattern, pos);
    // we assume this part is identical to positive part.
    // user must make sure the pattern is correctly constructed.
    pos[0] += trunkLen;
    this.negativeSuffix_ = this.parseAffix_(pattern, pos);
  } else {
    // if no negative affix specified, they share the same positive affix
    this.negativePrefix_ = this.positivePrefix_ + this.negativePrefix_;
    this.negativeSuffix_ += this.positiveSuffix_;
  }
};


/**
 * Apply a predefined pattern to NumberFormat object.
 * @param {number} patternType The number that indicates a predefined number
 *     format pattern.
 * @private
 */
goog.i18n.NumberFormat.prototype.applyStandardPattern_ = function(patternType) {
  switch (patternType) {
    case goog.i18n.NumberFormat.Format.DECIMAL:
      this.applyPattern_(goog.i18n.NumberFormatSymbols().DECIMAL_PATTERN);
      break;
    case goog.i18n.NumberFormat.Format.SCIENTIFIC:
      this.applyPattern_(goog.i18n.NumberFormatSymbols().SCIENTIFIC_PATTERN);
      break;
    case goog.i18n.NumberFormat.Format.PERCENT:
      this.applyPattern_(goog.i18n.NumberFormatSymbols().PERCENT_PATTERN);
      break;
    case goog.i18n.NumberFormat.Format.CURRENCY:
      this.applyPattern_(goog.i18n.currency.adjustPrecision(
          goog.i18n.NumberFormatSymbols().CURRENCY_PATTERN,
          this.intlCurrencyCode_));
      break;
    default:
      throw Error('Unsupported pattern type.');
  }
};


/**
 * Parses text string to produce a Number.
 *
 * This method attempts to parse text starting from position "opt_pos" if it
 * is given. Otherwise the parse will start from the beginning of the text.
 * When opt_pos presents, opt_pos will be updated to the character next to where
 * parsing stops after the call. If an error occurs, opt_pos won't be updated.
 *
 * @param {string} text The string to be parsed.
 * @param {Array.<number>=} opt_pos Position to pass in and get back.
 * @return {number} Parsed number. This throws an error if the text cannot be
 *     parsed.
 */
goog.i18n.NumberFormat.prototype.parse = function(text, opt_pos) {
  var pos = opt_pos || [0];

  var start = pos[0];
  var ret = NaN;

  // we don't want to handle 2 kind of space in parsing, normalize it to nbsp
  text = text.replace(/ /g, '\u00a0');

  var gotPositive = text.indexOf(this.positivePrefix_, pos[0]) == pos[0];
  var gotNegative = text.indexOf(this.negativePrefix_, pos[0]) == pos[0];

  // check for the longest match
  if (gotPositive && gotNegative) {
    if (this.positivePrefix_.length > this.negativePrefix_.length) {
      gotNegative = false;
    } else if (this.positivePrefix_.length < this.negativePrefix_.length) {
      gotPositive = false;
    }
  }

  if (gotPositive) {
    pos[0] += this.positivePrefix_.length;
  } else if (gotNegative) {
    pos[0] += this.negativePrefix_.length;
  }

  // process digits or Inf, find decimal position
  if (text.indexOf(goog.i18n.NumberFormatSymbols().INFINITY, pos[0]) == pos[0]) {
    pos[0] += goog.i18n.NumberFormatSymbols().INFINITY.length;
    ret = Infinity;
  } else {
    ret = this.parseNumber_(text, pos);
  }

  // check for suffix
  if (gotPositive) {
    if (!(text.indexOf(this.positiveSuffix_, pos[0]) == pos[0])) {
      return NaN;
    }
    pos[0] += this.positiveSuffix_.length;
  } else if (gotNegative) {
    if (!(text.indexOf(this.negativeSuffix_, pos[0]) == pos[0])) {
      return NaN;
    }
    pos[0] += this.negativeSuffix_.length;
  }

  return gotNegative ? -ret : ret;
};


/**
 * This function will parse a "localized" text into a Number. It needs to
 * handle locale specific decimal, grouping, exponent and digits.
 *
 * @param {string} text The text that need to be parsed.
 * @param {Array.<number>} pos  In/out parsing position. In case of failure,
 *    pos value won't be changed.
 * @return {number} Number value, or NaN if nothing can be parsed.
 * @private
 */
goog.i18n.NumberFormat.prototype.parseNumber_ = function(text, pos) {
  var sawDecimal = false;
  var sawExponent = false;
  var sawDigit = false;
  var scale = 1;
  var decimal = goog.i18n.NumberFormatSymbols().DECIMAL_SEP;
  var grouping = goog.i18n.NumberFormatSymbols().GROUP_SEP;
  var exponentChar = goog.i18n.NumberFormatSymbols().EXP_SYMBOL;

  var normalizedText = '';
  for (; pos[0] < text.length; pos[0]++) {
    var ch = text.charAt(pos[0]);
    var digit = this.getDigit_(ch);
    if (digit >= 0 && digit <= 9) {
      normalizedText += digit;
      sawDigit = true;
    } else if (ch == decimal.charAt(0)) {
      if (sawDecimal || sawExponent) {
        break;
      }
      normalizedText += '.';
      sawDecimal = true;
    } else if (ch == grouping.charAt(0) &&
               ('\u00a0' != grouping.charAt(0) ||
                pos[0] + 1 < text.length &&
                this.getDigit_(text.charAt(pos[0] + 1)) >= 0)) {
      // Got a grouping character here. When grouping character is nbsp, need
      // to make sure the character following it is a digit.
      if (sawDecimal || sawExponent) {
        break;
      }
      continue;
    } else if (ch == exponentChar.charAt(0)) {
      if (sawExponent) {
        break;
      }
      normalizedText += 'E';
      sawExponent = true;
    } else if (ch == '+' || ch == '-') {
      normalizedText += ch;
    } else if (ch == goog.i18n.NumberFormatSymbols().PERCENT.charAt(0)) {
      if (scale != 1) {
        break;
      }
      scale = 100;
      if (sawDigit) {
        pos[0]++; // eat this character if parse end here
        break;
      }
    } else if (ch == goog.i18n.NumberFormatSymbols().PERMILL.charAt(0)) {
      if (scale != 1) {
        break;
      }
      scale = 1000;
      if (sawDigit) {
        pos[0]++; // eat this character if parse end here
        break;
      }
    } else {
      break;
    }
  }
  return parseFloat(normalizedText) / scale;
};


/**
 * Formats a Number to produce a string.
 *
 * @param {number} number The Number to be formatted.
 * @return {string} The formatted number string.
 */
goog.i18n.NumberFormat.prototype.format = function(number) {
  if (isNaN(number)) {
    return goog.i18n.NumberFormatSymbols().NAN;
  }

  var parts = [];

  // in icu code, it is commented that certain computation need to keep the
  // negative sign for 0.
  var isNegative = number < 0.0 || number == 0.0 && 1 / number < 0.0;

  parts.push(isNegative ? this.negativePrefix_ : this.positivePrefix_);

  if (!isFinite(number)) {
    parts.push(goog.i18n.NumberFormatSymbols().INFINITY);
  } else {
    // convert number to non-negative value
    number *= isNegative ? -1 : 1;

    number *= this.multiplier_;
    this.useExponentialNotation_ ?
        this.subformatExponential_(number, parts) :
        this.subformatFixed_(number, this.minimumIntegerDigits_, parts);
  }

  parts.push(isNegative ? this.negativeSuffix_ : this.positiveSuffix_);

  return parts.join('');
};


/**
 * Formats a Number in fraction format.
 *
 * @param {number} number Value need to be formated.
 * @param {number} minIntDigits Minimum integer digits.
 * @param {Array} parts This array holds the pieces of formatted string.
 *     This function will add its formatted pieces to the array.
 * @private
 */
goog.i18n.NumberFormat.prototype.subformatFixed_ =
    function(number, minIntDigits, parts) {
  // round the number
  var power = Math.pow(10, this.maximumFractionDigits_);
  var shiftedNumber = Math.round(number * power);
  var intValue, fracValue;
  if (isFinite(shiftedNumber)) {
    intValue = Math.floor(shiftedNumber / power);
    fracValue = Math.floor(shiftedNumber - intValue * power);
  } else {
    intValue = number;
    fracValue = 0;
  }

  var fractionPresent = this.minimumFractionDigits_ > 0 || fracValue > 0;

  var intPart = '';
  var translatableInt = intValue;
  while (translatableInt > 1E20) {
    // here it goes beyond double precision, add '0' make it look better
    intPart = '0' + intPart;
    translatableInt = Math.round(translatableInt / 10);
  }
  intPart = translatableInt + intPart;

  var decimal = goog.i18n.NumberFormatSymbols().DECIMAL_SEP;
  var grouping = goog.i18n.NumberFormatSymbols().GROUP_SEP;
  var zeroCode = goog.i18n.NumberFormat.enforceAsciiDigits_ ?
                 48  /* ascii '0' */ :
                 goog.i18n.NumberFormatSymbols().ZERO_DIGIT.charCodeAt(0);
  var digitLen = intPart.length;

  if (intValue > 0 || minIntDigits > 0) {
    for (var i = digitLen; i < minIntDigits; i++) {
      parts.push(String.fromCharCode(zeroCode));
    }

    for (var i = 0; i < digitLen; i++) {
      parts.push(String.fromCharCode(zeroCode + intPart.charAt(i) * 1));

      if (digitLen - i > 1 && this.groupingSize_ > 0 &&
          ((digitLen - i) % this.groupingSize_ == 1)) {
        parts.push(grouping);
      }
    }
  } else if (!fractionPresent) {
    // If there is no fraction present, and we haven't printed any
    // integer digits, then print a zero.
    parts.push(String.fromCharCode(zeroCode));
  }

  // Output the decimal separator if we always do so.
  if (this.decimalSeparatorAlwaysShown_ || fractionPresent) {
    parts.push(decimal);
  }

  var fracPart = '' + (fracValue + power);
  var fracLen = fracPart.length;
  while (fracPart.charAt(fracLen - 1) == '0' &&
         fracLen > this.minimumFractionDigits_ + 1) {
    fracLen--;
  }

  for (var i = 1; i < fracLen; i++) {
    parts.push(String.fromCharCode(zeroCode + fracPart.charAt(i) * 1));
  }
};


/**
 * Formats exponent part of a Number.
 *
 * @param {number} exponent Exponential value.
 * @param {Array.<string>} parts The array that holds the pieces of formatted
 *     string. This function will append more formatted pieces to the array.
 * @private
 */
goog.i18n.NumberFormat.prototype.addExponentPart_ = function(exponent, parts) {
  parts.push(goog.i18n.NumberFormatSymbols().EXP_SYMBOL);

  if (exponent < 0) {
    exponent = -exponent;
    parts.push(goog.i18n.NumberFormatSymbols().MINUS_SIGN);
  } else if (this.useSignForPositiveExponent_) {
    parts.push(goog.i18n.NumberFormatSymbols().PLUS_SIGN);
  }

  var exponentDigits = '' + exponent;
  var zeroChar = goog.i18n.NumberFormat.enforceAsciiDigits_ ? '0' :
                 goog.i18n.NumberFormatSymbols().ZERO_DIGIT;
  for (var i = exponentDigits.length; i < this.minExponentDigits_; i++) {
    parts.push(zeroChar);
  }
  parts.push(exponentDigits);
};


/**
 * Formats Number in exponential format.
 *
 * @param {number} number Value need to be formated.
 * @param {Array.<string>} parts The array that holds the pieces of formatted
 *     string. This function will append more formatted pieces to the array.
 * @private
 */
goog.i18n.NumberFormat.prototype.subformatExponential_ =
    function(number, parts) {
  if (number == 0.0) {
    this.subformatFixed_(number, this.minimumIntegerDigits_, parts);
    this.addExponentPart_(0, parts);
    return;
  }

  var exponent = Math.floor(Math.log(number) / Math.log(10));
  number /= Math.pow(10, exponent);

  var minIntDigits = this.minimumIntegerDigits_;
  if (this.maximumIntegerDigits_ > 1 &&
      this.maximumIntegerDigits_ > this.minimumIntegerDigits_) {
    // A repeating range is defined; adjust to it as follows.
    // If repeat == 3, we have 6,5,4=>3; 3,2,1=>0; 0,-1,-2=>-3;
    // -3,-4,-5=>-6, etc. This takes into account that the
    // exponent we have here is off by one from what we expect;
    // it is for the format 0.MMMMMx10^n.
    while ((exponent % this.maximumIntegerDigits_) != 0) {
      number *= 10;
      exponent--;
    }
    minIntDigits = 1;
  } else {
    // No repeating range is defined; use minimum integer digits.
    if (this.minimumIntegerDigits_ < 1) {
      exponent++;
      number /= 10;
    } else {
      exponent -= this.minimumIntegerDigits_ - 1;
      number *= Math.pow(10, this.minimumIntegerDigits_ - 1);
    }
  }
  this.subformatFixed_(number, minIntDigits, parts);
  this.addExponentPart_(exponent, parts);
};


/**
 * Returns the digit value of current character. The character could be either
 * '0' to '9', or a locale specific digit.
 *
 * @param {string} ch Character that represents a digit.
 * @return {number} The digit value, or -1 on error.
 * @private
 */
goog.i18n.NumberFormat.prototype.getDigit_ = function(ch) {
  var code = ch.charCodeAt(0);
  // between '0' to '9'
  if (48 <= code && code < 58) {
    return code - 48;
  } else {
    var zeroCode = goog.i18n.NumberFormatSymbols().ZERO_DIGIT.charCodeAt(0);
    return zeroCode <= code && code < zeroCode + 10 ? code - zeroCode : -1;
  }
};


// ----------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------
// Constants for characters used in programmatic (unlocalized) patterns.
/**
 * A zero digit character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_ZERO_DIGIT_ = '0';


/**
 * A grouping separator character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_GROUPING_SEPARATOR_ = ',';


/**
 * A decimal separator character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_DECIMAL_SEPARATOR_ = '.';


/**
 * A per mille character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_PER_MILLE_ = '\u2030';


/**
 * A percent character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_PERCENT_ = '%';


/**
 * A digit character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_DIGIT_ = '#';


/**
 * A separator character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_SEPARATOR_ = ';';


/**
 * An exponent character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_EXPONENT_ = 'E';


/**
 * An plus character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_PLUS_ = '+';


/**
 * A minus character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_MINUS_ = '-';


/**
 * A quote character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.PATTERN_CURRENCY_SIGN_ = '\u00A4';


/**
 * A quote character.
 * @type {string}
 * @private
 */
goog.i18n.NumberFormat.QUOTE_ = '\'';


/**
 * Parses affix part of pattern.
 *
 * @param {string} pattern Pattern string that need to be parsed.
 * @param {Array.<number>} pos One element position array to set and receive
 *     parsing position.
 *
 * @return {string} Affix received from parsing.
 * @private
 */
goog.i18n.NumberFormat.prototype.parseAffix_ = function(pattern, pos) {
  var affix = '';
  var inQuote = false;
  var len = pattern.length;

  for (; pos[0] < len; pos[0]++) {
    var ch = pattern.charAt(pos[0]);
    if (ch == goog.i18n.NumberFormat.QUOTE_) {
      if (pos[0] + 1 < len &&
          pattern.charAt(pos[0] + 1) == goog.i18n.NumberFormat.QUOTE_) {
        pos[0]++;
        affix += '\''; // 'don''t'
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (inQuote) {
      affix += ch;
    } else {
      switch (ch) {
        case goog.i18n.NumberFormat.PATTERN_DIGIT_:
        case goog.i18n.NumberFormat.PATTERN_ZERO_DIGIT_:
        case goog.i18n.NumberFormat.PATTERN_GROUPING_SEPARATOR_:
        case goog.i18n.NumberFormat.PATTERN_DECIMAL_SEPARATOR_:
        case goog.i18n.NumberFormat.PATTERN_SEPARATOR_:
          return affix;
        case goog.i18n.NumberFormat.PATTERN_CURRENCY_SIGN_:
          if ((pos[0] + 1) < len &&
              pattern.charAt(pos[0] + 1) ==
              goog.i18n.NumberFormat.PATTERN_CURRENCY_SIGN_) {
            pos[0]++;
            affix += this.intlCurrencyCode_;
          } else {
            switch (this.currencyStyle_) {
              case goog.i18n.NumberFormat.CurrencyStyle.LOCAL:
                affix += goog.i18n.currency.getLocalCurrencySign(
                    this.intlCurrencyCode_);
                break;
              case goog.i18n.NumberFormat.CurrencyStyle.GLOBAL:
                affix += goog.i18n.currency.getGlobalCurrencySign(
                    this.intlCurrencyCode_);
                break;
              case goog.i18n.NumberFormat.CurrencyStyle.PORTABLE:
                affix += goog.i18n.currency.getPortableCurrencySign(
                    this.intlCurrencyCode_);
                break;
              default:
                break;
            }
          }
          break;
        case goog.i18n.NumberFormat.PATTERN_PERCENT_:
          if (this.multiplier_ != 1) {
            throw Error('Too many percent/permill');
          }
          this.multiplier_ = 100;
          affix += goog.i18n.NumberFormatSymbols().PERCENT;
          break;
        case goog.i18n.NumberFormat.PATTERN_PER_MILLE_:
          if (this.multiplier_ != 1) {
            throw Error('Too many percent/permill');
          }
          this.multiplier_ = 1000;
          affix += goog.i18n.NumberFormatSymbols().PERMILL;
          break;
        default:
          affix += ch;
      }
    }
  }

  return affix;
};


/**
 * Parses the trunk part of a pattern.
 *
 * @param {string} pattern Pattern string that need to be parsed.
 * @param {Array.<number>} pos One element position array to set and receive
 *     parsing position.
 * @private
 */
goog.i18n.NumberFormat.prototype.parseTrunk_ = function(pattern, pos) {
  var decimalPos = -1;
  var digitLeftCount = 0;
  var zeroDigitCount = 0;
  var digitRightCount = 0;
  var groupingCount = -1;

  var len = pattern.length;
  for (var loop = true; pos[0] < len && loop; pos[0]++) {
    var ch = pattern.charAt(pos[0]);
    switch (ch) {
      case goog.i18n.NumberFormat.PATTERN_DIGIT_:
        if (zeroDigitCount > 0) {
          digitRightCount++;
        } else {
          digitLeftCount++;
        }
        if (groupingCount >= 0 && decimalPos < 0) {
          groupingCount++;
        }
        break;
      case goog.i18n.NumberFormat.PATTERN_ZERO_DIGIT_:
        if (digitRightCount > 0) {
          throw Error('Unexpected "0" in pattern "' + pattern + '"');
        }
        zeroDigitCount++;
        if (groupingCount >= 0 && decimalPos < 0) {
          groupingCount++;
        }
        break;
      case goog.i18n.NumberFormat.PATTERN_GROUPING_SEPARATOR_:
        groupingCount = 0;
        break;
      case goog.i18n.NumberFormat.PATTERN_DECIMAL_SEPARATOR_:
        if (decimalPos >= 0) {
          throw Error('Multiple decimal separators in pattern "' +
                      pattern + '"');
        }
        decimalPos = digitLeftCount + zeroDigitCount + digitRightCount;
        break;
      case goog.i18n.NumberFormat.PATTERN_EXPONENT_:
        if (this.useExponentialNotation_) {
          throw Error('Multiple exponential symbols in pattern "' +
                      pattern + '"');
        }
        this.useExponentialNotation_ = true;
        this.minExponentDigits_ = 0;

        // exponent pattern can have a optional '+'.
        if ((pos[0] + 1) < len && pattern.charAt(pos[0] + 1) ==
            goog.i18n.NumberFormat.PATTERN_PLUS_) {
          pos[0]++;
          this.useSignForPositiveExponent_ = true;
        }

        // Use lookahead to parse out the exponential part
        // of the pattern, then jump into phase 2.
        while ((pos[0] + 1) < len && pattern.charAt(pos[0] + 1) ==
               goog.i18n.NumberFormat.PATTERN_ZERO_DIGIT_) {
          pos[0]++;
          this.minExponentDigits_++;
        }

        if ((digitLeftCount + zeroDigitCount) < 1 ||
            this.minExponentDigits_ < 1) {
          throw Error('Malformed exponential pattern "' + pattern + '"');
        }
        loop = false;
        break;
      default:
        pos[0]--;
        loop = false;
        break;
    }
  }

  if (zeroDigitCount == 0 && digitLeftCount > 0 && decimalPos >= 0) {
    // Handle '###.###' and '###.' and '.###'
    var n = decimalPos;
    if (n == 0) { // Handle '.###'
      n++;
    }
    digitRightCount = digitLeftCount - n;
    digitLeftCount = n - 1;
    zeroDigitCount = 1;
  }

  // Do syntax checking on the digits.
  if (decimalPos < 0 && digitRightCount > 0 ||
      decimalPos >= 0 && (decimalPos < digitLeftCount ||
                          decimalPos > digitLeftCount + zeroDigitCount) ||
      groupingCount == 0) {
    throw Error('Malformed pattern "' + pattern + '"');
  }
  var totalDigits = digitLeftCount + zeroDigitCount + digitRightCount;

  this.maximumFractionDigits_ = decimalPos >= 0 ? totalDigits - decimalPos : 0;
  if (decimalPos >= 0) {
    this.minimumFractionDigits_ = digitLeftCount + zeroDigitCount - decimalPos;
    if (this.minimumFractionDigits_ < 0) {
      this.minimumFractionDigits_ = 0;
    }
  }

  // The effectiveDecimalPos is the position the decimal is at or would be at
  // if there is no decimal. Note that if decimalPos<0, then digitTotalCount ==
  // digitLeftCount + zeroDigitCount.
  var effectiveDecimalPos = decimalPos >= 0 ? decimalPos : totalDigits;
  this.minimumIntegerDigits_ = effectiveDecimalPos - digitLeftCount;
  if (this.useExponentialNotation_) {
    this.maximumIntegerDigits_ = digitLeftCount + this.minimumIntegerDigits_;

    // in exponential display, we need to at least show something.
    if (this.maximumFractionDigits_ == 0 && this.minimumIntegerDigits_ == 0) {
      this.minimumIntegerDigits_ = 1;
    }
  }

  this.groupingSize_ = Math.max(0, groupingCount);
  this.decimalSeparatorAlwaysShown_ = decimalPos == 0 ||
                                      decimalPos == totalDigits;
};
// Copyright 2011 The Closure Library Authors. All Rights Reserved
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Plural rules.
 *
 * This file is autogenerated by script:
 * http://go/generate_pluralrules.py
 * using the --for_closure flag.
 *
 * To reduce the file size (which may cause issues in some JS
 * developing environments), this file will only contain locales
 * that are usually supported by google products. This is defined as
 * closure_tier1_locales and will change (most likely addition)
 * over time.  Rest of the data can be found in another file named
 * "pluralrulesext.js", which will be generated at the
 * same time together with this file.
 *
 * Before checkin, this file could have been manually edited. This is
 * to incorporate changes before we could fix CLDR. All manual
 * modification must be documented in this section, and should be
 * removed after those changes land to CLDR.
 */

goog.provide('goog.i18n.pluralRules');


/**
 * Plural pattern keyword
 * @enum {string}
 */
goog.i18n.pluralRules.Keyword = {
  ZERO: 'zero',
  ONE: 'one',
  TWO: 'two',
  FEW: 'few',
  MANY: 'many',
  OTHER: 'other'
};


/**
 * Default plural select rule.
 * @param {number} n The count of items.
 * @return  {goog.i18n.pluralRules.Keyword} Default plural value.
 * @private
 */
goog.i18n.pluralRules.defaultSelect_ = function(n) {
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for ar locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.arSelect_ = function(n) {
  if (n == 0) {
    return goog.i18n.pluralRules.Keyword.ZERO;
  }
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 2) {
    return goog.i18n.pluralRules.Keyword.TWO;
  }
  if ((n % 100) >= 3 && (n % 100) <= 10 && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  if ((n % 100) >= 11 && (n % 100) <= 99 && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.MANY;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for en locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.enSelect_ = function(n) {
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for fil locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.filSelect_ = function(n) {
  if (n == 0 || n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for fr locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.frSelect_ = function(n) {
  if (n >= 0 && n < 2) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for lv locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.lvSelect_ = function(n) {
  if (n == 0) {
    return goog.i18n.pluralRules.Keyword.ZERO;
  }
  if ((n % 10) == 1 && (n % 100) != 11) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for ga locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.gaSelect_ = function(n) {
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 2) {
    return goog.i18n.pluralRules.Keyword.TWO;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for ro locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.roSelect_ = function(n) {
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 0 || n != 1 && (n % 100) >= 1 &&
      (n % 100) <= 19 && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for lt locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.ltSelect_ = function(n) {
  if ((n % 10) == 1 && ((n % 100) < 11 || (n % 100) > 19)) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if ((n % 10) >= 2 && (n % 10) <= 9 &&
      ((n % 100) < 11 || (n % 100) > 19) && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for hr locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.hrSelect_ = function(n) {
  if ((n % 10) == 1 && (n % 100) != 11) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  if ((n % 10) == 0 || ((n % 10) >= 5 && (n % 10) <= 9) ||
      ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.MANY;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for cs locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.csSelect_ = function(n) {
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 2 || n == 3 || n == 4) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for pl locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.plSelect_ = function(n) {
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if ((n % 10) >= 2 && (n % 10) <= 4 &&
      ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  if ((n % 10) == 0 || n != 1 && (n % 10) == 1 ||
      ((n % 10) >= 5 && (n % 10) <= 9 || (n % 100) >= 12 && (n % 100) <= 14) &&
      n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.MANY;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for sl locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.slSelect_ = function(n) {
  if ((n % 100) == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if ((n % 100) == 2) {
    return goog.i18n.pluralRules.Keyword.TWO;
  }
  if ((n % 100) == 3 || (n % 100) == 4) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for mt locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.mtSelect_ = function(n) {
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 0 || ((n % 100) >= 2 && (n % 100) <= 4 && n == Math.floor(n))) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  if ((n % 100) >= 11 && (n % 100) <= 19 && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.MANY;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for mk locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.mkSelect_ = function(n) {
  if ((n % 10) == 1 && n != 11) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for cy locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.cySelect_ = function(n) {
  if (n == 0) {
    return goog.i18n.pluralRules.Keyword.ZERO;
  }
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 2) {
    return goog.i18n.pluralRules.Keyword.TWO;
  }
  if (n == 3) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  if (n == 6) {
    return goog.i18n.pluralRules.Keyword.MANY;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for lag locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.lagSelect_ = function(n) {
  if (n == 0) {
    return goog.i18n.pluralRules.Keyword.ZERO;
  }
  if (n > 0 && n < 2) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for shi locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.shiSelect_ = function(n) {
  if (n >= 0 && n <= 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n >= 2 && n <= 10 && n == Math.floor(n)) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Plural select rules for br locale
 *
 * @param {number} n The count of items.
 * @return {goog.i18n.pluralRules.Keyword} Locale specific plural value.
 * @private
 */
goog.i18n.pluralRules.brSelect_ = function(n) {
  if (n == 0) {
    return goog.i18n.pluralRules.Keyword.ZERO;
  }
  if (n == 1) {
    return goog.i18n.pluralRules.Keyword.ONE;
  }
  if (n == 2) {
    return goog.i18n.pluralRules.Keyword.TWO;
  }
  if (n == 3) {
    return goog.i18n.pluralRules.Keyword.FEW;
  }
  if (n == 6) {
    return goog.i18n.pluralRules.Keyword.MANY;
  }
  return goog.i18n.pluralRules.Keyword.OTHER;
};


/**
 * Selected plural rules by locale.
 */
 goog.i18n.pluralRules.select = function(n) {
   if (_getLocale() == 'am') {
     return goog.i18n.pluralRules.filSelect_(n);
   }

   if (_getLocale() == 'ar') {
     return goog.i18n.pluralRules.arSelect_(n);
   }

   if (_getLocale() == 'bg') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'bn') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'br') {
     return goog.i18n.pluralRules.brSelect_(n);
   }

   if (_getLocale() == 'ca') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'cs') {
     return goog.i18n.pluralRules.csSelect_(n);
   }

   if (_getLocale() == 'da') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'de') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'de_AT' || _getLocale() == 'de-AT') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'de_CH' || _getLocale() == 'de-CH') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'el') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_AU' || _getLocale() == 'en-AU') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_GB' || _getLocale() == 'en-GB') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_IE' || _getLocale() == 'en-IE') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_IN' || _getLocale() == 'en-IN') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_SG' || _getLocale() == 'en-SG') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_US' || _getLocale() == 'en-US') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'en_ZA' || _getLocale() == 'en-ZA') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'es') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'et') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'eu') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'fa') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'fi') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'fil') {
     return goog.i18n.pluralRules.filSelect_(n);
   }

   if (_getLocale() == 'fr') {
     return goog.i18n.pluralRules.frSelect_(n);
   }

   if (_getLocale() == 'fr_CA' || _getLocale() == 'fr-CA') {
     return goog.i18n.pluralRules.frSelect_(n);
   }

   if (_getLocale() == 'gl') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'gsw') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'gu') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'he') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'hi') {
     return goog.i18n.pluralRules.filSelect_(n);
   }

   if (_getLocale() == 'hr') {
     return goog.i18n.pluralRules.hrSelect_(n);
   }

   if (_getLocale() == 'hu') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'id') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'in') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'is') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'it') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'iw') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'ja') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'kn') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'ko') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'ln') {
     return goog.i18n.pluralRules.filSelect_(n);
   }

   if (_getLocale() == 'lt') {
     return goog.i18n.pluralRules.ltSelect_(n);
   }

   if (_getLocale() == 'lv') {
     return goog.i18n.pluralRules.lvSelect_(n);
   }

   if (_getLocale() == 'ml') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'mo') {
     return goog.i18n.pluralRules.roSelect_(n);
   }

   if (_getLocale() == 'mr') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'ms') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'mt') {
     return goog.i18n.pluralRules.mtSelect_(n);
   }

   if (_getLocale() == 'nl') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'no') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'or') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'pl') {
     return goog.i18n.pluralRules.plSelect_(n);
   }

   if (_getLocale() == 'pt') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'pt_BR' || _getLocale() == 'pt-BR') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'pt_PT' || _getLocale() == 'pt-PT') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'ro') {
     return goog.i18n.pluralRules.roSelect_(n);
   }

   if (_getLocale() == 'ru') {
     return goog.i18n.pluralRules.hrSelect_(n);
   }

   if (_getLocale() == 'sk') {
     return goog.i18n.pluralRules.csSelect_(n);
   }

   if (_getLocale() == 'sl') {
     return goog.i18n.pluralRules.slSelect_(n);
   }

   if (_getLocale() == 'sq') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'sr') {
     return goog.i18n.pluralRules.hrSelect_(n);
   }

   if (_getLocale() == 'sv') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'sw') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'ta') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'te') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'th') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'tl') {
     return goog.i18n.pluralRules.filSelect_(n);
   }

   if (_getLocale() == 'tr') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'uk') {
     return goog.i18n.pluralRules.hrSelect_(n);
   }

   if (_getLocale() == 'ur') {
     return goog.i18n.pluralRules.enSelect_(n);
   }

   if (_getLocale() == 'vi') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'zh') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'zh_CN' || _getLocale() == 'zh-CN') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'zh_HK' || _getLocale() == 'zh-HK') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }

   if (_getLocale() == 'zh_TW' || _getLocale() == 'zh-TW') {
     return goog.i18n.pluralRules.defaultSelect_(n);
   }
 }


// Copyright 2010 The Closure Library Authors. All Rights Reserved
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Message/plural format library with locale support.
 *
 * Message format grammar:
 *
 * messageFormatPattern := string ( "{" messageFormatElement "}" string )*
 * messageFormatElement := argumentIndex [ "," elementFormat ]
 * elementFormat := "plural" "," pluralStyle
 *                  | "select" "," selectStyle
 * pluralStyle :=  pluralFormatPattern
 * selectStyle :=  selectFormatPattern
 * pluralFormatPattern := [ "offset" ":" offsetIndex ] pluralForms*
 * selectFormatPattern := pluralForms*
 * pluralForms := stringKey "{" ( "{" messageFormatElement "}"|string )* "}"
 *
 *
 * Message example:
 *
 * I see {NUM_PEOPLE, plural, offset:1
 *         =0 {no one at all}
 *         =1 {{WHO}}
 *         one {{WHO} and one other person}
 *         other {{WHO} and # other people}}
 * in {PLACE}.
 *
 * Calling format({'NUM_PEOPLE': 2, 'WHO': 'Mark', 'PLACE': 'Athens'}) would
 * produce "I see Mark and one other person in Athens." as output.
 *
 * See messageformat_test.html for more examples.
 */

goog.provide('goog.i18n.MessageFormat');

goog.require('goog.asserts');
goog.require('goog.i18n.NumberFormat');
goog.require('goog.i18n.pluralRules');



/**
 * Constructor of MessageFormat.
 * @param {string} pattern The pattern we parse and apply positional parameters
 *     to.
 * @constructor
 */
goog.i18n.MessageFormat = function(pattern) {
  /**
   * All encountered literals during parse stage. Indices tell us the order of
   * replacement.
   * @type {!Array.<string>}
   * @private
   */
  this.literals_ = [];

  /**
   * Input pattern gets parsed into objects for faster formatting.
   * @type {!Array.<!Object>}
   * @private
   */
  this.parsedPattern_ = [];

  /**
   * Locale aware number formatter.
   * @type {goog.i18n.NumberFormat}
   * @private
   */
  this.numberFormatter_ = new goog.i18n.NumberFormat(
      goog.i18n.NumberFormat.Format.DECIMAL);

  this.parsePattern_(pattern);
};


/**
 * Literal strings, including '', are replaced with \uFDDF_x_ for
 * parsing purposes, and recovered during format phase.
 * \uFDDF is a Unicode nonprinting character, not expected to be found in the
 * typical message.
 * @type {string}
 * @private
 */
goog.i18n.MessageFormat.LITERAL_PLACEHOLDER_ = '\uFDDF_';


/**
 * Marks a string and block during parsing.
 * @enum {number}
 * @private
 */
goog.i18n.MessageFormat.Element_ = {
  STRING: 0,
  BLOCK: 1
};


/**
 * Block type.
 * @enum {number}
 * @private
 */
goog.i18n.MessageFormat.BlockType_ = {
  PLURAL: 0,
  SELECT: 1,
  SIMPLE: 2,
  STRING: 3,
  UNKNOWN: 4
};


/**
 * Mandatory option in both select and plural form.
 * @type {string}
 * @private
 */
goog.i18n.MessageFormat.OTHER_ = 'other';


/**
 * Regular expression for looking for string literals.
 * @type {RegExp}
 * @private
 */
goog.i18n.MessageFormat.REGEX_LITERAL_ = new RegExp("'([{}#].*?)'", 'g');


/**
 * Regular expression for looking for '' in the message.
 * @type {RegExp}
 * @private
 */
goog.i18n.MessageFormat.REGEX_DOUBLE_APOSTROPHE_ = new RegExp("''", 'g');


/**
 * Formats a message, treating '#' with special meaning representing
 * the number (plural_variable - offset).
 * @param {!Object} namedParameters Parameters that either
 *     influence the formatting or are used as actual data.
 *     I.e. in call to fmt.format({'NUM_PEOPLE': 5, 'NAME': 'Angela'}),
 *     object {'NUM_PEOPLE': 5, 'NAME': 'Angela'} holds positional parameters.
 *     1st parameter could mean 5 people, which could influence plural format,
 *     and 2nd parameter is just a data to be printed out in proper position.
 * @return {string} Formatted message.
 */
goog.i18n.MessageFormat.prototype.format = function(namedParameters) {
  return this.format_(namedParameters, false);
};


/**
 * Formats a message, treating '#' as literary character.
 * @param {!Object} namedParameters Parameters that either
 *     influence the formatting or are used as actual data.
 *     I.e. in call to fmt.format({'NUM_PEOPLE': 5, 'NAME': 'Angela'}),
 *     object {'NUM_PEOPLE': 5, 'NAME': 'Angela'} holds positional parameters.
 *     1st parameter could mean 5 people, which could influence plural format,
 *     and 2nd parameter is just a data to be printed out in proper position.
 * @return {string} Formatted message.
 */
goog.i18n.MessageFormat.prototype.formatIgnoringPound =
    function(namedParameters) {
  return this.format_(namedParameters, true);
};


/**
 * Formats a message.
 * @param {!Object} namedParameters Parameters that either
 *     influence the formatting or are used as actual data.
 *     I.e. in call to fmt.format({'NUM_PEOPLE': 5, 'NAME': 'Angela'}),
 *     object {'NUM_PEOPLE': 5, 'NAME': 'Angela'} holds positional parameters.
 *     1st parameter could mean 5 people, which could influence plural format,
 *     and 2nd parameter is just a data to be printed out in proper position.
 * @param {boolean} ignorePound If true, treat '#' in plural messages as a
 *     literary character, else treat it as an ICU syntax character, resolving
 *     to the number (plural_variable - offset).
 * @return {string} Formatted message.
 * @private
 */
goog.i18n.MessageFormat.prototype.format_ =
    function(namedParameters, ignorePound) {
  if (this.parsedPattern_.length == 0) {
    return '';
  }

  var result = [];
  this.formatBlock_(this.parsedPattern_, namedParameters, ignorePound, result);
  var message = result.join('');

  if (!ignorePound) {
    goog.asserts.assert(message.search('#') == -1, 'Not all # were replaced.');
  }

  while (this.literals_.length > 0) {
    message = message.replace(this.buildPlaceholder_(this.literals_),
                              this.literals_.pop());
  }

  return message;
};


/**
 * Parses generic block and returns a formatted string.
 * @param {!Array.<!Object>} parsedPattern Holds parsed tree.
 * @param {!Object} namedParameters Parameters that either influence
 *     the formatting or are used as actual data.
 * @param {boolean} ignorePound If true, treat '#' in plural messages as a
 *     literary character, else treat it as an ICU syntax character, resolving
 *     to the number (plural_variable - offset).
 * @param {!Array.<!string>} result Each formatting stage appends its product
 *     to the result.
 * @private
 */
goog.i18n.MessageFormat.prototype.formatBlock_ = function(
    parsedPattern, namedParameters, ignorePound, result) {
  for (var i = 0; i < parsedPattern.length; i++) {
    switch (parsedPattern[i].type) {
      case goog.i18n.MessageFormat.BlockType_.STRING:
        result.push(parsedPattern[i].value);
        break;
      case goog.i18n.MessageFormat.BlockType_.SIMPLE:
        var pattern = parsedPattern[i].value;
        this.formatSimplePlaceholder_(pattern, namedParameters, result);
        break;
      case goog.i18n.MessageFormat.BlockType_.SELECT:
        var pattern = parsedPattern[i].value;
        this.formatSelectBlock_(pattern, namedParameters, ignorePound, result);
        break;
      case goog.i18n.MessageFormat.BlockType_.PLURAL:
        var pattern = parsedPattern[i].value;
        this.formatPluralBlock_(pattern, namedParameters, ignorePound, result);
        break;
      default:
        goog.asserts.fail('Unrecognized block type.');
    }
  }
};


/**
 * Formats simple placeholder.
 * @param {!Object} parsedPattern JSON object containing placeholder info.
 * @param {!Object} namedParameters Parameters that are used as actual data.
 * @param {!Array.<!string>} result Each formatting stage appends its product
 *     to the result.
 * @private
 */
goog.i18n.MessageFormat.prototype.formatSimplePlaceholder_ = function(
    parsedPattern, namedParameters, result) {
  var value = namedParameters[parsedPattern];
  if (!goog.isDef(value)) {
    result.push('Undefined parameter - ' + parsedPattern);
    return;
  }

  // Don't push the value yet, it may contain any of # { } in it which
  // will break formatter. Insert a placeholder and replace at the end.
  this.literals_.push(value);
  result.push(this.buildPlaceholder_(this.literals_));
};


/**
 * Formats select block. Only one option is selected.
 * @param {!Object} parsedPattern JSON object containing select block info.
 * @param {!Object} namedParameters Parameters that either influence
 *     the formatting or are used as actual data.
 * @param {boolean} ignorePound If true, treat '#' in plural messages as a
 *     literary character, else treat it as an ICU syntax character, resolving
 *     to the number (plural_variable - offset).
 * @param {!Array.<!string>} result Each formatting stage appends its product
 *     to the result.
 * @private
 */
goog.i18n.MessageFormat.prototype.formatSelectBlock_ = function(
    parsedPattern, namedParameters, ignorePound, result) {
  var argumentIndex = parsedPattern.argumentIndex;
  if (!goog.isDef(namedParameters[argumentIndex])) {
    result.push('Undefined parameter - ' + argumentIndex);
    return;
  }

  var option = parsedPattern[namedParameters[argumentIndex]];
  if (!goog.isDef(option)) {
    option = parsedPattern[goog.i18n.MessageFormat.OTHER_];
    goog.asserts.assertArray(
        option, 'Invalid option or missing other option for select block.');
  }

  this.formatBlock_(option, namedParameters, ignorePound, result);
};


/**
 * Formats plural block. Only one option is selected and all # are replaced.
 * @param {!Object} parsedPattern JSON object containing plural block info.
 * @param {!Object} namedParameters Parameters that either influence
 *     the formatting or are used as actual data.
 * @param {boolean} ignorePound If true, treat '#' in plural messages as a
 *     literary character, else treat it as an ICU syntax character, resolving
 *     to the number (plural_variable - offset).
 * @param {!Array.<!string>} result Each formatting stage appends its product
 *     to the result.
 * @private
 */
goog.i18n.MessageFormat.prototype.formatPluralBlock_ = function(
    parsedPattern, namedParameters, ignorePound, result) {
  var argumentIndex = parsedPattern.argumentIndex;
  var argumentOffset = parsedPattern.argumentOffset;
  var pluralValue = +namedParameters[argumentIndex];
  if (isNaN(pluralValue)) {
    result.push('Undefined or invalid parameter - ' + argumentIndex);
    return;
  }
  var diff = pluralValue - argumentOffset;

  // Check if there is an exact match.
  var option = parsedPattern[namedParameters[argumentIndex]];
  if (!goog.isDef(option)) {
    goog.asserts.assert(diff >= 0, 'Argument index smaller than offset.');

    var item = goog.i18n.pluralRules.select(diff);
    goog.asserts.assertString(item, 'Invalid plural key.');

    option = parsedPattern[item];

    // If option is not provided fall back to "other".
    if (!goog.isDef(option)) {
      option = parsedPattern[goog.i18n.MessageFormat.OTHER_];
    }

    goog.asserts.assertArray(
        option, 'Invalid option or missing other option for plural block.');
  }

  var pluralResult = [];
  this.formatBlock_(option, namedParameters, ignorePound, pluralResult);
  var plural = pluralResult.join('');
  goog.asserts.assertString(plural, 'Empty block in plural.');
  if (ignorePound) {
    result.push(plural);
  } else {
    var localeAwareDiff = this.numberFormatter_.format(diff);
    result.push(plural.replace(/#/g, function() { return localeAwareDiff; }));
  }
};


/**
 * Parses input pattern into an array, for faster reformatting with
 * different input parameters.
 * Parsing is locale independent.
 * @param {string} pattern MessageFormat pattern to parse.
 * @private
 */
goog.i18n.MessageFormat.prototype.parsePattern_ = function(pattern) {
  if (pattern) {
    pattern = this.insertPlaceholders_(pattern);

    this.parsedPattern_ = this.parseBlock_(pattern);
  }
};


/**
 * Replaces string literals with literal placeholders.
 * Literals are string of the form '}...', '{...' and '#...' where ... is
 * set of characters not containing '
 * Builds a dictionary so we can recover literals during format phase.
 * @param {string} pattern Pattern to clean up.
 * @return {string} Pattern with literals replaced with placeholders.
 * @private
 */
goog.i18n.MessageFormat.prototype.insertPlaceholders_ = function(pattern) {
  var literals = this.literals_;
  var buildPlaceholder = goog.bind(this.buildPlaceholder_, this);

  // First replace '' with single quote placeholder since they can be found
  // inside other literals.
  pattern = pattern.replace(
      goog.i18n.MessageFormat.REGEX_DOUBLE_APOSTROPHE_,
      function() {
        literals.push("'");
        return buildPlaceholder(literals);
      });

  pattern = pattern.replace(
      goog.i18n.MessageFormat.REGEX_LITERAL_,
      function(match, text) {
        literals.push(text);
        return buildPlaceholder(literals);
      });

  return pattern;
};


/**
 * Breaks pattern into strings and top level {...} blocks.
 * @param {string} pattern (sub)Pattern to be broken.
 * @return {Array.<Object>} Each item is {type, value}.
 * @private
 */
goog.i18n.MessageFormat.prototype.extractParts_ = function(pattern) {
  var prevPos = 0;
  var inBlock = false;
  var braceStack = [];
  var results = [];

  var braces = /[{}]/g;
  braces.lastIndex = 0;  // lastIndex doesn't get set to 0 so we have to.
  var match;

  while (match = braces.exec(pattern)) {
    var pos = match.index;
    if (match[0] == '}') {
      var brace = braceStack.pop();
      goog.asserts.assert(goog.isDef(brace) && brace == '{',
                          'No matching { for }.');

      if (braceStack.length == 0) {
        // End of the block.
        var part = {};
        part.type = goog.i18n.MessageFormat.Element_.BLOCK;
        part.value = pattern.substring(prevPos, pos);
        results.push(part);
        prevPos = pos + 1;
        inBlock = false;
      }
    } else {
      if (braceStack.length == 0) {
        inBlock = true;
        var substring = pattern.substring(prevPos, pos);
        if (substring != '') {
          results.push({
            type: goog.i18n.MessageFormat.Element_.STRING,
            value: substring
          });
        }
        prevPos = pos + 1;
      }
      braceStack.push('{');
    }
  }

  // Take care of the final string, and check if the braceStack is empty.
  goog.asserts.assert(braceStack.length == 0,
                      'There are mismatched { or } in the pattern.');

  var substring = pattern.substring(prevPos);
  if (substring != '') {
    results.push({
      type: goog.i18n.MessageFormat.Element_.STRING,
      value: substring
    });
  }

  return results;
};


/**
 * Detects which type of a block is the pattern.
 * @param {string} pattern Content of the block.
 * @return {goog.i18n.MessageFormat.BlockType_} One of the block types.
 * @private
 */
goog.i18n.MessageFormat.prototype.parseBlockType_ = function(pattern) {
  if (/^\s*\w+\s*,\s*plural.*/.test(pattern)) {
    return goog.i18n.MessageFormat.BlockType_.PLURAL;
  }

  if (/^\s*\w+\s*,\s*select.*/.test(pattern)) {
    return goog.i18n.MessageFormat.BlockType_.SELECT;
  }

  if (/^\s*\w+\s*/.test(pattern)) {
    return goog.i18n.MessageFormat.BlockType_.SIMPLE;
  }

  return goog.i18n.MessageFormat.BlockType_.UNKNOWN;
};


/**
 * Parses generic block.
 * @param {string} pattern Content of the block to parse.
 * @return {!Array.<!Object>} Subblocks marked as strings, select...
 * @private
 */
goog.i18n.MessageFormat.prototype.parseBlock_ = function(pattern) {
  var result = [];
  var parts = this.extractParts_(pattern);
  for (var i = 0; i < parts.length; i++) {
    var block = {};
    if (goog.i18n.MessageFormat.Element_.STRING == parts[i].type) {
      block.type = goog.i18n.MessageFormat.BlockType_.STRING;
      block.value = parts[i].value;
    } else if (goog.i18n.MessageFormat.Element_.BLOCK == parts[i].type) {
      var blockType = this.parseBlockType_(parts[i].value);

      switch (blockType) {
        case goog.i18n.MessageFormat.BlockType_.SELECT:
          block.type = goog.i18n.MessageFormat.BlockType_.SELECT;
          block.value = this.parseSelectBlock_(parts[i].value);
          break;
        case goog.i18n.MessageFormat.BlockType_.PLURAL:
          block.type = goog.i18n.MessageFormat.BlockType_.PLURAL;
          block.value = this.parsePluralBlock_(parts[i].value);
          break;
        case goog.i18n.MessageFormat.BlockType_.SIMPLE:
          block.type = goog.i18n.MessageFormat.BlockType_.SIMPLE;
          block.value = parts[i].value;
          break;
        default:
          goog.asserts.fail('Unknown block type.');
      }
    } else {
      goog.asserts.fail('Unknown part of the pattern.');
    }
    result.push(block);
  }

  return result;
};


/**
 * Parses a select type of a block and produces JSON object for it.
 * @param {string} pattern Subpattern that needs to be parsed as select pattern.
 * @return {Object} Object with select block info.
 * @private
 */
goog.i18n.MessageFormat.prototype.parseSelectBlock_ = function(pattern) {
  var argumentIndex = '';
  var replaceRegex = /\s*(\w+)\s*,\s*select\s*,/;
  pattern = pattern.replace(replaceRegex, function(string, name) {
    argumentIndex = name;
    return '';
  });
  var result = {};
  result.argumentIndex = argumentIndex;

  var parts = this.extractParts_(pattern);
  // Looking for (key block)+ sequence. One of the keys has to be "other".
  var pos = 0;
  while (pos < parts.length) {
    var key = parts[pos].value;
    goog.asserts.assertString(key, 'Missing select key element.');

    pos++;
    goog.asserts.assert(pos < parts.length,
                        'Missing or invalid select value element.');

    if (goog.i18n.MessageFormat.Element_.BLOCK == parts[pos].type) {
      var value = this.parseBlock_(parts[pos].value);
    } else {
      goog.asserts.fail('Expected block type.');
    }
    result[key.replace(/\s/g, '')] = value;
    pos++;
  }

  goog.asserts.assertArray(result[goog.i18n.MessageFormat.OTHER_],
                           'Missing other key in select statement.');
  return result;
};


/**
 * Parses a plural type of a block and produces JSON object for it.
 * @param {string} pattern Subpattern that needs to be parsed as plural pattern.
 * @return {Object} Object with select block info.
 * @private
 */
goog.i18n.MessageFormat.prototype.parsePluralBlock_ = function(pattern) {
  var argumentIndex = '';
  var argumentOffset = 0;
  var replaceRegex = /\s*(\w+)\s*,\s*plural\s*,(?:\s*offset:(\d+))?/;
  pattern = pattern.replace(replaceRegex, function(string, name, offset) {
    argumentIndex = name;
    if (offset) {
      argumentOffset = parseInt(offset, 10);
    }
    return '';
  });

  var result = {};
  result.argumentIndex = argumentIndex;
  result.argumentOffset = argumentOffset;

  var parts = this.extractParts_(pattern);
  // Looking for (key block)+ sequence.
  var pos = 0;
  while (pos < parts.length) {
    var key = parts[pos].value;
    goog.asserts.assertString(key, 'Missing plural key element.');

    pos++;
    goog.asserts.assert(pos < parts.length,
                        'Missing or invalid plural value element.');

    if (goog.i18n.MessageFormat.Element_.BLOCK == parts[pos].type) {
      var value = this.parseBlock_(parts[pos].value);
    } else {
      goog.asserts.fail('Expected block type.');
    }
    result[key.replace(/\s*(?:=)?(\w+)\s*/, '$1')] = value;
    pos++;
  }

  goog.asserts.assertArray(result[goog.i18n.MessageFormat.OTHER_],
                           'Missing other key in plural statement.');

  return result;
};


/**
 * Builds a placeholder from the last index of the array.
 * @param {!Array} literals All literals encountered during parse.
 * @return {string} \uFDDF_ + last index + _.
 * @private
 */
goog.i18n.MessageFormat.prototype.buildPlaceholder_ = function(literals) {
  goog.asserts.assert(literals.length > 0, 'Literal array is empty.');

  var index = (literals.length - 1).toString(10);
  return goog.i18n.MessageFormat.LITERAL_PLACEHOLDER_ + index + '_';
};

var LOCALE = 'en';
function _getLocale() {
  return LOCALE;
}

module.exports = function(pattern, opt_locale) {
  if (opt_locale !== undefined) {
    LOCALE = opt_locale;
  }
  return new goog.i18n.MessageFormat(pattern);
};
