import moment from "moment";

function rand(min, max) {
    return min + Math.random() * (max - min);
}

let lastHue = 0;

export function getRandomColor() {
    var h = (lastHue + 107) % 360 + rand(10, 30); //to make the hues different each time
    lastHue = h;
    var s = rand(60, 80);
    var l = rand(60, 80);
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}

export function parseDuration(str) {
    let duration = moment.duration(str);
    let h = duration._data.hours;
    let m = duration._data.minutes;
    let s = duration._data.seconds;

    let res = "";

    if (h) {
        if (h > 9) {
            res += h + ":";
        } else {
            res += '0' + h + ":";
        }
    }

    if (m > 9) {
        res += m + ":";
    } else {
        res += '0' + m + ":";
    }

    if (s > 9) {
        res += s;
    } else {
        res += '0' + s;
    }

    return res;
}