window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-140352188-1');

// packages/alpinejs/src/scheduler.js
var flushPending = false;
var flushing = false;
var queue = [];
var lastFlushedIndex = -1;
function scheduler(callback) {
  queueJob(callback);
}
function queueJob(job) {
  if (!queue.includes(job))
    queue.push(job);
  queueFlush();
}
function dequeueJob(job) {
  let index = queue.indexOf(job);
  if (index !== -1 && index > lastFlushedIndex)
    queue.splice(index, 1);
}
function queueFlush() {
  if (!flushing && !flushPending) {
    flushPending = true;
    queueMicrotask(flushJobs);
  }
}
function flushJobs() {
  flushPending = false;
  flushing = true;
  for (let i = 0; i < queue.length; i++) {
    queue[i]();
    lastFlushedIndex = i;
  }
  queue.length = 0;
  lastFlushedIndex = -1;
  flushing = false;
}

// packages/alpinejs/src/reactivity.js
var reactive;
var effect;
var release;
var raw;
var shouldSchedule = true;
function disableEffectScheduling(callback) {
  shouldSchedule = false;
  callback();
  shouldSchedule = true;
}
function setReactivityEngine(engine) {
  reactive = engine.reactive;
  release = engine.release;
  effect = (callback) => engine.effect(callback, { scheduler: (task) => {
    if (shouldSchedule) {
      scheduler(task);
    } else {
      task();
    }
  } });
  raw = engine.raw;
}
function overrideEffect(override) {
  effect = override;
}
function elementBoundEffect(el) {
  let cleanup2 = () => {
  };
  let wrappedEffect = (callback) => {
      let effectReference = effect(callback);
      if (!el._x_effects) {
        el._x_effects = /* @__PURE__ */ new Set();
        el._x_runEffects = () => {
          el._x_effects.forEach((i) => i());
        };
      }
      el._x_effects.add(effectReference);
      cleanup2 = () => {
        if (effectReference === void 0)
          return;
        el._x_effects.delete(effectReference);
        release(effectReference);
      };
      return effectReference;
    };
    return [wrappedEffect, () => {
      cleanup2();
    }];
  }
  function watch(getter, callback) {
    let firstTime = true;
    let oldValue;
    let effectReference = effect(() => {
      let value = getter();
      JSON.stringify(value);
      if (!firstTime) {
        queueMicrotask(() => {
          callback(value, oldValue);
          oldValue = value;
        });
      } else {
        oldValue = value;
      }
      firstTime = false;
    });
    return () => release(effectReference);
  }

  // packages/alpinejs/src/mutation.js
  var onAttributeAddeds = [];
  var onElRemoveds = [];
  var onElAddeds = [];
  function onElAdded(callback) {
    onElAddeds.push(callback);
  }
  function onElRemoved(el, callback) {
    if (typeof callback === "function") {
      if (!el._x_cleanups)
        el._x_cleanups = [];
      el._x_cleanups.push(callback);
    } else {
      callback = el;
      onElRemoveds.push(callback);
    }
  }
  function onAttributesAdded(callback) {
    onAttributeAddeds.push(callback);
  }
  function onAttributeRemoved(el, name, callback) {
    if (!el._x_attributeCleanups)
      el._x_attributeCleanups = {};
    if (!el._x_attributeCleanups[name])
      el._x_attributeCleanups[name] = [];
    el._x_attributeCleanups[name].push(callback);
  }
  function cleanupAttributes(el, names) {
    if (!el._x_attributeCleanups)
      return;
    Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
      if (names === void 0 || names.includes(name)) {
        value.forEach((i) => i());
        delete el._x_attributeCleanups[name];
      }
    });
  }
  function cleanupElement(el) {
    el._x_effects?.forEach(dequeueJob);
    while (el._x_cleanups?.length)
      el._x_cleanups.pop()();
  }
  var observer = new MutationObserver(onMutate);
  var currentlyObserving = false;
  function startObservingMutations() {
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
    currentlyObserving = true;
  }
  function stopObservingMutations() {
    flushObserver();
    observer.disconnect();
    currentlyObserving = false;
  }
  var queuedMutations = [];
  function flushObserver() {
    let records = observer.takeRecords();
    queuedMutations.push(() => records.length > 0 && onMutate(records));
    let queueLengthWhenTriggered = queuedMutations.length;
    queueMicrotask(() => {
      if (queuedMutations.length === queueLengthWhenTriggered) {
        while (queuedMutations.length > 0)
          queuedMutations.shift()();
      }
    });
  }
  function mutateDom(callback) {
    if (!currentlyObserving)
      return callback();
    stopObservingMutations();
    let result = callback();
    startObservingMutations();
    return result;
  }
  var isCollecting = false;
  var deferredMutations = [];
  function deferMutations() {
    isCollecting = true;
  }
  function flushAndStopDeferringMutations() {
    isCollecting = false;
    onMutate(deferredMutations);
    deferredMutations = [];
  }
  function onMutate(mutations) {
    if (isCollecting) {
      deferredMutations = deferredMutations.concat(mutations);
      return;
    }
    let addedNodes = /* @__PURE__ */ new Set();
    let removedNodes = /* @__PURE__ */ new Set();
    let addedAttributes = /* @__PURE__ */ new Map();
    let removedAttributes = /* @__PURE__ */ new Map();
    for (let i = 0; i < mutations.length; i++) {
      if (mutations[i].target._x_ignoreMutationObserver)
        continue;
      if (mutations[i].type === "childList") {
        mutations[i].addedNodes.forEach((node) => node.nodeType === 1 && addedNodes.add(node));
        mutations[i].removedNodes.forEach((node) => node.nodeType === 1 && removedNodes.add(node));
      }
      if (mutations[i].type === "attributes") {
        let el = mutations[i].target;
        let name = mutations[i].attributeName;
        let oldValue = mutations[i].oldValue;
        let add2 = () => {
          if (!addedAttributes.has(el))
            addedAttributes.set(el, []);
          addedAttributes.get(el).push({ name, value: el.getAttribute(name) });
        };
        let remove = () => {
          if (!removedAttributes.has(el))
            removedAttributes.set(el, []);
          removedAttributes.get(el).push(name);
        };
        if (el.hasAttribute(name) && oldValue === null) {
          add2();
        } else if (el.hasAttribute(name)) {
          remove();
          add2();
        } else {
          remove();
        }
      }
    }
    removedAttributes.forEach((attrs, el) => {
      cleanupAttributes(el, attrs);
    });
    addedAttributes.forEach((attrs, el) => {
      onAttributeAddeds.forEach((i) => i(el, attrs));
    });
    for (let node of removedNodes) {
      if (addedNodes.has(node))
        continue;
      onElRemoveds.forEach((i) => i(node));
    }
    addedNodes.forEach((node) => {
      node._x_ignoreSelf = true;
      node._x_ignore = true;
    });
    for (let node of addedNodes) {
      if (removedNodes.has(node))
        continue;
      if (!node.isConnected)
        continue;
      delete node._x_ignoreSelf;
      delete node._x_ignore;
      onElAddeds.forEach((i) => i(node));
      node._x_ignore = true;
      node._x_ignoreSelf = true;
    }
    addedNodes.forEach((node) => {
      delete node._x_ignoreSelf;
      delete node._x_ignore;
    });
    addedNodes = null;
    removedNodes = null;
    addedAttributes = null;
    removedAttributes = null;
  }

  // packages/alpinejs/src/scope.js
  function scope(node) {
    return mergeProxies(closestDataStack(node));
  }
  function addScopeToNode(node, data2, referenceNode) {
    node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
    return () => {
      node._x_dataStack = node._x_dataStack.filter((i) => i !== data2);
    };
  }
  function closestDataStack(node) {
    if (node._x_dataStack)
      return node._x_dataStack;
    if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
      return closestDataStack(node.host);
    }
    if (!node.parentNode) {
      return [];
    }
    return closestDataStack(node.parentNode);
  }
  function mergeProxies(objects) {
    return new Proxy({ objects }, mergeProxyTrap);
  }
  var mergeProxyTrap = {
    ownKeys({ objects }) {
      return Array.from(
        new Set(objects.flatMap((i) => Object.keys(i)))
      );
    },
    has({ objects }, name) {
      if (name == Symbol.unscopables)
        return false;
      return objects.some(
        (obj) => Object.prototype.hasOwnProperty.call(obj, name) || Reflect.has(obj, name)
      );
    },
    get({ objects }, name, thisProxy) {
      if (name == "toJSON")
        return collapseProxies;
      return Reflect.get(
        objects.find(
          (obj) => Reflect.has(obj, name)
        ) || {},
        name,
        thisProxy
      );
    },
    set({ objects }, name, value, thisProxy) {
      const target = objects.find(
        (obj) => Object.prototype.hasOwnProperty.call(obj, name)
      ) || objects[objects.length - 1];
      const descriptor = Object.getOwnPropertyDescriptor(target, name);
      if (descriptor?.set && descriptor?.get)
        return descriptor.set.call(thisProxy, value) || true;
      return Reflect.set(target, name, value);
    }
  };
  function collapseProxies() {
    let keys = Reflect.ownKeys(this);
    return keys.reduce((acc, key) => {
      acc[key] = Reflect.get(this, key);
      return acc;
    }, {});
  }

  // packages/alpinejs/src/interceptor.js
  function initInterceptors(data2) {
    let isObject2 = (val) => typeof val === "object" && !Array.isArray(val) && val !== null;
    let recurse = (obj, basePath = "") => {
      Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, { value, enumerable }]) => {
        if (enumerable === false || value === void 0)
          return;
        if (typeof value === "object" && value !== null && value.__v_skip)
          return;
        let path = basePath === "" ? key : `${basePath}.${key}`;
        if (typeof value === "object" && value !== null && value._x_interceptor) {
          obj[key] = value.initialize(data2, path, key);
        } else {
          if (isObject2(value) && value !== obj && !(value instanceof Element)) {
            recurse(value, path);
          }
        }
      });
    };
    return recurse(data2);
  }
  function interceptor(callback, mutateObj = () =< {
  }) {
    let obj = {
      initialValue: void 0,
      _x_interceptor: true,
      initialize(data2, path, key) {
        return callback(this.initialValue, () =< get(data2, path), (value) =< set(data2, path, value), path, key);
      }
    };
    mutateObj(obj);
    return (initialValue) =< {
      if (typeof initialValue === &quot;object&quot; && initialValue !== null && initialValue._x_interceptor) {
        let initialize = obj.initialize.bind(obj);
        obj.initialize = (data2, path, key) =< {
          let innerValue = initialValue.initialize(data2, path, key);
          obj.initialValue = innerValue;
          return initialize(data2, path, key);
        };
      } else {
        obj.initialValue = initialValue;
      }
      return obj;
    };
  }
  function get(obj, path) {
    return path.split(&quot;.&quot;).reduce((carry, segment) =< carry[segment], obj);
  }
  function set(obj, path, value) {
    if (typeof path === &quot;string&quot;)
      path = path.split(&quot;.&quot;);
    if (path.length === 1)
      obj[path[0]] = value;
    else if (path.length === 0)
      throw error;
    else {
      if (obj[path[0]])
        return set(obj[path[0]], path.slice(1), value);
      else {
        obj[path[0]] = {};
        return set(obj[path[0]], path.slice(1), value);
      }
    }
  }

  // packages/alpinejs/src/magics.js
  var magics = {};
  function magic(name, callback) {
    magics[name] = callback;
  }
  function injectMagics(obj, el) {
    let memoizedUtilities = getUtilities(el);
    Object.entries(magics).forEach(([name, callback]) =< {
      Object.defineProperty(obj, `$${name}`, {
        get() {
          return callback(el, memoizedUtilities);
        },
        enumerable: false
      });
    });
    return obj;
  }
  function getUtilities(el) {
    let [utilities, cleanup2] = getElementBoundUtilities(el);
    let utils = { interceptor, ...utilities };
    onElRemoved(el, cleanup2);
    return utils;
  }

  // packages/alpinejs/src/utils/error.js
  function tryCatch(el, expression, callback, ...args) {
    try {
      return callback(...args);
    } catch (e) {
      handleError(e, el, expression);
    }
  }
  function handleError(error2, el, expression = void 0) {
    error2 = Object.assign(
      error2 ?? { message: &quot;No error message given.&quot; },
      { el, expression }
    );
    console.warn(`Alpine Expression Error: ${error2.message}

${expression ? &apos;Expression: &quot;&apos; + expression + &apos;&quot;\n\n&apos; : &quot;&quot;}`, el);
    setTimeout(() =< {
      throw error2;
    }, 0);
  }

  // packages/alpinejs/src/evaluator.js
  var shouldAutoEvaluateFunctions = true;
  function dontAutoEvaluateFunctions(callback) {
    let cache = shouldAutoEvaluateFunctions;
    shouldAutoEvaluateFunctions = false;
    let result = callback();
    shouldAutoEvaluateFunctions = cache;
    return result;
  }
  function evaluate(el, expression, extras = {}) {
    let result;
    evaluateLater(el, expression)((value) =< result = value, extras);
    return result;
  }
  function evaluateLater(...args) {
    return theEvaluatorFunction(...args);
  }
  var theEvaluatorFunction = normalEvaluator;
  function setEvaluator(newEvaluator) {
    theEvaluatorFunction = newEvaluator;
  }
  function normalEvaluator(el, expression) {
    let overriddenMagics = {};
    injectMagics(overriddenMagics, el);
    let dataStack = [overriddenMagics, ...closestDataStack(el)];
    let evaluator = typeof expression === &quot;function&quot; ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
    return tryCatch.bind(null, el, expression, evaluator);
  }
  function generateEvaluatorFromFunction(dataStack, func) {
    return (receiver = () =< {
    }, { scope: scope2 = {}, params = [] } = {}) =< {
      let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
      runIfTypeOfFunction(receiver, result);
    };
  }
  var evaluatorMemo = {};
  function generateFunctionFromString(expression, el) {
    if (evaluatorMemo[expression]) {
      return evaluatorMemo[expression];
    }
    let AsyncFunction = Object.getPrototypeOf(async function() {
    }).constructor;
    let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression.trim()) || /^(let|const)\s/.test(expression.trim()) ? `(async()=<{ ${expression} })()` : expression;
    const safeAsyncFunction = () =< {
      try {
        let func2 = new AsyncFunction(
          [&quot;__self&quot;, &quot;scope&quot;],
          `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`
        );
        Object.defineProperty(func2, &quot;name&quot;, {
          value: `[Alpine] ${expression}`
        });
        return func2;
      } catch (error2) {
        handleError(error2, el, expression);
        return Promise.resolve();
      }
    };
    let func = safeAsyncFunction();
    evaluatorMemo[expression] = func;
    return func;
  }
  function generateEvaluatorFromString(dataStack, expression, el) {
    let func = generateFunctionFromString(expression, el);
    return (receiver = () =< {
    }, { scope: scope2 = {}, params = [] } = {}) =< {
      func.result = void 0;
      func.finished = false;
      let completeScope = mergeProxies([scope2, ...dataStack]);
      if (typeof func === &quot;function&quot;) {
        let promise = func(func, completeScope).catch((error2) =< handleError(error2, el, expression));
        if (func.finished) {
          runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
          func.result = void 0;
        } else {
          promise.then((result) =< {
            runIfTypeOfFunction(receiver, result, completeScope, params, el);
          }).catch((error2) =< handleError(error2, el, expression)).finally(() =< func.result = void 0);
        }
      }
    };
  }
  function runIfTypeOfFunction(receiver, value, scope2, params, el) {
    if (shouldAutoEvaluateFunctions && typeof value === &quot;function&quot;) {
      let result = value.apply(scope2, params);
      if (result instanceof Promise) {
        result.then((i) =< runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) =< handleError(error2, el, value));
      } else {
        receiver(result);
      }
    } else if (typeof value === &quot;object&quot; && value instanceof Promise) {
      value.then((i) =< receiver(i));
    } else {
      receiver(value);
    }
  }

  // packages/alpinejs/src/directives.js
  var prefixAsString = &quot;x-&quot;;
  function prefix(subject = &quot;&quot;) {
    return prefixAsString + subject;
  }
  function setPrefix(newPrefix) {
    prefixAsString = newPrefix;
  }
  var directiveHandlers = {};
  function directive(name, callback) {
    directiveHandlers[name] = callback;
    return {
      before(directive2) {
        if (!directiveHandlers[directive2]) {
          console.warn(String.raw`Cannot find directive \`${directive2}\`. \`${name}\` will use the default order of execution`);
          return;
        }
        const pos = directiveOrder.indexOf(directive2);
        directiveOrder.splice(pos <= 0 ? pos : directiveOrder.indexOf(&quot;DEFAULT&quot;), 0, name);
      }
    };
  }
  function directiveExists(name) {
    return Object.keys(directiveHandlers).includes(name);
  }
  function directives(el, attributes, originalAttributeOverride) {
    attributes = Array.from(attributes);
    if (el._x_virtualDirectives) {
      let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) =< ({ name, value }));
      let staticAttributes = attributesOnly(vAttributes);
      vAttributes = vAttributes.map((attribute) =< {
        if (staticAttributes.find((attr) =< attr.name === attribute.name)) {
          return {
            name: `x-bind:${attribute.name}`,
            value: `&quot;${attribute.value}&quot;`
          };
        }
        return attribute;
      });
      attributes = attributes.concat(vAttributes);
    }
    let transformedAttributeMap = {};
    let directives2 = attributes.map(toTransformedAttributes((newName, oldName) =< transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
    return directives2.map((directive2) =< {
      return getDirectiveHandler(el, directive2);
    });
  }
  function attributesOnly(attributes) {
    return Array.from(attributes).map(toTransformedAttributes()).filter((attr) =< !outNonAlpineAttributes(attr));
  }
  var isDeferringHandlers = false;
  var directiveHandlerStacks = /* @__PURE__ */ new Map();
  var currentHandlerStackKey = Symbol();
  function deferHandlingDirectives(callback) {
    isDeferringHandlers = true;
    let key = Symbol();
    currentHandlerStackKey = key;
    directiveHandlerStacks.set(key, []);
    let flushHandlers = () =< {
      while (directiveHandlerStacks.get(key).length)
        directiveHandlerStacks.get(key).shift()();
      directiveHandlerStacks.delete(key);
    };
    let stopDeferring = () =< {
      isDeferringHandlers = false;
      flushHandlers();
    };
    callback(flushHandlers);
    stopDeferring();
  }
  function getElementBoundUtilities(el) {
    let cleanups = [];
    let cleanup2 = (callback) =< cleanups.push(callback);
    let [effect3, cleanupEffect] = elementBoundEffect(el);
    cleanups.push(cleanupEffect);
    let utilities = {
      Alpine: alpine_default,
      effect: effect3,
      cleanup: cleanup2,
      evaluateLater: evaluateLater.bind(evaluateLater, el),
      evaluate: evaluate.bind(evaluate, el)
    };
    let doCleanup = () =< cleanups.forEach((i) =< i());
    return [utilities, doCleanup];
  }
  function getDirectiveHandler(el, directive2) {
    let noop = () =< {
    };
    let handler4 = directiveHandlers[directive2.type] || noop;
    let [utilities, cleanup2] = getElementBoundUtilities(el);
    onAttributeRemoved(el, directive2.original, cleanup2);
    let fullHandler = () =< {
      if (el._x_ignore || el._x_ignoreSelf)
        return;
      handler4.inline && handler4.inline(el, directive2, utilities);
      handler4 = handler4.bind(handler4, el, directive2, utilities);
      isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
    };
    fullHandler.runCleanups = cleanup2;
    return fullHandler;
  }
  var startingWith = (subject, replacement) =< ({ name, value }) =< {
    if (name.startsWith(subject))
      name = name.replace(subject, replacement);
    return { name, value };
  };
  var into = (i) =< i;
  function toTransformedAttributes(callback = () =< {
  }) {
    return ({ name, value }) =< {
      let { name: newName, value: newValue } = attributeTransformers.reduce((carry, transform) =< {
        return transform(carry);
      }, { name, value });
      if (newName !== name)
        callback(newName, name);
      return { name: newName, value: newValue };
    };
  }
  var attributeTransformers = [];
  function mapAttributes(callback) {
    attributeTransformers.push(callback);
  }
  function outNonAlpineAttributes({ name }) {
    return alpineAttributeRegex().test(name);
  }
  var alpineAttributeRegex = () =< new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
  function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
    return ({ name, value }) =< {
      let typeMatch = name.match(alpineAttributeRegex());
      let valueMatch = name.match(/:([a-zA-Z0-9\-_:]+)/);
      let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
      let original = originalAttributeOverride || transformedAttributeMap[name] || name;
      return {
        type: typeMatch ? typeMatch[1] : null,
        value: valueMatch ? valueMatch[1] : null,
        modifiers: modifiers.map((i) =< i.replace(&quot;.&quot;, &quot;&quot;)),
        expression: value,
        original
      };
    };
  }
  var DEFAULT = &quot;DEFAULT&quot;;
  var directiveOrder = [
    &quot;ignore&quot;,
    &quot;ref&quot;,
    &quot;data&quot;,
    &quot;id&quot;,
    &quot;anchor&quot;,
    &quot;bind&quot;,
    &quot;init&quot;,
    &quot;for&quot;,
    &quot;model&quot;,
    &quot;modelable&quot;,
    &quot;transition&quot;,
    &quot;show&quot;,
    &quot;if&quot;,
    DEFAULT,
    &quot;teleport&quot;
  ];
  function byPriority(a, b) {
    let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
    let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
    return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
  }

  // packages/alpinejs/src/utils/dispatch.js
  function dispatch(el, name, detail = {}) {
    el.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        // Allows events to pass the shadow DOM barrier.
        composed: true,
        cancelable: true
      })
    );
  }

  // packages/alpinejs/src/utils/walk.js
  function walk(el, callback) {
    if (typeof ShadowRoot === &quot;function&quot; && el instanceof ShadowRoot) {
      Array.from(el.children).forEach((el2) =< walk(el2, callback));
      return;
    }
    let skip = false;
    callback(el, () =< skip = true);
    if (skip)
      return;
    let node = el.firstElementChild;
    while (node) {
      walk(node, callback, false);
      node = node.nextElementSibling;
    }
  }

  // packages/alpinejs/src/utils/warn.js
  function warn(message, ...args) {
    console.warn(`Alpine Warning: ${message}`, ...args);
  }

  // packages/alpinejs/src/lifecycle.js
  var started = false;
  function start() {
    if (started)
      warn(&quot;Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.&quot;);
    started = true;
    if (!document.body)
      warn(&quot;Unable to initialize. Trying to load Alpine before `<body<` is available. Did you forget to add `defer` in Alpine&apos;s `<script<` tag?&quot;);
    dispatch(document, &quot;alpine:init&quot;);
    dispatch(document, &quot;alpine:initializing&quot;);
    startObservingMutations();
    onElAdded((el) =< initTree(el, walk));
    onElRemoved((el) =< destroyTree(el));
    onAttributesAdded((el, attrs) =< {
      directives(el, attrs).forEach((handle) =< handle());
    });
    let outNestedComponents = (el) =< !closestRoot(el.parentElement, true);
    Array.from(document.querySelectorAll(allSelectors().join(&quot;,&quot;))).filter(outNestedComponents).forEach((el) =< {
      initTree(el);
    });
    dispatch(document, &quot;alpine:initialized&quot;);
    setTimeout(() =< {
      warnAboutMissingPlugins();
    });
  }
  var rootSelectorCallbacks = [];
  var initSelectorCallbacks = [];
  function rootSelectors() {
    return rootSelectorCallbacks.map((fn) =< fn());
  }
  function allSelectors() {
    return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn) =< fn());
  }
  function addRootSelector(selectorCallback) {
    rootSelectorCallbacks.push(selectorCallback);
  }
  function addInitSelector(selectorCallback) {
    initSelectorCallbacks.push(selectorCallback);
  }
  function closestRoot(el, includeInitSelectors = false) {
    return findClosest(el, (element) =< {
      const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
      if (selectors.some((selector) =< element.matches(selector)))
        return true;
    });
  }
  function findClosest(el, callback) {
    if (!el)
      return;
    if (callback(el))
      return el;
    if (el._x_teleportBack)
      el = el._x_teleportBack;
    if (!el.parentElement)
      return;
    return findClosest(el.parentElement, callback);
  }
  function isRoot(el) {
    return rootSelectors().some((selector) =< el.matches(selector));
  }
  var initInterceptors2 = [];
  function interceptInit(callback) {
    initInterceptors2.push(callback);
  }
  function initTree(el, walker = walk, intercept = () =< {
  }) {
    deferHandlingDirectives(() =< {
      walker(el, (el2, skip) =< {
        intercept(el2, skip);
        initInterceptors2.forEach((i) =< i(el2, skip));
        directives(el2, el2.attributes).forEach((handle) =< handle());
        el2._x_ignore && skip();
      });
    });
  }
  function destroyTree(root, walker = walk) {
    walker(root, (el) =< {
      cleanupElement(el);
      cleanupAttributes(el);
    });
  }
  function warnAboutMissingPlugins() {
    let pluginDirectives = [
      [&quot;ui&quot;, &quot;dialog&quot;, [&quot;[x-dialog], [x-popover]&quot;]],
      [&quot;anchor&quot;, &quot;anchor&quot;, [&quot;[x-anchor]&quot;]],
      [&quot;sort&quot;, &quot;sort&quot;, [&quot;[x-sort]&quot;]]
    ];
    pluginDirectives.forEach(([plugin2, directive2, selectors]) =< {
      if (directiveExists(directive2))
        return;
      selectors.some((selector) =< {
        if (document.querySelector(selector)) {
          warn(`found &quot;${selector}&quot;, but missing ${plugin2} plugin`);
          return true;
        }
      });
    });
  }

  // packages/alpinejs/src/nextTick.js
  var tickStack = [];
  var isHolding = false;
  function nextTick(callback = () =< {
  }) {
    queueMicrotask(() =< {
      isHolding || setTimeout(() =< {
        releaseNextTicks();
      });
    });
    return new Promise((res) =< {
      tickStack.push(() =< {
        callback();
        res();
      });
    });
  }
  function releaseNextTicks() {
    isHolding = false;
    while (tickStack.length)
      tickStack.shift()();
  }
  function holdNextTicks() {
    isHolding = true;
  }

  // packages/alpinejs/src/utils/classes.js
  function setClasses(el, value) {
    if (Array.isArray(value)) {
      return setClassesFromString(el, value.join(&quot; &quot;));
    } else if (typeof value === &quot;object&quot; && value !== null) {
      return setClassesFromObject(el, value);
    } else if (typeof value === &quot;function&quot;) {
      return setClasses(el, value());
    }
    return setClassesFromString(el, value);
  }
  function setClassesFromString(el, classString) {
    let split = (classString2) =< classString2.split(&quot; &quot;).filter(Boolean);
    let missingClasses = (classString2) =< classString2.split(&quot; &quot;).filter((i) =< !el.classList.contains(i)).filter(Boolean);
    let addClassesAndReturnUndo = (classes) =< {
      el.classList.add(...classes);
      return () =< {
        el.classList.remove(...classes);
      };
    };
    classString = classString === true ? classString = &quot;&quot; : classString || &quot;&quot;;
    return addClassesAndReturnUndo(missingClasses(classString));
  }
  function setClassesFromObject(el, classObject) {
    let split = (classString) =< classString.split(&quot; &quot;).filter(Boolean);
    let forAdd = Object.entries(classObject).flatMap(([classString, bool]) =< bool ? split(classString) : false).filter(Boolean);
    let forRemove = Object.entries(classObject).flatMap(([classString, bool]) =< !bool ? split(classString) : false).filter(Boolean);
    let added = [];
    let removed = [];
    forRemove.forEach((i) =< {
      if (el.classList.contains(i)) {
        el.classList.remove(i);
        removed.push(i);
      }
    });
    forAdd.forEach((i) =< {
      if (!el.classList.contains(i)) {
        el.classList.add(i);
        added.push(i);
      }
    });
    return () =< {
      removed.forEach((i) =< el.classList.add(i));
      added.forEach((i) =< el.classList.remove(i));
    };
  }

  // packages/alpinejs/src/utils/styles.js
  function setStyles(el, value) {
    if (typeof value === &quot;object&quot; && value !== null) {
      return setStylesFromObject(el, value);
    }
    return setStylesFromString(el, value);
  }
  function setStylesFromObject(el, value) {
    let previousStyles = {};
    Object.entries(value).forEach(([key, value2]) =< {
      previousStyles[key] = el.style[key];
      if (!key.startsWith(&quot;--&quot;)) {
        key = kebabCase(key);
      }
      el.style.setProperty(key, value2);
    });
    setTimeout(() =< {
      if (el.style.length === 0) {
        el.removeAttribute(&quot;style&quot;);
      }
    });
    return () =< {
      setStyles(el, previousStyles);
    };
  }
  function setStylesFromString(el, value) {
    let cache = el.getAttribute(&quot;style&quot;, value);
    el.setAttribute(&quot;style&quot;, value);
    return () =< {
      el.setAttribute(&quot;style&quot;, cache || &quot;&quot;);
    };
  }
  function kebabCase(subject) {
    return subject.replace(/([a-z])([A-Z])/g, &quot;$1-$2&quot;).toLowerCase();
  }

  // packages/alpinejs/src/utils/once.js
  function once(callback, fallback = () =< {
  }) {
    let called = false;
    return function() {
      if (!called) {
        called = true;
        callback.apply(this, arguments);
      } else {
        fallback.apply(this, arguments);
      }
    };
  }

  // packages/alpinejs/src/directives/x-transition.js
  directive(&quot;transition&quot;, (el, { value, modifiers, expression }, { evaluate: evaluate2 }) =< {
    if (typeof expression === &quot;function&quot;)
      expression = evaluate2(expression);
    if (expression === false)
      return;
    if (!expression || typeof expression === &quot;boolean&quot;) {
      registerTransitionsFromHelper(el, modifiers, value);
    } else {
      registerTransitionsFromClassString(el, expression, value);
    }
  });
  function registerTransitionsFromClassString(el, classString, stage) {
    registerTransitionObject(el, setClasses, &quot;&quot;);
    let directiveStorageMap = {
      &quot;enter&quot;: (classes) =< {
        el._x_transition.enter.during = classes;
      },
      &quot;enter-start&quot;: (classes) =< {
        el._x_transition.enter.start = classes;
      },
      &quot;enter-end&quot;: (classes) =< {
        el._x_transition.enter.end = classes;
      },
      &quot;leave&quot;: (classes) =< {
        el._x_transition.leave.during = classes;
      },
      &quot;leave-start&quot;: (classes) =< {
        el._x_transition.leave.start = classes;
      },
      &quot;leave-end&quot;: (classes) =< {
        el._x_transition.leave.end = classes;
      }
    };
    directiveStorageMap[stage](classString);
  }
  function registerTransitionsFromHelper(el, modifiers, stage) {
    registerTransitionObject(el, setStyles);
    let doesntSpecify = !modifiers.includes(&quot;in&quot;) && !modifiers.includes(&quot;out&quot;) && !stage;
    let transitioningIn = doesntSpecify || modifiers.includes(&quot;in&quot;) || [&quot;enter&quot;].includes(stage);
    let transitioningOut = doesntSpecify || modifiers.includes(&quot;out&quot;) || [&quot;leave&quot;].includes(stage);
    if (modifiers.includes(&quot;in&quot;) && !doesntSpecify) {
      modifiers = modifiers.filter((i, index) =< index < modifiers.indexOf(&quot;out&quot;));
    }
    if (modifiers.includes(&quot;out&quot;) && !doesntSpecify) {
      modifiers = modifiers.filter((i, index) =< index < modifiers.indexOf(&quot;out&quot;));
    }
    let wantsAll = !modifiers.includes(&quot;opacity&quot;) && !modifiers.includes(&quot;scale&quot;);
    let wantsOpacity = wantsAll || modifiers.includes(&quot;opacity&quot;);
    let wantsScale = wantsAll || modifiers.includes(&quot;scale&quot;);
    let opacityValue = wantsOpacity ? 0 : 1;
    let scaleValue = wantsScale ? modifierValue(modifiers, &quot;scale&quot;, 95) / 100 : 1;
    let delay = modifierValue(modifiers, &quot;delay&quot;, 0) / 1e3;
    let origin = modifierValue(modifiers, &quot;origin&quot;, &quot;center&quot;);
    let property = &quot;opacity, transform&quot;;
    let durationIn = modifierValue(modifiers, &quot;duration&quot;, 150) / 1e3;
    let durationOut = modifierValue(modifiers, &quot;duration&quot;, 75) / 1e3;
    let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
    if (transitioningIn) {
      el._x_transition.enter.during = {
        transformOrigin: origin,
        transitionDelay: `${delay}s`,
        transitionProperty: property,
        transitionDuration: `${durationIn}s`,
        transitionTimingFunction: easing
      };
      el._x_transition.enter.start = {
        opacity: opacityValue,
        transform: `scale(${scaleValue})`
      };
      el._x_transition.enter.end = {
        opacity: 1,
        transform: `scale(1)`
      };
    }
    if (transitioningOut) {
      el._x_transition.leave.during = {
        transformOrigin: origin,
        transitionDelay: `${delay}s`,
        transitionProperty: property,
        transitionDuration: `${durationOut}s`,
        transitionTimingFunction: easing
      };
      el._x_transition.leave.start = {
        opacity: 1,
        transform: `scale(1)`
      };
      el._x_transition.leave.end = {
        opacity: opacityValue,
        transform: `scale(${scaleValue})`
      };
    }
  }
  function registerTransitionObject(el, setFunction, defaultValue = {}) {
    if (!el._x_transition)
      el._x_transition = {
        enter: { during: defaultValue, start: defaultValue, end: defaultValue },
        leave: { during: defaultValue, start: defaultValue, end: defaultValue },
        in(before = () =< {
        }, after = () =< {
        }) {
          transition(el, setFunction, {
            during: this.enter.during,
            start: this.enter.start,
            end: this.enter.end
          }, before, after);
        },
        out(before = () =< {
        }, after = () =< {
        }) {
          transition(el, setFunction, {
            during: this.leave.during,
            start: this.leave.start,
            end: this.leave.end
          }, before, after);
        }
      };
  }
  window.Element.prototype._x_toggleAndCascadeWithTransitions = function(el, value, show, hide) {
    const nextTick2 = document.visibilityState === &quot;visible&quot; ? requestAnimationFrame : setTimeout;
    let clickAwayCompatibleShow = () =< nextTick2(show);
    if (value) {
      if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
        el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
      } else {
        el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
      }
      return;
    }
    el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) =< {
      el._x_transition.out(() =< {
      }, () =< resolve(hide));
      el._x_transitioning && el._x_transitioning.beforeCancel(() =< reject({ isFromCancelledTransition: true }));
    }) : Promise.resolve(hide);
    queueMicrotask(() =< {
      let closest = closestHide(el);
      if (closest) {
        if (!closest._x_hideChildren)
          closest._x_hideChildren = [];
        closest._x_hideChildren.push(el);
      } else {
        nextTick2(() =< {
          let hideAfterChildren = (el2) =< {
            let carry = Promise.all([
              el2._x_hidePromise,
              ...(el2._x_hideChildren || []).map(hideAfterChildren)
            ]).then(([i]) =< i?.());
            delete el2._x_hidePromise;
            delete el2._x_hideChildren;
            return carry;
          };
          hideAfterChildren(el).catch((e) =< {
            if (!e.isFromCancelledTransition)
              throw e;
          });
        });
      }
    });
  };
  function closestHide(el) {
    let parent = el.parentNode;
    if (!parent)
      return;
    return parent._x_hidePromise ? parent : closestHide(parent);
  }
  function transition(el, setFunction, { during, start: start2, end } = {}, before = () =< {
  }, after = () =< {
  }) {
    if (el._x_transitioning)
      el._x_transitioning.cancel();
    if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
      before();
      after();
      return;
    }
    let undoStart, undoDuring, undoEnd;
    performTransition(el, {
      start() {
        undoStart = setFunction(el, start2);
      },
      during() {
        undoDuring = setFunction(el, during);
      },
      before,
      end() {
        undoStart();
        undoEnd = setFunction(el, end);
      },
      after,
      cleanup() {
        undoDuring();
        undoEnd();
      }
    });
  }
  function performTransition(el, stages) {
    let interrupted, reachedBefore, reachedEnd;
    let finish = once(() =< {
      mutateDom(() =< {
        interrupted = true;
        if (!reachedBefore)
          stages.before();
        if (!reachedEnd) {
          stages.end();
          releaseNextTicks();
        }
        stages.after();
        if (el.isConnected)
          stages.cleanup();
        delete el._x_transitioning;
      });
    });
    el._x_transitioning = {
      beforeCancels: [],
      beforeCancel(callback) {
        this.beforeCancels.push(callback);
      },
      cancel: once(function() {
        while (this.beforeCancels.length) {
          this.beforeCancels.shift()();
        }
        ;
        finish();
      }),
      finish
    };
    mutateDom(() =< {
      stages.start();
      stages.during();
    });
    holdNextTicks();
    requestAnimationFrame(() =< {
      if (interrupted)
        return;
      let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, &quot;&quot;).replace(&quot;s&quot;, &quot;&quot;)) * 1e3;
      let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, &quot;&quot;).replace(&quot;s&quot;, &quot;&quot;)) * 1e3;
      if (duration === 0)
        duration = Number(getComputedStyle(el).animationDuration.replace(&quot;s&quot;, &quot;&quot;)) * 1e3;
      mutateDom(() =< {
        stages.before();
      });
      reachedBefore = true;
      requestAnimationFrame(() =< {
        if (interrupted)
          return;
        mutateDom(() =< {
          stages.end();
        });
        releaseNextTicks();
        setTimeout(el._x_transitioning.finish, duration + delay);
        reachedEnd = true;
      });
    });
  }
  function modifierValue(modifiers, key, fallback) {
    if (modifiers.indexOf(key) === -1)
      return fallback;
    const rawValue = modifiers[modifiers.indexOf(key) + 1];
    if (!rawValue)
      return fallback;
    if (key === &quot;scale&quot;) {
      if (isNaN(rawValue))
        return fallback;
    }
    if (key === &quot;duration&quot; || key === &quot;delay&quot;) {
      let match = rawValue.match(/([0-9]+)ms/);
      if (match)
        return match[1];
    }
    if (key === &quot;origin&quot;) {
      if ([&quot;top&quot;, &quot;right&quot;, &quot;left&quot;, &quot;center&quot;, &quot;bottom&quot;].includes(modifiers[modifiers.indexOf(key) + 2])) {
        return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(&quot; &quot;);
      }
    }
    return rawValue;
  }

  // packages/alpinejs/src/clone.js
  var isCloning = false;
  function skipDuringClone(callback, fallback = () =< {
  }) {
    return (...args) =< isCloning ? fallback(...args) : callback(...args);
  }
  function onlyDuringClone(callback) {
    return (...args) =< isCloning && callback(...args);
  }
  var interceptors = [];
  function interceptClone(callback) {
    interceptors.push(callback);
  }
  function cloneNode(from, to) {
    interceptors.forEach((i) =< i(from, to));
    isCloning = true;
    dontRegisterReactiveSideEffects(() =< {
      initTree(to, (el, callback) =< {
        callback(el, () =< {
        });
      });
    });
    isCloning = false;
  }
  var isCloningLegacy = false;
  function clone(oldEl, newEl) {
    if (!newEl._x_dataStack)
      newEl._x_dataStack = oldEl._x_dataStack;
    isCloning = true;
    isCloningLegacy = true;
    dontRegisterReactiveSideEffects(() =< {
      cloneTree(newEl);
    });
    isCloning = false;
    isCloningLegacy = false;
  }
  function cloneTree(el) {
    let hasRunThroughFirstEl = false;
    let shallowWalker = (el2, callback) =< {
      walk(el2, (el3, skip) =< {
        if (hasRunThroughFirstEl && isRoot(el3))
          return skip();
        hasRunThroughFirstEl = true;
        callback(el3, skip);
      });
    };
    initTree(el, shallowWalker);
  }
  function dontRegisterReactiveSideEffects(callback) {
    let cache = effect;
    overrideEffect((callback2, el) =< {
      let storedEffect = cache(callback2);
      release(storedEffect);
      return () =< {
      };
    });
    callback();
    overrideEffect(cache);
  }

  // packages/alpinejs/src/utils/bind.js
  function bind(el, name, value, modifiers = []) {
    if (!el._x_bindings)
      el._x_bindings = reactive({});
    el._x_bindings[name] = value;
    name = modifiers.includes(&quot;camel&quot;) ? camelCase(name) : name;
    switch (name) {
      case &quot;value&quot;:
        bindInputValue(el, value);
        break;
      case &quot;style&quot;:
        bindStyles(el, value);
        break;
      case &quot;class&quot;:
        bindClasses(el, value);
        break;
      case &quot;selected&quot;:
      case &quot;checked&quot;:
        bindAttributeAndProperty(el, name, value);
        break;
      default:
        bindAttribute(el, name, value);
        break;
    }
  }
  function bindInputValue(el, value) {
    if (isRadio(el)) {
      if (el.attributes.value === void 0) {
        el.value = value;
      }
      if (window.fromModel) {
        if (typeof value === &quot;boolean&quot;) {
          el.checked = safeParseBoolean(el.value) === value;
        } else {
          el.checked = checkedAttrLooseCompare(el.value, value);
        }
      }
    } else if (isCheckbox(el)) {
      if (Number.isInteger(value)) {
        el.value = value;
      } else if (!Array.isArray(value) && typeof value !== &quot;boolean&quot; && ![null, void 0].includes(value)) {
        el.value = String(value);
      } else {
        if (Array.isArray(value)) {
          el.checked = value.some((val) =< checkedAttrLooseCompare(val, el.value));
        } else {
          el.checked = !!value;
        }
      }
    } else if (el.tagName === &quot;SELECT&quot;) {
      updateSelect(el, value);
    } else {
      if (el.value === value)
        return;
      el.value = value === void 0 ? &quot;&quot; : value;
    }
  }
  function bindClasses(el, value) {
    if (el._x_undoAddedClasses)
      el._x_undoAddedClasses();
    el._x_undoAddedClasses = setClasses(el, value);
  }
  function bindStyles(el, value) {
    if (el._x_undoAddedStyles)
      el._x_undoAddedStyles();
    el._x_undoAddedStyles = setStyles(el, value);
  }
  function bindAttributeAndProperty(el, name, value) {
    bindAttribute(el, name, value);
    setPropertyIfChanged(el, name, value);
  }
  function bindAttribute(el, name, value) {
    if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
      el.removeAttribute(name);
    } else {
      if (isBooleanAttr(name))
        value = name;
      setIfChanged(el, name, value);
    }
  }
  function setIfChanged(el, attrName, value) {
    if (el.getAttribute(attrName) != value) {
      el.setAttribute(attrName, value);
    }
  }
  function setPropertyIfChanged(el, propName, value) {
    if (el[propName] !== value) {
      el[propName] = value;
    }
  }
  function updateSelect(el, value) {
    const arrayWrappedValue = [].concat(value).map((value2) =< {
      return value2 + &quot;&quot;;
    });
    Array.from(el.options).forEach((option) =< {
      option.selected = arrayWrappedValue.includes(option.value);
    });
  }
  function camelCase(subject) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) =< char.toUpperCase());
  }
  function checkedAttrLooseCompare(valueA, valueB) {
    return valueA == valueB;
  }
  function safeParseBoolean(rawValue) {
    if ([1, &quot;1&quot;, &quot;true&quot;, &quot;on&quot;, &quot;yes&quot;, true].includes(rawValue)) {
      return true;
    }
    if ([0, &quot;0&quot;, &quot;false&quot;, &quot;off&quot;, &quot;no&quot;, false].includes(rawValue)) {
      return false;
    }
    return rawValue ? Boolean(rawValue) : null;
  }
  var booleanAttributes = /* @__PURE__ */ new Set([
    &quot;allowfullscreen&quot;,
    &quot;async&quot;,
    &quot;autofocus&quot;,
    &quot;autoplay&quot;,
    &quot;checked&quot;,
    &quot;controls&quot;,
    &quot;default&quot;,
    &quot;defer&quot;,
    &quot;disabled&quot;,
    &quot;formnovalidate&quot;,
    &quot;inert&quot;,
    &quot;ismap&quot;,
    &quot;itemscope&quot;,
    &quot;loop&quot;,
    &quot;multiple&quot;,
    &quot;muted&quot;,
    &quot;nomodule&quot;,
    &quot;novalidate&quot;,
    &quot;open&quot;,
    &quot;playsinline&quot;,
    &quot;readonly&quot;,
    &quot;required&quot;,
    &quot;reversed&quot;,
    &quot;selected&quot;,
    &quot;shadowrootclonable&quot;,
    &quot;shadowrootdelegatesfocus&quot;,
    &quot;shadowrootserializable&quot;
  ]);
  function isBooleanAttr(attrName) {
    return booleanAttributes.has(attrName);
  }
  function attributeShouldntBePreservedIfFalsy(name) {
    return ![&quot;aria-pressed&quot;, &quot;aria-checked&quot;, &quot;aria-expanded&quot;, &quot;aria-selected&quot;].includes(name);
  }
  function getBinding(el, name, fallback) {
    if (el._x_bindings && el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    return getAttributeBinding(el, name, fallback);
  }
  function extractProp(el, name, fallback, extract = true) {
    if (el._x_bindings && el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    if (el._x_inlineBindings && el._x_inlineBindings[name] !== void 0) {
      let binding = el._x_inlineBindings[name];
      binding.extract = extract;
      return dontAutoEvaluateFunctions(() =< {
        return evaluate(el, binding.expression);
      });
    }
    return getAttributeBinding(el, name, fallback);
  }
  function getAttributeBinding(el, name, fallback) {
    let attr = el.getAttribute(name);
    if (attr === null)
      return typeof fallback === &quot;function&quot; ? fallback() : fallback;
    if (attr === &quot;&quot;)
      return true;
    if (isBooleanAttr(name)) {
      return !![name, &quot;true&quot;].includes(attr);
    }
    return attr;
  }
  function isCheckbox(el) {
    return el.type === &quot;checkbox&quot; || el.localName === &quot;ui-checkbox&quot; || el.localName === &quot;ui-switch&quot;;
  }
  function isRadio(el) {
    return el.type === &quot;radio&quot; || el.localName === &quot;ui-radio&quot;;
  }

  // packages/alpinejs/src/utils/debounce.js
  function debounce(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // packages/alpinejs/src/utils/throttle.js
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      let context = this, args = arguments;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() =< inThrottle = false, limit);
      }
    };
  }

  // packages/alpinejs/src/entangle.js
  function entangle({ get: outerGet, set: outerSet }, { get: innerGet, set: innerSet }) {
    let firstRun = true;
    let outerHash;
    let innerHash;
    let reference = effect(() =< {
      let outer = outerGet();
      let inner = innerGet();
      if (firstRun) {
        innerSet(cloneIfObject(outer));
        firstRun = false;
      } else {
        let outerHashLatest = JSON.stringify(outer);
        let innerHashLatest = JSON.stringify(inner);
        if (outerHashLatest !== outerHash) {
          innerSet(cloneIfObject(outer));
        } else if (outerHashLatest !== innerHashLatest) {
          outerSet(cloneIfObject(inner));
        } else {
        }
      }
      outerHash = JSON.stringify(outerGet());
      innerHash = JSON.stringify(innerGet());
    });
    return () =< {
      release(reference);
    };
  }
  function cloneIfObject(value) {
    return typeof value === &quot;object&quot; ? JSON.parse(JSON.stringify(value)) : value;
  }

  // packages/alpinejs/src/plugin.js
  function plugin(callback) {
    let callbacks = Array.isArray(callback) ? callback : [callback];
    callbacks.forEach((i) =< i(alpine_default));
  }

  // packages/alpinejs/src/store.js
  var stores = {};
  var isReactive = false;
  function store(name, value) {
    if (!isReactive) {
      stores = reactive(stores);
      isReactive = true;
    }
    if (value === void 0) {
      return stores[name];
    }
    stores[name] = value;
    initInterceptors(stores[name]);
    if (typeof value === &quot;object&quot; && value !== null && value.hasOwnProperty(&quot;init&quot;) && typeof value.init === &quot;function&quot;) {
      stores[name].init();
    }
  }
  function getStores() {
    return stores;
  }

  // packages/alpinejs/src/binds.js
  var binds = {};
  function bind2(name, bindings) {
    let getBindings = typeof bindings !== &quot;function&quot; ? () =< bindings : bindings;
    if (name instanceof Element) {
      return applyBindingsObject(name, getBindings());
    } else {
      binds[name] = getBindings;
    }
    return () =< {
    };
  }
  function injectBindingProviders(obj) {
    Object.entries(binds).forEach(([name, callback]) =< {
      Object.defineProperty(obj, name, {
        get() {
          return (...args) =< {
            return callback(...args);
          };
        }
</div></div></div></main></body></html>
