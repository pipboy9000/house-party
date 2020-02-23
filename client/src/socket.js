import io from 'socket.io-client';
const socket = io('http://localhost:3000');

import { push, pop, replace } from "svelte-spa-router";
import { location } from "svelte-spa-router";

import { fp } from "./stores/fingerprint.js";
import { station } from './stores/station.js';
import { user } from './stores/user.js';
import { get } from 'svelte/store';

socket.on("setStation", function (newStation) {
    debugger;
    station.set(newStation);

    if (!newStation.error) {
        if (get(location) == '/') {
            push(`/${newStation.id}`);
        } else {
            replace(`/${newStation.id}`);
        }
    }
});

socket.on("setUser", function (u) {
    user.set(u)
})

export function newStation() {
    socket.emit("newStation", get(fp))
}

export function joinStation(stationId) {
    socket.emit("join", stationId, get(fp))
}