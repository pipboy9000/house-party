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

function getStation(stationId, fingerprint) {
    console.log('addVideo (stationId: ' + stationId + '  fp:' + fingerprint);

    if (!stations[stationId]) {
        console.log("station doesn't exist");
        return false;
    }

    var station = stations[stationId];

    if (!station.users[fingerprint]) {
        console.log("user is not in the station");
        return false;
    }

    return station;
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
        state: "paused",
        nowPlaying: null,
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

function like(stationId, videoId, fingerprint) {

    console.log('like video (stationId: ' + stationId + '  fp:' + fingerprint + '   video:' + videoId);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(video => video.videoId === videoId);
    vid.likes[fingerprint] = true;
    delete vid.dislikes[fingerprint];

    return station;
}

function dislike(stationId, videoId, fingerprint) {

    console.log('like video (stationId: ' + stationId + '  fp:' + fingerprint + '   video:' + videoId);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(video => video.videoId === videoId);
    vid.dislikes[fingerprint] = true;
    delete vid.likes[fingerprint];

    return station;
}

function addVideo(stationId, video, fingerprint) {

    console.log('addVideo (stationId: ' + stationId + '  fp:' + fingerprint);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    var user = station.users[fingerprint];
    var now = Date.now();
    if (now - user.addedSongAt > settings.WAIT) {
        user.addedSongAt = now;
        video.likes = { [fingerprint]: true }
        video.dislikes = {};
        station.playlist.push(video);
        return station;
    } else {
        console.log('you need to wait ' + ((station.settings.WAIT - (now - user.addedSongAt)) / 1000).toString() + ' seconds');
        return false;
    }
}

function setPlayerState(stationId, videoId, state, fingerprint) {
    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let currentVideo = station.playlist.find(video => video.videoId === videoId);
    if (!currentVideo) {
        station.nowPlaying = { title: "Free Stylin" };
    } else {
        station.nowPlaying = currentVideo;
    }

    //-1 – unstarted
    // 0 – ended
    // 1 – playing
    // 2 – paused
    // 3 – buffering
    // 5 – video cued

    switch (state) {
        case -1:
        case 0:
        case 2:
            station.state = "paused";
            break;
        case 1:
            station.state = "playing";
            break;
        case 3:
            station.state = "buffering";
            break;
        default:
            station.state = null
    }

    return station;
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

    socket.on("like", function (stationId, videoId, fingerprint) {
        let station = like(stationId, videoId, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("dislike", function (stationId, videoId, fingerprint) {
        let station = dislike(stationId, videoId, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("setPlayerState", function (stationId, videoId, state, fingerprint) {
        let station = setPlayerState(stationId, videoId, state, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

});

http.listen(port, function () {
    console.log('listening on *:' + port);
});