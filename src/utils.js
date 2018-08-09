// utils.js

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}

function sum(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++)
        sum += arr[i];
    return sum;
}

function avg(arr) {
    return sum(arr) / arr.length;
}

function scale(vec, scale) {
    return [vec[0] * scale, vec[1] * scale];
}

function norm(vec) {
    let len = Math.sqrt(dot(vec, vec));
    if (len === 0) return vec;
    return [vec[0] / len, vec[1] / len];
}

function clamp(value, low, high) {
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

function rbg2hex(rgb) {
    return PIXI.utils.rgb2hex([clamp(rgb[0], 0, 1), clamp(rgb[1], 0, 1), clamp(rgb[2], 0, 1)]);
}