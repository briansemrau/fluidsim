// mathutil.js

function dot(a, b) {
    return a.reduce((total, a_i, index) => { return total + a_i * b[index] }, 0)
}

function pow2(value) {
    return value * value
}

function sum(arr) {
    return arr.reduce((total, value) => { return total + value })
}

function avg(arr) {
    return sum(arr) / arr.length;
}

function vec2sum(vecarr) {
    return vecarr.reduce((total, vec) => { return total.map((value, i) => { return value + vec[i] }) }, new Array(2).fill(0))
}

function scale(vec, scale) {
    return vec.map((value) => { return value * scale })
}

function norm(vec) {
    let sum = Math.sqrt(vec.reduce((total, value) => { return total + value * value }, 0));
    if (sum === 0) return vec;
    return vec.map((value) => { return value / sum });
}