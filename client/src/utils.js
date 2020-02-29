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