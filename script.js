// Variáveis globais
let videoFile = null;
let videoPlayer = null;
let currentFrame = 0;
let totalFrames = 0;
let fps = 30;
let startTime = 0;
let endTime = 0;
let isDragging = false;
let zoomLevel = 100;
let selectedFormat = 'mp4';
let thumbnailCanvas = null;
let thumbnailCtx = null;
let thumbnails = [];
let isPlaying = false;

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const videoFileInput = document.getElementById('videoFile');
const loading = document.getElementById('loading');
const editorSection = document.getElementById('editorSection');
const videoPlayerEl = document.getElementById('videoPlayer');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const timelineTrack = document.getElementById('timelineTrack');
const timelineProgress = document.getElementById('timelineProgress');
const timelineMarker = document.getElementById('timelineMarker');
const cutMarkers = document.getElementById('cutMarkers');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const frameInput = document.getElementById('frameInput');
const totalFramesSpan = document.getElementById('totalFrames');
const prevFrameBtn = document.getElementById('prevFrameBtn');
const nextFrameBtn = document.getElementById('nextFrameBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const setStartBtn = document.getElementById('setStartBtn');
const setEndBtn = document.getElementById('clearMarksBtn');
const exportBtn = document.getElementById('exportBtn');
const exportProgress = document.getElementById('exportProgress');
const exportResult = document.getElementById('exportResult');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('totalTime');
const startTimeDisplay = document.getElementById('startTimeDisplay');
const endTimeDisplay = document.getElementById('endTimeDisplay');
const cutDurationDisplay = document.getElementById('cutDurationDisplay');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Configurar canvas para thumbnails
    thumbnailCanvas = document.getElementById('thumbnailCanvas');
    thumbnailCtx = thumbnailCanvas.getContext('2d');
    
    // Event listeners para upload
    setupUploadEvents();
    
    // Event listeners para editor
    setupEditorEvents();
    
    // Event listeners para exportação
    setupExportEvents();
}

function setupUploadEvents() {
    uploadSection.addEventListener('click', () => {
        videoFileInput.click();
    });

    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('dragover');
    });

    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('dragover');
    });

    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadVideo(files[0]);
        }
    });

    videoFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadVideo(e.target.files[0]);
        }
    });
}

function setupEditorEvents() {
    // Timeline click
    timelineTrack.addEventListener('click', (e) => {
        if (isDragging) return;
        const rect = timelineTrack.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        videoPlayer.currentTime = percentage * videoPlayer.duration;
        updateUI();
    });

    // Timeline drag
    timelineMarker.addEventListener('mousedown', startDrag);
    timelineMarker.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    // Frame controls
    prevFrameBtn.addEventListener('click', () => {
        if (currentFrame > 0) {
            currentFrame--;
            videoPlayer.currentTime = currentFrame / fps;
            updateUI();
        }
    });

    nextFrameBtn.addEventListener('click', () => {
        if (currentFrame < totalFrames - 1) {
            currentFrame++;
            videoPlayer.currentTime = currentFrame / fps;
            updateUI();
        }
    });

    frameInput.addEventListener('input', () => {
        const frame = parseInt(frameInput.value);
        if (!isNaN(frame) && frame >= 0 && frame < totalFrames) {
            currentFrame = frame;
            videoPlayer.currentTime = currentFrame / fps;
            updateUI();
        }
    });

    // Play/Pause
    playPauseBtn.addEventListener('click', togglePlayPause);

    // Video events
    videoPlayerEl.addEventListener('timeupdate', updateUI);
    videoPlayerEl.addEventListener('loadedmetadata', onVideoLoaded);
    videoPlayerEl.addEventListener('play', () => {
        isPlaying = true;
        playPauseBtn.textContent = '⏸ Pause';
    });
    videoPlayerEl.addEventListener('pause', () => {
        isPlaying = false;
        playPauseBtn.textContent = '▶ Play';
    });

    // Zoom
    zoomSlider.addEventListener('input', (e) => {
        zoomLevel = parseInt(e.target.value);
        zoomValue.textContent = zoomLevel + '%';
        thumbnailsContainer.style.transform = `scaleX(${zoomLevel / 100})`;
    });

    // Cut marks
    setStartBtn.addEventListener('click', () => {
        startTime = videoPlayer.currentTime;
        if (endTime > 0 && startTime > endTime) {
            endTime = 0;
        }
        updateCutMarkers();
        updateExportInfo();
    });

    setEndBtn.addEventListener('click', () => {
        endTime = videoPlayer.currentTime;
        if (startTime > endTime) {
            startTime = 0;
        }
        updateCutMarkers();
        updateExportInfo();
    });

    clearMarksBtn.addEventListener('click', () => {
        startTime = 0;
        endTime = 0;
        updateCutMarkers();
        updateExportInfo();
    });

    // Quick cuts
    document.getElementById('cut30sStart').addEventListener('click', () => {
        startTime = Math.min(30, videoPlayer.duration);
        if (endTime > 0 && startTime > endTime) {
            endTime = 0;
        }
        updateCutMarkers();
        updateExportInfo();
    });

    document.getElementById('cut30sEnd').addEventListener('click', () => {
        endTime = Math.max(videoPlayer.duration - 30, 0);
        if (startTime > endTime) {
            startTime = 0;
        }
        updateCutMarkers();
        updateExportInfo();
    });

    document.getElementById('cut60sStart').addEventListener('click', () => {
        startTime = Math.min(60, videoPlayer.duration);
        if (endTime > 0 && startTime > endTime) {
            endTime = 0;
        }
        updateCutMarkers();
        updateExportInfo();
    });

    document.getElementById('cut60sEnd').addEventListener('click', () => {
        endTime = Math.max(videoPlayer.duration - 60, 0);
        if (startTime > endTime) {
            startTime = 0;
        }
        updateCutMarkers();
        updateExportInfo();
    });

    // Thumbnail click
    thumbnailsContainer.addEventListener('click', (e) => {
        const thumbnail = e.target.closest('.thumbnail');
        if (thumbnail) {
            const frame = parseInt(thumbnail.dataset.frame);
            currentFrame = frame;
            videoPlayer.currentTime = frame / fps;
            updateUI();
        }
    });
}

