const uploadFile = document.getElementById('uploadFile');
const uploadForm = document.getElementById('uploadForm');
const fileLoader = document.querySelector('.file-loader');
const fileSubmitText = uploadForm.querySelector('.submit-text');

const startWebcamBtn = document.getElementById('startWebcam');
const captureAndDetectBtn = document.getElementById('captureAndDetect');
const stopWebcamBtn = document.getElementById('stopWebcam');
const webcamLoader = document.querySelector('.webcam-loader');
const webcamSubmitText = captureAndDetectBtn.querySelector('.submit-text');

const webcamContainer = document.getElementById('webcamContainer');
const webcamFeed = document.getElementById('webcamFeed');

const imageContainer = document.getElementById('imageContainer');
const uploadedImage = document.getElementById('uploadedImage');
const imageCanvas = document.getElementById('imageCanvas');
const imageCtx = imageCanvas.getContext('2d');

const captureCanvas = document.getElementById('captureCanvas');
const captureCtx = captureCanvas.getContext('2d');

let stream = null;

uploadFile.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage.src = e.target.result;
            uploadedImage.onload = function() {
                setCanvasDimensions(this.naturalWidth, this.naturalHeight);
                imageCtx.drawImage(this, 0, 0, imageCanvas.width, imageCanvas.height);
                imageContainer.style.display = 'block';
            }
        }
        reader.readAsDataURL(file);
        stopWebcamStream();
    }
});

uploadForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!uploadFile.files.length) {
        alert('请先选择一个图片文件！');
        return;
    }
    stopWebcamStream();

    const formData = new FormData(this);
    performDetection(formData, fileLoader, fileSubmitText, '上传并检测');
});

startWebcamBtn.addEventListener('click', async () => {
    if (stream) return;

    startWebcamBtn.disabled = true;
    stopWebcamBtn.disabled = false;
    uploadFile.value = '';

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamFeed.srcObject = stream;
        webcamContainer.style.display = 'flex';
        webcamFeed.onloadedmetadata = () => {
            captureAndDetectBtn.disabled = false;
        };
        imageContainer.style.display = 'none';

    } catch (err) {
        console.error("访问摄像头失败:", err);
        alert(`无法访问摄像头: ${err.name} - ${err.message}`);
        startWebcamBtn.disabled = false;
        stopWebcamBtn.disabled = true;
        captureAndDetectBtn.disabled = true;
    }
});

stopWebcamBtn.addEventListener('click', stopWebcamStream);

function stopWebcamStream() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        webcamFeed.srcObject = null;
        webcamContainer.style.display = 'none';
        startWebcamBtn.disabled = false;
        stopWebcamBtn.disabled = true;
        captureAndDetectBtn.disabled = true;
        console.log("摄像头已停止");
    }
}

captureAndDetectBtn.addEventListener('click', () => {
    if (!stream) {
        alert('请先开启摄像头！');
        return;
    }

    const videoWidth = webcamFeed.videoWidth;
    const videoHeight = webcamFeed.videoHeight;
    captureCanvas.width = videoWidth;
    captureCanvas.height = videoHeight;
    captureCtx.drawImage(webcamFeed, 0, 0, videoWidth, videoHeight);

    uploadedImage.src = captureCanvas.toDataURL('image/jpeg');
    uploadedImage.onload = () => {
        setCanvasDimensions(videoWidth, videoHeight);
        imageCtx.drawImage(uploadedImage, 0, 0, imageCanvas.width, imageCanvas.height);
        imageContainer.style.display = 'block';
    };


    captureCanvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('file', blob, 'webcam_capture.jpg');
        performDetection(formData, webcamLoader, webcamSubmitText, '拍照并检测');
    }, 'image/jpeg', 0.9);
});

function performDetection(formData, loaderElement, textElement, defaultText) {
    loaderElement.style.display = 'inline-block';
    textElement.textContent = '检测中...';
    const fileSubmitBtn = uploadForm.querySelector('button[type="submit"]');
    fileSubmitBtn.disabled = true;
    captureAndDetectBtn.disabled = true;


    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(faces => {
            imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            if (uploadedImage.complete && uploadedImage.naturalWidth > 0) {
                imageCtx.drawImage(uploadedImage, 0, 0, imageCanvas.width, imageCanvas.height);
                drawDetectionBoxes(faces);
            } else {
                uploadedImage.onload = () => {
                    setCanvasDimensions(uploadedImage.naturalWidth, uploadedImage.naturalHeight);
                    imageCtx.drawImage(uploadedImage, 0, 0, imageCanvas.width, imageCanvas.height);
                    drawDetectionBoxes(faces);
                }
            }
        })
        .catch(error => {
            console.error('检测失败:', error);
            alert(`检测失败: ${error.message}`);
            imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            if (uploadedImage.complete && uploadedImage.naturalWidth > 0) {
                imageCtx.drawImage(uploadedImage, 0, 0, imageCanvas.width, imageCanvas.height);
            }
        })
        .finally(() => {
            loaderElement.style.display = 'none';
            textElement.textContent = defaultText;
            fileSubmitBtn.disabled = false;
            captureAndDetectBtn.disabled = !stream;
        });
}

function setCanvasDimensions(naturalWidth, naturalHeight) {
    imageCanvas.width = naturalWidth;
    imageCanvas.height = naturalHeight;

    uploadedImage.style.width = naturalWidth + 'px';
    uploadedImage.style.height = naturalHeight + 'px';
    imageCanvas.style.width = naturalWidth + 'px';
    imageCanvas.style.height = naturalHeight + 'px';
}


function drawDetectionBoxes(faces) {
    imageCtx.strokeStyle = '#ff4757';
    imageCtx.lineWidth = 3;
    imageCtx.font = 'bold 16px Arial';
    imageCtx.fillStyle = '#ff4757';

    faces.forEach((face, index) => {
        imageCtx.beginPath();
        imageCtx.rect(face.x, face.y, face.width, face.height);
        imageCtx.stroke();
    });
}

imageContainer.style.display = 'none';
