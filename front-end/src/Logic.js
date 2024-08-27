import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Logic.css';

const ImageUpload = () => {
  const socketRef = useRef(null);
  const [isImageUploaded, setIsImageUploaded] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [faceId, setFace] = useState(null);
  const [idId, setId] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessingDone, setIsProcessingDone] = useState(false); // New state for processing status

  const videoRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('face_detection_alert', (data) => {
      setAlertMessage(data.message);

      // Check for the 'done' message and update state
      if (data.message === 'done') {
        setIsProcessingDone(true);
      }
    });

    socketRef.current.on('face_matched', (data) => {
      setAlertMessage(data.message);
      setFace(data.face_id);
      setId(data.id_id);

      // Stop the webcam when a face match is found
      stopWebcam();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target.result;
        socketRef.current.emit('uploaded_image', imageDataUrl);
        setUploadedImage(imageDataUrl);
        setIsImageUploaded(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsWebcamActive(true);

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          const intervalId = setInterval(() => {
            if (videoRef.current) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const frame = canvas.toDataURL('image/jpeg');
              socketRef.current.emit('video_frame', frame);
            }
          }, 1000 / 30);

          videoRef.current.intervalId = intervalId;
        };
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setAlertMessage('Failed to access webcam. Please ensure you have given permission.');
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.intervalId) {
      clearInterval(videoRef.current.intervalId);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      stopWebcam(); // Ensure webcam stops when component unmounts
    };
  }, []);

  const getAlertClass = (message) => {
    if (message.includes('One face successfully detected') || 
        message.includes('Hold on We are processing') ||
        message.includes('FACE MATCHED')) {
      return 'alert-green';
    } else {
      return 'alert-red';
    }
  };

  return (
    <div className="container">
      <h1>Face Detection App</h1>
      {!isImageUploaded && (
        <div className="upload-btn-wrapper">
          <button className="btn">Upload an image</button>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>
      )}
      {isImageUploaded && uploadedImage && (
        <div className="uploaded-image-container">
          <h3>Uploaded Image:</h3>
          <img src={uploadedImage} alt="Uploaded" className="uploaded-image" />
        </div>
      )}
      {isImageUploaded && isProcessingDone && !isWebcamActive && (
        <button className="webcam-btn" onClick={startWebcam}>Start Webcam</button>
      )}
      <div className="video-container" style={{ display: isWebcamActive ? 'block' : 'none' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          className="video-mirrored"
        />
      </div>
      {alertMessage && (
        <div className={`alert ${getAlertClass(alertMessage)}`}>
          {alertMessage}
        </div>
      )}
      {idId && faceId && (
        <div className="matched-images">
        <img src={`data:image/jpeg;base64,${idId}`} alt="ID Image" className="matched-image" />
        <img src={`data:image/jpeg;base64,${faceId}`} alt="Face Image" className="matched-image" />
        </div>

      )}
    </div>
  );
};

export default ImageUpload;