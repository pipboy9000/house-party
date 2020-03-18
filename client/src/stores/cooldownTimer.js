import { writable } from 'svelte/store';

export const cooldown = writable({
    show: false,
    duration: 0,
})

export function setCooldown(duration) {
    cooldown.set({
        show: true,
        duration: duration
    })

    setTimeout(() => {
        cooldown.update(c => {
            c.show = false;
            c.duration = -1;
            return c;
        })
    }, duration + 1000);
}