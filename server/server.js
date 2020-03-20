const express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var utils = require('./utils');

var stations = {};

var users = {}

const settings = {
    // WAIT: 5000
    WAIT: 3 * 60 * 1000 //wait time before adding song (3 minutes)
    // WAIT: 15 * 1000 //wait time before adding song (15 seconds)
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
    console.log(`get stattion ${stationId}`);

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

function sort(playlist) {
    let sorted = playlist.sort((va, vb) => {
        let aSum = Object.keys(va.likes).length - Object.keys(va.dislikes).length
        let bSum = Object.keys(vb.likes).length - Object.keys(vb.dislikes).length
        return bSum - aSum;
    });
    return sorted;
}

function sortPlaylist(station) {
    //if a song is playing then we only reorder the songs beneth the one currently playing
    if (station.nowPlaying) {
        let nowPlayingIdx = station.playlist.findIndex(v => v.videoId == station.nowPlaying.videoId);
        let beforeNowPlaying = station.playlist.slice(0, nowPlayingIdx + 1);
        let afterNowPlaying = station.playlist.slice(nowPlayingIdx + 1, station.playlist.length);
        let sorted = sort(afterNowPlaying);
        station.playlist = beforeNowPlaying.concat(sorted);
    } else {
        station.playlist = sort(station.playlist);
    }
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
        playlistUid: 0,
        playlist: []
    };

    stations[id] = station;
    return station;
}

function setUserInStation(fp, stationId) {
    let currentStation = users[fp].inStation;
    if (!currentStation || currentStation != stationId) {

    }
    if (users[fp].inStation) {
        users[fp].inStation
    }
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

function like(stationId, uid, fingerprint) {

    console.log('like video (stationId: ' + stationId + '  fp:' + fingerprint + '   video uid:' + uid);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(v => v.uid === uid);
    if (!vid) return;

    vid.likes[fingerprint] = true;
    if (vid.dislikes[fingerprint])
        delete vid.dislikes[fingerprint];

    sortPlaylist(station);

    return station;
}

function dislike(stationId, uid, fingerprint) {

    console.log('like video (stationId: ' + stationId + '  fp:' + fingerprint + '   video uid:' + uid);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(v => v.uid === uid);
    if (!vid) return;

    vid.dislikes[fingerprint] = true;
    if (vid.likes[fingerprint])
        delete vid.likes[fingerprint];

    sortPlaylist(station);

    return station;
}

function clearLike(stationId, uid, fingerprint) {
    console.log('clear like video (stationId: ' + stationId + '  fp:' + fingerprint + '   video:' + uid);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(v => v.uid === uid);
    if (!vid) return;

    if (vid.likes[fingerprint])
        delete vid.likes[fingerprint];

    sortPlaylist(station);

    return station;
}

function clearDislike(stationId, uid, fingerprint) {
    console.log('clear dislike video (stationId: ' + stationId + '  fp:' + fingerprint + '   video uid:' + uid);

    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(v => v.uid === uid);
    if (!vid) return;

    if (vid.dislikes[fingerprint])
        delete vid.dislikes[fingerprint];

    sortPlaylist(station);

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
        video.uid = station.playlistUid++;
        station.playlist.push(video);
        sortPlaylist(station);
        return station;
    } else {
        console.log('you need to wait ' + ((station.settings.WAIT - (now - user.addedSongAt)) / 1000).toString() + ' seconds');
        return false;
    }
}

function setPlayerState(stationId, video, state, fingerprint) {
    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let currentVideo = station.playlist.find(v => v.uid === video.uid);
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

function videoError(stationId, uid, fingerprint) {
    let station = getStation(stationId, fingerprint);
    if (!station) return;

    let vid = station.playlist.find(v => {
        return v.uid == uid;
    })

    if (vid) {
        vid.error = true;
        return station;
    }
}

function setUserInStation(fp, stationId, socket) {
    let user = users[fp];

    if (user && users.inStation && user.inStation != stationId) {
        socket.leave(user.inStation)
    }
    users[fp] = {
        inStation: stationId
    };
    socket.join(stationId);
}


io.on('connection', function (socket) {
    console.log('user connected, active connections: ' + io.engine.clientsCount);

    socket.on("disconnect", function () {
        console.log('user disconnected, active connections: ' + io.engine.clientsCount);
    });

    socket.on("newStation", function (fp) {
        var station = newStation(fp);
        if (station) {
            setUserInStation(fp, station.id, socket);
            socket.emit('setStation', station);
            socket.emit('setUser', {
                isAdmin: true
            })
        }
    });

    socket.on("join", function (stationId, fp) {
        station = joinStation(stationId, fp);

        if (station)
            setUserInStation(fp, stationId, socket);

        socket.emit('setStation', station);

        if (station.creatorsFingerprint == fp) {
            socket.emit('setUser', {
                isAdmin: true
            })
        }
    });

    socket.on("leave", function (fp) {
        console.log('leave station: ' + fp);
        let user = users[fp];
        if (user && user.inStation) {
            socket.leave(user.inStation);
            delete users[fp]
        }
    });

    socket.on("addVideo", function (stationId, video, fingerprint) {
        console.log("Add video");
        let station = addVideo(stationId, video, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
            socket.emit("videoAdded", station.settings.WAIT);
        }
    });

    socket.on("like", function (stationId, uid, fingerprint) {
        let station = like(stationId, uid, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("dislike", function (stationId, uid, fingerprint) {
        let station = dislike(stationId, uid, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("clearLike", function (stationId, uid, fingerprint) {
        let station = clearLike(stationId, uid, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("clearDislike", function (stationId, uid, fingerprint) {
        let station = clearDislike(stationId, uid, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("setPlayerState", function (stationId, video, state, fingerprint) {
        let station = setPlayerState(stationId, video, state, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("videoError", function (stationId, uid, fingerprint) {
        let station = videoError(stationId, uid, fingerprint);
        if (station) {
            io.to(stationId).emit('setStation', station);
        }
    })

    socket.on("getStation", function (stationId, fingerprint) {
        let station = getStation(stationId, fingerprint);
        if (station) {
            socket.emit("setStation", station);
        }
    });

    socket.on("keepAlive", function () {
        console.log('keep alive');
    })
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});