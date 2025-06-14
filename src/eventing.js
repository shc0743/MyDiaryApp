export class MyEventTarget extends EventTarget {
    #managed = new Map();
    constructor(...args) {
        super(...args);
    }

    /**
     * @param {string|Symbol|number} identity 
     * @param {string} event 
     * @param {Function} handler 
     */
    add(identity, event, handler) {
        if (this.#managed.has(identity)) {
            this.#managed.get(identity).add({ event, handler });
        } else {
            this.#managed.set(identity, new Set([{ event, handler }]));
        }
        this.addEventListener(event, handler);
    }
    /**
     * @param {string|Symbol|number} identity 
     */
    clear(identity) {
        if (this.#managed.has(identity)) {
            this.#managed.get(identity).forEach(({ event, handler }) => {
                this.removeEventListener(event, handler);
            });
        }
        this.#managed.delete(identity);
    }
    dispose() {
        for (const [identity, events] of this.#managed) {
            this.clear(identity);
        }
        this.#managed.clear();
    }
    dispatch(event) {
        return this.dispatchEvent(new CustomEvent(event));
    }
}
export const app_event = new MyEventTarget();

