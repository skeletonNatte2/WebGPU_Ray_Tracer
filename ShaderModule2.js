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
    color: vec3f,
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
    materialType: f32,
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
const sunIntensity = 150.0;

@group(0) @binding(0) var outputTexture : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var inputTexture : texture_2d<f32>;
@group(0) @binding(2) var<uniform> camAngle: vec2f;
@group(0) @binding(3) var<uniform> camPos: vec3f;
@group(0) @binding(4) var<uniform> spheres: array<Sphere,${ NUM_SPHERES }>;
@group(0) @binding(5) var<uniform> simData: SimData;

fn random(state: ptr<function, u32>) -> f32 {
    let oldState = *state + 747796405u + 2891336453u;
    let word = ((oldState >> ((oldState >> 28u) + 4u)) ^ oldState) * 277803737u;
    *state = (word >> 22u) ^ word;
    return f32(*state) / 0xffffffff;
}

fn randomNormDist(state: ptr<function, u32>) -> f32 {
    var theta = 6.283185307 * random(state);
    var rho = sqrt(-2 * log(random(state)));
    return rho * cos(theta);
}

fn randomDir(state: ptr<function, u32>) -> vec3f {
    var x = randomNormDist(state);
    var y = randomNormDist(state);
    var z = randomNormDist(state);

    return normalize(vec3f(x, y, z));
}

fn randomHemiDir(state: ptr<function, u32>, normal: vec3f) -> vec3f {
    let dir = randomDir(state);
    return dir * sign(dot(normal,dir));
}

// Create hit info between a ray and a sphere

