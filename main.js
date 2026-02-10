/**
 * ------------------------------------------------------------------
 * 本命杯杯 (BaeBae) 
 * ------------------------------------------------------------------
 * @author  陳阿P
 * @version 1.0.0
 * @year    2026.2.7
 * * 靈感來自傳統擲筊文化結合韓娛抽卡文化搭配三元九運混沌引擎特殊運算。
 * ------------------------------------------------------------------
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';

const MODEL_PATH = './crescentmoon.glb';
const MODEL_SCALE = 0.05;
const CONFIG_LEFT = { pos: { x: 0, y: 6.5, z: -1.9 }, rot: { x: -90, y: 180, z: 270 } };
const CONFIG_RIGHT = { pos: { x: 0, y: 6.5, z: 1.9 }, rot: { x: -90, y: 180, z: -270 } };
const GAME_STATE = { READY: 'READY', TOSSING: 'TOSSING', RESULT: 'RESULT' };

let currentState = GAME_STATE.READY;
let scene, camera, renderer, world, eventQueue;
let moonLeft, moonRight, meshLeft, meshRight;
let floorTextPlane, userImagePlane, fireLight, floorMesh;

let userData = { bday: "", floorText: "", useGPS: false, useStreak: false, useDivinationMode: false };

let audioCtx = null, safetyTimer = null, dampingTimer = null, physicsReady = false;
let localUpAxis = new THREE.Vector3(0, 1, 0);
let stableFrames = 0;
const REQUIRED_STABLE_FRAMES = 60;

const clock = new THREE.Clock();
let physicsAccumulator = 0;
const PHYSICS_STEP = 1 / 60;
const SIMULATION_SPEED = 2.0;

let userLocation = { lat: 25.03, lng: 121.56 };
let fateEngine;

let isCameraActive = false;
let cameraStream = null;
let currentBgColor = new THREE.Color(0x1a0505);
let toastTimer = null;
let streakCount = 0;

class FateEngine {
    constructor() { this.PHI = 1.6180339887; }
    hashString(str) {
        if (!str) return 0.5;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 0.1 + (Math.abs(hash) % 800) / 1000;
    }
    getMoonPhase() {
        const date = new Date();
        let year = date.getFullYear(); let month = date.getMonth() + 1; const day = date.getDate();
        if (month < 3) { year--; month += 12; } month++;
        const c = 365.25 * year; const e = 30.6 * month;
        let jd = c + e + day - 694039.09; jd /= 29.5305882;
        const b = parseInt(jd); jd -= b; return jd;
    }
    computeChaos(seed, iterations) {
        let x = seed;
        let r = 3.6;
        if (userData.useGPS) { r += (Math.abs(userLocation.lat) % 0.4); }
        else { r += (Date.now() % 400) / 1000; }
        for (let i = 0; i < iterations; i++) x = r * x * (1 - x);
        return x;
    }
    calculatePhysicsParameters(bday, lat, lng) {
        const now = new Date();
        const timestamp = now.getTime();
        const userVal = this.hashString(bday);
        const moonPhase = this.getMoonPhase();
        const hour = now.getHours();
        const moonEnergy = 1.0 - Math.abs(moonPhase - 0.5) * 2;

        let geoFlux = 0;
        if (userData.useGPS) { geoFlux = (Math.abs(lat * lng) * 1000) % 1; }
        else { geoFlux = (Math.sin(timestamp * 0.001) + 1) * 0.5; }

        const digitalSpirit = Math.random();
        const iterations = 10 + Math.floor(userVal * 50);
        let seed = (userVal + geoFlux + (timestamp % 1000) / 1000) / 3;
        if (seed <= 0 || seed >= 1) seed = 0.5;

        const chaosResult = this.computeChaos(seed, iterations);
        const baseForce = 0.14;
        const forceVariation = (chaosResult - 0.5) * 0.05;
        const moonPull = moonEnergy * 0.02;

        return {
            force: baseForce + forceVariation + moonPull,
            torque: {
                x: (chaosResult - 0.5) * 0.05 + (digitalSpirit - 0.5) * 0.01,
                y: (Math.sin(chaosResult * Math.PI) - 0.5) * 0.03,
                z: (Math.cos(chaosResult * Math.PI) - 0.5) * 0.03
            },
            asymmetry: {
                left: 1.0 + Math.sin(hour / 12 * Math.PI) * 0.02,
                right: 1.0 + Math.cos(hour / 12 * Math.PI) * 0.02
            },
            friction: 0.65 + (geoFlux * 0.1) + (digitalSpirit * 0.05)
        };
    }
}

async function init() {
    console.log(
        "%c 本命杯杯 BaeBae %c Developed by 陳阿P ",
        "background: #d94e41; color: #fff; border-radius: 3px 0 0 3px; padding: 2px 5px; font-weight: bold;",
        "background: #1a0505; color: #ffd700; border-radius: 0 3px 3px 0; padding: 2px 5px;"
    );
    fateEngine = new FateEngine();
    initScene();

    window.addEventListener('resize', onWindowResize, false);

    try {
        const [_, gltf] = await Promise.all([RAPIER.init(), loadModelGLB()]);
        world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
        eventQueue = new RAPIER.EventQueue(true);

        let floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -5, 0));
        let floorCol = RAPIER.ColliderDesc.cuboid(25, 5, 25).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        world.createCollider(floorCol, floorBody);

        createWalls();
        setupMoonBlocks(gltf);

        physicsReady = true;
        initUI(); initShakeDetection(); resetToReadyState(); animate();

        const loader = document.getElementById('loading-overlay');
        loader.style.opacity = 0; setTimeout(() => loader.style.display = 'none', 800);
    } catch (e) {
        console.error(e); document.querySelector('.loading-text').innerText = "載入失敗";
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function toggleGPS(enabled) {
    userData.useGPS = enabled;
    if (enabled) {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    console.log("定位成功:", userLocation);
                },
                (err) => {
                    console.warn("定位失敗");
                    document.getElementById('input-gps').checked = false;
                    userData.useGPS = false;
                    alert("無法獲取位置，請檢查權限");
                },
                { timeout: 5000, enableHighAccuracy: false }
            );
        }
    }
}

function updateStreakDots() {
    const container = document.getElementById('streak-container');
    if (userData.useStreak) {
        container.style.display = 'flex';
        document.getElementById('dot-1').classList.toggle('active', streakCount >= 1);
        document.getElementById('dot-2').classList.toggle('active', streakCount >= 2);
        document.getElementById('dot-3').classList.toggle('active', streakCount >= 3);
    } else {
        container.style.display = 'none';
    }
}

function showStreakOverlay() {
    const overlay = document.getElementById('streak-overlay');
    overlay.classList.add('show');
    setTimeout(() => {
        overlay.classList.remove('show');
        streakCount = 0;
        updateStreakDots();
    }, 2000);
}

function createWoodBumpMap() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 300; i++) {
        const gray = Math.floor(Math.random() * 255);
        ctx.fillStyle = `rgba(${gray},${gray},${gray}, 0.6)`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 50 + Math.random() * 300, 2 + Math.random() * 4);
    }
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        const sx = Math.random() * 512; const sy = Math.random() * 512;
        ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 100, sy + 5, sx + 200, sy - 5); ctx.stroke();
    }
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 20, 20);
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1, 1);
    return texture;
}

function createWalls() {
    const createWall = (x, z, w, d) => {
        let body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 10, z));
        world.createCollider(RAPIER.ColliderDesc.cuboid(w, 20, d), body);
    };
    createWall(-4.85, 0, 1, 15); createWall(4.85, 0, 1, 15);
    createWall(0, -8, 10, 1); createWall(0, 8, 10, 1);
}

function loadModelGLB() { return new Promise((resolve, reject) => new GLTFLoader().load(MODEL_PATH, resolve, undefined, reject)); }

function initScene() {
    scene = new THREE.Scene();
    scene.background = currentBgColor;
    scene.fog = new THREE.Fog(0x1a0505, 10, 50);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 16, 0); camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffddaa, 3.3);
    dirLight.position.set(5, 15, 5); dirLight.castShadow = true; scene.add(dirLight);

    fireLight = new THREE.PointLight(0xff7733, 8.0, 60);
    fireLight.position.set(0, 2, 0); scene.add(fireLight);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x220a0a,
        roughness: 0.5,
        metalness: 0.1,
        transparent: false,
        opacity: 1.0
    });
    floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);

    const imgGeo = new THREE.PlaneGeometry(1, 1);
    const imgMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 1.0, roughness: 0.9, metalness: 0.0 });
    userImagePlane = new THREE.Mesh(imgGeo, imgMat);
    userImagePlane.rotation.x = -Math.PI / 2; userImagePlane.position.y = 0.02;
    userImagePlane.visible = false; userImagePlane.receiveShadow = true;
    scene.add(userImagePlane);

    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
    floorTextPlane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), textMat);
    floorTextPlane.rotation.x = -Math.PI / 2; floorTextPlane.position.y = 0.05; floorTextPlane.visible = false;
    scene.add(floorTextPlane);
}

function setupMoonBlocks(gltf) {
    const model = gltf.scene.children[0]; let vertices = [];
    model.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true; c.geometry.scale(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE); c.geometry.computeVertexNormals();
            const pos = c.geometry.attributes.position; const norm = c.geometry.attributes.normal; const uvs = new Float32Array(pos.count * 2);
            for (let i = 0; i < pos.count; i++) {
                const nz = norm.getZ(i);
                if (Math.abs(nz) > 0.8) { uvs[i * 2] = 0.001; uvs[i * 2 + 1] = 0.001; } else { uvs[i * 2] = (pos.getZ(i) * 15) + 0.5; uvs[i * 2 + 1] = (pos.getX(i) * 5) + 0.5; }
            }
            c.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            const pArr = pos.array; for (let i = 0; i < pArr.length; i++) vertices.push(pArr[i]);
        }
    });

    const bumpTexture = createWoodBumpMap();
    const ancientMaterial = new THREE.MeshStandardMaterial({ color: 0x700707, roughness: 0.8, bumpMap: bumpTexture, bumpScale: 5.0, metalness: 0.3 });

    const createBlock = (config, isLeft) => {
        const mesh = model.clone(); mesh.material = ancientMaterial; scene.add(mesh); if (isLeft) meshLeft = mesh; else meshRight = mesh;
        if (isLeft) { const t = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(config.rot.x), THREE.MathUtils.degToRad(config.rot.y), THREE.MathUtils.degToRad(config.rot.z))); localUpAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(t.clone().invert()); }
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(config.pos.x, config.pos.y, config.pos.z).setLinearDamping(0.2).setAngularDamping(0.2).setCcdEnabled(true));
        world.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(vertices)).setMass(0.5).setRestitution(0.3).setFriction(0.65).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
        if (isLeft) moonLeft = body; else moonRight = body;
    };
    createBlock(CONFIG_LEFT, true); createBlock(CONFIG_RIGHT, false);
}

function updateUserImage(url) {
    if (!url) {
        userImagePlane.visible = false;
        if (!isCameraActive) scene.background = new THREE.Color(0x1a0505);
        currentBgColor = new THREE.Color(0x1a0505);
        return;
    }
    new THREE.TextureLoader().load(url, (t) => {
        t.colorSpace = THREE.SRGBColorSpace; const aspect = t.image.width / t.image.height; const h = 8 / aspect;
        userImagePlane.geometry.dispose(); userImagePlane.geometry = new THREE.PlaneGeometry(8, h); userImagePlane.material.map = t; userImagePlane.material.needsUpdate = true;
        userImagePlane.position.z = -7.0 + (h / 2);
        userImagePlane.visible = true; document.getElementById('file-label').innerText = "圖片已載入";

        if (isCameraActive) {
            userImagePlane.material.opacity = 0.3;
        }
    });
}

function updateFloorText(text) {
    if (!text) { floorTextPlane.visible = false; return; }
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 1024, 1024);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd700'; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 15;
    const lines = text.split(/[,，]/);
    let startY = 512 - ((lines.length - 1) * 160 / 2);
    lines.forEach((line, i) => {
        let fs = 90;
        ctx.font = `bold ${fs}px "Microsoft JhengHei", "Heiti TC", sans-serif`;
        while (ctx.measureText(line).width > 900 && fs > 40) {
            fs -= 5;
            ctx.font = `bold ${fs}px "Microsoft JhengHei", "Heiti TC", sans-serif`;
        }
        ctx.fillText(line, 512, startY + i * 160);
    });
    floorTextPlane.material.map = new THREE.CanvasTexture(canvas); floorTextPlane.material.needsUpdate = true; floorTextPlane.visible = true;
}

function initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) {
        audioCtx = new AC();
        const b = audioCtx.createBuffer(1, 1, 22050);
        const s = audioCtx.createBufferSource();
        s.buffer = b;
        s.connect(audioCtx.destination);
        s.start(0);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playWoodSound(v) {
    if (!audioCtx || v < 0.2) return;
    const t = audioCtx.currentTime; const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(150 + Math.random() * 50, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(Math.min(v * 0.8, 1.0), t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.15); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.15);
}

async function toggleCamera() {
    const videoElement = document.getElementById('camera-feed');

    if (isCameraActive) {
        isCameraActive = false;
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        videoElement.style.display = 'none';
        scene.background = currentBgColor;

        if (floorMesh) { floorMesh.material.transparent = false; floorMesh.material.opacity = 1.0; floorMesh.material.needsUpdate = true; }
        if (userImagePlane) { userImagePlane.material.opacity = 1.0; userImagePlane.material.needsUpdate = true; }
        if (floorTextPlane) { floorTextPlane.material.opacity = 0.8; floorTextPlane.material.needsUpdate = true; }

    } else {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoElement.srcObject = cameraStream;
            videoElement.style.display = 'block';
            isCameraActive = true;

            scene.background = null;

            if (floorMesh) { floorMesh.material.transparent = true; floorMesh.material.opacity = 0; floorMesh.material.needsUpdate = true; }
            if (userImagePlane) { userImagePlane.material.opacity = 0.3; userImagePlane.material.needsUpdate = true; }
            if (floorTextPlane) { floorTextPlane.material.opacity = 0.5; floorTextPlane.material.needsUpdate = true; }

        } catch (err) {
            showToast("無法開啟相機", "請檢查權限或重新整理");
            console.error(err);
        }
    }
}

function showToast(title, msg) {
    const toast = document.getElementById('custom-toast');
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-msg').innerHTML = msg;
    toast.style.opacity = 1;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = 0; }, 2500);
}

function initUI() {
    document.getElementById('btn-settings').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'flex');

    document.getElementById('btn-close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').style.display = 'none';
    });

    document.getElementById('btn-camera').addEventListener('click', () => {
        initAudio();
        toggleCamera();
    });

    const fi = document.getElementById('input-bg-file');
    fi.addEventListener('change', (e) => { if (e.target.files.length > 0) document.getElementById('file-label').innerText = "已選擇: " + e.target.files[0].name; });

    document.getElementById('input-gps').addEventListener('change', (e) => { toggleGPS(e.target.checked); });

    document.getElementById('input-streak-mode').addEventListener('change', (e) => {
        userData.useStreak = e.target.checked;
        streakCount = 0;
        updateStreakDots();
    });

    document.getElementById('input-divination-mode').addEventListener('change', (e) => {
        userData.useDivinationMode = e.target.checked;
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        initAudio();

        const bdayInput = document.getElementById('input-bday');
        const bdayVal = bdayInput.value.trim();

        if (bdayVal && !/^\d{8}$/.test(bdayVal)) {
            showToast("日期格式錯誤", "請輸入 8 位數字<br>例如：20080825");
            return;
        }

        userData.bday = bdayVal;

        updateFloorText(document.getElementById('input-floor-text').value);
        if (fi.files && fi.files[0]) { const r = new FileReader(); r.onload = (e) => updateUserImage(e.target.result); r.readAsDataURL(fi.files[0]); }

        document.getElementById('settings-modal').style.display = 'none';
        const overlay = document.getElementById('injection-overlay');
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.opacity = 0;
            setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = 1; }, 1000);
        }, 1500);
    });

    document.addEventListener('pointerup', (e) => {
        if (window.innerWidth > window.innerHeight) return;

        if (e.target.closest('#btn-settings') || e.target.closest('#settings-modal') || e.target.closest('#btn-camera')) return;
        initAudio();
        handleInteraction();
    });
}
function initShakeDetection() {
    if (!window.DeviceMotionEvent) return; let lastTime = 0;
    window.addEventListener('devicemotion', (e) => {
        if (window.innerWidth > window.innerHeight) return;
        if (currentState !== GAME_STATE.READY) return; const acc = e.accelerationIncludingGravity; if (!acc) return;
        if ((Math.abs(acc.x) > 15 || Math.abs(acc.y) > 15 || Math.abs(acc.z) > 15)) { if (Date.now() - lastTime > 1000) { lastTime = Date.now(); initAudio(); handleInteraction(); } }
    });
}

function handleInteraction() { if (currentState === GAME_STATE.READY) startToss(); else if (currentState === GAME_STATE.RESULT) resetToReadyState(); }
function resetToReadyState() {
    if (!moonLeft || !moonRight) return; currentState = GAME_STATE.READY;
    document.getElementById('result-display').style.opacity = 0; document.getElementById('instruction').innerText = "誠心祈求 點擊或搖晃擲筊"; document.getElementById('instruction').style.opacity = 1;
    const r = (b, c) => {
        b.setTranslation(c.pos, true);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(c.rot.x), THREE.MathUtils.degToRad(c.rot.y), THREE.MathUtils.degToRad(c.rot.z)));
        b.setRotation(q, true); b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true); b.setGravityScale(0, true);
        b.setLinearDamping(0.2); b.setAngularDamping(0.2); b.wakeUp();
    };
    r(moonLeft, CONFIG_LEFT); r(moonRight, CONFIG_RIGHT); stableFrames = 0;
}

function startToss() {
    if (!moonLeft || !moonRight) return; currentState = GAME_STATE.TOSSING; document.getElementById('instruction').style.opacity = 0;

    if (navigator && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate([30, 50, 30]); } catch (e) { }
    }

    const params = fateEngine.calculatePhysicsParameters(userData.bday, userLocation.lat, userLocation.lng);
    const frictionEffect = params.friction * 0.3;

    [moonLeft, moonRight].forEach(body => {
        body.setLinearDamping(0.05 + frictionEffect * 0.1); body.setAngularDamping(0.05 + frictionEffect * 0.1);
        body.setGravityScale(1.2, true); body.wakeUp();
    });

    const upwardForce = params.force * 18;

    moonLeft.applyImpulse({ x: 0, y: upwardForce, z: 0 }, true);
    moonLeft.applyTorqueImpulse({ x: params.torque.x * 12 * params.asymmetry.left, y: params.torque.y * 6, z: params.torque.z * 6 }, true);
    moonRight.applyImpulse({ x: 0, y: upwardForce, z: 0 }, true);
    moonRight.applyTorqueImpulse({ x: params.torque.x * 12 * params.asymmetry.right, y: -params.torque.y * 6, z: -params.torque.z * 6 }, true);

    if (dampingTimer) clearTimeout(dampingTimer);
    dampingTimer = setTimeout(() => { if (currentState === GAME_STATE.TOSSING) { moonLeft.setLinearDamping(5.0); moonRight.setLinearDamping(5.0); moonLeft.setAngularDamping(5.0); moonRight.setAngularDamping(5.0); } }, 2500);

    if (safetyTimer) clearTimeout(safetyTimer);
    safetyTimer = setTimeout(() => {
        if (currentState === GAME_STATE.TOSSING) {
            showResult();
        }
    }, 6000);
}

function animate() {
    requestAnimationFrame(animate);

    let deltaTime = clock.getDelta();
    if (deltaTime > 0.1) deltaTime = 0.1;

    if (fireLight) fireLight.intensity = 8.0 + Math.sin(Date.now() * 0.003) * 1.0 + Math.sin(Date.now() * 0.008) * 0.5;

    if (world && physicsReady) {
        physicsAccumulator += deltaTime * SIMULATION_SPEED;

        while (physicsAccumulator >= PHYSICS_STEP) {
            world.step(eventQueue);
            physicsAccumulator -= PHYSICS_STEP;

            eventQueue.drainCollisionEvents((h1, h2, started) => {
                if (!started) return;

                let speed = 0;
                if (moonLeft) {
                    const v = moonLeft.linvel();
                    speed = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
                }

                if (speed > 0.3) {
                    playWoodSound(speed);
                    if (speed > 1.5 && navigator && typeof navigator.vibrate === 'function') {
                        try { navigator.vibrate(15); } catch (e) { }
                    }
                }
            });

            if (currentState === GAME_STATE.TOSSING && moonLeft) {
                const vL = moonLeft.linvel(); const vR = moonRight.linvel();
                const energy = vL.x ** 2 + vL.y ** 2 + vL.z ** 2 + vR.x ** 2 + vR.y ** 2 + vR.z ** 2;
                const tL = moonLeft.translation();
                const tR = moonRight.translation();
                const isOnGround = tL.y < 1.0 && tR.y < 1.0;

                if (energy < 0.3) stableFrames++; else stableFrames = 0;

                if (stableFrames > REQUIRED_STABLE_FRAMES) showResult();
            }
        }

        const sync = (body, mesh) => {
            if (body && mesh) {
                const t = body.translation();
                const r = body.rotation();
                mesh.position.set(t.x, t.y, t.z);
                mesh.quaternion.set(r.x, r.y, r.z, r.w);
            }
        };
        sync(moonLeft, meshLeft); sync(moonRight, meshRight);
    }
    renderer.render(scene, camera);
}

function showResult() {
    if (safetyTimer) clearTimeout(safetyTimer); if (dampingTimer) clearTimeout(dampingTimer);
    currentState = GAME_STATE.RESULT;

    const getSide = (mesh) => {
        if (!mesh) return 2;
        const y = localUpAxis.clone().applyQuaternion(mesh.quaternion).y;
        if (y > 0.5) return 1; if (y < -0.5) return 0; return 2;
    };

    const sL = getSide(meshLeft); const sR = getSide(meshRight);
    let title = "", desc = "", color = "";
    let isShengJiao = false;

    const textGame = {
        li: { t: "立筊", d: "【太鬼了】系統異常，偵測到稀有變數！" },
        xiao: { t: "笑筊", d: "【要確欸？】是不是沒想清楚？再一次！" },
        yin: { t: "陰筊", d: "【先不要】感覺不太對，頻率沒對上！" },
        sheng: { t: "聖筊", d: "【歐氣爆發】不用懷疑，這波穩了！" }
    };

    const textDivination = {
        li: { t: "立筊", d: "【天降神蹟】所求之事，神明深意" },
        xiao: { t: "笑筊", d: "【機緣未到】心意未定，再次請示" },
        yin: { t: "陰筊", d: "【不宜】時機未到，宜守不宜進" },
        sheng: { t: "聖筊", d: "【允准】所求遂意，天人感應" }
    };

    const txt = userData.useDivinationMode ? textDivination : textGame;

    if (sL === 2 || sR === 2) {
        title = txt.li.t; desc = txt.li.d; color = "#ff00ff";
    } else if (sL === 1 && sR === 1) {
        title = txt.xiao.t; desc = txt.xiao.d; color = "#e0e0e0";
    } else if (sL === 0 && sR === 0) {
        title = txt.yin.t; desc = txt.yin.d; color = "#aaaaaa";
    } else {
        title = txt.sheng.t; desc = txt.sheng.d; color = "#ff3333";
        isShengJiao = true;
    }

    if (userData.useStreak) {
        if (isShengJiao) {
            streakCount++;
            if (streakCount >= 3) {
                showStreakOverlay();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
            }
        } else {
            streakCount = 0;
        }
        updateStreakDots();
    }

    const rt = document.getElementById('res-text'); const rd = document.getElementById('res-desc');
    if (rt && rd) {
        rt.innerText = title; rt.style.color = color; rd.innerText = desc;
        document.getElementById('result-display').style.opacity = 1; document.getElementById('instruction').innerText = "點擊任意處重新擲筊"; document.getElementById('instruction').style.opacity = 1;
    }
}
init();