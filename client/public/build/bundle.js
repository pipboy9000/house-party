
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.18.2 */

    const { Error: Error_1, Object: Object_1 } = globals;

    function create_fragment(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*componentParams*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(getLocation(), // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location$1 = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	setTimeout(
    		() => {
    			window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    		},
    		0
    	);
    }

    function pop() {
    	// Execute this code when the current call stack is complete
    	setTimeout(
    		() => {
    			window.history.back();
    		},
    		0
    	);
    }

    function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	setTimeout(
    		() => {
    			const dest = (location.charAt(0) == "#" ? "" : "#") + location;
    			history.replaceState(undefined, undefined, dest);

    			// The method above doesn't trigger the hashchange event, so let's do that manually
    			window.dispatchEvent(new Event("hashchange"));
    		},
    		0
    	);
    }

    function instance($$self, $$props, $$invalidate) {
    	let $loc,
    		$$unsubscribe_loc = noop;

    	validate_store(loc, "loc");
    	component_subscribe($$self, loc, $$value => $$invalidate(4, $loc = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent} component - Svelte component for the route
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.route;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    			} else {
    				this.component = component;
    				this.conditions = [];
    				this.userData = undefined;
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix && path.startsWith(prefix)) {
    				path = path.substr(prefix.length) || "/";
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				out[this._keys[i]] = matches[++i] || null;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {SvelteComponent} component - Svelte component
     * @property {string} name - Name of the Svelte component
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// We need an iterable: if it's not a Map, use Object.entries
    	const routesIterable = routes instanceof Map ? routes : Object.entries(routes);

    	// Set up all routes
    	const routesList = [];

    	for (const [path, route] of routesIterable) {
    		routesList.push(new RouteItem(path, route));
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	const dispatchNextTick = (name, detail) => {
    		// Execute this code when the current call stack is complete
    		setTimeout(
    			() => {
    				dispatch(name, detail);
    			},
    			0
    		);
    	};

    	const writable_props = ["routes", "prefix"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    	};

    	$$self.$capture_state = () => {
    		return {
    			routes,
    			prefix,
    			component,
    			componentParams,
    			$loc
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("$loc" in $$props) loc.set($loc = $$props.$loc);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*component, $loc*/ 17) {
    			// Handle hash change events
    			// Listen to changes in the $loc store and update the page
    			 {
    				// Find a route matching the location
    				$$invalidate(0, component = null);

    				let i = 0;

    				while (!component && i < routesList.length) {
    					const match = routesList[i].match($loc.location);

    					if (match) {
    						const detail = {
    							component: routesList[i].component,
    							name: routesList[i].component.name,
    							location: $loc.location,
    							querystring: $loc.querystring,
    							userData: routesList[i].userData
    						};

    						// Check if the route can be loaded - if all conditions succeed
    						if (!routesList[i].checkConditions(detail)) {
    							// Trigger an event to notify the user
    							dispatchNextTick("conditionsFailed", detail);

    							break;
    						}

    						$$invalidate(0, component = routesList[i].component);
    						$$invalidate(1, componentParams = match);
    						dispatchNextTick("routeLoaded", detail);
    					}

    					i++;
    				}
    			}
    		}
    	};

    	return [component, componentParams, routes, prefix];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { routes: 2, prefix: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    function getCjsExportFromNamespace (n) {
    	return n && n['default'] || n;
    }

    var fingerprint2 = createCommonjsModule(function (module) {
    /*
    * Fingerprintjs2 2.1.0 - Modern & flexible browser fingerprint library v2
    * https://github.com/Valve/fingerprintjs2
    * Copyright (c) 2015 Valentin Vasilyev (valentin.vasilyev@outlook.com)
    * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
    *
    * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    * ARE DISCLAIMED. IN NO EVENT SHALL VALENTIN VASILYEV BE LIABLE FOR ANY
    * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
    * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */
    /* global define */
    (function (name, context, definition) {
      if (typeof window !== 'undefined' && typeof undefined === 'function' && undefined.amd) { undefined(definition); } else if ( module.exports) { module.exports = definition(); } else if (context.exports) { context.exports = definition(); } else { context[name] = definition(); }
    })('Fingerprint2', commonjsGlobal, function () {

      /// MurmurHash3 related functions

      //
      // Given two 64bit ints (as an array of two 32bit ints) returns the two
      // added together as a 64bit int (as an array of two 32bit ints).
      //
      var x64Add = function (m, n) {
        m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
        n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
        var o = [0, 0, 0, 0];
        o[3] += m[3] + n[3];
        o[2] += o[3] >>> 16;
        o[3] &= 0xffff;
        o[2] += m[2] + n[2];
        o[1] += o[2] >>> 16;
        o[2] &= 0xffff;
        o[1] += m[1] + n[1];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;
        o[0] += m[0] + n[0];
        o[0] &= 0xffff;
        return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
      };

      //
      // Given two 64bit ints (as an array of two 32bit ints) returns the two
      // multiplied together as a 64bit int (as an array of two 32bit ints).
      //
      var x64Multiply = function (m, n) {
        m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
        n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
        var o = [0, 0, 0, 0];
        o[3] += m[3] * n[3];
        o[2] += o[3] >>> 16;
        o[3] &= 0xffff;
        o[2] += m[2] * n[3];
        o[1] += o[2] >>> 16;
        o[2] &= 0xffff;
        o[2] += m[3] * n[2];
        o[1] += o[2] >>> 16;
        o[2] &= 0xffff;
        o[1] += m[1] * n[3];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;
        o[1] += m[2] * n[2];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;
        o[1] += m[3] * n[1];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;
        o[0] += (m[0] * n[3]) + (m[1] * n[2]) + (m[2] * n[1]) + (m[3] * n[0]);
        o[0] &= 0xffff;
        return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
      };
      //
      // Given a 64bit int (as an array of two 32bit ints) and an int
      // representing a number of bit positions, returns the 64bit int (as an
      // array of two 32bit ints) rotated left by that number of positions.
      //
      var x64Rotl = function (m, n) {
        n %= 64;
        if (n === 32) {
          return [m[1], m[0]]
        } else if (n < 32) {
          return [(m[0] << n) | (m[1] >>> (32 - n)), (m[1] << n) | (m[0] >>> (32 - n))]
        } else {
          n -= 32;
          return [(m[1] << n) | (m[0] >>> (32 - n)), (m[0] << n) | (m[1] >>> (32 - n))]
        }
      };
      //
      // Given a 64bit int (as an array of two 32bit ints) and an int
      // representing a number of bit positions, returns the 64bit int (as an
      // array of two 32bit ints) shifted left by that number of positions.
      //
      var x64LeftShift = function (m, n) {
        n %= 64;
        if (n === 0) {
          return m
        } else if (n < 32) {
          return [(m[0] << n) | (m[1] >>> (32 - n)), m[1] << n]
        } else {
          return [m[1] << (n - 32), 0]
        }
      };
      //
      // Given two 64bit ints (as an array of two 32bit ints) returns the two
      // xored together as a 64bit int (as an array of two 32bit ints).
      //
      var x64Xor = function (m, n) {
        return [m[0] ^ n[0], m[1] ^ n[1]]
      };
      //
      // Given a block, returns murmurHash3's final x64 mix of that block.
      // (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
      // only place where we need to right shift 64bit ints.)
      //
      var x64Fmix = function (h) {
        h = x64Xor(h, [0, h[0] >>> 1]);
        h = x64Multiply(h, [0xff51afd7, 0xed558ccd]);
        h = x64Xor(h, [0, h[0] >>> 1]);
        h = x64Multiply(h, [0xc4ceb9fe, 0x1a85ec53]);
        h = x64Xor(h, [0, h[0] >>> 1]);
        return h
      };

      //
      // Given a string and an optional seed as an int, returns a 128 bit
      // hash using the x64 flavor of MurmurHash3, as an unsigned hex.
      //
      var x64hash128 = function (key, seed) {
        key = key || '';
        seed = seed || 0;
        var remainder = key.length % 16;
        var bytes = key.length - remainder;
        var h1 = [0, seed];
        var h2 = [0, seed];
        var k1 = [0, 0];
        var k2 = [0, 0];
        var c1 = [0x87c37b91, 0x114253d5];
        var c2 = [0x4cf5ad43, 0x2745937f];
        for (var i = 0; i < bytes; i = i + 16) {
          k1 = [((key.charCodeAt(i + 4) & 0xff)) | ((key.charCodeAt(i + 5) & 0xff) << 8) | ((key.charCodeAt(i + 6) & 0xff) << 16) | ((key.charCodeAt(i + 7) & 0xff) << 24), ((key.charCodeAt(i) & 0xff)) | ((key.charCodeAt(i + 1) & 0xff) << 8) | ((key.charCodeAt(i + 2) & 0xff) << 16) | ((key.charCodeAt(i + 3) & 0xff) << 24)];
          k2 = [((key.charCodeAt(i + 12) & 0xff)) | ((key.charCodeAt(i + 13) & 0xff) << 8) | ((key.charCodeAt(i + 14) & 0xff) << 16) | ((key.charCodeAt(i + 15) & 0xff) << 24), ((key.charCodeAt(i + 8) & 0xff)) | ((key.charCodeAt(i + 9) & 0xff) << 8) | ((key.charCodeAt(i + 10) & 0xff) << 16) | ((key.charCodeAt(i + 11) & 0xff) << 24)];
          k1 = x64Multiply(k1, c1);
          k1 = x64Rotl(k1, 31);
          k1 = x64Multiply(k1, c2);
          h1 = x64Xor(h1, k1);
          h1 = x64Rotl(h1, 27);
          h1 = x64Add(h1, h2);
          h1 = x64Add(x64Multiply(h1, [0, 5]), [0, 0x52dce729]);
          k2 = x64Multiply(k2, c2);
          k2 = x64Rotl(k2, 33);
          k2 = x64Multiply(k2, c1);
          h2 = x64Xor(h2, k2);
          h2 = x64Rotl(h2, 31);
          h2 = x64Add(h2, h1);
          h2 = x64Add(x64Multiply(h2, [0, 5]), [0, 0x38495ab5]);
        }
        k1 = [0, 0];
        k2 = [0, 0];
        switch (remainder) {
          case 15:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 14)], 48));
          // fallthrough
          case 14:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 13)], 40));
          // fallthrough
          case 13:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 12)], 32));
          // fallthrough
          case 12:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 11)], 24));
          // fallthrough
          case 11:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 10)], 16));
          // fallthrough
          case 10:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 9)], 8));
          // fallthrough
          case 9:
            k2 = x64Xor(k2, [0, key.charCodeAt(i + 8)]);
            k2 = x64Multiply(k2, c2);
            k2 = x64Rotl(k2, 33);
            k2 = x64Multiply(k2, c1);
            h2 = x64Xor(h2, k2);
          // fallthrough
          case 8:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 7)], 56));
          // fallthrough
          case 7:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 6)], 48));
          // fallthrough
          case 6:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 5)], 40));
          // fallthrough
          case 5:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 4)], 32));
          // fallthrough
          case 4:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 3)], 24));
          // fallthrough
          case 3:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 2)], 16));
          // fallthrough
          case 2:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 1)], 8));
          // fallthrough
          case 1:
            k1 = x64Xor(k1, [0, key.charCodeAt(i)]);
            k1 = x64Multiply(k1, c1);
            k1 = x64Rotl(k1, 31);
            k1 = x64Multiply(k1, c2);
            h1 = x64Xor(h1, k1);
          // fallthrough
        }
        h1 = x64Xor(h1, [0, key.length]);
        h2 = x64Xor(h2, [0, key.length]);
        h1 = x64Add(h1, h2);
        h2 = x64Add(h2, h1);
        h1 = x64Fmix(h1);
        h2 = x64Fmix(h2);
        h1 = x64Add(h1, h2);
        h2 = x64Add(h2, h1);
        return ('00000000' + (h1[0] >>> 0).toString(16)).slice(-8) + ('00000000' + (h1[1] >>> 0).toString(16)).slice(-8) + ('00000000' + (h2[0] >>> 0).toString(16)).slice(-8) + ('00000000' + (h2[1] >>> 0).toString(16)).slice(-8)
      };

      var defaultOptions = {
        preprocessor: null,
        audio: {
          timeout: 1000,
          // On iOS 11, audio context can only be used in response to user interaction.
          // We require users to explicitly enable audio fingerprinting on iOS 11.
          // See https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
          excludeIOS11: true
        },
        fonts: {
          swfContainerId: 'fingerprintjs2',
          swfPath: 'flash/compiled/FontList.swf',
          userDefinedFonts: [],
          extendedJsFonts: false
        },
        screen: {
          // To ensure consistent fingerprints when users rotate their mobile devices
          detectScreenOrientation: true
        },
        plugins: {
          sortPluginsFor: [/palemoon/i],
          excludeIE: false
        },
        extraComponents: [],
        excludes: {
          // Unreliable on Windows, see https://github.com/Valve/fingerprintjs2/issues/375
          'enumerateDevices': true,
          // devicePixelRatio depends on browser zoom, and it's impossible to detect browser zoom
          'pixelRatio': true,
          // DNT depends on incognito mode for some browsers (Chrome) and it's impossible to detect incognito mode
          'doNotTrack': true,
          // uses js fonts already
          'fontsFlash': true
        },
        NOT_AVAILABLE: 'not available',
        ERROR: 'error',
        EXCLUDED: 'excluded'
      };

      var each = function (obj, iterator) {
        if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
          obj.forEach(iterator);
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            iterator(obj[i], i, obj);
          }
        } else {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              iterator(obj[key], key, obj);
            }
          }
        }
      };

      var map = function (obj, iterator) {
        var results = [];
        // Not using strict equality so that this acts as a
        // shortcut to checking for `null` and `undefined`.
        if (obj == null) {
          return results
        }
        if (Array.prototype.map && obj.map === Array.prototype.map) { return obj.map(iterator) }
        each(obj, function (value, index, list) {
          results.push(iterator(value, index, list));
        });
        return results
      };

      var extendSoft = function (target, source) {
        if (source == null) { return target }
        var value;
        var key;
        for (key in source) {
          value = source[key];
          if (value != null && !(Object.prototype.hasOwnProperty.call(target, key))) {
            target[key] = value;
          }
        }
        return target
      };

      // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
      var enumerateDevicesKey = function (done, options) {
        if (!isEnumerateDevicesSupported()) {
          return done(options.NOT_AVAILABLE)
        }
        navigator.mediaDevices.enumerateDevices().then(function (devices) {
          done(devices.map(function (device) {
            return 'id=' + device.deviceId + ';gid=' + device.groupId + ';' + device.kind + ';' + device.label
          }));
        })
          .catch(function (error) {
            done(error);
          });
      };

      var isEnumerateDevicesSupported = function () {
        return (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
      };
      // Inspired by and based on https://github.com/cozylife/audio-fingerprint
      var audioKey = function (done, options) {
        var audioOptions = options.audio;
        if (audioOptions.excludeIOS11 && navigator.userAgent.match(/OS 11.+Version\/11.+Safari/)) {
          // See comment for excludeUserAgent and https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
          return done(options.EXCLUDED)
        }

        var AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

        if (AudioContext == null) {
          return done(options.NOT_AVAILABLE)
        }

        var context = new AudioContext(1, 44100, 44100);

        var oscillator = context.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(10000, context.currentTime);

        var compressor = context.createDynamicsCompressor();
        each([
          ['threshold', -50],
          ['knee', 40],
          ['ratio', 12],
          ['reduction', -20],
          ['attack', 0],
          ['release', 0.25]
        ], function (item) {
          if (compressor[item[0]] !== undefined && typeof compressor[item[0]].setValueAtTime === 'function') {
            compressor[item[0]].setValueAtTime(item[1], context.currentTime);
          }
        });

        oscillator.connect(compressor);
        compressor.connect(context.destination);
        oscillator.start(0);
        context.startRendering();

        var audioTimeoutId = setTimeout(function () {
          console.warn('Audio fingerprint timed out. Please report bug at https://github.com/Valve/fingerprintjs2 with your user agent: "' + navigator.userAgent + '".');
          context.oncomplete = function () { };
          context = null;
          return done('audioTimeout')
        }, audioOptions.timeout);

        context.oncomplete = function (event) {
          var fingerprint;
          try {
            clearTimeout(audioTimeoutId);
            fingerprint = event.renderedBuffer.getChannelData(0)
              .slice(4500, 5000)
              .reduce(function (acc, val) { return acc + Math.abs(val) }, 0)
              .toString();
            oscillator.disconnect();
            compressor.disconnect();
          } catch (error) {
            done(error);
            return
          }
          done(fingerprint);
        };
      };
      var UserAgent = function (done) {
        done(navigator.userAgent);
      };
      var webdriver = function (done, options) {
        done(navigator.webdriver == null ? options.NOT_AVAILABLE : navigator.webdriver);
      };
      var languageKey = function (done, options) {
        done(navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || options.NOT_AVAILABLE);
      };
      var colorDepthKey = function (done, options) {
        done(window.screen.colorDepth || options.NOT_AVAILABLE);
      };
      var deviceMemoryKey = function (done, options) {
        done(navigator.deviceMemory || options.NOT_AVAILABLE);
      };
      var pixelRatioKey = function (done, options) {
        done(window.devicePixelRatio || options.NOT_AVAILABLE);
      };
      var screenResolutionKey = function (done, options) {
        done(getScreenResolution(options));
      };
      var getScreenResolution = function (options) {
        var resolution = [window.screen.width, window.screen.height];
        if (options.screen.detectScreenOrientation) {
          resolution.sort().reverse();
        }
        return resolution
      };
      var availableScreenResolutionKey = function (done, options) {
        done(getAvailableScreenResolution(options));
      };
      var getAvailableScreenResolution = function (options) {
        if (window.screen.availWidth && window.screen.availHeight) {
          var available = [window.screen.availHeight, window.screen.availWidth];
          if (options.screen.detectScreenOrientation) {
            available.sort().reverse();
          }
          return available
        }
        // headless browsers
        return options.NOT_AVAILABLE
      };
      var timezoneOffset = function (done) {
        done(new Date().getTimezoneOffset());
      };
      var timezone = function (done, options) {
        if (window.Intl && window.Intl.DateTimeFormat) {
          done(new window.Intl.DateTimeFormat().resolvedOptions().timeZone);
          return
        }
        done(options.NOT_AVAILABLE);
      };
      var sessionStorageKey = function (done, options) {
        done(hasSessionStorage(options));
      };
      var localStorageKey = function (done, options) {
        done(hasLocalStorage(options));
      };
      var indexedDbKey = function (done, options) {
        done(hasIndexedDB(options));
      };
      var addBehaviorKey = function (done) {
        // body might not be defined at this point or removed programmatically
        done(!!(document.body && document.body.addBehavior));
      };
      var openDatabaseKey = function (done) {
        done(!!window.openDatabase);
      };
      var cpuClassKey = function (done, options) {
        done(getNavigatorCpuClass(options));
      };
      var platformKey = function (done, options) {
        done(getNavigatorPlatform(options));
      };
      var doNotTrackKey = function (done, options) {
        done(getDoNotTrack(options));
      };
      var canvasKey = function (done, options) {
        if (isCanvasSupported()) {
          done(getCanvasFp(options));
          return
        }
        done(options.NOT_AVAILABLE);
      };
      var webglKey = function (done, options) {
        if (isWebGlSupported()) {
          done(getWebglFp());
          return
        }
        done(options.NOT_AVAILABLE);
      };
      var webglVendorAndRendererKey = function (done) {
        if (isWebGlSupported()) {
          done(getWebglVendorAndRenderer());
          return
        }
        done();
      };
      var adBlockKey = function (done) {
        done(getAdBlock());
      };
      var hasLiedLanguagesKey = function (done) {
        done(getHasLiedLanguages());
      };
      var hasLiedResolutionKey = function (done) {
        done(getHasLiedResolution());
      };
      var hasLiedOsKey = function (done) {
        done(getHasLiedOs());
      };
      var hasLiedBrowserKey = function (done) {
        done(getHasLiedBrowser());
      };
      // flash fonts (will increase fingerprinting time 20X to ~ 130-150ms)
      var flashFontsKey = function (done, options) {
        // we do flash if swfobject is loaded
        if (!hasSwfObjectLoaded()) {
          return done('swf object not loaded')
        }
        if (!hasMinFlashInstalled()) {
          return done('flash not installed')
        }
        if (!options.fonts.swfPath) {
          return done('missing options.fonts.swfPath')
        }
        loadSwfAndDetectFonts(function (fonts) {
          done(fonts);
        }, options);
      };
      // kudos to http://www.lalit.org/lab/javascript-css-font-detect/
      var jsFontsKey = function (done, options) {
        // a font will be compared against all the three default fonts.
        // and if it doesn't match all 3 then that font is not available.
        var baseFonts = ['monospace', 'sans-serif', 'serif'];

        var fontList = [
          'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS',
          'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style',
          'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
          'Geneva', 'Georgia',
          'Helvetica', 'Helvetica Neue',
          'Impact',
          'Lucida Bright', 'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Lucida Sans Unicode',
          'Microsoft Sans Serif', 'Monaco', 'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'MYRIAD', 'MYRIAD PRO',
          'Palatino', 'Palatino Linotype',
          'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol',
          'Tahoma', 'Times', 'Times New Roman', 'Times New Roman PS', 'Trebuchet MS',
          'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3'
        ];

        if (options.fonts.extendedJsFonts) {
          var extendedFontList = [
            'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni', 'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter',
            'American Typewriter Condensed', 'AmerType Md BT', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Aparajita', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arabic Typesetting', 'ARCHER',
            'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT', 'AvantGarde Md BT', 'AVENIR', 'Ayuthaya', 'Bandy', 'Bangla Sangam MN', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville',
            'Baskerville Old Face', 'Batang', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93', 'Bazooka', 'Bell MT', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT', 'BernhardMod BT', 'Big Caslon', 'BinnerD',
            'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed',
            'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand', 'Bradley Hand ITC', 'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Brush Script MT', 'Californian FB', 'Calisto MT', 'Calligrapher', 'Candara',
            'CaslonOpnface BT', 'Castellar', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer',
            'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cochin', 'Colonna MT', 'Constantia', 'Cooper Black', 'Copperplate', 'Copperplate Gothic', 'Copperplate Gothic Bold',
            'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Corbel', 'Cordia New', 'CordiaUPC', 'Cornerstone', 'Coronet', 'Cuckoo', 'Curlz MT', 'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark',
            'DFKai-SB', 'Didot', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum', 'DotumChe', 'Ebrima', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC', 'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC',
            'EucrosiaUPC', 'Euphemia', 'Euphemia UCAS', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong', 'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'Forte',
            'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER',
            'Futura', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT', 'Futura ZBlk BT', 'FuturaBlack BT', 'Gabriola', 'Galliard BT', 'Gautami', 'Geeza Pro', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT', 'GeoSlab 703 Lt BT',
            'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD',
            'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'Gujarati Sangam MN', 'Gulim', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Gurmukhi MN', 'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti SC', 'Heiti TC', 'HELV',
            'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN', 'Hiragino Mincho ProN', 'Hoefler Text', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT', 'Incised901 BT',
            'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'IrisUPC', 'Iskoola Pota', 'JasmineUPC', 'Jazz LET', 'Jenson', 'Jester', 'Jokerman', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN',
            'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Krungthep', 'Kunstler Script', 'Lao UI', 'Latha', 'Leelawadee', 'Letter Gothic', 'Levenim MT', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island',
            'Lydian BT', 'Magneto', 'Maiandra GD', 'Malayalam Sangam MN', 'Malgun Gothic',
            'Mangal', 'Marigold', 'Marion', 'Marker Felt', 'Market', 'Marlett', 'Matisse ITC', 'Matura MT Script Capitals', 'Meiryo', 'Meiryo UI', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Tai Le',
            'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU', 'MingLiU_HKSCS', 'MingLiU_HKSCS-ExtB', 'MingLiU-ExtB', 'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'Mongolian Baiti',
            'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS Mincho', 'MS PMincho', 'MS Reference Specialty', 'MS UI Gothic', 'MT Extra', 'MUSEO', 'MV Boli',
            'Nadeem', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'Noteworthy', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OPTIMA', 'Oriya Sangam MN',
            'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Papyrus', 'Parchment', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Plantagenet Cherokee', 'Playbill', 'PMingLiU', 'PMingLiU-ExtB',
            'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla',
            'Santa Fe LET', 'Savoye LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood',
            'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'SimHei', 'Simplified Arabic', 'Simplified Arabic Fixed', 'SimSun', 'SimSun-ExtB', 'Sinhala Sangam MN', 'Sketch Rockwell', 'Skia', 'Small Fonts', 'Snap ITC', 'Snell Roundhand', 'Socket',
            'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Sylfaen', 'Synchro LET', 'System', 'Tamil Sangam MN', 'Technical', 'Teletype', 'Telugu Sangam MN', 'Tempus Sans ITC',
            'Terminal', 'Thonburi', 'Traditional Arabic', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tunga', 'Tw Cen MT', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold',
            'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Vrinda', 'Westminster', 'WHITNEY', 'Wide Latin',
            'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zapfino', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF'];
          fontList = fontList.concat(extendedFontList);
        }

        fontList = fontList.concat(options.fonts.userDefinedFonts);

        // remove duplicate fonts
        fontList = fontList.filter(function (font, position) {
          return fontList.indexOf(font) === position
        });

        // we use m or w because these two characters take up the maximum width.
        // And we use a LLi so that the same matching fonts can get separated
        var testString = 'mmmmmmmmmmlli';

        // we test using 72px font size, we may use any size. I guess larger the better.
        var testSize = '72px';

        var h = document.getElementsByTagName('body')[0];

        // div to load spans for the base fonts
        var baseFontsDiv = document.createElement('div');

        // div to load spans for the fonts to detect
        var fontsDiv = document.createElement('div');

        var defaultWidth = {};
        var defaultHeight = {};

        // creates a span where the fonts will be loaded
        var createSpan = function () {
          var s = document.createElement('span');
          /*
           * We need this css as in some weird browser this
           * span elements shows up for a microSec which creates a
           * bad user experience
           */
          s.style.position = 'absolute';
          s.style.left = '-9999px';
          s.style.fontSize = testSize;

          // css font reset to reset external styles
          s.style.fontStyle = 'normal';
          s.style.fontWeight = 'normal';
          s.style.letterSpacing = 'normal';
          s.style.lineBreak = 'auto';
          s.style.lineHeight = 'normal';
          s.style.textTransform = 'none';
          s.style.textAlign = 'left';
          s.style.textDecoration = 'none';
          s.style.textShadow = 'none';
          s.style.whiteSpace = 'normal';
          s.style.wordBreak = 'normal';
          s.style.wordSpacing = 'normal';

          s.innerHTML = testString;
          return s
        };

        // creates a span and load the font to detect and a base font for fallback
        var createSpanWithFonts = function (fontToDetect, baseFont) {
          var s = createSpan();
          s.style.fontFamily = "'" + fontToDetect + "'," + baseFont;
          return s
        };

        // creates spans for the base fonts and adds them to baseFontsDiv
        var initializeBaseFontsSpans = function () {
          var spans = [];
          for (var index = 0, length = baseFonts.length; index < length; index++) {
            var s = createSpan();
            s.style.fontFamily = baseFonts[index];
            baseFontsDiv.appendChild(s);
            spans.push(s);
          }
          return spans
        };

        // creates spans for the fonts to detect and adds them to fontsDiv
        var initializeFontsSpans = function () {
          var spans = {};
          for (var i = 0, l = fontList.length; i < l; i++) {
            var fontSpans = [];
            for (var j = 0, numDefaultFonts = baseFonts.length; j < numDefaultFonts; j++) {
              var s = createSpanWithFonts(fontList[i], baseFonts[j]);
              fontsDiv.appendChild(s);
              fontSpans.push(s);
            }
            spans[fontList[i]] = fontSpans; // Stores {fontName : [spans for that font]}
          }
          return spans
        };

        // checks if a font is available
        var isFontAvailable = function (fontSpans) {
          var detected = false;
          for (var i = 0; i < baseFonts.length; i++) {
            detected = (fontSpans[i].offsetWidth !== defaultWidth[baseFonts[i]] || fontSpans[i].offsetHeight !== defaultHeight[baseFonts[i]]);
            if (detected) {
              return detected
            }
          }
          return detected
        };

        // create spans for base fonts
        var baseFontsSpans = initializeBaseFontsSpans();

        // add the spans to the DOM
        h.appendChild(baseFontsDiv);

        // get the default width for the three base fonts
        for (var index = 0, length = baseFonts.length; index < length; index++) {
          defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth; // width for the default font
          defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight; // height for the default font
        }

        // create spans for fonts to detect
        var fontsSpans = initializeFontsSpans();

        // add all the spans to the DOM
        h.appendChild(fontsDiv);

        // check available fonts
        var available = [];
        for (var i = 0, l = fontList.length; i < l; i++) {
          if (isFontAvailable(fontsSpans[fontList[i]])) {
            available.push(fontList[i]);
          }
        }

        // remove spans from DOM
        h.removeChild(fontsDiv);
        h.removeChild(baseFontsDiv);
        done(available);
      };
      var pluginsComponent = function (done, options) {
        if (isIE()) {
          if (!options.plugins.excludeIE) {
            done(getIEPlugins(options));
          } else {
            done(options.EXCLUDED);
          }
        } else {
          done(getRegularPlugins(options));
        }
      };
      var getRegularPlugins = function (options) {
        if (navigator.plugins == null) {
          return options.NOT_AVAILABLE
        }

        var plugins = [];
        // plugins isn't defined in Node envs.
        for (var i = 0, l = navigator.plugins.length; i < l; i++) {
          if (navigator.plugins[i]) { plugins.push(navigator.plugins[i]); }
        }

        // sorting plugins only for those user agents, that we know randomize the plugins
        // every time we try to enumerate them
        if (pluginsShouldBeSorted(options)) {
          plugins = plugins.sort(function (a, b) {
            if (a.name > b.name) { return 1 }
            if (a.name < b.name) { return -1 }
            return 0
          });
        }
        return map(plugins, function (p) {
          var mimeTypes = map(p, function (mt) {
            return [mt.type, mt.suffixes]
          });
          return [p.name, p.description, mimeTypes]
        })
      };
      var getIEPlugins = function (options) {
        var result = [];
        if ((Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(window, 'ActiveXObject')) || ('ActiveXObject' in window)) {
          var names = [
            'AcroPDF.PDF', // Adobe PDF reader 7+
            'Adodb.Stream',
            'AgControl.AgControl', // Silverlight
            'DevalVRXCtrl.DevalVRXCtrl.1',
            'MacromediaFlashPaper.MacromediaFlashPaper',
            'Msxml2.DOMDocument',
            'Msxml2.XMLHTTP',
            'PDF.PdfCtrl', // Adobe PDF reader 6 and earlier, brrr
            'QuickTime.QuickTime', // QuickTime
            'QuickTimeCheckObject.QuickTimeCheck.1',
            'RealPlayer',
            'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)',
            'RealVideo.RealVideo(tm) ActiveX Control (32-bit)',
            'Scripting.Dictionary',
            'SWCtl.SWCtl', // ShockWave player
            'Shell.UIHelper',
            'ShockwaveFlash.ShockwaveFlash', // flash plugin
            'Skype.Detection',
            'TDCCtl.TDCCtl',
            'WMPlayer.OCX', // Windows media player
            'rmocx.RealPlayer G2 Control',
            'rmocx.RealPlayer G2 Control.1'
          ];
          // starting to detect plugins in IE
          result = map(names, function (name) {
            try {
              // eslint-disable-next-line no-new
              new window.ActiveXObject(name);
              return name
            } catch (e) {
              return options.ERROR
            }
          });
        } else {
          result.push(options.NOT_AVAILABLE);
        }
        if (navigator.plugins) {
          result = result.concat(getRegularPlugins(options));
        }
        return result
      };
      var pluginsShouldBeSorted = function (options) {
        var should = false;
        for (var i = 0, l = options.plugins.sortPluginsFor.length; i < l; i++) {
          var re = options.plugins.sortPluginsFor[i];
          if (navigator.userAgent.match(re)) {
            should = true;
            break
          }
        }
        return should
      };
      var touchSupportKey = function (done) {
        done(getTouchSupport());
      };
      var hardwareConcurrencyKey = function (done, options) {
        done(getHardwareConcurrency(options));
      };
      var hasSessionStorage = function (options) {
        try {
          return !!window.sessionStorage
        } catch (e) {
          return options.ERROR // SecurityError when referencing it means it exists
        }
      };

      // https://bugzilla.mozilla.org/show_bug.cgi?id=781447
      var hasLocalStorage = function (options) {
        try {
          return !!window.localStorage
        } catch (e) {
          return options.ERROR // SecurityError when referencing it means it exists
        }
      };
      var hasIndexedDB = function (options) {
        try {
          return !!window.indexedDB
        } catch (e) {
          return options.ERROR // SecurityError when referencing it means it exists
        }
      };
      var getHardwareConcurrency = function (options) {
        if (navigator.hardwareConcurrency) {
          return navigator.hardwareConcurrency
        }
        return options.NOT_AVAILABLE
      };
      var getNavigatorCpuClass = function (options) {
        return navigator.cpuClass || options.NOT_AVAILABLE
      };
      var getNavigatorPlatform = function (options) {
        if (navigator.platform) {
          return navigator.platform
        } else {
          return options.NOT_AVAILABLE
        }
      };
      var getDoNotTrack = function (options) {
        if (navigator.doNotTrack) {
          return navigator.doNotTrack
        } else if (navigator.msDoNotTrack) {
          return navigator.msDoNotTrack
        } else if (window.doNotTrack) {
          return window.doNotTrack
        } else {
          return options.NOT_AVAILABLE
        }
      };
      // This is a crude and primitive touch screen detection.
      // It's not possible to currently reliably detect the  availability of a touch screen
      // with a JS, without actually subscribing to a touch event.
      // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
      // https://github.com/Modernizr/Modernizr/issues/548
      // method returns an array of 3 values:
      // maxTouchPoints, the success or failure of creating a TouchEvent,
      // and the availability of the 'ontouchstart' property

      var getTouchSupport = function () {
        var maxTouchPoints = 0;
        var touchEvent;
        if (typeof navigator.maxTouchPoints !== 'undefined') {
          maxTouchPoints = navigator.maxTouchPoints;
        } else if (typeof navigator.msMaxTouchPoints !== 'undefined') {
          maxTouchPoints = navigator.msMaxTouchPoints;
        }
        try {
          document.createEvent('TouchEvent');
          touchEvent = true;
        } catch (_) {
          touchEvent = false;
        }
        var touchStart = 'ontouchstart' in window;
        return [maxTouchPoints, touchEvent, touchStart]
      };
      // https://www.browserleaks.com/canvas#how-does-it-work

      var getCanvasFp = function (options) {
        var result = [];
        // Very simple now, need to make it more complex (geo shapes etc)
        var canvas = document.createElement('canvas');
        canvas.width = 2000;
        canvas.height = 200;
        canvas.style.display = 'inline';
        var ctx = canvas.getContext('2d');
        // detect browser support of canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/canvas/winding.js
        ctx.rect(0, 0, 10, 10);
        ctx.rect(2, 2, 6, 6);
        result.push('canvas winding:' + ((ctx.isPointInPath(5, 5, 'evenodd') === false) ? 'yes' : 'no'));

        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        // https://github.com/Valve/fingerprintjs2/issues/66
        if (options.dontUseFakeFontInCanvas) {
          ctx.font = '11pt Arial';
        } else {
          ctx.font = '11pt no-real-font-123';
        }
        ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.2)';
        ctx.font = '18pt Arial';
        ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 4, 45);

        // canvas blending
        // http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
        // http://jsfiddle.net/NDYV8/16/
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb(255,0,255)';
        ctx.beginPath();
        ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgb(0,255,255)';
        ctx.beginPath();
        ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgb(255,255,0)';
        ctx.beginPath();
        ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgb(255,0,255)';
        // canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // http://jsfiddle.net/NDYV8/19/
        ctx.arc(75, 75, 75, 0, Math.PI * 2, true);
        ctx.arc(75, 75, 25, 0, Math.PI * 2, true);
        ctx.fill('evenodd');

        if (canvas.toDataURL) { result.push('canvas fp:' + canvas.toDataURL()); }
        return result
      };
      var getWebglFp = function () {
        var gl;
        var fa2s = function (fa) {
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.enable(gl.DEPTH_TEST);
          gl.depthFunc(gl.LEQUAL);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          return '[' + fa[0] + ', ' + fa[1] + ']'
        };
        var maxAnisotropy = function (gl) {
          var ext = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
          if (ext) {
            var anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            if (anisotropy === 0) {
              anisotropy = 2;
            }
            return anisotropy
          } else {
            return null
          }
        };

        gl = getWebglCanvas();
        if (!gl) { return null }
        // WebGL fingerprinting is a combination of techniques, found in MaxMind antifraud script & Augur fingerprinting.
        // First it draws a gradient object with shaders and convers the image to the Base64 string.
        // Then it enumerates all WebGL extensions & capabilities and appends them to the Base64 string, resulting in a huge WebGL string, potentially very unique on each device
        // Since iOS supports webgl starting from version 8.1 and 8.1 runs on several graphics chips, the results may be different across ios devices, but we need to verify it.
        var result = [];
        var vShaderTemplate = 'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}';
        var fShaderTemplate = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}';
        var vertexPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
        var vertices = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.732134444, 0]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        vertexPosBuffer.itemSize = 3;
        vertexPosBuffer.numItems = 3;
        var program = gl.createProgram();
        var vshader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vshader, vShaderTemplate);
        gl.compileShader(vshader);
        var fshader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fshader, fShaderTemplate);
        gl.compileShader(fshader);
        gl.attachShader(program, vshader);
        gl.attachShader(program, fshader);
        gl.linkProgram(program);
        gl.useProgram(program);
        program.vertexPosAttrib = gl.getAttribLocation(program, 'attrVertex');
        program.offsetUniform = gl.getUniformLocation(program, 'uniformOffset');
        gl.enableVertexAttribArray(program.vertexPosArray);
        gl.vertexAttribPointer(program.vertexPosAttrib, vertexPosBuffer.itemSize, gl.FLOAT, !1, 0, 0);
        gl.uniform2f(program.offsetUniform, 1, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPosBuffer.numItems);
        try {
          result.push(gl.canvas.toDataURL());
        } catch (e) {
          /* .toDataURL may be absent or broken (blocked by extension) */
        }
        result.push('extensions:' + (gl.getSupportedExtensions() || []).join(';'));
        result.push('webgl aliased line width range:' + fa2s(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)));
        result.push('webgl aliased point size range:' + fa2s(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)));
        result.push('webgl alpha bits:' + gl.getParameter(gl.ALPHA_BITS));
        result.push('webgl antialiasing:' + (gl.getContextAttributes().antialias ? 'yes' : 'no'));
        result.push('webgl blue bits:' + gl.getParameter(gl.BLUE_BITS));
        result.push('webgl depth bits:' + gl.getParameter(gl.DEPTH_BITS));
        result.push('webgl green bits:' + gl.getParameter(gl.GREEN_BITS));
        result.push('webgl max anisotropy:' + maxAnisotropy(gl));
        result.push('webgl max combined texture image units:' + gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
        result.push('webgl max cube map texture size:' + gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE));
        result.push('webgl max fragment uniform vectors:' + gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS));
        result.push('webgl max render buffer size:' + gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
        result.push('webgl max texture image units:' + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
        result.push('webgl max texture size:' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
        result.push('webgl max varying vectors:' + gl.getParameter(gl.MAX_VARYING_VECTORS));
        result.push('webgl max vertex attribs:' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
        result.push('webgl max vertex texture image units:' + gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
        result.push('webgl max vertex uniform vectors:' + gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS));
        result.push('webgl max viewport dims:' + fa2s(gl.getParameter(gl.MAX_VIEWPORT_DIMS)));
        result.push('webgl red bits:' + gl.getParameter(gl.RED_BITS));
        result.push('webgl renderer:' + gl.getParameter(gl.RENDERER));
        result.push('webgl shading language version:' + gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
        result.push('webgl stencil bits:' + gl.getParameter(gl.STENCIL_BITS));
        result.push('webgl vendor:' + gl.getParameter(gl.VENDOR));
        result.push('webgl version:' + gl.getParameter(gl.VERSION));

        try {
          // Add the unmasked vendor and unmasked renderer if the debug_renderer_info extension is available
          var extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (extensionDebugRendererInfo) {
            result.push('webgl unmasked vendor:' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL));
            result.push('webgl unmasked renderer:' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL));
          }
        } catch (e) { /* squelch */ }

        if (!gl.getShaderPrecisionFormat) {
          return result
        }

        each(['FLOAT', 'INT'], function (numType) {
          each(['VERTEX', 'FRAGMENT'], function (shader) {
            each(['HIGH', 'MEDIUM', 'LOW'], function (numSize) {
              each(['precision', 'rangeMin', 'rangeMax'], function (key) {
                var format = gl.getShaderPrecisionFormat(gl[shader + '_SHADER'], gl[numSize + '_' + numType])[key];
                if (key !== 'precision') {
                  key = 'precision ' + key;
                }
                var line = ['webgl ', shader.toLowerCase(), ' shader ', numSize.toLowerCase(), ' ', numType.toLowerCase(), ' ', key, ':', format].join('');
                result.push(line);
              });
            });
          });
        });
        return result
      };
      var getWebglVendorAndRenderer = function () {
        /* This a subset of the WebGL fingerprint with a lot of entropy, while being reasonably browser-independent */
        try {
          var glContext = getWebglCanvas();
          var extensionDebugRendererInfo = glContext.getExtension('WEBGL_debug_renderer_info');
          return glContext.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL) + '~' + glContext.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL)
        } catch (e) {
          return null
        }
      };
      var getAdBlock = function () {
        var ads = document.createElement('div');
        ads.innerHTML = '&nbsp;';
        ads.className = 'adsbox';
        var result = false;
        try {
          // body may not exist, that's why we need try/catch
          document.body.appendChild(ads);
          result = document.getElementsByClassName('adsbox')[0].offsetHeight === 0;
          document.body.removeChild(ads);
        } catch (e) {
          result = false;
        }
        return result
      };
      var getHasLiedLanguages = function () {
        // We check if navigator.language is equal to the first language of navigator.languages
        // navigator.languages is undefined on IE11 (and potentially older IEs)
        if (typeof navigator.languages !== 'undefined') {
          try {
            var firstLanguages = navigator.languages[0].substr(0, 2);
            if (firstLanguages !== navigator.language.substr(0, 2)) {
              return true
            }
          } catch (err) {
            return true
          }
        }
        return false
      };
      var getHasLiedResolution = function () {
        return window.screen.width < window.screen.availWidth || window.screen.height < window.screen.availHeight
      };
      var getHasLiedOs = function () {
        var userAgent = navigator.userAgent.toLowerCase();
        var oscpu = navigator.oscpu;
        var platform = navigator.platform.toLowerCase();
        var os;
        // We extract the OS from the user agent (respect the order of the if else if statement)
        if (userAgent.indexOf('windows phone') >= 0) {
          os = 'Windows Phone';
        } else if (userAgent.indexOf('win') >= 0) {
          os = 'Windows';
        } else if (userAgent.indexOf('android') >= 0) {
          os = 'Android';
        } else if (userAgent.indexOf('linux') >= 0 || userAgent.indexOf('cros') >= 0) {
          os = 'Linux';
        } else if (userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0) {
          os = 'iOS';
        } else if (userAgent.indexOf('mac') >= 0) {
          os = 'Mac';
        } else {
          os = 'Other';
        }
        // We detect if the person uses a mobile device
        var mobileDevice = (('ontouchstart' in window) ||
          (navigator.maxTouchPoints > 0) ||
          (navigator.msMaxTouchPoints > 0));

        if (mobileDevice && os !== 'Windows Phone' && os !== 'Android' && os !== 'iOS' && os !== 'Other') {
          return true
        }

        // We compare oscpu with the OS extracted from the UA
        if (typeof oscpu !== 'undefined') {
          oscpu = oscpu.toLowerCase();
          if (oscpu.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
            return true
          } else if (oscpu.indexOf('linux') >= 0 && os !== 'Linux' && os !== 'Android') {
            return true
          } else if (oscpu.indexOf('mac') >= 0 && os !== 'Mac' && os !== 'iOS') {
            return true
          } else if ((oscpu.indexOf('win') === -1 && oscpu.indexOf('linux') === -1 && oscpu.indexOf('mac') === -1) !== (os === 'Other')) {
            return true
          }
        }

        // We compare platform with the OS extracted from the UA
        if (platform.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
          return true
        } else if ((platform.indexOf('linux') >= 0 || platform.indexOf('android') >= 0 || platform.indexOf('pike') >= 0) && os !== 'Linux' && os !== 'Android') {
          return true
        } else if ((platform.indexOf('mac') >= 0 || platform.indexOf('ipad') >= 0 || platform.indexOf('ipod') >= 0 || platform.indexOf('iphone') >= 0) && os !== 'Mac' && os !== 'iOS') {
          return true
        } else {
          var platformIsOther = platform.indexOf('win') < 0 &&
            platform.indexOf('linux') < 0 &&
            platform.indexOf('mac') < 0 &&
            platform.indexOf('iphone') < 0 &&
            platform.indexOf('ipad') < 0;
          if (platformIsOther !== (os === 'Other')) {
            return true
          }
        }

        return typeof navigator.plugins === 'undefined' && os !== 'Windows' && os !== 'Windows Phone'
      };
      var getHasLiedBrowser = function () {
        var userAgent = navigator.userAgent.toLowerCase();
        var productSub = navigator.productSub;

        // we extract the browser from the user agent (respect the order of the tests)
        var browser;
        if (userAgent.indexOf('firefox') >= 0) {
          browser = 'Firefox';
        } else if (userAgent.indexOf('opera') >= 0 || userAgent.indexOf('opr') >= 0) {
          browser = 'Opera';
        } else if (userAgent.indexOf('chrome') >= 0) {
          browser = 'Chrome';
        } else if (userAgent.indexOf('safari') >= 0) {
          browser = 'Safari';
        } else if (userAgent.indexOf('trident') >= 0) {
          browser = 'Internet Explorer';
        } else {
          browser = 'Other';
        }

        if ((browser === 'Chrome' || browser === 'Safari' || browser === 'Opera') && productSub !== '20030107') {
          return true
        }

        // eslint-disable-next-line no-eval
        var tempRes = eval.toString().length;
        if (tempRes === 37 && browser !== 'Safari' && browser !== 'Firefox' && browser !== 'Other') {
          return true
        } else if (tempRes === 39 && browser !== 'Internet Explorer' && browser !== 'Other') {
          return true
        } else if (tempRes === 33 && browser !== 'Chrome' && browser !== 'Opera' && browser !== 'Other') {
          return true
        }

        // We create an error to see how it is handled
        var errFirefox;
        try {
          // eslint-disable-next-line no-throw-literal
          throw 'a'
        } catch (err) {
          try {
            err.toSource();
            errFirefox = true;
          } catch (errOfErr) {
            errFirefox = false;
          }
        }
        return errFirefox && browser !== 'Firefox' && browser !== 'Other'
      };
      var isCanvasSupported = function () {
        var elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'))
      };
      var isWebGlSupported = function () {
        // code taken from Modernizr
        if (!isCanvasSupported()) {
          return false
        }

        var glContext = getWebglCanvas();
        return !!window.WebGLRenderingContext && !!glContext
      };
      var isIE = function () {
        if (navigator.appName === 'Microsoft Internet Explorer') {
          return true
        } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) { // IE 11
          return true
        }
        return false
      };
      var hasSwfObjectLoaded = function () {
        return typeof window.swfobject !== 'undefined'
      };
      var hasMinFlashInstalled = function () {
        return window.swfobject.hasFlashPlayerVersion('9.0.0')
      };
      var addFlashDivNode = function (options) {
        var node = document.createElement('div');
        node.setAttribute('id', options.fonts.swfContainerId);
        document.body.appendChild(node);
      };
      var loadSwfAndDetectFonts = function (done, options) {
        var hiddenCallback = '___fp_swf_loaded';
        window[hiddenCallback] = function (fonts) {
          done(fonts);
        };
        var id = options.fonts.swfContainerId;
        addFlashDivNode();
        var flashvars = { onReady: hiddenCallback };
        var flashparams = { allowScriptAccess: 'always', menu: 'false' };
        window.swfobject.embedSWF(options.fonts.swfPath, id, '1', '1', '9.0.0', false, flashvars, flashparams, {});
      };
      var getWebglCanvas = function () {
        var canvas = document.createElement('canvas');
        var gl = null;
        try {
          gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) { /* squelch */ }
        if (!gl) { gl = null; }
        return gl
      };

      var components = [
        { key: 'userAgent', getData: UserAgent },
        { key: 'webdriver', getData: webdriver },
        { key: 'language', getData: languageKey },
        { key: 'colorDepth', getData: colorDepthKey },
        { key: 'deviceMemory', getData: deviceMemoryKey },
        { key: 'pixelRatio', getData: pixelRatioKey },
        { key: 'hardwareConcurrency', getData: hardwareConcurrencyKey },
        { key: 'screenResolution', getData: screenResolutionKey },
        { key: 'availableScreenResolution', getData: availableScreenResolutionKey },
        { key: 'timezoneOffset', getData: timezoneOffset },
        { key: 'timezone', getData: timezone },
        { key: 'sessionStorage', getData: sessionStorageKey },
        { key: 'localStorage', getData: localStorageKey },
        { key: 'indexedDb', getData: indexedDbKey },
        { key: 'addBehavior', getData: addBehaviorKey },
        { key: 'openDatabase', getData: openDatabaseKey },
        { key: 'cpuClass', getData: cpuClassKey },
        { key: 'platform', getData: platformKey },
        { key: 'doNotTrack', getData: doNotTrackKey },
        { key: 'plugins', getData: pluginsComponent },
        { key: 'canvas', getData: canvasKey },
        { key: 'webgl', getData: webglKey },
        { key: 'webglVendorAndRenderer', getData: webglVendorAndRendererKey },
        { key: 'adBlock', getData: adBlockKey },
        { key: 'hasLiedLanguages', getData: hasLiedLanguagesKey },
        { key: 'hasLiedResolution', getData: hasLiedResolutionKey },
        { key: 'hasLiedOs', getData: hasLiedOsKey },
        { key: 'hasLiedBrowser', getData: hasLiedBrowserKey },
        { key: 'touchSupport', getData: touchSupportKey },
        { key: 'fonts', getData: jsFontsKey, pauseBefore: true },
        { key: 'fontsFlash', getData: flashFontsKey, pauseBefore: true },
        { key: 'audio', getData: audioKey },
        { key: 'enumerateDevices', getData: enumerateDevicesKey }
      ];

      var Fingerprint2 = function (options) {
        throw new Error("'new Fingerprint()' is deprecated, see https://github.com/Valve/fingerprintjs2#upgrade-guide-from-182-to-200")
      };

      Fingerprint2.get = function (options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        } else if (!options) {
          options = {};
        }
        extendSoft(options, defaultOptions);
        options.components = options.extraComponents.concat(components);

        var keys = {
          data: [],
          addPreprocessedComponent: function (key, value) {
            if (typeof options.preprocessor === 'function') {
              value = options.preprocessor(key, value);
            }
            keys.data.push({ key: key, value: value });
          }
        };

        var i = -1;
        var chainComponents = function (alreadyWaited) {
          i += 1;
          if (i >= options.components.length) { // on finish
            callback(keys.data);
            return
          }
          var component = options.components[i];

          if (options.excludes[component.key]) {
            chainComponents(false); // skip
            return
          }

          if (!alreadyWaited && component.pauseBefore) {
            i -= 1;
            setTimeout(function () {
              chainComponents(true);
            }, 1);
            return
          }

          try {
            component.getData(function (value) {
              keys.addPreprocessedComponent(component.key, value);
              chainComponents(false);
            }, options);
          } catch (error) {
            // main body error
            keys.addPreprocessedComponent(component.key, String(error));
            chainComponents(false);
          }
        };

        chainComponents(false);
      };

      Fingerprint2.getPromise = function (options) {
        return new Promise(function (resolve, reject) {
          Fingerprint2.get(options, resolve);
        })
      };

      Fingerprint2.getV18 = function (options, callback) {
        if (callback == null) {
          callback = options;
          options = {};
        }
        return Fingerprint2.get(options, function (components) {
          var newComponents = [];
          for (var i = 0; i < components.length; i++) {
            var component = components[i];
            if (component.value === (options.NOT_AVAILABLE || 'not available')) {
              newComponents.push({ key: component.key, value: 'unknown' });
            } else if (component.key === 'plugins') {
              newComponents.push({
                key: 'plugins',
                value: map(component.value, function (p) {
                  var mimeTypes = map(p[2], function (mt) {
                    if (mt.join) { return mt.join('~') }
                    return mt
                  }).join(',');
                  return [p[0], p[1], mimeTypes].join('::')
                })
              });
            } else if (['canvas', 'webgl'].indexOf(component.key) !== -1) {
              newComponents.push({ key: component.key, value: component.value.join('~') });
            } else if (['sessionStorage', 'localStorage', 'indexedDb', 'addBehavior', 'openDatabase'].indexOf(component.key) !== -1) {
              if (component.value) {
                newComponents.push({ key: component.key, value: 1 });
              } else {
                // skip
                continue
              }
            } else {
              if (component.value) {
                newComponents.push(component.value.join ? { key: component.key, value: component.value.join(';') } : component);
              } else {
                newComponents.push({ key: component.key, value: component.value });
              }
            }
          }
          var murmur = x64hash128(map(newComponents, function (component) { return component.value }).join('~~~'), 31);
          callback(murmur, newComponents);
        })
      };

      Fingerprint2.x64hash128 = x64hash128;
      Fingerprint2.VERSION = '2.1.0';
      return Fingerprint2
    });
    });

    const fp = writable(false);

    if (window.requestIdleCallback) {
        requestIdleCallback(function () {
            fingerprint2.get(function (components) {
                var values = components.map(function (component) { return component.value });
                var murmur = fingerprint2.x64hash128(values.join(''), 31);
                fp.set(murmur);
            });
        });
    } else {
        setTimeout(function () {
            fingerprint2.get(function (components) {
                var values = components.map(function (component) { return component.value });
                var murmur = fingerprint2.x64hash128(values.join(''), 31);
                fp.set(murmur);
            });
        }, 500);
    }

    /**
     * Parses an URI
     *
     * @author Steven Levithan <stevenlevithan.com> (MIT license)
     * @api private
     */

    var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

    var parts = [
        'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
    ];

    var parseuri = function parseuri(str) {
        var src = str,
            b = str.indexOf('['),
            e = str.indexOf(']');

        if (b != -1 && e != -1) {
            str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
        }

        var m = re.exec(str || ''),
            uri = {},
            i = 14;

        while (i--) {
            uri[parts[i]] = m[i] || '';
        }

        if (b != -1 && e != -1) {
            uri.source = src;
            uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
            uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
            uri.ipv6uri = true;
        }

        return uri;
    };

    /**
     * Helpers.
     */

    var s = 1000;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;

    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} [options]
     * @throws {Error} throw an error if val is not a non-empty string or a number
     * @return {String|Number}
     * @api public
     */

    var ms = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === 'string' && val.length > 0) {
        return parse(val);
      } else if (type === 'number' && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        'val is not a non-empty string or a valid number. val=' +
          JSON.stringify(val)
      );
    };

    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */

    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y;
        case 'weeks':
        case 'week':
        case 'w':
          return n * w;
        case 'days':
        case 'day':
        case 'd':
          return n * d;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n;
        default:
          return undefined;
      }
    }

    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + 'd';
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + 'h';
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + 'm';
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + 's';
      }
      return ms + 'ms';
    }

    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, 'day');
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, 'hour');
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, 'minute');
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, 'second');
      }
      return ms + ' ms';
    }

    /**
     * Pluralization helper.
     */

    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
    }

    /**
     * This is the common logic for both the Node.js and web browser
     * implementations of `debug()`.
     */

    function setup(env) {
    	createDebug.debug = createDebug;
    	createDebug.default = createDebug;
    	createDebug.coerce = coerce;
    	createDebug.disable = disable;
    	createDebug.enable = enable;
    	createDebug.enabled = enabled;
    	createDebug.humanize = ms;

    	Object.keys(env).forEach(key => {
    		createDebug[key] = env[key];
    	});

    	/**
    	* Active `debug` instances.
    	*/
    	createDebug.instances = [];

    	/**
    	* The currently active debug mode names, and names to skip.
    	*/

    	createDebug.names = [];
    	createDebug.skips = [];

    	/**
    	* Map of special "%n" handling functions, for the debug "format" argument.
    	*
    	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
    	*/
    	createDebug.formatters = {};

    	/**
    	* Selects a color for a debug namespace
    	* @param {String} namespace The namespace string for the for the debug instance to be colored
    	* @return {Number|String} An ANSI color code for the given namespace
    	* @api private
    	*/
    	function selectColor(namespace) {
    		let hash = 0;

    		for (let i = 0; i < namespace.length; i++) {
    			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
    			hash |= 0; // Convert to 32bit integer
    		}

    		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    	}
    	createDebug.selectColor = selectColor;

    	/**
    	* Create a debugger with the given `namespace`.
    	*
    	* @param {String} namespace
    	* @return {Function}
    	* @api public
    	*/
    	function createDebug(namespace) {
    		let prevTime;

    		function debug(...args) {
    			// Disabled?
    			if (!debug.enabled) {
    				return;
    			}

    			const self = debug;

    			// Set `diff` timestamp
    			const curr = Number(new Date());
    			const ms = curr - (prevTime || curr);
    			self.diff = ms;
    			self.prev = prevTime;
    			self.curr = curr;
    			prevTime = curr;

    			args[0] = createDebug.coerce(args[0]);

    			if (typeof args[0] !== 'string') {
    				// Anything else let's inspect with %O
    				args.unshift('%O');
    			}

    			// Apply any `formatters` transformations
    			let index = 0;
    			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
    				// If we encounter an escaped % then don't increase the array index
    				if (match === '%%') {
    					return match;
    				}
    				index++;
    				const formatter = createDebug.formatters[format];
    				if (typeof formatter === 'function') {
    					const val = args[index];
    					match = formatter.call(self, val);

    					// Now we need to remove `args[index]` since it's inlined in the `format`
    					args.splice(index, 1);
    					index--;
    				}
    				return match;
    			});

    			// Apply env-specific formatting (colors, etc.)
    			createDebug.formatArgs.call(self, args);

    			const logFn = self.log || createDebug.log;
    			logFn.apply(self, args);
    		}

    		debug.namespace = namespace;
    		debug.enabled = createDebug.enabled(namespace);
    		debug.useColors = createDebug.useColors();
    		debug.color = selectColor(namespace);
    		debug.destroy = destroy;
    		debug.extend = extend;
    		// Debug.formatArgs = formatArgs;
    		// debug.rawLog = rawLog;

    		// env-specific initialization logic for debug instances
    		if (typeof createDebug.init === 'function') {
    			createDebug.init(debug);
    		}

    		createDebug.instances.push(debug);

    		return debug;
    	}

    	function destroy() {
    		const index = createDebug.instances.indexOf(this);
    		if (index !== -1) {
    			createDebug.instances.splice(index, 1);
    			return true;
    		}
    		return false;
    	}

    	function extend(namespace, delimiter) {
    		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
    		newDebug.log = this.log;
    		return newDebug;
    	}

    	/**
    	* Enables a debug mode by namespaces. This can include modes
    	* separated by a colon and wildcards.
    	*
    	* @param {String} namespaces
    	* @api public
    	*/
    	function enable(namespaces) {
    		createDebug.save(namespaces);

    		createDebug.names = [];
    		createDebug.skips = [];

    		let i;
    		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
    		const len = split.length;

    		for (i = 0; i < len; i++) {
    			if (!split[i]) {
    				// ignore empty strings
    				continue;
    			}

    			namespaces = split[i].replace(/\*/g, '.*?');

    			if (namespaces[0] === '-') {
    				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    			} else {
    				createDebug.names.push(new RegExp('^' + namespaces + '$'));
    			}
    		}

    		for (i = 0; i < createDebug.instances.length; i++) {
    			const instance = createDebug.instances[i];
    			instance.enabled = createDebug.enabled(instance.namespace);
    		}
    	}

    	/**
    	* Disable debug output.
    	*
    	* @return {String} namespaces
    	* @api public
    	*/
    	function disable() {
    		const namespaces = [
    			...createDebug.names.map(toNamespace),
    			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
    		].join(',');
    		createDebug.enable('');
    		return namespaces;
    	}

    	/**
    	* Returns true if the given mode name is enabled, false otherwise.
    	*
    	* @param {String} name
    	* @return {Boolean}
    	* @api public
    	*/
    	function enabled(name) {
    		if (name[name.length - 1] === '*') {
    			return true;
    		}

    		let i;
    		let len;

    		for (i = 0, len = createDebug.skips.length; i < len; i++) {
    			if (createDebug.skips[i].test(name)) {
    				return false;
    			}
    		}

    		for (i = 0, len = createDebug.names.length; i < len; i++) {
    			if (createDebug.names[i].test(name)) {
    				return true;
    			}
    		}

    		return false;
    	}

    	/**
    	* Convert regexp to namespace
    	*
    	* @param {RegExp} regxep
    	* @return {String} namespace
    	* @api private
    	*/
    	function toNamespace(regexp) {
    		return regexp.toString()
    			.substring(2, regexp.toString().length - 2)
    			.replace(/\.\*\?$/, '*');
    	}

    	/**
    	* Coerce `val`.
    	*
    	* @param {Mixed} val
    	* @return {Mixed}
    	* @api private
    	*/
    	function coerce(val) {
    		if (val instanceof Error) {
    			return val.stack || val.message;
    		}
    		return val;
    	}

    	createDebug.enable(createDebug.load());

    	return createDebug;
    }

    var common = setup;

    var browser = createCommonjsModule(function (module, exports) {
    /* eslint-env browser */

    /**
     * This is the web browser implementation of `debug()`.
     */

    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();

    /**
     * Colors.
     */

    exports.colors = [
    	'#0000CC',
    	'#0000FF',
    	'#0033CC',
    	'#0033FF',
    	'#0066CC',
    	'#0066FF',
    	'#0099CC',
    	'#0099FF',
    	'#00CC00',
    	'#00CC33',
    	'#00CC66',
    	'#00CC99',
    	'#00CCCC',
    	'#00CCFF',
    	'#3300CC',
    	'#3300FF',
    	'#3333CC',
    	'#3333FF',
    	'#3366CC',
    	'#3366FF',
    	'#3399CC',
    	'#3399FF',
    	'#33CC00',
    	'#33CC33',
    	'#33CC66',
    	'#33CC99',
    	'#33CCCC',
    	'#33CCFF',
    	'#6600CC',
    	'#6600FF',
    	'#6633CC',
    	'#6633FF',
    	'#66CC00',
    	'#66CC33',
    	'#9900CC',
    	'#9900FF',
    	'#9933CC',
    	'#9933FF',
    	'#99CC00',
    	'#99CC33',
    	'#CC0000',
    	'#CC0033',
    	'#CC0066',
    	'#CC0099',
    	'#CC00CC',
    	'#CC00FF',
    	'#CC3300',
    	'#CC3333',
    	'#CC3366',
    	'#CC3399',
    	'#CC33CC',
    	'#CC33FF',
    	'#CC6600',
    	'#CC6633',
    	'#CC9900',
    	'#CC9933',
    	'#CCCC00',
    	'#CCCC33',
    	'#FF0000',
    	'#FF0033',
    	'#FF0066',
    	'#FF0099',
    	'#FF00CC',
    	'#FF00FF',
    	'#FF3300',
    	'#FF3333',
    	'#FF3366',
    	'#FF3399',
    	'#FF33CC',
    	'#FF33FF',
    	'#FF6600',
    	'#FF6633',
    	'#FF9900',
    	'#FF9933',
    	'#FFCC00',
    	'#FFCC33'
    ];

    /**
     * Currently only WebKit-based Web Inspectors, Firefox >= v31,
     * and the Firebug extension (any Firefox version) are known
     * to support "%c" CSS customizations.
     *
     * TODO: add a `localStorage` variable to explicitly enable/disable colors
     */

    // eslint-disable-next-line complexity
    function useColors() {
    	// NB: In an Electron preload script, document will be defined but not fully
    	// initialized. Since we know we're in Chrome, we'll just detect this case
    	// explicitly
    	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
    		return true;
    	}

    	// Internet Explorer and Edge do not support colors.
    	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    		return false;
    	}

    	// Is webkit? http://stackoverflow.com/a/16459606/376773
    	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
    	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    		// Is firebug? http://stackoverflow.com/a/398120/376773
    		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    		// Is firefox >= v31?
    		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    		// Double check webkit in userAgent just in case we are in a worker
    		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
    }

    /**
     * Colorize log arguments if enabled.
     *
     * @api public
     */

    function formatArgs(args) {
    	args[0] = (this.useColors ? '%c' : '') +
    		this.namespace +
    		(this.useColors ? ' %c' : ' ') +
    		args[0] +
    		(this.useColors ? '%c ' : ' ') +
    		'+' + module.exports.humanize(this.diff);

    	if (!this.useColors) {
    		return;
    	}

    	const c = 'color: ' + this.color;
    	args.splice(1, 0, c, 'color: inherit');

    	// The final "%c" is somewhat tricky, because there could be other
    	// arguments passed either before or after the %c, so we need to
    	// figure out the correct index to insert the CSS into
    	let index = 0;
    	let lastC = 0;
    	args[0].replace(/%[a-zA-Z%]/g, match => {
    		if (match === '%%') {
    			return;
    		}
    		index++;
    		if (match === '%c') {
    			// We only are interested in the *last* %c
    			// (the user may have provided their own)
    			lastC = index;
    		}
    	});

    	args.splice(lastC, 0, c);
    }

    /**
     * Invokes `console.log()` when available.
     * No-op when `console.log` is not a "function".
     *
     * @api public
     */
    function log(...args) {
    	// This hackery is required for IE8/9, where
    	// the `console.log` function doesn't have 'apply'
    	return typeof console === 'object' &&
    		console.log &&
    		console.log(...args);
    }

    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */
    function save(namespaces) {
    	try {
    		if (namespaces) {
    			exports.storage.setItem('debug', namespaces);
    		} else {
    			exports.storage.removeItem('debug');
    		}
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}
    }

    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */
    function load() {
    	let r;
    	try {
    		r = exports.storage.getItem('debug');
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}

    	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
    	if (!r && typeof process !== 'undefined' && 'env' in process) {
    		r = process.env.DEBUG;
    	}

    	return r;
    }

    /**
     * Localstorage attempts to return the localstorage.
     *
     * This is necessary because safari throws
     * when a user disables cookies/localstorage
     * and you attempt to access it.
     *
     * @return {LocalStorage}
     * @api private
     */

    function localstorage() {
    	try {
    		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
    		// The Browser also has localStorage in the global context.
    		return localStorage;
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}
    }

    module.exports = common(exports);

    const {formatters} = module.exports;

    /**
     * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
     */

    formatters.j = function (v) {
    	try {
    		return JSON.stringify(v);
    	} catch (error) {
    		return '[UnexpectedJSONParseError]: ' + error.message;
    	}
    };
    });
    var browser_1 = browser.log;
    var browser_2 = browser.formatArgs;
    var browser_3 = browser.save;
    var browser_4 = browser.load;
    var browser_5 = browser.useColors;
    var browser_6 = browser.storage;
    var browser_7 = browser.colors;

    /**
     * Module dependencies.
     */


    var debug = browser('socket.io-client:url');

    /**
     * Module exports.
     */

    var url_1 = url;

    /**
     * URL parser.
     *
     * @param {String} url
     * @param {Object} An object meant to mimic window.location.
     *                 Defaults to window.location.
     * @api public
     */

    function url (uri, loc) {
      var obj = uri;

      // default to window.location
      loc = loc || (typeof location !== 'undefined' && location);
      if (null == uri) uri = loc.protocol + '//' + loc.host;

      // relative path support
      if ('string' === typeof uri) {
        if ('/' === uri.charAt(0)) {
          if ('/' === uri.charAt(1)) {
            uri = loc.protocol + uri;
          } else {
            uri = loc.host + uri;
          }
        }

        if (!/^(https?|wss?):\/\//.test(uri)) {
          debug('protocol-less url %s', uri);
          if ('undefined' !== typeof loc) {
            uri = loc.protocol + '//' + uri;
          } else {
            uri = 'https://' + uri;
          }
        }

        // parse
        debug('parse %s', uri);
        obj = parseuri(uri);
      }

      // make sure we treat `localhost:80` and `localhost` equally
      if (!obj.port) {
        if (/^(http|ws)$/.test(obj.protocol)) {
          obj.port = '80';
        } else if (/^(http|ws)s$/.test(obj.protocol)) {
          obj.port = '443';
        }
      }

      obj.path = obj.path || '/';

      var ipv6 = obj.host.indexOf(':') !== -1;
      var host = ipv6 ? '[' + obj.host + ']' : obj.host;

      // define unique id
      obj.id = obj.protocol + '://' + host + ':' + obj.port;
      // define href
      obj.href = obj.protocol + '://' + host + (loc && loc.port === obj.port ? '' : (':' + obj.port));

      return obj;
    }

    /**
     * Helpers.
     */

    var s$1 = 1000;
    var m$1 = s$1 * 60;
    var h$1 = m$1 * 60;
    var d$1 = h$1 * 24;
    var y$1 = d$1 * 365.25;

    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} [options]
     * @throws {Error} throw an error if val is not a non-empty string or a number
     * @return {String|Number}
     * @api public
     */

    var ms$1 = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === 'string' && val.length > 0) {
        return parse$1(val);
      } else if (type === 'number' && isNaN(val) === false) {
        return options.long ? fmtLong$1(val) : fmtShort$1(val);
      }
      throw new Error(
        'val is not a non-empty string or a valid number. val=' +
          JSON.stringify(val)
      );
    };

    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */

    function parse$1(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y$1;
        case 'days':
        case 'day':
        case 'd':
          return n * d$1;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h$1;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m$1;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s$1;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n;
        default:
          return undefined;
      }
    }

    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtShort$1(ms) {
      if (ms >= d$1) {
        return Math.round(ms / d$1) + 'd';
      }
      if (ms >= h$1) {
        return Math.round(ms / h$1) + 'h';
      }
      if (ms >= m$1) {
        return Math.round(ms / m$1) + 'm';
      }
      if (ms >= s$1) {
        return Math.round(ms / s$1) + 's';
      }
      return ms + 'ms';
    }

    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtLong$1(ms) {
      return plural$1(ms, d$1, 'day') ||
        plural$1(ms, h$1, 'hour') ||
        plural$1(ms, m$1, 'minute') ||
        plural$1(ms, s$1, 'second') ||
        ms + ' ms';
    }

    /**
     * Pluralization helper.
     */

    function plural$1(ms, n, name) {
      if (ms < n) {
        return;
      }
      if (ms < n * 1.5) {
        return Math.floor(ms / n) + ' ' + name;
      }
      return Math.ceil(ms / n) + ' ' + name + 's';
    }

    var debug$1 = createCommonjsModule(function (module, exports) {
    /**
     * This is the common logic for both the Node.js and web browser
     * implementations of `debug()`.
     *
     * Expose `debug()` as the module.
     */

    exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
    exports.coerce = coerce;
    exports.disable = disable;
    exports.enable = enable;
    exports.enabled = enabled;
    exports.humanize = ms$1;

    /**
     * Active `debug` instances.
     */
    exports.instances = [];

    /**
     * The currently active debug mode names, and names to skip.
     */

    exports.names = [];
    exports.skips = [];

    /**
     * Map of special "%n" handling functions, for the debug "format" argument.
     *
     * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
     */

    exports.formatters = {};

    /**
     * Select a color.
     * @param {String} namespace
     * @return {Number}
     * @api private
     */

    function selectColor(namespace) {
      var hash = 0, i;

      for (i in namespace) {
        hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }

      return exports.colors[Math.abs(hash) % exports.colors.length];
    }

    /**
     * Create a debugger with the given `namespace`.
     *
     * @param {String} namespace
     * @return {Function}
     * @api public
     */

    function createDebug(namespace) {

      var prevTime;

      function debug() {
        // disabled?
        if (!debug.enabled) return;

        var self = debug;

        // set `diff` timestamp
        var curr = +new Date();
        var ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;

        // turn the `arguments` into a proper Array
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }

        args[0] = exports.coerce(args[0]);

        if ('string' !== typeof args[0]) {
          // anything else let's inspect with %O
          args.unshift('%O');
        }

        // apply any `formatters` transformations
        var index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
          // if we encounter an escaped % then don't increase the array index
          if (match === '%%') return match;
          index++;
          var formatter = exports.formatters[format];
          if ('function' === typeof formatter) {
            var val = args[index];
            match = formatter.call(self, val);

            // now we need to remove `args[index]` since it's inlined in the `format`
            args.splice(index, 1);
            index--;
          }
          return match;
        });

        // apply env-specific formatting (colors, etc.)
        exports.formatArgs.call(self, args);

        var logFn = debug.log || exports.log || console.log.bind(console);
        logFn.apply(self, args);
      }

      debug.namespace = namespace;
      debug.enabled = exports.enabled(namespace);
      debug.useColors = exports.useColors();
      debug.color = selectColor(namespace);
      debug.destroy = destroy;

      // env-specific initialization logic for debug instances
      if ('function' === typeof exports.init) {
        exports.init(debug);
      }

      exports.instances.push(debug);

      return debug;
    }

    function destroy () {
      var index = exports.instances.indexOf(this);
      if (index !== -1) {
        exports.instances.splice(index, 1);
        return true;
      } else {
        return false;
      }
    }

    /**
     * Enables a debug mode by namespaces. This can include modes
     * separated by a colon and wildcards.
     *
     * @param {String} namespaces
     * @api public
     */

    function enable(namespaces) {
      exports.save(namespaces);

      exports.names = [];
      exports.skips = [];

      var i;
      var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
      var len = split.length;

      for (i = 0; i < len; i++) {
        if (!split[i]) continue; // ignore empty strings
        namespaces = split[i].replace(/\*/g, '.*?');
        if (namespaces[0] === '-') {
          exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
        } else {
          exports.names.push(new RegExp('^' + namespaces + '$'));
        }
      }

      for (i = 0; i < exports.instances.length; i++) {
        var instance = exports.instances[i];
        instance.enabled = exports.enabled(instance.namespace);
      }
    }

    /**
     * Disable debug output.
     *
     * @api public
     */

    function disable() {
      exports.enable('');
    }

    /**
     * Returns true if the given mode name is enabled, false otherwise.
     *
     * @param {String} name
     * @return {Boolean}
     * @api public
     */

    function enabled(name) {
      if (name[name.length - 1] === '*') {
        return true;
      }
      var i, len;
      for (i = 0, len = exports.skips.length; i < len; i++) {
        if (exports.skips[i].test(name)) {
          return false;
        }
      }
      for (i = 0, len = exports.names.length; i < len; i++) {
        if (exports.names[i].test(name)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Coerce `val`.
     *
     * @param {Mixed} val
     * @return {Mixed}
     * @api private
     */

    function coerce(val) {
      if (val instanceof Error) return val.stack || val.message;
      return val;
    }
    });
    var debug_1 = debug$1.coerce;
    var debug_2 = debug$1.disable;
    var debug_3 = debug$1.enable;
    var debug_4 = debug$1.enabled;
    var debug_5 = debug$1.humanize;
    var debug_6 = debug$1.instances;
    var debug_7 = debug$1.names;
    var debug_8 = debug$1.skips;
    var debug_9 = debug$1.formatters;

    var browser$1 = createCommonjsModule(function (module, exports) {
    /**
     * This is the web browser implementation of `debug()`.
     *
     * Expose `debug()` as the module.
     */

    exports = module.exports = debug$1;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = 'undefined' != typeof chrome
                   && 'undefined' != typeof chrome.storage
                      ? chrome.storage.local
                      : localstorage();

    /**
     * Colors.
     */

    exports.colors = [
      '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
      '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
      '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
      '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
      '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
      '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
      '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
      '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
      '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
      '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
      '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
    ];

    /**
     * Currently only WebKit-based Web Inspectors, Firefox >= v31,
     * and the Firebug extension (any Firefox version) are known
     * to support "%c" CSS customizations.
     *
     * TODO: add a `localStorage` variable to explicitly enable/disable colors
     */

    function useColors() {
      // NB: In an Electron preload script, document will be defined but not fully
      // initialized. Since we know we're in Chrome, we'll just detect this case
      // explicitly
      if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
        return true;
      }

      // Internet Explorer and Edge do not support colors.
      if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }

      // is webkit? http://stackoverflow.com/a/16459606/376773
      // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
      return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
        // is firebug? http://stackoverflow.com/a/398120/376773
        (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
        // is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
        // double check webkit in userAgent just in case we are in a worker
        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
    }

    /**
     * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
     */

    exports.formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (err) {
        return '[UnexpectedJSONParseError]: ' + err.message;
      }
    };


    /**
     * Colorize log arguments if enabled.
     *
     * @api public
     */

    function formatArgs(args) {
      var useColors = this.useColors;

      args[0] = (useColors ? '%c' : '')
        + this.namespace
        + (useColors ? ' %c' : ' ')
        + args[0]
        + (useColors ? '%c ' : ' ')
        + '+' + exports.humanize(this.diff);

      if (!useColors) return;

      var c = 'color: ' + this.color;
      args.splice(1, 0, c, 'color: inherit');

      // the final "%c" is somewhat tricky, because there could be other
      // arguments passed either before or after the %c, so we need to
      // figure out the correct index to insert the CSS into
      var index = 0;
      var lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, function(match) {
        if ('%%' === match) return;
        index++;
        if ('%c' === match) {
          // we only are interested in the *last* %c
          // (the user may have provided their own)
          lastC = index;
        }
      });

      args.splice(lastC, 0, c);
    }

    /**
     * Invokes `console.log()` when available.
     * No-op when `console.log` is not a "function".
     *
     * @api public
     */

    function log() {
      // this hackery is required for IE8/9, where
      // the `console.log` function doesn't have 'apply'
      return 'object' === typeof console
        && console.log
        && Function.prototype.apply.call(console.log, console, arguments);
    }

    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */

    function save(namespaces) {
      try {
        if (null == namespaces) {
          exports.storage.removeItem('debug');
        } else {
          exports.storage.debug = namespaces;
        }
      } catch(e) {}
    }

    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */

    function load() {
      var r;
      try {
        r = exports.storage.debug;
      } catch(e) {}

      // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
      if (!r && typeof process !== 'undefined' && 'env' in process) {
        r = process.env.DEBUG;
      }

      return r;
    }

    /**
     * Enable namespaces listed in `localStorage.debug` initially.
     */

    exports.enable(load());

    /**
     * Localstorage attempts to return the localstorage.
     *
     * This is necessary because safari throws
     * when a user disables cookies/localstorage
     * and you attempt to access it.
     *
     * @return {LocalStorage}
     * @api private
     */

    function localstorage() {
      try {
        return window.localStorage;
      } catch (e) {}
    }
    });
    var browser_1$1 = browser$1.log;
    var browser_2$1 = browser$1.formatArgs;
    var browser_3$1 = browser$1.save;
    var browser_4$1 = browser$1.load;
    var browser_5$1 = browser$1.useColors;
    var browser_6$1 = browser$1.storage;
    var browser_7$1 = browser$1.colors;

    var componentEmitter = createCommonjsModule(function (module) {
    /**
     * Expose `Emitter`.
     */

    {
      module.exports = Emitter;
    }

    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */

    function Emitter(obj) {
      if (obj) return mixin(obj);
    }
    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */

    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }

    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
      (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
      return this;
    };

    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.once = function(event, fn){
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }

      on.fn = fn;
      this.on(event, on);
      return this;
    };

    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};

      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }

      // specific event
      var callbacks = this._callbacks['$' + event];
      if (!callbacks) return this;

      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
      }

      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      return this;
    };

    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */

    Emitter.prototype.emit = function(event){
      this._callbacks = this._callbacks || {};
      var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks['$' + event];

      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }

      return this;
    };

    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */

    Emitter.prototype.listeners = function(event){
      this._callbacks = this._callbacks || {};
      return this._callbacks['$' + event] || [];
    };

    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */

    Emitter.prototype.hasListeners = function(event){
      return !! this.listeners(event).length;
    };
    });

    var toString = {}.toString;

    var isarray = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    var isBuffer = isBuf;

    var withNativeBuffer = typeof Buffer === 'function' && typeof Buffer.isBuffer === 'function';
    var withNativeArrayBuffer = typeof ArrayBuffer === 'function';

    var isView = function (obj) {
      return typeof ArrayBuffer.isView === 'function' ? ArrayBuffer.isView(obj) : (obj.buffer instanceof ArrayBuffer);
    };

    /**
     * Returns true if obj is a buffer or an arraybuffer.
     *
     * @api private
     */

    function isBuf(obj) {
      return (withNativeBuffer && Buffer.isBuffer(obj)) ||
              (withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)));
    }

    /*global Blob,File*/

    /**
     * Module requirements
     */



    var toString$1 = Object.prototype.toString;
    var withNativeBlob = typeof Blob === 'function' || (typeof Blob !== 'undefined' && toString$1.call(Blob) === '[object BlobConstructor]');
    var withNativeFile = typeof File === 'function' || (typeof File !== 'undefined' && toString$1.call(File) === '[object FileConstructor]');

    /**
     * Replaces every Buffer | ArrayBuffer in packet with a numbered placeholder.
     * Anything with blobs or files should be fed through removeBlobs before coming
     * here.
     *
     * @param {Object} packet - socket.io event packet
     * @return {Object} with deconstructed packet and list of buffers
     * @api public
     */

    var deconstructPacket = function(packet) {
      var buffers = [];
      var packetData = packet.data;
      var pack = packet;
      pack.data = _deconstructPacket(packetData, buffers);
      pack.attachments = buffers.length; // number of binary 'attachments'
      return {packet: pack, buffers: buffers};
    };

    function _deconstructPacket(data, buffers) {
      if (!data) return data;

      if (isBuffer(data)) {
        var placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
      } else if (isarray(data)) {
        var newData = new Array(data.length);
        for (var i = 0; i < data.length; i++) {
          newData[i] = _deconstructPacket(data[i], buffers);
        }
        return newData;
      } else if (typeof data === 'object' && !(data instanceof Date)) {
        var newData = {};
        for (var key in data) {
          newData[key] = _deconstructPacket(data[key], buffers);
        }
        return newData;
      }
      return data;
    }

    /**
     * Reconstructs a binary packet from its placeholder packet and buffers
     *
     * @param {Object} packet - event packet with placeholders
     * @param {Array} buffers - binary buffers to put in placeholder positions
     * @return {Object} reconstructed packet
     * @api public
     */

    var reconstructPacket = function(packet, buffers) {
      packet.data = _reconstructPacket(packet.data, buffers);
      packet.attachments = undefined; // no longer useful
      return packet;
    };

    function _reconstructPacket(data, buffers) {
      if (!data) return data;

      if (data && data._placeholder) {
        return buffers[data.num]; // appropriate buffer (should be natural order anyway)
      } else if (isarray(data)) {
        for (var i = 0; i < data.length; i++) {
          data[i] = _reconstructPacket(data[i], buffers);
        }
      } else if (typeof data === 'object') {
        for (var key in data) {
          data[key] = _reconstructPacket(data[key], buffers);
        }
      }

      return data;
    }

    /**
     * Asynchronously removes Blobs or Files from data via
     * FileReader's readAsArrayBuffer method. Used before encoding
     * data as msgpack. Calls callback with the blobless data.
     *
     * @param {Object} data
     * @param {Function} callback
     * @api private
     */

    var removeBlobs = function(data, callback) {
      function _removeBlobs(obj, curKey, containingObject) {
        if (!obj) return obj;

        // convert any blob
        if ((withNativeBlob && obj instanceof Blob) ||
            (withNativeFile && obj instanceof File)) {
          pendingBlobs++;

          // async filereader
          var fileReader = new FileReader();
          fileReader.onload = function() { // this.result == arraybuffer
            if (containingObject) {
              containingObject[curKey] = this.result;
            }
            else {
              bloblessData = this.result;
            }

            // if nothing pending its callback time
            if(! --pendingBlobs) {
              callback(bloblessData);
            }
          };

          fileReader.readAsArrayBuffer(obj); // blob -> arraybuffer
        } else if (isarray(obj)) { // handle array
          for (var i = 0; i < obj.length; i++) {
            _removeBlobs(obj[i], i, obj);
          }
        } else if (typeof obj === 'object' && !isBuffer(obj)) { // and object
          for (var key in obj) {
            _removeBlobs(obj[key], key, obj);
          }
        }
      }

      var pendingBlobs = 0;
      var bloblessData = data;
      _removeBlobs(bloblessData);
      if (!pendingBlobs) {
        callback(bloblessData);
      }
    };

    var binary = {
    	deconstructPacket: deconstructPacket,
    	reconstructPacket: reconstructPacket,
    	removeBlobs: removeBlobs
    };

    var socket_ioParser = createCommonjsModule(function (module, exports) {
    /**
     * Module dependencies.
     */

    var debug = browser$1('socket.io-parser');





    /**
     * Protocol version.
     *
     * @api public
     */

    exports.protocol = 4;

    /**
     * Packet types.
     *
     * @api public
     */

    exports.types = [
      'CONNECT',
      'DISCONNECT',
      'EVENT',
      'ACK',
      'ERROR',
      'BINARY_EVENT',
      'BINARY_ACK'
    ];

    /**
     * Packet type `connect`.
     *
     * @api public
     */

    exports.CONNECT = 0;

    /**
     * Packet type `disconnect`.
     *
     * @api public
     */

    exports.DISCONNECT = 1;

    /**
     * Packet type `event`.
     *
     * @api public
     */

    exports.EVENT = 2;

    /**
     * Packet type `ack`.
     *
     * @api public
     */

    exports.ACK = 3;

    /**
     * Packet type `error`.
     *
     * @api public
     */

    exports.ERROR = 4;

    /**
     * Packet type 'binary event'
     *
     * @api public
     */

    exports.BINARY_EVENT = 5;

    /**
     * Packet type `binary ack`. For acks with binary arguments.
     *
     * @api public
     */

    exports.BINARY_ACK = 6;

    /**
     * Encoder constructor.
     *
     * @api public
     */

    exports.Encoder = Encoder;

    /**
     * Decoder constructor.
     *
     * @api public
     */

    exports.Decoder = Decoder;

    /**
     * A socket.io Encoder instance
     *
     * @api public
     */

    function Encoder() {}

    var ERROR_PACKET = exports.ERROR + '"encode error"';

    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     * @param {Function} callback - function to handle encodings (likely engine.write)
     * @return Calls callback with Array of encodings
     * @api public
     */

    Encoder.prototype.encode = function(obj, callback){
      debug('encoding packet %j', obj);

      if (exports.BINARY_EVENT === obj.type || exports.BINARY_ACK === obj.type) {
        encodeAsBinary(obj, callback);
      } else {
        var encoding = encodeAsString(obj);
        callback([encoding]);
      }
    };

    /**
     * Encode packet as string.
     *
     * @param {Object} packet
     * @return {String} encoded
     * @api private
     */

    function encodeAsString(obj) {

      // first is type
      var str = '' + obj.type;

      // attachments if we have them
      if (exports.BINARY_EVENT === obj.type || exports.BINARY_ACK === obj.type) {
        str += obj.attachments + '-';
      }

      // if we have a namespace other than `/`
      // we append it followed by a comma `,`
      if (obj.nsp && '/' !== obj.nsp) {
        str += obj.nsp + ',';
      }

      // immediately followed by the id
      if (null != obj.id) {
        str += obj.id;
      }

      // json data
      if (null != obj.data) {
        var payload = tryStringify(obj.data);
        if (payload !== false) {
          str += payload;
        } else {
          return ERROR_PACKET;
        }
      }

      debug('encoded %j as %s', obj, str);
      return str;
    }

    function tryStringify(str) {
      try {
        return JSON.stringify(str);
      } catch(e){
        return false;
      }
    }

    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     *
     * @param {Object} packet
     * @return {Buffer} encoded
     * @api private
     */

    function encodeAsBinary(obj, callback) {

      function writeEncoding(bloblessData) {
        var deconstruction = binary.deconstructPacket(bloblessData);
        var pack = encodeAsString(deconstruction.packet);
        var buffers = deconstruction.buffers;

        buffers.unshift(pack); // add packet info to beginning of data list
        callback(buffers); // write all the buffers
      }

      binary.removeBlobs(obj, writeEncoding);
    }

    /**
     * A socket.io Decoder instance
     *
     * @return {Object} decoder
     * @api public
     */

    function Decoder() {
      this.reconstructor = null;
    }

    /**
     * Mix in `Emitter` with Decoder.
     */

    componentEmitter(Decoder.prototype);

    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     * @return {Object} packet
     * @api public
     */

    Decoder.prototype.add = function(obj) {
      var packet;
      if (typeof obj === 'string') {
        packet = decodeString(obj);
        if (exports.BINARY_EVENT === packet.type || exports.BINARY_ACK === packet.type) { // binary packet's json
          this.reconstructor = new BinaryReconstructor(packet);

          // no attachments, labeled binary but no binary data to follow
          if (this.reconstructor.reconPack.attachments === 0) {
            this.emit('decoded', packet);
          }
        } else { // non-binary full packet
          this.emit('decoded', packet);
        }
      } else if (isBuffer(obj) || obj.base64) { // raw binary data
        if (!this.reconstructor) {
          throw new Error('got binary data when not reconstructing a packet');
        } else {
          packet = this.reconstructor.takeBinaryData(obj);
          if (packet) { // received final buffer
            this.reconstructor = null;
            this.emit('decoded', packet);
          }
        }
      } else {
        throw new Error('Unknown type: ' + obj);
      }
    };

    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     * @api private
     */

    function decodeString(str) {
      var i = 0;
      // look up type
      var p = {
        type: Number(str.charAt(0))
      };

      if (null == exports.types[p.type]) {
        return error('unknown packet type ' + p.type);
      }

      // look up attachments if type binary
      if (exports.BINARY_EVENT === p.type || exports.BINARY_ACK === p.type) {
        var buf = '';
        while (str.charAt(++i) !== '-') {
          buf += str.charAt(i);
          if (i == str.length) break;
        }
        if (buf != Number(buf) || str.charAt(i) !== '-') {
          throw new Error('Illegal attachments');
        }
        p.attachments = Number(buf);
      }

      // look up namespace (if any)
      if ('/' === str.charAt(i + 1)) {
        p.nsp = '';
        while (++i) {
          var c = str.charAt(i);
          if (',' === c) break;
          p.nsp += c;
          if (i === str.length) break;
        }
      } else {
        p.nsp = '/';
      }

      // look up id
      var next = str.charAt(i + 1);
      if ('' !== next && Number(next) == next) {
        p.id = '';
        while (++i) {
          var c = str.charAt(i);
          if (null == c || Number(c) != c) {
            --i;
            break;
          }
          p.id += str.charAt(i);
          if (i === str.length) break;
        }
        p.id = Number(p.id);
      }

      // look up json data
      if (str.charAt(++i)) {
        var payload = tryParse(str.substr(i));
        var isPayloadValid = payload !== false && (p.type === exports.ERROR || isarray(payload));
        if (isPayloadValid) {
          p.data = payload;
        } else {
          return error('invalid payload');
        }
      }

      debug('decoded %s as %j', str, p);
      return p;
    }

    function tryParse(str) {
      try {
        return JSON.parse(str);
      } catch(e){
        return false;
      }
    }

    /**
     * Deallocates a parser's resources
     *
     * @api public
     */

    Decoder.prototype.destroy = function() {
      if (this.reconstructor) {
        this.reconstructor.finishedReconstruction();
      }
    };

    /**
     * A manager of a binary event's 'buffer sequence'. Should
     * be constructed whenever a packet of type BINARY_EVENT is
     * decoded.
     *
     * @param {Object} packet
     * @return {BinaryReconstructor} initialized reconstructor
     * @api private
     */

    function BinaryReconstructor(packet) {
      this.reconPack = packet;
      this.buffers = [];
    }

    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     * @api private
     */

    BinaryReconstructor.prototype.takeBinaryData = function(binData) {
      this.buffers.push(binData);
      if (this.buffers.length === this.reconPack.attachments) { // done with buffer list
        var packet = binary.reconstructPacket(this.reconPack, this.buffers);
        this.finishedReconstruction();
        return packet;
      }
      return null;
    };

    /**
     * Cleans up binary packet reconstruction variables.
     *
     * @api private
     */

    BinaryReconstructor.prototype.finishedReconstruction = function() {
      this.reconPack = null;
      this.buffers = [];
    };

    function error(msg) {
      return {
        type: exports.ERROR,
        data: 'parser error: ' + msg
      };
    }
    });
    var socket_ioParser_1 = socket_ioParser.protocol;
    var socket_ioParser_2 = socket_ioParser.types;
    var socket_ioParser_3 = socket_ioParser.CONNECT;
    var socket_ioParser_4 = socket_ioParser.DISCONNECT;
    var socket_ioParser_5 = socket_ioParser.EVENT;
    var socket_ioParser_6 = socket_ioParser.ACK;
    var socket_ioParser_7 = socket_ioParser.ERROR;
    var socket_ioParser_8 = socket_ioParser.BINARY_EVENT;
    var socket_ioParser_9 = socket_ioParser.BINARY_ACK;
    var socket_ioParser_10 = socket_ioParser.Encoder;
    var socket_ioParser_11 = socket_ioParser.Decoder;

    var hasCors = createCommonjsModule(function (module) {
    /**
     * Module exports.
     *
     * Logic borrowed from Modernizr:
     *
     *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
     */

    try {
      module.exports = typeof XMLHttpRequest !== 'undefined' &&
        'withCredentials' in new XMLHttpRequest();
    } catch (err) {
      // if XMLHttp support is disabled in IE then it will throw
      // when trying to create
      module.exports = false;
    }
    });

    // browser shim for xmlhttprequest module



    var xmlhttprequest = function (opts) {
      var xdomain = opts.xdomain;

      // scheme must be same when usign XDomainRequest
      // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
      var xscheme = opts.xscheme;

      // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
      // https://github.com/Automattic/engine.io-client/pull/217
      var enablesXDR = opts.enablesXDR;

      // XMLHttpRequest can be disabled on IE
      try {
        if ('undefined' !== typeof XMLHttpRequest && (!xdomain || hasCors)) {
          return new XMLHttpRequest();
        }
      } catch (e) { }

      // Use XDomainRequest for IE8 if enablesXDR is true
      // because loading bar keeps flashing when using jsonp-polling
      // https://github.com/yujiosaka/socke.io-ie8-loading-example
      try {
        if ('undefined' !== typeof XDomainRequest && !xscheme && enablesXDR) {
          return new XDomainRequest();
        }
      } catch (e) { }

      if (!xdomain) {
        try {
          return new self[['Active'].concat('Object').join('X')]('Microsoft.XMLHTTP');
        } catch (e) { }
      }
    };

    /**
     * Gets the keys for an object.
     *
     * @return {Array} keys
     * @api private
     */

    var keys = Object.keys || function keys (obj){
      var arr = [];
      var has = Object.prototype.hasOwnProperty;

      for (var i in obj) {
        if (has.call(obj, i)) {
          arr.push(i);
        }
      }
      return arr;
    };

    var toString$2 = {}.toString;

    var isarray$1 = Array.isArray || function (arr) {
      return toString$2.call(arr) == '[object Array]';
    };

    /* global Blob File */

    /*
     * Module requirements.
     */



    var toString$3 = Object.prototype.toString;
    var withNativeBlob$1 = typeof Blob === 'function' ||
                            typeof Blob !== 'undefined' && toString$3.call(Blob) === '[object BlobConstructor]';
    var withNativeFile$1 = typeof File === 'function' ||
                            typeof File !== 'undefined' && toString$3.call(File) === '[object FileConstructor]';

    /**
     * Module exports.
     */

    var hasBinary2 = hasBinary;

    /**
     * Checks for binary data.
     *
     * Supports Buffer, ArrayBuffer, Blob and File.
     *
     * @param {Object} anything
     * @api public
     */

    function hasBinary (obj) {
      if (!obj || typeof obj !== 'object') {
        return false;
      }

      if (isarray$1(obj)) {
        for (var i = 0, l = obj.length; i < l; i++) {
          if (hasBinary(obj[i])) {
            return true;
          }
        }
        return false;
      }

      if ((typeof Buffer === 'function' && Buffer.isBuffer && Buffer.isBuffer(obj)) ||
        (typeof ArrayBuffer === 'function' && obj instanceof ArrayBuffer) ||
        (withNativeBlob$1 && obj instanceof Blob) ||
        (withNativeFile$1 && obj instanceof File)
      ) {
        return true;
      }

      // see: https://github.com/Automattic/has-binary/pull/4
      if (obj.toJSON && typeof obj.toJSON === 'function' && arguments.length === 1) {
        return hasBinary(obj.toJSON(), true);
      }

      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
          return true;
        }
      }

      return false;
    }

    /**
     * An abstraction for slicing an arraybuffer even when
     * ArrayBuffer.prototype.slice is not supported
     *
     * @api public
     */

    var arraybuffer_slice = function(arraybuffer, start, end) {
      var bytes = arraybuffer.byteLength;
      start = start || 0;
      end = end || bytes;

      if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

      if (start < 0) { start += bytes; }
      if (end < 0) { end += bytes; }
      if (end > bytes) { end = bytes; }

      if (start >= bytes || start >= end || bytes === 0) {
        return new ArrayBuffer(0);
      }

      var abv = new Uint8Array(arraybuffer);
      var result = new Uint8Array(end - start);
      for (var i = start, ii = 0; i < end; i++, ii++) {
        result[ii] = abv[i];
      }
      return result.buffer;
    };

    var after_1 = after;

    function after(count, callback, err_cb) {
        var bail = false;
        err_cb = err_cb || noop$1;
        proxy.count = count;

        return (count === 0) ? callback() : proxy

        function proxy(err, result) {
            if (proxy.count <= 0) {
                throw new Error('after called too many times')
            }
            --proxy.count;

            // after first error, rest are passed to err_cb
            if (err) {
                bail = true;
                callback(err);
                // future error callbacks will go to error handler
                callback = err_cb;
            } else if (proxy.count === 0 && !bail) {
                callback(null, result);
            }
        }
    }

    function noop$1() {}

    /*! https://mths.be/utf8js v2.1.2 by @mathias */

    var stringFromCharCode = String.fromCharCode;

    // Taken from https://mths.be/punycode
    function ucs2decode(string) {
    	var output = [];
    	var counter = 0;
    	var length = string.length;
    	var value;
    	var extra;
    	while (counter < length) {
    		value = string.charCodeAt(counter++);
    		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
    			// high surrogate, and there is a next character
    			extra = string.charCodeAt(counter++);
    			if ((extra & 0xFC00) == 0xDC00) { // low surrogate
    				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
    			} else {
    				// unmatched surrogate; only append this code unit, in case the next
    				// code unit is the high surrogate of a surrogate pair
    				output.push(value);
    				counter--;
    			}
    		} else {
    			output.push(value);
    		}
    	}
    	return output;
    }

    // Taken from https://mths.be/punycode
    function ucs2encode(array) {
    	var length = array.length;
    	var index = -1;
    	var value;
    	var output = '';
    	while (++index < length) {
    		value = array[index];
    		if (value > 0xFFFF) {
    			value -= 0x10000;
    			output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
    			value = 0xDC00 | value & 0x3FF;
    		}
    		output += stringFromCharCode(value);
    	}
    	return output;
    }

    function checkScalarValue(codePoint, strict) {
    	if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
    		if (strict) {
    			throw Error(
    				'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
    				' is not a scalar value'
    			);
    		}
    		return false;
    	}
    	return true;
    }
    /*--------------------------------------------------------------------------*/

    function createByte(codePoint, shift) {
    	return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
    }

    function encodeCodePoint(codePoint, strict) {
    	if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
    		return stringFromCharCode(codePoint);
    	}
    	var symbol = '';
    	if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
    		symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
    	}
    	else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
    		if (!checkScalarValue(codePoint, strict)) {
    			codePoint = 0xFFFD;
    		}
    		symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
    		symbol += createByte(codePoint, 6);
    	}
    	else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
    		symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
    		symbol += createByte(codePoint, 12);
    		symbol += createByte(codePoint, 6);
    	}
    	symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
    	return symbol;
    }

    function utf8encode(string, opts) {
    	opts = opts || {};
    	var strict = false !== opts.strict;

    	var codePoints = ucs2decode(string);
    	var length = codePoints.length;
    	var index = -1;
    	var codePoint;
    	var byteString = '';
    	while (++index < length) {
    		codePoint = codePoints[index];
    		byteString += encodeCodePoint(codePoint, strict);
    	}
    	return byteString;
    }

    /*--------------------------------------------------------------------------*/

    function readContinuationByte() {
    	if (byteIndex >= byteCount) {
    		throw Error('Invalid byte index');
    	}

    	var continuationByte = byteArray[byteIndex] & 0xFF;
    	byteIndex++;

    	if ((continuationByte & 0xC0) == 0x80) {
    		return continuationByte & 0x3F;
    	}

    	// If we end up here, it’s not a continuation byte
    	throw Error('Invalid continuation byte');
    }

    function decodeSymbol(strict) {
    	var byte1;
    	var byte2;
    	var byte3;
    	var byte4;
    	var codePoint;

    	if (byteIndex > byteCount) {
    		throw Error('Invalid byte index');
    	}

    	if (byteIndex == byteCount) {
    		return false;
    	}

    	// Read first byte
    	byte1 = byteArray[byteIndex] & 0xFF;
    	byteIndex++;

    	// 1-byte sequence (no continuation bytes)
    	if ((byte1 & 0x80) == 0) {
    		return byte1;
    	}

    	// 2-byte sequence
    	if ((byte1 & 0xE0) == 0xC0) {
    		byte2 = readContinuationByte();
    		codePoint = ((byte1 & 0x1F) << 6) | byte2;
    		if (codePoint >= 0x80) {
    			return codePoint;
    		} else {
    			throw Error('Invalid continuation byte');
    		}
    	}

    	// 3-byte sequence (may include unpaired surrogates)
    	if ((byte1 & 0xF0) == 0xE0) {
    		byte2 = readContinuationByte();
    		byte3 = readContinuationByte();
    		codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
    		if (codePoint >= 0x0800) {
    			return checkScalarValue(codePoint, strict) ? codePoint : 0xFFFD;
    		} else {
    			throw Error('Invalid continuation byte');
    		}
    	}

    	// 4-byte sequence
    	if ((byte1 & 0xF8) == 0xF0) {
    		byte2 = readContinuationByte();
    		byte3 = readContinuationByte();
    		byte4 = readContinuationByte();
    		codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
    			(byte3 << 0x06) | byte4;
    		if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
    			return codePoint;
    		}
    	}

    	throw Error('Invalid UTF-8 detected');
    }

    var byteArray;
    var byteCount;
    var byteIndex;
    function utf8decode(byteString, opts) {
    	opts = opts || {};
    	var strict = false !== opts.strict;

    	byteArray = ucs2decode(byteString);
    	byteCount = byteArray.length;
    	byteIndex = 0;
    	var codePoints = [];
    	var tmp;
    	while ((tmp = decodeSymbol(strict)) !== false) {
    		codePoints.push(tmp);
    	}
    	return ucs2encode(codePoints);
    }

    var utf8 = {
    	version: '2.1.2',
    	encode: utf8encode,
    	decode: utf8decode
    };

    var base64Arraybuffer = createCommonjsModule(function (module, exports) {
    /*
     * base64-arraybuffer
     * https://github.com/niklasvh/base64-arraybuffer
     *
     * Copyright (c) 2012 Niklas von Hertzen
     * Licensed under the MIT license.
     */
    (function(){

      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

      // Use a lookup table to find the index.
      var lookup = new Uint8Array(256);
      for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
      }

      exports.encode = function(arraybuffer) {
        var bytes = new Uint8Array(arraybuffer),
        i, len = bytes.length, base64 = "";

        for (i = 0; i < len; i+=3) {
          base64 += chars[bytes[i] >> 2];
          base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
          base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
          base64 += chars[bytes[i + 2] & 63];
        }

        if ((len % 3) === 2) {
          base64 = base64.substring(0, base64.length - 1) + "=";
        } else if (len % 3 === 1) {
          base64 = base64.substring(0, base64.length - 2) + "==";
        }

        return base64;
      };

      exports.decode =  function(base64) {
        var bufferLength = base64.length * 0.75,
        len = base64.length, i, p = 0,
        encoded1, encoded2, encoded3, encoded4;

        if (base64[base64.length - 1] === "=") {
          bufferLength--;
          if (base64[base64.length - 2] === "=") {
            bufferLength--;
          }
        }

        var arraybuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arraybuffer);

        for (i = 0; i < len; i+=4) {
          encoded1 = lookup[base64.charCodeAt(i)];
          encoded2 = lookup[base64.charCodeAt(i+1)];
          encoded3 = lookup[base64.charCodeAt(i+2)];
          encoded4 = lookup[base64.charCodeAt(i+3)];

          bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
          bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
          bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        return arraybuffer;
      };
    })();
    });
    var base64Arraybuffer_1 = base64Arraybuffer.encode;
    var base64Arraybuffer_2 = base64Arraybuffer.decode;

    /**
     * Create a blob builder even when vendor prefixes exist
     */

    var BlobBuilder = typeof BlobBuilder !== 'undefined' ? BlobBuilder :
      typeof WebKitBlobBuilder !== 'undefined' ? WebKitBlobBuilder :
      typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder :
      typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder : 
      false;

    /**
     * Check if Blob constructor is supported
     */

    var blobSupported = (function() {
      try {
        var a = new Blob(['hi']);
        return a.size === 2;
      } catch(e) {
        return false;
      }
    })();

    /**
     * Check if Blob constructor supports ArrayBufferViews
     * Fails in Safari 6, so we need to map to ArrayBuffers there.
     */

    var blobSupportsArrayBufferView = blobSupported && (function() {
      try {
        var b = new Blob([new Uint8Array([1,2])]);
        return b.size === 2;
      } catch(e) {
        return false;
      }
    })();

    /**
     * Check if BlobBuilder is supported
     */

    var blobBuilderSupported = BlobBuilder
      && BlobBuilder.prototype.append
      && BlobBuilder.prototype.getBlob;

    /**
     * Helper function that maps ArrayBufferViews to ArrayBuffers
     * Used by BlobBuilder constructor and old browsers that didn't
     * support it in the Blob constructor.
     */

    function mapArrayBufferViews(ary) {
      return ary.map(function(chunk) {
        if (chunk.buffer instanceof ArrayBuffer) {
          var buf = chunk.buffer;

          // if this is a subarray, make a copy so we only
          // include the subarray region from the underlying buffer
          if (chunk.byteLength !== buf.byteLength) {
            var copy = new Uint8Array(chunk.byteLength);
            copy.set(new Uint8Array(buf, chunk.byteOffset, chunk.byteLength));
            buf = copy.buffer;
          }

          return buf;
        }

        return chunk;
      });
    }

    function BlobBuilderConstructor(ary, options) {
      options = options || {};

      var bb = new BlobBuilder();
      mapArrayBufferViews(ary).forEach(function(part) {
        bb.append(part);
      });

      return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
    }
    function BlobConstructor(ary, options) {
      return new Blob(mapArrayBufferViews(ary), options || {});
    }
    if (typeof Blob !== 'undefined') {
      BlobBuilderConstructor.prototype = Blob.prototype;
      BlobConstructor.prototype = Blob.prototype;
    }

    var blob = (function() {
      if (blobSupported) {
        return blobSupportsArrayBufferView ? Blob : BlobConstructor;
      } else if (blobBuilderSupported) {
        return BlobBuilderConstructor;
      } else {
        return undefined;
      }
    })();

    var browser$2 = createCommonjsModule(function (module, exports) {
    /**
     * Module dependencies.
     */







    var base64encoder;
    if (typeof ArrayBuffer !== 'undefined') {
      base64encoder = base64Arraybuffer;
    }

    /**
     * Check if we are running an android browser. That requires us to use
     * ArrayBuffer with polling transports...
     *
     * http://ghinda.net/jpeg-blob-ajax-android/
     */

    var isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    /**
     * Check if we are running in PhantomJS.
     * Uploading a Blob with PhantomJS does not work correctly, as reported here:
     * https://github.com/ariya/phantomjs/issues/11395
     * @type boolean
     */
    var isPhantomJS = typeof navigator !== 'undefined' && /PhantomJS/i.test(navigator.userAgent);

    /**
     * When true, avoids using Blobs to encode payloads.
     * @type boolean
     */
    var dontSendBlobs = isAndroid || isPhantomJS;

    /**
     * Current protocol version.
     */

    exports.protocol = 3;

    /**
     * Packet types.
     */

    var packets = exports.packets = {
        open:     0    // non-ws
      , close:    1    // non-ws
      , ping:     2
      , pong:     3
      , message:  4
      , upgrade:  5
      , noop:     6
    };

    var packetslist = keys(packets);

    /**
     * Premade error packet.
     */

    var err = { type: 'error', data: 'parser error' };

    /**
     * Create a blob api even for blob builder when vendor prefixes exist
     */



    /**
     * Encodes a packet.
     *
     *     <packet type id> [ <data> ]
     *
     * Example:
     *
     *     5hello world
     *     3
     *     4
     *
     * Binary is encoded in an identical principle
     *
     * @api private
     */

    exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
      if (typeof supportsBinary === 'function') {
        callback = supportsBinary;
        supportsBinary = false;
      }

      if (typeof utf8encode === 'function') {
        callback = utf8encode;
        utf8encode = null;
      }

      var data = (packet.data === undefined)
        ? undefined
        : packet.data.buffer || packet.data;

      if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
        return encodeArrayBuffer(packet, supportsBinary, callback);
      } else if (typeof blob !== 'undefined' && data instanceof blob) {
        return encodeBlob(packet, supportsBinary, callback);
      }

      // might be an object with { base64: true, data: dataAsBase64String }
      if (data && data.base64) {
        return encodeBase64Object(packet, callback);
      }

      // Sending data as a utf-8 string
      var encoded = packets[packet.type];

      // data fragment is optional
      if (undefined !== packet.data) {
        encoded += utf8encode ? utf8.encode(String(packet.data), { strict: false }) : String(packet.data);
      }

      return callback('' + encoded);

    };

    function encodeBase64Object(packet, callback) {
      // packet data is an object { base64: true, data: dataAsBase64String }
      var message = 'b' + exports.packets[packet.type] + packet.data.data;
      return callback(message);
    }

    /**
     * Encode packet helpers for binary types
     */

    function encodeArrayBuffer(packet, supportsBinary, callback) {
      if (!supportsBinary) {
        return exports.encodeBase64Packet(packet, callback);
      }

      var data = packet.data;
      var contentArray = new Uint8Array(data);
      var resultBuffer = new Uint8Array(1 + data.byteLength);

      resultBuffer[0] = packets[packet.type];
      for (var i = 0; i < contentArray.length; i++) {
        resultBuffer[i+1] = contentArray[i];
      }

      return callback(resultBuffer.buffer);
    }

    function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
      if (!supportsBinary) {
        return exports.encodeBase64Packet(packet, callback);
      }

      var fr = new FileReader();
      fr.onload = function() {
        exports.encodePacket({ type: packet.type, data: fr.result }, supportsBinary, true, callback);
      };
      return fr.readAsArrayBuffer(packet.data);
    }

    function encodeBlob(packet, supportsBinary, callback) {
      if (!supportsBinary) {
        return exports.encodeBase64Packet(packet, callback);
      }

      if (dontSendBlobs) {
        return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
      }

      var length = new Uint8Array(1);
      length[0] = packets[packet.type];
      var blob$1 = new blob([length.buffer, packet.data]);

      return callback(blob$1);
    }

    /**
     * Encodes a packet with binary data in a base64 string
     *
     * @param {Object} packet, has `type` and `data`
     * @return {String} base64 encoded message
     */

    exports.encodeBase64Packet = function(packet, callback) {
      var message = 'b' + exports.packets[packet.type];
      if (typeof blob !== 'undefined' && packet.data instanceof blob) {
        var fr = new FileReader();
        fr.onload = function() {
          var b64 = fr.result.split(',')[1];
          callback(message + b64);
        };
        return fr.readAsDataURL(packet.data);
      }

      var b64data;
      try {
        b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
      } catch (e) {
        // iPhone Safari doesn't let you apply with typed arrays
        var typed = new Uint8Array(packet.data);
        var basic = new Array(typed.length);
        for (var i = 0; i < typed.length; i++) {
          basic[i] = typed[i];
        }
        b64data = String.fromCharCode.apply(null, basic);
      }
      message += btoa(b64data);
      return callback(message);
    };

    /**
     * Decodes a packet. Changes format to Blob if requested.
     *
     * @return {Object} with `type` and `data` (if any)
     * @api private
     */

    exports.decodePacket = function (data, binaryType, utf8decode) {
      if (data === undefined) {
        return err;
      }
      // String data
      if (typeof data === 'string') {
        if (data.charAt(0) === 'b') {
          return exports.decodeBase64Packet(data.substr(1), binaryType);
        }

        if (utf8decode) {
          data = tryDecode(data);
          if (data === false) {
            return err;
          }
        }
        var type = data.charAt(0);

        if (Number(type) != type || !packetslist[type]) {
          return err;
        }

        if (data.length > 1) {
          return { type: packetslist[type], data: data.substring(1) };
        } else {
          return { type: packetslist[type] };
        }
      }

      var asArray = new Uint8Array(data);
      var type = asArray[0];
      var rest = arraybuffer_slice(data, 1);
      if (blob && binaryType === 'blob') {
        rest = new blob([rest]);
      }
      return { type: packetslist[type], data: rest };
    };

    function tryDecode(data) {
      try {
        data = utf8.decode(data, { strict: false });
      } catch (e) {
        return false;
      }
      return data;
    }

    /**
     * Decodes a packet encoded in a base64 string
     *
     * @param {String} base64 encoded message
     * @return {Object} with `type` and `data` (if any)
     */

    exports.decodeBase64Packet = function(msg, binaryType) {
      var type = packetslist[msg.charAt(0)];
      if (!base64encoder) {
        return { type: type, data: { base64: true, data: msg.substr(1) } };
      }

      var data = base64encoder.decode(msg.substr(1));

      if (binaryType === 'blob' && blob) {
        data = new blob([data]);
      }

      return { type: type, data: data };
    };

    /**
     * Encodes multiple messages (payload).
     *
     *     <length>:data
     *
     * Example:
     *
     *     11:hello world2:hi
     *
     * If any contents are binary, they will be encoded as base64 strings. Base64
     * encoded strings are marked with a b before the length specifier
     *
     * @param {Array} packets
     * @api private
     */

    exports.encodePayload = function (packets, supportsBinary, callback) {
      if (typeof supportsBinary === 'function') {
        callback = supportsBinary;
        supportsBinary = null;
      }

      var isBinary = hasBinary2(packets);

      if (supportsBinary && isBinary) {
        if (blob && !dontSendBlobs) {
          return exports.encodePayloadAsBlob(packets, callback);
        }

        return exports.encodePayloadAsArrayBuffer(packets, callback);
      }

      if (!packets.length) {
        return callback('0:');
      }

      function setLengthHeader(message) {
        return message.length + ':' + message;
      }

      function encodeOne(packet, doneCallback) {
        exports.encodePacket(packet, !isBinary ? false : supportsBinary, false, function(message) {
          doneCallback(null, setLengthHeader(message));
        });
      }

      map(packets, encodeOne, function(err, results) {
        return callback(results.join(''));
      });
    };

    /**
     * Async array map using after
     */

    function map(ary, each, done) {
      var result = new Array(ary.length);
      var next = after_1(ary.length, done);

      var eachWithIndex = function(i, el, cb) {
        each(el, function(error, msg) {
          result[i] = msg;
          cb(error, result);
        });
      };

      for (var i = 0; i < ary.length; i++) {
        eachWithIndex(i, ary[i], next);
      }
    }

    /*
     * Decodes data when a payload is maybe expected. Possible binary contents are
     * decoded from their base64 representation
     *
     * @param {String} data, callback method
     * @api public
     */

    exports.decodePayload = function (data, binaryType, callback) {
      if (typeof data !== 'string') {
        return exports.decodePayloadAsBinary(data, binaryType, callback);
      }

      if (typeof binaryType === 'function') {
        callback = binaryType;
        binaryType = null;
      }

      var packet;
      if (data === '') {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      var length = '', n, msg;

      for (var i = 0, l = data.length; i < l; i++) {
        var chr = data.charAt(i);

        if (chr !== ':') {
          length += chr;
          continue;
        }

        if (length === '' || (length != (n = Number(length)))) {
          // parser error - ignoring payload
          return callback(err, 0, 1);
        }

        msg = data.substr(i + 1, n);

        if (length != msg.length) {
          // parser error - ignoring payload
          return callback(err, 0, 1);
        }

        if (msg.length) {
          packet = exports.decodePacket(msg, binaryType, false);

          if (err.type === packet.type && err.data === packet.data) {
            // parser error in individual packet - ignoring payload
            return callback(err, 0, 1);
          }

          var ret = callback(packet, i + n, l);
          if (false === ret) return;
        }

        // advance cursor
        i += n;
        length = '';
      }

      if (length !== '') {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

    };

    /**
     * Encodes multiple messages (payload) as binary.
     *
     * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
     * 255><data>
     *
     * Example:
     * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
     *
     * @param {Array} packets
     * @return {ArrayBuffer} encoded payload
     * @api private
     */

    exports.encodePayloadAsArrayBuffer = function(packets, callback) {
      if (!packets.length) {
        return callback(new ArrayBuffer(0));
      }

      function encodeOne(packet, doneCallback) {
        exports.encodePacket(packet, true, true, function(data) {
          return doneCallback(null, data);
        });
      }

      map(packets, encodeOne, function(err, encodedPackets) {
        var totalLength = encodedPackets.reduce(function(acc, p) {
          var len;
          if (typeof p === 'string'){
            len = p.length;
          } else {
            len = p.byteLength;
          }
          return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
        }, 0);

        var resultArray = new Uint8Array(totalLength);

        var bufferIndex = 0;
        encodedPackets.forEach(function(p) {
          var isString = typeof p === 'string';
          var ab = p;
          if (isString) {
            var view = new Uint8Array(p.length);
            for (var i = 0; i < p.length; i++) {
              view[i] = p.charCodeAt(i);
            }
            ab = view.buffer;
          }

          if (isString) { // not true binary
            resultArray[bufferIndex++] = 0;
          } else { // true binary
            resultArray[bufferIndex++] = 1;
          }

          var lenStr = ab.byteLength.toString();
          for (var i = 0; i < lenStr.length; i++) {
            resultArray[bufferIndex++] = parseInt(lenStr[i]);
          }
          resultArray[bufferIndex++] = 255;

          var view = new Uint8Array(ab);
          for (var i = 0; i < view.length; i++) {
            resultArray[bufferIndex++] = view[i];
          }
        });

        return callback(resultArray.buffer);
      });
    };

    /**
     * Encode as Blob
     */

    exports.encodePayloadAsBlob = function(packets, callback) {
      function encodeOne(packet, doneCallback) {
        exports.encodePacket(packet, true, true, function(encoded) {
          var binaryIdentifier = new Uint8Array(1);
          binaryIdentifier[0] = 1;
          if (typeof encoded === 'string') {
            var view = new Uint8Array(encoded.length);
            for (var i = 0; i < encoded.length; i++) {
              view[i] = encoded.charCodeAt(i);
            }
            encoded = view.buffer;
            binaryIdentifier[0] = 0;
          }

          var len = (encoded instanceof ArrayBuffer)
            ? encoded.byteLength
            : encoded.size;

          var lenStr = len.toString();
          var lengthAry = new Uint8Array(lenStr.length + 1);
          for (var i = 0; i < lenStr.length; i++) {
            lengthAry[i] = parseInt(lenStr[i]);
          }
          lengthAry[lenStr.length] = 255;

          if (blob) {
            var blob$1 = new blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
            doneCallback(null, blob$1);
          }
        });
      }

      map(packets, encodeOne, function(err, results) {
        return callback(new blob(results));
      });
    };

    /*
     * Decodes data when a payload is maybe expected. Strings are decoded by
     * interpreting each byte as a key code for entries marked to start with 0. See
     * description of encodePayloadAsBinary
     *
     * @param {ArrayBuffer} data, callback method
     * @api public
     */

    exports.decodePayloadAsBinary = function (data, binaryType, callback) {
      if (typeof binaryType === 'function') {
        callback = binaryType;
        binaryType = null;
      }

      var bufferTail = data;
      var buffers = [];

      while (bufferTail.byteLength > 0) {
        var tailArray = new Uint8Array(bufferTail);
        var isString = tailArray[0] === 0;
        var msgLength = '';

        for (var i = 1; ; i++) {
          if (tailArray[i] === 255) break;

          // 310 = char length of Number.MAX_VALUE
          if (msgLength.length > 310) {
            return callback(err, 0, 1);
          }

          msgLength += tailArray[i];
        }

        bufferTail = arraybuffer_slice(bufferTail, 2 + msgLength.length);
        msgLength = parseInt(msgLength);

        var msg = arraybuffer_slice(bufferTail, 0, msgLength);
        if (isString) {
          try {
            msg = String.fromCharCode.apply(null, new Uint8Array(msg));
          } catch (e) {
            // iPhone Safari doesn't let you apply to typed arrays
            var typed = new Uint8Array(msg);
            msg = '';
            for (var i = 0; i < typed.length; i++) {
              msg += String.fromCharCode(typed[i]);
            }
          }
        }

        buffers.push(msg);
        bufferTail = arraybuffer_slice(bufferTail, msgLength);
      }

      var total = buffers.length;
      buffers.forEach(function(buffer, i) {
        callback(exports.decodePacket(buffer, binaryType, true), i, total);
      });
    };
    });
    var browser_1$2 = browser$2.protocol;
    var browser_2$2 = browser$2.packets;
    var browser_3$2 = browser$2.encodePacket;
    var browser_4$2 = browser$2.encodeBase64Packet;
    var browser_5$2 = browser$2.decodePacket;
    var browser_6$2 = browser$2.decodeBase64Packet;
    var browser_7$2 = browser$2.encodePayload;
    var browser_8 = browser$2.decodePayload;
    var browser_9 = browser$2.encodePayloadAsArrayBuffer;
    var browser_10 = browser$2.encodePayloadAsBlob;
    var browser_11 = browser$2.decodePayloadAsBinary;

    var componentEmitter$1 = createCommonjsModule(function (module) {
    /**
     * Expose `Emitter`.
     */

    {
      module.exports = Emitter;
    }

    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */

    function Emitter(obj) {
      if (obj) return mixin(obj);
    }
    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */

    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }

    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
      (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
      return this;
    };

    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.once = function(event, fn){
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }

      on.fn = fn;
      this.on(event, on);
      return this;
    };

    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};

      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }

      // specific event
      var callbacks = this._callbacks['$' + event];
      if (!callbacks) return this;

      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
      }

      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      return this;
    };

    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */

    Emitter.prototype.emit = function(event){
      this._callbacks = this._callbacks || {};
      var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks['$' + event];

      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }

      return this;
    };

    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */

    Emitter.prototype.listeners = function(event){
      this._callbacks = this._callbacks || {};
      return this._callbacks['$' + event] || [];
    };

    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */

    Emitter.prototype.hasListeners = function(event){
      return !! this.listeners(event).length;
    };
    });

    /**
     * Module dependencies.
     */




    /**
     * Module exports.
     */

    var transport = Transport;

    /**
     * Transport abstract constructor.
     *
     * @param {Object} options.
     * @api private
     */

    function Transport (opts) {
      this.path = opts.path;
      this.hostname = opts.hostname;
      this.port = opts.port;
      this.secure = opts.secure;
      this.query = opts.query;
      this.timestampParam = opts.timestampParam;
      this.timestampRequests = opts.timestampRequests;
      this.readyState = '';
      this.agent = opts.agent || false;
      this.socket = opts.socket;
      this.enablesXDR = opts.enablesXDR;
      this.withCredentials = opts.withCredentials;

      // SSL options for Node.js client
      this.pfx = opts.pfx;
      this.key = opts.key;
      this.passphrase = opts.passphrase;
      this.cert = opts.cert;
      this.ca = opts.ca;
      this.ciphers = opts.ciphers;
      this.rejectUnauthorized = opts.rejectUnauthorized;
      this.forceNode = opts.forceNode;

      // results of ReactNative environment detection
      this.isReactNative = opts.isReactNative;

      // other options for Node.js client
      this.extraHeaders = opts.extraHeaders;
      this.localAddress = opts.localAddress;
    }

    /**
     * Mix in `Emitter`.
     */

    componentEmitter$1(Transport.prototype);

    /**
     * Emits an error.
     *
     * @param {String} str
     * @return {Transport} for chaining
     * @api public
     */

    Transport.prototype.onError = function (msg, desc) {
      var err = new Error(msg);
      err.type = 'TransportError';
      err.description = desc;
      this.emit('error', err);
      return this;
    };

    /**
     * Opens the transport.
     *
     * @api public
     */

    Transport.prototype.open = function () {
      if ('closed' === this.readyState || '' === this.readyState) {
        this.readyState = 'opening';
        this.doOpen();
      }

      return this;
    };

    /**
     * Closes the transport.
     *
     * @api private
     */

    Transport.prototype.close = function () {
      if ('opening' === this.readyState || 'open' === this.readyState) {
        this.doClose();
        this.onClose();
      }

      return this;
    };

    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     * @api private
     */

    Transport.prototype.send = function (packets) {
      if ('open' === this.readyState) {
        this.write(packets);
      } else {
        throw new Error('Transport not open');
      }
    };

    /**
     * Called upon open
     *
     * @api private
     */

    Transport.prototype.onOpen = function () {
      this.readyState = 'open';
      this.writable = true;
      this.emit('open');
    };

    /**
     * Called with data.
     *
     * @param {String} data
     * @api private
     */

    Transport.prototype.onData = function (data) {
      var packet = browser$2.decodePacket(data, this.socket.binaryType);
      this.onPacket(packet);
    };

    /**
     * Called with a decoded packet.
     */

    Transport.prototype.onPacket = function (packet) {
      this.emit('packet', packet);
    };

    /**
     * Called upon close.
     *
     * @api private
     */

    Transport.prototype.onClose = function () {
      this.readyState = 'closed';
      this.emit('close');
    };

    /**
     * Compiles a querystring
     * Returns string representation of the object
     *
     * @param {Object}
     * @api private
     */

    var encode = function (obj) {
      var str = '';

      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (str.length) str += '&';
          str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
        }
      }

      return str;
    };

    /**
     * Parses a simple querystring into an object
     *
     * @param {String} qs
     * @api private
     */

    var decode = function(qs){
      var qry = {};
      var pairs = qs.split('&');
      for (var i = 0, l = pairs.length; i < l; i++) {
        var pair = pairs[i].split('=');
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return qry;
    };

    var parseqs = {
    	encode: encode,
    	decode: decode
    };

    var componentInherit = function(a, b){
      var fn = function(){};
      fn.prototype = b.prototype;
      a.prototype = new fn;
      a.prototype.constructor = a;
    };

    var alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('')
      , length = 64
      , map = {}
      , seed = 0
      , i = 0
      , prev;

    /**
     * Return a string representing the specified number.
     *
     * @param {Number} num The number to convert.
     * @returns {String} The string representation of the number.
     * @api public
     */
    function encode$1(num) {
      var encoded = '';

      do {
        encoded = alphabet[num % length] + encoded;
        num = Math.floor(num / length);
      } while (num > 0);

      return encoded;
    }

    /**
     * Return the integer value specified by the given string.
     *
     * @param {String} str The string to convert.
     * @returns {Number} The integer value represented by the string.
     * @api public
     */
    function decode$1(str) {
      var decoded = 0;

      for (i = 0; i < str.length; i++) {
        decoded = decoded * length + map[str.charAt(i)];
      }

      return decoded;
    }

    /**
     * Yeast: A tiny growing id generator.
     *
     * @returns {String} A unique id.
     * @api public
     */
    function yeast() {
      var now = encode$1(+new Date());

      if (now !== prev) return seed = 0, prev = now;
      return now +'.'+ encode$1(seed++);
    }

    //
    // Map each character to its index.
    //
    for (; i < length; i++) map[alphabet[i]] = i;

    //
    // Expose the `yeast`, `encode` and `decode` functions.
    //
    yeast.encode = encode$1;
    yeast.decode = decode$1;
    var yeast_1 = yeast;

    /**
     * Helpers.
     */

    var s$2 = 1000;
    var m$2 = s$2 * 60;
    var h$2 = m$2 * 60;
    var d$2 = h$2 * 24;
    var w$1 = d$2 * 7;
    var y$2 = d$2 * 365.25;

    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} [options]
     * @throws {Error} throw an error if val is not a non-empty string or a number
     * @return {String|Number}
     * @api public
     */

    var ms$2 = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === 'string' && val.length > 0) {
        return parse$2(val);
      } else if (type === 'number' && isFinite(val)) {
        return options.long ? fmtLong$2(val) : fmtShort$2(val);
      }
      throw new Error(
        'val is not a non-empty string or a valid number. val=' +
          JSON.stringify(val)
      );
    };

    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */

    function parse$2(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y$2;
        case 'weeks':
        case 'week':
        case 'w':
          return n * w$1;
        case 'days':
        case 'day':
        case 'd':
          return n * d$2;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h$2;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m$2;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s$2;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n;
        default:
          return undefined;
      }
    }

    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtShort$2(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d$2) {
        return Math.round(ms / d$2) + 'd';
      }
      if (msAbs >= h$2) {
        return Math.round(ms / h$2) + 'h';
      }
      if (msAbs >= m$2) {
        return Math.round(ms / m$2) + 'm';
      }
      if (msAbs >= s$2) {
        return Math.round(ms / s$2) + 's';
      }
      return ms + 'ms';
    }

    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtLong$2(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d$2) {
        return plural$2(ms, msAbs, d$2, 'day');
      }
      if (msAbs >= h$2) {
        return plural$2(ms, msAbs, h$2, 'hour');
      }
      if (msAbs >= m$2) {
        return plural$2(ms, msAbs, m$2, 'minute');
      }
      if (msAbs >= s$2) {
        return plural$2(ms, msAbs, s$2, 'second');
      }
      return ms + ' ms';
    }

    /**
     * Pluralization helper.
     */

    function plural$2(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
    }

    /**
     * This is the common logic for both the Node.js and web browser
     * implementations of `debug()`.
     */

    function setup$1(env) {
    	createDebug.debug = createDebug;
    	createDebug.default = createDebug;
    	createDebug.coerce = coerce;
    	createDebug.disable = disable;
    	createDebug.enable = enable;
    	createDebug.enabled = enabled;
    	createDebug.humanize = ms$2;

    	Object.keys(env).forEach(key => {
    		createDebug[key] = env[key];
    	});

    	/**
    	* Active `debug` instances.
    	*/
    	createDebug.instances = [];

    	/**
    	* The currently active debug mode names, and names to skip.
    	*/

    	createDebug.names = [];
    	createDebug.skips = [];

    	/**
    	* Map of special "%n" handling functions, for the debug "format" argument.
    	*
    	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
    	*/
    	createDebug.formatters = {};

    	/**
    	* Selects a color for a debug namespace
    	* @param {String} namespace The namespace string for the for the debug instance to be colored
    	* @return {Number|String} An ANSI color code for the given namespace
    	* @api private
    	*/
    	function selectColor(namespace) {
    		let hash = 0;

    		for (let i = 0; i < namespace.length; i++) {
    			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
    			hash |= 0; // Convert to 32bit integer
    		}

    		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    	}
    	createDebug.selectColor = selectColor;

    	/**
    	* Create a debugger with the given `namespace`.
    	*
    	* @param {String} namespace
    	* @return {Function}
    	* @api public
    	*/
    	function createDebug(namespace) {
    		let prevTime;

    		function debug(...args) {
    			// Disabled?
    			if (!debug.enabled) {
    				return;
    			}

    			const self = debug;

    			// Set `diff` timestamp
    			const curr = Number(new Date());
    			const ms = curr - (prevTime || curr);
    			self.diff = ms;
    			self.prev = prevTime;
    			self.curr = curr;
    			prevTime = curr;

    			args[0] = createDebug.coerce(args[0]);

    			if (typeof args[0] !== 'string') {
    				// Anything else let's inspect with %O
    				args.unshift('%O');
    			}

    			// Apply any `formatters` transformations
    			let index = 0;
    			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
    				// If we encounter an escaped % then don't increase the array index
    				if (match === '%%') {
    					return match;
    				}
    				index++;
    				const formatter = createDebug.formatters[format];
    				if (typeof formatter === 'function') {
    					const val = args[index];
    					match = formatter.call(self, val);

    					// Now we need to remove `args[index]` since it's inlined in the `format`
    					args.splice(index, 1);
    					index--;
    				}
    				return match;
    			});

    			// Apply env-specific formatting (colors, etc.)
    			createDebug.formatArgs.call(self, args);

    			const logFn = self.log || createDebug.log;
    			logFn.apply(self, args);
    		}

    		debug.namespace = namespace;
    		debug.enabled = createDebug.enabled(namespace);
    		debug.useColors = createDebug.useColors();
    		debug.color = selectColor(namespace);
    		debug.destroy = destroy;
    		debug.extend = extend;
    		// Debug.formatArgs = formatArgs;
    		// debug.rawLog = rawLog;

    		// env-specific initialization logic for debug instances
    		if (typeof createDebug.init === 'function') {
    			createDebug.init(debug);
    		}

    		createDebug.instances.push(debug);

    		return debug;
    	}

    	function destroy() {
    		const index = createDebug.instances.indexOf(this);
    		if (index !== -1) {
    			createDebug.instances.splice(index, 1);
    			return true;
    		}
    		return false;
    	}

    	function extend(namespace, delimiter) {
    		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
    		newDebug.log = this.log;
    		return newDebug;
    	}

    	/**
    	* Enables a debug mode by namespaces. This can include modes
    	* separated by a colon and wildcards.
    	*
    	* @param {String} namespaces
    	* @api public
    	*/
    	function enable(namespaces) {
    		createDebug.save(namespaces);

    		createDebug.names = [];
    		createDebug.skips = [];

    		let i;
    		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
    		const len = split.length;

    		for (i = 0; i < len; i++) {
    			if (!split[i]) {
    				// ignore empty strings
    				continue;
    			}

    			namespaces = split[i].replace(/\*/g, '.*?');

    			if (namespaces[0] === '-') {
    				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    			} else {
    				createDebug.names.push(new RegExp('^' + namespaces + '$'));
    			}
    		}

    		for (i = 0; i < createDebug.instances.length; i++) {
    			const instance = createDebug.instances[i];
    			instance.enabled = createDebug.enabled(instance.namespace);
    		}
    	}

    	/**
    	* Disable debug output.
    	*
    	* @return {String} namespaces
    	* @api public
    	*/
    	function disable() {
    		const namespaces = [
    			...createDebug.names.map(toNamespace),
    			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
    		].join(',');
    		createDebug.enable('');
    		return namespaces;
    	}

    	/**
    	* Returns true if the given mode name is enabled, false otherwise.
    	*
    	* @param {String} name
    	* @return {Boolean}
    	* @api public
    	*/
    	function enabled(name) {
    		if (name[name.length - 1] === '*') {
    			return true;
    		}

    		let i;
    		let len;

    		for (i = 0, len = createDebug.skips.length; i < len; i++) {
    			if (createDebug.skips[i].test(name)) {
    				return false;
    			}
    		}

    		for (i = 0, len = createDebug.names.length; i < len; i++) {
    			if (createDebug.names[i].test(name)) {
    				return true;
    			}
    		}

    		return false;
    	}

    	/**
    	* Convert regexp to namespace
    	*
    	* @param {RegExp} regxep
    	* @return {String} namespace
    	* @api private
    	*/
    	function toNamespace(regexp) {
    		return regexp.toString()
    			.substring(2, regexp.toString().length - 2)
    			.replace(/\.\*\?$/, '*');
    	}

    	/**
    	* Coerce `val`.
    	*
    	* @param {Mixed} val
    	* @return {Mixed}
    	* @api private
    	*/
    	function coerce(val) {
    		if (val instanceof Error) {
    			return val.stack || val.message;
    		}
    		return val;
    	}

    	createDebug.enable(createDebug.load());

    	return createDebug;
    }

    var common$1 = setup$1;

    var browser$3 = createCommonjsModule(function (module, exports) {
    /* eslint-env browser */

    /**
     * This is the web browser implementation of `debug()`.
     */

    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();

    /**
     * Colors.
     */

    exports.colors = [
    	'#0000CC',
    	'#0000FF',
    	'#0033CC',
    	'#0033FF',
    	'#0066CC',
    	'#0066FF',
    	'#0099CC',
    	'#0099FF',
    	'#00CC00',
    	'#00CC33',
    	'#00CC66',
    	'#00CC99',
    	'#00CCCC',
    	'#00CCFF',
    	'#3300CC',
    	'#3300FF',
    	'#3333CC',
    	'#3333FF',
    	'#3366CC',
    	'#3366FF',
    	'#3399CC',
    	'#3399FF',
    	'#33CC00',
    	'#33CC33',
    	'#33CC66',
    	'#33CC99',
    	'#33CCCC',
    	'#33CCFF',
    	'#6600CC',
    	'#6600FF',
    	'#6633CC',
    	'#6633FF',
    	'#66CC00',
    	'#66CC33',
    	'#9900CC',
    	'#9900FF',
    	'#9933CC',
    	'#9933FF',
    	'#99CC00',
    	'#99CC33',
    	'#CC0000',
    	'#CC0033',
    	'#CC0066',
    	'#CC0099',
    	'#CC00CC',
    	'#CC00FF',
    	'#CC3300',
    	'#CC3333',
    	'#CC3366',
    	'#CC3399',
    	'#CC33CC',
    	'#CC33FF',
    	'#CC6600',
    	'#CC6633',
    	'#CC9900',
    	'#CC9933',
    	'#CCCC00',
    	'#CCCC33',
    	'#FF0000',
    	'#FF0033',
    	'#FF0066',
    	'#FF0099',
    	'#FF00CC',
    	'#FF00FF',
    	'#FF3300',
    	'#FF3333',
    	'#FF3366',
    	'#FF3399',
    	'#FF33CC',
    	'#FF33FF',
    	'#FF6600',
    	'#FF6633',
    	'#FF9900',
    	'#FF9933',
    	'#FFCC00',
    	'#FFCC33'
    ];

    /**
     * Currently only WebKit-based Web Inspectors, Firefox >= v31,
     * and the Firebug extension (any Firefox version) are known
     * to support "%c" CSS customizations.
     *
     * TODO: add a `localStorage` variable to explicitly enable/disable colors
     */

    // eslint-disable-next-line complexity
    function useColors() {
    	// NB: In an Electron preload script, document will be defined but not fully
    	// initialized. Since we know we're in Chrome, we'll just detect this case
    	// explicitly
    	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
    		return true;
    	}

    	// Internet Explorer and Edge do not support colors.
    	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    		return false;
    	}

    	// Is webkit? http://stackoverflow.com/a/16459606/376773
    	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
    	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    		// Is firebug? http://stackoverflow.com/a/398120/376773
    		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    		// Is firefox >= v31?
    		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    		// Double check webkit in userAgent just in case we are in a worker
    		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
    }

    /**
     * Colorize log arguments if enabled.
     *
     * @api public
     */

    function formatArgs(args) {
    	args[0] = (this.useColors ? '%c' : '') +
    		this.namespace +
    		(this.useColors ? ' %c' : ' ') +
    		args[0] +
    		(this.useColors ? '%c ' : ' ') +
    		'+' + module.exports.humanize(this.diff);

    	if (!this.useColors) {
    		return;
    	}

    	const c = 'color: ' + this.color;
    	args.splice(1, 0, c, 'color: inherit');

    	// The final "%c" is somewhat tricky, because there could be other
    	// arguments passed either before or after the %c, so we need to
    	// figure out the correct index to insert the CSS into
    	let index = 0;
    	let lastC = 0;
    	args[0].replace(/%[a-zA-Z%]/g, match => {
    		if (match === '%%') {
    			return;
    		}
    		index++;
    		if (match === '%c') {
    			// We only are interested in the *last* %c
    			// (the user may have provided their own)
    			lastC = index;
    		}
    	});

    	args.splice(lastC, 0, c);
    }

    /**
     * Invokes `console.log()` when available.
     * No-op when `console.log` is not a "function".
     *
     * @api public
     */
    function log(...args) {
    	// This hackery is required for IE8/9, where
    	// the `console.log` function doesn't have 'apply'
    	return typeof console === 'object' &&
    		console.log &&
    		console.log(...args);
    }

    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */
    function save(namespaces) {
    	try {
    		if (namespaces) {
    			exports.storage.setItem('debug', namespaces);
    		} else {
    			exports.storage.removeItem('debug');
    		}
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}
    }

    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */
    function load() {
    	let r;
    	try {
    		r = exports.storage.getItem('debug');
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}

    	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
    	if (!r && typeof process !== 'undefined' && 'env' in process) {
    		r = process.env.DEBUG;
    	}

    	return r;
    }

    /**
     * Localstorage attempts to return the localstorage.
     *
     * This is necessary because safari throws
     * when a user disables cookies/localstorage
     * and you attempt to access it.
     *
     * @return {LocalStorage}
     * @api private
     */

    function localstorage() {
    	try {
    		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
    		// The Browser also has localStorage in the global context.
    		return localStorage;
    	} catch (error) {
    		// Swallow
    		// XXX (@Qix-) should we be logging these?
    	}
    }

    module.exports = common$1(exports);

    const {formatters} = module.exports;

    /**
     * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
     */

    formatters.j = function (v) {
    	try {
    		return JSON.stringify(v);
    	} catch (error) {
    		return '[UnexpectedJSONParseError]: ' + error.message;
    	}
    };
    });
    var browser_1$3 = browser$3.log;
    var browser_2$3 = browser$3.formatArgs;
    var browser_3$3 = browser$3.save;
    var browser_4$3 = browser$3.load;
    var browser_5$3 = browser$3.useColors;
    var browser_6$3 = browser$3.storage;
    var browser_7$3 = browser$3.colors;

    /**
     * Module dependencies.
     */






    var debug$2 = browser$3('engine.io-client:polling');

    /**
     * Module exports.
     */

    var polling = Polling;

    /**
     * Is XHR2 supported?
     */

    var hasXHR2 = (function () {
      var XMLHttpRequest = xmlhttprequest;
      var xhr = new XMLHttpRequest({ xdomain: false });
      return null != xhr.responseType;
    })();

    /**
     * Polling interface.
     *
     * @param {Object} opts
     * @api private
     */

    function Polling (opts) {
      var forceBase64 = (opts && opts.forceBase64);
      if (!hasXHR2 || forceBase64) {
        this.supportsBinary = false;
      }
      transport.call(this, opts);
    }

    /**
     * Inherits from Transport.
     */

    componentInherit(Polling, transport);

    /**
     * Transport name.
     */

    Polling.prototype.name = 'polling';

    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @api private
     */

    Polling.prototype.doOpen = function () {
      this.poll();
    };

    /**
     * Pauses polling.
     *
     * @param {Function} callback upon buffers are flushed and transport is paused
     * @api private
     */

    Polling.prototype.pause = function (onPause) {
      var self = this;

      this.readyState = 'pausing';

      function pause () {
        debug$2('paused');
        self.readyState = 'paused';
        onPause();
      }

      if (this.polling || !this.writable) {
        var total = 0;

        if (this.polling) {
          debug$2('we are currently polling - waiting to pause');
          total++;
          this.once('pollComplete', function () {
            debug$2('pre-pause polling complete');
            --total || pause();
          });
        }

        if (!this.writable) {
          debug$2('we are currently writing - waiting to pause');
          total++;
          this.once('drain', function () {
            debug$2('pre-pause writing complete');
            --total || pause();
          });
        }
      } else {
        pause();
      }
    };

    /**
     * Starts polling cycle.
     *
     * @api public
     */

    Polling.prototype.poll = function () {
      debug$2('polling');
      this.polling = true;
      this.doPoll();
      this.emit('poll');
    };

    /**
     * Overloads onData to detect payloads.
     *
     * @api private
     */

    Polling.prototype.onData = function (data) {
      var self = this;
      debug$2('polling got data %s', data);
      var callback = function (packet, index, total) {
        // if its the first message we consider the transport open
        if ('opening' === self.readyState) {
          self.onOpen();
        }

        // if its a close packet, we close the ongoing requests
        if ('close' === packet.type) {
          self.onClose();
          return false;
        }

        // otherwise bypass onData and handle the message
        self.onPacket(packet);
      };

      // decode payload
      browser$2.decodePayload(data, this.socket.binaryType, callback);

      // if an event did not trigger closing
      if ('closed' !== this.readyState) {
        // if we got data we're not polling
        this.polling = false;
        this.emit('pollComplete');

        if ('open' === this.readyState) {
          this.poll();
        } else {
          debug$2('ignoring poll - transport state "%s"', this.readyState);
        }
      }
    };

    /**
     * For polling, send a close packet.
     *
     * @api private
     */

    Polling.prototype.doClose = function () {
      var self = this;

      function close () {
        debug$2('writing close packet');
        self.write([{ type: 'close' }]);
      }

      if ('open' === this.readyState) {
        debug$2('transport open - closing');
        close();
      } else {
        // in case we're trying to close while
        // handshaking is in progress (GH-164)
        debug$2('transport not open - deferring close');
        this.once('open', close);
      }
    };

    /**
     * Writes a packets payload.
     *
     * @param {Array} data packets
     * @param {Function} drain callback
     * @api private
     */

    Polling.prototype.write = function (packets) {
      var self = this;
      this.writable = false;
      var callbackfn = function () {
        self.writable = true;
        self.emit('drain');
      };

      browser$2.encodePayload(packets, this.supportsBinary, function (data) {
        self.doWrite(data, callbackfn);
      });
    };

    /**
     * Generates uri for connection.
     *
     * @api private
     */

    Polling.prototype.uri = function () {
      var query = this.query || {};
      var schema = this.secure ? 'https' : 'http';
      var port = '';

      // cache busting is forced
      if (false !== this.timestampRequests) {
        query[this.timestampParam] = yeast_1();
      }

      if (!this.supportsBinary && !query.sid) {
        query.b64 = 1;
      }

      query = parseqs.encode(query);

      // avoid port if default for schema
      if (this.port && (('https' === schema && Number(this.port) !== 443) ||
         ('http' === schema && Number(this.port) !== 80))) {
        port = ':' + this.port;
      }

      // prepend ? to query
      if (query.length) {
        query = '?' + query;
      }

      var ipv6 = this.hostname.indexOf(':') !== -1;
      return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
    };

    /* global attachEvent */

    /**
     * Module requirements.
     */





    var debug$3 = browser$3('engine.io-client:polling-xhr');

    /**
     * Module exports.
     */

    var pollingXhr = XHR;
    var Request_1 = Request;

    /**
     * Empty function
     */

    function empty$1 () {}

    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @api public
     */

    function XHR (opts) {
      polling.call(this, opts);
      this.requestTimeout = opts.requestTimeout;
      this.extraHeaders = opts.extraHeaders;

      if (typeof location !== 'undefined') {
        var isSSL = 'https:' === location.protocol;
        var port = location.port;

        // some user agents have empty `location.port`
        if (!port) {
          port = isSSL ? 443 : 80;
        }

        this.xd = (typeof location !== 'undefined' && opts.hostname !== location.hostname) ||
          port !== opts.port;
        this.xs = opts.secure !== isSSL;
      }
    }

    /**
     * Inherits from Polling.
     */

    componentInherit(XHR, polling);

    /**
     * XHR supports binary
     */

    XHR.prototype.supportsBinary = true;

    /**
     * Creates a request.
     *
     * @param {String} method
     * @api private
     */

    XHR.prototype.request = function (opts) {
      opts = opts || {};
      opts.uri = this.uri();
      opts.xd = this.xd;
      opts.xs = this.xs;
      opts.agent = this.agent || false;
      opts.supportsBinary = this.supportsBinary;
      opts.enablesXDR = this.enablesXDR;
      opts.withCredentials = this.withCredentials;

      // SSL options for Node.js client
      opts.pfx = this.pfx;
      opts.key = this.key;
      opts.passphrase = this.passphrase;
      opts.cert = this.cert;
      opts.ca = this.ca;
      opts.ciphers = this.ciphers;
      opts.rejectUnauthorized = this.rejectUnauthorized;
      opts.requestTimeout = this.requestTimeout;

      // other options for Node.js client
      opts.extraHeaders = this.extraHeaders;

      return new Request(opts);
    };

    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @api private
     */

    XHR.prototype.doWrite = function (data, fn) {
      var isBinary = typeof data !== 'string' && data !== undefined;
      var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
      var self = this;
      req.on('success', fn);
      req.on('error', function (err) {
        self.onError('xhr post error', err);
      });
      this.sendXhr = req;
    };

    /**
     * Starts a poll cycle.
     *
     * @api private
     */

    XHR.prototype.doPoll = function () {
      debug$3('xhr poll');
      var req = this.request();
      var self = this;
      req.on('data', function (data) {
        self.onData(data);
      });
      req.on('error', function (err) {
        self.onError('xhr poll error', err);
      });
      this.pollXhr = req;
    };

    /**
     * Request constructor
     *
     * @param {Object} options
     * @api public
     */

    function Request (opts) {
      this.method = opts.method || 'GET';
      this.uri = opts.uri;
      this.xd = !!opts.xd;
      this.xs = !!opts.xs;
      this.async = false !== opts.async;
      this.data = undefined !== opts.data ? opts.data : null;
      this.agent = opts.agent;
      this.isBinary = opts.isBinary;
      this.supportsBinary = opts.supportsBinary;
      this.enablesXDR = opts.enablesXDR;
      this.withCredentials = opts.withCredentials;
      this.requestTimeout = opts.requestTimeout;

      // SSL options for Node.js client
      this.pfx = opts.pfx;
      this.key = opts.key;
      this.passphrase = opts.passphrase;
      this.cert = opts.cert;
      this.ca = opts.ca;
      this.ciphers = opts.ciphers;
      this.rejectUnauthorized = opts.rejectUnauthorized;

      // other options for Node.js client
      this.extraHeaders = opts.extraHeaders;

      this.create();
    }

    /**
     * Mix in `Emitter`.
     */

    componentEmitter$1(Request.prototype);

    /**
     * Creates the XHR object and sends the request.
     *
     * @api private
     */

    Request.prototype.create = function () {
      var opts = { agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR };

      // SSL options for Node.js client
      opts.pfx = this.pfx;
      opts.key = this.key;
      opts.passphrase = this.passphrase;
      opts.cert = this.cert;
      opts.ca = this.ca;
      opts.ciphers = this.ciphers;
      opts.rejectUnauthorized = this.rejectUnauthorized;

      var xhr = this.xhr = new xmlhttprequest(opts);
      var self = this;

      try {
        debug$3('xhr open %s: %s', this.method, this.uri);
        xhr.open(this.method, this.uri, this.async);
        try {
          if (this.extraHeaders) {
            xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
            for (var i in this.extraHeaders) {
              if (this.extraHeaders.hasOwnProperty(i)) {
                xhr.setRequestHeader(i, this.extraHeaders[i]);
              }
            }
          }
        } catch (e) {}

        if ('POST' === this.method) {
          try {
            if (this.isBinary) {
              xhr.setRequestHeader('Content-type', 'application/octet-stream');
            } else {
              xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
            }
          } catch (e) {}
        }

        try {
          xhr.setRequestHeader('Accept', '*/*');
        } catch (e) {}

        // ie6 check
        if ('withCredentials' in xhr) {
          xhr.withCredentials = this.withCredentials;
        }

        if (this.requestTimeout) {
          xhr.timeout = this.requestTimeout;
        }

        if (this.hasXDR()) {
          xhr.onload = function () {
            self.onLoad();
          };
          xhr.onerror = function () {
            self.onError(xhr.responseText);
          };
        } else {
          xhr.onreadystatechange = function () {
            if (xhr.readyState === 2) {
              try {
                var contentType = xhr.getResponseHeader('Content-Type');
                if (self.supportsBinary && contentType === 'application/octet-stream' || contentType === 'application/octet-stream; charset=UTF-8') {
                  xhr.responseType = 'arraybuffer';
                }
              } catch (e) {}
            }
            if (4 !== xhr.readyState) return;
            if (200 === xhr.status || 1223 === xhr.status) {
              self.onLoad();
            } else {
              // make sure the `error` event handler that's user-set
              // does not throw in the same tick and gets caught here
              setTimeout(function () {
                self.onError(typeof xhr.status === 'number' ? xhr.status : 0);
              }, 0);
            }
          };
        }

        debug$3('xhr data %s', this.data);
        xhr.send(this.data);
      } catch (e) {
        // Need to defer since .create() is called directly fhrom the constructor
        // and thus the 'error' event can only be only bound *after* this exception
        // occurs.  Therefore, also, we cannot throw here at all.
        setTimeout(function () {
          self.onError(e);
        }, 0);
        return;
      }

      if (typeof document !== 'undefined') {
        this.index = Request.requestsCount++;
        Request.requests[this.index] = this;
      }
    };

    /**
     * Called upon successful response.
     *
     * @api private
     */

    Request.prototype.onSuccess = function () {
      this.emit('success');
      this.cleanup();
    };

    /**
     * Called if we have data.
     *
     * @api private
     */

    Request.prototype.onData = function (data) {
      this.emit('data', data);
      this.onSuccess();
    };

    /**
     * Called upon error.
     *
     * @api private
     */

    Request.prototype.onError = function (err) {
      this.emit('error', err);
      this.cleanup(true);
    };

    /**
     * Cleans up house.
     *
     * @api private
     */

    Request.prototype.cleanup = function (fromError) {
      if ('undefined' === typeof this.xhr || null === this.xhr) {
        return;
      }
      // xmlhttprequest
      if (this.hasXDR()) {
        this.xhr.onload = this.xhr.onerror = empty$1;
      } else {
        this.xhr.onreadystatechange = empty$1;
      }

      if (fromError) {
        try {
          this.xhr.abort();
        } catch (e) {}
      }

      if (typeof document !== 'undefined') {
        delete Request.requests[this.index];
      }

      this.xhr = null;
    };

    /**
     * Called upon load.
     *
     * @api private
     */

    Request.prototype.onLoad = function () {
      var data;
      try {
        var contentType;
        try {
          contentType = this.xhr.getResponseHeader('Content-Type');
        } catch (e) {}
        if (contentType === 'application/octet-stream' || contentType === 'application/octet-stream; charset=UTF-8') {
          data = this.xhr.response || this.xhr.responseText;
        } else {
          data = this.xhr.responseText;
        }
      } catch (e) {
        this.onError(e);
      }
      if (null != data) {
        this.onData(data);
      }
    };

    /**
     * Check if it has XDomainRequest.
     *
     * @api private
     */

    Request.prototype.hasXDR = function () {
      return typeof XDomainRequest !== 'undefined' && !this.xs && this.enablesXDR;
    };

    /**
     * Aborts the request.
     *
     * @api public
     */

    Request.prototype.abort = function () {
      this.cleanup();
    };

    /**
     * Aborts pending requests when unloading the window. This is needed to prevent
     * memory leaks (e.g. when using IE) and to ensure that no spurious error is
     * emitted.
     */

    Request.requestsCount = 0;
    Request.requests = {};

    if (typeof document !== 'undefined') {
      if (typeof attachEvent === 'function') {
        attachEvent('onunload', unloadHandler);
      } else if (typeof addEventListener === 'function') {
        var terminationEvent = 'onpagehide' in self ? 'pagehide' : 'unload';
        addEventListener(terminationEvent, unloadHandler, false);
      }
    }

    function unloadHandler () {
      for (var i in Request.requests) {
        if (Request.requests.hasOwnProperty(i)) {
          Request.requests[i].abort();
        }
      }
    }
    pollingXhr.Request = Request_1;

    /**
     * Module requirements.
     */




    /**
     * Module exports.
     */

    var pollingJsonp = JSONPPolling;

    /**
     * Cached regular expressions.
     */

    var rNewline = /\n/g;
    var rEscapedNewline = /\\n/g;

    /**
     * Global JSONP callbacks.
     */

    var callbacks;

    /**
     * Noop.
     */

    function empty$2 () { }

    /**
     * Until https://github.com/tc39/proposal-global is shipped.
     */
    function glob () {
      return typeof self !== 'undefined' ? self
          : typeof window !== 'undefined' ? window
          : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : {};
    }

    /**
     * JSONP Polling constructor.
     *
     * @param {Object} opts.
     * @api public
     */

    function JSONPPolling (opts) {
      polling.call(this, opts);

      this.query = this.query || {};

      // define global callbacks array if not present
      // we do this here (lazily) to avoid unneeded global pollution
      if (!callbacks) {
        // we need to consider multiple engines in the same page
        var global = glob();
        callbacks = global.___eio = (global.___eio || []);
      }

      // callback identifier
      this.index = callbacks.length;

      // add callback to jsonp global
      var self = this;
      callbacks.push(function (msg) {
        self.onData(msg);
      });

      // append to query string
      this.query.j = this.index;

      // prevent spurious errors from being emitted when the window is unloaded
      if (typeof addEventListener === 'function') {
        addEventListener('beforeunload', function () {
          if (self.script) self.script.onerror = empty$2;
        }, false);
      }
    }

    /**
     * Inherits from Polling.
     */

    componentInherit(JSONPPolling, polling);

    /*
     * JSONP only supports binary as base64 encoded strings
     */

    JSONPPolling.prototype.supportsBinary = false;

    /**
     * Closes the socket.
     *
     * @api private
     */

    JSONPPolling.prototype.doClose = function () {
      if (this.script) {
        this.script.parentNode.removeChild(this.script);
        this.script = null;
      }

      if (this.form) {
        this.form.parentNode.removeChild(this.form);
        this.form = null;
        this.iframe = null;
      }

      polling.prototype.doClose.call(this);
    };

    /**
     * Starts a poll cycle.
     *
     * @api private
     */

    JSONPPolling.prototype.doPoll = function () {
      var self = this;
      var script = document.createElement('script');

      if (this.script) {
        this.script.parentNode.removeChild(this.script);
        this.script = null;
      }

      script.async = true;
      script.src = this.uri();
      script.onerror = function (e) {
        self.onError('jsonp poll error', e);
      };

      var insertAt = document.getElementsByTagName('script')[0];
      if (insertAt) {
        insertAt.parentNode.insertBefore(script, insertAt);
      } else {
        (document.head || document.body).appendChild(script);
      }
      this.script = script;

      var isUAgecko = 'undefined' !== typeof navigator && /gecko/i.test(navigator.userAgent);

      if (isUAgecko) {
        setTimeout(function () {
          var iframe = document.createElement('iframe');
          document.body.appendChild(iframe);
          document.body.removeChild(iframe);
        }, 100);
      }
    };

    /**
     * Writes with a hidden iframe.
     *
     * @param {String} data to send
     * @param {Function} called upon flush.
     * @api private
     */

    JSONPPolling.prototype.doWrite = function (data, fn) {
      var self = this;

      if (!this.form) {
        var form = document.createElement('form');
        var area = document.createElement('textarea');
        var id = this.iframeId = 'eio_iframe_' + this.index;
        var iframe;

        form.className = 'socketio';
        form.style.position = 'absolute';
        form.style.top = '-1000px';
        form.style.left = '-1000px';
        form.target = id;
        form.method = 'POST';
        form.setAttribute('accept-charset', 'utf-8');
        area.name = 'd';
        form.appendChild(area);
        document.body.appendChild(form);

        this.form = form;
        this.area = area;
      }

      this.form.action = this.uri();

      function complete () {
        initIframe();
        fn();
      }

      function initIframe () {
        if (self.iframe) {
          try {
            self.form.removeChild(self.iframe);
          } catch (e) {
            self.onError('jsonp polling iframe removal error', e);
          }
        }

        try {
          // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
          var html = '<iframe src="javascript:0" name="' + self.iframeId + '">';
          iframe = document.createElement(html);
        } catch (e) {
          iframe = document.createElement('iframe');
          iframe.name = self.iframeId;
          iframe.src = 'javascript:0';
        }

        iframe.id = self.iframeId;

        self.form.appendChild(iframe);
        self.iframe = iframe;
      }

      initIframe();

      // escape \n to prevent it from being converted into \r\n by some UAs
      // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
      data = data.replace(rEscapedNewline, '\\\n');
      this.area.value = data.replace(rNewline, '\\n');

      try {
        this.form.submit();
      } catch (e) {}

      if (this.iframe.attachEvent) {
        this.iframe.onreadystatechange = function () {
          if (self.iframe.readyState === 'complete') {
            complete();
          }
        };
      } else {
        this.iframe.onload = complete;
      }
    };

    var _nodeResolve_empty = {};

    var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _nodeResolve_empty
    });

    var require$$1 = getCjsExportFromNamespace(_nodeResolve_empty$1);

    /**
     * Module dependencies.
     */






    var debug$4 = browser$3('engine.io-client:websocket');

    var BrowserWebSocket, NodeWebSocket;

    if (typeof WebSocket !== 'undefined') {
      BrowserWebSocket = WebSocket;
    } else if (typeof self !== 'undefined') {
      BrowserWebSocket = self.WebSocket || self.MozWebSocket;
    }

    if (typeof window === 'undefined') {
      try {
        NodeWebSocket = require$$1;
      } catch (e) { }
    }

    /**
     * Get either the `WebSocket` or `MozWebSocket` globals
     * in the browser or try to resolve WebSocket-compatible
     * interface exposed by `ws` for Node-like environment.
     */

    var WebSocketImpl = BrowserWebSocket || NodeWebSocket;

    /**
     * Module exports.
     */

    var websocket = WS;

    /**
     * WebSocket transport constructor.
     *
     * @api {Object} connection options
     * @api public
     */

    function WS (opts) {
      var forceBase64 = (opts && opts.forceBase64);
      if (forceBase64) {
        this.supportsBinary = false;
      }
      this.perMessageDeflate = opts.perMessageDeflate;
      this.usingBrowserWebSocket = BrowserWebSocket && !opts.forceNode;
      this.protocols = opts.protocols;
      if (!this.usingBrowserWebSocket) {
        WebSocketImpl = NodeWebSocket;
      }
      transport.call(this, opts);
    }

    /**
     * Inherits from Transport.
     */

    componentInherit(WS, transport);

    /**
     * Transport name.
     *
     * @api public
     */

    WS.prototype.name = 'websocket';

    /*
     * WebSockets support binary
     */

    WS.prototype.supportsBinary = true;

    /**
     * Opens socket.
     *
     * @api private
     */

    WS.prototype.doOpen = function () {
      if (!this.check()) {
        // let probe timeout
        return;
      }

      var uri = this.uri();
      var protocols = this.protocols;
      var opts = {
        agent: this.agent,
        perMessageDeflate: this.perMessageDeflate
      };

      // SSL options for Node.js client
      opts.pfx = this.pfx;
      opts.key = this.key;
      opts.passphrase = this.passphrase;
      opts.cert = this.cert;
      opts.ca = this.ca;
      opts.ciphers = this.ciphers;
      opts.rejectUnauthorized = this.rejectUnauthorized;
      if (this.extraHeaders) {
        opts.headers = this.extraHeaders;
      }
      if (this.localAddress) {
        opts.localAddress = this.localAddress;
      }

      try {
        this.ws =
          this.usingBrowserWebSocket && !this.isReactNative
            ? protocols
              ? new WebSocketImpl(uri, protocols)
              : new WebSocketImpl(uri)
            : new WebSocketImpl(uri, protocols, opts);
      } catch (err) {
        return this.emit('error', err);
      }

      if (this.ws.binaryType === undefined) {
        this.supportsBinary = false;
      }

      if (this.ws.supports && this.ws.supports.binary) {
        this.supportsBinary = true;
        this.ws.binaryType = 'nodebuffer';
      } else {
        this.ws.binaryType = 'arraybuffer';
      }

      this.addEventListeners();
    };

    /**
     * Adds event listeners to the socket
     *
     * @api private
     */

    WS.prototype.addEventListeners = function () {
      var self = this;

      this.ws.onopen = function () {
        self.onOpen();
      };
      this.ws.onclose = function () {
        self.onClose();
      };
      this.ws.onmessage = function (ev) {
        self.onData(ev.data);
      };
      this.ws.onerror = function (e) {
        self.onError('websocket error', e);
      };
    };

    /**
     * Writes data to socket.
     *
     * @param {Array} array of packets.
     * @api private
     */

    WS.prototype.write = function (packets) {
      var self = this;
      this.writable = false;

      // encodePacket efficient as it uses WS framing
      // no need for encodePayload
      var total = packets.length;
      for (var i = 0, l = total; i < l; i++) {
        (function (packet) {
          browser$2.encodePacket(packet, self.supportsBinary, function (data) {
            if (!self.usingBrowserWebSocket) {
              // always create a new object (GH-437)
              var opts = {};
              if (packet.options) {
                opts.compress = packet.options.compress;
              }

              if (self.perMessageDeflate) {
                var len = 'string' === typeof data ? Buffer.byteLength(data) : data.length;
                if (len < self.perMessageDeflate.threshold) {
                  opts.compress = false;
                }
              }
            }

            // Sometimes the websocket has already been closed but the browser didn't
            // have a chance of informing us about it yet, in that case send will
            // throw an error
            try {
              if (self.usingBrowserWebSocket) {
                // TypeError is thrown when passing the second argument on Safari
                self.ws.send(data);
              } else {
                self.ws.send(data, opts);
              }
            } catch (e) {
              debug$4('websocket closed before onclose event');
            }

            --total || done();
          });
        })(packets[i]);
      }

      function done () {
        self.emit('flush');

        // fake drain
        // defer to next tick to allow Socket to clear writeBuffer
        setTimeout(function () {
          self.writable = true;
          self.emit('drain');
        }, 0);
      }
    };

    /**
     * Called upon close
     *
     * @api private
     */

    WS.prototype.onClose = function () {
      transport.prototype.onClose.call(this);
    };

    /**
     * Closes socket.
     *
     * @api private
     */

    WS.prototype.doClose = function () {
      if (typeof this.ws !== 'undefined') {
        this.ws.close();
      }
    };

    /**
     * Generates uri for connection.
     *
     * @api private
     */

    WS.prototype.uri = function () {
      var query = this.query || {};
      var schema = this.secure ? 'wss' : 'ws';
      var port = '';

      // avoid port if default for schema
      if (this.port && (('wss' === schema && Number(this.port) !== 443) ||
        ('ws' === schema && Number(this.port) !== 80))) {
        port = ':' + this.port;
      }

      // append timestamp to URI
      if (this.timestampRequests) {
        query[this.timestampParam] = yeast_1();
      }

      // communicate binary support capabilities
      if (!this.supportsBinary) {
        query.b64 = 1;
      }

      query = parseqs.encode(query);

      // prepend ? to query
      if (query.length) {
        query = '?' + query;
      }

      var ipv6 = this.hostname.indexOf(':') !== -1;
      return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
    };

    /**
     * Feature detection for WebSocket.
     *
     * @return {Boolean} whether this transport is available.
     * @api public
     */

    WS.prototype.check = function () {
      return !!WebSocketImpl && !('__initialize' in WebSocketImpl && this.name === WS.prototype.name);
    };

    /**
     * Module dependencies
     */






    /**
     * Export transports.
     */

    var polling_1 = polling$1;
    var websocket_1 = websocket;

    /**
     * Polling transport polymorphic constructor.
     * Decides on xhr vs jsonp based on feature detection.
     *
     * @api private
     */

    function polling$1 (opts) {
      var xhr;
      var xd = false;
      var xs = false;
      var jsonp = false !== opts.jsonp;

      if (typeof location !== 'undefined') {
        var isSSL = 'https:' === location.protocol;
        var port = location.port;

        // some user agents have empty `location.port`
        if (!port) {
          port = isSSL ? 443 : 80;
        }

        xd = opts.hostname !== location.hostname || port !== opts.port;
        xs = opts.secure !== isSSL;
      }

      opts.xdomain = xd;
      opts.xscheme = xs;
      xhr = new xmlhttprequest(opts);

      if ('open' in xhr && !opts.forceJSONP) {
        return new pollingXhr(opts);
      } else {
        if (!jsonp) throw new Error('JSONP disabled');
        return new pollingJsonp(opts);
      }
    }

    var transports = {
    	polling: polling_1,
    	websocket: websocket_1
    };

    var indexOf = [].indexOf;

    var indexof = function(arr, obj){
      if (indexOf) return arr.indexOf(obj);
      for (var i = 0; i < arr.length; ++i) {
        if (arr[i] === obj) return i;
      }
      return -1;
    };

    /**
     * Module dependencies.
     */



    var debug$5 = browser$3('engine.io-client:socket');





    /**
     * Module exports.
     */

    var socket = Socket;

    /**
     * Socket constructor.
     *
     * @param {String|Object} uri or options
     * @param {Object} options
     * @api public
     */

    function Socket (uri, opts) {
      if (!(this instanceof Socket)) return new Socket(uri, opts);

      opts = opts || {};

      if (uri && 'object' === typeof uri) {
        opts = uri;
        uri = null;
      }

      if (uri) {
        uri = parseuri(uri);
        opts.hostname = uri.host;
        opts.secure = uri.protocol === 'https' || uri.protocol === 'wss';
        opts.port = uri.port;
        if (uri.query) opts.query = uri.query;
      } else if (opts.host) {
        opts.hostname = parseuri(opts.host).host;
      }

      this.secure = null != opts.secure ? opts.secure
        : (typeof location !== 'undefined' && 'https:' === location.protocol);

      if (opts.hostname && !opts.port) {
        // if no port is specified manually, use the protocol default
        opts.port = this.secure ? '443' : '80';
      }

      this.agent = opts.agent || false;
      this.hostname = opts.hostname ||
        (typeof location !== 'undefined' ? location.hostname : 'localhost');
      this.port = opts.port || (typeof location !== 'undefined' && location.port
          ? location.port
          : (this.secure ? 443 : 80));
      this.query = opts.query || {};
      if ('string' === typeof this.query) this.query = parseqs.decode(this.query);
      this.upgrade = false !== opts.upgrade;
      this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
      this.forceJSONP = !!opts.forceJSONP;
      this.jsonp = false !== opts.jsonp;
      this.forceBase64 = !!opts.forceBase64;
      this.enablesXDR = !!opts.enablesXDR;
      this.withCredentials = false !== opts.withCredentials;
      this.timestampParam = opts.timestampParam || 't';
      this.timestampRequests = opts.timestampRequests;
      this.transports = opts.transports || ['polling', 'websocket'];
      this.transportOptions = opts.transportOptions || {};
      this.readyState = '';
      this.writeBuffer = [];
      this.prevBufferLen = 0;
      this.policyPort = opts.policyPort || 843;
      this.rememberUpgrade = opts.rememberUpgrade || false;
      this.binaryType = null;
      this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
      this.perMessageDeflate = false !== opts.perMessageDeflate ? (opts.perMessageDeflate || {}) : false;

      if (true === this.perMessageDeflate) this.perMessageDeflate = {};
      if (this.perMessageDeflate && null == this.perMessageDeflate.threshold) {
        this.perMessageDeflate.threshold = 1024;
      }

      // SSL options for Node.js client
      this.pfx = opts.pfx || null;
      this.key = opts.key || null;
      this.passphrase = opts.passphrase || null;
      this.cert = opts.cert || null;
      this.ca = opts.ca || null;
      this.ciphers = opts.ciphers || null;
      this.rejectUnauthorized = opts.rejectUnauthorized === undefined ? true : opts.rejectUnauthorized;
      this.forceNode = !!opts.forceNode;

      // detect ReactNative environment
      this.isReactNative = (typeof navigator !== 'undefined' && typeof navigator.product === 'string' && navigator.product.toLowerCase() === 'reactnative');

      // other options for Node.js or ReactNative client
      if (typeof self === 'undefined' || this.isReactNative) {
        if (opts.extraHeaders && Object.keys(opts.extraHeaders).length > 0) {
          this.extraHeaders = opts.extraHeaders;
        }

        if (opts.localAddress) {
          this.localAddress = opts.localAddress;
        }
      }

      // set on handshake
      this.id = null;
      this.upgrades = null;
      this.pingInterval = null;
      this.pingTimeout = null;

      // set on heartbeat
      this.pingIntervalTimer = null;
      this.pingTimeoutTimer = null;

      this.open();
    }

    Socket.priorWebsocketSuccess = false;

    /**
     * Mix in `Emitter`.
     */

    componentEmitter$1(Socket.prototype);

    /**
     * Protocol version.
     *
     * @api public
     */

    Socket.protocol = browser$2.protocol; // this is an int

    /**
     * Expose deps for legacy compatibility
     * and standalone browser access.
     */

    Socket.Socket = Socket;
    Socket.Transport = transport;
    Socket.transports = transports;
    Socket.parser = browser$2;

    /**
     * Creates transport of the given type.
     *
     * @param {String} transport name
     * @return {Transport}
     * @api private
     */

    Socket.prototype.createTransport = function (name) {
      debug$5('creating transport "%s"', name);
      var query = clone(this.query);

      // append engine.io protocol identifier
      query.EIO = browser$2.protocol;

      // transport name
      query.transport = name;

      // per-transport options
      var options = this.transportOptions[name] || {};

      // session id if we already have one
      if (this.id) query.sid = this.id;

      var transport = new transports[name]({
        query: query,
        socket: this,
        agent: options.agent || this.agent,
        hostname: options.hostname || this.hostname,
        port: options.port || this.port,
        secure: options.secure || this.secure,
        path: options.path || this.path,
        forceJSONP: options.forceJSONP || this.forceJSONP,
        jsonp: options.jsonp || this.jsonp,
        forceBase64: options.forceBase64 || this.forceBase64,
        enablesXDR: options.enablesXDR || this.enablesXDR,
        withCredentials: options.withCredentials || this.withCredentials,
        timestampRequests: options.timestampRequests || this.timestampRequests,
        timestampParam: options.timestampParam || this.timestampParam,
        policyPort: options.policyPort || this.policyPort,
        pfx: options.pfx || this.pfx,
        key: options.key || this.key,
        passphrase: options.passphrase || this.passphrase,
        cert: options.cert || this.cert,
        ca: options.ca || this.ca,
        ciphers: options.ciphers || this.ciphers,
        rejectUnauthorized: options.rejectUnauthorized || this.rejectUnauthorized,
        perMessageDeflate: options.perMessageDeflate || this.perMessageDeflate,
        extraHeaders: options.extraHeaders || this.extraHeaders,
        forceNode: options.forceNode || this.forceNode,
        localAddress: options.localAddress || this.localAddress,
        requestTimeout: options.requestTimeout || this.requestTimeout,
        protocols: options.protocols || void (0),
        isReactNative: this.isReactNative
      });

      return transport;
    };

    function clone (obj) {
      var o = {};
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          o[i] = obj[i];
        }
      }
      return o;
    }

    /**
     * Initializes transport to use and starts probe.
     *
     * @api private
     */
    Socket.prototype.open = function () {
      var transport;
      if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') !== -1) {
        transport = 'websocket';
      } else if (0 === this.transports.length) {
        // Emit error on next tick so it can be listened to
        var self = this;
        setTimeout(function () {
          self.emit('error', 'No transports available');
        }, 0);
        return;
      } else {
        transport = this.transports[0];
      }
      this.readyState = 'opening';

      // Retry with the next transport if the transport is disabled (jsonp: false)
      try {
        transport = this.createTransport(transport);
      } catch (e) {
        this.transports.shift();
        this.open();
        return;
      }

      transport.open();
      this.setTransport(transport);
    };

    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @api private
     */

    Socket.prototype.setTransport = function (transport) {
      debug$5('setting transport %s', transport.name);
      var self = this;

      if (this.transport) {
        debug$5('clearing existing transport %s', this.transport.name);
        this.transport.removeAllListeners();
      }

      // set up transport
      this.transport = transport;

      // set up transport listeners
      transport
      .on('drain', function () {
        self.onDrain();
      })
      .on('packet', function (packet) {
        self.onPacket(packet);
      })
      .on('error', function (e) {
        self.onError(e);
      })
      .on('close', function () {
        self.onClose('transport close');
      });
    };

    /**
     * Probes a transport.
     *
     * @param {String} transport name
     * @api private
     */

    Socket.prototype.probe = function (name) {
      debug$5('probing transport "%s"', name);
      var transport = this.createTransport(name, { probe: 1 });
      var failed = false;
      var self = this;

      Socket.priorWebsocketSuccess = false;

      function onTransportOpen () {
        if (self.onlyBinaryUpgrades) {
          var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
          failed = failed || upgradeLosesBinary;
        }
        if (failed) return;

        debug$5('probe transport "%s" opened', name);
        transport.send([{ type: 'ping', data: 'probe' }]);
        transport.once('packet', function (msg) {
          if (failed) return;
          if ('pong' === msg.type && 'probe' === msg.data) {
            debug$5('probe transport "%s" pong', name);
            self.upgrading = true;
            self.emit('upgrading', transport);
            if (!transport) return;
            Socket.priorWebsocketSuccess = 'websocket' === transport.name;

            debug$5('pausing current transport "%s"', self.transport.name);
            self.transport.pause(function () {
              if (failed) return;
              if ('closed' === self.readyState) return;
              debug$5('changing transport and sending upgrade packet');

              cleanup();

              self.setTransport(transport);
              transport.send([{ type: 'upgrade' }]);
              self.emit('upgrade', transport);
              transport = null;
              self.upgrading = false;
              self.flush();
            });
          } else {
            debug$5('probe transport "%s" failed', name);
            var err = new Error('probe error');
            err.transport = transport.name;
            self.emit('upgradeError', err);
          }
        });
      }

      function freezeTransport () {
        if (failed) return;

        // Any callback called by transport should be ignored since now
        failed = true;

        cleanup();

        transport.close();
        transport = null;
      }

      // Handle any error that happens while probing
      function onerror (err) {
        var error = new Error('probe error: ' + err);
        error.transport = transport.name;

        freezeTransport();

        debug$5('probe transport "%s" failed because of error: %s', name, err);

        self.emit('upgradeError', error);
      }

      function onTransportClose () {
        onerror('transport closed');
      }

      // When the socket is closed while we're probing
      function onclose () {
        onerror('socket closed');
      }

      // When the socket is upgraded while we're probing
      function onupgrade (to) {
        if (transport && to.name !== transport.name) {
          debug$5('"%s" works - aborting "%s"', to.name, transport.name);
          freezeTransport();
        }
      }

      // Remove all listeners on the transport and on self
      function cleanup () {
        transport.removeListener('open', onTransportOpen);
        transport.removeListener('error', onerror);
        transport.removeListener('close', onTransportClose);
        self.removeListener('close', onclose);
        self.removeListener('upgrading', onupgrade);
      }

      transport.once('open', onTransportOpen);
      transport.once('error', onerror);
      transport.once('close', onTransportClose);

      this.once('close', onclose);
      this.once('upgrading', onupgrade);

      transport.open();
    };

    /**
     * Called when connection is deemed open.
     *
     * @api public
     */

    Socket.prototype.onOpen = function () {
      debug$5('socket open');
      this.readyState = 'open';
      Socket.priorWebsocketSuccess = 'websocket' === this.transport.name;
      this.emit('open');
      this.flush();

      // we check for `readyState` in case an `open`
      // listener already closed the socket
      if ('open' === this.readyState && this.upgrade && this.transport.pause) {
        debug$5('starting upgrade probes');
        for (var i = 0, l = this.upgrades.length; i < l; i++) {
          this.probe(this.upgrades[i]);
        }
      }
    };

    /**
     * Handles a packet.
     *
     * @api private
     */

    Socket.prototype.onPacket = function (packet) {
      if ('opening' === this.readyState || 'open' === this.readyState ||
          'closing' === this.readyState) {
        debug$5('socket receive: type "%s", data "%s"', packet.type, packet.data);

        this.emit('packet', packet);

        // Socket is live - any packet counts
        this.emit('heartbeat');

        switch (packet.type) {
          case 'open':
            this.onHandshake(JSON.parse(packet.data));
            break;

          case 'pong':
            this.setPing();
            this.emit('pong');
            break;

          case 'error':
            var err = new Error('server error');
            err.code = packet.data;
            this.onError(err);
            break;

          case 'message':
            this.emit('data', packet.data);
            this.emit('message', packet.data);
            break;
        }
      } else {
        debug$5('packet received with socket readyState "%s"', this.readyState);
      }
    };

    /**
     * Called upon handshake completion.
     *
     * @param {Object} handshake obj
     * @api private
     */

    Socket.prototype.onHandshake = function (data) {
      this.emit('handshake', data);
      this.id = data.sid;
      this.transport.query.sid = data.sid;
      this.upgrades = this.filterUpgrades(data.upgrades);
      this.pingInterval = data.pingInterval;
      this.pingTimeout = data.pingTimeout;
      this.onOpen();
      // In case open handler closes socket
      if ('closed' === this.readyState) return;
      this.setPing();

      // Prolong liveness of socket on heartbeat
      this.removeListener('heartbeat', this.onHeartbeat);
      this.on('heartbeat', this.onHeartbeat);
    };

    /**
     * Resets ping timeout.
     *
     * @api private
     */

    Socket.prototype.onHeartbeat = function (timeout) {
      clearTimeout(this.pingTimeoutTimer);
      var self = this;
      self.pingTimeoutTimer = setTimeout(function () {
        if ('closed' === self.readyState) return;
        self.onClose('ping timeout');
      }, timeout || (self.pingInterval + self.pingTimeout));
    };

    /**
     * Pings server every `this.pingInterval` and expects response
     * within `this.pingTimeout` or closes connection.
     *
     * @api private
     */

    Socket.prototype.setPing = function () {
      var self = this;
      clearTimeout(self.pingIntervalTimer);
      self.pingIntervalTimer = setTimeout(function () {
        debug$5('writing ping packet - expecting pong within %sms', self.pingTimeout);
        self.ping();
        self.onHeartbeat(self.pingTimeout);
      }, self.pingInterval);
    };

    /**
    * Sends a ping packet.
    *
    * @api private
    */

    Socket.prototype.ping = function () {
      var self = this;
      this.sendPacket('ping', function () {
        self.emit('ping');
      });
    };

    /**
     * Called on `drain` event
     *
     * @api private
     */

    Socket.prototype.onDrain = function () {
      this.writeBuffer.splice(0, this.prevBufferLen);

      // setting prevBufferLen = 0 is very important
      // for example, when upgrading, upgrade packet is sent over,
      // and a nonzero prevBufferLen could cause problems on `drain`
      this.prevBufferLen = 0;

      if (0 === this.writeBuffer.length) {
        this.emit('drain');
      } else {
        this.flush();
      }
    };

    /**
     * Flush write buffers.
     *
     * @api private
     */

    Socket.prototype.flush = function () {
      if ('closed' !== this.readyState && this.transport.writable &&
        !this.upgrading && this.writeBuffer.length) {
        debug$5('flushing %d packets in socket', this.writeBuffer.length);
        this.transport.send(this.writeBuffer);
        // keep track of current length of writeBuffer
        // splice writeBuffer and callbackBuffer on `drain`
        this.prevBufferLen = this.writeBuffer.length;
        this.emit('flush');
      }
    };

    /**
     * Sends a message.
     *
     * @param {String} message.
     * @param {Function} callback function.
     * @param {Object} options.
     * @return {Socket} for chaining.
     * @api public
     */

    Socket.prototype.write =
    Socket.prototype.send = function (msg, options, fn) {
      this.sendPacket('message', msg, options, fn);
      return this;
    };

    /**
     * Sends a packet.
     *
     * @param {String} packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} callback function.
     * @api private
     */

    Socket.prototype.sendPacket = function (type, data, options, fn) {
      if ('function' === typeof data) {
        fn = data;
        data = undefined;
      }

      if ('function' === typeof options) {
        fn = options;
        options = null;
      }

      if ('closing' === this.readyState || 'closed' === this.readyState) {
        return;
      }

      options = options || {};
      options.compress = false !== options.compress;

      var packet = {
        type: type,
        data: data,
        options: options
      };
      this.emit('packetCreate', packet);
      this.writeBuffer.push(packet);
      if (fn) this.once('flush', fn);
      this.flush();
    };

    /**
     * Closes the connection.
     *
     * @api private
     */

    Socket.prototype.close = function () {
      if ('opening' === this.readyState || 'open' === this.readyState) {
        this.readyState = 'closing';

        var self = this;

        if (this.writeBuffer.length) {
          this.once('drain', function () {
            if (this.upgrading) {
              waitForUpgrade();
            } else {
              close();
            }
          });
        } else if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      }

      function close () {
        self.onClose('forced close');
        debug$5('socket closing - telling transport to close');
        self.transport.close();
      }

      function cleanupAndClose () {
        self.removeListener('upgrade', cleanupAndClose);
        self.removeListener('upgradeError', cleanupAndClose);
        close();
      }

      function waitForUpgrade () {
        // wait for upgrade to finish since we can't send packets while pausing a transport
        self.once('upgrade', cleanupAndClose);
        self.once('upgradeError', cleanupAndClose);
      }

      return this;
    };

    /**
     * Called upon transport error
     *
     * @api private
     */

    Socket.prototype.onError = function (err) {
      debug$5('socket error %j', err);
      Socket.priorWebsocketSuccess = false;
      this.emit('error', err);
      this.onClose('transport error', err);
    };

    /**
     * Called upon transport close.
     *
     * @api private
     */

    Socket.prototype.onClose = function (reason, desc) {
      if ('opening' === this.readyState || 'open' === this.readyState || 'closing' === this.readyState) {
        debug$5('socket close with reason: "%s"', reason);
        var self = this;

        // clear timers
        clearTimeout(this.pingIntervalTimer);
        clearTimeout(this.pingTimeoutTimer);

        // stop event from firing again for transport
        this.transport.removeAllListeners('close');

        // ensure transport won't stay open
        this.transport.close();

        // ignore further transport communication
        this.transport.removeAllListeners();

        // set ready state
        this.readyState = 'closed';

        // clear session id
        this.id = null;

        // emit close event
        this.emit('close', reason, desc);

        // clean buffers after, so users can still
        // grab the buffers on `close` event
        self.writeBuffer = [];
        self.prevBufferLen = 0;
      }
    };

    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} server upgrades
     * @api private
     *
     */

    Socket.prototype.filterUpgrades = function (upgrades) {
      var filteredUpgrades = [];
      for (var i = 0, j = upgrades.length; i < j; i++) {
        if (~indexof(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
      }
      return filteredUpgrades;
    };

    var lib = socket;

    /**
     * Exports parser
     *
     * @api public
     *
     */
    var parser = browser$2;
    lib.parser = parser;

    var componentEmitter$2 = createCommonjsModule(function (module) {
    /**
     * Expose `Emitter`.
     */

    {
      module.exports = Emitter;
    }

    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */

    function Emitter(obj) {
      if (obj) return mixin(obj);
    }
    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */

    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }

    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
      (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
      return this;
    };

    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.once = function(event, fn){
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }

      on.fn = fn;
      this.on(event, on);
      return this;
    };

    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};

      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }

      // specific event
      var callbacks = this._callbacks['$' + event];
      if (!callbacks) return this;

      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
      }

      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      return this;
    };

    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */

    Emitter.prototype.emit = function(event){
      this._callbacks = this._callbacks || {};
      var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks['$' + event];

      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }

      return this;
    };

    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */

    Emitter.prototype.listeners = function(event){
      this._callbacks = this._callbacks || {};
      return this._callbacks['$' + event] || [];
    };

    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */

    Emitter.prototype.hasListeners = function(event){
      return !! this.listeners(event).length;
    };
    });

    var toArray_1 = toArray;

    function toArray(list, index) {
        var array = [];

        index = index || 0;

        for (var i = index || 0; i < list.length; i++) {
            array[i - index] = list[i];
        }

        return array
    }

    /**
     * Module exports.
     */

    var on_1 = on;

    /**
     * Helper for subscriptions.
     *
     * @param {Object|EventEmitter} obj with `Emitter` mixin or `EventEmitter`
     * @param {String} event name
     * @param {Function} callback
     * @api public
     */

    function on (obj, ev, fn) {
      obj.on(ev, fn);
      return {
        destroy: function () {
          obj.removeListener(ev, fn);
        }
      };
    }

    /**
     * Slice reference.
     */

    var slice = [].slice;

    /**
     * Bind `obj` to `fn`.
     *
     * @param {Object} obj
     * @param {Function|String} fn or string
     * @return {Function}
     * @api public
     */

    var componentBind = function(obj, fn){
      if ('string' == typeof fn) fn = obj[fn];
      if ('function' != typeof fn) throw new Error('bind() requires a function');
      var args = slice.call(arguments, 2);
      return function(){
        return fn.apply(obj, args.concat(slice.call(arguments)));
      }
    };

    var socket$1 = createCommonjsModule(function (module, exports) {
    /**
     * Module dependencies.
     */






    var debug = browser('socket.io-client:socket');



    /**
     * Module exports.
     */

    module.exports = exports = Socket;

    /**
     * Internal events (blacklisted).
     * These events can't be emitted by the user.
     *
     * @api private
     */

    var events = {
      connect: 1,
      connect_error: 1,
      connect_timeout: 1,
      connecting: 1,
      disconnect: 1,
      error: 1,
      reconnect: 1,
      reconnect_attempt: 1,
      reconnect_failed: 1,
      reconnect_error: 1,
      reconnecting: 1,
      ping: 1,
      pong: 1
    };

    /**
     * Shortcut to `Emitter#emit`.
     */

    var emit = componentEmitter$2.prototype.emit;

    /**
     * `Socket` constructor.
     *
     * @api public
     */

    function Socket (io, nsp, opts) {
      this.io = io;
      this.nsp = nsp;
      this.json = this; // compat
      this.ids = 0;
      this.acks = {};
      this.receiveBuffer = [];
      this.sendBuffer = [];
      this.connected = false;
      this.disconnected = true;
      this.flags = {};
      if (opts && opts.query) {
        this.query = opts.query;
      }
      if (this.io.autoConnect) this.open();
    }

    /**
     * Mix in `Emitter`.
     */

    componentEmitter$2(Socket.prototype);

    /**
     * Subscribe to open, close and packet events
     *
     * @api private
     */

    Socket.prototype.subEvents = function () {
      if (this.subs) return;

      var io = this.io;
      this.subs = [
        on_1(io, 'open', componentBind(this, 'onopen')),
        on_1(io, 'packet', componentBind(this, 'onpacket')),
        on_1(io, 'close', componentBind(this, 'onclose'))
      ];
    };

    /**
     * "Opens" the socket.
     *
     * @api public
     */

    Socket.prototype.open =
    Socket.prototype.connect = function () {
      if (this.connected) return this;

      this.subEvents();
      this.io.open(); // ensure open
      if ('open' === this.io.readyState) this.onopen();
      this.emit('connecting');
      return this;
    };

    /**
     * Sends a `message` event.
     *
     * @return {Socket} self
     * @api public
     */

    Socket.prototype.send = function () {
      var args = toArray_1(arguments);
      args.unshift('message');
      this.emit.apply(this, args);
      return this;
    };

    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @param {String} event name
     * @return {Socket} self
     * @api public
     */

    Socket.prototype.emit = function (ev) {
      if (events.hasOwnProperty(ev)) {
        emit.apply(this, arguments);
        return this;
      }

      var args = toArray_1(arguments);
      var packet = {
        type: (this.flags.binary !== undefined ? this.flags.binary : hasBinary2(args)) ? socket_ioParser.BINARY_EVENT : socket_ioParser.EVENT,
        data: args
      };

      packet.options = {};
      packet.options.compress = !this.flags || false !== this.flags.compress;

      // event ack callback
      if ('function' === typeof args[args.length - 1]) {
        debug('emitting packet with ack id %d', this.ids);
        this.acks[this.ids] = args.pop();
        packet.id = this.ids++;
      }

      if (this.connected) {
        this.packet(packet);
      } else {
        this.sendBuffer.push(packet);
      }

      this.flags = {};

      return this;
    };

    /**
     * Sends a packet.
     *
     * @param {Object} packet
     * @api private
     */

    Socket.prototype.packet = function (packet) {
      packet.nsp = this.nsp;
      this.io.packet(packet);
    };

    /**
     * Called upon engine `open`.
     *
     * @api private
     */

    Socket.prototype.onopen = function () {
      debug('transport is open - connecting');

      // write connect packet if necessary
      if ('/' !== this.nsp) {
        if (this.query) {
          var query = typeof this.query === 'object' ? parseqs.encode(this.query) : this.query;
          debug('sending connect packet with query %s', query);
          this.packet({type: socket_ioParser.CONNECT, query: query});
        } else {
          this.packet({type: socket_ioParser.CONNECT});
        }
      }
    };

    /**
     * Called upon engine `close`.
     *
     * @param {String} reason
     * @api private
     */

    Socket.prototype.onclose = function (reason) {
      debug('close (%s)', reason);
      this.connected = false;
      this.disconnected = true;
      delete this.id;
      this.emit('disconnect', reason);
    };

    /**
     * Called with socket packet.
     *
     * @param {Object} packet
     * @api private
     */

    Socket.prototype.onpacket = function (packet) {
      var sameNamespace = packet.nsp === this.nsp;
      var rootNamespaceError = packet.type === socket_ioParser.ERROR && packet.nsp === '/';

      if (!sameNamespace && !rootNamespaceError) return;

      switch (packet.type) {
        case socket_ioParser.CONNECT:
          this.onconnect();
          break;

        case socket_ioParser.EVENT:
          this.onevent(packet);
          break;

        case socket_ioParser.BINARY_EVENT:
          this.onevent(packet);
          break;

        case socket_ioParser.ACK:
          this.onack(packet);
          break;

        case socket_ioParser.BINARY_ACK:
          this.onack(packet);
          break;

        case socket_ioParser.DISCONNECT:
          this.ondisconnect();
          break;

        case socket_ioParser.ERROR:
          this.emit('error', packet.data);
          break;
      }
    };

    /**
     * Called upon a server event.
     *
     * @param {Object} packet
     * @api private
     */

    Socket.prototype.onevent = function (packet) {
      var args = packet.data || [];
      debug('emitting event %j', args);

      if (null != packet.id) {
        debug('attaching ack callback to event');
        args.push(this.ack(packet.id));
      }

      if (this.connected) {
        emit.apply(this, args);
      } else {
        this.receiveBuffer.push(args);
      }
    };

    /**
     * Produces an ack callback to emit with an event.
     *
     * @api private
     */

    Socket.prototype.ack = function (id) {
      var self = this;
      var sent = false;
      return function () {
        // prevent double callbacks
        if (sent) return;
        sent = true;
        var args = toArray_1(arguments);
        debug('sending ack %j', args);

        self.packet({
          type: hasBinary2(args) ? socket_ioParser.BINARY_ACK : socket_ioParser.ACK,
          id: id,
          data: args
        });
      };
    };

    /**
     * Called upon a server acknowlegement.
     *
     * @param {Object} packet
     * @api private
     */

    Socket.prototype.onack = function (packet) {
      var ack = this.acks[packet.id];
      if ('function' === typeof ack) {
        debug('calling ack %s with %j', packet.id, packet.data);
        ack.apply(this, packet.data);
        delete this.acks[packet.id];
      } else {
        debug('bad ack %s', packet.id);
      }
    };

    /**
     * Called upon server connect.
     *
     * @api private
     */

    Socket.prototype.onconnect = function () {
      this.connected = true;
      this.disconnected = false;
      this.emit('connect');
      this.emitBuffered();
    };

    /**
     * Emit buffered events (received and emitted).
     *
     * @api private
     */

    Socket.prototype.emitBuffered = function () {
      var i;
      for (i = 0; i < this.receiveBuffer.length; i++) {
        emit.apply(this, this.receiveBuffer[i]);
      }
      this.receiveBuffer = [];

      for (i = 0; i < this.sendBuffer.length; i++) {
        this.packet(this.sendBuffer[i]);
      }
      this.sendBuffer = [];
    };

    /**
     * Called upon server disconnect.
     *
     * @api private
     */

    Socket.prototype.ondisconnect = function () {
      debug('server disconnect (%s)', this.nsp);
      this.destroy();
      this.onclose('io server disconnect');
    };

    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @api private.
     */

    Socket.prototype.destroy = function () {
      if (this.subs) {
        // clean subscriptions to avoid reconnections
        for (var i = 0; i < this.subs.length; i++) {
          this.subs[i].destroy();
        }
        this.subs = null;
      }

      this.io.destroy(this);
    };

    /**
     * Disconnects the socket manually.
     *
     * @return {Socket} self
     * @api public
     */

    Socket.prototype.close =
    Socket.prototype.disconnect = function () {
      if (this.connected) {
        debug('performing disconnect (%s)', this.nsp);
        this.packet({ type: socket_ioParser.DISCONNECT });
      }

      // remove socket from pool
      this.destroy();

      if (this.connected) {
        // fire events
        this.onclose('io client disconnect');
      }
      return this;
    };

    /**
     * Sets the compress flag.
     *
     * @param {Boolean} if `true`, compresses the sending data
     * @return {Socket} self
     * @api public
     */

    Socket.prototype.compress = function (compress) {
      this.flags.compress = compress;
      return this;
    };

    /**
     * Sets the binary flag
     *
     * @param {Boolean} whether the emitted data contains binary
     * @return {Socket} self
     * @api public
     */

    Socket.prototype.binary = function (binary) {
      this.flags.binary = binary;
      return this;
    };
    });

    /**
     * Expose `Backoff`.
     */

    var backo2 = Backoff;

    /**
     * Initialize backoff timer with `opts`.
     *
     * - `min` initial timeout in milliseconds [100]
     * - `max` max timeout [10000]
     * - `jitter` [0]
     * - `factor` [2]
     *
     * @param {Object} opts
     * @api public
     */

    function Backoff(opts) {
      opts = opts || {};
      this.ms = opts.min || 100;
      this.max = opts.max || 10000;
      this.factor = opts.factor || 2;
      this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
      this.attempts = 0;
    }

    /**
     * Return the backoff duration.
     *
     * @return {Number}
     * @api public
     */

    Backoff.prototype.duration = function(){
      var ms = this.ms * Math.pow(this.factor, this.attempts++);
      if (this.jitter) {
        var rand =  Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0  ? ms - deviation : ms + deviation;
      }
      return Math.min(ms, this.max) | 0;
    };

    /**
     * Reset the number of attempts.
     *
     * @api public
     */

    Backoff.prototype.reset = function(){
      this.attempts = 0;
    };

    /**
     * Set the minimum duration
     *
     * @api public
     */

    Backoff.prototype.setMin = function(min){
      this.ms = min;
    };

    /**
     * Set the maximum duration
     *
     * @api public
     */

    Backoff.prototype.setMax = function(max){
      this.max = max;
    };

    /**
     * Set the jitter
     *
     * @api public
     */

    Backoff.prototype.setJitter = function(jitter){
      this.jitter = jitter;
    };

    /**
     * Module dependencies.
     */







    var debug$6 = browser('socket.io-client:manager');



    /**
     * IE6+ hasOwnProperty
     */

    var has = Object.prototype.hasOwnProperty;

    /**
     * Module exports
     */

    var manager = Manager;

    /**
     * `Manager` constructor.
     *
     * @param {String} engine instance or engine uri/opts
     * @param {Object} options
     * @api public
     */

    function Manager (uri, opts) {
      if (!(this instanceof Manager)) return new Manager(uri, opts);
      if (uri && ('object' === typeof uri)) {
        opts = uri;
        uri = undefined;
      }
      opts = opts || {};

      opts.path = opts.path || '/socket.io';
      this.nsps = {};
      this.subs = [];
      this.opts = opts;
      this.reconnection(opts.reconnection !== false);
      this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
      this.reconnectionDelay(opts.reconnectionDelay || 1000);
      this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
      this.randomizationFactor(opts.randomizationFactor || 0.5);
      this.backoff = new backo2({
        min: this.reconnectionDelay(),
        max: this.reconnectionDelayMax(),
        jitter: this.randomizationFactor()
      });
      this.timeout(null == opts.timeout ? 20000 : opts.timeout);
      this.readyState = 'closed';
      this.uri = uri;
      this.connecting = [];
      this.lastPing = null;
      this.encoding = false;
      this.packetBuffer = [];
      var _parser = opts.parser || socket_ioParser;
      this.encoder = new _parser.Encoder();
      this.decoder = new _parser.Decoder();
      this.autoConnect = opts.autoConnect !== false;
      if (this.autoConnect) this.open();
    }

    /**
     * Propagate given event to sockets and emit on `this`
     *
     * @api private
     */

    Manager.prototype.emitAll = function () {
      this.emit.apply(this, arguments);
      for (var nsp in this.nsps) {
        if (has.call(this.nsps, nsp)) {
          this.nsps[nsp].emit.apply(this.nsps[nsp], arguments);
        }
      }
    };

    /**
     * Update `socket.id` of all sockets
     *
     * @api private
     */

    Manager.prototype.updateSocketIds = function () {
      for (var nsp in this.nsps) {
        if (has.call(this.nsps, nsp)) {
          this.nsps[nsp].id = this.generateId(nsp);
        }
      }
    };

    /**
     * generate `socket.id` for the given `nsp`
     *
     * @param {String} nsp
     * @return {String}
     * @api private
     */

    Manager.prototype.generateId = function (nsp) {
      return (nsp === '/' ? '' : (nsp + '#')) + this.engine.id;
    };

    /**
     * Mix in `Emitter`.
     */

    componentEmitter$2(Manager.prototype);

    /**
     * Sets the `reconnection` config.
     *
     * @param {Boolean} true/false if it should automatically reconnect
     * @return {Manager} self or value
     * @api public
     */

    Manager.prototype.reconnection = function (v) {
      if (!arguments.length) return this._reconnection;
      this._reconnection = !!v;
      return this;
    };

    /**
     * Sets the reconnection attempts config.
     *
     * @param {Number} max reconnection attempts before giving up
     * @return {Manager} self or value
     * @api public
     */

    Manager.prototype.reconnectionAttempts = function (v) {
      if (!arguments.length) return this._reconnectionAttempts;
      this._reconnectionAttempts = v;
      return this;
    };

    /**
     * Sets the delay between reconnections.
     *
     * @param {Number} delay
     * @return {Manager} self or value
     * @api public
     */

    Manager.prototype.reconnectionDelay = function (v) {
      if (!arguments.length) return this._reconnectionDelay;
      this._reconnectionDelay = v;
      this.backoff && this.backoff.setMin(v);
      return this;
    };

    Manager.prototype.randomizationFactor = function (v) {
      if (!arguments.length) return this._randomizationFactor;
      this._randomizationFactor = v;
      this.backoff && this.backoff.setJitter(v);
      return this;
    };

    /**
     * Sets the maximum delay between reconnections.
     *
     * @param {Number} delay
     * @return {Manager} self or value
     * @api public
     */

    Manager.prototype.reconnectionDelayMax = function (v) {
      if (!arguments.length) return this._reconnectionDelayMax;
      this._reconnectionDelayMax = v;
      this.backoff && this.backoff.setMax(v);
      return this;
    };

    /**
     * Sets the connection timeout. `false` to disable
     *
     * @return {Manager} self or value
     * @api public
     */

    Manager.prototype.timeout = function (v) {
      if (!arguments.length) return this._timeout;
      this._timeout = v;
      return this;
    };

    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @api private
     */

    Manager.prototype.maybeReconnectOnOpen = function () {
      // Only try to reconnect if it's the first time we're connecting
      if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
        // keeps reconnection from firing twice for the same reconnection loop
        this.reconnect();
      }
    };

    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} optional, callback
     * @return {Manager} self
     * @api public
     */

    Manager.prototype.open =
    Manager.prototype.connect = function (fn, opts) {
      debug$6('readyState %s', this.readyState);
      if (~this.readyState.indexOf('open')) return this;

      debug$6('opening %s', this.uri);
      this.engine = lib(this.uri, this.opts);
      var socket = this.engine;
      var self = this;
      this.readyState = 'opening';
      this.skipReconnect = false;

      // emit `open`
      var openSub = on_1(socket, 'open', function () {
        self.onopen();
        fn && fn();
      });

      // emit `connect_error`
      var errorSub = on_1(socket, 'error', function (data) {
        debug$6('connect_error');
        self.cleanup();
        self.readyState = 'closed';
        self.emitAll('connect_error', data);
        if (fn) {
          var err = new Error('Connection error');
          err.data = data;
          fn(err);
        } else {
          // Only do this if there is no fn to handle the error
          self.maybeReconnectOnOpen();
        }
      });

      // emit `connect_timeout`
      if (false !== this._timeout) {
        var timeout = this._timeout;
        debug$6('connect attempt will timeout after %d', timeout);

        // set timer
        var timer = setTimeout(function () {
          debug$6('connect attempt timed out after %d', timeout);
          openSub.destroy();
          socket.close();
          socket.emit('error', 'timeout');
          self.emitAll('connect_timeout', timeout);
        }, timeout);

        this.subs.push({
          destroy: function () {
            clearTimeout(timer);
          }
        });
      }

      this.subs.push(openSub);
      this.subs.push(errorSub);

      return this;
    };

    /**
     * Called upon transport open.
     *
     * @api private
     */

    Manager.prototype.onopen = function () {
      debug$6('open');

      // clear old subs
      this.cleanup();

      // mark as open
      this.readyState = 'open';
      this.emit('open');

      // add new subs
      var socket = this.engine;
      this.subs.push(on_1(socket, 'data', componentBind(this, 'ondata')));
      this.subs.push(on_1(socket, 'ping', componentBind(this, 'onping')));
      this.subs.push(on_1(socket, 'pong', componentBind(this, 'onpong')));
      this.subs.push(on_1(socket, 'error', componentBind(this, 'onerror')));
      this.subs.push(on_1(socket, 'close', componentBind(this, 'onclose')));
      this.subs.push(on_1(this.decoder, 'decoded', componentBind(this, 'ondecoded')));
    };

    /**
     * Called upon a ping.
     *
     * @api private
     */

    Manager.prototype.onping = function () {
      this.lastPing = new Date();
      this.emitAll('ping');
    };

    /**
     * Called upon a packet.
     *
     * @api private
     */

    Manager.prototype.onpong = function () {
      this.emitAll('pong', new Date() - this.lastPing);
    };

    /**
     * Called with data.
     *
     * @api private
     */

    Manager.prototype.ondata = function (data) {
      this.decoder.add(data);
    };

    /**
     * Called when parser fully decodes a packet.
     *
     * @api private
     */

    Manager.prototype.ondecoded = function (packet) {
      this.emit('packet', packet);
    };

    /**
     * Called upon socket error.
     *
     * @api private
     */

    Manager.prototype.onerror = function (err) {
      debug$6('error', err);
      this.emitAll('error', err);
    };

    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @api public
     */

    Manager.prototype.socket = function (nsp, opts) {
      var socket = this.nsps[nsp];
      if (!socket) {
        socket = new socket$1(this, nsp, opts);
        this.nsps[nsp] = socket;
        var self = this;
        socket.on('connecting', onConnecting);
        socket.on('connect', function () {
          socket.id = self.generateId(nsp);
        });

        if (this.autoConnect) {
          // manually call here since connecting event is fired before listening
          onConnecting();
        }
      }

      function onConnecting () {
        if (!~indexof(self.connecting, socket)) {
          self.connecting.push(socket);
        }
      }

      return socket;
    };

    /**
     * Called upon a socket close.
     *
     * @param {Socket} socket
     */

    Manager.prototype.destroy = function (socket) {
      var index = indexof(this.connecting, socket);
      if (~index) this.connecting.splice(index, 1);
      if (this.connecting.length) return;

      this.close();
    };

    /**
     * Writes a packet.
     *
     * @param {Object} packet
     * @api private
     */

    Manager.prototype.packet = function (packet) {
      debug$6('writing packet %j', packet);
      var self = this;
      if (packet.query && packet.type === 0) packet.nsp += '?' + packet.query;

      if (!self.encoding) {
        // encode, then write to engine with result
        self.encoding = true;
        this.encoder.encode(packet, function (encodedPackets) {
          for (var i = 0; i < encodedPackets.length; i++) {
            self.engine.write(encodedPackets[i], packet.options);
          }
          self.encoding = false;
          self.processPacketQueue();
        });
      } else { // add packet to the queue
        self.packetBuffer.push(packet);
      }
    };

    /**
     * If packet buffer is non-empty, begins encoding the
     * next packet in line.
     *
     * @api private
     */

    Manager.prototype.processPacketQueue = function () {
      if (this.packetBuffer.length > 0 && !this.encoding) {
        var pack = this.packetBuffer.shift();
        this.packet(pack);
      }
    };

    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @api private
     */

    Manager.prototype.cleanup = function () {
      debug$6('cleanup');

      var subsLength = this.subs.length;
      for (var i = 0; i < subsLength; i++) {
        var sub = this.subs.shift();
        sub.destroy();
      }

      this.packetBuffer = [];
      this.encoding = false;
      this.lastPing = null;

      this.decoder.destroy();
    };

    /**
     * Close the current socket.
     *
     * @api private
     */

    Manager.prototype.close =
    Manager.prototype.disconnect = function () {
      debug$6('disconnect');
      this.skipReconnect = true;
      this.reconnecting = false;
      if ('opening' === this.readyState) {
        // `onclose` will not fire because
        // an open event never happened
        this.cleanup();
      }
      this.backoff.reset();
      this.readyState = 'closed';
      if (this.engine) this.engine.close();
    };

    /**
     * Called upon engine close.
     *
     * @api private
     */

    Manager.prototype.onclose = function (reason) {
      debug$6('onclose');

      this.cleanup();
      this.backoff.reset();
      this.readyState = 'closed';
      this.emit('close', reason);

      if (this._reconnection && !this.skipReconnect) {
        this.reconnect();
      }
    };

    /**
     * Attempt a reconnection.
     *
     * @api private
     */

    Manager.prototype.reconnect = function () {
      if (this.reconnecting || this.skipReconnect) return this;

      var self = this;

      if (this.backoff.attempts >= this._reconnectionAttempts) {
        debug$6('reconnect failed');
        this.backoff.reset();
        this.emitAll('reconnect_failed');
        this.reconnecting = false;
      } else {
        var delay = this.backoff.duration();
        debug$6('will wait %dms before reconnect attempt', delay);

        this.reconnecting = true;
        var timer = setTimeout(function () {
          if (self.skipReconnect) return;

          debug$6('attempting reconnect');
          self.emitAll('reconnect_attempt', self.backoff.attempts);
          self.emitAll('reconnecting', self.backoff.attempts);

          // check again for the case socket closed in above events
          if (self.skipReconnect) return;

          self.open(function (err) {
            if (err) {
              debug$6('reconnect attempt error');
              self.reconnecting = false;
              self.reconnect();
              self.emitAll('reconnect_error', err.data);
            } else {
              debug$6('reconnect success');
              self.onreconnect();
            }
          });
        }, delay);

        this.subs.push({
          destroy: function () {
            clearTimeout(timer);
          }
        });
      }
    };

    /**
     * Called upon successful reconnect.
     *
     * @api private
     */

    Manager.prototype.onreconnect = function () {
      var attempt = this.backoff.attempts;
      this.reconnecting = false;
      this.backoff.reset();
      this.updateSocketIds();
      this.emitAll('reconnect', attempt);
    };

    var lib$1 = createCommonjsModule(function (module, exports) {
    /**
     * Module dependencies.
     */




    var debug = browser('socket.io-client');

    /**
     * Module exports.
     */

    module.exports = exports = lookup;

    /**
     * Managers cache.
     */

    var cache = exports.managers = {};

    /**
     * Looks up an existing `Manager` for multiplexing.
     * If the user summons:
     *
     *   `io('http://localhost/a');`
     *   `io('http://localhost/b');`
     *
     * We reuse the existing instance based on same scheme/port/host,
     * and we initialize sockets for each namespace.
     *
     * @api public
     */

    function lookup (uri, opts) {
      if (typeof uri === 'object') {
        opts = uri;
        uri = undefined;
      }

      opts = opts || {};

      var parsed = url_1(uri);
      var source = parsed.source;
      var id = parsed.id;
      var path = parsed.path;
      var sameNamespace = cache[id] && path in cache[id].nsps;
      var newConnection = opts.forceNew || opts['force new connection'] ||
                          false === opts.multiplex || sameNamespace;

      var io;

      if (newConnection) {
        debug('ignoring socket cache for %s', source);
        io = manager(source, opts);
      } else {
        if (!cache[id]) {
          debug('new io instance for %s', source);
          cache[id] = manager(source, opts);
        }
        io = cache[id];
      }
      if (parsed.query && !opts.query) {
        opts.query = parsed.query;
      }
      return io.socket(parsed.path, opts);
    }

    /**
     * Protocol version.
     *
     * @api public
     */

    exports.protocol = socket_ioParser.protocol;

    /**
     * `connect`.
     *
     * @param {String} uri
     * @api public
     */

    exports.connect = lookup;

    /**
     * Expose constructors for standalone build.
     *
     * @api public
     */

    exports.Manager = manager;
    exports.Socket = socket$1;
    });
    var lib_1 = lib$1.managers;
    var lib_2 = lib$1.protocol;
    var lib_3 = lib$1.connect;
    var lib_4 = lib$1.Manager;
    var lib_5 = lib$1.Socket;

    const station = writable();

    const user = writable({ isAdmin: false });

    const socket$2 = lib$1('http://localhost:3000');

    socket$2.on("setStation", function (newStation) {
        station.set(newStation);
        if (!newStation.error) {
            if (get_store_value(location$1) == '/') {
                push('/' + newStation.id);
            } else {
                replace('/' + newStation.id);
            }
        }
    });

    socket$2.on("setUser", function (u) {
        user.set(u);
    });

    socket$2.on("videoAdded", function (waitTime) {
        // user.setCooldown(waitTime);
    });

    function newStation() {
        socket$2.emit("newStation", get_store_value(fp));
    }

    function joinStation(stationId) {
        socket$2.emit("join", stationId, get_store_value(fp));
    }

    function addVideo(video) {
        socket$2.emit("addVideo", get_store_value(station).id, video, get_store_value(fp));
    }

    function like(videoId) {
        socket$2.emit("like", get_store_value(station).id, videoId, get_store_value(fp));
    }

    function dislike(videoId) {
        socket$2.emit("dislike", get_store_value(station).id, videoId, get_store_value(fp));
    }

    function clearLike(videoId) {
        socket$2.emit("clearLike", get_store_value(station).id, videoId, get_store_value(fp));
    }

    function clearDislike(videoId) {
        socket$2.emit("clearDislike", get_store_value(station).id, videoId, get_store_value(fp));
    }

    function setPlayerState(state, videoId) {
        socket$2.emit("setPlayerState", get_store_value(station).id, videoId, state, get_store_value(fp));
    }

    var moment = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
         module.exports = factory() ;
    }(commonjsGlobal, (function () {
        var hookCallback;

        function hooks () {
            return hookCallback.apply(null, arguments);
        }

        // This is done to register the method called with moment()
        // without creating circular dependencies.
        function setHookCallback (callback) {
            hookCallback = callback;
        }

        function isArray(input) {
            return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
        }

        function isObject(input) {
            // IE8 will treat undefined and null as object if it wasn't for
            // input != null
            return input != null && Object.prototype.toString.call(input) === '[object Object]';
        }

        function isObjectEmpty(obj) {
            if (Object.getOwnPropertyNames) {
                return (Object.getOwnPropertyNames(obj).length === 0);
            } else {
                var k;
                for (k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        return false;
                    }
                }
                return true;
            }
        }

        function isUndefined(input) {
            return input === void 0;
        }

        function isNumber(input) {
            return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
        }

        function isDate(input) {
            return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
        }

        function map(arr, fn) {
            var res = [], i;
            for (i = 0; i < arr.length; ++i) {
                res.push(fn(arr[i], i));
            }
            return res;
        }

        function hasOwnProp(a, b) {
            return Object.prototype.hasOwnProperty.call(a, b);
        }

        function extend(a, b) {
            for (var i in b) {
                if (hasOwnProp(b, i)) {
                    a[i] = b[i];
                }
            }

            if (hasOwnProp(b, 'toString')) {
                a.toString = b.toString;
            }

            if (hasOwnProp(b, 'valueOf')) {
                a.valueOf = b.valueOf;
            }

            return a;
        }

        function createUTC (input, format, locale, strict) {
            return createLocalOrUTC(input, format, locale, strict, true).utc();
        }

        function defaultParsingFlags() {
            // We need to deep clone this object.
            return {
                empty           : false,
                unusedTokens    : [],
                unusedInput     : [],
                overflow        : -2,
                charsLeftOver   : 0,
                nullInput       : false,
                invalidMonth    : null,
                invalidFormat   : false,
                userInvalidated : false,
                iso             : false,
                parsedDateParts : [],
                meridiem        : null,
                rfc2822         : false,
                weekdayMismatch : false
            };
        }

        function getParsingFlags(m) {
            if (m._pf == null) {
                m._pf = defaultParsingFlags();
            }
            return m._pf;
        }

        var some;
        if (Array.prototype.some) {
            some = Array.prototype.some;
        } else {
            some = function (fun) {
                var t = Object(this);
                var len = t.length >>> 0;

                for (var i = 0; i < len; i++) {
                    if (i in t && fun.call(this, t[i], i, t)) {
                        return true;
                    }
                }

                return false;
            };
        }

        function isValid(m) {
            if (m._isValid == null) {
                var flags = getParsingFlags(m);
                var parsedParts = some.call(flags.parsedDateParts, function (i) {
                    return i != null;
                });
                var isNowValid = !isNaN(m._d.getTime()) &&
                    flags.overflow < 0 &&
                    !flags.empty &&
                    !flags.invalidMonth &&
                    !flags.invalidWeekday &&
                    !flags.weekdayMismatch &&
                    !flags.nullInput &&
                    !flags.invalidFormat &&
                    !flags.userInvalidated &&
                    (!flags.meridiem || (flags.meridiem && parsedParts));

                if (m._strict) {
                    isNowValid = isNowValid &&
                        flags.charsLeftOver === 0 &&
                        flags.unusedTokens.length === 0 &&
                        flags.bigHour === undefined;
                }

                if (Object.isFrozen == null || !Object.isFrozen(m)) {
                    m._isValid = isNowValid;
                }
                else {
                    return isNowValid;
                }
            }
            return m._isValid;
        }

        function createInvalid (flags) {
            var m = createUTC(NaN);
            if (flags != null) {
                extend(getParsingFlags(m), flags);
            }
            else {
                getParsingFlags(m).userInvalidated = true;
            }

            return m;
        }

        // Plugins that add properties should also add the key here (null value),
        // so we can properly clone ourselves.
        var momentProperties = hooks.momentProperties = [];

        function copyConfig(to, from) {
            var i, prop, val;

            if (!isUndefined(from._isAMomentObject)) {
                to._isAMomentObject = from._isAMomentObject;
            }
            if (!isUndefined(from._i)) {
                to._i = from._i;
            }
            if (!isUndefined(from._f)) {
                to._f = from._f;
            }
            if (!isUndefined(from._l)) {
                to._l = from._l;
            }
            if (!isUndefined(from._strict)) {
                to._strict = from._strict;
            }
            if (!isUndefined(from._tzm)) {
                to._tzm = from._tzm;
            }
            if (!isUndefined(from._isUTC)) {
                to._isUTC = from._isUTC;
            }
            if (!isUndefined(from._offset)) {
                to._offset = from._offset;
            }
            if (!isUndefined(from._pf)) {
                to._pf = getParsingFlags(from);
            }
            if (!isUndefined(from._locale)) {
                to._locale = from._locale;
            }

            if (momentProperties.length > 0) {
                for (i = 0; i < momentProperties.length; i++) {
                    prop = momentProperties[i];
                    val = from[prop];
                    if (!isUndefined(val)) {
                        to[prop] = val;
                    }
                }
            }

            return to;
        }

        var updateInProgress = false;

        // Moment prototype object
        function Moment(config) {
            copyConfig(this, config);
            this._d = new Date(config._d != null ? config._d.getTime() : NaN);
            if (!this.isValid()) {
                this._d = new Date(NaN);
            }
            // Prevent infinite loop in case updateOffset creates new moment
            // objects.
            if (updateInProgress === false) {
                updateInProgress = true;
                hooks.updateOffset(this);
                updateInProgress = false;
            }
        }

        function isMoment (obj) {
            return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
        }

        function absFloor (number) {
            if (number < 0) {
                // -0 -> 0
                return Math.ceil(number) || 0;
            } else {
                return Math.floor(number);
            }
        }

        function toInt(argumentForCoercion) {
            var coercedNumber = +argumentForCoercion,
                value = 0;

            if (coercedNumber !== 0 && isFinite(coercedNumber)) {
                value = absFloor(coercedNumber);
            }

            return value;
        }

        // compare two arrays, return the number of differences
        function compareArrays(array1, array2, dontConvert) {
            var len = Math.min(array1.length, array2.length),
                lengthDiff = Math.abs(array1.length - array2.length),
                diffs = 0,
                i;
            for (i = 0; i < len; i++) {
                if ((dontConvert && array1[i] !== array2[i]) ||
                    (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                    diffs++;
                }
            }
            return diffs + lengthDiff;
        }

        function warn(msg) {
            if (hooks.suppressDeprecationWarnings === false &&
                    (typeof console !==  'undefined') && console.warn) {
                console.warn('Deprecation warning: ' + msg);
            }
        }

        function deprecate(msg, fn) {
            var firstTime = true;

            return extend(function () {
                if (hooks.deprecationHandler != null) {
                    hooks.deprecationHandler(null, msg);
                }
                if (firstTime) {
                    var args = [];
                    var arg;
                    for (var i = 0; i < arguments.length; i++) {
                        arg = '';
                        if (typeof arguments[i] === 'object') {
                            arg += '\n[' + i + '] ';
                            for (var key in arguments[0]) {
                                arg += key + ': ' + arguments[0][key] + ', ';
                            }
                            arg = arg.slice(0, -2); // Remove trailing comma and space
                        } else {
                            arg = arguments[i];
                        }
                        args.push(arg);
                    }
                    warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
                    firstTime = false;
                }
                return fn.apply(this, arguments);
            }, fn);
        }

        var deprecations = {};

        function deprecateSimple(name, msg) {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(name, msg);
            }
            if (!deprecations[name]) {
                warn(msg);
                deprecations[name] = true;
            }
        }

        hooks.suppressDeprecationWarnings = false;
        hooks.deprecationHandler = null;

        function isFunction(input) {
            return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
        }

        function set (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (isFunction(prop)) {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
            this._config = config;
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
            // TODO: Remove "ordinalParse" fallback in next major release.
            this._dayOfMonthOrdinalParseLenient = new RegExp(
                (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
                    '|' + (/\d{1,2}/).source);
        }

        function mergeConfigs(parentConfig, childConfig) {
            var res = extend({}, parentConfig), prop;
            for (prop in childConfig) {
                if (hasOwnProp(childConfig, prop)) {
                    if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                        res[prop] = {};
                        extend(res[prop], parentConfig[prop]);
                        extend(res[prop], childConfig[prop]);
                    } else if (childConfig[prop] != null) {
                        res[prop] = childConfig[prop];
                    } else {
                        delete res[prop];
                    }
                }
            }
            for (prop in parentConfig) {
                if (hasOwnProp(parentConfig, prop) &&
                        !hasOwnProp(childConfig, prop) &&
                        isObject(parentConfig[prop])) {
                    // make sure changes to properties don't modify parent config
                    res[prop] = extend({}, res[prop]);
                }
            }
            return res;
        }

        function Locale(config) {
            if (config != null) {
                this.set(config);
            }
        }

        var keys;

        if (Object.keys) {
            keys = Object.keys;
        } else {
            keys = function (obj) {
                var i, res = [];
                for (i in obj) {
                    if (hasOwnProp(obj, i)) {
                        res.push(i);
                    }
                }
                return res;
            };
        }

        var defaultCalendar = {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        };

        function calendar (key, mom, now) {
            var output = this._calendar[key] || this._calendar['sameElse'];
            return isFunction(output) ? output.call(mom, now) : output;
        }

        var defaultLongDateFormat = {
            LTS  : 'h:mm:ss A',
            LT   : 'h:mm A',
            L    : 'MM/DD/YYYY',
            LL   : 'MMMM D, YYYY',
            LLL  : 'MMMM D, YYYY h:mm A',
            LLLL : 'dddd, MMMM D, YYYY h:mm A'
        };

        function longDateFormat (key) {
            var format = this._longDateFormat[key],
                formatUpper = this._longDateFormat[key.toUpperCase()];

            if (format || !formatUpper) {
                return format;
            }

            this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
                return val.slice(1);
            });

            return this._longDateFormat[key];
        }

        var defaultInvalidDate = 'Invalid date';

        function invalidDate () {
            return this._invalidDate;
        }

        var defaultOrdinal = '%d';
        var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

        function ordinal (number) {
            return this._ordinal.replace('%d', number);
        }

        var defaultRelativeTime = {
            future : 'in %s',
            past   : '%s ago',
            s  : 'a few seconds',
            ss : '%d seconds',
            m  : 'a minute',
            mm : '%d minutes',
            h  : 'an hour',
            hh : '%d hours',
            d  : 'a day',
            dd : '%d days',
            M  : 'a month',
            MM : '%d months',
            y  : 'a year',
            yy : '%d years'
        };

        function relativeTime (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (isFunction(output)) ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        }

        function pastFuture (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return isFunction(format) ? format(output) : format.replace(/%s/i, output);
        }

        var aliases = {};

        function addUnitAlias (unit, shorthand) {
            var lowerCase = unit.toLowerCase();
            aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
        }

        function normalizeUnits(units) {
            return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
        }

        function normalizeObjectUnits(inputObject) {
            var normalizedInput = {},
                normalizedProp,
                prop;

            for (prop in inputObject) {
                if (hasOwnProp(inputObject, prop)) {
                    normalizedProp = normalizeUnits(prop);
                    if (normalizedProp) {
                        normalizedInput[normalizedProp] = inputObject[prop];
                    }
                }
            }

            return normalizedInput;
        }

        var priorities = {};

        function addUnitPriority(unit, priority) {
            priorities[unit] = priority;
        }

        function getPrioritizedUnits(unitsObj) {
            var units = [];
            for (var u in unitsObj) {
                units.push({unit: u, priority: priorities[u]});
            }
            units.sort(function (a, b) {
                return a.priority - b.priority;
            });
            return units;
        }

        function zeroFill(number, targetLength, forceSign) {
            var absNumber = '' + Math.abs(number),
                zerosToFill = targetLength - absNumber.length,
                sign = number >= 0;
            return (sign ? (forceSign ? '+' : '') : '-') +
                Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
        }

        var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

        var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

        var formatFunctions = {};

        var formatTokenFunctions = {};

        // token:    'M'
        // padded:   ['MM', 2]
        // ordinal:  'Mo'
        // callback: function () { this.month() + 1 }
        function addFormatToken (token, padded, ordinal, callback) {
            var func = callback;
            if (typeof callback === 'string') {
                func = function () {
                    return this[callback]();
                };
            }
            if (token) {
                formatTokenFunctions[token] = func;
            }
            if (padded) {
                formatTokenFunctions[padded[0]] = function () {
                    return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
                };
            }
            if (ordinal) {
                formatTokenFunctions[ordinal] = function () {
                    return this.localeData().ordinal(func.apply(this, arguments), token);
                };
            }
        }

        function removeFormattingTokens(input) {
            if (input.match(/\[[\s\S]/)) {
                return input.replace(/^\[|\]$/g, '');
            }
            return input.replace(/\\/g, '');
        }

        function makeFormatFunction(format) {
            var array = format.match(formattingTokens), i, length;

            for (i = 0, length = array.length; i < length; i++) {
                if (formatTokenFunctions[array[i]]) {
                    array[i] = formatTokenFunctions[array[i]];
                } else {
                    array[i] = removeFormattingTokens(array[i]);
                }
            }

            return function (mom) {
                var output = '', i;
                for (i = 0; i < length; i++) {
                    output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
                }
                return output;
            };
        }

        // format date using native date object
        function formatMoment(m, format) {
            if (!m.isValid()) {
                return m.localeData().invalidDate();
            }

            format = expandFormat(format, m.localeData());
            formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

            return formatFunctions[format](m);
        }

        function expandFormat(format, locale) {
            var i = 5;

            function replaceLongDateFormatTokens(input) {
                return locale.longDateFormat(input) || input;
            }

            localFormattingTokens.lastIndex = 0;
            while (i >= 0 && localFormattingTokens.test(format)) {
                format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
                localFormattingTokens.lastIndex = 0;
                i -= 1;
            }

            return format;
        }

        var match1         = /\d/;            //       0 - 9
        var match2         = /\d\d/;          //      00 - 99
        var match3         = /\d{3}/;         //     000 - 999
        var match4         = /\d{4}/;         //    0000 - 9999
        var match6         = /[+-]?\d{6}/;    // -999999 - 999999
        var match1to2      = /\d\d?/;         //       0 - 99
        var match3to4      = /\d\d\d\d?/;     //     999 - 9999
        var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
        var match1to3      = /\d{1,3}/;       //       0 - 999
        var match1to4      = /\d{1,4}/;       //       0 - 9999
        var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

        var matchUnsigned  = /\d+/;           //       0 - inf
        var matchSigned    = /[+-]?\d+/;      //    -inf - inf

        var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
        var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

        var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

        // any word (or two) characters or numbers including two/three word month in arabic.
        // includes scottish gaelic two word and hyphenated months
        var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

        var regexes = {};

        function addRegexToken (token, regex, strictRegex) {
            regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
                return (isStrict && strictRegex) ? strictRegex : regex;
            };
        }

        function getParseRegexForToken (token, config) {
            if (!hasOwnProp(regexes, token)) {
                return new RegExp(unescapeFormat(token));
            }

            return regexes[token](config._strict, config._locale);
        }

        // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
        function unescapeFormat(s) {
            return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
                return p1 || p2 || p3 || p4;
            }));
        }

        function regexEscape(s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        }

        var tokens = {};

        function addParseToken (token, callback) {
            var i, func = callback;
            if (typeof token === 'string') {
                token = [token];
            }
            if (isNumber(callback)) {
                func = function (input, array) {
                    array[callback] = toInt(input);
                };
            }
            for (i = 0; i < token.length; i++) {
                tokens[token[i]] = func;
            }
        }

        function addWeekParseToken (token, callback) {
            addParseToken(token, function (input, array, config, token) {
                config._w = config._w || {};
                callback(input, config._w, config, token);
            });
        }

        function addTimeToArrayFromToken(token, input, config) {
            if (input != null && hasOwnProp(tokens, token)) {
                tokens[token](input, config._a, config, token);
            }
        }

        var YEAR = 0;
        var MONTH = 1;
        var DATE = 2;
        var HOUR = 3;
        var MINUTE = 4;
        var SECOND = 5;
        var MILLISECOND = 6;
        var WEEK = 7;
        var WEEKDAY = 8;

        // FORMATTING

        addFormatToken('Y', 0, 0, function () {
            var y = this.year();
            return y <= 9999 ? '' + y : '+' + y;
        });

        addFormatToken(0, ['YY', 2], 0, function () {
            return this.year() % 100;
        });

        addFormatToken(0, ['YYYY',   4],       0, 'year');
        addFormatToken(0, ['YYYYY',  5],       0, 'year');
        addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

        // ALIASES

        addUnitAlias('year', 'y');

        // PRIORITIES

        addUnitPriority('year', 1);

        // PARSING

        addRegexToken('Y',      matchSigned);
        addRegexToken('YY',     match1to2, match2);
        addRegexToken('YYYY',   match1to4, match4);
        addRegexToken('YYYYY',  match1to6, match6);
        addRegexToken('YYYYYY', match1to6, match6);

        addParseToken(['YYYYY', 'YYYYYY'], YEAR);
        addParseToken('YYYY', function (input, array) {
            array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
        });
        addParseToken('YY', function (input, array) {
            array[YEAR] = hooks.parseTwoDigitYear(input);
        });
        addParseToken('Y', function (input, array) {
            array[YEAR] = parseInt(input, 10);
        });

        // HELPERS

        function daysInYear(year) {
            return isLeapYear(year) ? 366 : 365;
        }

        function isLeapYear(year) {
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        }

        // HOOKS

        hooks.parseTwoDigitYear = function (input) {
            return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
        };

        // MOMENTS

        var getSetYear = makeGetSet('FullYear', true);

        function getIsLeapYear () {
            return isLeapYear(this.year());
        }

        function makeGetSet (unit, keepTime) {
            return function (value) {
                if (value != null) {
                    set$1(this, unit, value);
                    hooks.updateOffset(this, keepTime);
                    return this;
                } else {
                    return get(this, unit);
                }
            };
        }

        function get (mom, unit) {
            return mom.isValid() ?
                mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
        }

        function set$1 (mom, unit, value) {
            if (mom.isValid() && !isNaN(value)) {
                if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
                    mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
                }
                else {
                    mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
                }
            }
        }

        // MOMENTS

        function stringGet (units) {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units]();
            }
            return this;
        }


        function stringSet (units, value) {
            if (typeof units === 'object') {
                units = normalizeObjectUnits(units);
                var prioritized = getPrioritizedUnits(units);
                for (var i = 0; i < prioritized.length; i++) {
                    this[prioritized[i].unit](units[prioritized[i].unit]);
                }
            } else {
                units = normalizeUnits(units);
                if (isFunction(this[units])) {
                    return this[units](value);
                }
            }
            return this;
        }

        function mod(n, x) {
            return ((n % x) + x) % x;
        }

        var indexOf;

        if (Array.prototype.indexOf) {
            indexOf = Array.prototype.indexOf;
        } else {
            indexOf = function (o) {
                // I know
                var i;
                for (i = 0; i < this.length; ++i) {
                    if (this[i] === o) {
                        return i;
                    }
                }
                return -1;
            };
        }

        function daysInMonth(year, month) {
            if (isNaN(year) || isNaN(month)) {
                return NaN;
            }
            var modMonth = mod(month, 12);
            year += (month - modMonth) / 12;
            return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
        }

        // FORMATTING

        addFormatToken('M', ['MM', 2], 'Mo', function () {
            return this.month() + 1;
        });

        addFormatToken('MMM', 0, 0, function (format) {
            return this.localeData().monthsShort(this, format);
        });

        addFormatToken('MMMM', 0, 0, function (format) {
            return this.localeData().months(this, format);
        });

        // ALIASES

        addUnitAlias('month', 'M');

        // PRIORITY

        addUnitPriority('month', 8);

        // PARSING

        addRegexToken('M',    match1to2);
        addRegexToken('MM',   match1to2, match2);
        addRegexToken('MMM',  function (isStrict, locale) {
            return locale.monthsShortRegex(isStrict);
        });
        addRegexToken('MMMM', function (isStrict, locale) {
            return locale.monthsRegex(isStrict);
        });

        addParseToken(['M', 'MM'], function (input, array) {
            array[MONTH] = toInt(input) - 1;
        });

        addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
            var month = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (month != null) {
                array[MONTH] = month;
            } else {
                getParsingFlags(config).invalidMonth = input;
            }
        });

        // LOCALES

        var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
        var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
        function localeMonths (m, format) {
            if (!m) {
                return isArray(this._months) ? this._months :
                    this._months['standalone'];
            }
            return isArray(this._months) ? this._months[m.month()] :
                this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
        }

        var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
        function localeMonthsShort (m, format) {
            if (!m) {
                return isArray(this._monthsShort) ? this._monthsShort :
                    this._monthsShort['standalone'];
            }
            return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
                this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
        }

        function handleStrictParse(monthName, format, strict) {
            var i, ii, mom, llc = monthName.toLocaleLowerCase();
            if (!this._monthsParse) {
                // this is not used
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
                for (i = 0; i < 12; ++i) {
                    mom = createUTC([2000, i]);
                    this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
                    this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
                }
            }

            if (strict) {
                if (format === 'MMM') {
                    ii = indexOf.call(this._shortMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._longMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                }
            } else {
                if (format === 'MMM') {
                    ii = indexOf.call(this._shortMonthsParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._longMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._longMonthsParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._shortMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                }
            }
        }

        function localeMonthsParse (monthName, format, strict) {
            var i, mom, regex;

            if (this._monthsParseExact) {
                return handleStrictParse.call(this, monthName, format, strict);
            }

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            // TODO: add sorting
            // Sorting makes sure if one month (or abbr) is a prefix of another
            // see sorting in computeMonthsParse
            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = createUTC([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                    this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
                }
                if (!strict && !this._monthsParse[i]) {
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                    return i;
                } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        }

        // MOMENTS

        function setMonth (mom, value) {
            var dayOfMonth;

            if (!mom.isValid()) {
                // No op
                return mom;
            }

            if (typeof value === 'string') {
                if (/^\d+$/.test(value)) {
                    value = toInt(value);
                } else {
                    value = mom.localeData().monthsParse(value);
                    // TODO: Another silent failure?
                    if (!isNumber(value)) {
                        return mom;
                    }
                }
            }

            dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
            mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
            return mom;
        }

        function getSetMonth (value) {
            if (value != null) {
                setMonth(this, value);
                hooks.updateOffset(this, true);
                return this;
            } else {
                return get(this, 'Month');
            }
        }

        function getDaysInMonth () {
            return daysInMonth(this.year(), this.month());
        }

        var defaultMonthsShortRegex = matchWord;
        function monthsShortRegex (isStrict) {
            if (this._monthsParseExact) {
                if (!hasOwnProp(this, '_monthsRegex')) {
                    computeMonthsParse.call(this);
                }
                if (isStrict) {
                    return this._monthsShortStrictRegex;
                } else {
                    return this._monthsShortRegex;
                }
            } else {
                if (!hasOwnProp(this, '_monthsShortRegex')) {
                    this._monthsShortRegex = defaultMonthsShortRegex;
                }
                return this._monthsShortStrictRegex && isStrict ?
                    this._monthsShortStrictRegex : this._monthsShortRegex;
            }
        }

        var defaultMonthsRegex = matchWord;
        function monthsRegex (isStrict) {
            if (this._monthsParseExact) {
                if (!hasOwnProp(this, '_monthsRegex')) {
                    computeMonthsParse.call(this);
                }
                if (isStrict) {
                    return this._monthsStrictRegex;
                } else {
                    return this._monthsRegex;
                }
            } else {
                if (!hasOwnProp(this, '_monthsRegex')) {
                    this._monthsRegex = defaultMonthsRegex;
                }
                return this._monthsStrictRegex && isStrict ?
                    this._monthsStrictRegex : this._monthsRegex;
            }
        }

        function computeMonthsParse () {
            function cmpLenRev(a, b) {
                return b.length - a.length;
            }

            var shortPieces = [], longPieces = [], mixedPieces = [],
                i, mom;
            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = createUTC([2000, i]);
                shortPieces.push(this.monthsShort(mom, ''));
                longPieces.push(this.months(mom, ''));
                mixedPieces.push(this.months(mom, ''));
                mixedPieces.push(this.monthsShort(mom, ''));
            }
            // Sorting makes sure if one month (or abbr) is a prefix of another it
            // will match the longer piece.
            shortPieces.sort(cmpLenRev);
            longPieces.sort(cmpLenRev);
            mixedPieces.sort(cmpLenRev);
            for (i = 0; i < 12; i++) {
                shortPieces[i] = regexEscape(shortPieces[i]);
                longPieces[i] = regexEscape(longPieces[i]);
            }
            for (i = 0; i < 24; i++) {
                mixedPieces[i] = regexEscape(mixedPieces[i]);
            }

            this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
            this._monthsShortRegex = this._monthsRegex;
            this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
            this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
        }

        function createDate (y, m, d, h, M, s, ms) {
            // can't just apply() to create a date:
            // https://stackoverflow.com/q/181348
            var date;
            // the date constructor remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                // preserve leap years using a full 400 year cycle, then reset
                date = new Date(y + 400, m, d, h, M, s, ms);
                if (isFinite(date.getFullYear())) {
                    date.setFullYear(y);
                }
            } else {
                date = new Date(y, m, d, h, M, s, ms);
            }

            return date;
        }

        function createUTCDate (y) {
            var date;
            // the Date.UTC function remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                var args = Array.prototype.slice.call(arguments);
                // preserve leap years using a full 400 year cycle, then reset
                args[0] = y + 400;
                date = new Date(Date.UTC.apply(null, args));
                if (isFinite(date.getUTCFullYear())) {
                    date.setUTCFullYear(y);
                }
            } else {
                date = new Date(Date.UTC.apply(null, arguments));
            }

            return date;
        }

        // start-of-first-week - start-of-year
        function firstWeekOffset(year, dow, doy) {
            var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
                fwd = 7 + dow - doy,
                // first-week day local weekday -- which local weekday is fwd
                fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

            return -fwdlw + fwd - 1;
        }

        // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
        function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
            var localWeekday = (7 + weekday - dow) % 7,
                weekOffset = firstWeekOffset(year, dow, doy),
                dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
                resYear, resDayOfYear;

            if (dayOfYear <= 0) {
                resYear = year - 1;
                resDayOfYear = daysInYear(resYear) + dayOfYear;
            } else if (dayOfYear > daysInYear(year)) {
                resYear = year + 1;
                resDayOfYear = dayOfYear - daysInYear(year);
            } else {
                resYear = year;
                resDayOfYear = dayOfYear;
            }

            return {
                year: resYear,
                dayOfYear: resDayOfYear
            };
        }

        function weekOfYear(mom, dow, doy) {
            var weekOffset = firstWeekOffset(mom.year(), dow, doy),
                week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
                resWeek, resYear;

            if (week < 1) {
                resYear = mom.year() - 1;
                resWeek = week + weeksInYear(resYear, dow, doy);
            } else if (week > weeksInYear(mom.year(), dow, doy)) {
                resWeek = week - weeksInYear(mom.year(), dow, doy);
                resYear = mom.year() + 1;
            } else {
                resYear = mom.year();
                resWeek = week;
            }

            return {
                week: resWeek,
                year: resYear
            };
        }

        function weeksInYear(year, dow, doy) {
            var weekOffset = firstWeekOffset(year, dow, doy),
                weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
            return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
        }

        // FORMATTING

        addFormatToken('w', ['ww', 2], 'wo', 'week');
        addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

        // ALIASES

        addUnitAlias('week', 'w');
        addUnitAlias('isoWeek', 'W');

        // PRIORITIES

        addUnitPriority('week', 5);
        addUnitPriority('isoWeek', 5);

        // PARSING

        addRegexToken('w',  match1to2);
        addRegexToken('ww', match1to2, match2);
        addRegexToken('W',  match1to2);
        addRegexToken('WW', match1to2, match2);

        addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
            week[token.substr(0, 1)] = toInt(input);
        });

        // HELPERS

        // LOCALES

        function localeWeek (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        }

        var defaultLocaleWeek = {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 6th is the first week of the year.
        };

        function localeFirstDayOfWeek () {
            return this._week.dow;
        }

        function localeFirstDayOfYear () {
            return this._week.doy;
        }

        // MOMENTS

        function getSetWeek (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        }

        function getSetISOWeek (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        }

        // FORMATTING

        addFormatToken('d', 0, 'do', 'day');

        addFormatToken('dd', 0, 0, function (format) {
            return this.localeData().weekdaysMin(this, format);
        });

        addFormatToken('ddd', 0, 0, function (format) {
            return this.localeData().weekdaysShort(this, format);
        });

        addFormatToken('dddd', 0, 0, function (format) {
            return this.localeData().weekdays(this, format);
        });

        addFormatToken('e', 0, 0, 'weekday');
        addFormatToken('E', 0, 0, 'isoWeekday');

        // ALIASES

        addUnitAlias('day', 'd');
        addUnitAlias('weekday', 'e');
        addUnitAlias('isoWeekday', 'E');

        // PRIORITY
        addUnitPriority('day', 11);
        addUnitPriority('weekday', 11);
        addUnitPriority('isoWeekday', 11);

        // PARSING

        addRegexToken('d',    match1to2);
        addRegexToken('e',    match1to2);
        addRegexToken('E',    match1to2);
        addRegexToken('dd',   function (isStrict, locale) {
            return locale.weekdaysMinRegex(isStrict);
        });
        addRegexToken('ddd',   function (isStrict, locale) {
            return locale.weekdaysShortRegex(isStrict);
        });
        addRegexToken('dddd',   function (isStrict, locale) {
            return locale.weekdaysRegex(isStrict);
        });

        addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
            var weekday = config._locale.weekdaysParse(input, token, config._strict);
            // if we didn't get a weekday name, mark the date as invalid
            if (weekday != null) {
                week.d = weekday;
            } else {
                getParsingFlags(config).invalidWeekday = input;
            }
        });

        addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
            week[token] = toInt(input);
        });

        // HELPERS

        function parseWeekday(input, locale) {
            if (typeof input !== 'string') {
                return input;
            }

            if (!isNaN(input)) {
                return parseInt(input, 10);
            }

            input = locale.weekdaysParse(input);
            if (typeof input === 'number') {
                return input;
            }

            return null;
        }

        function parseIsoWeekday(input, locale) {
            if (typeof input === 'string') {
                return locale.weekdaysParse(input) % 7 || 7;
            }
            return isNaN(input) ? null : input;
        }

        // LOCALES
        function shiftWeekdays (ws, n) {
            return ws.slice(n, 7).concat(ws.slice(0, n));
        }

        var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
        function localeWeekdays (m, format) {
            var weekdays = isArray(this._weekdays) ? this._weekdays :
                this._weekdays[(m && m !== true && this._weekdays.isFormat.test(format)) ? 'format' : 'standalone'];
            return (m === true) ? shiftWeekdays(weekdays, this._week.dow)
                : (m) ? weekdays[m.day()] : weekdays;
        }

        var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
        function localeWeekdaysShort (m) {
            return (m === true) ? shiftWeekdays(this._weekdaysShort, this._week.dow)
                : (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
        }

        var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
        function localeWeekdaysMin (m) {
            return (m === true) ? shiftWeekdays(this._weekdaysMin, this._week.dow)
                : (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
        }

        function handleStrictParse$1(weekdayName, format, strict) {
            var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
                this._shortWeekdaysParse = [];
                this._minWeekdaysParse = [];

                for (i = 0; i < 7; ++i) {
                    mom = createUTC([2000, 1]).day(i);
                    this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
                    this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
                    this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
                }
            }

            if (strict) {
                if (format === 'dddd') {
                    ii = indexOf.call(this._weekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else if (format === 'ddd') {
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                }
            } else {
                if (format === 'dddd') {
                    ii = indexOf.call(this._weekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else if (format === 'ddd') {
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._weekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._weekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                }
            }
        }

        function localeWeekdaysParse (weekdayName, format, strict) {
            var i, mom, regex;

            if (this._weekdaysParseExact) {
                return handleStrictParse$1.call(this, weekdayName, format, strict);
            }

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
                this._minWeekdaysParse = [];
                this._shortWeekdaysParse = [];
                this._fullWeekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already

                mom = createUTC([2000, 1]).day(i);
                if (strict && !this._fullWeekdaysParse[i]) {
                    this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
                    this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
                    this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
                }
                if (!this._weekdaysParse[i]) {
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
                    return i;
                } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
                    return i;
                } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
                    return i;
                } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        }

        // MOMENTS

        function getSetDayOfWeek (input) {
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        }

        function getSetLocaleDayOfWeek (input) {
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        }

        function getSetISODayOfWeek (input) {
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }

            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.

            if (input != null) {
                var weekday = parseIsoWeekday(input, this.localeData());
                return this.day(this.day() % 7 ? weekday : weekday - 7);
            } else {
                return this.day() || 7;
            }
        }

        var defaultWeekdaysRegex = matchWord;
        function weekdaysRegex (isStrict) {
            if (this._weekdaysParseExact) {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    computeWeekdaysParse.call(this);
                }
                if (isStrict) {
                    return this._weekdaysStrictRegex;
                } else {
                    return this._weekdaysRegex;
                }
            } else {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    this._weekdaysRegex = defaultWeekdaysRegex;
                }
                return this._weekdaysStrictRegex && isStrict ?
                    this._weekdaysStrictRegex : this._weekdaysRegex;
            }
        }

        var defaultWeekdaysShortRegex = matchWord;
        function weekdaysShortRegex (isStrict) {
            if (this._weekdaysParseExact) {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    computeWeekdaysParse.call(this);
                }
                if (isStrict) {
                    return this._weekdaysShortStrictRegex;
                } else {
                    return this._weekdaysShortRegex;
                }
            } else {
                if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                    this._weekdaysShortRegex = defaultWeekdaysShortRegex;
                }
                return this._weekdaysShortStrictRegex && isStrict ?
                    this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
            }
        }

        var defaultWeekdaysMinRegex = matchWord;
        function weekdaysMinRegex (isStrict) {
            if (this._weekdaysParseExact) {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    computeWeekdaysParse.call(this);
                }
                if (isStrict) {
                    return this._weekdaysMinStrictRegex;
                } else {
                    return this._weekdaysMinRegex;
                }
            } else {
                if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                    this._weekdaysMinRegex = defaultWeekdaysMinRegex;
                }
                return this._weekdaysMinStrictRegex && isStrict ?
                    this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
            }
        }


        function computeWeekdaysParse () {
            function cmpLenRev(a, b) {
                return b.length - a.length;
            }

            var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
                i, mom, minp, shortp, longp;
            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                mom = createUTC([2000, 1]).day(i);
                minp = this.weekdaysMin(mom, '');
                shortp = this.weekdaysShort(mom, '');
                longp = this.weekdays(mom, '');
                minPieces.push(minp);
                shortPieces.push(shortp);
                longPieces.push(longp);
                mixedPieces.push(minp);
                mixedPieces.push(shortp);
                mixedPieces.push(longp);
            }
            // Sorting makes sure if one weekday (or abbr) is a prefix of another it
            // will match the longer piece.
            minPieces.sort(cmpLenRev);
            shortPieces.sort(cmpLenRev);
            longPieces.sort(cmpLenRev);
            mixedPieces.sort(cmpLenRev);
            for (i = 0; i < 7; i++) {
                shortPieces[i] = regexEscape(shortPieces[i]);
                longPieces[i] = regexEscape(longPieces[i]);
                mixedPieces[i] = regexEscape(mixedPieces[i]);
            }

            this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
            this._weekdaysShortRegex = this._weekdaysRegex;
            this._weekdaysMinRegex = this._weekdaysRegex;

            this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
            this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
            this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
        }

        // FORMATTING

        function hFormat() {
            return this.hours() % 12 || 12;
        }

        function kFormat() {
            return this.hours() || 24;
        }

        addFormatToken('H', ['HH', 2], 0, 'hour');
        addFormatToken('h', ['hh', 2], 0, hFormat);
        addFormatToken('k', ['kk', 2], 0, kFormat);

        addFormatToken('hmm', 0, 0, function () {
            return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
        });

        addFormatToken('hmmss', 0, 0, function () {
            return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
                zeroFill(this.seconds(), 2);
        });

        addFormatToken('Hmm', 0, 0, function () {
            return '' + this.hours() + zeroFill(this.minutes(), 2);
        });

        addFormatToken('Hmmss', 0, 0, function () {
            return '' + this.hours() + zeroFill(this.minutes(), 2) +
                zeroFill(this.seconds(), 2);
        });

        function meridiem (token, lowercase) {
            addFormatToken(token, 0, 0, function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
            });
        }

        meridiem('a', true);
        meridiem('A', false);

        // ALIASES

        addUnitAlias('hour', 'h');

        // PRIORITY
        addUnitPriority('hour', 13);

        // PARSING

        function matchMeridiem (isStrict, locale) {
            return locale._meridiemParse;
        }

        addRegexToken('a',  matchMeridiem);
        addRegexToken('A',  matchMeridiem);
        addRegexToken('H',  match1to2);
        addRegexToken('h',  match1to2);
        addRegexToken('k',  match1to2);
        addRegexToken('HH', match1to2, match2);
        addRegexToken('hh', match1to2, match2);
        addRegexToken('kk', match1to2, match2);

        addRegexToken('hmm', match3to4);
        addRegexToken('hmmss', match5to6);
        addRegexToken('Hmm', match3to4);
        addRegexToken('Hmmss', match5to6);

        addParseToken(['H', 'HH'], HOUR);
        addParseToken(['k', 'kk'], function (input, array, config) {
            var kInput = toInt(input);
            array[HOUR] = kInput === 24 ? 0 : kInput;
        });
        addParseToken(['a', 'A'], function (input, array, config) {
            config._isPm = config._locale.isPM(input);
            config._meridiem = input;
        });
        addParseToken(['h', 'hh'], function (input, array, config) {
            array[HOUR] = toInt(input);
            getParsingFlags(config).bigHour = true;
        });
        addParseToken('hmm', function (input, array, config) {
            var pos = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos));
            array[MINUTE] = toInt(input.substr(pos));
            getParsingFlags(config).bigHour = true;
        });
        addParseToken('hmmss', function (input, array, config) {
            var pos1 = input.length - 4;
            var pos2 = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos1));
            array[MINUTE] = toInt(input.substr(pos1, 2));
            array[SECOND] = toInt(input.substr(pos2));
            getParsingFlags(config).bigHour = true;
        });
        addParseToken('Hmm', function (input, array, config) {
            var pos = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos));
            array[MINUTE] = toInt(input.substr(pos));
        });
        addParseToken('Hmmss', function (input, array, config) {
            var pos1 = input.length - 4;
            var pos2 = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos1));
            array[MINUTE] = toInt(input.substr(pos1, 2));
            array[SECOND] = toInt(input.substr(pos2));
        });

        // LOCALES

        function localeIsPM (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        }

        var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
        function localeMeridiem (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        }


        // MOMENTS

        // Setting the hour should keep the time, because the user explicitly
        // specified which hour they want. So trying to maintain the same hour (in
        // a new timezone) makes sense. Adding/subtracting hours does not follow
        // this rule.
        var getSetHour = makeGetSet('Hours', true);

        var baseConfig = {
            calendar: defaultCalendar,
            longDateFormat: defaultLongDateFormat,
            invalidDate: defaultInvalidDate,
            ordinal: defaultOrdinal,
            dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
            relativeTime: defaultRelativeTime,

            months: defaultLocaleMonths,
            monthsShort: defaultLocaleMonthsShort,

            week: defaultLocaleWeek,

            weekdays: defaultLocaleWeekdays,
            weekdaysMin: defaultLocaleWeekdaysMin,
            weekdaysShort: defaultLocaleWeekdaysShort,

            meridiemParse: defaultLocaleMeridiemParse
        };

        // internal storage for locale config files
        var locales = {};
        var localeFamilies = {};
        var globalLocale;

        function normalizeLocale(key) {
            return key ? key.toLowerCase().replace('_', '-') : key;
        }

        // pick the locale from the array
        // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        function chooseLocale(names) {
            var i = 0, j, next, locale, split;

            while (i < names.length) {
                split = normalizeLocale(names[i]).split('-');
                j = split.length;
                next = normalizeLocale(names[i + 1]);
                next = next ? next.split('-') : null;
                while (j > 0) {
                    locale = loadLocale(split.slice(0, j).join('-'));
                    if (locale) {
                        return locale;
                    }
                    if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                        //the next array item is better than a shallower substring of this one
                        break;
                    }
                    j--;
                }
                i++;
            }
            return globalLocale;
        }

        function loadLocale(name) {
            var oldLocale = null;
            // TODO: Find a better way to register and load all the locales in Node
            if (!locales[name] && ('object' !== 'undefined') &&
                    module && module.exports) {
                try {
                    oldLocale = globalLocale._abbr;
                    var aliasedRequire = commonjsRequire;
                    aliasedRequire('./locale/' + name);
                    getSetGlobalLocale(oldLocale);
                } catch (e) {}
            }
            return locales[name];
        }

        // This function will load locale and then set the global locale.  If
        // no arguments are passed in, it will simply return the current global
        // locale key.
        function getSetGlobalLocale (key, values) {
            var data;
            if (key) {
                if (isUndefined(values)) {
                    data = getLocale(key);
                }
                else {
                    data = defineLocale(key, values);
                }

                if (data) {
                    // moment.duration._locale = moment._locale = data;
                    globalLocale = data;
                }
                else {
                    if ((typeof console !==  'undefined') && console.warn) {
                        //warn user if arguments are passed but the locale could not be set
                        console.warn('Locale ' + key +  ' not found. Did you forget to load it?');
                    }
                }
            }

            return globalLocale._abbr;
        }

        function defineLocale (name, config) {
            if (config !== null) {
                var locale, parentConfig = baseConfig;
                config.abbr = name;
                if (locales[name] != null) {
                    deprecateSimple('defineLocaleOverride',
                            'use moment.updateLocale(localeName, config) to change ' +
                            'an existing locale. moment.defineLocale(localeName, ' +
                            'config) should only be used for creating a new locale ' +
                            'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
                    parentConfig = locales[name]._config;
                } else if (config.parentLocale != null) {
                    if (locales[config.parentLocale] != null) {
                        parentConfig = locales[config.parentLocale]._config;
                    } else {
                        locale = loadLocale(config.parentLocale);
                        if (locale != null) {
                            parentConfig = locale._config;
                        } else {
                            if (!localeFamilies[config.parentLocale]) {
                                localeFamilies[config.parentLocale] = [];
                            }
                            localeFamilies[config.parentLocale].push({
                                name: name,
                                config: config
                            });
                            return null;
                        }
                    }
                }
                locales[name] = new Locale(mergeConfigs(parentConfig, config));

                if (localeFamilies[name]) {
                    localeFamilies[name].forEach(function (x) {
                        defineLocale(x.name, x.config);
                    });
                }

                // backwards compat for now: also set the locale
                // make sure we set the locale AFTER all child locales have been
                // created, so we won't end up with the child locale set.
                getSetGlobalLocale(name);


                return locales[name];
            } else {
                // useful for testing
                delete locales[name];
                return null;
            }
        }

        function updateLocale(name, config) {
            if (config != null) {
                var locale, tmpLocale, parentConfig = baseConfig;
                // MERGE
                tmpLocale = loadLocale(name);
                if (tmpLocale != null) {
                    parentConfig = tmpLocale._config;
                }
                config = mergeConfigs(parentConfig, config);
                locale = new Locale(config);
                locale.parentLocale = locales[name];
                locales[name] = locale;

                // backwards compat for now: also set the locale
                getSetGlobalLocale(name);
            } else {
                // pass null for config to unupdate, useful for tests
                if (locales[name] != null) {
                    if (locales[name].parentLocale != null) {
                        locales[name] = locales[name].parentLocale;
                    } else if (locales[name] != null) {
                        delete locales[name];
                    }
                }
            }
            return locales[name];
        }

        // returns locale data
        function getLocale (key) {
            var locale;

            if (key && key._locale && key._locale._abbr) {
                key = key._locale._abbr;
            }

            if (!key) {
                return globalLocale;
            }

            if (!isArray(key)) {
                //short-circuit everything else
                locale = loadLocale(key);
                if (locale) {
                    return locale;
                }
                key = [key];
            }

            return chooseLocale(key);
        }

        function listLocales() {
            return keys(locales);
        }

        function checkOverflow (m) {
            var overflow;
            var a = m._a;

            if (a && getParsingFlags(m).overflow === -2) {
                overflow =
                    a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                    a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                    a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                    a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                    a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                    a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                    -1;

                if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                    overflow = DATE;
                }
                if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                    overflow = WEEK;
                }
                if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                    overflow = WEEKDAY;
                }

                getParsingFlags(m).overflow = overflow;
            }

            return m;
        }

        // Pick the first defined of two or three arguments.
        function defaults(a, b, c) {
            if (a != null) {
                return a;
            }
            if (b != null) {
                return b;
            }
            return c;
        }

        function currentDateArray(config) {
            // hooks is actually the exported moment object
            var nowValue = new Date(hooks.now());
            if (config._useUTC) {
                return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
            }
            return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
        }

        // convert an array to a date.
        // the array should mirror the parameters below
        // note: all values past the year are optional and will default to the lowest possible value.
        // [year, month, day , hour, minute, second, millisecond]
        function configFromArray (config) {
            var i, date, input = [], currentDate, expectedWeekday, yearToUse;

            if (config._d) {
                return;
            }

            currentDate = currentDateArray(config);

            //compute day of the year from weeks and weekdays
            if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
                dayOfYearFromWeekInfo(config);
            }

            //if the day of the year is set, figure out what it is
            if (config._dayOfYear != null) {
                yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

                if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
                    getParsingFlags(config)._overflowDayOfYear = true;
                }

                date = createUTCDate(yearToUse, 0, config._dayOfYear);
                config._a[MONTH] = date.getUTCMonth();
                config._a[DATE] = date.getUTCDate();
            }

            // Default to current date.
            // * if no year, month, day of month are given, default to today
            // * if day of month is given, default month and year
            // * if month is given, default only year
            // * if year is given, don't default anything
            for (i = 0; i < 3 && config._a[i] == null; ++i) {
                config._a[i] = input[i] = currentDate[i];
            }

            // Zero out whatever was not defaulted, including time
            for (; i < 7; i++) {
                config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
            }

            // Check for 24:00:00.000
            if (config._a[HOUR] === 24 &&
                    config._a[MINUTE] === 0 &&
                    config._a[SECOND] === 0 &&
                    config._a[MILLISECOND] === 0) {
                config._nextDay = true;
                config._a[HOUR] = 0;
            }

            config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
            expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

            // Apply timezone offset from input. The actual utcOffset can be changed
            // with parseZone.
            if (config._tzm != null) {
                config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
            }

            if (config._nextDay) {
                config._a[HOUR] = 24;
            }

            // check for mismatching day of week
            if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
                getParsingFlags(config).weekdayMismatch = true;
            }
        }

        function dayOfYearFromWeekInfo(config) {
            var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

            w = config._w;
            if (w.GG != null || w.W != null || w.E != null) {
                dow = 1;
                doy = 4;

                // TODO: We need to take the current isoWeekYear, but that depends on
                // how we interpret now (local, utc, fixed offset). So create
                // a now version of current config (take local/utc/offset flags, and
                // create now).
                weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
                week = defaults(w.W, 1);
                weekday = defaults(w.E, 1);
                if (weekday < 1 || weekday > 7) {
                    weekdayOverflow = true;
                }
            } else {
                dow = config._locale._week.dow;
                doy = config._locale._week.doy;

                var curWeek = weekOfYear(createLocal(), dow, doy);

                weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

                // Default to current week.
                week = defaults(w.w, curWeek.week);

                if (w.d != null) {
                    // weekday -- low day numbers are considered next week
                    weekday = w.d;
                    if (weekday < 0 || weekday > 6) {
                        weekdayOverflow = true;
                    }
                } else if (w.e != null) {
                    // local weekday -- counting starts from beginning of week
                    weekday = w.e + dow;
                    if (w.e < 0 || w.e > 6) {
                        weekdayOverflow = true;
                    }
                } else {
                    // default to beginning of week
                    weekday = dow;
                }
            }
            if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
                getParsingFlags(config)._overflowWeeks = true;
            } else if (weekdayOverflow != null) {
                getParsingFlags(config)._overflowWeekday = true;
            } else {
                temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
                config._a[YEAR] = temp.year;
                config._dayOfYear = temp.dayOfYear;
            }
        }

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
        var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

        var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

        var isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
            ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
            ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
            ['YYYY-DDD', /\d{4}-\d{3}/],
            ['YYYY-MM', /\d{4}-\d\d/, false],
            ['YYYYYYMMDD', /[+-]\d{10}/],
            ['YYYYMMDD', /\d{8}/],
            // YYYYMM is NOT allowed by the standard
            ['GGGG[W]WWE', /\d{4}W\d{3}/],
            ['GGGG[W]WW', /\d{4}W\d{2}/, false],
            ['YYYYDDD', /\d{7}/]
        ];

        // iso time formats and regexes
        var isoTimes = [
            ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
            ['HH:mm:ss', /\d\d:\d\d:\d\d/],
            ['HH:mm', /\d\d:\d\d/],
            ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
            ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
            ['HHmmss', /\d\d\d\d\d\d/],
            ['HHmm', /\d\d\d\d/],
            ['HH', /\d\d/]
        ];

        var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

        // date from iso format
        function configFromISO(config) {
            var i, l,
                string = config._i,
                match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
                allowTime, dateFormat, timeFormat, tzFormat;

            if (match) {
                getParsingFlags(config).iso = true;

                for (i = 0, l = isoDates.length; i < l; i++) {
                    if (isoDates[i][1].exec(match[1])) {
                        dateFormat = isoDates[i][0];
                        allowTime = isoDates[i][2] !== false;
                        break;
                    }
                }
                if (dateFormat == null) {
                    config._isValid = false;
                    return;
                }
                if (match[3]) {
                    for (i = 0, l = isoTimes.length; i < l; i++) {
                        if (isoTimes[i][1].exec(match[3])) {
                            // match[2] should be 'T' or space
                            timeFormat = (match[2] || ' ') + isoTimes[i][0];
                            break;
                        }
                    }
                    if (timeFormat == null) {
                        config._isValid = false;
                        return;
                    }
                }
                if (!allowTime && timeFormat != null) {
                    config._isValid = false;
                    return;
                }
                if (match[4]) {
                    if (tzRegex.exec(match[4])) {
                        tzFormat = 'Z';
                    } else {
                        config._isValid = false;
                        return;
                    }
                }
                config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
                configFromStringAndFormat(config);
            } else {
                config._isValid = false;
            }
        }

        // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
        var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

        function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
            var result = [
                untruncateYear(yearStr),
                defaultLocaleMonthsShort.indexOf(monthStr),
                parseInt(dayStr, 10),
                parseInt(hourStr, 10),
                parseInt(minuteStr, 10)
            ];

            if (secondStr) {
                result.push(parseInt(secondStr, 10));
            }

            return result;
        }

        function untruncateYear(yearStr) {
            var year = parseInt(yearStr, 10);
            if (year <= 49) {
                return 2000 + year;
            } else if (year <= 999) {
                return 1900 + year;
            }
            return year;
        }

        function preprocessRFC2822(s) {
            // Remove comments and folding whitespace and replace multiple-spaces with a single space
            return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }

        function checkWeekday(weekdayStr, parsedInput, config) {
            if (weekdayStr) {
                // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
                var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                    weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
                if (weekdayProvided !== weekdayActual) {
                    getParsingFlags(config).weekdayMismatch = true;
                    config._isValid = false;
                    return false;
                }
            }
            return true;
        }

        var obsOffsets = {
            UT: 0,
            GMT: 0,
            EDT: -4 * 60,
            EST: -5 * 60,
            CDT: -5 * 60,
            CST: -6 * 60,
            MDT: -6 * 60,
            MST: -7 * 60,
            PDT: -7 * 60,
            PST: -8 * 60
        };

        function calculateOffset(obsOffset, militaryOffset, numOffset) {
            if (obsOffset) {
                return obsOffsets[obsOffset];
            } else if (militaryOffset) {
                // the only allowed military tz is Z
                return 0;
            } else {
                var hm = parseInt(numOffset, 10);
                var m = hm % 100, h = (hm - m) / 100;
                return h * 60 + m;
            }
        }

        // date and time from ref 2822 format
        function configFromRFC2822(config) {
            var match = rfc2822.exec(preprocessRFC2822(config._i));
            if (match) {
                var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
                if (!checkWeekday(match[1], parsedArray, config)) {
                    return;
                }

                config._a = parsedArray;
                config._tzm = calculateOffset(match[8], match[9], match[10]);

                config._d = createUTCDate.apply(null, config._a);
                config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

                getParsingFlags(config).rfc2822 = true;
            } else {
                config._isValid = false;
            }
        }

        // date from iso format or fallback
        function configFromString(config) {
            var matched = aspNetJsonRegex.exec(config._i);

            if (matched !== null) {
                config._d = new Date(+matched[1]);
                return;
            }

            configFromISO(config);
            if (config._isValid === false) {
                delete config._isValid;
            } else {
                return;
            }

            configFromRFC2822(config);
            if (config._isValid === false) {
                delete config._isValid;
            } else {
                return;
            }

            // Final attempt, use Input Fallback
            hooks.createFromInputFallback(config);
        }

        hooks.createFromInputFallback = deprecate(
            'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
            'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
            'discouraged and will be removed in an upcoming major release. Please refer to ' +
            'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
            function (config) {
                config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
            }
        );

        // constant that refers to the ISO standard
        hooks.ISO_8601 = function () {};

        // constant that refers to the RFC 2822 form
        hooks.RFC_2822 = function () {};

        // date from string and format string
        function configFromStringAndFormat(config) {
            // TODO: Move this to another part of the creation flow to prevent circular deps
            if (config._f === hooks.ISO_8601) {
                configFromISO(config);
                return;
            }
            if (config._f === hooks.RFC_2822) {
                configFromRFC2822(config);
                return;
            }
            config._a = [];
            getParsingFlags(config).empty = true;

            // This array is used to make a Date, either with `new Date` or `Date.UTC`
            var string = '' + config._i,
                i, parsedInput, tokens, token, skipped,
                stringLength = string.length,
                totalParsedInputLength = 0;

            tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

            for (i = 0; i < tokens.length; i++) {
                token = tokens[i];
                parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
                // console.log('token', token, 'parsedInput', parsedInput,
                //         'regex', getParseRegexForToken(token, config));
                if (parsedInput) {
                    skipped = string.substr(0, string.indexOf(parsedInput));
                    if (skipped.length > 0) {
                        getParsingFlags(config).unusedInput.push(skipped);
                    }
                    string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                    totalParsedInputLength += parsedInput.length;
                }
                // don't parse if it's not a known token
                if (formatTokenFunctions[token]) {
                    if (parsedInput) {
                        getParsingFlags(config).empty = false;
                    }
                    else {
                        getParsingFlags(config).unusedTokens.push(token);
                    }
                    addTimeToArrayFromToken(token, parsedInput, config);
                }
                else if (config._strict && !parsedInput) {
                    getParsingFlags(config).unusedTokens.push(token);
                }
            }

            // add remaining unparsed input length to the string
            getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
            if (string.length > 0) {
                getParsingFlags(config).unusedInput.push(string);
            }

            // clear _12h flag if hour is <= 12
            if (config._a[HOUR] <= 12 &&
                getParsingFlags(config).bigHour === true &&
                config._a[HOUR] > 0) {
                getParsingFlags(config).bigHour = undefined;
            }

            getParsingFlags(config).parsedDateParts = config._a.slice(0);
            getParsingFlags(config).meridiem = config._meridiem;
            // handle meridiem
            config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

            configFromArray(config);
            checkOverflow(config);
        }


        function meridiemFixWrap (locale, hour, meridiem) {
            var isPm;

            if (meridiem == null) {
                // nothing to do
                return hour;
            }
            if (locale.meridiemHour != null) {
                return locale.meridiemHour(hour, meridiem);
            } else if (locale.isPM != null) {
                // Fallback
                isPm = locale.isPM(meridiem);
                if (isPm && hour < 12) {
                    hour += 12;
                }
                if (!isPm && hour === 12) {
                    hour = 0;
                }
                return hour;
            } else {
                // this is not supposed to happen
                return hour;
            }
        }

        // date from string and array of format strings
        function configFromStringAndArray(config) {
            var tempConfig,
                bestMoment,

                scoreToBeat,
                i,
                currentScore;

            if (config._f.length === 0) {
                getParsingFlags(config).invalidFormat = true;
                config._d = new Date(NaN);
                return;
            }

            for (i = 0; i < config._f.length; i++) {
                currentScore = 0;
                tempConfig = copyConfig({}, config);
                if (config._useUTC != null) {
                    tempConfig._useUTC = config._useUTC;
                }
                tempConfig._f = config._f[i];
                configFromStringAndFormat(tempConfig);

                if (!isValid(tempConfig)) {
                    continue;
                }

                // if there is any input that was not parsed add a penalty for that format
                currentScore += getParsingFlags(tempConfig).charsLeftOver;

                //or tokens
                currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

                getParsingFlags(tempConfig).score = currentScore;

                if (scoreToBeat == null || currentScore < scoreToBeat) {
                    scoreToBeat = currentScore;
                    bestMoment = tempConfig;
                }
            }

            extend(config, bestMoment || tempConfig);
        }

        function configFromObject(config) {
            if (config._d) {
                return;
            }

            var i = normalizeObjectUnits(config._i);
            config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
                return obj && parseInt(obj, 10);
            });

            configFromArray(config);
        }

        function createFromConfig (config) {
            var res = new Moment(checkOverflow(prepareConfig(config)));
            if (res._nextDay) {
                // Adding is smart enough around DST
                res.add(1, 'd');
                res._nextDay = undefined;
            }

            return res;
        }

        function prepareConfig (config) {
            var input = config._i,
                format = config._f;

            config._locale = config._locale || getLocale(config._l);

            if (input === null || (format === undefined && input === '')) {
                return createInvalid({nullInput: true});
            }

            if (typeof input === 'string') {
                config._i = input = config._locale.preparse(input);
            }

            if (isMoment(input)) {
                return new Moment(checkOverflow(input));
            } else if (isDate(input)) {
                config._d = input;
            } else if (isArray(format)) {
                configFromStringAndArray(config);
            } else if (format) {
                configFromStringAndFormat(config);
            }  else {
                configFromInput(config);
            }

            if (!isValid(config)) {
                config._d = null;
            }

            return config;
        }

        function configFromInput(config) {
            var input = config._i;
            if (isUndefined(input)) {
                config._d = new Date(hooks.now());
            } else if (isDate(input)) {
                config._d = new Date(input.valueOf());
            } else if (typeof input === 'string') {
                configFromString(config);
            } else if (isArray(input)) {
                config._a = map(input.slice(0), function (obj) {
                    return parseInt(obj, 10);
                });
                configFromArray(config);
            } else if (isObject(input)) {
                configFromObject(config);
            } else if (isNumber(input)) {
                // from milliseconds
                config._d = new Date(input);
            } else {
                hooks.createFromInputFallback(config);
            }
        }

        function createLocalOrUTC (input, format, locale, strict, isUTC) {
            var c = {};

            if (locale === true || locale === false) {
                strict = locale;
                locale = undefined;
            }

            if ((isObject(input) && isObjectEmpty(input)) ||
                    (isArray(input) && input.length === 0)) {
                input = undefined;
            }
            // object construction must be done this way.
            // https://github.com/moment/moment/issues/1423
            c._isAMomentObject = true;
            c._useUTC = c._isUTC = isUTC;
            c._l = locale;
            c._i = input;
            c._f = format;
            c._strict = strict;

            return createFromConfig(c);
        }

        function createLocal (input, format, locale, strict) {
            return createLocalOrUTC(input, format, locale, strict, false);
        }

        var prototypeMin = deprecate(
            'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
            function () {
                var other = createLocal.apply(null, arguments);
                if (this.isValid() && other.isValid()) {
                    return other < this ? this : other;
                } else {
                    return createInvalid();
                }
            }
        );

        var prototypeMax = deprecate(
            'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
            function () {
                var other = createLocal.apply(null, arguments);
                if (this.isValid() && other.isValid()) {
                    return other > this ? this : other;
                } else {
                    return createInvalid();
                }
            }
        );

        // Pick a moment m from moments so that m[fn](other) is true for all
        // other. This relies on the function fn to be transitive.
        //
        // moments should either be an array of moment objects or an array, whose
        // first element is an array of moment objects.
        function pickBy(fn, moments) {
            var res, i;
            if (moments.length === 1 && isArray(moments[0])) {
                moments = moments[0];
            }
            if (!moments.length) {
                return createLocal();
            }
            res = moments[0];
            for (i = 1; i < moments.length; ++i) {
                if (!moments[i].isValid() || moments[i][fn](res)) {
                    res = moments[i];
                }
            }
            return res;
        }

        // TODO: Use [].sort instead?
        function min () {
            var args = [].slice.call(arguments, 0);

            return pickBy('isBefore', args);
        }

        function max () {
            var args = [].slice.call(arguments, 0);

            return pickBy('isAfter', args);
        }

        var now = function () {
            return Date.now ? Date.now() : +(new Date());
        };

        var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

        function isDurationValid(m) {
            for (var key in m) {
                if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
                    return false;
                }
            }

            var unitHasDecimal = false;
            for (var i = 0; i < ordering.length; ++i) {
                if (m[ordering[i]]) {
                    if (unitHasDecimal) {
                        return false; // only allow non-integers for smallest unit
                    }
                    if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                        unitHasDecimal = true;
                    }
                }
            }

            return true;
        }

        function isValid$1() {
            return this._isValid;
        }

        function createInvalid$1() {
            return createDuration(NaN);
        }

        function Duration (duration) {
            var normalizedInput = normalizeObjectUnits(duration),
                years = normalizedInput.year || 0,
                quarters = normalizedInput.quarter || 0,
                months = normalizedInput.month || 0,
                weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
                days = normalizedInput.day || 0,
                hours = normalizedInput.hour || 0,
                minutes = normalizedInput.minute || 0,
                seconds = normalizedInput.second || 0,
                milliseconds = normalizedInput.millisecond || 0;

            this._isValid = isDurationValid(normalizedInput);

            // representation for dateAddRemove
            this._milliseconds = +milliseconds +
                seconds * 1e3 + // 1000
                minutes * 6e4 + // 1000 * 60
                hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
            // Because of dateAddRemove treats 24 hours as different from a
            // day when working around DST, we need to store them separately
            this._days = +days +
                weeks * 7;
            // It is impossible to translate months into days without knowing
            // which months you are are talking about, so we have to store
            // it separately.
            this._months = +months +
                quarters * 3 +
                years * 12;

            this._data = {};

            this._locale = getLocale();

            this._bubble();
        }

        function isDuration (obj) {
            return obj instanceof Duration;
        }

        function absRound (number) {
            if (number < 0) {
                return Math.round(-1 * number) * -1;
            } else {
                return Math.round(number);
            }
        }

        // FORMATTING

        function offset (token, separator) {
            addFormatToken(token, 0, 0, function () {
                var offset = this.utcOffset();
                var sign = '+';
                if (offset < 0) {
                    offset = -offset;
                    sign = '-';
                }
                return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
            });
        }

        offset('Z', ':');
        offset('ZZ', '');

        // PARSING

        addRegexToken('Z',  matchShortOffset);
        addRegexToken('ZZ', matchShortOffset);
        addParseToken(['Z', 'ZZ'], function (input, array, config) {
            config._useUTC = true;
            config._tzm = offsetFromString(matchShortOffset, input);
        });

        // HELPERS

        // timezone chunker
        // '+10:00' > ['10',  '00']
        // '-1530'  > ['-15', '30']
        var chunkOffset = /([\+\-]|\d\d)/gi;

        function offsetFromString(matcher, string) {
            var matches = (string || '').match(matcher);

            if (matches === null) {
                return null;
            }

            var chunk   = matches[matches.length - 1] || [];
            var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
            var minutes = +(parts[1] * 60) + toInt(parts[2]);

            return minutes === 0 ?
              0 :
              parts[0] === '+' ? minutes : -minutes;
        }

        // Return a moment from input, that is local/utc/zone equivalent to model.
        function cloneWithOffset(input, model) {
            var res, diff;
            if (model._isUTC) {
                res = model.clone();
                diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
                // Use low-level api, because this fn is low-level api.
                res._d.setTime(res._d.valueOf() + diff);
                hooks.updateOffset(res, false);
                return res;
            } else {
                return createLocal(input).local();
            }
        }

        function getDateOffset (m) {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
        }

        // HOOKS

        // This function will be called whenever a moment is mutated.
        // It is intended to keep the offset in sync with the timezone.
        hooks.updateOffset = function () {};

        // MOMENTS

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        function getSetOffset (input, keepLocalTime, keepMinutes) {
            var offset = this._offset || 0,
                localAdjust;
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }
            if (input != null) {
                if (typeof input === 'string') {
                    input = offsetFromString(matchShortOffset, input);
                    if (input === null) {
                        return this;
                    }
                } else if (Math.abs(input) < 16 && !keepMinutes) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = getDateOffset(this);
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addSubtract(this, createDuration(input - offset, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        hooks.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
                return this;
            } else {
                return this._isUTC ? offset : getDateOffset(this);
            }
        }

        function getSetZone (input, keepLocalTime) {
            if (input != null) {
                if (typeof input !== 'string') {
                    input = -input;
                }

                this.utcOffset(input, keepLocalTime);

                return this;
            } else {
                return -this.utcOffset();
            }
        }

        function setOffsetToUTC (keepLocalTime) {
            return this.utcOffset(0, keepLocalTime);
        }

        function setOffsetToLocal (keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(getDateOffset(this), 'm');
                }
            }
            return this;
        }

        function setOffsetToParsedOffset () {
            if (this._tzm != null) {
                this.utcOffset(this._tzm, false, true);
            } else if (typeof this._i === 'string') {
                var tZone = offsetFromString(matchOffset, this._i);
                if (tZone != null) {
                    this.utcOffset(tZone);
                }
                else {
                    this.utcOffset(0, true);
                }
            }
            return this;
        }

        function hasAlignedHourOffset (input) {
            if (!this.isValid()) {
                return false;
            }
            input = input ? createLocal(input).utcOffset() : 0;

            return (this.utcOffset() - input) % 60 === 0;
        }

        function isDaylightSavingTime () {
            return (
                this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset()
            );
        }

        function isDaylightSavingTimeShifted () {
            if (!isUndefined(this._isDSTShifted)) {
                return this._isDSTShifted;
            }

            var c = {};

            copyConfig(c, this);
            c = prepareConfig(c);

            if (c._a) {
                var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
                this._isDSTShifted = this.isValid() &&
                    compareArrays(c._a, other.toArray()) > 0;
            } else {
                this._isDSTShifted = false;
            }

            return this._isDSTShifted;
        }

        function isLocal () {
            return this.isValid() ? !this._isUTC : false;
        }

        function isUtcOffset () {
            return this.isValid() ? this._isUTC : false;
        }

        function isUtc () {
            return this.isValid() ? this._isUTC && this._offset === 0 : false;
        }

        // ASP.NET json date format regex
        var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        // and further modified to allow for strings containing both week and day
        var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

        function createDuration (input, key) {
            var duration = input,
                // matching against regexp is expensive, do it on demand
                match = null,
                sign,
                ret,
                diffRes;

            if (isDuration(input)) {
                duration = {
                    ms : input._milliseconds,
                    d  : input._days,
                    M  : input._months
                };
            } else if (isNumber(input)) {
                duration = {};
                if (key) {
                    duration[key] = input;
                } else {
                    duration.milliseconds = input;
                }
            } else if (!!(match = aspNetRegex.exec(input))) {
                sign = (match[1] === '-') ? -1 : 1;
                duration = {
                    y  : 0,
                    d  : toInt(match[DATE])                         * sign,
                    h  : toInt(match[HOUR])                         * sign,
                    m  : toInt(match[MINUTE])                       * sign,
                    s  : toInt(match[SECOND])                       * sign,
                    ms : toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
                };
            } else if (!!(match = isoRegex.exec(input))) {
                sign = (match[1] === '-') ? -1 : 1;
                duration = {
                    y : parseIso(match[2], sign),
                    M : parseIso(match[3], sign),
                    w : parseIso(match[4], sign),
                    d : parseIso(match[5], sign),
                    h : parseIso(match[6], sign),
                    m : parseIso(match[7], sign),
                    s : parseIso(match[8], sign)
                };
            } else if (duration == null) {// checks for null or undefined
                duration = {};
            } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
                diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

                duration = {};
                duration.ms = diffRes.milliseconds;
                duration.M = diffRes.months;
            }

            ret = new Duration(duration);

            if (isDuration(input) && hasOwnProp(input, '_locale')) {
                ret._locale = input._locale;
            }

            return ret;
        }

        createDuration.fn = Duration.prototype;
        createDuration.invalid = createInvalid$1;

        function parseIso (inp, sign) {
            // We'd normally use ~~inp for this, but unfortunately it also
            // converts floats to ints.
            // inp may be undefined, so careful calling replace on it.
            var res = inp && parseFloat(inp.replace(',', '.'));
            // apply sign while we're at it
            return (isNaN(res) ? 0 : res) * sign;
        }

        function positiveMomentsDifference(base, other) {
            var res = {};

            res.months = other.month() - base.month() +
                (other.year() - base.year()) * 12;
            if (base.clone().add(res.months, 'M').isAfter(other)) {
                --res.months;
            }

            res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

            return res;
        }

        function momentsDifference(base, other) {
            var res;
            if (!(base.isValid() && other.isValid())) {
                return {milliseconds: 0, months: 0};
            }

            other = cloneWithOffset(other, base);
            if (base.isBefore(other)) {
                res = positiveMomentsDifference(base, other);
            } else {
                res = positiveMomentsDifference(other, base);
                res.milliseconds = -res.milliseconds;
                res.months = -res.months;
            }

            return res;
        }

        // TODO: remove 'name' arg after deprecation is removed
        function createAdder(direction, name) {
            return function (val, period) {
                var dur, tmp;
                //invert the arguments, but complain about it
                if (period !== null && !isNaN(+period)) {
                    deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
                    'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
                    tmp = val; val = period; period = tmp;
                }

                val = typeof val === 'string' ? +val : val;
                dur = createDuration(val, period);
                addSubtract(this, dur, direction);
                return this;
            };
        }

        function addSubtract (mom, duration, isAdding, updateOffset) {
            var milliseconds = duration._milliseconds,
                days = absRound(duration._days),
                months = absRound(duration._months);

            if (!mom.isValid()) {
                // No op
                return;
            }

            updateOffset = updateOffset == null ? true : updateOffset;

            if (months) {
                setMonth(mom, get(mom, 'Month') + months * isAdding);
            }
            if (days) {
                set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
            }
            if (milliseconds) {
                mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
            }
            if (updateOffset) {
                hooks.updateOffset(mom, days || months);
            }
        }

        var add      = createAdder(1, 'add');
        var subtract = createAdder(-1, 'subtract');

        function getCalendarFormat(myMoment, now) {
            var diff = myMoment.diff(now, 'days', true);
            return diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
        }

        function calendar$1 (time, formats) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're local/utc/offset or not.
            var now = time || createLocal(),
                sod = cloneWithOffset(now, this).startOf('day'),
                format = hooks.calendarFormat(this, sod) || 'sameElse';

            var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

            return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
        }

        function clone () {
            return new Moment(this);
        }

        function isAfter (input, units) {
            var localInput = isMoment(input) ? input : createLocal(input);
            if (!(this.isValid() && localInput.isValid())) {
                return false;
            }
            units = normalizeUnits(units) || 'millisecond';
            if (units === 'millisecond') {
                return this.valueOf() > localInput.valueOf();
            } else {
                return localInput.valueOf() < this.clone().startOf(units).valueOf();
            }
        }

        function isBefore (input, units) {
            var localInput = isMoment(input) ? input : createLocal(input);
            if (!(this.isValid() && localInput.isValid())) {
                return false;
            }
            units = normalizeUnits(units) || 'millisecond';
            if (units === 'millisecond') {
                return this.valueOf() < localInput.valueOf();
            } else {
                return this.clone().endOf(units).valueOf() < localInput.valueOf();
            }
        }

        function isBetween (from, to, units, inclusivity) {
            var localFrom = isMoment(from) ? from : createLocal(from),
                localTo = isMoment(to) ? to : createLocal(to);
            if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
                return false;
            }
            inclusivity = inclusivity || '()';
            return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) &&
                (inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
        }

        function isSame (input, units) {
            var localInput = isMoment(input) ? input : createLocal(input),
                inputMs;
            if (!(this.isValid() && localInput.isValid())) {
                return false;
            }
            units = normalizeUnits(units) || 'millisecond';
            if (units === 'millisecond') {
                return this.valueOf() === localInput.valueOf();
            } else {
                inputMs = localInput.valueOf();
                return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
            }
        }

        function isSameOrAfter (input, units) {
            return this.isSame(input, units) || this.isAfter(input, units);
        }

        function isSameOrBefore (input, units) {
            return this.isSame(input, units) || this.isBefore(input, units);
        }

        function diff (input, units, asFloat) {
            var that,
                zoneDelta,
                output;

            if (!this.isValid()) {
                return NaN;
            }

            that = cloneWithOffset(input, this);

            if (!that.isValid()) {
                return NaN;
            }

            zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

            units = normalizeUnits(units);

            switch (units) {
                case 'year': output = monthDiff(this, that) / 12; break;
                case 'month': output = monthDiff(this, that); break;
                case 'quarter': output = monthDiff(this, that) / 3; break;
                case 'second': output = (this - that) / 1e3; break; // 1000
                case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
                case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
                case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
                case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
                default: output = this - that;
            }

            return asFloat ? output : absFloor(output);
        }

        function monthDiff (a, b) {
            // difference in months
            var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
                // b is in (anchor - 1 month, anchor + 1 month)
                anchor = a.clone().add(wholeMonthDiff, 'months'),
                anchor2, adjust;

            if (b - anchor < 0) {
                anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
                // linear across the month
                adjust = (b - anchor) / (anchor - anchor2);
            } else {
                anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
                // linear across the month
                adjust = (b - anchor) / (anchor2 - anchor);
            }

            //check for negative zero, return zero if negative zero
            return -(wholeMonthDiff + adjust) || 0;
        }

        hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
        hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

        function toString () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        }

        function toISOString(keepOffset) {
            if (!this.isValid()) {
                return null;
            }
            var utc = keepOffset !== true;
            var m = utc ? this.clone().utc() : this;
            if (m.year() < 0 || m.year() > 9999) {
                return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
            }
            if (isFunction(Date.prototype.toISOString)) {
                // native implementation is ~50x faster, use it when we can
                if (utc) {
                    return this.toDate().toISOString();
                } else {
                    return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
                }
            }
            return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
        }

        /**
         * Return a human readable representation of a moment that can
         * also be evaluated to get a new moment which is the same
         *
         * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
         */
        function inspect () {
            if (!this.isValid()) {
                return 'moment.invalid(/* ' + this._i + ' */)';
            }
            var func = 'moment';
            var zone = '';
            if (!this.isLocal()) {
                func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
                zone = 'Z';
            }
            var prefix = '[' + func + '("]';
            var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
            var datetime = '-MM-DD[T]HH:mm:ss.SSS';
            var suffix = zone + '[")]';

            return this.format(prefix + year + datetime + suffix);
        }

        function format (inputString) {
            if (!inputString) {
                inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
            }
            var output = formatMoment(this, inputString);
            return this.localeData().postformat(output);
        }

        function from (time, withoutSuffix) {
            if (this.isValid() &&
                    ((isMoment(time) && time.isValid()) ||
                     createLocal(time).isValid())) {
                return createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
            } else {
                return this.localeData().invalidDate();
            }
        }

        function fromNow (withoutSuffix) {
            return this.from(createLocal(), withoutSuffix);
        }

        function to (time, withoutSuffix) {
            if (this.isValid() &&
                    ((isMoment(time) && time.isValid()) ||
                     createLocal(time).isValid())) {
                return createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
            } else {
                return this.localeData().invalidDate();
            }
        }

        function toNow (withoutSuffix) {
            return this.to(createLocal(), withoutSuffix);
        }

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        function locale (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = getLocale(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        }

        var lang = deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        );

        function localeData () {
            return this._locale;
        }

        var MS_PER_SECOND = 1000;
        var MS_PER_MINUTE = 60 * MS_PER_SECOND;
        var MS_PER_HOUR = 60 * MS_PER_MINUTE;
        var MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

        // actual modulo - handles negative numbers (for dates before 1970):
        function mod$1(dividend, divisor) {
            return (dividend % divisor + divisor) % divisor;
        }

        function localStartOfDate(y, m, d) {
            // the date constructor remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                // preserve leap years using a full 400 year cycle, then reset
                return new Date(y + 400, m, d) - MS_PER_400_YEARS;
            } else {
                return new Date(y, m, d).valueOf();
            }
        }

        function utcStartOfDate(y, m, d) {
            // Date.UTC remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                // preserve leap years using a full 400 year cycle, then reset
                return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
            } else {
                return Date.UTC(y, m, d);
            }
        }

        function startOf (units) {
            var time;
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond' || !this.isValid()) {
                return this;
            }

            var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

            switch (units) {
                case 'year':
                    time = startOfDate(this.year(), 0, 1);
                    break;
                case 'quarter':
                    time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
                    break;
                case 'month':
                    time = startOfDate(this.year(), this.month(), 1);
                    break;
                case 'week':
                    time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
                    break;
                case 'isoWeek':
                    time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
                    break;
                case 'day':
                case 'date':
                    time = startOfDate(this.year(), this.month(), this.date());
                    break;
                case 'hour':
                    time = this._d.valueOf();
                    time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
                    break;
                case 'minute':
                    time = this._d.valueOf();
                    time -= mod$1(time, MS_PER_MINUTE);
                    break;
                case 'second':
                    time = this._d.valueOf();
                    time -= mod$1(time, MS_PER_SECOND);
                    break;
            }

            this._d.setTime(time);
            hooks.updateOffset(this, true);
            return this;
        }

        function endOf (units) {
            var time;
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond' || !this.isValid()) {
                return this;
            }

            var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

            switch (units) {
                case 'year':
                    time = startOfDate(this.year() + 1, 0, 1) - 1;
                    break;
                case 'quarter':
                    time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
                    break;
                case 'month':
                    time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                    break;
                case 'week':
                    time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
                    break;
                case 'isoWeek':
                    time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
                    break;
                case 'day':
                case 'date':
                    time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                    break;
                case 'hour':
                    time = this._d.valueOf();
                    time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
                    break;
                case 'minute':
                    time = this._d.valueOf();
                    time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                    break;
                case 'second':
                    time = this._d.valueOf();
                    time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                    break;
            }

            this._d.setTime(time);
            hooks.updateOffset(this, true);
            return this;
        }

        function valueOf () {
            return this._d.valueOf() - ((this._offset || 0) * 60000);
        }

        function unix () {
            return Math.floor(this.valueOf() / 1000);
        }

        function toDate () {
            return new Date(this.valueOf());
        }

        function toArray () {
            var m = this;
            return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
        }

        function toObject () {
            var m = this;
            return {
                years: m.year(),
                months: m.month(),
                date: m.date(),
                hours: m.hours(),
                minutes: m.minutes(),
                seconds: m.seconds(),
                milliseconds: m.milliseconds()
            };
        }

        function toJSON () {
            // new Date(NaN).toJSON() === null
            return this.isValid() ? this.toISOString() : null;
        }

        function isValid$2 () {
            return isValid(this);
        }

        function parsingFlags () {
            return extend({}, getParsingFlags(this));
        }

        function invalidAt () {
            return getParsingFlags(this).overflow;
        }

        function creationData() {
            return {
                input: this._i,
                format: this._f,
                locale: this._locale,
                isUTC: this._isUTC,
                strict: this._strict
            };
        }

        // FORMATTING

        addFormatToken(0, ['gg', 2], 0, function () {
            return this.weekYear() % 100;
        });

        addFormatToken(0, ['GG', 2], 0, function () {
            return this.isoWeekYear() % 100;
        });

        function addWeekYearFormatToken (token, getter) {
            addFormatToken(0, [token, token.length], 0, getter);
        }

        addWeekYearFormatToken('gggg',     'weekYear');
        addWeekYearFormatToken('ggggg',    'weekYear');
        addWeekYearFormatToken('GGGG',  'isoWeekYear');
        addWeekYearFormatToken('GGGGG', 'isoWeekYear');

        // ALIASES

        addUnitAlias('weekYear', 'gg');
        addUnitAlias('isoWeekYear', 'GG');

        // PRIORITY

        addUnitPriority('weekYear', 1);
        addUnitPriority('isoWeekYear', 1);


        // PARSING

        addRegexToken('G',      matchSigned);
        addRegexToken('g',      matchSigned);
        addRegexToken('GG',     match1to2, match2);
        addRegexToken('gg',     match1to2, match2);
        addRegexToken('GGGG',   match1to4, match4);
        addRegexToken('gggg',   match1to4, match4);
        addRegexToken('GGGGG',  match1to6, match6);
        addRegexToken('ggggg',  match1to6, match6);

        addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
            week[token.substr(0, 2)] = toInt(input);
        });

        addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
            week[token] = hooks.parseTwoDigitYear(input);
        });

        // MOMENTS

        function getSetWeekYear (input) {
            return getSetWeekYearHelper.call(this,
                    input,
                    this.week(),
                    this.weekday(),
                    this.localeData()._week.dow,
                    this.localeData()._week.doy);
        }

        function getSetISOWeekYear (input) {
            return getSetWeekYearHelper.call(this,
                    input, this.isoWeek(), this.isoWeekday(), 1, 4);
        }

        function getISOWeeksInYear () {
            return weeksInYear(this.year(), 1, 4);
        }

        function getWeeksInYear () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        }

        function getSetWeekYearHelper(input, week, weekday, dow, doy) {
            var weeksTarget;
            if (input == null) {
                return weekOfYear(this, dow, doy).year;
            } else {
                weeksTarget = weeksInYear(input, dow, doy);
                if (week > weeksTarget) {
                    week = weeksTarget;
                }
                return setWeekAll.call(this, input, week, weekday, dow, doy);
            }
        }

        function setWeekAll(weekYear, week, weekday, dow, doy) {
            var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
                date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

            this.year(date.getUTCFullYear());
            this.month(date.getUTCMonth());
            this.date(date.getUTCDate());
            return this;
        }

        // FORMATTING

        addFormatToken('Q', 0, 'Qo', 'quarter');

        // ALIASES

        addUnitAlias('quarter', 'Q');

        // PRIORITY

        addUnitPriority('quarter', 7);

        // PARSING

        addRegexToken('Q', match1);
        addParseToken('Q', function (input, array) {
            array[MONTH] = (toInt(input) - 1) * 3;
        });

        // MOMENTS

        function getSetQuarter (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        }

        // FORMATTING

        addFormatToken('D', ['DD', 2], 'Do', 'date');

        // ALIASES

        addUnitAlias('date', 'D');

        // PRIORITY
        addUnitPriority('date', 9);

        // PARSING

        addRegexToken('D',  match1to2);
        addRegexToken('DD', match1to2, match2);
        addRegexToken('Do', function (isStrict, locale) {
            // TODO: Remove "ordinalParse" fallback in next major release.
            return isStrict ?
              (locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
              locale._dayOfMonthOrdinalParseLenient;
        });

        addParseToken(['D', 'DD'], DATE);
        addParseToken('Do', function (input, array) {
            array[DATE] = toInt(input.match(match1to2)[0]);
        });

        // MOMENTS

        var getSetDayOfMonth = makeGetSet('Date', true);

        // FORMATTING

        addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

        // ALIASES

        addUnitAlias('dayOfYear', 'DDD');

        // PRIORITY
        addUnitPriority('dayOfYear', 4);

        // PARSING

        addRegexToken('DDD',  match1to3);
        addRegexToken('DDDD', match3);
        addParseToken(['DDD', 'DDDD'], function (input, array, config) {
            config._dayOfYear = toInt(input);
        });

        // HELPERS

        // MOMENTS

        function getSetDayOfYear (input) {
            var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        }

        // FORMATTING

        addFormatToken('m', ['mm', 2], 0, 'minute');

        // ALIASES

        addUnitAlias('minute', 'm');

        // PRIORITY

        addUnitPriority('minute', 14);

        // PARSING

        addRegexToken('m',  match1to2);
        addRegexToken('mm', match1to2, match2);
        addParseToken(['m', 'mm'], MINUTE);

        // MOMENTS

        var getSetMinute = makeGetSet('Minutes', false);

        // FORMATTING

        addFormatToken('s', ['ss', 2], 0, 'second');

        // ALIASES

        addUnitAlias('second', 's');

        // PRIORITY

        addUnitPriority('second', 15);

        // PARSING

        addRegexToken('s',  match1to2);
        addRegexToken('ss', match1to2, match2);
        addParseToken(['s', 'ss'], SECOND);

        // MOMENTS

        var getSetSecond = makeGetSet('Seconds', false);

        // FORMATTING

        addFormatToken('S', 0, 0, function () {
            return ~~(this.millisecond() / 100);
        });

        addFormatToken(0, ['SS', 2], 0, function () {
            return ~~(this.millisecond() / 10);
        });

        addFormatToken(0, ['SSS', 3], 0, 'millisecond');
        addFormatToken(0, ['SSSS', 4], 0, function () {
            return this.millisecond() * 10;
        });
        addFormatToken(0, ['SSSSS', 5], 0, function () {
            return this.millisecond() * 100;
        });
        addFormatToken(0, ['SSSSSS', 6], 0, function () {
            return this.millisecond() * 1000;
        });
        addFormatToken(0, ['SSSSSSS', 7], 0, function () {
            return this.millisecond() * 10000;
        });
        addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
            return this.millisecond() * 100000;
        });
        addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
            return this.millisecond() * 1000000;
        });


        // ALIASES

        addUnitAlias('millisecond', 'ms');

        // PRIORITY

        addUnitPriority('millisecond', 16);

        // PARSING

        addRegexToken('S',    match1to3, match1);
        addRegexToken('SS',   match1to3, match2);
        addRegexToken('SSS',  match1to3, match3);

        var token;
        for (token = 'SSSS'; token.length <= 9; token += 'S') {
            addRegexToken(token, matchUnsigned);
        }

        function parseMs(input, array) {
            array[MILLISECOND] = toInt(('0.' + input) * 1000);
        }

        for (token = 'S'; token.length <= 9; token += 'S') {
            addParseToken(token, parseMs);
        }
        // MOMENTS

        var getSetMillisecond = makeGetSet('Milliseconds', false);

        // FORMATTING

        addFormatToken('z',  0, 0, 'zoneAbbr');
        addFormatToken('zz', 0, 0, 'zoneName');

        // MOMENTS

        function getZoneAbbr () {
            return this._isUTC ? 'UTC' : '';
        }

        function getZoneName () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        }

        var proto = Moment.prototype;

        proto.add               = add;
        proto.calendar          = calendar$1;
        proto.clone             = clone;
        proto.diff              = diff;
        proto.endOf             = endOf;
        proto.format            = format;
        proto.from              = from;
        proto.fromNow           = fromNow;
        proto.to                = to;
        proto.toNow             = toNow;
        proto.get               = stringGet;
        proto.invalidAt         = invalidAt;
        proto.isAfter           = isAfter;
        proto.isBefore          = isBefore;
        proto.isBetween         = isBetween;
        proto.isSame            = isSame;
        proto.isSameOrAfter     = isSameOrAfter;
        proto.isSameOrBefore    = isSameOrBefore;
        proto.isValid           = isValid$2;
        proto.lang              = lang;
        proto.locale            = locale;
        proto.localeData        = localeData;
        proto.max               = prototypeMax;
        proto.min               = prototypeMin;
        proto.parsingFlags      = parsingFlags;
        proto.set               = stringSet;
        proto.startOf           = startOf;
        proto.subtract          = subtract;
        proto.toArray           = toArray;
        proto.toObject          = toObject;
        proto.toDate            = toDate;
        proto.toISOString       = toISOString;
        proto.inspect           = inspect;
        proto.toJSON            = toJSON;
        proto.toString          = toString;
        proto.unix              = unix;
        proto.valueOf           = valueOf;
        proto.creationData      = creationData;
        proto.year       = getSetYear;
        proto.isLeapYear = getIsLeapYear;
        proto.weekYear    = getSetWeekYear;
        proto.isoWeekYear = getSetISOWeekYear;
        proto.quarter = proto.quarters = getSetQuarter;
        proto.month       = getSetMonth;
        proto.daysInMonth = getDaysInMonth;
        proto.week           = proto.weeks        = getSetWeek;
        proto.isoWeek        = proto.isoWeeks     = getSetISOWeek;
        proto.weeksInYear    = getWeeksInYear;
        proto.isoWeeksInYear = getISOWeeksInYear;
        proto.date       = getSetDayOfMonth;
        proto.day        = proto.days             = getSetDayOfWeek;
        proto.weekday    = getSetLocaleDayOfWeek;
        proto.isoWeekday = getSetISODayOfWeek;
        proto.dayOfYear  = getSetDayOfYear;
        proto.hour = proto.hours = getSetHour;
        proto.minute = proto.minutes = getSetMinute;
        proto.second = proto.seconds = getSetSecond;
        proto.millisecond = proto.milliseconds = getSetMillisecond;
        proto.utcOffset            = getSetOffset;
        proto.utc                  = setOffsetToUTC;
        proto.local                = setOffsetToLocal;
        proto.parseZone            = setOffsetToParsedOffset;
        proto.hasAlignedHourOffset = hasAlignedHourOffset;
        proto.isDST                = isDaylightSavingTime;
        proto.isLocal              = isLocal;
        proto.isUtcOffset          = isUtcOffset;
        proto.isUtc                = isUtc;
        proto.isUTC                = isUtc;
        proto.zoneAbbr = getZoneAbbr;
        proto.zoneName = getZoneName;
        proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
        proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
        proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
        proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
        proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

        function createUnix (input) {
            return createLocal(input * 1000);
        }

        function createInZone () {
            return createLocal.apply(null, arguments).parseZone();
        }

        function preParsePostFormat (string) {
            return string;
        }

        var proto$1 = Locale.prototype;

        proto$1.calendar        = calendar;
        proto$1.longDateFormat  = longDateFormat;
        proto$1.invalidDate     = invalidDate;
        proto$1.ordinal         = ordinal;
        proto$1.preparse        = preParsePostFormat;
        proto$1.postformat      = preParsePostFormat;
        proto$1.relativeTime    = relativeTime;
        proto$1.pastFuture      = pastFuture;
        proto$1.set             = set;

        proto$1.months            =        localeMonths;
        proto$1.monthsShort       =        localeMonthsShort;
        proto$1.monthsParse       =        localeMonthsParse;
        proto$1.monthsRegex       = monthsRegex;
        proto$1.monthsShortRegex  = monthsShortRegex;
        proto$1.week = localeWeek;
        proto$1.firstDayOfYear = localeFirstDayOfYear;
        proto$1.firstDayOfWeek = localeFirstDayOfWeek;

        proto$1.weekdays       =        localeWeekdays;
        proto$1.weekdaysMin    =        localeWeekdaysMin;
        proto$1.weekdaysShort  =        localeWeekdaysShort;
        proto$1.weekdaysParse  =        localeWeekdaysParse;

        proto$1.weekdaysRegex       =        weekdaysRegex;
        proto$1.weekdaysShortRegex  =        weekdaysShortRegex;
        proto$1.weekdaysMinRegex    =        weekdaysMinRegex;

        proto$1.isPM = localeIsPM;
        proto$1.meridiem = localeMeridiem;

        function get$1 (format, index, field, setter) {
            var locale = getLocale();
            var utc = createUTC().set(setter, index);
            return locale[field](utc, format);
        }

        function listMonthsImpl (format, index, field) {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';

            if (index != null) {
                return get$1(format, index, field, 'month');
            }

            var i;
            var out = [];
            for (i = 0; i < 12; i++) {
                out[i] = get$1(format, i, field, 'month');
            }
            return out;
        }

        // ()
        // (5)
        // (fmt, 5)
        // (fmt)
        // (true)
        // (true, 5)
        // (true, fmt, 5)
        // (true, fmt)
        function listWeekdaysImpl (localeSorted, format, index, field) {
            if (typeof localeSorted === 'boolean') {
                if (isNumber(format)) {
                    index = format;
                    format = undefined;
                }

                format = format || '';
            } else {
                format = localeSorted;
                index = format;
                localeSorted = false;

                if (isNumber(format)) {
                    index = format;
                    format = undefined;
                }

                format = format || '';
            }

            var locale = getLocale(),
                shift = localeSorted ? locale._week.dow : 0;

            if (index != null) {
                return get$1(format, (index + shift) % 7, field, 'day');
            }

            var i;
            var out = [];
            for (i = 0; i < 7; i++) {
                out[i] = get$1(format, (i + shift) % 7, field, 'day');
            }
            return out;
        }

        function listMonths (format, index) {
            return listMonthsImpl(format, index, 'months');
        }

        function listMonthsShort (format, index) {
            return listMonthsImpl(format, index, 'monthsShort');
        }

        function listWeekdays (localeSorted, format, index) {
            return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
        }

        function listWeekdaysShort (localeSorted, format, index) {
            return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
        }

        function listWeekdaysMin (localeSorted, format, index) {
            return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
        }

        getSetGlobalLocale('en', {
            dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
            ordinal : function (number) {
                var b = number % 10,
                    output = (toInt(number % 100 / 10) === 1) ? 'th' :
                    (b === 1) ? 'st' :
                    (b === 2) ? 'nd' :
                    (b === 3) ? 'rd' : 'th';
                return number + output;
            }
        });

        // Side effect imports

        hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
        hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

        var mathAbs = Math.abs;

        function abs () {
            var data           = this._data;

            this._milliseconds = mathAbs(this._milliseconds);
            this._days         = mathAbs(this._days);
            this._months       = mathAbs(this._months);

            data.milliseconds  = mathAbs(data.milliseconds);
            data.seconds       = mathAbs(data.seconds);
            data.minutes       = mathAbs(data.minutes);
            data.hours         = mathAbs(data.hours);
            data.months        = mathAbs(data.months);
            data.years         = mathAbs(data.years);

            return this;
        }

        function addSubtract$1 (duration, input, value, direction) {
            var other = createDuration(input, value);

            duration._milliseconds += direction * other._milliseconds;
            duration._days         += direction * other._days;
            duration._months       += direction * other._months;

            return duration._bubble();
        }

        // supports only 2.0-style add(1, 's') or add(duration)
        function add$1 (input, value) {
            return addSubtract$1(this, input, value, 1);
        }

        // supports only 2.0-style subtract(1, 's') or subtract(duration)
        function subtract$1 (input, value) {
            return addSubtract$1(this, input, value, -1);
        }

        function absCeil (number) {
            if (number < 0) {
                return Math.floor(number);
            } else {
                return Math.ceil(number);
            }
        }

        function bubble () {
            var milliseconds = this._milliseconds;
            var days         = this._days;
            var months       = this._months;
            var data         = this._data;
            var seconds, minutes, hours, years, monthsFromDays;

            // if we have a mix of positive and negative values, bubble down first
            // check: https://github.com/moment/moment/issues/2166
            if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                    (milliseconds <= 0 && days <= 0 && months <= 0))) {
                milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
                days = 0;
                months = 0;
            }

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds           = absFloor(milliseconds / 1000);
            data.seconds      = seconds % 60;

            minutes           = absFloor(seconds / 60);
            data.minutes      = minutes % 60;

            hours             = absFloor(minutes / 60);
            data.hours        = hours % 24;

            days += absFloor(hours / 24);

            // convert days to months
            monthsFromDays = absFloor(daysToMonths(days));
            months += monthsFromDays;
            days -= absCeil(monthsToDays(monthsFromDays));

            // 12 months -> 1 year
            years = absFloor(months / 12);
            months %= 12;

            data.days   = days;
            data.months = months;
            data.years  = years;

            return this;
        }

        function daysToMonths (days) {
            // 400 years have 146097 days (taking into account leap year rules)
            // 400 years have 12 months === 4800
            return days * 4800 / 146097;
        }

        function monthsToDays (months) {
            // the reverse of daysToMonths
            return months * 146097 / 4800;
        }

        function as (units) {
            if (!this.isValid()) {
                return NaN;
            }
            var days;
            var months;
            var milliseconds = this._milliseconds;

            units = normalizeUnits(units);

            if (units === 'month' || units === 'quarter' || units === 'year') {
                days = this._days + milliseconds / 864e5;
                months = this._months + daysToMonths(days);
                switch (units) {
                    case 'month':   return months;
                    case 'quarter': return months / 3;
                    case 'year':    return months / 12;
                }
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(monthsToDays(this._months));
                switch (units) {
                    case 'week'   : return days / 7     + milliseconds / 6048e5;
                    case 'day'    : return days         + milliseconds / 864e5;
                    case 'hour'   : return days * 24    + milliseconds / 36e5;
                    case 'minute' : return days * 1440  + milliseconds / 6e4;
                    case 'second' : return days * 86400 + milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        }

        // TODO: Use this.as('ms')?
        function valueOf$1 () {
            if (!this.isValid()) {
                return NaN;
            }
            return (
                this._milliseconds +
                this._days * 864e5 +
                (this._months % 12) * 2592e6 +
                toInt(this._months / 12) * 31536e6
            );
        }

        function makeAs (alias) {
            return function () {
                return this.as(alias);
            };
        }

        var asMilliseconds = makeAs('ms');
        var asSeconds      = makeAs('s');
        var asMinutes      = makeAs('m');
        var asHours        = makeAs('h');
        var asDays         = makeAs('d');
        var asWeeks        = makeAs('w');
        var asMonths       = makeAs('M');
        var asQuarters     = makeAs('Q');
        var asYears        = makeAs('y');

        function clone$1 () {
            return createDuration(this);
        }

        function get$2 (units) {
            units = normalizeUnits(units);
            return this.isValid() ? this[units + 's']() : NaN;
        }

        function makeGetter(name) {
            return function () {
                return this.isValid() ? this._data[name] : NaN;
            };
        }

        var milliseconds = makeGetter('milliseconds');
        var seconds      = makeGetter('seconds');
        var minutes      = makeGetter('minutes');
        var hours        = makeGetter('hours');
        var days         = makeGetter('days');
        var months       = makeGetter('months');
        var years        = makeGetter('years');

        function weeks () {
            return absFloor(this.days() / 7);
        }

        var round = Math.round;
        var thresholds = {
            ss: 44,         // a few seconds to seconds
            s : 45,         // seconds to minute
            m : 45,         // minutes to hour
            h : 22,         // hours to day
            d : 26,         // days to month
            M : 11          // months to year
        };

        // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
        function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
            return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
        }

        function relativeTime$1 (posNegDuration, withoutSuffix, locale) {
            var duration = createDuration(posNegDuration).abs();
            var seconds  = round(duration.as('s'));
            var minutes  = round(duration.as('m'));
            var hours    = round(duration.as('h'));
            var days     = round(duration.as('d'));
            var months   = round(duration.as('M'));
            var years    = round(duration.as('y'));

            var a = seconds <= thresholds.ss && ['s', seconds]  ||
                    seconds < thresholds.s   && ['ss', seconds] ||
                    minutes <= 1             && ['m']           ||
                    minutes < thresholds.m   && ['mm', minutes] ||
                    hours   <= 1             && ['h']           ||
                    hours   < thresholds.h   && ['hh', hours]   ||
                    days    <= 1             && ['d']           ||
                    days    < thresholds.d   && ['dd', days]    ||
                    months  <= 1             && ['M']           ||
                    months  < thresholds.M   && ['MM', months]  ||
                    years   <= 1             && ['y']           || ['yy', years];

            a[2] = withoutSuffix;
            a[3] = +posNegDuration > 0;
            a[4] = locale;
            return substituteTimeAgo.apply(null, a);
        }

        // This function allows you to set the rounding function for relative time strings
        function getSetRelativeTimeRounding (roundingFunction) {
            if (roundingFunction === undefined) {
                return round;
            }
            if (typeof(roundingFunction) === 'function') {
                round = roundingFunction;
                return true;
            }
            return false;
        }

        // This function allows you to set a threshold for relative time strings
        function getSetRelativeTimeThreshold (threshold, limit) {
            if (thresholds[threshold] === undefined) {
                return false;
            }
            if (limit === undefined) {
                return thresholds[threshold];
            }
            thresholds[threshold] = limit;
            if (threshold === 's') {
                thresholds.ss = limit - 1;
            }
            return true;
        }

        function humanize (withSuffix) {
            if (!this.isValid()) {
                return this.localeData().invalidDate();
            }

            var locale = this.localeData();
            var output = relativeTime$1(this, !withSuffix, locale);

            if (withSuffix) {
                output = locale.pastFuture(+this, output);
            }

            return locale.postformat(output);
        }

        var abs$1 = Math.abs;

        function sign(x) {
            return ((x > 0) - (x < 0)) || +x;
        }

        function toISOString$1() {
            // for ISO strings we do not use the normal bubbling rules:
            //  * milliseconds bubble up until they become hours
            //  * days do not bubble at all
            //  * months bubble up until they become years
            // This is because there is no context-free conversion between hours and days
            // (think of clock changes)
            // and also not between days and months (28-31 days per month)
            if (!this.isValid()) {
                return this.localeData().invalidDate();
            }

            var seconds = abs$1(this._milliseconds) / 1000;
            var days         = abs$1(this._days);
            var months       = abs$1(this._months);
            var minutes, hours, years;

            // 3600 seconds -> 60 minutes -> 1 hour
            minutes           = absFloor(seconds / 60);
            hours             = absFloor(minutes / 60);
            seconds %= 60;
            minutes %= 60;

            // 12 months -> 1 year
            years  = absFloor(months / 12);
            months %= 12;


            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var Y = years;
            var M = months;
            var D = days;
            var h = hours;
            var m = minutes;
            var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
            var total = this.asSeconds();

            if (!total) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            var totalSign = total < 0 ? '-' : '';
            var ymSign = sign(this._months) !== sign(total) ? '-' : '';
            var daysSign = sign(this._days) !== sign(total) ? '-' : '';
            var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

            return totalSign + 'P' +
                (Y ? ymSign + Y + 'Y' : '') +
                (M ? ymSign + M + 'M' : '') +
                (D ? daysSign + D + 'D' : '') +
                ((h || m || s) ? 'T' : '') +
                (h ? hmsSign + h + 'H' : '') +
                (m ? hmsSign + m + 'M' : '') +
                (s ? hmsSign + s + 'S' : '');
        }

        var proto$2 = Duration.prototype;

        proto$2.isValid        = isValid$1;
        proto$2.abs            = abs;
        proto$2.add            = add$1;
        proto$2.subtract       = subtract$1;
        proto$2.as             = as;
        proto$2.asMilliseconds = asMilliseconds;
        proto$2.asSeconds      = asSeconds;
        proto$2.asMinutes      = asMinutes;
        proto$2.asHours        = asHours;
        proto$2.asDays         = asDays;
        proto$2.asWeeks        = asWeeks;
        proto$2.asMonths       = asMonths;
        proto$2.asQuarters     = asQuarters;
        proto$2.asYears        = asYears;
        proto$2.valueOf        = valueOf$1;
        proto$2._bubble        = bubble;
        proto$2.clone          = clone$1;
        proto$2.get            = get$2;
        proto$2.milliseconds   = milliseconds;
        proto$2.seconds        = seconds;
        proto$2.minutes        = minutes;
        proto$2.hours          = hours;
        proto$2.days           = days;
        proto$2.weeks          = weeks;
        proto$2.months         = months;
        proto$2.years          = years;
        proto$2.humanize       = humanize;
        proto$2.toISOString    = toISOString$1;
        proto$2.toString       = toISOString$1;
        proto$2.toJSON         = toISOString$1;
        proto$2.locale         = locale;
        proto$2.localeData     = localeData;

        proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
        proto$2.lang = lang;

        // Side effect imports

        // FORMATTING

        addFormatToken('X', 0, 0, 'unix');
        addFormatToken('x', 0, 0, 'valueOf');

        // PARSING

        addRegexToken('x', matchSigned);
        addRegexToken('X', matchTimestamp);
        addParseToken('X', function (input, array, config) {
            config._d = new Date(parseFloat(input, 10) * 1000);
        });
        addParseToken('x', function (input, array, config) {
            config._d = new Date(toInt(input));
        });

        // Side effect imports


        hooks.version = '2.24.0';

        setHookCallback(createLocal);

        hooks.fn                    = proto;
        hooks.min                   = min;
        hooks.max                   = max;
        hooks.now                   = now;
        hooks.utc                   = createUTC;
        hooks.unix                  = createUnix;
        hooks.months                = listMonths;
        hooks.isDate                = isDate;
        hooks.locale                = getSetGlobalLocale;
        hooks.invalid               = createInvalid;
        hooks.duration              = createDuration;
        hooks.isMoment              = isMoment;
        hooks.weekdays              = listWeekdays;
        hooks.parseZone             = createInZone;
        hooks.localeData            = getLocale;
        hooks.isDuration            = isDuration;
        hooks.monthsShort           = listMonthsShort;
        hooks.weekdaysMin           = listWeekdaysMin;
        hooks.defineLocale          = defineLocale;
        hooks.updateLocale          = updateLocale;
        hooks.locales               = listLocales;
        hooks.weekdaysShort         = listWeekdaysShort;
        hooks.normalizeUnits        = normalizeUnits;
        hooks.relativeTimeRounding  = getSetRelativeTimeRounding;
        hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
        hooks.calendarFormat        = getCalendarFormat;
        hooks.prototype             = proto;

        // currently HTML5 input type only supports 24-hour formats
        hooks.HTML5_FMT = {
            DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
            DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
            DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
            DATE: 'YYYY-MM-DD',                             // <input type="date" />
            TIME: 'HH:mm',                                  // <input type="time" />
            TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
            TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
            WEEK: 'GGGG-[W]WW',                             // <input type="week" />
            MONTH: 'YYYY-MM'                                // <input type="month" />
        };

        return hooks;

    })));
    });

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    let lastHue = 0;

    function getRandomColor() {
        var h = (lastHue + 107) % 360 + rand(10, 30); //to make the hues different each time
        lastHue = h;
        var s = rand(60, 80);
        var l = rand(60, 80);
        return 'hsl(' + h + ',' + s + '%,' + l + '%)';
    }

    function parseDuration(str) {
        let duration = moment.duration(str);
        let h = duration._data.hours;
        let m = duration._data.minutes;
        let s = duration._data.seconds;

        let res = "";

        if (h) {
            if (h > 9) {
                res += h + ":";
            } else {
                res += '0' + h + ":";
            }
        }

        if (m > 9) {
            res += m + ":";
        } else {
            res += '0' + m + ":";
        }

        if (s > 9) {
            res += s;
        } else {
            res += '0' + s;
        }

        return res;
    }

    /* src\Home.svelte generated by Svelte v3.18.2 */
    const file = "src\\Home.svelte";

    // (141:2) {#if !$fp}
    function create_if_block(ctx) {
    	let div;
    	let h1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Loading";
    			attr_dev(h1, "class", "svelte-s3qxnn");
    			add_location(h1, file, 142, 6, 2816);
    			attr_dev(div, "class", "loading");
    			add_location(div, file, 141, 4, 2787);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(141:2) {#if !$fp}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let t0;
    	let div6;
    	let div1;
    	let div0;
    	let t1;
    	let div5;
    	let div4;
    	let div2;
    	let span0;
    	let t3;
    	let div3;
    	let span1;
    	let t5;
    	let input;
    	let div6_hidden_value;
    	let dispose;
    	let if_block = !/*$fp*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
    			t0 = space();
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t1 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			span0 = element("span");
    			span0.textContent = "New Station";
    			t3 = space();
    			div3 = element("div");
    			span1 = element("span");
    			span1.textContent = "Join Station";
    			t5 = space();
    			input = element("input");
    			attr_dev(div0, "class", "logo svelte-s3qxnn");
    			add_location(div0, file, 147, 6, 2920);
    			attr_dev(div1, "class", "top svelte-s3qxnn");
    			add_location(div1, file, 146, 4, 2895);
    			add_location(span0, file, 152, 10, 3068);
    			attr_dev(div2, "class", "btn svelte-s3qxnn");
    			add_location(div2, file, 151, 8, 3017);
    			add_location(span1, file, 155, 10, 3170);
    			attr_dev(input, "maxlength", "4");
    			attr_dev(input, "class", "svelte-s3qxnn");
    			add_location(input, file, 156, 10, 3207);
    			attr_dev(div3, "class", "btn svelte-s3qxnn");
    			add_location(div3, file, 154, 8, 3118);
    			attr_dev(div4, "class", "buttons svelte-s3qxnn");
    			add_location(div4, file, 150, 6, 2986);
    			attr_dev(div5, "class", "bottom svelte-s3qxnn");
    			add_location(div5, file, 149, 4, 2958);
    			attr_dev(div6, "class", "home");
    			div6.hidden = div6_hidden_value = !/*$fp*/ ctx[2];
    			add_location(div6, file, 145, 2, 2857);
    			set_style(main, "background", /*bgColor*/ ctx[1]);
    			attr_dev(main, "class", "svelte-s3qxnn");
    			add_location(main, file, 139, 0, 2731);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
    			append_dev(main, t0);
    			append_dev(main, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, span0);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, span1);
    			append_dev(div3, t5);
    			append_dev(div3, input);
    			set_input_value(input, /*joinId*/ ctx[0]);

    			dispose = [
    				listen_dev(div2, "click", newStation$1, false, false, false),
    				listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    				listen_dev(input, "click", catchClick, false, false, false),
    				listen_dev(input, "keydown", /*catchEnter*/ ctx[4], false, false, false),
    				listen_dev(div3, "click", /*joinStation*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*$fp*/ ctx[2]) {
    				if (!if_block) {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*joinId*/ 1 && input.value !== /*joinId*/ ctx[0]) {
    				set_input_value(input, /*joinId*/ ctx[0]);
    			}

    			if (dirty & /*$fp*/ 4 && div6_hidden_value !== (div6_hidden_value = !/*$fp*/ ctx[2])) {
    				prop_dev(div6, "hidden", div6_hidden_value);
    			}

    			if (dirty & /*bgColor*/ 2) {
    				set_style(main, "background", /*bgColor*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function newStation$1() {
    	newStation();
    }

    function catchClick(e) {
    	e.stopPropagation();
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $fp;
    	validate_store(fp, "fp");
    	component_subscribe($$self, fp, $$value => $$invalidate(2, $fp = $$value));
    	let joinId;
    	let colorChange;
    	let bgColor = getRandomColor();
    	let params;

    	onMount(() => {
    		colorChange = setInterval(
    			() => {
    				$$invalidate(1, bgColor = getRandomColor());
    			},
    			1500
    		);
    	});

    	onDestroy(() => {
    		clearInterval(colorChange);
    	});

    	function joinStation() {
    		push(`/${joinId.toUpperCase()}`);
    	}

    	function catchEnter(e) {
    		if (e.code === "Enter") joinStation();
    	}

    	function input_input_handler() {
    		joinId = this.value;
    		$$invalidate(0, joinId);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("joinId" in $$props) $$invalidate(0, joinId = $$props.joinId);
    		if ("colorChange" in $$props) colorChange = $$props.colorChange;
    		if ("bgColor" in $$props) $$invalidate(1, bgColor = $$props.bgColor);
    		if ("params" in $$props) params = $$props.params;
    		if ("$fp" in $$props) fp.set($fp = $$props.$fp);
    	};

    	return [
    		joinId,
    		bgColor,
    		$fp,
    		joinStation,
    		catchEnter,
    		colorChange,
    		params,
    		input_input_handler
    	];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var has$1 = Object.prototype.hasOwnProperty;
    var isArray = Array.isArray;

    var hexTable = (function () {
        var array = [];
        for (var i = 0; i < 256; ++i) {
            array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
        }

        return array;
    }());

    var compactQueue = function compactQueue(queue) {
        while (queue.length > 1) {
            var item = queue.pop();
            var obj = item.obj[item.prop];

            if (isArray(obj)) {
                var compacted = [];

                for (var j = 0; j < obj.length; ++j) {
                    if (typeof obj[j] !== 'undefined') {
                        compacted.push(obj[j]);
                    }
                }

                item.obj[item.prop] = compacted;
            }
        }
    };

    var arrayToObject = function arrayToObject(source, options) {
        var obj = options && options.plainObjects ? Object.create(null) : {};
        for (var i = 0; i < source.length; ++i) {
            if (typeof source[i] !== 'undefined') {
                obj[i] = source[i];
            }
        }

        return obj;
    };

    var merge = function merge(target, source, options) {
        /* eslint no-param-reassign: 0 */
        if (!source) {
            return target;
        }

        if (typeof source !== 'object') {
            if (isArray(target)) {
                target.push(source);
            } else if (target && typeof target === 'object') {
                if ((options && (options.plainObjects || options.allowPrototypes)) || !has$1.call(Object.prototype, source)) {
                    target[source] = true;
                }
            } else {
                return [target, source];
            }

            return target;
        }

        if (!target || typeof target !== 'object') {
            return [target].concat(source);
        }

        var mergeTarget = target;
        if (isArray(target) && !isArray(source)) {
            mergeTarget = arrayToObject(target, options);
        }

        if (isArray(target) && isArray(source)) {
            source.forEach(function (item, i) {
                if (has$1.call(target, i)) {
                    var targetItem = target[i];
                    if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                        target[i] = merge(targetItem, item, options);
                    } else {
                        target.push(item);
                    }
                } else {
                    target[i] = item;
                }
            });
            return target;
        }

        return Object.keys(source).reduce(function (acc, key) {
            var value = source[key];

            if (has$1.call(acc, key)) {
                acc[key] = merge(acc[key], value, options);
            } else {
                acc[key] = value;
            }
            return acc;
        }, mergeTarget);
    };

    var assign = function assignSingleSource(target, source) {
        return Object.keys(source).reduce(function (acc, key) {
            acc[key] = source[key];
            return acc;
        }, target);
    };

    var decode$2 = function (str, decoder, charset) {
        var strWithoutPlus = str.replace(/\+/g, ' ');
        if (charset === 'iso-8859-1') {
            // unescape never throws, no try...catch needed:
            return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
        }
        // utf-8
        try {
            return decodeURIComponent(strWithoutPlus);
        } catch (e) {
            return strWithoutPlus;
        }
    };

    var encode$2 = function encode(str, defaultEncoder, charset) {
        // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
        // It has been adapted here for stricter adherence to RFC 3986
        if (str.length === 0) {
            return str;
        }

        var string = str;
        if (typeof str === 'symbol') {
            string = Symbol.prototype.toString.call(str);
        } else if (typeof str !== 'string') {
            string = String(str);
        }

        if (charset === 'iso-8859-1') {
            return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
                return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
            });
        }

        var out = '';
        for (var i = 0; i < string.length; ++i) {
            var c = string.charCodeAt(i);

            if (
                c === 0x2D // -
                || c === 0x2E // .
                || c === 0x5F // _
                || c === 0x7E // ~
                || (c >= 0x30 && c <= 0x39) // 0-9
                || (c >= 0x41 && c <= 0x5A) // a-z
                || (c >= 0x61 && c <= 0x7A) // A-Z
            ) {
                out += string.charAt(i);
                continue;
            }

            if (c < 0x80) {
                out = out + hexTable[c];
                continue;
            }

            if (c < 0x800) {
                out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
                continue;
            }

            if (c < 0xD800 || c >= 0xE000) {
                out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
                continue;
            }

            i += 1;
            c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
            out += hexTable[0xF0 | (c >> 18)]
                + hexTable[0x80 | ((c >> 12) & 0x3F)]
                + hexTable[0x80 | ((c >> 6) & 0x3F)]
                + hexTable[0x80 | (c & 0x3F)];
        }

        return out;
    };

    var compact = function compact(value) {
        var queue = [{ obj: { o: value }, prop: 'o' }];
        var refs = [];

        for (var i = 0; i < queue.length; ++i) {
            var item = queue[i];
            var obj = item.obj[item.prop];

            var keys = Object.keys(obj);
            for (var j = 0; j < keys.length; ++j) {
                var key = keys[j];
                var val = obj[key];
                if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                    queue.push({ obj: obj, prop: key });
                    refs.push(val);
                }
            }
        }

        compactQueue(queue);

        return value;
    };

    var isRegExp = function isRegExp(obj) {
        return Object.prototype.toString.call(obj) === '[object RegExp]';
    };

    var isBuffer$1 = function isBuffer(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
    };

    var combine = function combine(a, b) {
        return [].concat(a, b);
    };

    var utils = {
        arrayToObject: arrayToObject,
        assign: assign,
        combine: combine,
        compact: compact,
        decode: decode$2,
        encode: encode$2,
        isBuffer: isBuffer$1,
        isRegExp: isRegExp,
        merge: merge
    };

    var replace$1 = String.prototype.replace;
    var percentTwenties = /%20/g;



    var Format = {
        RFC1738: 'RFC1738',
        RFC3986: 'RFC3986'
    };

    var formats = utils.assign(
        {
            'default': Format.RFC3986,
            formatters: {
                RFC1738: function (value) {
                    return replace$1.call(value, percentTwenties, '+');
                },
                RFC3986: function (value) {
                    return String(value);
                }
            }
        },
        Format
    );

    var has$2 = Object.prototype.hasOwnProperty;

    var arrayPrefixGenerators = {
        brackets: function brackets(prefix) {
            return prefix + '[]';
        },
        comma: 'comma',
        indices: function indices(prefix, key) {
            return prefix + '[' + key + ']';
        },
        repeat: function repeat(prefix) {
            return prefix;
        }
    };

    var isArray$1 = Array.isArray;
    var push$1 = Array.prototype.push;
    var pushToArray = function (arr, valueOrArray) {
        push$1.apply(arr, isArray$1(valueOrArray) ? valueOrArray : [valueOrArray]);
    };

    var toISO = Date.prototype.toISOString;

    var defaultFormat = formats['default'];
    var defaults = {
        addQueryPrefix: false,
        allowDots: false,
        charset: 'utf-8',
        charsetSentinel: false,
        delimiter: '&',
        encode: true,
        encoder: utils.encode,
        encodeValuesOnly: false,
        format: defaultFormat,
        formatter: formats.formatters[defaultFormat],
        // deprecated
        indices: false,
        serializeDate: function serializeDate(date) {
            return toISO.call(date);
        },
        skipNulls: false,
        strictNullHandling: false
    };

    var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
        return typeof v === 'string'
            || typeof v === 'number'
            || typeof v === 'boolean'
            || typeof v === 'symbol'
            || typeof v === 'bigint';
    };

    var stringify = function stringify(
        object,
        prefix,
        generateArrayPrefix,
        strictNullHandling,
        skipNulls,
        encoder,
        filter,
        sort,
        allowDots,
        serializeDate,
        formatter,
        encodeValuesOnly,
        charset
    ) {
        var obj = object;
        if (typeof filter === 'function') {
            obj = filter(prefix, obj);
        } else if (obj instanceof Date) {
            obj = serializeDate(obj);
        } else if (generateArrayPrefix === 'comma' && isArray$1(obj)) {
            obj = obj.join(',');
        }

        if (obj === null) {
            if (strictNullHandling) {
                return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key') : prefix;
            }

            obj = '';
        }

        if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
            if (encoder) {
                var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key');
                return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value'))];
            }
            return [formatter(prefix) + '=' + formatter(String(obj))];
        }

        var values = [];

        if (typeof obj === 'undefined') {
            return values;
        }

        var objKeys;
        if (isArray$1(filter)) {
            objKeys = filter;
        } else {
            var keys = Object.keys(obj);
            objKeys = sort ? keys.sort(sort) : keys;
        }

        for (var i = 0; i < objKeys.length; ++i) {
            var key = objKeys[i];

            if (skipNulls && obj[key] === null) {
                continue;
            }

            if (isArray$1(obj)) {
                pushToArray(values, stringify(
                    obj[key],
                    typeof generateArrayPrefix === 'function' ? generateArrayPrefix(prefix, key) : prefix,
                    generateArrayPrefix,
                    strictNullHandling,
                    skipNulls,
                    encoder,
                    filter,
                    sort,
                    allowDots,
                    serializeDate,
                    formatter,
                    encodeValuesOnly,
                    charset
                ));
            } else {
                pushToArray(values, stringify(
                    obj[key],
                    prefix + (allowDots ? '.' + key : '[' + key + ']'),
                    generateArrayPrefix,
                    strictNullHandling,
                    skipNulls,
                    encoder,
                    filter,
                    sort,
                    allowDots,
                    serializeDate,
                    formatter,
                    encodeValuesOnly,
                    charset
                ));
            }
        }

        return values;
    };

    var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
        if (!opts) {
            return defaults;
        }

        if (opts.encoder !== null && opts.encoder !== undefined && typeof opts.encoder !== 'function') {
            throw new TypeError('Encoder has to be a function.');
        }

        var charset = opts.charset || defaults.charset;
        if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
            throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
        }

        var format = formats['default'];
        if (typeof opts.format !== 'undefined') {
            if (!has$2.call(formats.formatters, opts.format)) {
                throw new TypeError('Unknown format option provided.');
            }
            format = opts.format;
        }
        var formatter = formats.formatters[format];

        var filter = defaults.filter;
        if (typeof opts.filter === 'function' || isArray$1(opts.filter)) {
            filter = opts.filter;
        }

        return {
            addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
            allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
            charset: charset,
            charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
            delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
            encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
            encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
            encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
            filter: filter,
            formatter: formatter,
            serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
            skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
            sort: typeof opts.sort === 'function' ? opts.sort : null,
            strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
        };
    };

    var stringify_1 = function (object, opts) {
        var obj = object;
        var options = normalizeStringifyOptions(opts);

        var objKeys;
        var filter;

        if (typeof options.filter === 'function') {
            filter = options.filter;
            obj = filter('', obj);
        } else if (isArray$1(options.filter)) {
            filter = options.filter;
            objKeys = filter;
        }

        var keys = [];

        if (typeof obj !== 'object' || obj === null) {
            return '';
        }

        var arrayFormat;
        if (opts && opts.arrayFormat in arrayPrefixGenerators) {
            arrayFormat = opts.arrayFormat;
        } else if (opts && 'indices' in opts) {
            arrayFormat = opts.indices ? 'indices' : 'repeat';
        } else {
            arrayFormat = 'indices';
        }

        var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

        if (!objKeys) {
            objKeys = Object.keys(obj);
        }

        if (options.sort) {
            objKeys.sort(options.sort);
        }

        for (var i = 0; i < objKeys.length; ++i) {
            var key = objKeys[i];

            if (options.skipNulls && obj[key] === null) {
                continue;
            }
            pushToArray(keys, stringify(
                obj[key],
                key,
                generateArrayPrefix,
                options.strictNullHandling,
                options.skipNulls,
                options.encode ? options.encoder : null,
                options.filter,
                options.sort,
                options.allowDots,
                options.serializeDate,
                options.formatter,
                options.encodeValuesOnly,
                options.charset
            ));
        }

        var joined = keys.join(options.delimiter);
        var prefix = options.addQueryPrefix === true ? '?' : '';

        if (options.charsetSentinel) {
            if (options.charset === 'iso-8859-1') {
                // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
                prefix += 'utf8=%26%2310003%3B&';
            } else {
                // encodeURIComponent('✓')
                prefix += 'utf8=%E2%9C%93&';
            }
        }

        return joined.length > 0 ? prefix + joined : '';
    };

    var has$3 = Object.prototype.hasOwnProperty;
    var isArray$2 = Array.isArray;

    var defaults$1 = {
        allowDots: false,
        allowPrototypes: false,
        arrayLimit: 20,
        charset: 'utf-8',
        charsetSentinel: false,
        comma: false,
        decoder: utils.decode,
        delimiter: '&',
        depth: 5,
        ignoreQueryPrefix: false,
        interpretNumericEntities: false,
        parameterLimit: 1000,
        parseArrays: true,
        plainObjects: false,
        strictNullHandling: false
    };

    var interpretNumericEntities = function (str) {
        return str.replace(/&#(\d+);/g, function ($0, numberStr) {
            return String.fromCharCode(parseInt(numberStr, 10));
        });
    };

    // This is what browsers will submit when the ✓ character occurs in an
    // application/x-www-form-urlencoded body and the encoding of the page containing
    // the form is iso-8859-1, or when the submitted form has an accept-charset
    // attribute of iso-8859-1. Presumably also with other charsets that do not contain
    // the ✓ character, such as us-ascii.
    var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

    // These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
    var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

    var parseValues = function parseQueryStringValues(str, options) {
        var obj = {};
        var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
        var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
        var parts = cleanStr.split(options.delimiter, limit);
        var skipIndex = -1; // Keep track of where the utf8 sentinel was found
        var i;

        var charset = options.charset;
        if (options.charsetSentinel) {
            for (i = 0; i < parts.length; ++i) {
                if (parts[i].indexOf('utf8=') === 0) {
                    if (parts[i] === charsetSentinel) {
                        charset = 'utf-8';
                    } else if (parts[i] === isoSentinel) {
                        charset = 'iso-8859-1';
                    }
                    skipIndex = i;
                    i = parts.length; // The eslint settings do not allow break;
                }
            }
        }

        for (i = 0; i < parts.length; ++i) {
            if (i === skipIndex) {
                continue;
            }
            var part = parts[i];

            var bracketEqualsPos = part.indexOf(']=');
            var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

            var key, val;
            if (pos === -1) {
                key = options.decoder(part, defaults$1.decoder, charset, 'key');
                val = options.strictNullHandling ? null : '';
            } else {
                key = options.decoder(part.slice(0, pos), defaults$1.decoder, charset, 'key');
                val = options.decoder(part.slice(pos + 1), defaults$1.decoder, charset, 'value');
            }

            if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
                val = interpretNumericEntities(val);
            }

            if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
                val = val.split(',');
            }

            if (part.indexOf('[]=') > -1) {
                val = isArray$2(val) ? [val] : val;
            }

            if (has$3.call(obj, key)) {
                obj[key] = utils.combine(obj[key], val);
            } else {
                obj[key] = val;
            }
        }

        return obj;
    };

    var parseObject = function (chain, val, options) {
        var leaf = val;

        for (var i = chain.length - 1; i >= 0; --i) {
            var obj;
            var root = chain[i];

            if (root === '[]' && options.parseArrays) {
                obj = [].concat(leaf);
            } else {
                obj = options.plainObjects ? Object.create(null) : {};
                var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
                var index = parseInt(cleanRoot, 10);
                if (!options.parseArrays && cleanRoot === '') {
                    obj = { 0: leaf };
                } else if (
                    !isNaN(index)
                    && root !== cleanRoot
                    && String(index) === cleanRoot
                    && index >= 0
                    && (options.parseArrays && index <= options.arrayLimit)
                ) {
                    obj = [];
                    obj[index] = leaf;
                } else {
                    obj[cleanRoot] = leaf;
                }
            }

            leaf = obj;
        }

        return leaf;
    };

    var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
        if (!givenKey) {
            return;
        }

        // Transform dot notation to bracket notation
        var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

        // The regex chunks

        var brackets = /(\[[^[\]]*])/;
        var child = /(\[[^[\]]*])/g;

        // Get the parent

        var segment = options.depth > 0 && brackets.exec(key);
        var parent = segment ? key.slice(0, segment.index) : key;

        // Stash the parent if it exists

        var keys = [];
        if (parent) {
            // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
            if (!options.plainObjects && has$3.call(Object.prototype, parent)) {
                if (!options.allowPrototypes) {
                    return;
                }
            }

            keys.push(parent);
        }

        // Loop through children appending to the array until we hit depth

        var i = 0;
        while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
            i += 1;
            if (!options.plainObjects && has$3.call(Object.prototype, segment[1].slice(1, -1))) {
                if (!options.allowPrototypes) {
                    return;
                }
            }
            keys.push(segment[1]);
        }

        // If there's a remainder, just add whatever is left

        if (segment) {
            keys.push('[' + key.slice(segment.index) + ']');
        }

        return parseObject(keys, val, options);
    };

    var normalizeParseOptions = function normalizeParseOptions(opts) {
        if (!opts) {
            return defaults$1;
        }

        if (opts.decoder !== null && opts.decoder !== undefined && typeof opts.decoder !== 'function') {
            throw new TypeError('Decoder has to be a function.');
        }

        if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
            throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
        }
        var charset = typeof opts.charset === 'undefined' ? defaults$1.charset : opts.charset;

        return {
            allowDots: typeof opts.allowDots === 'undefined' ? defaults$1.allowDots : !!opts.allowDots,
            allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults$1.allowPrototypes,
            arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults$1.arrayLimit,
            charset: charset,
            charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults$1.charsetSentinel,
            comma: typeof opts.comma === 'boolean' ? opts.comma : defaults$1.comma,
            decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults$1.decoder,
            delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults$1.delimiter,
            // eslint-disable-next-line no-implicit-coercion, no-extra-parens
            depth: (typeof opts.depth === 'number' || opts.depth === false) ? +opts.depth : defaults$1.depth,
            ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
            interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults$1.interpretNumericEntities,
            parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults$1.parameterLimit,
            parseArrays: opts.parseArrays !== false,
            plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults$1.plainObjects,
            strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults$1.strictNullHandling
        };
    };

    var parse$3 = function (str, opts) {
        var options = normalizeParseOptions(opts);

        if (str === '' || str === null || typeof str === 'undefined') {
            return options.plainObjects ? Object.create(null) : {};
        }

        var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
        var obj = options.plainObjects ? Object.create(null) : {};

        // Iterate over the keys and setup the new object

        var keys = Object.keys(tempObj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var newObj = parseKeys(key, tempObj[key], options);
            obj = utils.merge(obj, newObj, options);
        }

        return utils.compact(obj);
    };

    var lib$2 = {
        formats: formats,
        parse: parse$3,
        stringify: stringify_1
    };

    /* src\Player.svelte generated by Svelte v3.18.2 */

    const { console: console_1 } = globals;
    const file$1 = "src\\Player.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", /*divId*/ ctx[0]);
    			add_location(div, file$1, 89, 0, 2731);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let YouTubeIframeAPIReady = false;

    function isMyScriptLoaded(url = "") {
    	var scripts = document.getElementsByTagName("script");

    	for (var i = scripts.length; i--; ) {
    		if (scripts[i].src == url) return true;
    	}

    	return false;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { player } = $$props;
    	const dispatch = createEventDispatcher();
    	let divId = "player_" + parseInt(Math.random() * 100000).toString();
    	let { videoId = "9xD-KJSjIxw" } = $$props;
    	let { height = "390" } = $$props;
    	let { width = "640" } = $$props;

    	onMount(() => {
    		let ytTagUrl = "https://www.youtube.com/iframe_api";

    		if (!isMyScriptLoaded(ytTagUrl)) {
    			// 2. This code loads the IFrame Player API code asynchronously.
    			var tag = document.createElement("script");

    			tag.src = ytTagUrl;
    			var firstScriptTag = document.getElementsByTagName("script")[0];
    			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    		}

    		window.onYouTubeIframeAPIReady = function () {
    			//console.log('hello')
    			window.dispatchEvent(new Event("YouTubeIframeAPIReady"));
    		};

    		window.addEventListener("YouTubeIframeAPIReady", function () {
    			if (YouTubeIframeAPIReady == false) {
    				// first load of an YT Video on this project
    				YouTubeIframeAPIReady = true; // now the Player can be created

    				createPlayer();
    			}
    		});

    		function createPlayer() {
    			$$invalidate(1, player = new YT.Player(divId,
    			{
    					height,
    					width,
    					videoId,
    					enablejsapi: true,
    					events: {
    						onReady: onPlayerReady,
    						onStateChange: onPlayerStateChange
    					}
    				}));
    		}

    		if (YouTubeIframeAPIReady) {
    			createPlayer(); // if the YT Script is ready, we can create our player
    		}
    	});

    	function onPlayerReady() {
    		//resize youtube player to fit window
    		var iframe = player.getIframe();

    		iframe.style.width = "100%";
    		iframe.style.maxWidth = "640px";
    		var w = window.getComputedStyle(iframe).width;
    		w = parseInt(w);
    		w = Math.max(w, 640);
    		var h = (w * 0.5625).toString() + "px"; //0.5625 = 9 / 16
    		iframe.style.height = h;
    	}

    	function onPlayerStateChange({ data }) {
    		debugger;
    		let qstr = player.getVideoUrl().split("/watch?")[1];
    		let videoId = lib$2.parse(qstr).v;
    		console.log(data, videoId);
    		setPlayerState(data, videoId);
    	}

    	function playVideo(video) {
    		player.loadVideoById(video.videoId);
    	}

    	const writable_props = ["player", "videoId", "height", "width"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Player> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("player" in $$props) $$invalidate(1, player = $$props.player);
    		if ("videoId" in $$props) $$invalidate(2, videoId = $$props.videoId);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("width" in $$props) $$invalidate(4, width = $$props.width);
    	};

    	$$self.$capture_state = () => {
    		return {
    			YouTubeIframeAPIReady,
    			player,
    			divId,
    			videoId,
    			height,
    			width
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("player" in $$props) $$invalidate(1, player = $$props.player);
    		if ("divId" in $$props) $$invalidate(0, divId = $$props.divId);
    		if ("videoId" in $$props) $$invalidate(2, videoId = $$props.videoId);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("width" in $$props) $$invalidate(4, width = $$props.width);
    	};

    	return [divId, player, videoId, height, width, playVideo];
    }

    class Player extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			player: 1,
    			videoId: 2,
    			height: 3,
    			width: 4,
    			playVideo: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Player",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*player*/ ctx[1] === undefined && !("player" in props)) {
    			console_1.warn("<Player> was created without expected prop 'player'");
    		}
    	}

    	get player() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set player(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get videoId() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set videoId(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playVideo() {
    		return this.$$.ctx[5];
    	}

    	set playVideo(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const searchStr = writable("");

    let temp = [{ "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/-SZw1ileicNBPtrmv_4EXur-1iU\"", "id": "YQHsXMglC9A", "snippet": { "publishedAt": "2015-10-23T06:54:18.000Z", "channelId": "UComP_epzeKzvBX156r6pm1Q", "title": "Adele - Hello cbskjc wjbiuaw efunaef fnseuonsiu owiuehfw fewoiwe wueu eue euenf oow eem c ew ceweww few", "description": "‘Hello' is taken from the new album, 25, out November 20. http://adele.com\nAvailable now from iTunes http://smarturl.it/itunes25 \nAvailable now from Amazon http://smarturl.it/25amazon \nAvailable now from Google Play http://smarturl.it/25gplay\nAvailable now at Target (US Only): http://smarturl.it/target25\n\nDirected by Xavier Dolan, @XDolan\n\nFollow Adele on:\n\nFacebook - https://www.facebook.com/Adele\nTwitter - https://twitter.com/Adele \nInstagram - http://instagram.com/Adele\n\nhttp://vevo.ly/jzAuJ1\n\nCommissioner: Phil Lee\nProduction Company: Believe Media/Sons of Manual/Metafilms\nDirector: Xavier Dolan\nExecutive Producer: Jannie McInnes\nProducer: Nancy Grant/Xavier Dolan\nCinematographer:  André Turpin\nProduction design : Colombe Raby\nEditor: Xavier Dolan\nAdele's lover : Tristan Wilds", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/YQHsXMglC9A/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/YQHsXMglC9A/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/YQHsXMglC9A/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/YQHsXMglC9A/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/YQHsXMglC9A/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "AdeleVEVO", "tags": ["Adele", "21", "19", "Someone Like You", "Chasing Pavements", "Set Fire to the Rain", "Rolling in the Deep", "XL Recordings"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Adele - Hello lorem ipsum bekj wicbwecwbe weuifhweiew ewuibew ewuhfiwue weuhfweiuhfw weuifhwe nwieufhwei", "description": "‘Hello' is taken from the new album, 25, out November 20. http://adele.com\nAvailable now from iTunes http://smarturl.it/itunes25 \nAvailable now from Amazon http://smarturl.it/25amazon \nAvailable now from Google Play http://smarturl.it/25gplay\nAvailable now at Target (US Only): http://smarturl.it/target25\n\nDirected by Xavier Dolan, @XDolan\n\nFollow Adele on:\n\nFacebook - https://www.facebook.com/Adele\nTwitter - https://twitter.com/Adele \nInstagram - http://instagram.com/Adele\n\nhttp://vevo.ly/jzAuJ1\n\nCommissioner: Phil Lee\nProduction Company: Believe Media/Sons of Manual/Metafilms\nDirector: Xavier Dolan\nExecutive Producer: Jannie McInnes\nProducer: Nancy Grant/Xavier Dolan\nCinematographer:  André Turpin\nProduction design : Colombe Raby\nEditor: Xavier Dolan\nAdele's lover : Tristan Wilds" }, "defaultAudioLanguage": "en-US" }, "contentDetails": { "duration": "PT6M7S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/DYyhneMVpbfdktiZ3ZtE7vzhKj8\"", "id": "UBYnT8JY7sE", "snippet": { "publishedAt": "2010-07-25T07:29:15.000Z", "channelId": "UCc8fZTZpS6XykoykqVjabaA", "title": "Lionel Richie - Hello [LYRICS]", "description": "Lionel Richie - Hello with LYRICS", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/UBYnT8JY7sE/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/UBYnT8JY7sE/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/UBYnT8JY7sE/hqdefault.jpg", "width": 480, "height": 360 } }, "channelTitle": "acidburn950", "tags": ["Lionel", "Richie", "Hello"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Lionel Richie - Hello [LYRICS]", "description": "Lionel Richie - Hello with LYRICS" } }, "contentDetails": { "duration": "PT4M8S", "dimension": "2d", "definition": "sd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/XFgWkkOM0M0Pes1ZZMSxca-shHI\"", "id": "bnVUHWCynig", "snippet": { "publishedAt": "2009-10-03T20:59:40.000Z", "channelId": "UC9zX2xZIJ4cnwRsgBpHGvMg", "title": "Beyoncé - Halo", "description": "Beyoncé's official video for 'Halo'. Click to listen to Beyoncé on Spotify: http://smarturl.it/BeyonceSpot?IQid=B...\n\nAs featured on I Am... Sasha Fierce. Click to buy the track or album via iTunes: http://smarturl.it/BeyIASFiTunes?IQid...\nGoogle Play: http://smarturl.it/BeyHaloPlay?IQid=B...\nAmazon: http://smarturl.it/BeyIASFamz?IQid=Be...\n\nMore from Beyoncé\nFlaws And All: https://youtu.be/iK9Iio7WgaI\nDance For You: https://youtu.be/PGc9n6BiWXA\nFreakum Dress: https://youtu.be/ArDXxTsJJoo\n\nFollow Beyoncé\nWebsite: http://www.beyonce.com/\nFacebook: https://www.facebook.com/beyonce\nTwitter: https://twitter.com/beyonce\nInstagram: https://instagram.com/beyonce/\n\nSubscribe to Beyoncé on YouTube: http://smarturl.it/BeyonceSub?IQid=Be...\n\nMore great Global Hits videos here: http://smarturl.it/GlobalHits?IQid=Be...\n\n---------\n\nLyrics:\n\nRemember those walls I built?\nWell, baby they're tumbling down\nAnd they didn't even put up a fight\nThey didn't even make a sound\nI found a way to let you in\nBut, I never really had a doubt\nStanding in the light of your halo\nI got my angel now\n\nIt's like I've been awakened\nEvery rule I had you breakin'\nIt's the risk that I'm taking\nI ain't never gonna shut you out!\n\nEverywhere I'm looking now\nI'm surrounded by your embrace\nBaby, I can see your halo\nYou know you're my saving grace\nYou're everything I need and more\nIt's written all over your face\nBaby, I can feel your halo\nPray it won't fade away", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/bnVUHWCynig/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/bnVUHWCynig/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/bnVUHWCynig/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/bnVUHWCynig/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/bnVUHWCynig/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "BeyoncéVEVO", "tags": ["Beyonce", "Beyoncevevo", "vevo", "official", "music video", "video", "single", "album", "I Am Sasha Fierce", "Sorry", "Single Ladies", "If I Were a Boy", "Crazy In Love", "Irreplaceable", "Love On Top", "Best Thing I Never Had", "Countdown", "Partition", "Video Phone", "Sweet Dreams", "Beautiful Liar", "Beyoncé", "Halo", "Music World Music/Columbia", "Pop"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Beyoncé - Halo", "description": "Beyoncé's official video for 'Halo'. Click to listen to Beyoncé on Spotify: http://smarturl.it/BeyonceSpot?IQid=B...\n\nAs featured on I Am... Sasha Fierce. Click to buy the track or album via iTunes: http://smarturl.it/BeyIASFiTunes?IQid...\nGoogle Play: http://smarturl.it/BeyHaloPlay?IQid=B...\nAmazon: http://smarturl.it/BeyIASFamz?IQid=Be...\n\nMore from Beyoncé\nFlaws And All: https://youtu.be/iK9Iio7WgaI\nDance For You: https://youtu.be/PGc9n6BiWXA\nFreakum Dress: https://youtu.be/ArDXxTsJJoo\n\nFollow Beyoncé\nWebsite: http://www.beyonce.com/\nFacebook: https://www.facebook.com/beyonce\nTwitter: https://twitter.com/beyonce\nInstagram: https://instagram.com/beyonce/\n\nSubscribe to Beyoncé on YouTube: http://smarturl.it/BeyonceSub?IQid=Be...\n\nMore great Global Hits videos here: http://smarturl.it/GlobalHits?IQid=Be...\n\n---------\n\nLyrics:\n\nRemember those walls I built?\nWell, baby they're tumbling down\nAnd they didn't even put up a fight\nThey didn't even make a sound\nI found a way to let you in\nBut, I never really had a doubt\nStanding in the light of your halo\nI got my angel now\n\nIt's like I've been awakened\nEvery rule I had you breakin'\nIt's the risk that I'm taking\nI ain't never gonna shut you out!\n\nEverywhere I'm looking now\nI'm surrounded by your embrace\nBaby, I can see your halo\nYou know you're my saving grace\nYou're everything I need and more\nIt's written all over your face\nBaby, I can feel your halo\nPray it won't fade away" } }, "contentDetails": { "duration": "PT3M45S", "dimension": "2d", "definition": "sd", "caption": "false", "licensedContent": true, "regionRestriction": { "allowed": ["KW", "RO", "KR", "KP", "RE", "KZ", "KY", "EE", "KG", "KE", "KN", "GF", "RW", "KM", "KH", "KI", "DK", "BY", "BZ", "ZM", "BT", "BW", "BV", "BS", "BR", "BM", "BL", "BO", "BN", "BI", "BH", "MZ", "BJ", "BE", "BD", "BG", "BF", "BA", "BB", "QA", "JP", "YT", "JE", "JM", "JO", "YE", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "GP", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "PG", "PF", "PE", "IL", "IM", "IN", "IO", "PN", "PM", "PL", "ID", "IE", "PH", "PW", "RU", "PT", "PS", "PR", "IQ", "IR", "IS", "IT", "PY", "LV", "ES", "LU", "LT", "RS", "SG", "LY", "WS", "HM", "HK", "HN", "WF", "ZA", "HU", "HT", "HR", "PK", "EH", "LS", "GB", "GA", "VU", "GG", "GD", "GE", "GH", "GI", "GN", "GL", "GM", "GR", "GS", "VC", "GQ", "VE", "GW", "GT", "OM", "VI", "MX", "NR", "GY", "LI", "VN", "PA", "EC", "ZW", "MT", "NZ", "US", "FI", "TG", "FK", "FJ", "FM", "UY", "UZ", "MQ", "NI", "UG", "UA", "NO", "NA", "UM", "NC", "MS", "NE", "NG", "NF", "LK", "ET", "MM", "VA", "TK", "TJ", "TH", "TO", "TN", "TM", "TL", "TC", "MU", "MV", "MW", "MP", "TF", "MR", "TD", "ML", "TZ", "MN", "MO", "MH", "ER", "MK", "MD", "ME", "MF", "MG", "GU", "MA", "MC", "DZ", "EG", "MY", "TW", "TV", "TR", "DJ", "CM", "DO", "DM", "NP", "TT", "DE", "SN", "SO", "SL", "SM", "SJ", "SK", "SH", "SI", "VG", "NU", "SD", "SE", "SB", "SC", "SA", "LC", "LB", "LA", "LR", "SZ", "FO", "SY", "SV", "ST", "SR", "CZ", "CX", "CY", "CV", "CU", "CR", "CN", "CO", "CL", "FR", "CK", "CH", "CI", "CF", "CG", "CD", "CA", "CC", "NL"] }, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/8IHKCV-QB_NqbU871hsFU-XLJxE\"", "id": "-ZnyF5vF1N8", "snippet": { "publishedAt": "2020-03-04T16:33:37.000Z", "channelId": "UCKHsXi0fY-mvLAAnLq95PPQ", "title": "Spring Jazz - Sunny Bossa Nova & Relaxing  Jazz - Hello, Spring!", "description": "Thank you for listening: Spring Jazz - Relaxing Bossa Nova & Relaxing  Jazz - Hello, Spring!\nPLEASE ► SUBSCRIBE! ► https://goo.gl/EBzGGl \n\nMake sure to check out the channel ► https://goo.gl/EBzGGl  for more Jazz, Bossa nova, Morning Music, French music and more. \n\nNew videos ► https://goo.gl/QcU7ry \n\nMore Jazz ► https://goo.gl/1VqaPt\n\nMore Bossa Nova ► https://goo.gl/sfNrGR\n\nMore Happy Music ► https://goo.gl/uLcTGv\n\n►AWESOME MUSIC COLLECTION ► https://goo.gl/QcU7ry \n#loungemusic #spring #loungejazz #bossanova\nPLEASE ► SUBSCRIBE! ► https://goo.gl/EBzGGl \n\nMake sure to check out the channel ► https://goo.gl/EBzGGl  for more Jazz, Bossa nova, Morning Music, French music and more. \n\nNew videos ► https://goo.gl/QcU7ry \n\nMore Jazz ► https://goo.gl/1VqaPt\n\nMore Bossa Nova ► https://goo.gl/sfNrGR\n\nMore Happy Music ► https://goo.gl/uLcTGv\n\n►AWESOME MUSIC COLLECTION ► https://goo.gl/QcU7ry \n#loungemusic #spring #loungejazz #bossanova", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/-ZnyF5vF1N8/default_live.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/-ZnyF5vF1N8/mqdefault_live.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/-ZnyF5vF1N8/hqdefault_live.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/-ZnyF5vF1N8/sddefault_live.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/-ZnyF5vF1N8/maxresdefault_live.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Lounge Music", "tags": ["lounge music", "jazz", "spring jazz", "spring music", "relaxing jazz", "mornig music", "work music", "study music", "ジャズ", "作業用", "勉強用", "作業用 カフェ", "作業用 ジャズ", "作業用 ボッサ", "カフェ 作業用", "勉強 集中", "作業用 jazz", "作業用 ピアノ", "オシャレジャズ", "睡眠用音楽", "jazz music", "jazz lounge", "background", "jazz sleep", "playlist", "instrumental", "jazz study", "music to concentrate", "jazz work music", "smooth jazz", "jazz for work in office", "dinner music", "romantic", "cooking music", "evening music", "calm", "piano"], "categoryId": "10", "liveBroadcastContent": "live", "localized": { "title": "Spring Jazz - Sunny Bossa Nova & Relaxing  Jazz - Hello, Spring!", "description": "Thank you for listening: Spring Jazz - Relaxing Bossa Nova & Relaxing  Jazz - Hello, Spring!\nPLEASE ► SUBSCRIBE! ► https://goo.gl/EBzGGl \n\nMake sure to check out the channel ► https://goo.gl/EBzGGl  for more Jazz, Bossa nova, Morning Music, French music and more. \n\nNew videos ► https://goo.gl/QcU7ry \n\nMore Jazz ► https://goo.gl/1VqaPt\n\nMore Bossa Nova ► https://goo.gl/sfNrGR\n\nMore Happy Music ► https://goo.gl/uLcTGv\n\n►AWESOME MUSIC COLLECTION ► https://goo.gl/QcU7ry \n#loungemusic #spring #loungejazz #bossanova\nPLEASE ► SUBSCRIBE! ► https://goo.gl/EBzGGl \n\nMake sure to check out the channel ► https://goo.gl/EBzGGl  for more Jazz, Bossa nova, Morning Music, French music and more. \n\nNew videos ► https://goo.gl/QcU7ry \n\nMore Jazz ► https://goo.gl/1VqaPt\n\nMore Bossa Nova ► https://goo.gl/sfNrGR\n\nMore Happy Music ► https://goo.gl/uLcTGv\n\n►AWESOME MUSIC COLLECTION ► https://goo.gl/QcU7ry \n#loungemusic #spring #loungejazz #bossanova" } }, "contentDetails": { "duration": "PT0S", "dimension": "2d", "definition": "sd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/ZFHNmJyC-n7fHLLNBVy88wOhY6I\"", "id": "VKIiCOZ2Eo4", "snippet": { "publishedAt": "2019-01-30T05:35:38.000Z", "channelId": "UCV1Nlv5cOSB--hEjRVo4mUA", "title": "Adele Hello lyrics", "description": "Adele- Hello Lyrics\nSubcribe for more songs lyrics", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/VKIiCOZ2Eo4/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/VKIiCOZ2Eo4/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/VKIiCOZ2Eo4/hqdefault.jpg", "width": 480, "height": 360 } }, "channelTitle": "Khans Lyrics", "tags": ["English song lyrics", "english learning", "Adele song", "hello lyrics", "hello song lyrics", "adele", "lyrics song"], "categoryId": "10", "liveBroadcastContent": "none", "defaultLanguage": "en", "localized": { "title": "Adele Hello lyrics", "description": "Adele- Hello Lyrics\nSubcribe for more songs lyrics" }, "defaultAudioLanguage": "en" }, "contentDetails": { "duration": "PT4M56S", "dimension": "2d", "definition": "sd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/fxnjQ71OJy_Bic53yvPHYFpevcg\"", "id": "QkeehQ8D_VM", "snippet": { "publishedAt": "2018-05-24T11:16:46.000Z", "channelId": "UChC2OO1dG5Vge1Kuc-1QZRg", "title": "Hello?", "description": "Provided to YouTube by Universal Music Group\n\nHello? · Clairo · Rejjie Snow\n\ndiary 001\n\n℗ 2018 Clairo under exclusive license to FADER Label\n\nReleased on: 2018-05-25\n\nStudio  Personnel, Engineer: Elton Chueng\nProducer: Claire Cottrill\nComposer  Lyricist: Claire Cottrill\n\nAuto-generated by YouTube.", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/QkeehQ8D_VM/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/QkeehQ8D_VM/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/QkeehQ8D_VM/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/QkeehQ8D_VM/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/QkeehQ8D_VM/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Clairo - Topic", "tags": ["Clairo", "クレイロ", "Rejjie Snow", "diary 001", "Hello?"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Hello?", "description": "Provided to YouTube by Universal Music Group\n\nHello? · Clairo · Rejjie Snow\n\ndiary 001\n\n℗ 2018 Clairo under exclusive license to FADER Label\n\nReleased on: 2018-05-25\n\nStudio  Personnel, Engineer: Elton Chueng\nProducer: Claire Cottrill\nComposer  Lyricist: Claire Cottrill\n\nAuto-generated by YouTube." } }, "contentDetails": { "duration": "PT2M16S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "regionRestriction": { "allowed": ["GB", "KW", "RO", "KR", "EE", "KY", "GR", "KE", "VE", "GT", "GU", "RU", "GF", "TH", "NC", "RS", "VN", "BY", "PA", "BR", "BM", "TC", "BO", "MK", "BH", "BE", "BG", "BA", "QA", "NZ", "LI", "JP", "US", "FI", "MP", "YT", "UY", "MQ", "NI", "FR", "NL", "NO", "JO", "NG", "AR", "AS", "AT", "AU", "AW", "AE", "UA", "PG", "PF", "PE", "EG", "IL", "MY", "IN", "EC", "MT", "OM", "ID", "IE", "PH", "VI", "PT", "ES", "TR", "IS", "IT", "MA", "PY", "SK", "DZ", "TW", "LT", "DK", "DO", "DE", "HN", "HK", "LV", "LU", "SI", "SG", "SE", "SA", "LB", "SV", "ZA", "HU", "HR", "CZ", "PL", "CY", "CR", "CO", "CL", "CH", "MX", "CA"] }, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/vvyqx911wlTTSJ2uekTS5vJLxR0\"", "id": "WXswFMfNPiw", "snippet": { "publishedAt": "2019-10-03T12:00:08.000Z", "channelId": "UCtyr6UXUdZJJHuWGKzoiLfg", "title": "Stacy e papai estão tentando fazer amizade com Hello Neighbor", "description": "Stacy e pai estão brincando lá fora. A bola deles bateu na casa de um vizinho. Oi vizinho é muito infeliz.\nSubscribe to Like Nastya Vlog - https://is.gd/gdv8uX\nhttps://www.instagram.com/funnystacy/", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/WXswFMfNPiw/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/WXswFMfNPiw/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/WXswFMfNPiw/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/WXswFMfNPiw/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/WXswFMfNPiw/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Like Nastya PRT", "tags": ["stacy e papai", "Hello Neighbor", "brinquedos", "vídeo do bebê", "vídeo para crianças", "em português", "kids videos", "stacy", "funny stacy"], "categoryId": "24", "liveBroadcastContent": "none", "defaultLanguage": "en", "localized": { "title": "Stacy e papai estão tentando fazer amizade com Hello Neighbor", "description": "Stacy e pai estão brincando lá fora. A bola deles bateu na casa de um vizinho. Oi vizinho é muito infeliz.\nSubscribe to Like Nastya Vlog - https://is.gd/gdv8uX\nhttps://www.instagram.com/funnystacy/" }, "defaultAudioLanguage": "pt" }, "contentDetails": { "duration": "PT3M56S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/-DrtN87DFFzzwoJsiUpI-ChDAmk\"", "id": "ryUcuJX2NPM", "snippet": { "publishedAt": "2019-12-02T12:00:12.000Z", "channelId": "UCg_TCq59-vedX9R9iHl-avQ", "title": "Andi Bernadee & Ismail Izzani - Hello (Andi Version | Official Music Video)", "description": "Andi Bernadee & Ismail Izzani - Hello [Andi Version | Official Music Video]\n\nLepas korang tengok muzik video 🎥 ni mesti korang nak tau siapa pembunuhnya 🔪 kan? Tengoklah ni: https://youtu.be/hYq4dNUQk_8\n\nDownload RBT now! \nMaxis Caller Ringtones: Dial *131*645703# and press CALL/SEND \nCelcom Call Me Tones: Dial *323*323602# and press CALL/SEND \nDiGi Caller Tunes: Dial *233*1815541# and press CALL/SEND\n\nListen to Andi Bernadee & Ismail Izzani here: https://wmm.lnk.to/HelloAbii\n\n#HelloABII #AndiBernadee\n\nComposer: Mas Dewangga, Firdaus Rahmat, Ismail Izzani\nLyrics: Mas Dewangga, Firdaus Rahmat, Ismail Izzani\nProducer: World Peace Entertainment\n\nGet to know Andi Bernadee here:\nFB: https://www.fb.com/andibernadee2015/\nInstagram: https://instagr.am/andibernadee/\n\nGet to know Ismail Izzani here:\nInstagram: https://instagr.am/ismailizzani_/\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu?\n\nVerse (Andi)\nEy, Hello?\nAngkat telefon mu\nJawab panggilan nya\nCepat kau bangun\nKan dah lambat\nJangan kau tunggu\n\nDeringan bunyi kau masih leka\nKau perlu dia seumur hidup mu\nWalau kau tak tahu\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu?\n\nVerse\nIsmail hmm hmm\nHey! Engkau tunggu\nHello hello hello\nManakah kamu?\nKan ku dah bilang dah\nJangan kau hilang\nYeah yeah yeah\n\nAku dah cakap dah ku takkan hilang\nKalau engkau redah kita kan senang\nJanji dia tahu\nKerna kau jauh\nWalau kau tak tahu\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu?\n\nBridge\nHancur aku tanpa kamu\nHidup suram tanpa dirimu\nKembalikan rasa itu\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/ryUcuJX2NPM/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/ryUcuJX2NPM/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/ryUcuJX2NPM/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/ryUcuJX2NPM/sddefault.jpg", "width": 640, "height": 480 } }, "channelTitle": "Warner Music Malaysia", "tags": ["Official music video", "music video", "video", "andi", "bernadee", "andi bernadee", "ismail", "izzani", "hello", "ismail izzani", "abii", "helloabii", "hello abii", "world peace entertainment", "and bernadee", "hello andi bernadi", "hello ismail izzani", "bengkoang reaction", "hello andi ismail", "andi bernadee ismail izzani", "abiiversion", "abii version", "malaysia song", "lagu malaysia"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Andi Bernadee & Ismail Izzani - Hello (Andi Version | Official Music Video)", "description": "Andi Bernadee & Ismail Izzani - Hello [Andi Version | Official Music Video]\n\nLepas korang tengok muzik video 🎥 ni mesti korang nak tau siapa pembunuhnya 🔪 kan? Tengoklah ni: https://youtu.be/hYq4dNUQk_8\n\nDownload RBT now! \nMaxis Caller Ringtones: Dial *131*645703# and press CALL/SEND \nCelcom Call Me Tones: Dial *323*323602# and press CALL/SEND \nDiGi Caller Tunes: Dial *233*1815541# and press CALL/SEND\n\nListen to Andi Bernadee & Ismail Izzani here: https://wmm.lnk.to/HelloAbii\n\n#HelloABII #AndiBernadee\n\nComposer: Mas Dewangga, Firdaus Rahmat, Ismail Izzani\nLyrics: Mas Dewangga, Firdaus Rahmat, Ismail Izzani\nProducer: World Peace Entertainment\n\nGet to know Andi Bernadee here:\nFB: https://www.fb.com/andibernadee2015/\nInstagram: https://instagr.am/andibernadee/\n\nGet to know Ismail Izzani here:\nInstagram: https://instagr.am/ismailizzani_/\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu?\n\nVerse (Andi)\nEy, Hello?\nAngkat telefon mu\nJawab panggilan nya\nCepat kau bangun\nKan dah lambat\nJangan kau tunggu\n\nDeringan bunyi kau masih leka\nKau perlu dia seumur hidup mu\nWalau kau tak tahu\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu?\n\nVerse\nIsmail hmm hmm\nHey! Engkau tunggu\nHello hello hello\nManakah kamu?\nKan ku dah bilang dah\nJangan kau hilang\nYeah yeah yeah\n\nAku dah cakap dah ku takkan hilang\nKalau engkau redah kita kan senang\nJanji dia tahu\nKerna kau jauh\nWalau kau tak tahu\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu?\n\nBridge\nHancur aku tanpa kamu\nHidup suram tanpa dirimu\nKembalikan rasa itu\n\nChorus\nBenarkah? Kalau engkau hilang kau masih mencari nya\nTak pernah engkau lupa yang kau masih bersamanya\nBenarkah? Jika siang malam itu milik kamu\nSiapa dia bagi mu" } }, "contentDetails": { "duration": "PT3M40S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/ujcVVFcDWWWCkEBrOqQC2c6r5tM\"", "id": "0hGGaVCCqPk", "snippet": { "publishedAt": "2019-12-10T00:15:00.000Z", "channelId": "UCnhEWYj8kzM9LA0X-or4-tg", "title": "#Video - #Rap Song - हैलो कौन - #Ritesh Pandey,Sneh Upadhya - Hello Koun - New Bhojpuri Song 2019", "description": "Subscribe Now :-  https://goo.gl/cz3dFz\n\nIf you like Bhojpuri song, Bhojpuri Bhakti Songs and Bhojpuri Movie Songs, Subscribe Now :- https://goo.gl/cz3dFz\n\nDownload Khati Bhojpuriya official app from Google Play Store - https://goo.gl/LZaGi9\n\nVisit our website to download our songs and videos :- http://www.riddhientertainment.com\n\nLike Us On Facebook :- https://www.facebook.com/Riddhi-Entertainment-474350672959803/\n\n\nSong :- Hello Koun \nSinger :-  #Ritesh Pandey , Sneh Updhayaya  \nLyrics :- Ashish Verma  \nMusic Director :- Ashish Verma  \nArranger :- Ashish Verma , Kailash Pandey\nDirector :- Sonu Verma,Ashish Yadav\nCamera :- Santosh Yadav\nManaged By :- Mars Entertainment \nCompany/ Label :- Riddhi Music World\n\nFor Enquiry  Mr, Rohit Pandey :- +919336033299,9934776607\n\nSET YOUR CALLER TUNE\nFor Airtel: Dial 5432117309112 , 5432117309394 OR 5432117309113 and follow instructions\nFor Vodafone: Dial 53711772797  , 53711772737  OR 53711772674 and follow instructions\nFor Idea: Dial 53711772797  , 53711772737  OR 53711772674 and follow instructions\nFor BSNL Dial 11772797  , 11772737 OR 11772674  and follow instructions\n\nGaana - https://bit.ly/36ywVm0\nJioSaavn - \niTunes - \nApple Music - \n\nGoogle Play - \n\nSpotify - \n\n\n\nRitesh Pandey New Song\nRitesh Pandey New Gana\nRitesh Pandey Ka Naya Gana\nHello Kaun Rap Song Ritesh Pandey\nHello Kaun \nNahi Janti\nAre Baba Nahi Janti\nTik Tok Trending Song Hello Kaun\n2020 New Rap Song\nRitesh Pandey New Song 2020\nritesh pandey new song hello kaun\nHello Koun,Ritesh Pandey,Sneh Updhayaya,ritesh pandey ka gana,ritesh pandey bhojpuri song,ritesh pandey bhojpuri gana,ritesh pandey rap song,ritesh pandey ka bhojpuri gana,ritesh pandey new song 2019,ritesh pandey new song dj,ritesh pandey dhobi geet,bhojpuri rap song,bhojpuri rap song dj,bhojpuri rap song video,sneh upadhya song bhojpuri,hello koun ritesh pandey,Riddhi Music World,bhojpuri songs new,bhojpuri new song 2019\nHello Kaun (हैलो कौन) Ritesh Panday New Bhojpuri Video Song 2020 Hello Bolo Kaun\nritesh pandey, song, ritesh pandey song 2019 dj, ritesh pandey ka new bhojpuri gana, new bhojpuri dj,song, ankush raja bhojpuri song, bhojpuri song 2019 dj, Tik Tok पे धूम मचाने वाला गाना, tik tok bhojpuri song status, हेलो कौन, Hello Kaun, Hello Kaun\nritesh pandey tik tok populor song,hello kaun tiktok video ritesh pandey,\nritesh pandey tik tok video\nRitesh Pandey Bhojpuri Tik Tok Video | Bhojpuri Tik Tok", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/0hGGaVCCqPk/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/0hGGaVCCqPk/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/0hGGaVCCqPk/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/0hGGaVCCqPk/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/0hGGaVCCqPk/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Riddhi Music World", "tags": ["Hello Koun", "Ritesh Pandey", "Sneh Updhayaya", "ritesh pandey ka gana", "ritesh pandey bhojpuri song", "ritesh pandey bhojpuri gana", "ritesh pandey rap song", "ritesh pandey ka bhojpuri gana", "ritesh pandey new song 2019", "ritesh pandey new song dj", "ritesh pandey dhobi geet", "bhojpuri rap song", "bhojpuri rap song dj", "bhojpuri rap song video", "sneh upadhya song bhojpuri", "hello koun ritesh pandey", "Riddhi Music World", "bhojpuri songs new", "bhojpuri new song 2019"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "#Video - #Rap Song - हैलो कौन - #Ritesh Pandey,Sneh Upadhya - Hello Koun - New Bhojpuri Song 2019", "description": "Subscribe Now :-  https://goo.gl/cz3dFz\n\nIf you like Bhojpuri song, Bhojpuri Bhakti Songs and Bhojpuri Movie Songs, Subscribe Now :- https://goo.gl/cz3dFz\n\nDownload Khati Bhojpuriya official app from Google Play Store - https://goo.gl/LZaGi9\n\nVisit our website to download our songs and videos :- http://www.riddhientertainment.com\n\nLike Us On Facebook :- https://www.facebook.com/Riddhi-Entertainment-474350672959803/\n\n\nSong :- Hello Koun \nSinger :-  #Ritesh Pandey , Sneh Updhayaya  \nLyrics :- Ashish Verma  \nMusic Director :- Ashish Verma  \nArranger :- Ashish Verma , Kailash Pandey\nDirector :- Sonu Verma,Ashish Yadav\nCamera :- Santosh Yadav\nManaged By :- Mars Entertainment \nCompany/ Label :- Riddhi Music World\n\nFor Enquiry  Mr, Rohit Pandey :- +919336033299,9934776607\n\nSET YOUR CALLER TUNE\nFor Airtel: Dial 5432117309112 , 5432117309394 OR 5432117309113 and follow instructions\nFor Vodafone: Dial 53711772797  , 53711772737  OR 53711772674 and follow instructions\nFor Idea: Dial 53711772797  , 53711772737  OR 53711772674 and follow instructions\nFor BSNL Dial 11772797  , 11772737 OR 11772674  and follow instructions\n\nGaana - https://bit.ly/36ywVm0\nJioSaavn - \niTunes - \nApple Music - \n\nGoogle Play - \n\nSpotify - \n\n\n\nRitesh Pandey New Song\nRitesh Pandey New Gana\nRitesh Pandey Ka Naya Gana\nHello Kaun Rap Song Ritesh Pandey\nHello Kaun \nNahi Janti\nAre Baba Nahi Janti\nTik Tok Trending Song Hello Kaun\n2020 New Rap Song\nRitesh Pandey New Song 2020\nritesh pandey new song hello kaun\nHello Koun,Ritesh Pandey,Sneh Updhayaya,ritesh pandey ka gana,ritesh pandey bhojpuri song,ritesh pandey bhojpuri gana,ritesh pandey rap song,ritesh pandey ka bhojpuri gana,ritesh pandey new song 2019,ritesh pandey new song dj,ritesh pandey dhobi geet,bhojpuri rap song,bhojpuri rap song dj,bhojpuri rap song video,sneh upadhya song bhojpuri,hello koun ritesh pandey,Riddhi Music World,bhojpuri songs new,bhojpuri new song 2019\nHello Kaun (हैलो कौन) Ritesh Panday New Bhojpuri Video Song 2020 Hello Bolo Kaun\nritesh pandey, song, ritesh pandey song 2019 dj, ritesh pandey ka new bhojpuri gana, new bhojpuri dj,song, ankush raja bhojpuri song, bhojpuri song 2019 dj, Tik Tok पे धूम मचाने वाला गाना, tik tok bhojpuri song status, हेलो कौन, Hello Kaun, Hello Kaun\nritesh pandey tik tok populor song,hello kaun tiktok video ritesh pandey,\nritesh pandey tik tok video\nRitesh Pandey Bhojpuri Tik Tok Video | Bhojpuri Tik Tok" } }, "contentDetails": { "duration": "PT3M4S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/C-9uWeNya6MQu2o_YJeywcAhSEA\"", "id": "b_ILDFp5DGA", "snippet": { "publishedAt": "2009-07-08T17:47:55.000Z", "channelId": "UCJFlb1_V3m_5lelZGiSEyCw", "title": "Hello by Lionel Richie", "description": "The music video for Lionel Richie's \"Hello\" directed by Bob Giraldi, attracts attention as it tells the story of  a music teacher (played by Lionel Richie) who falls in love with his blind student.", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/b_ILDFp5DGA/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/b_ILDFp5DGA/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/b_ILDFp5DGA/hqdefault.jpg", "width": 480, "height": 360 } }, "channelTitle": "Giraldi Media", "tags": ["bob giraldi", "hello", "lionel richie"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Hello by Lionel Richie", "description": "The music video for Lionel Richie's \"Hello\" directed by Bob Giraldi, attracts attention as it tells the story of  a music teacher (played by Lionel Richie) who falls in love with his blind student." } }, "contentDetails": { "duration": "PT5M29S", "dimension": "2d", "definition": "sd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/lrUzm743eVXTCwH_YyIWBpgK_To\"", "id": "XceIVDzx9Og", "snippet": { "publishedAt": "2020-01-31T16:19:21.000Z", "channelId": "UCu5scQrLeUicTKWKGfU1zMQ", "title": "Hello (Official Audio) | Kabza de Small, Dj Maphorisa", "description": "EXCLUSIVE: Hello - Amapiano 2020\n\nAmapiano 2020 Music For Amapiano Dance Moves\n\nMusic By:\n- Hello (Official Audio) | Kabza de Small, Dj Maphorisa\n- \"We Love Amapiano\" by Bombostone & Rekords\n  Link: https://youtu.be/ujx2WJGu2fQ \n\nUpcoming Videos\n- Try Not To Laugh, Have Funny With I'm Leaving Satafrika/South Africa Featuring Amapiano 2019, For Me & Skeem Saam\n- Amapiano Dance Tutorial | Pouncing Cat & Shi Shi | Dance4Dezemba\n- Amapiano Lifestyle | Easy Step By Step Tutorial On How To Dance\n- Amapiano Hits ft Kabza De Small, Cassper Nyovest, Tallarsetee, Killer Kau, De Mthuda & Njelic, DJ Maphorisa, Vigro Deep & many more\n- Amapiano & House PlayList | South Africa YouTuber\n\nPrevious Videos\n- Hamba NoMaphorisa (Original Video) | Ke Dezemba Bosso Amapiano 2019\n- Phoyisa (Official Audio) | Kabza De Small, DJ Maphorisa, Cassper Nyovest, Qwestakufet\n- Labantwana Ama Uber | Clean Cover Video By Nathal Blur\n- White South Africans Dancing To Amapiano Songs | Dance Moves ft Labantwana Ama Uber\n- Best Singalong Amapiano PlayList South Africa 2019 | ft Akulaleki Acapella By Samthing Soweto\n- Roland Muchengwa Living It Up In South Africa also called Ronald Muchengwa\n- Best Amapiano Dance Moves 2019 Part 2 | Party Time ft Labantwana ma Uber\n- Kokota Piano - Sunday Service Remix ft Pastor Kokota\n\nIf You Wish To Contribute Or Contact Us You Can Email Us: unofficiallytrendinglive@gmail.com\n\nThank You For Watching, DON'T FORGET TO LIKE, SHARE & SUBSCRIBE FOR MORE\n\nDisclaimer:\n==========\nCopyright Disclaimer under Section 107 of the Copyright Act 1976, allowance is made for \"fair use\" for purposes such as criticism, comment, news reporting, teaching, scholarship, and research. Fair use is a use permitted by copyright statute that might otherwise be infringing. Non-profit, educational or personal use tips the balance in favor of fair use. ALL RIGHTS BELONG TO THEIR RESPECTIVE OWNERS\n\n#Amapiano #Amapiano2020 #SkeemSaam #AmaUberChallenge #AmapianoDanceMoves #UnofficiallyTrending\n\nTag ID: YUdG786GkHFn7665B7T98gH9MjjkEPoSD", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/XceIVDzx9Og/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/XceIVDzx9Og/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/XceIVDzx9Og/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/XceIVDzx9Og/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/XceIVDzx9Og/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Unofficially Trending", "tags": ["#Amapiano", "#Emcimbini #DJMaphorisa", "#KabzaDeSmall", "#SamthingSoweto", "#PhakathiInside", "#Hello", "#Amapiano2020", "#SkeemSaam", "#AmaUberChallenge", "#AmapianoDanceMoves", "#UnofficiallyTrending"], "categoryId": "24", "liveBroadcastContent": "none", "localized": { "title": "Hello (Official Audio) | Kabza de Small, Dj Maphorisa", "description": "EXCLUSIVE: Hello - Amapiano 2020\n\nAmapiano 2020 Music For Amapiano Dance Moves\n\nMusic By:\n- Hello (Official Audio) | Kabza de Small, Dj Maphorisa\n- \"We Love Amapiano\" by Bombostone & Rekords\n  Link: https://youtu.be/ujx2WJGu2fQ \n\nUpcoming Videos\n- Try Not To Laugh, Have Funny With I'm Leaving Satafrika/South Africa Featuring Amapiano 2019, For Me & Skeem Saam\n- Amapiano Dance Tutorial | Pouncing Cat & Shi Shi | Dance4Dezemba\n- Amapiano Lifestyle | Easy Step By Step Tutorial On How To Dance\n- Amapiano Hits ft Kabza De Small, Cassper Nyovest, Tallarsetee, Killer Kau, De Mthuda & Njelic, DJ Maphorisa, Vigro Deep & many more\n- Amapiano & House PlayList | South Africa YouTuber\n\nPrevious Videos\n- Hamba NoMaphorisa (Original Video) | Ke Dezemba Bosso Amapiano 2019\n- Phoyisa (Official Audio) | Kabza De Small, DJ Maphorisa, Cassper Nyovest, Qwestakufet\n- Labantwana Ama Uber | Clean Cover Video By Nathal Blur\n- White South Africans Dancing To Amapiano Songs | Dance Moves ft Labantwana Ama Uber\n- Best Singalong Amapiano PlayList South Africa 2019 | ft Akulaleki Acapella By Samthing Soweto\n- Roland Muchengwa Living It Up In South Africa also called Ronald Muchengwa\n- Best Amapiano Dance Moves 2019 Part 2 | Party Time ft Labantwana ma Uber\n- Kokota Piano - Sunday Service Remix ft Pastor Kokota\n\nIf You Wish To Contribute Or Contact Us You Can Email Us: unofficiallytrendinglive@gmail.com\n\nThank You For Watching, DON'T FORGET TO LIKE, SHARE & SUBSCRIBE FOR MORE\n\nDisclaimer:\n==========\nCopyright Disclaimer under Section 107 of the Copyright Act 1976, allowance is made for \"fair use\" for purposes such as criticism, comment, news reporting, teaching, scholarship, and research. Fair use is a use permitted by copyright statute that might otherwise be infringing. Non-profit, educational or personal use tips the balance in favor of fair use. ALL RIGHTS BELONG TO THEIR RESPECTIVE OWNERS\n\n#Amapiano #Amapiano2020 #SkeemSaam #AmaUberChallenge #AmapianoDanceMoves #UnofficiallyTrending\n\nTag ID: YUdG786GkHFn7665B7T98gH9MjjkEPoSD" } }, "contentDetails": { "duration": "PT11M55S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/HtmTtffGQattJ1SaxiqlE8nc4oo\"", "id": "qqLtPbEmbJs", "snippet": { "publishedAt": "2015-11-07T00:10:08.000Z", "channelId": "UCO_qv5faVlp8dq9hQ82qHUQ", "title": "Noel Kharman-Hello-Adele/Fairouz كيفك انت - فيروز(Mashup)", "description": "English/Arabic(Mashup).\n\nRecorded, production, and film by Philip Halloun.\n\n\nFacebook ►  https://www.facebook.com/NoelKharman1\n\nInstagram ►  https://Instagram.com/Noel_Kharman/\n\nTwitter ► https://Twitter.com/NoelKharman1", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/qqLtPbEmbJs/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/qqLtPbEmbJs/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/qqLtPbEmbJs/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/qqLtPbEmbJs/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/qqLtPbEmbJs/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Noel Kharman", "tags": ["Fairuz (Musical Artist)", "Kifak Inta (Musical Album)", "Adele (Celebrity)", "Arabic Music (Musical Genre)", "Mashup (Media Genre)", "Hello", "Remix", "Mix", "Fairouz", "Adele", "Noel Kharman", "نويل خرمان", "hello adele", "noel kharman hello", "hello كيفك انت"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Noel Kharman-Hello-Adele/Fairouz كيفك انت - فيروز(Mashup)", "description": "English/Arabic(Mashup).\n\nRecorded, production, and film by Philip Halloun.\n\n\nFacebook ►  https://www.facebook.com/NoelKharman1\n\nInstagram ►  https://Instagram.com/Noel_Kharman/\n\nTwitter ► https://Twitter.com/NoelKharman1" } }, "contentDetails": { "duration": "PT4M11S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/ixn35P9AVa_vL0eKMpY1IBRMcyc\"", "id": "a9vSlRVcfdQ", "snippet": { "publishedAt": "2019-08-01T07:00:01.000Z", "channelId": "UCS94J1s6-qc8v7btCdS2pNg", "title": "Stacy and Dad try to be friends with Hello Neighbor", "description": "Stacy and dad play ball and he gets into the house to a neighbor. Terrible neighbor takes the ball itself and now you need to return it back.\nSubscribe to Like Nastya Vlog - https://is.gd/gdv8uX\nINSTAGRAM https://www.instagram.com/like_nastya_vlog/", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/a9vSlRVcfdQ/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/a9vSlRVcfdQ/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/a9vSlRVcfdQ/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/a9vSlRVcfdQ/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/a9vSlRVcfdQ/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Like Nastya Show", "tags": ["hello neighbor", "pretend", "play", "hello neighbor in real life", "kid friendly", "stacy and dad", "stacy", "stacy toys"], "categoryId": "24", "liveBroadcastContent": "none", "localized": { "title": "Stacy and Dad try to be friends with Hello Neighbor", "description": "Stacy and dad play ball and he gets into the house to a neighbor. Terrible neighbor takes the ball itself and now you need to return it back.\nSubscribe to Like Nastya Vlog - https://is.gd/gdv8uX\nINSTAGRAM https://www.instagram.com/like_nastya_vlog/" }, "defaultAudioLanguage": "en" }, "contentDetails": { "duration": "PT4M5S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/9boC-RDcMGcjutd7idznWLAi7jQ\"", "id": "8z-SB_KhKz8", "snippet": { "publishedAt": "2019-11-01T10:15:14.000Z", "channelId": "UCcfuEgaPqIBnbtpL-y2jFwQ", "title": "HELLO | FT. SAROJ & AASHMA | YOGESH KAJI / SARIKA GHIMIRE | OFFICIAL MUSIC VIDEO", "description": "HELLO\n\nVOCAL :\nYOGESH KAJI / SARIKA GHIMIRE\n\nARTIST :\nAASHMA BISWOKARMA / SAROJ ADHIKARI\n\nCOMPOSER / ARRANGE :\nAASHISH AVIRAL\n\nLYRICS :\nEK NAYARAN BHANDARI\n\nMIXING / MASTERING :\nHBN KISMAT\n\nSTUDIO :\nRAAGA RECORDING\n\nPRODUCTION :\nSURENDRA BASEL\n\nASST.DIRECTOR :\nSUBOL THAPA\n\nART :\nSAMBHU SHRESTHA\n\nCAMERA :\nBUDDHA THAPA\n\nEDIT / COLOR :\nNABIN NIRAULA\n\nDOP :\nARJUN TIWARI\n\nCHOREOGRAPHY / DIRECTION :\nGAMVIR BISTA\n\nFor business inquiries: thecartoonzcrewofficial@gmail.com\n\n© 2019 THE CARTOONZ CREW  PRODUCTION ALL RIGHTS RESERVED\n\nCopying, recording or reproducing any part of this video (audio and visual) in any other channels, without prior permission is strictly prohibited. Embedding to the websites is permitted.\nCategory\nEntertainment", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/8z-SB_KhKz8/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/8z-SB_KhKz8/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/8z-SB_KhKz8/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/8z-SB_KhKz8/sddefault.jpg", "width": 640, "height": 480 } }, "channelTitle": "The Cartoonz Crew", "tags": ["cartoonz crew", "cartoon crew", "aashma biswokarma", "saroj adhikari", "yogesh kaji", "sarika ghimire", "gamvir bista", "buddha lama", "arjun tiwari", "subol thapa", "cartoon crew jr", "nepali music video", "viral video 2019"], "categoryId": "24", "liveBroadcastContent": "none", "localized": { "title": "HELLO | FT. SAROJ & AASHMA | YOGESH KAJI / SARIKA GHIMIRE | OFFICIAL MUSIC VIDEO", "description": "HELLO\n\nVOCAL :\nYOGESH KAJI / SARIKA GHIMIRE\n\nARTIST :\nAASHMA BISWOKARMA / SAROJ ADHIKARI\n\nCOMPOSER / ARRANGE :\nAASHISH AVIRAL\n\nLYRICS :\nEK NAYARAN BHANDARI\n\nMIXING / MASTERING :\nHBN KISMAT\n\nSTUDIO :\nRAAGA RECORDING\n\nPRODUCTION :\nSURENDRA BASEL\n\nASST.DIRECTOR :\nSUBOL THAPA\n\nART :\nSAMBHU SHRESTHA\n\nCAMERA :\nBUDDHA THAPA\n\nEDIT / COLOR :\nNABIN NIRAULA\n\nDOP :\nARJUN TIWARI\n\nCHOREOGRAPHY / DIRECTION :\nGAMVIR BISTA\n\nFor business inquiries: thecartoonzcrewofficial@gmail.com\n\n© 2019 THE CARTOONZ CREW  PRODUCTION ALL RIGHTS RESERVED\n\nCopying, recording or reproducing any part of this video (audio and visual) in any other channels, without prior permission is strictly prohibited. Embedding to the websites is permitted.\nCategory\nEntertainment" } }, "contentDetails": { "duration": "PT5M53S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/-UayCM8WShumMNMmSUDPXcxp9ws\"", "id": "OmnDEUD9NyI", "snippet": { "publishedAt": "2015-12-23T00:30:56.000Z", "channelId": "UC43dsYekRpTwMCXCqQXzP7Q", "title": "Hello - Adele (Reggae Cover) - Conkarah and Rosie Delmah", "description": "INSTAGRAM: @CONKARAHMUSIC and @ROSIEDELMAH\n\n\nFACEBOOK: @CONKARAH and @ROSIEDELMAH\n\n\n\n\nTrack produced and mixed by: \n\nBaka Solomon\n\nInstagram: @baka_solomon_official\nFacebook: @BakaSolomonMusic", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/OmnDEUD9NyI/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/OmnDEUD9NyI/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/OmnDEUD9NyI/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/OmnDEUD9NyI/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/OmnDEUD9NyI/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Conkarah", "tags": ["reggae cover", "adele reggae", "adele reggae cover", "hello cover", "hello reggae", "hello reggae cover", "conkarah cover", "conkarah hello", "conkarah adele", "rosie delmah", "reggae", "hello reggae version"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Hello - Adele (Reggae Cover) - Conkarah and Rosie Delmah", "description": "INSTAGRAM: @CONKARAHMUSIC and @ROSIEDELMAH\n\n\nFACEBOOK: @CONKARAH and @ROSIEDELMAH\n\n\n\n\nTrack produced and mixed by: \n\nBaka Solomon\n\nInstagram: @baka_solomon_official\nFacebook: @BakaSolomonMusic" } }, "contentDetails": { "duration": "PT4M14S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/hNeVM_8XIvOZGbkl6-U5YHQLWPE\"", "id": "Tm-uAFGOAm8", "snippet": { "publishedAt": "2017-05-05T22:01:56.000Z", "channelId": "UCC-RHF_77zQdKcA75hr5oTQ", "title": "HELLO NEIGHBOR ALPHA 4! Simon Says Game? (Pt 1) Bendy Ink Machine in Basement? + FGTEEV Elevator 2.0", "description": "Mart, Duddy & Chase play a little \"Simon Says\" aka Neighbor Says as a pre-game warm up to Hello Neighbor Alpha 4.  Stay tuned, Part 2 coming up soon! :)  and Thumbs up for Bendy & The Ink Machine Trapped in Hello Neighbor and Party in the Elevator 2.0!\n\nBENDY in BIKINI BOTTOM Part 1-Storytime: \n👹BENDY & the Ink Krabby Patty Machine @ KRUSTY KRAB w/ Spongebob! Hello Neighbor gets Secret Formula?\nhttp://youtu.be/zqQcUCy6S6I\nPart 2-Gameplay:\n👹HELLO NEIGHBOR SPONGEBOB DEATHRUN vs. BENDY & THE INK MACHINE! Krusty Krab FNAF Jump Scares 4 FGTEEV\nhttp://youtu.be/PabgGzPoJD8\n\n👹EVIL MICKEY MOUSE!??! BENDY & THE INK MACHINE: Chapter 1 😱 FGTEEV 2 Scary Kids Gameplay Jump Scares\nhttp://youtu.be/UFVqKJeSUPA\n\n👹DON'T SCARE MY BABY! Bendy and the Ink Machine #2 CHAPTER TWO (FGTEEV plays SCARY MICKEY MOUSE Game)\nhttp://youtu.be/OKprortusv4\n\n👹DAD CAPTURED! Bendy and the Ink Machine #3 Haunts Our House FGTEEV Chapter 2 Boss 👹 SCARY Kids Game\nhttp://youtu.be/aAIHirYyUfA\n\n👹BENDY & THE INK MACHINE GUNS vs. HELLO NEIGHBOR, FGTEEV, AMAZING FROG, TATTLETAIL & FNAF Garry's Mod\nhttp://youtu.be/6LoNaM9zYJc\n\nHello Neighbor FGTEEV Videos:\nMINECRAFT HELLO NEIGHBOR\n💣HELLO NEIGHBOR MINECRAFT IMPOSTER!  FGTEEV Chase Plays! (Mod Map of Horror Adventure w/ ZOMBIE)\nhttp://youtu.be/7bxK6Y5qy9s\n💣MINECRAFT HELLO NEIGHBOR & HIS BROTHER FIGHT 4 Basement Key! (FGTEEV Roleplay #2) \nhttp://youtu.be/Ez1u9auDNqQ\n💣HE LOVES MILK!? HELLO NEIGHBOR MOD 4 MINECRAFT! Chase plays Alpha 3 House Showcase FGTEEV Randomness (#3)\nhttp://youtu.be/qqMSsnaL0Uc\n💣HELLO NEIGHBOR MINECRAFT ROBBERY GROCERY STORE! Kid Steals Money & Food (FGTEEV Vending Machines Mod\nhttp://youtu.be/kJ9OSxTZZOg\n💣BURNING HELLO NEIGHBOR MINECRAFT CHALLENGE! FGTEEV Duddy vs. Chase Firey Structures Batman Mini-Game\nhttp://youtu.be/Z1mnBwDJJ6w\n\n💀 1st Game (Pre-Alpha) 💀\nHELLO NEIGHBOR! Scary BASEMENT Mystery Game!  His Secret? Water Bottle Flip Addiction? (FGTEEV Fun) http://youtu.be/kUZZjhOMgOg\n\n💀 2nd Game (Alpha 1) 💀\n💣Part 1: HELLO NEIGHBOR, CAN WE PARTY IN YOUR ELEVATOR? Scary FNAF Theme Park House? (FGTEEV Part 4 Alpha 1) http://youtu.be/lcA0SVkNtH0\n💣Part 2: HELLO NEIGHBOR, WE FROZE YOUR SHARK! Secret Coffin! FGTEEV Part 5: Entering Basement of Alpha 1\nhttp://youtu.be/C7uNm49RqO8\n\n💀 3rd Game (Alpha 2) 💀\n💣Part 1: WE SCARED OUR BLIND NEIGHBOR!? FGTEEV Scary Hello Neighbor Kids Horror Game Part 2 (Alpha 2 Update)\nhttp://youtu.be/la4hOjqR490\n💣Part 2: SANTA CLAUS ROBS HIS SLEEPY NEIGHBOR & Enters His Basement! (FGTEEV Hello Neighbor Part 3 w/ GUN)\nhttp://youtu.be/FIVOhxGpq3M\n\n💀 4th Game (Alpha 3) 💀\n💣GOODBYE HELLO NEIGHBOR!! HORRIBLE Alpha 3 UPDATE? GLUE SMASHING + KEY Gameplay! (FGTEEV Part 7)\nhttp://youtu.be/L26RpQcVXMY\n💣ALPHA 3 FINALE: HELLO NEIGHBOR IN REAL LIFE! (ALPHA 3 Basement) Cry Baby in ALPHA 3 Basement + His Name Revealed? (FGTEEV Part 8) http://youtu.be/CbvEggGSMGI\n💣HELLO NEIGHBOR vs. ME! BASEMENT RACE CHALLENGE Gaming IRL! Alpha 3 SECRETS REVEALED? (FGTEEV Part 9)\nhttp://youtu.be/7bxK6Y5qy9s\n💣HELLO NEIGHBOR TRICKS w/ FGTEEV CHASE! Pre-Alpha, 2, & 3 Random Tips! (KIDS Gaming)\nhttp://youtu.be/flZPplsLwLg\n\nHello Neighbor Song:\n💣FGTEEV SONGS of 2016 YOUTUBE REWIND #1 (Songs for KIds w/ Games FNAF MINECRAFT POKEMON AMAZING FROG)\nhttp://youtu.be/uXql4FLGYm0\n💣FGTEEV SONGS 2016 #2 w/ LEGO BatMan (Songs for Kids ROBLOX POKEMON SLITHER.IO Games YOUTUBE REWIND)\nhttp://youtu.be/RjxcES_Uob0\n\n==================================\nBeba Ba Leep Bop Beleeda Bop Pllllhhh!\nSubscribe: http://bit.ly/1KKE2f1\n📺Family Friendly Youtube Gaming Channel, FGTEEV:\nhttp://www.youtube.com/fgteev\n📺Skylander Boy and Girl Channel: http://www.youtube.com/theskylanderboyandgirl\n📺Our Family/Vlog channel, FUNNEL VISION:\nhttp://www.youtube.com/c/FVFAMILY\n📺Our Toy Channel: DOH MUCH FUN:\nhttp://www.youtube.com/DOHMUCHFUN2\n\n►Instagram: http://instagram.com/funnelvisionfam\n►Facebook: http://www.facebook.com/SkylanderKids\n►T-Shirts: http://bit.ly/FUNNELMERCH\n►Twitter: http://twitter.com/funnelvisionfam\n\nABOUT FGTEEV:\nFGTeeV is a Family Friendly Gaming Channel for all ages to enjoy but primarily focused to the family audience.  Dad is known as FGTEEV Duddy & Mom, well, we call here whatever but sometimes it's Moomy.  They have 4 children, Chase, Mike & Lex from Skylander Boy and Girl and their newest family addition, Shawn who participates in videos too!  We play all sorts of games, never anything rated Mature. All gameplays have clean language and good family friendly fun on all major games like Hello Neighbor, Draw a Stickman, Amazing Frog, Splatoon, Super Mario Bros., Lego Dimensions, Minecraft w/ Mods, Roblox, Disney Infinity (Inside Out, Marvel Battlegrounds, Star Wars, Spiderman, Avengers, Zootopia, Disney Frozen & more), Plants vs. Zombies 2, FNAF/Five Nights at Freddy's, PVZ Garden Warfare, Amiibo Games, Pokemon Go and more. \n\n===============\n\nLEGAL DISCLAIMER: Royalty Free Music & Content by audiomicro.com epidemicsound.com videoblocks.com", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/Tm-uAFGOAm8/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/Tm-uAFGOAm8/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/Tm-uAFGOAm8/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/Tm-uAFGOAm8/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/Tm-uAFGOAm8/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "FGTeeV", "tags": ["games for kids", "fgteev", "minecraft gameplay", "fgteev minecraft", "Family Gaming", "youtube kids", "gameplay skit", "funny videos", "family friendly videos", "kids gaming", "simons says", "bendy and the ink machine", "fgteev hello neighbor alpha 4", "alpha 4 basement", "alpha 4 secrets", "alpha 4 train", "hello neighbor train ride", "bendy ink machine guns", "party in the elevator", "hello neighbor mini-game", "fgteev hello neighbor", "hello neighbor fgteev", "fgteev bendy", "fgteev bendy and the ink machine"], "categoryId": "20", "liveBroadcastContent": "none", "defaultLanguage": "en", "localized": { "title": "HELLO NEIGHBOR ALPHA 4! Simon Says Game? (Pt 1) Bendy Ink Machine in Basement? + FGTEEV Elevator 2.0", "description": "Mart, Duddy & Chase play a little \"Simon Says\" aka Neighbor Says as a pre-game warm up to Hello Neighbor Alpha 4.  Stay tuned, Part 2 coming up soon! :)  and Thumbs up for Bendy & The Ink Machine Trapped in Hello Neighbor and Party in the Elevator 2.0!\n\nBENDY in BIKINI BOTTOM Part 1-Storytime: \n👹BENDY & the Ink Krabby Patty Machine @ KRUSTY KRAB w/ Spongebob! Hello Neighbor gets Secret Formula?\nhttp://youtu.be/zqQcUCy6S6I\nPart 2-Gameplay:\n👹HELLO NEIGHBOR SPONGEBOB DEATHRUN vs. BENDY & THE INK MACHINE! Krusty Krab FNAF Jump Scares 4 FGTEEV\nhttp://youtu.be/PabgGzPoJD8\n\n👹EVIL MICKEY MOUSE!??! BENDY & THE INK MACHINE: Chapter 1 😱 FGTEEV 2 Scary Kids Gameplay Jump Scares\nhttp://youtu.be/UFVqKJeSUPA\n\n👹DON'T SCARE MY BABY! Bendy and the Ink Machine #2 CHAPTER TWO (FGTEEV plays SCARY MICKEY MOUSE Game)\nhttp://youtu.be/OKprortusv4\n\n👹DAD CAPTURED! Bendy and the Ink Machine #3 Haunts Our House FGTEEV Chapter 2 Boss 👹 SCARY Kids Game\nhttp://youtu.be/aAIHirYyUfA\n\n👹BENDY & THE INK MACHINE GUNS vs. HELLO NEIGHBOR, FGTEEV, AMAZING FROG, TATTLETAIL & FNAF Garry's Mod\nhttp://youtu.be/6LoNaM9zYJc\n\nHello Neighbor FGTEEV Videos:\nMINECRAFT HELLO NEIGHBOR\n💣HELLO NEIGHBOR MINECRAFT IMPOSTER!  FGTEEV Chase Plays! (Mod Map of Horror Adventure w/ ZOMBIE)\nhttp://youtu.be/7bxK6Y5qy9s\n💣MINECRAFT HELLO NEIGHBOR & HIS BROTHER FIGHT 4 Basement Key! (FGTEEV Roleplay #2) \nhttp://youtu.be/Ez1u9auDNqQ\n💣HE LOVES MILK!? HELLO NEIGHBOR MOD 4 MINECRAFT! Chase plays Alpha 3 House Showcase FGTEEV Randomness (#3)\nhttp://youtu.be/qqMSsnaL0Uc\n💣HELLO NEIGHBOR MINECRAFT ROBBERY GROCERY STORE! Kid Steals Money & Food (FGTEEV Vending Machines Mod\nhttp://youtu.be/kJ9OSxTZZOg\n💣BURNING HELLO NEIGHBOR MINECRAFT CHALLENGE! FGTEEV Duddy vs. Chase Firey Structures Batman Mini-Game\nhttp://youtu.be/Z1mnBwDJJ6w\n\n💀 1st Game (Pre-Alpha) 💀\nHELLO NEIGHBOR! Scary BASEMENT Mystery Game!  His Secret? Water Bottle Flip Addiction? (FGTEEV Fun) http://youtu.be/kUZZjhOMgOg\n\n💀 2nd Game (Alpha 1) 💀\n💣Part 1: HELLO NEIGHBOR, CAN WE PARTY IN YOUR ELEVATOR? Scary FNAF Theme Park House? (FGTEEV Part 4 Alpha 1) http://youtu.be/lcA0SVkNtH0\n💣Part 2: HELLO NEIGHBOR, WE FROZE YOUR SHARK! Secret Coffin! FGTEEV Part 5: Entering Basement of Alpha 1\nhttp://youtu.be/C7uNm49RqO8\n\n💀 3rd Game (Alpha 2) 💀\n💣Part 1: WE SCARED OUR BLIND NEIGHBOR!? FGTEEV Scary Hello Neighbor Kids Horror Game Part 2 (Alpha 2 Update)\nhttp://youtu.be/la4hOjqR490\n💣Part 2: SANTA CLAUS ROBS HIS SLEEPY NEIGHBOR & Enters His Basement! (FGTEEV Hello Neighbor Part 3 w/ GUN)\nhttp://youtu.be/FIVOhxGpq3M\n\n💀 4th Game (Alpha 3) 💀\n💣GOODBYE HELLO NEIGHBOR!! HORRIBLE Alpha 3 UPDATE? GLUE SMASHING + KEY Gameplay! (FGTEEV Part 7)\nhttp://youtu.be/L26RpQcVXMY\n💣ALPHA 3 FINALE: HELLO NEIGHBOR IN REAL LIFE! (ALPHA 3 Basement) Cry Baby in ALPHA 3 Basement + His Name Revealed? (FGTEEV Part 8) http://youtu.be/CbvEggGSMGI\n💣HELLO NEIGHBOR vs. ME! BASEMENT RACE CHALLENGE Gaming IRL! Alpha 3 SECRETS REVEALED? (FGTEEV Part 9)\nhttp://youtu.be/7bxK6Y5qy9s\n💣HELLO NEIGHBOR TRICKS w/ FGTEEV CHASE! Pre-Alpha, 2, & 3 Random Tips! (KIDS Gaming)\nhttp://youtu.be/flZPplsLwLg\n\nHello Neighbor Song:\n💣FGTEEV SONGS of 2016 YOUTUBE REWIND #1 (Songs for KIds w/ Games FNAF MINECRAFT POKEMON AMAZING FROG)\nhttp://youtu.be/uXql4FLGYm0\n💣FGTEEV SONGS 2016 #2 w/ LEGO BatMan (Songs for Kids ROBLOX POKEMON SLITHER.IO Games YOUTUBE REWIND)\nhttp://youtu.be/RjxcES_Uob0\n\n==================================\nBeba Ba Leep Bop Beleeda Bop Pllllhhh!\nSubscribe: http://bit.ly/1KKE2f1\n📺Family Friendly Youtube Gaming Channel, FGTEEV:\nhttp://www.youtube.com/fgteev\n📺Skylander Boy and Girl Channel: http://www.youtube.com/theskylanderboyandgirl\n📺Our Family/Vlog channel, FUNNEL VISION:\nhttp://www.youtube.com/c/FVFAMILY\n📺Our Toy Channel: DOH MUCH FUN:\nhttp://www.youtube.com/DOHMUCHFUN2\n\n►Instagram: http://instagram.com/funnelvisionfam\n►Facebook: http://www.facebook.com/SkylanderKids\n►T-Shirts: http://bit.ly/FUNNELMERCH\n►Twitter: http://twitter.com/funnelvisionfam\n\nABOUT FGTEEV:\nFGTeeV is a Family Friendly Gaming Channel for all ages to enjoy but primarily focused to the family audience.  Dad is known as FGTEEV Duddy & Mom, well, we call here whatever but sometimes it's Moomy.  They have 4 children, Chase, Mike & Lex from Skylander Boy and Girl and their newest family addition, Shawn who participates in videos too!  We play all sorts of games, never anything rated Mature. All gameplays have clean language and good family friendly fun on all major games like Hello Neighbor, Draw a Stickman, Amazing Frog, Splatoon, Super Mario Bros., Lego Dimensions, Minecraft w/ Mods, Roblox, Disney Infinity (Inside Out, Marvel Battlegrounds, Star Wars, Spiderman, Avengers, Zootopia, Disney Frozen & more), Plants vs. Zombies 2, FNAF/Five Nights at Freddy's, PVZ Garden Warfare, Amiibo Games, Pokemon Go and more. \n\n===============\n\nLEGAL DISCLAIMER: Royalty Free Music & Content by audiomicro.com epidemicsound.com videoblocks.com" }, "defaultAudioLanguage": "en" }, "contentDetails": { "duration": "PT27M9S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/TRFnb1mDh-hzvgB-3iqi2-3hLzc\"", "id": "KpCH8g56G84", "snippet": { "publishedAt": "2019-07-25T10:03:08.000Z", "channelId": "UC6-ZyDHadjNic-D0slZxeWg", "title": "Hello Neighbor - My New Neighbor Pennywise - IT Act 1 Gameplay Walkthrough Part 372", "description": "Hello Neighbor - My New Neighbor Pennywise - IT Act 1 Gameplay Walkthrough Part 372\nHello Neighbor Playlist : https://www.youtube.com/playlist?list=PLE_IboltanZat9W3x8fS3tL1fXkc2Gcb1\n\nHello Neighbor (Itunes | Ios | APP STORE) : https://itunes.apple.com/us/app/hello-neighbor/id1386358600?mt=8\n\nHello Neighbor (Android | Google Play) : https://play.google.com/store/apps/details?id=com.tinybuildgames.helloneighbor&hl=en_US\n\nHello Neighbor Free App\n\nHello Neighbor is a stealth horror game about sneaking into your neighbor's house to figure out what horrible secrets he's hiding in the basement. You play against an advanced AI that learns from your every move. Really enjoying climbing through that backyard window? Expect a bear trap there. Sneaking through the front door? There'll be cameras there soon. Trying to escape? The Neighbor will find a shortcut and catch you.\n\nTouchTapGameplay More Games Gameplay : https://www.youtube.com/channel/UC6-ZyDHadjNic-D0slZxeWg\n\n\n\n............,,,,,,,,,,,,.,,,,,,,,,,,,,,/,,,,,,,,,,,,,,,,,/,,,,,,,,,.,,,,,,,,,,,,,,,-,,,,,,,,,-,,,,,,,,,,,,,,-,,,,,,,,,,,,,,,,,,,,,,,,,", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/KpCH8g56G84/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/KpCH8g56G84/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/KpCH8g56G84/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/KpCH8g56G84/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/KpCH8g56G84/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "TouchTapGameplay", "tags": ["TouchTapGameplay", "gameplay", "Walkthrough", "Let's Play", "Playthrough", "ios game", "android game", "app store", "itunes", "google play", "video games", "android play", "ios", "android", "iphone", "ipad", "ipod", "guide", "help", "trailer", "teaser", "review", "game", "gameplay walkthrough", "walkthrough playlist", "Hello Neighbor", "Hello Neighbor game", "Hello Neighbor ios", "Hello Neighbor android", "Hello Neighbor gameplay", "Hello Neighbor walkthrough", "Hello Neighbor walkthrough playlist"], "categoryId": "20", "liveBroadcastContent": "none", "localized": { "title": "Hello Neighbor - My New Neighbor Pennywise - IT Act 1 Gameplay Walkthrough Part 372", "description": "Hello Neighbor - My New Neighbor Pennywise - IT Act 1 Gameplay Walkthrough Part 372\nHello Neighbor Playlist : https://www.youtube.com/playlist?list=PLE_IboltanZat9W3x8fS3tL1fXkc2Gcb1\n\nHello Neighbor (Itunes | Ios | APP STORE) : https://itunes.apple.com/us/app/hello-neighbor/id1386358600?mt=8\n\nHello Neighbor (Android | Google Play) : https://play.google.com/store/apps/details?id=com.tinybuildgames.helloneighbor&hl=en_US\n\nHello Neighbor Free App\n\nHello Neighbor is a stealth horror game about sneaking into your neighbor's house to figure out what horrible secrets he's hiding in the basement. You play against an advanced AI that learns from your every move. Really enjoying climbing through that backyard window? Expect a bear trap there. Sneaking through the front door? There'll be cameras there soon. Trying to escape? The Neighbor will find a shortcut and catch you.\n\nTouchTapGameplay More Games Gameplay : https://www.youtube.com/channel/UC6-ZyDHadjNic-D0slZxeWg\n\n\n\n............,,,,,,,,,,,,.,,,,,,,,,,,,,,/,,,,,,,,,,,,,,,,,/,,,,,,,,,.,,,,,,,,,,,,,,,-,,,,,,,,,-,,,,,,,,,,,,,,-,,,,,,,,,,,,,,,,,,,,,,,,," }, "defaultAudioLanguage": "zxx" }, "contentDetails": { "duration": "PT11M42S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/NjRUCoxP5PwpRx4-NzDjhlnalEg\"", "id": "stRg7XmWWV4", "snippet": { "publishedAt": "2016-11-14T08:00:03.000Z", "channelId": "UCz9yS18zJGQObwUL_K-ICnw", "title": "Karol G & Ozuna - Hello", "description": "Music video by Karol G, Ozuna performing Hello. (C) 2016 Universal Music Latino\n\nhttp://vevo.ly/Ebz8pW\nBest of Karol G / Lo mejor de Karol G: https://goo.gl/2xfnDN\nSubscribe here: https://goo.gl/zXHGjS\n\n#KarolG #Hello #Vevo #Latin #VevoOfficial", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/stRg7XmWWV4/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/stRg7XmWWV4/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/stRg7XmWWV4/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/stRg7XmWWV4/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/stRg7XmWWV4/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "KarolGVEVO", "tags": ["Urban", "Hello", "Karol G", "Karol", "Ovy on the drums", "Ozuna", "Oficial", "Official", "Music Video", "Video Oficial", "Karol G Hello", "Latin", "Latin Music", "Reggaeton", "Latino", "Uproxx", "Colombia", "Hello vevp", "Hello vevo official", "Karol G vevo", "vevo", "vevo official", "Karol G vevo official"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Karol G & Ozuna - Hello", "description": "Music video by Karol G, Ozuna performing Hello. (C) 2016 Universal Music Latino\n\nhttp://vevo.ly/Ebz8pW\nBest of Karol G / Lo mejor de Karol G: https://goo.gl/2xfnDN\nSubscribe here: https://goo.gl/zXHGjS\n\n#KarolG #Hello #Vevo #Latin #VevoOfficial" }, "defaultAudioLanguage": "en-US" }, "contentDetails": { "duration": "PT4M36S", "dimension": "2d", "definition": "hd", "caption": "true", "licensedContent": true, "regionRestriction": { "allowed": ["KW", "RO", "KR", "KP", "RE", "KZ", "KY", "KG", "KE", "KN", "VU", "RW", "KM", "KH", "KI", "BY", "BZ", "ZM", "BT", "BW", "BV", "BQ", "BS", "BR", "BM", "BL", "BO", "BN", "BI", "BH", "BJ", "BE", "BD", "BG", "BF", "BA", "BB", "QA", "JP", "YT", "JE", "JM", "JO", "YE", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "VC", "MK", "ME", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "PG", "PF", "PE", "IL", "IM", "IN", "IO", "PN", "PM", "PL", "ID", "IE", "SM", "PH", "PW", "RU", "PT", "PS", "PR", "IQ", "IR", "IS", "IT", "UG", "PY", "SK", "SH", "SI", "RS", "SD", "WS", "HM", "HK", "HN", "WF", "ZA", "HU", "HT", "HR", "TJ", "FM", "MP", "GB", "GA", "GF", "GG", "GD", "GE", "GH", "GI", "GN", "GL", "GM", "GR", "GS", "GP", "GQ", "VE", "GW", "GT", "OM", "VI", "TO", "GY", "ST", "VN", "TG", "PA", "TL", "ZW", "TC", "UA", "NZ", "US", "FI", "PK", "FK", "FJ", "NU", "UY", "UZ", "TF", "NI", "FR", "NL", "NO", "NA", "UM", "NC", "TD", "NE", "NG", "NF", "ML", "TZ", "SN", "TM", "VA", "TK", "EE", "SV", "TH", "MX", "TN", "MZ", "EC", "MT", "MU", "MV", "MW", "EH", "MQ", "MR", "MS", "ET", "MM", "MN", "MO", "MH", "ER", "ES", "MD", "TR", "MF", "MG", "GU", "MA", "MC", "DZ", "EG", "MY", "TW", "TV", "DK", "DJ", "DO", "DM", "NP", "TT", "DE", "LS", "SO", "SL", "NR", "SJ", "LV", "LU", "LT", "VG", "SG", "LY", "SE", "SB", "SC", "SA", "LC", "LB", "LA", "LR", "SZ", "FO", "SX", "SY", "LK", "LI", "SR", "SS", "CZ", "CX", "CY", "CV", "CW", "CU", "CR", "CN", "CO", "CL", "CM", "CK", "CH", "CI", "CF", "CG", "CD", "CC", "CA"] }, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/yt38km6dRuGW_L2oZAK9ZNhsTZQ\"", "id": "rDWuqrJAyGw", "snippet": { "publishedAt": "2015-10-27T19:00:43.000Z", "channelId": "UCpmD3iT-8TQzRuygIiS9bAw", "title": "Adele - Hello", "description": "I'M GOING ON TOUR! Link to tickets: https://listings.ticketweb.co.uk/conormaynard\n\nSUBSCRIBE TO ANTH: http://bit.ly/SubscribeAnth\nSUBSCRIBE TO ME: http://bit.ly/SubscribeConorMaynard\nSo... mine and Anth's FIRST cover in about 3 years!!! We lost each other for a while, but like 2 unicorns, we found our way back and landed gracefully in each others arms.... I have no idea what I'm talking about. We both love this song, and hope we did it justice!!! ENJOY!!!\n\n'Covers' is on streaming!\nSpotify: http://smarturl.it/sCovers\nApple Music: http://smarturl.it/amCovers\nDeezer: http://smarturl.it/dCovers\n\nMore from Anth...\nSnapchat: anth.melo\nInstagram: http://instagram.com/AnthMelo\nTwitter: https://twitter.com/AnthMelo\nFacebook: http://facebook.com/AnthMelo\nSoundCloud: http://soundcloud.com/AnthMelo\n\nMore from me... \nOfficial Site: http://www.conor-maynard.com/\nFacebook: https://www.facebook.com/ConorMaynard\nTwitter: https://twitter.com/ConorMaynard\nInstagram: http://instagram.com/conormaynard\n\n\"Fall in love and you'll get killed\" shirts available at:\nhttp://anth.bigcartel.com", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/rDWuqrJAyGw/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/rDWuqrJAyGw/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/rDWuqrJAyGw/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/rDWuqrJAyGw/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/rDWuqrJAyGw/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Conor Maynard", "tags": ["conor maynard", "conor", "maynard", "live", "lyrics", "r u crazy", "acoustic", "cover", "conor maynard cover", "vevo", "turn around", "can't say no", "animal", "marvins room", "drake", "waves", "vegas girl", "ne-yo", "pharrell williams", "contrast", "crazy", "crazy conor maynard", "conor maynard lyrics", "conor maynard vegas", "Adele (Celebrity)", "adele", "hello", "anth", "singing", "rapping", "anth melo", "anthmelo", "anth take it off"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Adele - Hello", "description": "I'M GOING ON TOUR! Link to tickets: https://listings.ticketweb.co.uk/conormaynard\n\nSUBSCRIBE TO ANTH: http://bit.ly/SubscribeAnth\nSUBSCRIBE TO ME: http://bit.ly/SubscribeConorMaynard\nSo... mine and Anth's FIRST cover in about 3 years!!! We lost each other for a while, but like 2 unicorns, we found our way back and landed gracefully in each others arms.... I have no idea what I'm talking about. We both love this song, and hope we did it justice!!! ENJOY!!!\n\n'Covers' is on streaming!\nSpotify: http://smarturl.it/sCovers\nApple Music: http://smarturl.it/amCovers\nDeezer: http://smarturl.it/dCovers\n\nMore from Anth...\nSnapchat: anth.melo\nInstagram: http://instagram.com/AnthMelo\nTwitter: https://twitter.com/AnthMelo\nFacebook: http://facebook.com/AnthMelo\nSoundCloud: http://soundcloud.com/AnthMelo\n\nMore from me... \nOfficial Site: http://www.conor-maynard.com/\nFacebook: https://www.facebook.com/ConorMaynard\nTwitter: https://twitter.com/ConorMaynard\nInstagram: http://instagram.com/conormaynard\n\n\"Fall in love and you'll get killed\" shirts available at:\nhttp://anth.bigcartel.com" } }, "contentDetails": { "duration": "PT6M27S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/TDdNwYgGV82kILdoaruJoCiE8sk\"", "id": "9h0Arg_-380", "snippet": { "publishedAt": "2015-11-30T10:48:51.000Z", "channelId": "UCm2PpaKT2bsTwFgWAI4craQ", "title": "Adele - Hello (Lyrics Video)", "description": "Adele - Hello (Lyrics Video)\n\nOfficial Music Video : https://www.youtube.com/watch?v=YQHsXMglC9A\n\nFollow Adele On :\n\nWeb : https://www.adele.com\nFacebook : https://www.facebook.com/Adele\nInstagram : http://instagram.com/Adele\nTwitter : https://twitter.com/Adele\nSpotify : https://open.spotify.com/artist/4dpARuHxo51G3z768sgnrY\n\nThanks For Watching\nJust Subscribe :)", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/9h0Arg_-380/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/9h0Arg_-380/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/9h0Arg_-380/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/9h0Arg_-380/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/9h0Arg_-380/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Lyrics and More", "tags": ["Hello", "Adele (Celebrity)", "Lyrics (Website Category)", "Full", "Music (TV Genre)", "Official", "Television (Invention)", "Music Video (TV Genre)", "Song", "New", "Album", "Screen", "Full Song", "Project", "Trailer", "Wlyrics", "Song Lyrics"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Adele - Hello (Lyrics Video)", "description": "Adele - Hello (Lyrics Video)\n\nOfficial Music Video : https://www.youtube.com/watch?v=YQHsXMglC9A\n\nFollow Adele On :\n\nWeb : https://www.adele.com\nFacebook : https://www.facebook.com/Adele\nInstagram : http://instagram.com/Adele\nTwitter : https://twitter.com/Adele\nSpotify : https://open.spotify.com/artist/4dpARuHxo51G3z768sgnrY\n\nThanks For Watching\nJust Subscribe :)" }, "defaultAudioLanguage": "en" }, "contentDetails": { "duration": "PT4M54S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/cEm8hsvP7stcjfnmCnvGiVyc22s\"", "id": "K2us-A5qtXg", "snippet": { "publishedAt": "2018-09-22T12:15:00.000Z", "channelId": "UCC-RHF_77zQdKcA75hr5oTQ", "title": "HELLO GRANNY!! a Hello Neighbor Granny's House Mod Mini-Game! Baybee Slendrina FaceTimes FGTEEV!", "description": "Be an FGTEEVER ➡ http://bit.ly/1KKE2f1 & Get the Merch ➡ http://shopfunnelvision.com/ ... FGTEEV Duddy is checking out HELLO GRANNY, a Hello Neighbor Mod of Escape Granny's House!  Shawn joins the vid too and Baby Slendrina Face Times us!!  Thumbs up for the awesome fun gameplay!\n\nCheck out Granny's House Music Video\nDOWNLOAD on iTunes ➡ http://bit.ly/GrannyApple\nYoutube ➡ http://youtu.be/6eHCKU1ZWgI\n\nFGTEEV Granny & Slendrina Gameplays: http://www.youtube.com/playlist?list=PLYqGY_-rT9bO7x9Rd9rjZqK5iH-NIWOI0\n\nGranny in Real Life: http://youtu.be/gxDZ4-d-XNU\n\n==================================\nBeba Ba Leep Bop Beleeda Bop Pllllhhh!\n📺Our Family/Vlog channel, FUNNEL VISION:\nhttp://www.youtube.com/c/FVFAMILY\n📺Our Toy Channel: DOH MUCH FUN:\nhttp://www.youtube.com/DOHMUCHFUN2\n📺Family Friendly Youtube Gaming Channel, FGTEEV:\nhttp://www.youtube.com/fgteev\n📺Skylander Boy and Girl Channel: http://www.youtube.com/theskylanderboyandgirl\n\n►Instagram: http://instagram.com/funnelvisionfam\n►Facebook: http://www.facebook.com/SkylanderKids\n►Twitter: http://twitter.com/funnelvisionfam\n\nABOUT FGTEEV:\nFGTeeV is a Family Gaming Channel of 6 people. Dad is known as FGTEEV Duddy & Mom, well, we call her whatever but sometimes it's Moomy.  They have 4 children, Chase, Mike, Lex & Shawn!  We play all sorts of games,  Thanks for checking us out.\n\n==================================\n\nLEGAL DISCLAIMER: Royalty Free Music & Content by audiomicro.com epidemicsound.com videoblocks.com incompetech.com bensound.com jinglepunks.com", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/K2us-A5qtXg/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/K2us-A5qtXg/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/K2us-A5qtXg/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/K2us-A5qtXg/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/K2us-A5qtXg/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "FGTeeV", "tags": ["granny house fgteev", "hello neighbor fgteev", "hello granny mod", "hello neighbor mod", "fgteev", "fgteev youtube", "youtube fgteev", "fgteev gaming", "fgteev minecraft", "fgteev roblox", "fgteev hello neighbor", "family gaming", "gameplay", "skit", "funny", "comedy", "fgteev music"], "categoryId": "20", "liveBroadcastContent": "none", "defaultLanguage": "en", "localized": { "title": "HELLO GRANNY!! a Hello Neighbor Granny's House Mod Mini-Game! Baybee Slendrina FaceTimes FGTEEV!", "description": "Be an FGTEEVER ➡ http://bit.ly/1KKE2f1 & Get the Merch ➡ http://shopfunnelvision.com/ ... FGTEEV Duddy is checking out HELLO GRANNY, a Hello Neighbor Mod of Escape Granny's House!  Shawn joins the vid too and Baby Slendrina Face Times us!!  Thumbs up for the awesome fun gameplay!\n\nCheck out Granny's House Music Video\nDOWNLOAD on iTunes ➡ http://bit.ly/GrannyApple\nYoutube ➡ http://youtu.be/6eHCKU1ZWgI\n\nFGTEEV Granny & Slendrina Gameplays: http://www.youtube.com/playlist?list=PLYqGY_-rT9bO7x9Rd9rjZqK5iH-NIWOI0\n\nGranny in Real Life: http://youtu.be/gxDZ4-d-XNU\n\n==================================\nBeba Ba Leep Bop Beleeda Bop Pllllhhh!\n📺Our Family/Vlog channel, FUNNEL VISION:\nhttp://www.youtube.com/c/FVFAMILY\n📺Our Toy Channel: DOH MUCH FUN:\nhttp://www.youtube.com/DOHMUCHFUN2\n📺Family Friendly Youtube Gaming Channel, FGTEEV:\nhttp://www.youtube.com/fgteev\n📺Skylander Boy and Girl Channel: http://www.youtube.com/theskylanderboyandgirl\n\n►Instagram: http://instagram.com/funnelvisionfam\n►Facebook: http://www.facebook.com/SkylanderKids\n►Twitter: http://twitter.com/funnelvisionfam\n\nABOUT FGTEEV:\nFGTeeV is a Family Gaming Channel of 6 people. Dad is known as FGTEEV Duddy & Mom, well, we call her whatever but sometimes it's Moomy.  They have 4 children, Chase, Mike, Lex & Shawn!  We play all sorts of games,  Thanks for checking us out.\n\n==================================\n\nLEGAL DISCLAIMER: Royalty Free Music & Content by audiomicro.com epidemicsound.com videoblocks.com incompetech.com bensound.com jinglepunks.com" }, "defaultAudioLanguage": "en" }, "contentDetails": { "duration": "PT18M43S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/IX2JunNWGhXyy7EYQzrpMCfSQbc\"", "id": "871SSkoJJ_M", "snippet": { "publishedAt": "2020-03-04T17:02:14.000Z", "channelId": "UCS62Ou8ybz9XXyuZzQZJxQw", "title": "Hello 2020 x17", "description": "=================================================\n👕 Buy some clothes! 👇\nGet Memes Apparel here: http://bit.ly/WesleyWMemesMerch\nGet Hip-hop Apparel here: http://bit.ly/WesleyWHiphopMerch\nUse code meme for an Extra 5% discount ($49+)!\nUse code memes for an Extra 10% discount ($99+)!\n=================================================\n\nComment Down Bellow Ur Favourite Part !\nFollow My SocialMedia : \nhttps://www.instagram.com/wesleywijayaa/", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/871SSkoJJ_M/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/871SSkoJJ_M/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/871SSkoJJ_M/hqdefault.jpg", "width": 480, "height": 360 } }, "channelTitle": "WesleyW", "tags": ["Coub", "Coub compilation", "coub compilation meme", "hello 2020", "hello dollar", "dollar meme", "error 2020 meme", "error compilation", "hello 2020 x", "hello 2020 meme", "coub meme compilation", "meme compilation", "dank meme compilation", "meme", "coub meme", "coub video", "coub dank meme", "free meme kid", "memes compilation", "dank meme", "error", "error 2020", "hello 2020 x video", "cube", "cube compilation", "cube meme compilation", "cube meme", "cube hello 2020", "meme thats make me", "meme 2020", "error 2020 iam ritto"], "categoryId": "23", "liveBroadcastContent": "none", "localized": { "title": "Hello 2020 x17", "description": "=================================================\n👕 Buy some clothes! 👇\nGet Memes Apparel here: http://bit.ly/WesleyWMemesMerch\nGet Hip-hop Apparel here: http://bit.ly/WesleyWHiphopMerch\nUse code meme for an Extra 5% discount ($49+)!\nUse code memes for an Extra 10% discount ($99+)!\n=================================================\n\nComment Down Bellow Ur Favourite Part !\nFollow My SocialMedia : \nhttps://www.instagram.com/wesleywijayaa/" } }, "contentDetails": { "duration": "PT3M54S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": false, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/P_ZqO52sqMnCazay8dXjSDIsk2M\"", "id": "eIHiXth-a7g", "snippet": { "publishedAt": "2018-03-12T13:46:10.000Z", "channelId": "UCk8GzjMOrta8yxDcKfylJYw", "title": "Hello Hello song for kids by Diana", "description": "\"Hello Hello Song\" - a fun and engaging song for kids. It focuses on key phrases of greetings, such as \"Hello\" and \"What's your name?\". \nInstagram Diana: https://www.instagram.com/kidsdianashow/\nПодписка на канал:\nKids Diana Show - http://bit.ly/2k7NrSx\nKids Roma Show - http://bit.ly/2kj62uh", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/eIHiXth-a7g/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/eIHiXth-a7g/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/eIHiXth-a7g/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/eIHiXth-a7g/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/eIHiXth-a7g/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "✿ Kids Diana Show", "tags": ["Hello Hello song", "songs", "for kids", "Diana", "hello song", "hello song for kids", "super simple songs", "hello hello", "hello", "hello song for children", "songs for kids", "kids song", "baby songs", "kids songs"], "categoryId": "24", "liveBroadcastContent": "none", "defaultLanguage": "en", "localized": { "title": "Hello Hello song for kids by Diana", "description": "\"Hello Hello Song\" - a fun and engaging song for kids. It focuses on key phrases of greetings, such as \"Hello\" and \"What's your name?\". \nInstagram Diana: https://www.instagram.com/kidsdianashow/\nПодписка на канал:\nKids Diana Show - http://bit.ly/2k7NrSx\nKids Roma Show - http://bit.ly/2kj62uh" }, "defaultAudioLanguage": "en" }, "contentDetails": { "duration": "PT2M13S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/yL213I7y723cjxlqUKnYkrf2G68\"", "id": "L1uFVBUJvmU", "snippet": { "publishedAt": "2020-03-04T13:55:35.000Z", "channelId": "UCOTOq2p3YlmAzzR10m1FAYQ", "title": "NOWE HELLO NEIGHBOR! ... Gravewood High [ALPHA 1]", "description": "🏫 20.000 LIKE = 𝗞𝗢𝗟𝗘𝗝𝗡𝗬 𝗼𝗱𝗰𝗶𝗻𝗲𝗸 z GRAVEWOOD HIGH! 🏫\n🔥 WESPRZYJ MNIE MISZCZU! (klik) ➡ https://bit.ly/2IKRbaF\n🛍 DISCORD DLA WIDZÓW ➡ https://discord.gg/gNaFVsE\n\n📮 GRUPA NA FB ➡ https://goo.gl/Exo1cT \n⭕ SUBSKRYBUJ MISZCZU ➡ https://goo.gl/b7iojq \n📷 INSTAGRAM ➡ http://goo.gl/PqHFwJ \n💙 WBIJ NA FEJSA ➡ http://goo.gl/V6APQk \n👕 KUP KOSZULKE ➡ http://www.karolek.exyt.pl \n\n┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅\n\n🔥 Fragmenty utworów należą do ich prawnych właścicieli i zostały wykorzystane wg prawa cytatu [art.29 ust.1 ustawy o prawie autorskim i prawach pokrewnych] ™ \n\nPamiętaj drogi widzu, wszystko co widzisz na tym kanale, odbieraj w sposób żartobliwy, filmy nie mają na celu urażenia nikogo, przychodź, oglądaj, rozrywkuj, baw się dobrze, Łokieć 💪.\n\n#GraveWoodHigh #HelloNeighbor #NowaGra", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/L1uFVBUJvmU/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/L1uFVBUJvmU/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/L1uFVBUJvmU/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/L1uFVBUJvmU/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/L1uFVBUJvmU/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "Karolek", "tags": ["karol", "karolek", "dąbrowski", "śmieszne", "filmiki", "w internecie", "śmiejesz", "się", "dzieje", "try", "not", "to", "laugh", "challenge", "funny", "moments", "movies", "compilation", "react", "reaction", "poland", "polska", "polish", "csgo", "games", "gry", "gierki", "mini", "family", "friendly", "hello", "neighbor", "neighbour", "grave", "gravewood", "high", "alpha", "hide", "and", "seek"], "categoryId": "20", "liveBroadcastContent": "none", "localized": { "title": "NOWE HELLO NEIGHBOR! ... Gravewood High [ALPHA 1]", "description": "🏫 20.000 LIKE = 𝗞𝗢𝗟𝗘𝗝𝗡𝗬 𝗼𝗱𝗰𝗶𝗻𝗲𝗸 z GRAVEWOOD HIGH! 🏫\n🔥 WESPRZYJ MNIE MISZCZU! (klik) ➡ https://bit.ly/2IKRbaF\n🛍 DISCORD DLA WIDZÓW ➡ https://discord.gg/gNaFVsE\n\n📮 GRUPA NA FB ➡ https://goo.gl/Exo1cT \n⭕ SUBSKRYBUJ MISZCZU ➡ https://goo.gl/b7iojq \n📷 INSTAGRAM ➡ http://goo.gl/PqHFwJ \n💙 WBIJ NA FEJSA ➡ http://goo.gl/V6APQk \n👕 KUP KOSZULKE ➡ http://www.karolek.exyt.pl \n\n┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅\n\n🔥 Fragmenty utworów należą do ich prawnych właścicieli i zostały wykorzystane wg prawa cytatu [art.29 ust.1 ustawy o prawie autorskim i prawach pokrewnych] ™ \n\nPamiętaj drogi widzu, wszystko co widzisz na tym kanale, odbieraj w sposób żartobliwy, filmy nie mają na celu urażenia nikogo, przychodź, oglądaj, rozrywkuj, baw się dobrze, Łokieć 💪.\n\n#GraveWoodHigh #HelloNeighbor #NowaGra" } }, "contentDetails": { "duration": "PT20M39S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "projection": "rectangular" } }, { "kind": "youtube#video", "etag": "\"SJZWTG6xR0eGuCOh2bX6w3s4F94/nW_C8EbHkq24A7Av9xHsjI-T2sU\"", "id": "DfG6VKnjrVw", "snippet": { "publishedAt": "2015-11-09T19:50:38.000Z", "channelId": "UComP_epzeKzvBX156r6pm1Q", "title": "Adele - Hello (Live at the NRJ Awards)", "description": "‘Hello' is taken from the new album, 25, out November 20. http://adele.com\nAvailable now from iTunes http://smarturl.it/itunes25 \nAvailable now from Amazon http://smarturl.it/25amazon \nAvailable now from Google Play http://smarturl.it/25gplay\nAvailable now at Target (US Only): http://smarturl.it/target25\n\nFollow Adele on:\n\nFacebook - https://www.facebook.com/Adele\nTwitter - https://twitter.com/Adele \nInstagram - http://instagram.com/Adele\n\nCopyright: TF1 Production\nDirector: Tristan Carné\n\nhttp://vevo.ly/sA14tV\nPlaylist Best of Adele https://goo.gl/YWgJtE\nSubscribe for more https://goo.gl/xrpGsB\nBest of Adele: https://goo.gl/DSt4mS\nSubscribe here: https://goo.gl/6hEDrd", "thumbnails": { "default": { "url": "https://i.ytimg.com/vi/DfG6VKnjrVw/default.jpg", "width": 120, "height": 90 }, "medium": { "url": "https://i.ytimg.com/vi/DfG6VKnjrVw/mqdefault.jpg", "width": 320, "height": 180 }, "high": { "url": "https://i.ytimg.com/vi/DfG6VKnjrVw/hqdefault.jpg", "width": 480, "height": 360 }, "standard": { "url": "https://i.ytimg.com/vi/DfG6VKnjrVw/sddefault.jpg", "width": 640, "height": 480 }, "maxres": { "url": "https://i.ytimg.com/vi/DfG6VKnjrVw/maxresdefault.jpg", "width": 1280, "height": 720 } }, "channelTitle": "AdeleVEVO", "tags": ["Adele", "Hello", "(Live", "at", "the", "NRJ", "Awards)", "Beggars", "Pop"], "categoryId": "10", "liveBroadcastContent": "none", "localized": { "title": "Adele - Hello (Live at the NRJ Awards)", "description": "‘Hello' is taken from the new album, 25, out November 20. http://adele.com\nAvailable now from iTunes http://smarturl.it/itunes25 \nAvailable now from Amazon http://smarturl.it/25amazon \nAvailable now from Google Play http://smarturl.it/25gplay\nAvailable now at Target (US Only): http://smarturl.it/target25\n\nFollow Adele on:\n\nFacebook - https://www.facebook.com/Adele\nTwitter - https://twitter.com/Adele \nInstagram - http://instagram.com/Adele\n\nCopyright: TF1 Production\nDirector: Tristan Carné\n\nhttp://vevo.ly/sA14tV\nPlaylist Best of Adele https://goo.gl/YWgJtE\nSubscribe for more https://goo.gl/xrpGsB\nBest of Adele: https://goo.gl/DSt4mS\nSubscribe here: https://goo.gl/6hEDrd" }, "defaultAudioLanguage": "en-US" }, "contentDetails": { "duration": "PT5M8S", "dimension": "2d", "definition": "hd", "caption": "false", "licensedContent": true, "regionRestriction": { "blocked": ["FR"] }, "projection": "rectangular" } }];

    const searchRes = writable(temp);

    /* src\Search.svelte generated by Svelte v3.18.2 */
    const file$2 = "src\\Search.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (284:4) {#each $searchRes as item, i}
    function create_each_block(ctx) {
    	let div5;
    	let div0;
    	let div0_alt_value;
    	let t0;
    	let div3;
    	let div1;
    	let span;
    	let t1_value = /*item*/ ctx[11].snippet.title + "";
    	let t1;
    	let t2;
    	let div2;
    	let t3_value = /*item*/ ctx[11].contentDetails.duration + "";
    	let t3;
    	let t4;
    	let div4;
    	let i_1;
    	let t5;
    	let dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			div2 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			div4 = element("div");
    			i_1 = element("i");
    			t5 = space();
    			attr_dev(div0, "class", "thumb svelte-1anpxmr");
    			attr_dev(div0, "alt", div0_alt_value = /*item*/ ctx[11].snippet.title);
    			set_style(div0, "background-image", "url(" + /*item*/ ctx[11].snippet.thumbnails.default.url + ")");
    			add_location(div0, file$2, 285, 8, 6007);
    			attr_dev(span, "class", "svelte-1anpxmr");
    			add_location(span, file$2, 291, 12, 6230);
    			attr_dev(div1, "class", "title svelte-1anpxmr");
    			add_location(div1, file$2, 290, 10, 6197);
    			attr_dev(div2, "class", "details svelte-1anpxmr");
    			add_location(div2, file$2, 293, 10, 6293);
    			attr_dev(div3, "class", "middle svelte-1anpxmr");
    			add_location(div3, file$2, 289, 8, 6165);
    			attr_dev(i_1, "class", "fas fa-plus svelte-1anpxmr");
    			add_location(i_1, file$2, 296, 10, 6428);
    			attr_dev(div4, "class", "right svelte-1anpxmr");
    			add_location(div4, file$2, 295, 8, 6376);
    			attr_dev(div5, "class", "item svelte-1anpxmr");
    			add_location(div5, file$2, 284, 6, 5979);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t0);
    			append_dev(div5, div3);
    			append_dev(div3, div1);
    			append_dev(div1, span);
    			append_dev(span, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, t3);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div4, i_1);
    			append_dev(div5, t5);

    			dispose = listen_dev(
    				div4,
    				"click",
    				function () {
    					if (is_function(add(/*item*/ ctx[11]))) add(/*item*/ ctx[11]).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$searchRes*/ 4 && div0_alt_value !== (div0_alt_value = /*item*/ ctx[11].snippet.title)) {
    				attr_dev(div0, "alt", div0_alt_value);
    			}

    			if (dirty & /*$searchRes*/ 4) {
    				set_style(div0, "background-image", "url(" + /*item*/ ctx[11].snippet.thumbnails.default.url + ")");
    			}

    			if (dirty & /*$searchRes*/ 4 && t1_value !== (t1_value = /*item*/ ctx[11].snippet.title + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$searchRes*/ 4 && t3_value !== (t3_value = /*item*/ ctx[11].contentDetails.duration + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(284:4) {#each $searchRes as item, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div3;
    	let div1;
    	let div0;
    	let input_1;
    	let t;
    	let div2;
    	let dispose;
    	let each_value = /*$searchRes*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			input_1 = element("input");
    			t = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input_1, "placeholder", "Search");
    			attr_dev(input_1, "class", "svelte-1anpxmr");
    			add_location(input_1, file$2, 273, 6, 5701);
    			attr_dev(div0, "class", "search svelte-1anpxmr");
    			add_location(div0, file$2, 272, 4, 5673);
    			attr_dev(div1, "class", "bar svelte-1anpxmr");
    			add_location(div1, file$2, 271, 2, 5650);
    			attr_dev(div2, "class", "items svelte-1anpxmr");
    			add_location(div2, file$2, 282, 2, 5917);
    			attr_dev(div3, "class", "bg svelte-1anpxmr");
    			add_location(div3, file$2, 270, 0, 5613);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input_1);
    			/*input_1_binding*/ ctx[9](input_1);
    			set_input_value(input_1, /*$searchStr*/ ctx[1]);
    			append_dev(div3, t);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			dispose = [
    				listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[10]),
    				listen_dev(input_1, "click", catchClick$1, false, false, false),
    				listen_dev(input_1, "keydown", /*catchEnter*/ ctx[4], false, false, false),
    				listen_dev(input_1, "input", /*search*/ ctx[5], false, false, false),
    				listen_dev(div3, "click", /*close*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$searchStr*/ 2 && input_1.value !== /*$searchStr*/ ctx[1]) {
    				set_input_value(input_1, /*$searchStr*/ ctx[1]);
    			}

    			if (dirty & /*add, $searchRes*/ 4) {
    				each_value = /*$searchRes*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*input_1_binding*/ ctx[9](null);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function catchClick$1(e) {
    	e.stopPropagation();
    }

    function add(video) {
    	let vidObj = {
    		videoId: video.id,
    		title: video.snippet.title,
    		duration: video.contentDetails.duration,
    		thumbnail: video.snippet.thumbnails.default.url
    	};

    	addVideo(vidObj);
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $searchStr;
    	let $searchRes;
    	validate_store(searchStr, "searchStr");
    	component_subscribe($$self, searchStr, $$value => $$invalidate(1, $searchStr = $$value));
    	validate_store(searchRes, "searchRes");
    	component_subscribe($$self, searchRes, $$value => $$invalidate(2, $searchRes = $$value));
    	const dispatch = createEventDispatcher();
    	let input;
    	let throttle;

    	function close() {
    		dispatch("close");
    	}

    	function catchEnter(e) {
    		if (throttle) {
    			clearTimeout(throttle);
    		}

    		if (e.code === "Enter") sendSearchReq();
    	}

    	function sendSearchReq() {
    		gapi.client.youtube.search.list({
    			part: "id",
    			maxResults: 25,
    			q: $searchStr
    		}).then(res => {
    			let ids = "";

    			res.result.items.forEach(video => {
    				ids += video.id.videoId + ",";
    			});

    			ids = ids.slice(0, -1);

    			gapi.client.youtube.videos.list({
    				maxResults: 25,
    				part: "contentDetails,snippet",
    				id: ids
    			}).then(details => {
    				//format duration
    				details.result.items.forEach(item => {
    					item.contentDetails.duration = parseDuration(item.contentDetails.duration);
    				});

    				searchRes.set(details.result.items);
    			});
    		});
    	}

    	function search() {
    		if (throttle) {
    			clearTimeout(throttle);
    		}

    		throttle = setTimeout(
    			() => {
    				sendSearchReq();
    			},
    			500
    		);
    	}

    	onMount(() => {
    		input.focus();
    		input.select();
    	});

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, input = $$value);
    		});
    	}

    	function input_1_input_handler() {
    		$searchStr = this.value;
    		searchStr.set($searchStr);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("input" in $$props) $$invalidate(0, input = $$props.input);
    		if ("throttle" in $$props) throttle = $$props.throttle;
    		if ("$searchStr" in $$props) searchStr.set($searchStr = $$props.$searchStr);
    		if ("$searchRes" in $$props) searchRes.set($searchRes = $$props.$searchRes);
    	};

    	return [
    		input,
    		$searchStr,
    		$searchRes,
    		close,
    		catchEnter,
    		search,
    		throttle,
    		dispatch,
    		sendSearchReq,
    		input_1_binding,
    		input_1_input_handler
    	];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\NowPlaying.svelte generated by Svelte v3.18.2 */
    const file$3 = "src\\NowPlaying.svelte";

    // (25:0) {#if $station.nowPlaying}
    function create_if_block$1(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2_value = /*$station*/ ctx[0].nowPlaying.title + "";
    	let t2;
    	let t3;
    	let if_block = /*$station*/ ctx[0].state != "playing" && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Now Playing:";
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "nowPlaying");
    			add_location(div0, file$3, 27, 6, 456);
    			attr_dev(div1, "class", "title svelte-12e3e6e");
    			add_location(div1, file$3, 28, 6, 506);
    			attr_dev(div2, "class", "container svelte-12e3e6e");
    			add_location(div2, file$3, 26, 4, 425);
    			attr_dev(div3, "class", "bg svelte-12e3e6e");
    			add_location(div3, file$3, 25, 2, 403);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div2, t3);
    			if (if_block) if_block.m(div2, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$station*/ 1 && t2_value !== (t2_value = /*$station*/ ctx[0].nowPlaying.title + "")) set_data_dev(t2, t2_value);

    			if (/*$station*/ ctx[0].state != "playing") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(25:0) {#if $station.nowPlaying}",
    		ctx
    	});

    	return block;
    }

    // (31:6) {#if $station.state != 'playing'}
    function create_if_block_1(ctx) {
    	let div;
    	let t_value = /*$station*/ ctx[0].state + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "state");
    			add_location(div, file$3, 31, 8, 611);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$station*/ 1 && t_value !== (t_value = /*$station*/ ctx[0].state + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(31:6) {#if $station.state != 'playing'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let if_block = /*$station*/ ctx[0].nowPlaying && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$station*/ ctx[0].nowPlaying) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $station;
    	validate_store(station, "station");
    	component_subscribe($$self, station, $$value => $$invalidate(0, $station = $$value));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$station" in $$props) station.set($station = $$props.$station);
    	};

    	return [$station];
    }

    class NowPlaying extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NowPlaying",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\CooldownTimer.svelte generated by Svelte v3.18.2 */
    const file$4 = "src\\CooldownTimer.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let circle;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			attr_dev(circle, "class", "circle svelte-1ciihi4");
    			attr_dev(circle, "cx", "50");
    			attr_dev(circle, "cy", "50");
    			attr_dev(circle, "r", "40");
    			attr_dev(circle, "pathLength", "100");
    			add_location(circle, file$4, 28, 2, 508);
    			attr_dev(svg, "class", "timer svelte-1ciihi4");
    			attr_dev(svg, "width", "100");
    			attr_dev(svg, "height", "100");
    			add_location(svg, file$4, 27, 0, 460);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, circle);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function setCooldown(duration) {
    	
    }

    function instance$5($$self, $$props, $$invalidate) {
    	onMount(() => {
    		
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [setCooldown];
    }

    class CooldownTimer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { setCooldown: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CooldownTimer",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get setCooldown() {
    		return setCooldown;
    	}

    	set setCooldown(value) {
    		throw new Error("<CooldownTimer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Playlist.svelte generated by Svelte v3.18.2 */
    const file$5 = "src\\Playlist.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (142:8) {#if $user.isAdmin}
    function create_if_block$2(ctx) {
    	let div;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			set_style(div, "width", "100%");
    			set_style(div, "height", "100%");
    			set_style(div, "position", "absolute");
    			set_style(div, "cursor", "pointer");
    			add_location(div, file$5, 142, 10, 2763);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			dispose = listen_dev(
    				div,
    				"click",
    				function () {
    					if (is_function(/*play*/ ctx[2](/*item*/ ctx[9]))) /*play*/ ctx[2](/*item*/ ctx[9]).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(142:8) {#if $user.isAdmin}",
    		ctx
    	});

    	return block;
    }

    // (140:4) {#each $station.playlist as item}
    function create_each_block$1(ctx) {
    	let div7;
    	let t0;
    	let div0;
    	let t1;
    	let div3;
    	let div1;
    	let t2_value = /*item*/ ctx[9].title + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4_value = /*item*/ ctx[9].duration + "";
    	let t4;
    	let t5;
    	let div6;
    	let div4;
    	let svg0;
    	let g0;
    	let path0;
    	let t6;
    	let svg1;
    	let g1;
    	let path1;
    	let t7;
    	let div5;
    	let t8_value = getLikes(/*item*/ ctx[9]) + "";
    	let t8;
    	let t9;
    	let dispose;
    	let if_block = /*$user*/ ctx[1].isAdmin && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div6 = element("div");
    			div4 = element("div");
    			svg0 = svg_element("svg");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			t6 = space();
    			svg1 = svg_element("svg");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			t7 = space();
    			div5 = element("div");
    			t8 = text(t8_value);
    			t9 = space();
    			attr_dev(div0, "class", "thumbnail");
    			set_style(div0, "background-image", "url(" + /*item*/ ctx[9].thumbnail + ")");
    			add_location(div0, file$5, 146, 8, 2911);
    			attr_dev(div1, "class", "title");
    			add_location(div1, file$5, 150, 10, 3048);
    			attr_dev(div2, "class", "duration");
    			add_location(div2, file$5, 151, 10, 3097);
    			attr_dev(div3, "class", "middle svelte-z0iwda");
    			add_location(div3, file$5, 149, 8, 3016);
    			attr_dev(path0, "d", "M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6\r\n                  9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z");
    			add_location(path0, file$5, 162, 16, 3530);
    			attr_dev(g0, "transform", "rotate(180 0 0)");
    			add_location(g0, file$5, 161, 14, 3481);
    			attr_dev(svg0, "class", "upArrow svelte-z0iwda");
    			attr_dev(svg0, "viewBox", "-303.065673828125 -455.04998779296875 286.13134765625\r\n              167.04998779296875");
    			toggle_class(svg0, "green", /*likedByMe*/ ctx[3](/*item*/ ctx[9]));
    			add_location(svg0, file$5, 155, 12, 3231);
    			attr_dev(path1, "d", "M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6\r\n                  9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z");
    			add_location(path1, file$5, 173, 16, 3980);
    			add_location(g1, file$5, 172, 14, 3959);
    			attr_dev(svg1, "class", "downArrow svelte-z0iwda");
    			attr_dev(svg1, "viewBox", "16.934316635131836 288 286.13134765625 167.04998779296875");
    			toggle_class(svg1, "red", /*dislikedByMe*/ ctx[4](/*item*/ ctx[9]));
    			add_location(svg1, file$5, 167, 12, 3734);
    			attr_dev(div4, "class", "arrows svelte-z0iwda");
    			add_location(div4, file$5, 154, 10, 3197);
    			attr_dev(div5, "class", "likes svelte-z0iwda");
    			add_location(div5, file$5, 179, 10, 4200);
    			attr_dev(div6, "class", "right svelte-z0iwda");
    			add_location(div6, file$5, 153, 8, 3166);
    			attr_dev(div7, "class", "item svelte-z0iwda");
    			add_location(div7, file$5, 140, 6, 2704);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			if (if_block) if_block.m(div7, null);
    			append_dev(div7, t0);
    			append_dev(div7, div0);
    			append_dev(div7, t1);
    			append_dev(div7, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, t4);
    			append_dev(div7, t5);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, svg0);
    			append_dev(svg0, g0);
    			append_dev(g0, path0);
    			append_dev(div4, t6);
    			append_dev(div4, svg1);
    			append_dev(svg1, g1);
    			append_dev(g1, path1);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, t8);
    			append_dev(div7, t9);

    			dispose = [
    				listen_dev(
    					svg0,
    					"click",
    					function () {
    						if (is_function(/*upArrow*/ ctx[5](/*item*/ ctx[9]))) /*upArrow*/ ctx[5](/*item*/ ctx[9]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(
    					svg1,
    					"click",
    					function () {
    						if (is_function(/*downArrow*/ ctx[6](/*item*/ ctx[9]))) /*downArrow*/ ctx[6](/*item*/ ctx[9]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*$user*/ ctx[1].isAdmin) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div7, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*$station*/ 1) {
    				set_style(div0, "background-image", "url(" + /*item*/ ctx[9].thumbnail + ")");
    			}

    			if (dirty & /*$station*/ 1 && t2_value !== (t2_value = /*item*/ ctx[9].title + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*$station*/ 1 && t4_value !== (t4_value = /*item*/ ctx[9].duration + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*likedByMe, $station*/ 9) {
    				toggle_class(svg0, "green", /*likedByMe*/ ctx[3](/*item*/ ctx[9]));
    			}

    			if (dirty & /*dislikedByMe, $station*/ 17) {
    				toggle_class(svg1, "red", /*dislikedByMe*/ ctx[4](/*item*/ ctx[9]));
    			}

    			if (dirty & /*$station*/ 1 && t8_value !== (t8_value = getLikes(/*item*/ ctx[9]) + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(140:4) {#each $station.playlist as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div1;
    	let div0;
    	let each_value = /*$station*/ ctx[0].playlist;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "list svelte-z0iwda");
    			add_location(div0, file$5, 138, 2, 2639);
    			attr_dev(div1, "class", "wrapper svelte-z0iwda");
    			add_location(div1, file$5, 137, 0, 2614);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*getLikes, $station, dislikedByMe, downArrow, likedByMe, upArrow, play, $user*/ 127) {
    				each_value = /*$station*/ ctx[0].playlist;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getLikes(video) {
    	return Object.keys(video.likes).length - Object.keys(video.dislikes).length;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $fp;
    	let $station;
    	let $user;
    	validate_store(fp, "fp");
    	component_subscribe($$self, fp, $$value => $$invalidate(7, $fp = $$value));
    	validate_store(station, "station");
    	component_subscribe($$self, station, $$value => $$invalidate(0, $station = $$value));
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(1, $user = $$value));
    	const dispatch = createEventDispatcher();

    	function play(videoId) {
    		dispatch("play", videoId);
    	}

    	function likedByMe(video) {
    		return video.likes.hasOwnProperty($fp);
    	}

    	function dislikedByMe(video) {
    		return video.dislikes.hasOwnProperty($fp);
    	}

    	function upArrow(video) {
    		if (likedByMe(video)) {
    			clearLike(video.videoId);
    		} else {
    			like(video.videoId);
    		}
    	}

    	function downArrow(video) {
    		if (dislikedByMe(video)) {
    			clearDislike(video.videoId);
    		} else {
    			dislike(video.videoId);
    		}
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$fp" in $$props) fp.set($fp = $$props.$fp);
    		if ("$station" in $$props) station.set($station = $$props.$station);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    	};

    	return [$station, $user, play, likedByMe, dislikedByMe, upArrow, downArrow];
    }

    class Playlist extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Playlist",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\QRCode.svelte generated by Svelte v3.18.2 */
    const file$6 = "src\\QRCode.svelte";

    function create_fragment$7(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "qrcode");
    			add_location(div, file$6, 27, 0, 625);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { codeValue } = $$props;
    	let { squareSize } = $$props;
    	let qrcode;

    	onMount(() => {
    		let script = document.createElement("script");
    		script.src = "https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js";
    		document.head.append(script);

    		script.onload = function () {
    			qrcode = new QRCode("qrcode",
    			{
    					text: codeValue,
    					width: squareSize,
    					height: squareSize,
    					colorDark: "#000000",
    					colorLight: "#ffffff",
    					correctLevel: QRCode.CorrectLevel.H
    				});
    		};
    	});

    	const writable_props = ["codeValue", "squareSize"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<QRCode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("codeValue" in $$props) $$invalidate(0, codeValue = $$props.codeValue);
    		if ("squareSize" in $$props) $$invalidate(1, squareSize = $$props.squareSize);
    	};

    	$$self.$capture_state = () => {
    		return { codeValue, squareSize, qrcode };
    	};

    	$$self.$inject_state = $$props => {
    		if ("codeValue" in $$props) $$invalidate(0, codeValue = $$props.codeValue);
    		if ("squareSize" in $$props) $$invalidate(1, squareSize = $$props.squareSize);
    		if ("qrcode" in $$props) qrcode = $$props.qrcode;
    	};

    	return [codeValue, squareSize];
    }

    class QRCode_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { codeValue: 0, squareSize: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QRCode_1",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*codeValue*/ ctx[0] === undefined && !("codeValue" in props)) {
    			console.warn("<QRCode> was created without expected prop 'codeValue'");
    		}

    		if (/*squareSize*/ ctx[1] === undefined && !("squareSize" in props)) {
    			console.warn("<QRCode> was created without expected prop 'squareSize'");
    		}
    	}

    	get codeValue() {
    		throw new Error("<QRCode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set codeValue(value) {
    		throw new Error("<QRCode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get squareSize() {
    		throw new Error("<QRCode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set squareSize(value) {
    		throw new Error("<QRCode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Station.svelte generated by Svelte v3.18.2 */
    const file$7 = "src\\Station.svelte";

    // (205:2) {:else}
    function create_else_block(ctx) {
    	let div0;
    	let h10;
    	let t0;
    	let t1_value = /*$station*/ ctx[5].id + "";
    	let t1;
    	let t2;
    	let h11;
    	let t3_value = /*status*/ ctx[3].msg + "";
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let div3;
    	let div2;
    	let t8;
    	let div1;
    	let i;
    	let current;
    	let dispose;
    	let if_block = /*$user*/ ctx[6].isAdmin && create_if_block_3(ctx);
    	const nowplaying = new NowPlaying({ $$inline: true });
    	const playlist = new Playlist({ $$inline: true });
    	playlist.$on("play", /*play*/ ctx[8]);
    	const cooldowntimer = new CooldownTimer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h10 = element("h1");
    			t0 = text("Listening to: ");
    			t1 = text(t1_value);
    			t2 = space();
    			h11 = element("h1");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			create_component(nowplaying.$$.fragment);
    			t6 = space();
    			create_component(playlist.$$.fragment);
    			t7 = space();
    			div3 = element("div");
    			div2 = element("div");
    			create_component(cooldowntimer.$$.fragment);
    			t8 = space();
    			div1 = element("div");
    			i = element("i");
    			attr_dev(h10, "class", "svelte-1rhi1ai");
    			add_location(h10, file$7, 206, 6, 4435);
    			attr_dev(h11, "class", "svelte-1rhi1ai");
    			add_location(h11, file$7, 207, 6, 4479);
    			attr_dev(div0, "class", "top svelte-1rhi1ai");
    			add_location(div0, file$7, 205, 4, 4410);
    			attr_dev(i, "class", "fas fa-music svelte-1rhi1ai");
    			add_location(i, file$7, 225, 10, 4938);
    			attr_dev(div1, "class", "addBtnIcons svelte-1rhi1ai");
    			add_location(div1, file$7, 224, 8, 4901);
    			attr_dev(div2, "class", "addBtn svelte-1rhi1ai");
    			add_location(div2, file$7, 222, 6, 4822);
    			attr_dev(div3, "class", "buttons svelte-1rhi1ai");
    			add_location(div3, file$7, 221, 4, 4793);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h10);
    			append_dev(h10, t0);
    			append_dev(h10, t1);
    			append_dev(div0, t2);
    			append_dev(div0, h11);
    			append_dev(h11, t3);
    			insert_dev(target, t4, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(nowplaying, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(playlist, target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			mount_component(cooldowntimer, div2, null);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			append_dev(div1, i);
    			current = true;
    			dispose = listen_dev(div2, "click", /*openSearch*/ ctx[7], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$station*/ 32) && t1_value !== (t1_value = /*$station*/ ctx[5].id + "")) set_data_dev(t1, t1_value);
    			if ((!current || dirty & /*status*/ 8) && t3_value !== (t3_value = /*status*/ ctx[3].msg + "")) set_data_dev(t3, t3_value);

    			if (/*$user*/ ctx[6].isAdmin) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t5.parentNode, t5);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(nowplaying.$$.fragment, local);
    			transition_in(playlist.$$.fragment, local);
    			transition_in(cooldowntimer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(nowplaying.$$.fragment, local);
    			transition_out(playlist.$$.fragment, local);
    			transition_out(cooldowntimer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t4);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(nowplaying, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(playlist, detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div3);
    			destroy_component(cooldowntimer);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(205:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (203:27) 
    function create_if_block_2(ctx) {
    	let h1;
    	let t0;
    	let t1_value = /*$station*/ ctx[5].error + "";
    	let t1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("Error: ");
    			t1 = text(t1_value);
    			attr_dev(h1, "class", "svelte-1rhi1ai");
    			add_location(h1, file$7, 203, 4, 4361);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$station*/ 32 && t1_value !== (t1_value = /*$station*/ ctx[5].error + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(203:27) ",
    		ctx
    	});

    	return block;
    }

    // (201:2) {#if !$station}
    function create_if_block_1$1(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Loading";
    			attr_dev(h1, "class", "svelte-1rhi1ai");
    			add_location(h1, file$7, 201, 4, 4310);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(201:2) {#if !$station}",
    		ctx
    	});

    	return block;
    }

    // (210:4) {#if $user.isAdmin}
    function create_if_block_3(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let current;

    	const qrcode = new QRCode_1({
    			props: {
    				codeValue: /*$location*/ ctx[4],
    				squareSize: "200"
    			},
    			$$inline: true
    		});

    	let player_1_props = {};
    	const player_1 = new Player({ props: player_1_props, $$inline: true });
    	/*player_1_binding*/ ctx[19](player_1);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(qrcode.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(player_1.$$.fragment);
    			attr_dev(div0, "class", "qrcode svelte-1rhi1ai");
    			add_location(div0, file$7, 210, 6, 4545);
    			attr_dev(div1, "class", "player svelte-1rhi1ai");
    			add_location(div1, file$7, 213, 6, 4646);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(qrcode, div0, null);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(player_1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const qrcode_changes = {};
    			if (dirty & /*$location*/ 16) qrcode_changes.codeValue = /*$location*/ ctx[4];
    			qrcode.$set(qrcode_changes);
    			const player_1_changes = {};
    			player_1.$set(player_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(qrcode.$$.fragment, local);
    			transition_in(player_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(qrcode.$$.fragment, local);
    			transition_out(player_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(qrcode);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    			/*player_1_binding*/ ctx[19](null);
    			destroy_component(player_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(210:4) {#if $user.isAdmin}",
    		ctx
    	});

    	return block;
    }

    // (234:0) {#if showSearch}
    function create_if_block$3(ctx) {
    	let current;
    	const search = new Search({ $$inline: true });
    	search.$on("close", pop);

    	const block = {
    		c: function create() {
    			create_component(search.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(search, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(search.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(search.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(search, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(234:0) {#if showSearch}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let current_block_type_index;
    	let if_block0;
    	let t1;
    	let if_block1_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_if_block_2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*$station*/ ctx[5]) return 0;
    		if (/*$station*/ ctx[5].error) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*showSearch*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(div0, "class", "bg svelte-1rhi1ai");
    			set_style(div0, "background", /*bgColor*/ ctx[2]);
    			add_location(div0, file$7, 198, 0, 4212);
    			attr_dev(div1, "class", "container svelte-1rhi1ai");
    			add_location(div1, file$7, 199, 0, 4262);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			if_blocks[current_block_type_index].m(div1, null);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*bgColor*/ 4) {
    				set_style(div0, "background", /*bgColor*/ ctx[2]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(div1, null);
    			}

    			if (/*showSearch*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $querystring;
    	let $fp;
    	let $location;
    	let $station;
    	let $user;
    	validate_store(querystring, "querystring");
    	component_subscribe($$self, querystring, $$value => $$invalidate(11, $querystring = $$value));
    	validate_store(fp, "fp");
    	component_subscribe($$self, fp, $$value => $$invalidate(12, $fp = $$value));
    	validate_store(location$1, "location");
    	component_subscribe($$self, location$1, $$value => $$invalidate(4, $location = $$value));
    	validate_store(station, "station");
    	component_subscribe($$self, station, $$value => $$invalidate(5, $station = $$value));
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(6, $user = $$value));
    	let { params = {} } = $$props; //URL params
    	let showSearch = false;
    	let player;
    	let bgColor = getRandomColor();
    	let colorChange;
    	let qrCanvas;

    	const STATUS = {
    		SEARCHING: { msg: "Finding Station..." },
    		CREATING_NEW: { msg: "Starting a new station..." },
    		NOT_FOUND: { msg: "Station not found :(" },
    		OK: { msg: "Tuned in" }
    	};

    	let status = STATUS.SEARCHING;

    	function connect() {
    		if (!$fp) return;
    		let targetId = $location.replace("/", "");

    		if (targetId) {
    			if (!$station || $station.error || $station.id != targetId) {
    				$$invalidate(3, status = STATUS.SEARCHING);
    				joinStation(targetId);
    			}
    		}
    	}

    	onMount(() => {
    		connect();

    		colorChange = setInterval(
    			() => {
    				$$invalidate(2, bgColor = getRandomColor());
    			},
    			1500
    		);
    	});

    	//if url changed
    	const us_location = location$1.subscribe(loc => {
    		connect();
    	});

    	//app was opened with station id url, we wait for fingerprint to load and then we join the station
    	const us_fp = fp.subscribe(_fp => {
    		connect();
    	});

    	const us_station = station.subscribe(_station => {
    		if (!_station) return;
    		let targetId = params.stationId;

    		if (_station.error) {
    			$$invalidate(3, status = STATUS.NOT_FOUND);
    		} else if (_station && _station.id == targetId) {
    			$$invalidate(3, status = STATUS.OK);
    		}
    	});

    	function openSearch() {
    		let urlParams = lib$2.parse($querystring);

    		if (urlParams.hasOwnProperty("search")) {
    			urlParams.search = true;
    			replace($location + "?" + lib$2.stringify(urlParams));
    		} else {
    			urlParams.search = true;
    			push($location + "?" + lib$2.stringify(urlParams));
    		}
    	}

    	function play(e) {
    		let videoId = e.detail;
    		player.playVideo(videoId);
    	}

    	onDestroy(() => {
    		us_location();
    		us_fp();
    		us_station();
    		clearInterval(colorChange);
    	});

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Station> was created with unknown prop '${key}'`);
    	});

    	function player_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, player = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("params" in $$props) $$invalidate(9, params = $$props.params);
    	};

    	$$self.$capture_state = () => {
    		return {
    			params,
    			showSearch,
    			player,
    			bgColor,
    			colorChange,
    			qrCanvas,
    			status,
    			$querystring,
    			$fp,
    			$location,
    			$station,
    			$user
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(9, params = $$props.params);
    		if ("showSearch" in $$props) $$invalidate(0, showSearch = $$props.showSearch);
    		if ("player" in $$props) $$invalidate(1, player = $$props.player);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    		if ("colorChange" in $$props) colorChange = $$props.colorChange;
    		if ("qrCanvas" in $$props) qrCanvas = $$props.qrCanvas;
    		if ("status" in $$props) $$invalidate(3, status = $$props.status);
    		if ("$querystring" in $$props) querystring.set($querystring = $$props.$querystring);
    		if ("$fp" in $$props) fp.set($fp = $$props.$fp);
    		if ("$location" in $$props) location$1.set($location = $$props.$location);
    		if ("$station" in $$props) station.set($station = $$props.$station);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$querystring*/ 2048) {
    			 $$invalidate(0, showSearch = lib$2.parse($querystring).search);
    		}
    	};

    	return [
    		showSearch,
    		player,
    		bgColor,
    		status,
    		$location,
    		$station,
    		$user,
    		openSearch,
    		play,
    		params,
    		colorChange,
    		$querystring,
    		$fp,
    		qrCanvas,
    		STATUS,
    		connect,
    		us_location,
    		us_fp,
    		us_station,
    		player_1_binding
    	];
    }

    class Station extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { params: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Station",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get params() {
    		throw new Error("<Station>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Station>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const routes = {
        // Exact path
        '/': Home,

        // Using named parameters, with last being optional
        '/:stationId': Station
    };

    /* src\App.svelte generated by Svelte v3.18.2 */

    function create_fragment$9(ctx) {
    	let current;
    	const router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $location;
    	validate_store(location$1, "location");
    	component_subscribe($$self, location$1, $$value => $$invalidate(0, $location = $$value));

    	onMount(() => {
    		//in case app was open through a messy url, this code clears it up and also makes back button go back to home
    		let stationId = $location.split("/")[1];

    		if (stationId) {
    			replace("/");
    			push("/" + stationId);
    		}
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$location" in $$props) location$1.set($location = $$props.$location);
    	};

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
