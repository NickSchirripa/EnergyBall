// Configuration object for lil-gui
const settings = {
  dpr: 1.0,
  flightSpeed: 0.2,
  animSpeed: -1.5,
  lightIntensity: 25000.0,
  colorR: 4.2,
  colorG: -1.6,
  colorB: 5.4,
  grainAmount: 0.0,
};

// Initialize WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(settings.dpr);
document.body.appendChild(renderer.domElement);

// Initialize Scene and Orthographic Camera (ideal for full-screen shaders)
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Define Uniforms to pass data from JS to GLSL
const uniforms = {
  iTime: { value: 0.0 },
  iResolution: {
    value: new THREE.Vector2(window.innerWidth, window.innerHeight),
  },
  uFlightSpeed: { value: settings.flightSpeed },
  uAnimSpeed: { value: settings.animSpeed },
  uLightIntensity: { value: settings.lightIntensity },
  uColorOffset: {
    value: new THREE.Vector3(settings.colorR, settings.colorG, settings.colorB),
  },
  uGrainAmount: { value: settings.grainAmount },
};

const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

const fragmentShader = `
            varying vec2 vUv;
            uniform float iTime;
            uniform vec2 iResolution;
            
            // GUI Uniforms
            uniform float uFlightSpeed;
            uniform float uAnimSpeed;
            uniform float uLightIntensity;
            uniform vec3 uColorOffset;
            uniform float uGrainAmount;

            float hash(vec3 p) {
                p = fract(p * 0.9631);
                p += dot(p, p.yzx + 33.33);
                return fract((p.x + p.y) * p.z);
            }

            // Safe fallback for tanh (not natively supported in all WebGL1 environments)
            vec4 customTanh(vec4 x) {
                vec4 exp2x = exp(clamp(2.0 * x, -80.0, 80.0)); // Clamp prevents infinity/NaN issues
                return (exp2x - 1.0) / (exp2x + 1.0);
            }

            void main() {
                // Map UV coordinates similarly to fragCoord in Shadertoy
                vec2 uv = (2.0 * vUv - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
                
                float time = iTime;
                float tFlight = time * uFlightSpeed;
                float tAnim = time * uAnimSpeed;

                // Setup ray direction
                vec3 rayDir = normalize(vec3(uv, -1.7));
                
                vec4 accumulatedLight = vec4(0.0);
                
                // Generate cinematic noise grain based on absolute pixel coordinates
                vec2 fragCoord = vUv * iResolution;
                float grain = hash(vec3(fragCoord, time * 5.0));
                
                float totalDist = 1.2 + grain * 0.15; 
                
                float stepDist = 0.1;
                float structuralVal = 0.1;
                
                for (int i = 0; i < 99; i++) {
                    vec3 pos = totalDist * rayDir;

                    // Apply pre-calculated flight speed
                    pos.z -= tFlight;
                    pos.z = mod(pos.z + 2.1, 3.5) - 2.1;

                    vec3 rotAxis = normalize(cos(vec3(0.6, 1.3, 0.2) - totalDist * 1.8));
                    vec3 twistedSpace = rotAxis * dot(rotAxis, pos) - cross(rotAxis, pos);

                    // Fractal loop
                    float scale = 8.3;
                    for (int j = 2; j < 8; j++) {
                        scale += 13.3;
                        // Apply pre-calculated animation time
                        twistedSpace += sin(twistedSpace * scale + tAnim).yzx / scale;
                    }
                    
                    structuralVal = twistedSpace.y;
                    
                    // Standard, fast 100% step (no multipliers)
                    stepDist = 0.3 * abs(length(pos) - 0.7) + 0.03 * abs(structuralVal);
                    totalDist += stepDist;

                    // Compute dynamic color palette driven by GUI uniforms
                    vec4 palette = cos(structuralVal + vec4(uColorOffset, 0.0)) + 1.2;

                    // Accumulate light safely without zero-division artifacts
                    accumulatedLight += (palette / max(stepDist, 0.01)) * totalDist;

                    // Early Exit (Saves huge performance in bright areas)
                    if (accumulatedLight.x > 90000.0) break;
                    
                    // Far Clipping Plane
                    if (totalDist > 25.0) break;
                }
                
                // Final color compilation
                gl_FragColor = customTanh(accumulatedLight / uLightIntensity);
                gl_FragColor.rgb += (grain - 1.1) * uGrainAmount;
                gl_FragColor.a = 1.0;
            }
        `;

// Create full-screen plane with custom shader
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: uniforms,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Setup lil-gui Interface
const gui = new lil.GUI({ title: "Shader Settings" });
gui.close(); // Collapse the panel by default

gui
  .add(settings, "dpr", 0.1, 4.0, 0.1)
  .name("Device Pixel Ratio")
  .onChange((value) => {
    renderer.setPixelRatio(value);
  });

const motionFolder = gui.addFolder("Motion Parameters");
motionFolder.add(settings, "flightSpeed", -1.0, 1.0).name("Flight Speed");
motionFolder.add(settings, "animSpeed", -5.0, 5.0).name("Animation Speed");

const visualFolder = gui.addFolder("Visual & Lighting");
visualFolder
  .add(settings, "lightIntensity", 1000.0, 100000.0)
  .name("Light Intensity");
visualFolder.add(settings, "grainAmount", 0.0, 0.5).name("Noise Grain Amount");

const colorsFolder = gui.addFolder("Color Palette Offsets");
colorsFolder.add(settings, "colorR", -10.0, 10.0).name("Red Offset");
colorsFolder.add(settings, "colorG", -10.0, 10.0).name("Green Offset");
colorsFolder.add(settings, "colorB", -10.0, 10.0).name("Blue Offset");

// Handle Window Resizing
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  // Update uniforms based on GUI settings and elapsed time
  uniforms.iTime.value = clock.getElapsedTime();
  uniforms.uFlightSpeed.value = settings.flightSpeed;
  uniforms.uAnimSpeed.value = settings.animSpeed;
  uniforms.uLightIntensity.value = settings.lightIntensity;
  uniforms.uColorOffset.value.set(
    settings.colorR,
    settings.colorG,
    settings.colorB,
  );
  uniforms.uGrainAmount.value = settings.grainAmount;

  renderer.render(scene, camera);
}

// Start animation
animate();