function setupExportEvents() {
    // Format selection
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedFormat = btn.dataset.format;
        });
    });

    // Export button
    exportBtn.addEventListener('click', exportVideo);
}

function loadVideo(file) {
    if (!file.type.match('video.*')) {
        alert('Por favor, selecione um arquivo de vídeo válido.');
        return;
    }

    videoFile = file;
    videoPlayer = videoPlayerEl;
    
    // Mostrar loading
    uploadSection.style.display = 'none';
    loading.classList.add('active');
    
    // Carregar vídeo
    const videoURL = URL.createObjectURL(file);
    videoPlayer.src = videoURL;
    
    videoPlayer.onerror = () => {
        loading.classList.remove('active');
        uploadSection.style.display = '';
        alert('Erro ao carregar o vídeo. Por favor, tente outro arquivo.');
    };
}

function onVideoLoaded() {
    // Calcular frames
    fps = getVideoFPS(videoPlayer);
    totalFrames = Math.floor(videoPlayer.duration * fps);
    totalFramesSpan.textContent = totalFrames;
    
    // Atualizar UI
    totalTimeSpan.textContent = formatTime(videoPlayer.duration);
    
    // Gerar thumbnails
    generateThumbnails().then(() => {
        // Esconder loading e mostrar editor
        loading.classList.remove('active');
        editorSection.classList.add('active');
        updateUI();
    });
}

function getVideoFPS(video) {
    // Método aproximado para obter FPS
    return 30; // Valor padrão para a maioria dos vídeos
}

async function generateThumbnails() {
    thumbnails = [];
    thumbnailsContainer.innerHTML = '';
    
    const thumbnailCount = 50; // Número de thumbnails a gerar
    const interval = videoPlayer.duration / thumbnailCount;
    
    for (let i = 0; i < thumbnailCount; i++) {
        const time = i * interval;
        const frame = Math.floor(time * fps);
        
        try {
            const thumbnail = await captureFrame(time);
            thumbnails.push({ time, frame, thumbnail });
            
            const thumbnailEl = document.createElement('div');
            thumbnailEl.className = 'thumbnail';
            thumbnailEl.dataset.time = time;
            thumbnailEl.dataset.frame = frame;
            thumbnailEl.style.backgroundImage = `url(${thumbnail})`;
            thumbnailsContainer.appendChild(thumbnailEl);
        } catch (error) {
            console.error('Erro ao capturar frame:', error);
        }
    }
}

