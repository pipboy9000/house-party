import Fingerprint2 from 'fingerprintjs2';

import { writable } from 'svelte/store';

export const fp = writable(false);

if (window.requestIdleCallback) {
    requestIdleCallback(function () {
        Fingerprint2.get(function (components) {
            var values = components.map(function (component) { return component.value })
            var murmur = Fingerprint2.x64hash128(values.join(''), 31)
            fp.set(murmur);
        })
    })
} else {
    setTimeout(function () {
        Fingerprint2.get(function (components) {
            var values = components.map(function (component) { return component.value })
            var murmur = Fingerprint2.x64hash128(values.join(''), 31)
            fp.set(murmur)
        })
    }, 500)
}

