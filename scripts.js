document.addEventListener('DOMContentLoaded', function() {
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
    const exportMP4Btn = document.getElementById('exportMP4');
    const exportGIFBtn = document.getElementById('exportGIF');

    // Variáveis de estado
    let videoFile = null;
    let videoDuration = 0;
    let currentZoom = 100;
    let frames = [];
    let isDragging = false;
    let startPosition = 0;
    let endPosition = 100;

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
    function handleFileSelect(event) {
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
        
        videoPlayer.onloadedmetadata = function() {
            videoDuration = videoPlayer.duration;
            totalTimeDisplay.textContent = formatTime(videoDuration);
            
            // Gerar miniaturas (simulação)
            generateThumbnails();
            
            // Configurar marcadores
            startMarker.style.left = '0%';
            endMarker.style.left = '100%';
            startPosition = 0;
            endPosition = 100;
        };
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
        const fps = 30; // Supondo 30fps (deveria detectar do vídeo)
        const currentFrame = Math.floor(videoPlayer.currentTime * fps);
        frameInput.value = currentFrame;
    });

    // Gerar miniaturas (simulação)
    function generateThumbnails() {
        thumbnailsContainer.innerHTML = '';
        const thumbnailCount = 20;
        
        for (let i = 0; i < thumbnailCount; i++) {
            const time = (videoDuration / thumbnailCount) * i;
            const thumb = document.createElement('div');
            thumb.className = 'thumbnail';
            thumb.style.backgroundImage = `url(https://via.placeholder.com/80x50?text=Frame+${i+1})`;
            thumb.dataset.time = time;
            
            thumb.addEventListener('click', function() {
                videoPlayer.currentTime = parseFloat(this.dataset.time);
            });
            
            thumbnailsContainer.appendChild(thumb);
        }
    }

    // Navegação frame a frame
    function goToFrame(frame) {
        const fps = 30; // Supondo 30fps
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
        // Aqui você implementaria a lógica real de zoom na timeline
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

    // Cortes rápidos
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

    // Exportação (simulação)
    exportMP4Btn.addEventListener('click', function() {
        alert('Exportação para MP4 iniciada! (Funcionalidade simulada)');
    });

    exportGIFBtn.addEventListener('click', function() {
        alert('Exportação para GIF iniciada! (Funcionalidade simulada)');
    });

    // Arraste dos marcadores (simplificado)
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