function captureFrame(time) {
    return new Promise((resolve) => {
        const seekHandler = () => {
            videoPlayer.removeEventListener('seeked', seekHandler);
            
            thumbnailCanvas.width = videoPlayer.videoWidth;
            thumbnailCanvas.height = videoPlayer.videoHeight;
            thumbnailCtx.drawImage(videoPlayer, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            
            const dataURL = thumbnailCanvas.toDataURL('image/jpeg', 0.7);
            resolve(dataURL);
        };
        
        videoPlayer.addEventListener('seeked', seekHandler);
        videoPlayer.currentTime = time;
    });
}

function updateUI() {
    if (!videoPlayer) return;
    
    // Atualizar frame atual
    currentFrame = Math.floor(videoPlayer.currentTime * fps);
    frameInput.value = currentFrame;
    
    // Atualizar tempo atual
    currentTimeSpan.textContent = formatTime(videoPlayer.currentTime);
    
    // Atualizar timeline
    const progressPercentage = (videoPlayer.currentTime / videoPlayer.duration) * 100;
    timelineProgress.style.width = `${progressPercentage}%`;
    timelineMarker.style.left = `${progressPercentage}%`;
    
    // Atualizar thumbnails ativo
    updateActiveThumbnail();
}

function updateActiveThumbnail() {
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
        const frame = parseInt(thumb.dataset.frame);
        if (Math.abs(frame - currentFrame) <= 1) {
            thumb.classList.add('active');
        }
    });
}

function updateCutMarkers() {
    cutMarkers.innerHTML = '';
    
    if (startTime > 0) {
        const startMarker = document.createElement('div');
        startMarker.className = 'cut-marker start';
        startMarker.style.left = `${(startTime / videoPlayer.duration) * 100}%`;
        cutMarkers.appendChild(startMarker);
    }
    
    if (endTime > 0) {
        const endMarker = document.createElement('div');
        endMarker.className = 'cut-marker end';
        endMarker.style.left = `${(endTime / videoPlayer.duration) * 100}%`;
        cutMarkers.appendChild(endMarker);
    }
}

function updateExportInfo() {
    startTimeDisplay.textContent = formatTime(startTime);
    endTimeDisplay.textContent = formatTime(endTime > 0 ? endTime : videoPlayer.duration);
    
    const duration = (endTime > 0 ? endTime : videoPlayer.duration) - startTime;
    cutDurationDisplay.textContent = formatTime(duration);
}

function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}

function togglePlayPause() {
    if (isPlaying) {
        videoPlayer.pause();
    } else {
        videoPlayer.play();
    }
}

function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    timelineMarker.classList.add('dragging');
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const rect = timelineTrack.getBoundingClientRect();
    let x = e.clientX - rect.left;
    
    // Limitar dentro da timeline
    x = Math.max(0, Math.min(x, rect.width));
    
    const percentage = x / rect.width;
    videoPlayer.currentTime = percentage * videoPlayer.duration;
    updateUI();
}

function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    timelineMarker.classList.remove('dragging');
}

function exportVideo() {
    if (!videoFile) return;
    
    exportResult.className = 'export-result';
    exportResult.style.display = 'none';
    exportProgress.style.width = '0%';
    
    // Simular exportação (em um projeto real, você usaria uma biblioteca como FFmpeg.js)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        exportProgress.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            exportProgress.style.width = '100%';
            
            // Criar um link de download simulado
            const blob = new Blob([videoFile], { type: `video/${selectedFormat}` });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `freecut-edit.${selectedFormat}`;
            a.click();
            
            // Mostrar mensagem de sucesso
            exportResult.textContent = 'Vídeo exportado com sucesso!';
            exportResult.className = 'export-result success';
            exportResult.style.display = 'block';
        }
    }, 100);
}

// Função para detectar teclas de atalho
document.addEventListener('keydown', (e) => {
    if (!editorSection.classList.contains('active')) return;
    
    switch (e.key) {
        case ' ':
            togglePlayPause();
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (currentFrame > 0) {
                currentFrame--;
                videoPlayer.currentTime = currentFrame / fps;
                updateUI();
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (currentFrame < totalFrames - 1) {
                currentFrame++;
                videoPlayer.currentTime = currentFrame / fps;
                updateUI();
            }
            e.preventDefault();
            break;
        case '[':
            startTime = videoPlayer.currentTime;
            if (endTime > 0 && startTime > endTime) {
                endTime = 0;
            }
            updateCutMarkers();
            updateExportInfo();
            break;
        case ']':
            endTime = videoPlayer.currentTime;
            if (startTime > endTime) {
                startTime = 0;
            }
            updateCutMarkers();
            updateExportInfo();
            break;
    }
});
