import io from 'socket.io-client';
// const socket = io('http://localhost:3000');
const socket = io('https://house-party-live.herokuapp.com');

import { push, pop, replace } from "svelte-spa-router";
import { location } from "svelte-spa-router";

import { fp } from "./stores/fingerprint.js";
import { station } from './stores/station.js';
import { user } from './stores/user.js';
import { get } from 'svelte/store';

socket.on("setStation", function (newStation) {
    station.set(newStation);
    if (!newStation.error) {
        if (get(location) == '/') {
            push('/' + newStation.id);
        } else {
            replace('/' + newStation.id);
        }
    }
});

socket.on("setUser", function (u) {
    user.set(u)
})

socket.on("videoAdded", function (waitTime) {
    // user.setCooldown(waitTime);
})

export function newStation() {
    socket.emit("newStation", get(fp))
}

export function joinStation(stationId) {
    socket.emit("join", stationId, get(fp))
}

export function addVideo(video) {
    socket.emit("addVideo", get(station).id, video, get(fp));
}

export function like(videoId) {
    socket.emit("like", get(station).id, videoId, get(fp));
}

export function dislike(videoId) {
    socket.emit("dislike", get(station).id, videoId, get(fp));
}

export function clearLike(videoId) {
    socket.emit("clearLike", get(station).id, videoId, get(fp));
}

export function clearDislike(videoId) {
    socket.emit("clearDislike", get(station).id, videoId, get(fp));
}

export function setPlayerState(state, videoId) {
    socket.emit("setPlayerState", get(station).id, videoId, state, get(fp))
}

export function videoError(videoId) {
    socket.emit("videoError", get(station).id, videoId, get(fp))
}

function keepAlive() {
    socket.emit("keepAlive")
    let delay = Math.random() * 60000 + 30000
    setTimeout(keepAlive, delay)
}

keepAlive();