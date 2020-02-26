function rand(min, max) {
    return min + Math.random() * (max - min);
}

export function getRandomColor() {
    var h = rand(1, 360);
    var s = rand(60, 80);
    var l = rand(60, 80);
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}