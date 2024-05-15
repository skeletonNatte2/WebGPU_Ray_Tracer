//* DIFFUSE: 1
//* METAL: 2
//* GLOSSY: 3
//* REFRACTIVE: 4

const camPos =
new Float32Array([-1, 1.5, 0.5]); // outside scene
//new Float32Array([0.0, -0.4, 0.5]); // cornell box scene

const camDir =
new Float32Array([/*-0.315*/-0.19, -0.065]); // outside scene
//new Float32Array([0, 0]); // cornell box scene

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


function createBall(
    x,y,z,
    radius,
    r,g,b,
    emitStr=0,
    smoothness=0,
    specularProb=Math.ceil(smoothness),
    transparency=0,
    refractiveIndex=1,
    emitR=r,emitG=g,emitB=b,
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
        /*type*/1,
        /*padding*/1
    );
}

function createBallDiffuse(x,y,z,radius,r=1,g=1,b=1,emitStr=0){
    SPHERES.push(
        x,y,z, //~ Position
        radius, //~ Radius
        r,g,b, //~ Color
        emitStr, //~ Emission
        r,g,b, //~ Emission color
        0, //~ Smoothness
        1,1,1, //~ Specular color
        0, //~ Specular probability
        0, //~ Transparency
        1, //~ Index of refraction
        1, //~ Material type (diffuse)
        1 // Padding
    );
}

function createBallMetal(x,y,z,radius,r=1,g=1,b=1,smoothness=1,emitStr=0){
    SPHERES.push(
        x,y,z, //~ Position
        radius, //~ Radius
        r,g,b, //~ Color
        emitStr, //~ Emission
        r,g,b, //~ Emission color
        smoothness, //~ Smoothness
        1,1,1, //~ Specular color
        0, //~ Specular probability
        0, //~ Transparency
        1, //~ Index of refraction
        2, //~ Material type (diffuse)
        1 // Padding
    );
}

function createBallGlossy(x,y,z,radius,r=1,g=1,b=1,specularProb=0,smoothness=1,emitStr=0){
    SPHERES.push(
        x,y,z, //~ Position
        radius, //~ Radius
        r,g,b, //~ Color
        emitStr, //~ Emission
        r,g,b, //~ Emission color
        smoothness, //~ Smoothness
        1,1,1, //~ Specular color
        specularProb + 1, //~ Specular probability
        0, //~ Transparency
        1, //~ Index of refraction
        3, //~ Material type (diffuse)
        1 // Padding
    );
}

function createBallRefractive(x,y,z,radius,r=1,g=1,b=1,refractiveIndex=1,emitStr=0){
    SPHERES.push(
        x,y,z, //~ Position
        radius, //~ Radius
        r,g,b, //~ Color
        emitStr, //~ Emission
        r,g,b, //~ Emission color
        1, //~ Smoothness
        1,1,1, //~ Specular color
        1, //~ Specular probability
        1, //~ Transparency
        Math.max(refractiveIndex, 1), //~ Index of refraction
        4, //~ Material type (diffuse)
        1 // Padding
    );
}


//createBallGlossy(-3,-0.55,12.5, 2, 1,0,0, 0.5); // glossy red ball
//createBallRefractive(-3,-0.55,12.5, 2, 1,0,0, 1.5168); //! DELETE

//createBallDiffuse(0.5,-1.015,13.5, 1.5); // white ball
//createBallGlossy(0.5,-1.015,13.5, 1.5, 1,1,1, 190.56789);
createBallMetal(0.5,-1.015,13.5, 1.5, 0.81521,0.7883,0.782, 1);

//createBallDiffuse(3,-0.75,11, 1.65, 0,1,0); // green ball
//createBallGlossy(3,-0.75,11, 1.65, 0,1,0, 0.5);
//createBallRefractive(3,-0.75,11, 1.65, 0,1,0, 1.5168) //! DELETE

//createBallDiffuse(0,-2,9, 0.5, 0,1,1, 10); // glowing cyan ball
createBallRefractive(0,-2,9, 0.5, 0,1,1, 1.5168) //! DELETE

//createBallMetal(-3,-1.5,7.5, 1, 0.75,0.75,0.75, 0.9); // mirror ball
createBallDiffuse(-3,-1.5,7.5, 1, 0,1,0); //!DELETE

createBallGlossy(2,-1.75,7.5, 0.75, 1,0,0, 0.5); // glossy blue ball

//createBallDiffuse(-2.25,-2,5, 0.5, 1,1,0, 5); // glowing yellow ball

//createBallRefractive(0,-1.5,5, 1, 0.9,0.9,0.9, 1.5168); // glass ball

createBallDiffuse(0,-9002.5,0, 9000, 0.4,0.4,0.4); // floor


/*
//createBall(-1,-1.5,7.5, 1, 0.75,0.75,0.75, 0, 0.95); // mirror ball
createBallMetal(-1,-1.5,7.5, 1, 0.75,0.75,0.75, 0.95);
//createBall(1,-1.5,6, 1, 0.9,0.9,0.9, 0, 1, 1, 1, 1.5168, 1,1,1, 1,1,1); // glass ball
createBallRefractive(1,-1.5,6, 1, 0.9,0.9,0.9, 1.5168);
createBallDiffuse(-2002.5,0,0, 2000, 1,0.2,0.2);
createBallDiffuse(2002.5,0,0, 2000, 0.2,0.2,1);
createBallDiffuse(0,2002,0, 2000, 0.5,0.5,0.5);
createBallDiffuse(0,0,2010, 2000, 0.5,0.5,0.5);
createBallDiffuse(0,0,-1999.9, 2000, 0.5,0.5,0.5);
createBallDiffuse(0,51.97,6, 50, 1,1,1, 10);
createBallDiffuse(0,-2002.5,0, 2000, 0.5,0.5,0.5); // floor
*/

//createBall(-600,800,400,600,1,1,1,40);

SPHERES = new Float32Array(SPHERES);
var NUM_SPHERES = SPHERES.length / 20;
