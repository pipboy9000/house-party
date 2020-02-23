'use strict'

var id = 120;

function generateId() {
    var r = Math.round(Math.random() * 1632960 + 46655);
    r = r.toString(36).toUpperCase();
    return r
}
module.exports = { generateId };

