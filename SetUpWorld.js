const camPos = new Float32Array([0.05, -0.4, 0.25]);
const camDir = new Float32Array([-0.15, 0.05]);

var UP = false;
var DOWN = false;
var LEFT = false;
var RIGHT = false;
var W = false;
var A = false;
var S = false;
var D = false;
var SHIFT = false;
var SPACE = false;

var SPHERES = [];


function createSphere(
    x,y,z,
    radius,
    r,g,b,
    emitStr=0,
    smoothness=0,
    specularProb=Math.ceil(smoothness),
    transparency=0,
    refractiveIndex=1,
    emitR=1,emitG=1,emitB=1,
    specR=r,specG=g,specB=b
){
    SPHERES.push(
        x,y,z,
        radius,
        r,g,b,
        emitStr,
        emitR,emitG,emitB,
        smoothness,
        specR,specG,specB,
        specularProb,
        transparency,
        refractiveIndex,
        /*padding*/1,1
    );
}


createSphere(-3,-0.55,12.5, 2, 1,0,0, 0, 0.95, 0.07, 0, 1 ,1,1,1, 1,1,1); // glossy red ball
createSphere(0.5,-1.015,13.5, 1.5, 1,1,1); // white ball
createSphere(3,-0.75,11, 1.65, 0,1,0); // green ball
createSphere(0,-2.0,9, 0.5, 0,1,1, 10, 0, 0, 0, 1, 0,1,1); // glowing cyan ball
createSphere(-3,-1.5,7.5, 1, 0.75,0.75,0.75, 0, 0.95); // mirror ball
//createSphere(2,-1.75,7.5, 0.75, 0,0,1, 0, 0.9, 0.07, 0, 0, 0,0,0, 1,1,1); // glossy blue ball
//createSphere(-2.25,-2,5, 0.5, 1,1,0, 5, 0, 0, 0, 0, 1,1,0); // glowing yellow ball
createSphere(0,-1.5,5, 1, 0.235/1.6,0.891/1.6,0.501/1.6, 0, 0.9, 0.2, 0.45, 1.5168, 1,1,1, 1,1,1); // glass ball
createSphere(0,-9002.5,0, 9000, 0.5,0.5,0.5); // floor

//createSphere(-600,800,400,600,1,1,1,40);


/*
createSphere(-3,-0.55,12.5,2,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(0.5,-1.015,13.5,1.5,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(3,-0.75,11,1.65,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(0,-2.0,9,0.5,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(-2,-1.5,7.5,1,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(2,-1.75,7.5,0.75,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(0.25,-1.5,5,1,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(-3,-1.25,4.5,1.25,Math.random(),Math.random(),Math.random(),0,1,Math.random()/1.125,0,1,1,1,1,1,1,1);
createSphere(0,-9002.5,0, 9000, 0.9,0.9,0.9, 0, 1, 0.35, 0, 1,1,1, 1,1,1);
*/

SPHERES = new Float32Array(SPHERES);
var NUM_SPHERES = SPHERES.length / 20;