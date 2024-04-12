const renderModuleCode = /*wgsl*/`


@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_2d<f32>;

@vertex fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4f {
    let pos = array(
        vec2f( 1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0, -1.0),
        vec2f( 1.0,  1.0),
        vec2f(-1.0, -1.0),
        vec2f(-1.0,  1.0),
    );

    return vec4f(pos[vertexIndex],0,1);
}


@fragment fn fragmentMain(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
    let output = textureSample(myTexture, mySampler, vec2f(pixel.xy) / ${ CANVAS_WIDTH } );
    return output;
}
`

const computeModuleCode = /*wgsl*/`


struct SimData{
    dimensions: vec2f,
    frame: f32,
}

struct Ray{
    origin: vec3f,
    dir: vec3f,
}

struct Material{
    color: vec3f,
    emmissionStrength: f32,
    emmissionColor: vec3f,
    smoothness: f32,
    specularColor: vec3f,
    specularProb: f32,
    transparency: f32,
    refractiveIndex: f32,
}

struct Sphere{
    pos: vec3f,
    radius: f32,
    material: Material,
}

struct HitInfo{
    didHit: bool,
    dist: f32,
    pos: vec3f,
    normal: vec3f,
    material: Material,
}

const groundColor = vec3f(0.6723941, 0.95839283, 1.0);
const horizonColor = vec3f(0.6523941, 0.93839283, 1.0);
const skyColor = vec3f(0.2788092, 0.56480793, 0.9264151);
const sunDir = normalize(vec3f(-3.0, 3.0, 2.0));
const sunFocus = 500.0;
const sunIntensity = 200.0;

@group(0) @binding(0) var outputTexture : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var inputTexture : texture_2d<f32>;
@group(0) @binding(2) var<uniform> camAngle: vec2f;
@group(0) @binding(3) var<uniform> camPos: vec3f;
@group(0) @binding(4) var<uniform> spheres: array<Sphere,${ NUM_SPHERES }>;
@group(0) @binding(5) var<uniform> simData: SimData;

fn jenkinsHash(input: u32) -> u32{
    var x = input;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}

fn randomInt(state: ptr<function, u32>){
    let oldState = *state + 747796405u + 2891336453u;
    let word = ((oldState >> ((oldState >> 28u) + 4u)) ^ oldState) * 277803737u;
    *state = (word >> 22u) ^ word;
}

fn random(state: ptr<function, u32>) -> f32 {
    randomInt(state);
    return f32(*state) / f32(0xffffffffu);
}

fn randomDir(state: ptr<function, u32>) -> vec3f {
    var x = random(state) * 2 - 1;
    var y = random(state) * 2 - 1;
    var z = random(state) * 2 - 1;

    for(var i = 0; i < 999999; i++){
        if(x * x + y * y + z * z <= 1){
            return normalize(vec3f(x, y, z));
        }
        x = random(state) * 2 - 1;
        y = random(state) * 2 - 1;
        z = random(state) * 2 - 1;
    }

    return normalize(vec3f(x, y, z));
}

fn randomHemiDir(state: ptr<function, u32>, normal: vec3f) -> vec3f {
    let dir = randomDir(state);
    return dir * sign(dot(normal,dir));
}

// Create hit info between a ray and a sphere

fn raySphereIntersect(ray: Ray, sphere: Sphere) -> HitInfo {
    var thisHit: HitInfo;

    let l = sphere.pos - ray.origin;
    let tca = dot(l,ray.dir);
    let d = sqrt(dot(l, l) - (tca * tca));

    if(tca < 0 || d > sphere.radius){
        thisHit.didHit = false;
        return thisHit;
    }

    let thc = sqrt((sphere.radius * sphere.radius) - (d * d));
    var t = tca - thc;
    if(t < 0.0){
        t = tca + thc;
    }

    thisHit.didHit = true;
    thisHit.dist = t;
    thisHit.pos = ray.origin + vec3f(ray.dir.xyz * t);
    thisHit.normal = normalize(thisHit.pos - sphere.pos);
    thisHit.material = sphere.material;
    return thisHit;
}

// Create hit info for a ray and the whole scene

fn traceRay(ray: Ray) -> HitInfo {
    var closestHit: HitInfo;

    for(var i = 0; i < ${ NUM_SPHERES }; i += 1){
        var thisHit = raySphereIntersect(ray, spheres[i]);
        if((thisHit.didHit && thisHit.dist < closestHit.dist) || !closestHit.didHit){
            closestHit = thisHit;
        }
    }

    return closestHit;
}

fn getSky(ray: Ray) -> vec3f {
    let skyGradientT = pow(smoothstep(0.0, 0.4, ray.dir.y),0.35);
    let skyGradient = mix(horizonColor, skyColor, skyGradientT);
    let sun = pow(max(0.0, dot(ray.dir, sunDir)), sunFocus) * sunIntensity;

    let groundToSky = smoothstep(-0.01, 0.0, ray.dir.y);
    var sunMask = 0.0;
    if(groundToSky >= 1.0){
        sunMask = 1.0;
    }

    return mix(groundColor, skyGradient, groundToSky) + sun * sunMask;
}

@compute @workgroup_size(8, 8, 1)
fn computeMain(@builtin(global_invocation_id) globalInvocationID: vec3u){
    let pos = globalInvocationID.xy;
    let pixel = vec2f(pos);

    let frame = simData.frame;

    let screenSize = simData.dimensions.x;
    let texCoords = vec2u(pixel.xy);
    let pixelIndex: u32 = texCoords.x + (u32(screenSize) * texCoords.y);
    let planeDist = 1.0;

    var rngState = jenkinsHash(dot(texCoords, vec2u(1u,u32(screenSize))) ^ jenkinsHash(u32(frame)));

    let rotMatX = mat3x3f(
        1.0, 0.0, 0.0,
        0.0, cos(camAngle.x), -sin(camAngle.x),
        0.0, sin(camAngle.x), cos(camAngle.x)
    );
    let rotMatY = mat3x3f(
        cos(camAngle.y), 0.0, sin(camAngle.y),
        0.0, 1.0, 0.0,
        -sin(camAngle.y), 0.0, cos(camAngle.y)
    );

    var planePos = vec3f(
        (pixel.x + random(&rngState) * 2 - 1) / screenSize - 0.5,
        (pixel.y + random(&rngState) * 2 - 1) / -screenSize + 0.5, 
        planeDist
    );

    let numBounces = 100;
    let numRays = 18;

    var averageLight = vec3f(0.0);
    for(var i = 0; i < numRays; i += 1){
        var ray: Ray;
        ray.origin = camPos;
        ray.dir = normalize(rotMatY * (rotMatX * planePos));

        var totalLight = vec3f(0.0);
        var rayColor = vec3f(1.0);
        
        for(var j = 0; j < numBounces; j += 1){
            let traceResults = traceRay(ray);
            if(traceResults.didHit){

                let material = traceResults.material;

                let indRef = material.refractiveIndex;
                let rayIsInside = select(1.0,0.0,dot(ray.dir,traceResults.normal) > 0.0);
                let indRefsRatio = select(1.0 / indRef,indRef,dot(ray.dir,traceResults.normal) > 0.0);
                let n = faceForward(traceResults.normal,ray.dir,traceResults.normal);

                var hitWasGlossy = 0.0;

                var reflectance = (1.0 - indRefsRatio) / (1.0 + indRefsRatio);
                reflectance = reflectance * reflectance;
                reflectance = reflectance + (1.0 - reflectance) * pow((1.0 - dot(n,-ray.dir)),5.0);

                var newDir = refract(ray.dir,n,indRefsRatio) + randomDir(&rngState) * 0.02;
                if(length(newDir) <= 0.001 || reflectance >= random(&rngState) * material.transparency){
                    var specularDir = reflect(ray.dir, n);
                    var diffuseDir = normalize(n + randomDir(&rngState));
                    if(material.specularProb >= random(&rngState)){
                        hitWasGlossy = 1.0;
                    }
    
                    newDir = mix(diffuseDir, specularDir, material.smoothness * hitWasGlossy);
                }

                ray.dir = normalize(newDir);
                ray.origin = traceResults.pos + ray.dir * 0.001;

                var emitted = material.emmissionColor * material.emmissionStrength;
                totalLight += emitted * rayColor;
                rayColor *= mix(material.color, material.specularColor, hitWasGlossy * rayIsInside);

                /*let specularDir = reflect(ray.dir, traceResults.normal);
                let diffuseDir = normalize(traceResults.normal + randomDir(&rngState));
                var hitWasGlossy = 0.0;
                if(material.specularProb >= random(&rngState)){
                    hitWasGlossy = 1.0;
                }

                ray.dir = normalize(mix(diffuseDir, specularDir, material.smoothness * hitWasGlossy));
                ray.origin = traceResults.pos + ray.dir * 0.001;

                var emitted = material.emmissionColor * material.emmissionStrength;
                totalLight += emitted * rayColor;
                rayColor *= mix(material.color, material.specularColor, hitWasGlossy);*/
                
            } else {
                totalLight += getSky(ray) * rayColor;
                break;
            }
            
        }

        averageLight += totalLight;
    }

    let previousColor = vec3f(textureLoad(inputTexture, pos, 0).xyz);

    averageLight = max(pow(averageLight / f32(numRays), vec3f(0.454545454545)), vec3f(0.0));
    let weight = 1.0/frame;
    averageLight = weight * averageLight + (1.0 - weight) * previousColor;

    textureStore(outputTexture, pos, vec4f(averageLight, 1.0));
}
`