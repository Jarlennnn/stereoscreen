
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
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
        $capture_state() { }
        $inject_state() { }
    }

    var credentials = {
        client_id: "dba303289aaf47eaaff7eaf4e872f5c9",
        client_scret: "cd49ad6a5d544a2d932261bd1934d9dc",
        redirect_uri: "http://localhost:5000/callback"
    };

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

    const electron = window.require('electron');
    const remote = electron.remote;
    const { BrowserWindow, dialog, Menu } = remote;
    const fs = window.require("fs");

    const BASE_URL = "https://api.spotify.com/v1";
    let TOKEN = null;

    const currentlyPlayingWatcher = readable(null, function start(set) {
        // const interval = setInterval(() => {
        //     getCurrentlyPlaying()
        //         .then((item) => {
        //             that.set(item)
        //         })
        //         .catch((error) => console.error(error));
        // }, 2500);
        getCurrentlyPlaying()
        .then((item) => {
            set(item);
        })
        .catch((error) => console.error(error));

        return function stop() {
            // clearInterval(interval);
        }
    });

    const isAuthenticated = () => TOKEN != null && TOKEN.expires > Date.now();

    const loadPreviousAuthentication = () => {
        try{
            const data = fs.readFileSync("tokens.json", {
                encoding: 'utf8',
                flag: 'r'
            });

            if(data.length > 0){
                TOKEN = JSON.parse(data);
            }
        }
        catch(e) { console.error(e); }    
    };

    const doAuth = () => 
    {       
        if(TOKEN == null){
            return new Promise((resolve, reject) => {
                var authWindow = new BrowserWindow({
                    width: 1000,
                    height: 800,
                    show: false,
                });
            
                var scopes = "user-read-playback-state";
                authWindow.loadURL(`https://accounts.spotify.com/authorize?response_type=code&client_id=${credentials.client_id}&redirect_uri=${credentials.redirect_uri}&scope=${scopes}`);
                authWindow.show();
            
                function handleCallback(url) {
                    console.log(url);
            
                    let query = url.split("?")[1];
                    let code = query.substr(5, query.length - 5);  
            
                    if (code) {
                        // Close the browser if code found or error
                        authWindow.destroy();
                    }  
                    
                    //save to file and fulfill promise
                    requestAndSaveToken(code, function(boolResult){
                        if(boolResult){
                            resolve(true);
                        }
                        else{
                            reject();
                        }
                    });
                }
            
                authWindow.webContents.on('will-navigate', function (event, url) {
                    handleCallback(url);
                });
            
                authWindow.webContents.on('did-get-redirect-request', function (
                    event,
                    oldUrl,
                    newUrl
                ) {
                    handleCallback(newUrl);
                });
                // Reset the authWindow on close
                authWindow.on(
                    'close',
                    function () {
                        authWindow = null;
                    },
                    false
                ); 
            });
        }
        else{
            return new Promise((resolve, reject) => {
                refreshToken(TOKEN.refresh_token, function(boolResult){
                    if(boolResult){
                        resolve(true);
                    }
                    else{
                        reject();
                    }
                });
            });
        }    
    };

    const requestAndSaveToken = (code, callback) => {
        const promise = fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                'Authorization': 'Basic ' + (new Buffer(credentials.client_id + ':' + credentials.client_scret).toString('base64')),
                'Content-Type': "application/x-www-form-urlencoded"
            },
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${credentials.redirect_uri}`
        })
        .then((resp) => resp.json())
        .then((json) => {
            let _tokens = {
                access_token: json.access_token,
                refresh_token: json.refresh_token,
                expires: Date.now() + (json.expires_in * 1000)
            };

            TOKEN = _tokens;

            fs.writeFileSync("tokens.json", JSON.stringify(_tokens));
            callback(true);
        })
        .catch((error) => {
            console.error(error);
            fs.writeFileSync("error.txt", error.toString());
            callback(false);
        });
    };


    const refreshToken = (refreshToken, callback) => {
        const promise = fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                'Authorization': 'Basic ' + (new Buffer(credentials.client_id + ':' + credentials.client_scret).toString('base64')),
                'Content-Type': "application/x-www-form-urlencoded"
            },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        })
        .then((resp) => resp.json())
        .then((json) => {

            let _tokens = {
                access_token: json.access_token,
                refresh_token: refreshToken,
                expires: Date.now() + (json.expires_in * 1000)
            };

            TOKEN = _tokens;

            fs.writeFileSync("tokens.json", JSON.stringify(_tokens));
            callback(true);
        })
        .catch((error) => {
            console.error(error);
            fs.writeFileSync("error.txt", error.toString());
            callback(false);
        });
    };

    const getAuthHeaders = () => {
        return {
            "Authorization": `Bearer ${TOKEN.access_token}`,
            'Content-Type': "application/json"
        }
    };

    const getCurrentlyPlaying = async () => {

        console.log(TOKEN);
        

        const promise = fetch(`${BASE_URL}/me/player`, {
            headers: getAuthHeaders(),
        })
            .then((response) => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    if (response.status == 429) ;
                }
            })
            .then((json) => json);

        return promise;
    };

    /* src\components\spotify\CurrentlyPlaying.svelte generated by Svelte v3.19.1 */

    const file = "src\\components\\spotify\\CurrentlyPlaying.svelte";

    // (14:12) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Nothing is playing.";
    			add_location(p, file, 14, 16, 461);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(14:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (12:12) {#if currentPlaybackState != null && currentPlaybackState.is_playing}
    function create_if_block(ctx) {
    	let p;
    	let t_value = /*currentPlaybackState*/ ctx[0].item.name + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 12, 16, 383);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentPlaybackState*/ 1 && t_value !== (t_value = /*currentPlaybackState*/ ctx[0].item.name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(12:12) {#if currentPlaybackState != null && currentPlaybackState.is_playing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let span0;
    	let t1;
    	let div0;
    	let span1;
    	let t2;
    	let span4;
    	let span3;
    	let span2;

    	function select_block_type(ctx, dirty) {
    		if (/*currentPlaybackState*/ ctx[0] != null && /*currentPlaybackState*/ ctx[0].is_playing) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "Very nice";
    			t1 = space();
    			div0 = element("div");
    			span1 = element("span");
    			if_block.c();
    			t2 = space();
    			span4 = element("span");
    			span3 = element("span");
    			span2 = element("span");
    			attr_dev(span0, "class", "album-cover svelte-12cee41");
    			add_location(span0, file, 6, 4, 160);
    			attr_dev(span1, "class", "title svelte-12cee41");
    			add_location(span1, file, 10, 8, 262);
    			attr_dev(span2, "class", "ball");
    			add_location(span2, file, 19, 16, 614);
    			attr_dev(span3, "class", "track svelte-12cee41");
    			add_location(span3, file, 18, 12, 576);
    			attr_dev(span4, "class", "time-container");
    			add_location(span4, file, 17, 8, 533);
    			attr_dev(div0, "class", "title-and-time svelte-12cee41");
    			add_location(div0, file, 9, 4, 224);
    			attr_dev(div1, "class", "currently-playing svelte-12cee41");
    			add_location(div1, file, 5, 0, 123);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, span1);
    			if_block.m(span1, null);
    			append_dev(div0, t2);
    			append_dev(div0, span4);
    			append_dev(span4, span3);
    			append_dev(span3, span2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
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

    function instance($$self, $$props, $$invalidate) {
    	let { currentPlaybackState } = $$props;
    	const writable_props = ["currentPlaybackState"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CurrentlyPlaying> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("currentPlaybackState" in $$props) $$invalidate(0, currentPlaybackState = $$props.currentPlaybackState);
    	};

    	$$self.$capture_state = () => ({ currentPlaybackState });

    	$$self.$inject_state = $$props => {
    		if ("currentPlaybackState" in $$props) $$invalidate(0, currentPlaybackState = $$props.currentPlaybackState);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentPlaybackState];
    }

    class CurrentlyPlaying extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { currentPlaybackState: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CurrentlyPlaying",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentPlaybackState*/ ctx[0] === undefined && !("currentPlaybackState" in props)) {
    			console.warn("<CurrentlyPlaying> was created without expected prop 'currentPlaybackState'");
    		}
    	}

    	get currentPlaybackState() {
    		throw new Error("<CurrentlyPlaying>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentPlaybackState(value) {
    		throw new Error("<CurrentlyPlaying>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\spotify\Spotify.svelte generated by Svelte v3.19.1 */

    const file$1 = "src\\components\\spotify\\Spotify.svelte";

    // (34:4) {:catch error}
    function create_catch_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*error*/ ctx[3] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Error! ");
    			t1 = text(t1_value);
    			add_location(p, file$1, 34, 8, 1084);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(34:4) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (28:4) {:then authenticated}
    function create_then_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*authenticated*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(28:4) {:then authenticated}",
    		ctx
    	});

    	return block;
    }

    // (31:8) {:else}
    function create_else_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Failed to auth!";
    			add_location(p, file$1, 31, 12, 1017);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(31:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (29:8) {#if authenticated}
    function create_if_block$1(ctx) {
    	let current;

    	const currentlyplaying = new CurrentlyPlaying({
    			props: {
    				currentPlaybackState: /*playbackState*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(currentlyplaying.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(currentlyplaying, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const currentlyplaying_changes = {};
    			if (dirty & /*playbackState*/ 1) currentlyplaying_changes.currentPlaybackState = /*playbackState*/ ctx[0];
    			currentlyplaying.$set(currentlyplaying_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(currentlyplaying.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(currentlyplaying.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(currentlyplaying, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(29:8) {#if authenticated}",
    		ctx
    	});

    	return block;
    }

    // (26:34)           <p>Authentisering pågår...</p>      {:then authenticated}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Authentisering pågår...";
    			add_location(p, file$1, 26, 8, 817);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(26:34)           <p>Authentisering pågår...</p>      {:then authenticated}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 2,
    		error: 3,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*authenticationPromise*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "container");
    			add_location(div, file$1, 23, 0, 738);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[2] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
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

    function instance$1($$self, $$props, $$invalidate) {
    	loadPreviousAuthentication();
    	const authenticationPromise = doAuth();
    	let playbackState = null;

    	authenticationPromise.then(authenticated => {
    		if (authenticated) {
    			currentlyPlayingWatcher.subscribe(value => {
    				$$invalidate(0, playbackState = value);
    				console.log(value);
    			});
    		}
    	});

    	$$self.$capture_state = () => ({
    		isAuthenticated,
    		currentlyPlayingWatcher,
    		doAuth,
    		loadPreviousAuthentication,
    		CurrentlyPlaying,
    		authenticationPromise,
    		playbackState,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("playbackState" in $$props) $$invalidate(0, playbackState = $$props.playbackState);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [playbackState, authenticationPromise];
    }

    class Spotify extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spotify",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.19.1 */
    const file$2 = "src\\App.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let current;
    	const spotify = new Spotify({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(spotify.$$.fragment);
    			attr_dev(main, "class", "svelte-amf0cs");
    			add_location(main, file$2, 4, 0, 79);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(spotify, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spotify.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spotify.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(spotify);
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

    function instance$2($$self, $$props, $$invalidate) {
    	$$self.$capture_state = () => ({ Spotify });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,	
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
