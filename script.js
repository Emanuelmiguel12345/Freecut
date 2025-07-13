document.addEventListener('DOMContentLoaded', async function() {
    // Elementos do DOM
    const videoInput = document.getElementById('videoInput');
    const dropZone = document.getElementById('dropZone');
    const uploadArea = document.getElementById('uploadArea');
    const editorArea = document.getElementById('editorArea');
    const videoPlayer = document.getElementById('videoPlayer');
    const currentTimeDisplay = document.getElementById('currentTime');
    const totalTimeDisplay = document.getElementById('totalTime');
    const thumbnailsContainer = document.getElementById('thumbnails');
    const progressBar = document.getElementById('progress');
    const playhead = document.getElementById('playhead');
    const startMarker = document.getElementById('startMarker');
    const endMarker = document.getElementById('endMarker');
    const frameInput = document.getElementById('frameInput');
    const prevFrameBtn = document.getElementById('prevFrame');
    const nextFrameBtn = document.getElementById('nextFrame');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomLevel = document.getElementById('zoomLevel');
    const trimStartBtn = document.getElementById('trimStart');
    const trimEndBtn = document.getElementById('trimEnd');
    const setStartBtn = document.getElementById('setStart');
    const setEndBtn = document.getElementById('setEnd');
    const exportMP4Btn = document.getElementById('exportMP4');
    const exportGIFBtn = document.getElementById('exportGIF');
    const processingDiv = document.getElementById('processing');
    const exportProgress = document.getElementById('exportProgress');
    const waveformCanvas = document.getElementById('waveform');

    // Configuração do FFmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ 
        log: true,
        progress: ({ ratio }) => {
            exportProgress.style.width = `${ratio * 100}%`;
        }
    });
    await ffmpeg.load();

    // Variáveis de estado
    let videoFile = null;
    let videoDuration = 0;
    let currentZoom = 100;
    let frames = [];
    let isDragging = false;
    let startPosition = 0;
    let endPosition = 100;
    let fps = 30; // Valor padrão, será atualizado
    let videoWidth = 0;
    let videoHeight = 0;

    // Eventos de upload
    videoInput.addEventListener('change', handleFileSelect);
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('active');
    });
    
    dropZone.addEventListener('dragleave', function() {
        dropZone.classList.remove('active');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('active');
        if (e.dataTransfer.files.length) {
            videoInput.files = e.dataTransfer.files;
            handleFileSelect({ target: videoInput });
        }
    });

    // Função para lidar com a seleção de arquivo
    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file.type.match('video.*')) {
            alert('Por favor, selecione um arquivo de vídeo.');
            return;
        }
        
        videoFile = file;
        const videoURL = URL.createObjectURL(file);
        videoPlayer.src = videoURL;
        
        uploadArea.style.display = 'none';
        editorArea.style.display = 'block';
        
        videoPlayer.onloadedmetadata = async function() {
            videoDuration = videoPlayer.duration;
            videoWidth = videoPlayer.videoWidth;
            videoHeight = videoPlayer.videoHeight;
            
            // Estimativa de FPS (para navegadores que não fornecem)
            try {
                fps = await estimateFPS(videoPlayer);
            } catch (e) {
                console.warn("Não foi possível detectar FPS, usando padrão 30", e);
                fps = 30;
            }
            
            totalTimeDisplay.textContent = formatTime(videoDuration);
            
            // Gerar miniaturas reais
            await generateRealThumbnails();
            
            // Configurar marcadores
            startMarker.style.left = '0%';
            endMarker.style.left = '100%';
            startPosition = 0;
            endPosition = 100;
            
            // Desenhar waveform
            drawWaveform();
        };
    }

    // Função para estimar FPS
    async function estimateFPS(video) {
        return new Promise((resolve) => {
            let lastTime = performance.now();
            let frameCount = 0;
            let fps = 30; // Default
            
            function checkFPS() {
                frameCount++;
                const now = performance.now();
                if (now - lastTime >= 1000) {
                    fps = frameCount;
                    video.removeEventListener('timeupdate', checkFPS);
                    resolve(fps);
                }
            }
            
            video.addEventListener('timeupdate', checkFPS);
            video.currentTime = 0.1; // Forçar início
        });
    }

    // Formatador de tempo
    function formatTime(seconds) {
        const date = new Date(seconds * 1000);
        return date.toISOString().substr(11, 8).split('.')[0];
    }

    // Atualizar tempo atual
    videoPlayer.addEventListener('timeupdate', function() {
        currentTimeDisplay.textContent = formatTime(videoPlayer.currentTime);
        const progressPercent = (videoPlayer.currentTime / videoDuration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        playhead.style.left = `${progressPercent}%`;
        
        // Atualizar frame atual
        const currentFrame = Math.floor(videoPlayer.currentTime * fps);
        frameInput.value = currentFrame;
    });

    // Gerar miniaturas reais usando FFmpeg
    async function generateRealThumbnails() {
        processingDiv.style.display = 'block';
        thumbnailsContainer.innerHTML = '';
        
        const thumbnailCount = 20;
        const interval = videoDuration / thumbnailCount;
        
        // Usar FFmpeg para extrair frames
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
        
        for (let i = 0; i < thumbnailCount; i++) {
            const time = i * interval;
            
            try {
                await ffmpeg.run(
                    '-i', 'input.mp4',
                    '-ss', time.toString(),
                    '-frames:v', '1',
                    '-vf', `scale=80:50`,
                    `thumb${i}.png`
                );
                
                const data = ffmpeg.FS('readFile', `thumb${i}.png`);
                const blob = new Blob([data.buffer], { type: 'image/png' });
                const url = URL.createObjectURL(blob);
                
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail';
                thumb.style.backgroundImage = `url(${url})`;
                thumb.dataset.time = time;
                thumb.title = `Frame ${i+1} - ${formatTime(time)}`;
                
                thumb.addEventListener('click', function() {
                    videoPlayer.currentTime = parseFloat(this.dataset.time);
                });
                
                thumbnailsContainer.appendChild(thumb);
                
            } catch (e) {
                console.error("Erro ao gerar miniatura:", e);
                // Fallback para placeholder
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail';
                thumb.textContent = `Frame ${i+1}`;
                thumb.dataset.time = time;
                thumb.addEventListener('click', function() {
                    videoPlayer.currentTime = parseFloat(this.dataset.time);
                });
                thumbnailsContainer.appendChild(thumb);
            }
        }
        
        processingDiv.style.display = 'none';
    }

    // Desenhar waveform do áudio
    async function drawWaveform() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await videoFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const canvas = waveformCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = 60;
        
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;
        
        ctx.fillStyle = 'rgba(108, 74, 182, 0.5)';
        ctx.strokeStyle = '#6C4AB6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let i = 0; i < canvas.width; i++) {
            const min = 1.0;
            const max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            ctx.moveTo(i, amp * (1 - min));
            ctx.lineTo(i, amp * (1 - max));
        }
        
        ctx.stroke();
    }

    // Navegação frame a frame
    function goToFrame(frame) {
        const totalFrames = Math.floor(videoDuration * fps);
        
        if (frame < 0) frame = 0;
        if (frame > totalFrames) frame = totalFrames;
        
        videoPlayer.currentTime = frame / fps;
        frameInput.value = frame;
    }

    frameInput.addEventListener('change', function() {
        goToFrame(parseInt(this.value));
    });

    prevFrameBtn.addEventListener('click', function() {
        goToFrame(parseInt(frameInput.value) - 1);
    });

    nextFrameBtn.addEventListener('click', function() {
        goToFrame(parseInt(frameInput.value) + 1);
    });

    // Controles de zoom
    function updateZoom() {
        zoomLevel.textContent = `${currentZoom}%`;
        thumbnailsContainer.style.transform = `scaleX(${currentZoom / 100})`;
        thumbnailsContainer.style.transformOrigin = 'left center';
    }

    zoomInBtn.addEventListener('click', function() {
        if (currentZoom < 300) {
            currentZoom += 25;
            updateZoom();
        }
    });

    zoomOutBtn.addEventListener('click', function() {
        if (currentZoom > 100) {
            currentZoom -= 25;
            updateZoom();
        }
    });

    // Cortes e marcadores
    setStartBtn.addEventListener('click', function() {
        startPosition = (videoPlayer.currentTime / videoDuration) * 100;
        startMarker.style.left = `${startPosition}%`;
    });

    setEndBtn.addEventListener('click', function() {
        endPosition = (videoPlayer.currentTime / videoDuration) * 100;
        endMarker.style.left = `${endPosition}%`;
    });

    trimStartBtn.addEventListener('click', function() {
        const newTime = Math.min(videoPlayer.currentTime + 30, videoDuration);
        videoPlayer.currentTime = newTime;
        startPosition = (newTime / videoDuration) * 100;
        startMarker.style.left = `${startPosition}%`;
    });

    trimEndBtn.addEventListener('click', function() {
        const newTime = Math.max(videoPlayer.currentTime - 30, 0);
        videoPlayer.currentTime = newTime;
        endPosition = (newTime / videoDuration) * 100;
        endMarker.style.left = `${endPosition}%`;
    });

    // Exportação real usando FFmpeg
    exportMP4Btn.addEventListener('click', async function() {
        if (!videoFile) return;
        
        processingDiv.style.display = 'block';
        
        try {
            const startTime = (startPosition / 100) * videoDuration;
            const endTime = (endPosition / 100) * videoDuration;
            const duration = endTime - startTime;
            
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
            
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                'output.mp4'
            );
            
            const data = ffmpeg.FS('readFile', 'output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'video_cortado.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (e) {
            console.error("Erro ao exportar:", e);
            alert("Erro ao exportar o vídeo: " + e.message);
        } finally {
            processingDiv.style.display = 'none';
        }
    });

    exportGIFBtn.addEventListener('click', async function() {
        if (!videoFile) return;
        
        processingDiv.style.display = 'block';
        
        try {
            const startTime = (startPosition / 100) * videoDuration;
            const endTime = (endPosition / 100) * videoDuration;
            const duration = endTime - startTime;
            
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
            
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-vf', 'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                '-loop', '0',
                'output.gif'
            );
            
            const data = ffmpeg.FS('readFile', 'output.gif');
            const blob = new Blob([data.buffer], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'animacao.gif';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (e) {
            console.error("Erro ao exportar GIF:", e);
            alert("Erro ao exportar GIF: " + e.message);
        } finally {
            processingDiv.style.display = 'none';
        }
    });

    // Arraste dos marcadores
    function setupMarkerDrag(marker, isStart) {
        marker.addEventListener('mousedown', function(e) {
            isDragging = true;
            document.addEventListener('mousemove', dragMarker);
            document.addEventListener('mouseup', stopDrag);
            e.preventDefault();
        });

        function dragMarker(e) {
            if (!isDragging) return;
            
            const timelineRect = document.querySelector('.timeline').getBoundingClientRect();
            let percent = (e.clientX - timelineRect.left) / timelineRect.width;
            percent = Math.max(0, Math.min(1, percent));
            
            if (isStart) {
                if (percent * 100 >= endPosition) percent = endPosition / 100;
                startPosition = percent * 100;
                marker.style.left = `${startPosition}%`;
                videoPlayer.currentTime = videoDuration * percent;
            } else {
                if (percent * 100 <= startPosition) percent = startPosition / 100;
                endPosition = percent * 100;
                marker.style.left = `${endPosition}%`;
                videoPlayer.currentTime = videoDuration * percent;
            }
        }

        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', dragMarker);
            document.removeEventListener('mouseup', stopDrag);
        }
    }

    setupMarkerDrag(startMarker, true);
    setupMarkerDrag(endMarker, false);
});
