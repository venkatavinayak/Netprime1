/* js/player.js */

document.addEventListener('DOMContentLoaded', () => {
  // Extract Movie ID from URL
  const params = new URLSearchParams(window.location.search);
  const movieId = params.get('id');

  const movie = window.NetPrimeState.getMovieById(movieId);
  if (!movie) {
    alert('Movie not found!');
    window.location.href = './index.html';
    return;
  }

  // Double Check Security Gate
  const isPrem = window.NetPrimeState.isPremium();
  if (!movie.isFree && !isPrem) {
    alert('This content is reserved for Premium subscribers!');
    window.location.href = './index.html';
    return;
  }

  // Populate Movie details in player header
  const titleElem = document.getElementById('player-movie-title');
  const metaElem = document.getElementById('player-movie-meta');
  const videoSource = document.getElementById('video-source');
  const videoPlayer = document.getElementById('video-element');
  const videoContainer = document.getElementById('video-container');

  if (titleElem) titleElem.textContent = movie.title;
  if (metaElem) metaElem.textContent = `${movie.language} • ${movie.year} • Rating: ${movie.rating} ⭐`;

  // Set Video Source
  // Try to use the local video if present, otherwise fallback to the public sample stream
  if (videoSource && videoPlayer) {
    // If the local video link exists, it will load it directly. 
    // Otherwise browser automatically tries to load the source and fails over to next, 
    // or we can set it via JS with fallback.
    
    // Set first source as local, second as public online trailer
    videoPlayer.src = movie.video;
    
    // Fallback handler if local file fails (e.g. not copied or double clicked without asset)
    videoPlayer.addEventListener('error', function(e) {
      console.log('Local video file not found or failed to load. Falling back to public stream...');
      // Fallback stream: Tears of Steel open movie trailer
      videoPlayer.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
      videoPlayer.load();
      videoPlayer.play().catch(err => console.log('Autoplay blocked: ', err));
    }, { once: true });

    videoPlayer.load();
  }

  // Controls elements
  const playBtn = document.getElementById('play-btn');
  const playIcon = playBtn.querySelector('i');
  const skipBackBtn = document.getElementById('skip-back-btn');
  const skipForwardBtn = document.getElementById('skip-forward-btn');
  const volumeBtn = document.getElementById('volume-btn');
  const volumeIcon = volumeBtn.querySelector('i');
  const volumeSlider = document.getElementById('volume-slider');
  const timeCurrent = document.getElementById('time-current');
  const timeDuration = document.getElementById('time-duration');
  const scrubberContainer = document.getElementById('scrubber-container');
  const scrubberProgress = document.getElementById('scrubber-progress');
  const scrubberHandle = document.getElementById('scrubber-handle');
  const scrubberTooltip = document.getElementById('scrubber-tooltip');
  const speedBtn = document.getElementById('speed-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // Giant Center Overlay play button
  const centerPlayOverlay = document.createElement('div');
  centerPlayOverlay.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255, 0, 127, 0.85);
    color: #fff;
    font-size: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    z-index: 100;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;
    box-shadow: 0 0 30px rgba(255, 0, 127, 0.5);
  `;
  centerPlayOverlay.innerHTML = '<i class="fa fa-play"></i>';
  videoContainer.appendChild(centerPlayOverlay);

  // Play / Pause Toggle
  function togglePlay() {
    if (videoPlayer.paused) {
      videoPlayer.play();
      playIcon.className = 'fa fa-pause';
      triggerCenterOverlay('pause');
    } else {
      videoPlayer.pause();
      playIcon.className = 'fa fa-play';
      triggerCenterOverlay('play');
    }
  }

  function triggerCenterOverlay(type) {
    centerPlayOverlay.innerHTML = type === 'play' ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
    centerPlayOverlay.style.transform = 'translate(-50%, -50%) scale(1.1)';
    centerPlayOverlay.style.opacity = '1';
    
    setTimeout(() => {
      centerPlayOverlay.style.transform = 'translate(-50%, -50%) scale(0.8)';
      centerPlayOverlay.style.opacity = '0';
    }, 4500);
  }

  playBtn.addEventListener('click', togglePlay);
  videoPlayer.addEventListener('click', togglePlay);

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight') {
      skipForward();
    } else if (e.code === 'ArrowLeft') {
      skipBack();
    }
  });

  // Skip buttons
  function skipBack() {
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
  }
  
  function skipForward() {
    videoPlayer.currentTime = Math.min(videoPlayer.duration || 0, videoPlayer.currentTime + 10);
  }

  skipBackBtn.addEventListener('click', skipBack);
  skipForwardBtn.addEventListener('click', skipForward);

  // Formatting time stamps
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Update duration on loadedmetadata
  videoPlayer.addEventListener('loadedmetadata', () => {
    timeDuration.textContent = formatTime(videoPlayer.duration);
  });

  // Update scrubber progress and current time display
  videoPlayer.addEventListener('timeupdate', () => {
    const curTime = videoPlayer.currentTime;
    const duration = videoPlayer.duration || 0;
    
    timeCurrent.textContent = formatTime(curTime);
    
    if (duration > 0) {
      const percentage = (curTime / duration) * 100;
      scrubberProgress.style.width = `${percentage}%`;
      scrubberHandle.style.left = `${percentage}%`;
    }
  });

  // Drag scrubber seeking
  let isDragging = false;

  function seek(e) {
    const rect = scrubberContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    
    scrubberProgress.style.width = `${clampedPos * 100}%`;
    scrubberHandle.style.left = `${clampedPos * 100}%`;
    
    if (videoPlayer.duration) {
      videoPlayer.currentTime = clampedPos * videoPlayer.duration;
    }
  }

  scrubberContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    seek(e);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) seek(e);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Scrubber Hover Tooltip
  scrubberContainer.addEventListener('mousemove', (e) => {
    const rect = scrubberContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    
    if (videoPlayer.duration) {
      const targetTime = clampedPos * videoPlayer.duration;
      scrubberTooltip.textContent = formatTime(targetTime);
      scrubberTooltip.style.left = `${clampedPos * 100}%`;
      scrubberTooltip.style.display = 'block';
    }
  });

  scrubberContainer.addEventListener('mouseleave', () => {
    scrubberTooltip.style.display = 'none';
  });

  // Volume controls
  function updateVolume(val) {
    videoPlayer.volume = val;
    videoPlayer.muted = (val === 0);
    
    if (val === 0) {
      volumeIcon.className = 'fa fa-volume-mute';
    } else if (val < 0.5) {
      volumeIcon.className = 'fa fa-volume-low';
    } else {
      volumeIcon.className = 'fa fa-volume-high';
    }
  }

  volumeSlider.addEventListener('input', () => {
    updateVolume(parseFloat(volumeSlider.value));
  });

  volumeBtn.addEventListener('click', () => {
    if (videoPlayer.muted) {
      videoPlayer.muted = false;
      volumeSlider.value = videoPlayer.volume;
      updateVolume(videoPlayer.volume);
    } else {
      videoPlayer.muted = true;
      volumeSlider.value = 0;
      updateVolume(0);
    }
  });

  // Playback Speed Toggle
  let activeSpeed = 1;
  speedBtn.addEventListener('click', () => {
    const speeds = [1, 1.25, 1.5, 2, 0.5];
    const currentIndex = speeds.indexOf(activeSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    activeSpeed = speeds[nextIndex];
    
    videoPlayer.playbackRate = activeSpeed;
    speedBtn.textContent = `${activeSpeed}x`;
    
    // Quick notification toast
    window.showToastMessage(`Playback Speed: ${activeSpeed}x`);
  });

  // Fullscreen Toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen()
        .then(() => {
          fullscreenBtn.querySelector('i').className = 'fa fa-compress';
        })
        .catch(err => {
          console.error('Error enabling full-screen: ', err);
        });
    } else {
      document.exitFullscreen();
      fullscreenBtn.querySelector('i').className = 'fa fa-expand';
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Double click video to fullscreen
  videoPlayer.addEventListener('dblclick', toggleFullscreen);

  // Auto Hide Controls on inactivity
  let controlsTimeout;
  
  function showControls() {
    videoContainer.classList.add('controls-active');
    document.body.style.cursor = 'default';
    
    clearTimeout(controlsTimeout);
    
    if (!videoPlayer.paused) {
      controlsTimeout = setTimeout(() => {
        videoContainer.classList.remove('controls-active');
        document.body.style.cursor = 'none';
      }, 3000);
    }
  }

  videoContainer.addEventListener('mousemove', showControls);
  videoPlayer.addEventListener('play', showControls);
  videoPlayer.addEventListener('pause', showControls);

  showControls(); // Initial call
});
