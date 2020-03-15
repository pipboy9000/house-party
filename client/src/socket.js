import io from 'socket.io-client';
// const socket = io('http://localhost:3000');
const socket = io('https://house-party-live.herokuapp.com');

import { push, pop, replace } from "svelte-spa-router";
import { location, querystring } from "svelte-spa-router";

import { fp } from "./stores/fingerprint.js";
import { station } from './stores/station.js';
import { user } from './stores/user.js';
import { get } from 'svelte/store';

socket.on("setStation", function (newStation) {
    station.set(newStation);
    if (!newStation.error) {
        let loc = get(location);
        if (get(location) == '/') {
            push('/' + newStation.id);
        } else {
            if (loc != '/' + newStation.id) {
                replace('/' + newStation.id);
            }
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

export function getStation() {
    socket.emit("getStation", get(station).id, get(fp));
}

export function joinStation(stationId) {
    socket.emit("join", stationId, get(fp))
}

export function addVideo(video) {
    socket.emit("addVideo", get(station).id, video, get(fp));
}

export function like(uid) {
    socket.emit("like", get(station).id, uid, get(fp));
}

export function dislike(uid) {
    socket.emit("dislike", get(station).id, uid, get(fp));
}

export function clearLike(uid) {
    socket.emit("clearLike", get(station).id, uid, get(fp));
}

export function clearDislike(uid) {
    socket.emit("clearDislike", get(station).id, uid, get(fp));
}

export function setPlayerState(state, video) {
    socket.emit("setPlayerState", get(station).id, video, state, get(fp))
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