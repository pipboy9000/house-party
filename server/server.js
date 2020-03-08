const express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var utils = require('./utils');

var stations = {};

var users = {}

var settings = {
    WAIT: 5000 //wait time before adding song
}

var port = process.env.PORT || 3000;

app.get('/stations', (req, res) => res.send(stations))

function isIdTaken(id) {
    return stations[id] != null;
}

function getStationId() {
    var id = utils.generateId();
    while (isIdTaken(id)) {
        id = utils.generateId();
    }
    return id;
}

function newStation(creatorsFingerprint) {
    if (!creatorsFingerprint ||
        creatorsFingerprint.length < 5 ||
        creatorsFingerprint.includes(' ')) {
        console.log('Invalid fingerprint: ' + creatorsFingerprint)
        return;
    }

    console.log('new station (fp: ' + creatorsFingerprint + ')')

    var id = getStationId()
    var station = {
        id,
        settings,
        creatorsFingerprint,
        title: 'cool station sis',
        users: {
            [creatorsFingerprint]: {
                addedSongAt: 0
            }
        },
        playlist: []
    };

    stations[id] = station;
    return station;
}

function joinStation(id, fingerprint) {
    console.log('join station: ' + id + ' fp: ' + fingerprint);
    if (stations[id]) {
        if (!stations[id].users[fingerprint]) {
            stations[id].users[fingerprint] = {
                addedSongAt: 0
            }
        }
        return stations[id]
    } else {
        console.log('station not found')
        return { error: `Station ${id} not found` };
    }
}

function addVideo(stationId, video, fingerprint) {

    console.log('addVideo (stationId: ' + stationId + '  fp:' + fingerprint);

    if (!stations[stationId]) {
        console.log("can't add song, station doesn't exist");
        return false;
    }

    var station = stations[stationId];

    if (!station.users[fingerprint]) {
        console.log("can't add song, user is not in the station");
        return false;
    }

    var user = station.users[fingerprint];
    var now = Date.now();
    if (now - user.addedSongAt > settings.WAIT) {
        user.addedSongAt = now;
        station.playlist.push(video);
        return station;
    } else {
        console.log('you need to wait ' + ((station.settings.WAIT - (now - user.addedSongAt)) / 1000).toString() + ' seconds');
        return false;
    }
}

io.on('connection', function (socket) {
    console.log('user connected, active connections: ' + io.engine.clientsCount);

    socket.on('disconnect', function () {
        console.log('user disconnected, active connections: ' + io.engine.clientsCount);
    });

    socket.on('newStation', function (fingerprint) {
        var station = newStation(fingerprint);
        if (station) {
            socket.join(station.id);
            socket.emit('setStation', station);
            socket.emit('setUser', {
                isAdmin: true
            })
        }
    });

    socket.on('join', function (id, fingerprint) {
        station = joinStation(id, fingerprint);
        socket.join(id);
        socket.emit('setStation', station);
        if (station.creatorsFingerprint == fingerprint) {
            socket.emit('setUser', {
                isAdmin: true
            })
        }
    });

    socket.on('leave', function (id) {
        console.log('leave station: ' + id);
        socket.leave(id);
    });

    socket.on('addVideo', function (stationId, videoId, fingerprint) {
        console.log("Add video");
        let station = addVideo(stationId, videoId, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
            socket.emit("videoAdded", station.settings.WAIT);
        }
    });
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});