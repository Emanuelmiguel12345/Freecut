document.addEventListener('DOMContentLoaded', async function() {
    // Elementos principais
    const videoInput = document.getElementById('videoInput');
    const videoPlayer = document.getElementById('videoPlayer');
    const thumbnails = document.getElementById('thumbnails');
    const progress = document.getElementById('progress');
    const startMarker = document.getElementById('startMarker');
    const endMarker = document.getElementById('endMarker');
    const setStartBtn = document.getElementById('setStart');
    const setEndBtn = document.getElementById('setEnd');
    const exportMP4Btn = document.getElementById('exportMP4');
    
    // Configuração do FFmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    
    // Variáveis de estado
    let videoFile = null;
    let videoDuration = 0;
    let startTime = 0;
    let endTime = 0;
    
    // Quando selecionar um vídeo
    videoInput.addEventListener('change', function(e) {
        videoFile = e.target.files[0];
        const videoURL = URL.createObjectURL(videoFile);
        videoPlayer.src = videoURL;
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('editorArea').style.display = 'block';
        
        videoPlayer.onloadedmetadata = function() {
            videoDuration = videoPlayer.duration;
            endTime = videoDuration;
            updateMarkers();
            generateThumbnails();
        };
    });
    
    // Atualizar marcadores
    function updateMarkers() {
        startMarker.style.left = `${(startTime / videoDuration) * 100}%`;
        endMarker.style.left = `${(endTime / videoDuration) * 100}%`;
    }
    
    // Gerar miniaturas
    async function generateThumbnails() {
        thumbnails.innerHTML = '';
        document.getElementById('processing').style.display = 'block';
        
        try {
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
            
            const thumbnailCount = 10;
            for (let i = 0; i < thumbnailCount; i++) {
                const time = (videoDuration / thumbnailCount) * i;
                await ffmpeg.run(
                    '-i', 'input.mp4',
                    '-ss', time.toString(),
                    '-frames:v', '1',
                    '-vf', 'scale=80:-1',
                    `thumb${i}.png`
                );
                
                const data = ffmpeg.FS('readFile', `thumb${i}.png`);
                const url = URL.createObjectURL(new Blob([data.buffer], { type: 'image/png' }));
                
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail';
                thumb.style.backgroundImage = `url(${url})`;
                thumb.addEventListener('click', () => {
                    videoPlayer.currentTime = time;
                });
                thumbnails.appendChild(thumb);
            }
        } catch (error) {
            console.error(error);
        }
        
        document.getElementById('processing').style.display = 'none';
    }
    
    // Definir início/fim
    setStartBtn.addEventListener('click', function() {
        startTime = videoPlayer.currentTime;
        updateMarkers();
    });
    
    setEndBtn.addEventListener('click', function() {
        endTime = videoPlayer.currentTime;
        updateMarkers();
    });
    
    // Exportar vídeo
    exportMP4Btn.addEventListener('click', async function() {
        document.getElementById('processing').style.display = 'block';
        
        try {
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
            
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-ss', startTime.toString(),
                '-to', endTime.toString(),
                '-c:v', 'copy',
                '-c:a', 'copy',
                'output.mp4'
            );
            
            const data = ffmpeg.FS('readFile', 'output.mp4');
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'video_cortado.mp4';
            a.click();
        } catch (error) {
            console.error(error);
            alert('Erro ao exportar o vídeo');
        }
        
        document.getElementById('processing').style.display = 'none';
    });
    
    // Atualizar barra de progresso
    videoPlayer.addEventListener('timeupdate', function() {
        progress.style.width = `${(videoPlayer.currentTime / videoDuration) * 100}%`;
    });
});
