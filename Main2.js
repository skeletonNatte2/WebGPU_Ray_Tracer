async function start(){
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({device, format: presentationFormat,});
    

    const renderModule = device.createShaderModule({
        label: 'vertex and fragment shaders',
        code: renderModuleCode,
    });

    const renderPipeline = device.createRenderPipeline({
        label: 'render renderPipeline',
        layout: 'auto',
        vertex: {
            module: renderModule,
            entryPoint: 'vertexMain',
            buffers: [],
        },
        fragment: {
            module: renderModule,
            entryPoint: 'fragmentMain',
            targets: [{ format: presentationFormat }],
        },
    });

    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
    });

    const flipTexture = device.createTexture({
        size: {
            width: CANVAS_WIDTH,
            height: CANVAS_WIDTH,
        },
        format: 'rgba8unorm',
        usage:
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.TEXTURE_BINDING,
    });

    const flopTexture = device.createTexture({
        size: {
            width: CANVAS_WIDTH,
            height: CANVAS_WIDTH,
        },
        format: 'rgba8unorm',
        usage:
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.TEXTURE_BINDING,
    });

    const renderBindGroups = [
        device.createBindGroup({
            label: 'render bind group',
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: sampler,
                },
                {
                    binding: 1,
                    resource: flipTexture.createView(),
                }
            ],
        }),
        device.createBindGroup({
            label: 'render bind group',
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: sampler,
                },
                {
                    binding: 1,
                    resource: flopTexture.createView(),
                }
            ],
        })
    ];

    const computeModule = device.createShaderModule({
        label: 'compute shader',
        code: computeModuleCode,
    });

    const computePipeline = device.createComputePipeline({
        label: 'compute pipeline',
        layout: 'auto',
        compute: {
            module: computeModule,
            entryPoint: "computeMain",
        }
    });

    const camDirUniformBuffer = device.createBuffer({
        label: 'Camera Direction Uniform',
        size: camDir.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(camDirUniformBuffer, 0, camDir);

    const camPosUniformBuffer = device.createBuffer({
        label: 'Camera Position Uniform',
        size: camPos.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);

    const sphereUniformBuffer = device.createBuffer({
        label: 'Sphere Uniform',
        size: SPHERES.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(sphereUniformBuffer, 0, SPHERES);

    const simUniformBuffer = device.createBuffer({
        label: 'Sphere Uniform',
        size: simData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(simUniformBuffer, 0, simData);

    const computeBindGroups = [
        device.createBindGroup({
            label: 'compute bind group',
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: flipTexture.createView(),
                },
                {
                    binding: 1,
                    resource: flopTexture.createView(),
                },
                {
                    binding: 2,
                    resource: { buffer: camDirUniformBuffer }
                },
                {
                    binding: 3,
                    resource: { buffer: camPosUniformBuffer }
                },
                {
                    binding: 4,
                    resource: { buffer: sphereUniformBuffer }
                },
                {
                    binding: 5,
                    resource: { buffer: simUniformBuffer }
                },
            ],
        }),
        device.createBindGroup({
            label: 'compute bind group',
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: flopTexture.createView(),
                },
                {
                    binding: 1,
                    resource: flipTexture.createView(),
                },
                {
                    binding: 2,
                    resource: { buffer: camDirUniformBuffer }
                },
                {
                    binding: 3,
                    resource: { buffer: camPosUniformBuffer }
                },
                {
                    binding: 4,
                    resource: { buffer: sphereUniformBuffer }
                },
                {
                    binding: 5,
                    resource: { buffer: simUniformBuffer }
                },
            ],
        })
    ];

    function updateCam(){
        if(LEFT){
            camDir[1] += 0.1;
            device.queue.writeBuffer(camDirUniformBuffer, 0, camDir);
        }
        if(RIGHT){
            camDir[1] -= 0.1;
            device.queue.writeBuffer(camDirUniformBuffer, 0, camDir);
        }
        if(DOWN && camDir[0] > -1.5){
            camDir[0] -= 0.1;
            device.queue.writeBuffer(camDirUniformBuffer, 0, camDir);
        }
        if(UP && camDir[0] < 1.5){
            camDir[0] += 0.1;
            device.queue.writeBuffer(camDirUniformBuffer, 0, camDir);
        }
        let dirX = -Math.sin(camDir[1]);
        let dirZ = Math.cos(camDir[1]);
        if(W){
            camPos[0] += dirX * 0.2;
            camPos[2] += dirZ * 0.2;
            device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);
        }
        if(S){
            camPos[0] += dirX * -0.2;
            camPos[2] += dirZ * -0.2;
            device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);
        }
        if(A){
            camPos[0] += dirZ * -0.2;
            camPos[2] += dirX * 0.2;
            device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);
        }
        if(D){
            camPos[0] += dirZ * 0.2;
            camPos[2] += dirX * -0.2;
            device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);
        }
        if(SHIFT){
            camPos[1] -= 0.2;
            device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);
        }
        if(SPACE){
            camPos[1] += 0.2;
            device.queue.writeBuffer(camPosUniformBuffer, 0, camPos);
        }
    }

    function userInput(){
        addEventListener('keydown', e => {
            FRAME = 1;
            if(e.key == 'ArrowLeft'){
                LEFT = true;
            }
            if(e.key == 'ArrowRight'){
                RIGHT = true;
            }
            if(e.key == 'ArrowDown'){
                DOWN = true;
            }
            if(e.key == 'ArrowUp'){
                UP = true;
            }
            if(e.key == 'w'){
                W = true;
            }
            if(e.key == 's'){
                S = true;
            }
            if(e.key == 'a'){
                A = true;
            }
            if(e.key == 'd'){
                D = true;
            }
            if(e.key == 'Shift'){
                SHIFT = true;
            }
            if(e.key == ' '){
                SPACE = true;
            }
        });

        addEventListener('keyup', e => {
            FRAME = 1;
            if(e.key == 'ArrowLeft'){
                LEFT = false;
            }
            if(e.key == 'ArrowRight'){
                RIGHT = false;
            }
            if(e.key == 'ArrowDown'){
                DOWN = false;
            }
            if(e.key == 'ArrowUp'){
                UP = false;
            }
            if(e.key == 'w'){
                W = false;
            }
            if(e.key == 's'){
                S = false;
            }
            if(e.key == 'a'){
                A = false;
            }
            if(e.key == 'd'){
                D = false;
            }
            if(e.key == 'Shift'){
                SHIFT = false;
            }
            if(e.key == ' '){
                SPACE = false;
            }
        });
    }

    const WORK_GROUP_SIZE = Math.ceil(CANVAS_WIDTH/8);
    function mainLoop(){
        document.getElementById('text').innerHTML = FRAME;
        updateCam();

        let flipOrFlop = FRAME%2;
        const encoder = device.createCommandEncoder({ label: 'encoder' });

        const computePass = encoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroups[flipOrFlop]);
        computePass.dispatchWorkgroups(WORK_GROUP_SIZE, WORK_GROUP_SIZE);
        computePass.end();

        const renderPassDescriptor = {
            label: 'render pass',
            colorAttachments: [
                {
                    view: ctx.getCurrentTexture().createView(),
                    clearValue: [0.0, 0.0, 0.0, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        };
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(renderPipeline);
        pass.setBindGroup(0, renderBindGroups[flipOrFlop]);
        pass.draw(6);
        pass.end();

        device.queue.submit([encoder.finish()]);

        FRAME++;
        simData[2] = FRAME;
        device.queue.writeBuffer(simUniformBuffer, 0, simData);

        if(FRAME <= MAX_FRAMES){
            requestAnimationFrame(mainLoop);
        }
    }


    userInput();
    mainLoop();
}


start();