fn raySphereIntersect(ray: Ray, sphere: Sphere) -> HitInfo {
    var thisHit: HitInfo;

    let squaredRadius = sphere.radius * sphere.radius;
    let l = sphere.pos - ray.origin;
    let tca = dot(l,ray.dir);
    let d = dot(l, l) - tca * tca;

    if(tca < 0 || d > squaredRadius){
        thisHit.didHit = false;
        return thisHit;
    }

    let thc = sqrt(squaredRadius - d);
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
    var thisHit: HitInfo;

    for(var i = 0; i < ${ NUM_SPHERES }; i += 1){
        thisHit = raySphereIntersect(ray, spheres[i]);
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

fn diffuseHit(
    ray: Ray,
    traceResults: HitInfo, 
    totalLight: ptr<function, vec3f>, 
    rngState: ptr<function, u32>
) -> Ray {
    var newRay: Ray;
    let material = traceResults.material;

    let diffuseDir = normalize(traceResults.normal + randomDir(rngState));
    newRay.dir = diffuseDir;
    newRay.origin = traceResults.pos + newRay.dir * 0.01;

    let emitted = material.color * material.emmissionStrength;
    *totalLight += emitted * ray.color;
    newRay.color = ray.color * material.color;

    return newRay;
}

@compute @workgroup_size(8, 8, 1)
fn computeMain(@builtin(global_invocation_id) globalInvocationID: vec3u){
    let pos = globalInvocationID.xy;
    let pixel = vec2f(pos);

    let frame = simData.frame;

    let screenSize = simData.dimensions.x;
    let texCoords = vec2u(pixel);
    let pixelIndex = texCoords.x + ${ CANVAS_WIDTH } * texCoords.y;
    let planeDist = 1.0;

    var rngState = pixelIndex + u32(frame) * 719324593u;

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

    /*var planePos = vec3f(
        pixel.x / screenSize - 0.5,
        pixel.y / -screenSize + 0.5, 
        planeDist
    );*/

    let numBounces = 50;
    let numRays = 15;

    var averageLight = vec3f(0.0);

    for(var i = 0; i < numRays; i += 1){

        var planePos = vec3f(
            (pixel.x + random(&rngState) - 0.5) / screenSize - 0.5,
            (pixel.y + random(&rngState) - 0.5) / -screenSize + 0.5, 
            planeDist
        );

        var ray: Ray;
        ray.origin = camPos;
        ray.dir = normalize(rotMatY * rotMatX * planePos);
        ray.color = vec3f(1.0);

        var totalLight = vec3f(0.0);
        
        for(var j = 0; j < numBounces; j += 1){
            let traceResults = traceRay(ray);
            
            if(!traceResults.didHit){
                totalLight += getSky(ray) * ray.color;
                break;
            }

            let material = traceResults.material;
            let materialType = i32(material.materialType);

            switch materialType {
                /*case 1: {
                    /*let diffuseDir = normalize(traceResults.normal + randomDir(&rngState));
                    ray.dir = diffuseDir;
                    ray.origin = traceResults.pos + ray.dir * 0.01;

                    let emitted = material.color * material.emmissionStrength;
                    totalLight += emitted * ray.color;
                    ray.color *= material.color;*/
                    ray = diffuseHit(ray, traceResults, &totalLight, &rngState);
                }*/
                case 2: {
                    let specularDir = reflect(ray.dir, traceResults.normal);
                    let diffuseDir = normalize(traceResults.normal + randomDir(&rngState));
                    ray.dir = mix(diffuseDir, specularDir, material.smoothness);
                    ray.origin = traceResults.pos + ray.dir * 0.01;

                    let emitted = material.color * material.emmissionStrength;
                    totalLight += emitted * ray.color;
                    ray.color *= material.color;
                }
                case 3: {
                    let indRef = material.specularProb;
                    let n = traceResults.normal;

                    let cosTheta1 = dot(n,-ray.dir);
                    let cosTheta2 = sqrt(1 - (1 - cosTheta1 * cosTheta1) / (indRef * indRef));

                    let fp = (indRef * cosTheta1 - cosTheta2) / (indRef * cosTheta1 + cosTheta2);
                    let fs = (cosTheta1 - indRef * cosTheta2) / (cosTheta1 + indRef * cosTheta2);

                    var reflectance = 0.5 * (fp * fp + fs * fs);
    
                    /*
                    * Schlick's approximation
                    var reflectance = (1.0 - indRef) / (1.0 + indRef);
                    reflectance = reflectance * reflectance;
                    reflectance = reflectance + (1.0 - reflectance) * pow((1.0 - cosTheta1),5.0);
                    */
    
                    var newDir = traceResults.normal + randomDir(&rngState);
                    var hitColor = material.color;
                    if(reflectance >= random(&rngState)){
                        newDir = reflect(ray.dir, n);
                        hitColor = vec3f(1.0);
                    }
    
                    ray.dir = normalize(newDir);
                    ray.origin = traceResults.pos + ray.dir * 0.01;
    
                    var emitted = material.color * material.emmissionStrength;
                    totalLight += emitted * ray.color;
                    ray.color *= hitColor;
                }
                case 4: {
                    let indRef = material.refractiveIndex;
                    let rayIsInside = select(1.0,-1.0,dot(ray.dir,traceResults.normal) > 0.0);
                    let indRefsRatio = select(1.0 / indRef,indRef,rayIsInside == -1.0);
                    let n = traceResults.normal * rayIsInside;

                    let cosTheta1 = dot(n,-ray.dir);
                    let cosTheta2 = sqrt(1 - (1 - cosTheta1 * cosTheta1) * indRefsRatio * indRefsRatio);

                    let fp = (cosTheta1 - cosTheta2 * indRefsRatio) / (cosTheta1 + cosTheta2 * indRefsRatio);
                    let fs = (cosTheta1 * indRefsRatio - cosTheta2) / (cosTheta1 * indRefsRatio + cosTheta2);

                    var reflectance = 0.5 * (fp * fp + fs * fs);
    
                    var newDir = refract(ray.dir,n,indRefsRatio);
                    var hitColor = vec3f(1.0);
                    if(/*length(newDir) < 0.1 || */reflectance >= random(&rngState)){
                        newDir = reflect(ray.dir, n);
                    } else if(rayIsInside == -1.0){
                        hitColor = material.color;
                    }
    
                    ray.dir = normalize(newDir);
                    ray.origin = traceResults.pos + ray.dir * 0.01;
    
                    var emitted = material.color * material.emmissionStrength;
                    totalLight += emitted * ray.color;
                    ray.color *= hitColor;
                }
                default {
                    ray = diffuseHit(ray, traceResults, &totalLight, &rngState);
                }
            }

            
            //* Attempt at russian roulette for path termination
            let energy = (ray.color.x + ray.color.y + ray.color.z) / 3.0;
            let terminateChance = 2 * (1 - energy) / f32(numBounces);
            if(terminateChance < random(&rngState) && j > 5){
                break;
            }
            
        }

        averageLight += totalLight;
    }

    let previousColor = vec3f(textureLoad(inputTexture, pos, 0).xyz);

    averageLight = sqrt(max(averageLight / f32(numRays), vec3f(0.0)));
    let weight = 1.0/frame;
    averageLight = weight * averageLight + (1.0 - weight) * previousColor;

    textureStore(outputTexture, pos, vec4f(averageLight, 1.0));
}
`
