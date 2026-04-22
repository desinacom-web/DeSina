(() => {
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
    return (receiver = () =&gt; {
    }, { scope: scope2 = {}, params = [] } = {}) =&gt; {
      func.result = void 0;
      func.finished = false;
      let completeScope = mergeProxies([scope2, ...dataStack]);
      if (typeof func === &quot;function&quot;) {
        let promise = func(func, completeScope).catch((error2) =&gt; handleError(error2, el, expression));
        if (func.finished) {
          runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
          func.result = void 0;
        } else {
          promise.then((result) =&gt; {
            runIfTypeOfFunction(receiver, result, completeScope, params, el);
          }).catch((error2) =&gt; handleError(error2, el, expression)).finally(() =&gt; func.result = void 0);
        }
      }
    };
  }
  function runIfTypeOfFunction(receiver, value, scope2, params, el) {
    if (shouldAutoEvaluateFunctions &amp;&amp; typeof value === &quot;function&quot;) {
      let result = value.apply(scope2, params);
      if (result instanceof Promise) {
        result.then((i) =&gt; runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) =&gt; handleError(error2, el, value));
      } else {
        receiver(result);
      }
    } else if (typeof value === &quot;object&quot; &amp;&amp; value instanceof Promise) {
      value.then((i) =&gt; receiver(i));
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
        directiveOrder.splice(pos &gt;= 0 ? pos : directiveOrder.indexOf(&quot;DEFAULT&quot;), 0, name);
      }
    };
  }
  function directiveExists(name) {
    return Object.keys(directiveHandlers).includes(name);
  }
  function directives(el, attributes, originalAttributeOverride) {
    attributes = Array.from(attributes);
    if (el._x_virtualDirectives) {
      let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) =&gt; ({ name, value }));
      let staticAttributes = attributesOnly(vAttributes);
      vAttributes = vAttributes.map((attribute) =&gt; {
        if (staticAttributes.find((attr) =&gt; attr.name === attribute.name)) {
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
    let directives2 = attributes.map(toTransformedAttributes((newName, oldName) =&gt; transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
    return directives2.map((directive2) =&gt; {
      return getDirectiveHandler(el, directive2);
    });
  }
  function attributesOnly(attributes) {
    return Array.from(attributes).map(toTransformedAttributes()).filter((attr) =&gt; !outNonAlpineAttributes(attr));
  }
  var isDeferringHandlers = false;
  var directiveHandlerStacks = /* @__PURE__ */ new Map();
  var currentHandlerStackKey = Symbol();
  function deferHandlingDirectives(callback) {
    isDeferringHandlers = true;
    let key = Symbol();
    currentHandlerStackKey = key;
    directiveHandlerStacks.set(key, []);
    let flushHandlers = () =&gt; {
      while (directiveHandlerStacks.get(key).length)
        directiveHandlerStacks.get(key).shift()();
      directiveHandlerStacks.delete(key);
    };
    let stopDeferring = () =&gt; {
      isDeferringHandlers = false;
      flushHandlers();
    };
    callback(flushHandlers);
    stopDeferring();
  }
  function getElementBoundUtilities(el) {
    let cleanups = [];
    let cleanup2 = (callback) =&gt; cleanups.push(callback);
    let [effect3, cleanupEffect] = elementBoundEffect(el);
    cleanups.push(cleanupEffect);
    let utilities = {
      Alpine: alpine_default,
      effect: effect3,
      cleanup: cleanup2,
      evaluateLater: evaluateLater.bind(evaluateLater, el),
      evaluate: evaluate.bind(evaluate, el)
    };
    let doCleanup = () =&gt; cleanups.forEach((i) =&gt; i());
    return [utilities, doCleanup];
  }
  function getDirectiveHandler(el, directive2) {
    let noop = () =&gt; {
    };
    let handler4 = directiveHandlers[directive2.type] || noop;
    let [utilities, cleanup2] = getElementBoundUtilities(el);
    onAttributeRemoved(el, directive2.original, cleanup2);
    let fullHandler = () =&gt; {
      if (el._x_ignore || el._x_ignoreSelf)
        return;
      handler4.inline &amp;&amp; handler4.inline(el, directive2, utilities);
      handler4 = handler4.bind(handler4, el, directive2, utilities);
      isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
    };
    fullHandler.runCleanups = cleanup2;
    return fullHandler;
  }
  var startingWith = (subject, replacement) =&gt; ({ name, value }) =&gt; {
    if (name.startsWith(subject))
      name = name.replace(subject, replacement);
    return { name, value };
  };
  var into = (i) =&gt; i;
  function toTransformedAttributes(callback = () =&gt; {
  }) {
    return ({ name, value }) =&gt; {
      let { name: newName, value: newValue } = attributeTransformers.reduce((carry, transform) =&gt; {
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
  var alpineAttributeRegex = () =&gt; new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
  function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
    return ({ name, value }) =&gt; {
      let typeMatch = name.match(alpineAttributeRegex());
      let valueMatch = name.match(/:([a-zA-Z0-9\-_:]+)/);
      let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
      let original = originalAttributeOverride || transformedAttributeMap[name] || name;
      return {
        type: typeMatch ? typeMatch[1] : null,
        value: valueMatch ? valueMatch[1] : null,
        modifiers: modifiers.map((i) =&gt; i.replace(&quot;.&quot;, &quot;&quot;)),
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
    if (typeof ShadowRoot === &quot;function&quot; &amp;&amp; el instanceof ShadowRoot) {
      Array.from(el.children).forEach((el2) =&gt; walk(el2, callback));
      return;
    }
    let skip = false;
    callback(el, () =&gt; skip = true);
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
      warn(&quot;Unable to initialize. Trying to load Alpine before `&lt;body&gt;` is available. Did you forget to add `defer` in Alpine&apos;s `&lt;script&gt;` tag?&quot;);
    dispatch(document, &quot;alpine:init&quot;);
    dispatch(document, &quot;alpine:initializing&quot;);
    startObservingMutations();
    onElAdded((el) =&gt; initTree(el, walk));
    onElRemoved((el) =&gt; destroyTree(el));
    onAttributesAdded((el, attrs) =&gt; {
      directives(el, attrs).forEach((handle) =&gt; handle());
    });
    let outNestedComponents = (el) =&gt; !closestRoot(el.parentElement, true);
    Array.from(document.querySelectorAll(allSelectors().join(&quot;,&quot;))).filter(outNestedComponents).forEach((el) =&gt; {
      initTree(el);
    });
    dispatch(document, &quot;alpine:initialized&quot;);
    setTimeout(() =&gt; {
      warnAboutMissingPlugins();
    });
  }
  var rootSelectorCallbacks = [];
  var initSelectorCallbacks = [];
  function rootSelectors() {
    return rootSelectorCallbacks.map((fn) =&gt; fn());
  }
  function allSelectors() {
    return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn) =&gt; fn());
  }
  function addRootSelector(selectorCallback) {
    rootSelectorCallbacks.push(selectorCallback);
  }
  function addInitSelector(selectorCallback) {
    initSelectorCallbacks.push(selectorCallback);
  }
  function closestRoot(el, includeInitSelectors = false) {
    return findClosest(el, (element) =&gt; {
      const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
      if (selectors.some((selector) =&gt; element.matches(selector)))
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
    return rootSelectors().some((selector) =&gt; el.matches(selector));
  }
  var initInterceptors2 = [];
  function interceptInit(callback) {
    initInterceptors2.push(callback);
  }
  function initTree(el, walker = walk, intercept = () =&gt; {
  }) {
    deferHandlingDirectives(() =&gt; {
      walker(el, (el2, skip) =&gt; {
        intercept(el2, skip);
        initInterceptors2.forEach((i) =&gt; i(el2, skip));
        directives(el2, el2.attributes).forEach((handle) =&gt; handle());
        el2._x_ignore &amp;&amp; skip();
      });
    });
  }
  function destroyTree(root, walker = walk) {
    walker(root, (el) =&gt; {
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
    pluginDirectives.forEach(([plugin2, directive2, selectors]) =&gt; {
      if (directiveExists(directive2))
        return;
      selectors.some((selector) =&gt; {
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
  function nextTick(callback = () =&gt; {
  }) {
    queueMicrotask(() =&gt; {
      isHolding || setTimeout(() =&gt; {
        releaseNextTicks();
      });
    });
    return new Promise((res) =&gt; {
      tickStack.push(() =&gt; {
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
    } else if (typeof value === &quot;object&quot; &amp;&amp; value !== null) {
      return setClassesFromObject(el, value);
    } else if (typeof value === &quot;function&quot;) {
      return setClasses(el, value());
    }
    return setClassesFromString(el, value);
  }
  function setClassesFromString(el, classString) {
    let split = (classString2) =&gt; classString2.split(&quot; &quot;).filter(Boolean);
    let missingClasses = (classString2) =&gt; classString2.split(&quot; &quot;).filter((i) =&gt; !el.classList.contains(i)).filter(Boolean);
    let addClassesAndReturnUndo = (classes) =&gt; {
      el.classList.add(...classes);
      return () =&gt; {
        el.classList.remove(...classes);
      };
    };
    classString = classString === true ? classString = &quot;&quot; : classString || &quot;&quot;;
    return addClassesAndReturnUndo(missingClasses(classString));
  }
  function setClassesFromObject(el, classObject) {
    let split = (classString) =&gt; classString.split(&quot; &quot;).filter(Boolean);
    let forAdd = Object.entries(classObject).flatMap(([classString, bool]) =&gt; bool ? split(classString) : false).filter(Boolean);
    let forRemove = Object.entries(classObject).flatMap(([classString, bool]) =&gt; !bool ? split(classString) : false).filter(Boolean);
    let added = [];
    let removed = [];
    forRemove.forEach((i) =&gt; {
      if (el.classList.contains(i)) {
        el.classList.remove(i);
        removed.push(i);
      }
    });
    forAdd.forEach((i) =&gt; {
      if (!el.classList.contains(i)) {
        el.classList.add(i);
        added.push(i);
      }
    });
    return () =&gt; {
      removed.forEach((i) =&gt; el.classList.add(i));
      added.forEach((i) =&gt; el.classList.remove(i));
    };
  }

  // packages/alpinejs/src/utils/styles.js
  function setStyles(el, value) {
    if (typeof value === &quot;object&quot; &amp;&amp; value !== null) {
      return setStylesFromObject(el, value);
    }
    return setStylesFromString(el, value);
  }
  function setStylesFromObject(el, value) {
    let previousStyles = {};
    Object.entries(value).forEach(([key, value2]) =&gt; {
      previousStyles[key] = el.style[key];
      if (!key.startsWith(&quot;--&quot;)) {
        key = kebabCase(key);
      }
      el.style.setProperty(key, value2);
    });
    setTimeout(() =&gt; {
      if (el.style.length === 0) {
        el.removeAttribute(&quot;style&quot;);
      }
    });
    return () =&gt; {
      setStyles(el, previousStyles);
    };
  }
  function setStylesFromString(el, value) {
    let cache = el.getAttribute(&quot;style&quot;, value);
    el.setAttribute(&quot;style&quot;, value);
    return () =&gt; {
      el.setAttribute(&quot;style&quot;, cache || &quot;&quot;);
    };
  }
  function kebabCase(subject) {
    return subject.replace(/([a-z])([A-Z])/g, &quot;$1-$2&quot;).toLowerCase();
  }

  // packages/alpinejs/src/utils/once.js
  function once(callback, fallback = () =&gt; {
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
  directive(&quot;transition&quot;, (el, { value, modifiers, expression }, { evaluate: evaluate2 }) =&gt; {
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
      &quot;enter&quot;: (classes) =&gt; {
        el._x_transition.enter.during = classes;
      },
      &quot;enter-start&quot;: (classes) =&gt; {
        el._x_transition.enter.start = classes;
      },
      &quot;enter-end&quot;: (classes) =&gt; {
        el._x_transition.enter.end = classes;
      },
      &quot;leave&quot;: (classes) =&gt; {
        el._x_transition.leave.during = classes;
      },
      &quot;leave-start&quot;: (classes) =&gt; {
        el._x_transition.leave.start = classes;
      },
      &quot;leave-end&quot;: (classes) =&gt; {
        el._x_transition.leave.end = classes;
      }
    };
    directiveStorageMap[stage](classString);
  }
  function registerTransitionsFromHelper(el, modifiers, stage) {
    registerTransitionObject(el, setStyles);
    let doesntSpecify = !modifiers.includes(&quot;in&quot;) &amp;&amp; !modifiers.includes(&quot;out&quot;) &amp;&amp; !stage;
    let transitioningIn = doesntSpecify || modifiers.includes(&quot;in&quot;) || [&quot;enter&quot;].includes(stage);
    let transitioningOut = doesntSpecify || modifiers.includes(&quot;out&quot;) || [&quot;leave&quot;].includes(stage);
    if (modifiers.includes(&quot;in&quot;) &amp;&amp; !doesntSpecify) {
      modifiers = modifiers.filter((i, index) =&gt; index &lt; modifiers.indexOf(&quot;out&quot;));
    }
    if (modifiers.includes(&quot;out&quot;) &amp;&amp; !doesntSpecify) {
      modifiers = modifiers.filter((i, index) =&gt; index &gt; modifiers.indexOf(&quot;out&quot;));
    }
    let wantsAll = !modifiers.includes(&quot;opacity&quot;) &amp;&amp; !modifiers.includes(&quot;scale&quot;);
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
        in(before = () =&gt; {
        }, after = () =&gt; {
        }) {
          transition(el, setFunction, {
            during: this.enter.during,
            start: this.enter.start,
            end: this.enter.end
          }, before, after);
        },
        out(before = () =&gt; {
        }, after = () =&gt; {
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
    let clickAwayCompatibleShow = () =&gt; nextTick2(show);
    if (value) {
      if (el._x_transition &amp;&amp; (el._x_transition.enter || el._x_transition.leave)) {
        el._x_transition.enter &amp;&amp; (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
      } else {
        el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
      }
      return;
    }
    el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) =&gt; {
      el._x_transition.out(() =&gt; {
      }, () =&gt; resolve(hide));
      el._x_transitioning &amp;&amp; el._x_transitioning.beforeCancel(() =&gt; reject({ isFromCancelledTransition: true }));
    }) : Promise.resolve(hide);
    queueMicrotask(() =&gt; {
      let closest = closestHide(el);
      if (closest) {
        if (!closest._x_hideChildren)
          closest._x_hideChildren = [];
        closest._x_hideChildren.push(el);
      } else {
        nextTick2(() =&gt; {
          let hideAfterChildren = (el2) =&gt; {
            let carry = Promise.all([
              el2._x_hidePromise,
              ...(el2._x_hideChildren || []).map(hideAfterChildren)
            ]).then(([i]) =&gt; i?.());
            delete el2._x_hidePromise;
            delete el2._x_hideChildren;
            return carry;
          };
          hideAfterChildren(el).catch((e) =&gt; {
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
  function transition(el, setFunction, { during, start: start2, end } = {}, before = () =&gt; {
  }, after = () =&gt; {
  }) {
    if (el._x_transitioning)
      el._x_transitioning.cancel();
    if (Object.keys(during).length === 0 &amp;&amp; Object.keys(start2).length === 0 &amp;&amp; Object.keys(end).length === 0) {
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
    let finish = once(() =&gt; {
      mutateDom(() =&gt; {
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
    mutateDom(() =&gt; {
      stages.start();
      stages.during();
    });
    holdNextTicks();
    requestAnimationFrame(() =&gt; {
      if (interrupted)
        return;
      let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, &quot;&quot;).replace(&quot;s&quot;, &quot;&quot;)) * 1e3;
      let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, &quot;&quot;).replace(&quot;s&quot;, &quot;&quot;)) * 1e3;
      if (duration === 0)
        duration = Number(getComputedStyle(el).animationDuration.replace(&quot;s&quot;, &quot;&quot;)) * 1e3;
      mutateDom(() =&gt; {
        stages.before();
      });
      reachedBefore = true;
      requestAnimationFrame(() =&gt; {
        if (interrupted)
          return;
        mutateDom(() =&gt; {
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
  function skipDuringClone(callback, fallback = () =&gt; {
  }) {
    return (...args) =&gt; isCloning ? fallback(...args) : callback(...args);
  }
  function onlyDuringClone(callback) {
    return (...args) =&gt; isCloning &amp;&amp; callback(...args);
  }
  var interceptors = [];
  function interceptClone(callback) {
    interceptors.push(callback);
  }
  function cloneNode(from, to) {
    interceptors.forEach((i) =&gt; i(from, to));
    isCloning = true;
    dontRegisterReactiveSideEffects(() =&gt; {
      initTree(to, (el, callback) =&gt; {
        callback(el, () =&gt; {
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
    dontRegisterReactiveSideEffects(() =&gt; {
      cloneTree(newEl);
    });
    isCloning = false;
    isCloningLegacy = false;
  }
  function cloneTree(el) {
    let hasRunThroughFirstEl = false;
    let shallowWalker = (el2, callback) =&gt; {
      walk(el2, (el3, skip) =&gt; {
        if (hasRunThroughFirstEl &amp;&amp; isRoot(el3))
          return skip();
        hasRunThroughFirstEl = true;
        callback(el3, skip);
      });
    };
    initTree(el, shallowWalker);
  }
  function dontRegisterReactiveSideEffects(callback) {
    let cache = effect;
    overrideEffect((callback2, el) =&gt; {
      let storedEffect = cache(callback2);
      release(storedEffect);
      return () =&gt; {
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
      } else if (!Array.isArray(value) &amp;&amp; typeof value !== &quot;boolean&quot; &amp;&amp; ![null, void 0].includes(value)) {
        el.value = String(value);
      } else {
        if (Array.isArray(value)) {
          el.checked = value.some((val) =&gt; checkedAttrLooseCompare(val, el.value));
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
    if ([null, void 0, false].includes(value) &amp;&amp; attributeShouldntBePreservedIfFalsy(name)) {
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
    const arrayWrappedValue = [].concat(value).map((value2) =&gt; {
      return value2 + &quot;&quot;;
    });
    Array.from(el.options).forEach((option) =&gt; {
      option.selected = arrayWrappedValue.includes(option.value);
    });
  }
  function camelCase(subject) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) =&gt; char.toUpperCase());
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
    if (el._x_bindings &amp;&amp; el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    return getAttributeBinding(el, name, fallback);
  }
  function extractProp(el, name, fallback, extract = true) {
    if (el._x_bindings &amp;&amp; el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    if (el._x_inlineBindings &amp;&amp; el._x_inlineBindings[name] !== void 0) {
      let binding = el._x_inlineBindings[name];
      binding.extract = extract;
      return dontAutoEvaluateFunctions(() =&gt; {
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
        setTimeout(() =&gt; inThrottle = false, limit);
      }
    };
  }

  // packages/alpinejs/src/entangle.js
  function entangle({ get: outerGet, set: outerSet }, { get: innerGet, set: innerSet }) {
    let firstRun = true;
    let outerHash;
    let innerHash;
    let reference = effect(() =&gt; {
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
    return () =&gt; {
      release(reference);
    };
  }
  function cloneIfObject(value) {
    return typeof value === &quot;object&quot; ? JSON.parse(JSON.stringify(value)) : value;
  }

  // packages/alpinejs/src/plugin.js
  function plugin(callback) {
    let callbacks = Array.isArray(callback) ? callback : [callback];
    callbacks.forEach((i) =&gt; i(alpine_default));
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
    if (typeof value === &quot;object&quot; &amp;&amp; value !== null &amp;&amp; value.hasOwnProperty(&quot;init&quot;) &amp;&amp; typeof value.init === &quot;function&quot;) {
      stores[name].init();
    }
  }
  function getStores() {
    return stores;
  }

  // packages/alpinejs/src/binds.js
  var binds = {};
  function bind2(name, bindings) {
    let getBindings = typeof bindings !== &quot;function&quot; ? () =&gt; bindings : bindings;
    if (name instanceof Element) {
      return applyBindingsObject(name, getBindings());
    } else {
      binds[name] = getBindings;
    }
    return () =&gt; {
    };
  }
  function injectBindingProviders(obj) {
    Object.entries(binds).forEach(([name, callback]) =&gt; {
      Object.defineProperty(obj, name, {
        get() {
          return (...args) =&gt; {
            return callback(...args);
          };
        }
</div></div></div></main></body></html>
