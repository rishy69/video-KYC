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
  const [warningDescription, setWarning] = useState("")
  const [processingImg, setProcessingImg] = useState(null)
  const [processingImgId, setProcessingId] = useState()
  const [showPurgeButton, setShowPurgeButton] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFaceMatched, setIsFaceMatched] = useState(null);
  const [reloadState, setReload]= useState(false)
  const videoRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
  
    socketRef.current.on('face_detection_alert', (data) => {
      setAlertMessage(data.message);
      // if (data.message == "Hold on we are processing the ID."){
      //   setIsProcessing(true)
      // }
  
      if (data.message === 'done') {
        setIsProcessingDone(true);
        setShowPurgeButton(false)
        setIsProcessing(false);
      }

      if (data.message == "FACE DOES NOT MATCH. PLEASE TRY AGAIN"){
        setWarning(null);
        setAlertMessage(data.message);
        setFace(data.face_id);
        setId(data.id_id);
        setProcessingImg(null);
        stopWebcam();
        setShowPurgeButton(true);
        setProcessingImg(null);
        setIsFaceMatched(false);
        setIsProcessing(false);
        setReload(false)
      }
  

    });

    socketRef.current.on('purge_complete', (data) => {
      console.log('Purge completed:', data.message);
      // You can handle the successful purge here if needed
    });
  
    socketRef.current.on('purge_error', (data) => {
      console.error('Purge error:', data.message);
      // Handle the error appropriately
    });
  
    socketRef.current.on('face_matched', (data) => {
      setWarning(null);
      setAlertMessage(data.message);
      setFace(data.face_id);
      setId(data.id_id);
      setProcessingImg(null);
      stopWebcam();
      setIsFaceMatched(true);
      setIsProcessing(false);
      setShowPurgeButton(false)
      setReload(true)
    });
  
    socketRef.current.on('processing', (data) => {
      if (data.message === "processing") {
        setAlertMessage("Hold on, we are processing...");
        // setProcessingImg(data.img);
        // setProcessingId(data.id);
        stopWebcam();
        setIsProcessing(true);
        setShowPurgeButton(false)
        setReload(false)
      }
    });

    socketRef.current.on('video_alert', (data) => {
        if (data.message === 'video_started') {
          setFace(null)
          setId(null)
          setWarning("Make sure no one else is seen in the frame. Make sure you are in a well-lit room.");
          setUploadedImage(null)
          setShowPurgeButton(false)
          setReload(false)
        } 
        else {
          setWarning("");
        }
      
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
  const handleRefresh = () => {
    window.location.reload(true); // Reload the entire page, ignoring cached content
  };
  const handlePurge = () => {
    socketRef.current.emit('purge', { purge: "purge" });
    
    // Wait for the server to respond before reloading
    socketRef.current.on('purge_complete', () => {
      window.location.reload(true);
    });
    
    socketRef.current.on('purge_error', (data) => {
      console.error('Purge error:', data.message);
      // Handle the error appropriately (e.g., show an error message to the user)
    });
  
    setShowPurgeButton(false);
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
    if (message.includes('One face succesfully detected') || 
        message.includes('Hold on, we are processing...') ||
        message.includes('Hold on we are processing the ID.') ||
        message.includes('FACE MATCHED')||
        message.includes('done')) {
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
      {alertMessage && (
        <div className={`alert ${getAlertClass(alertMessage)}`}>
          {alertMessage}
        </div>
      )}

      {isImageUploaded && uploadedImage && (
        <div className="uploaded-image-container">
          <h3>Uploaded Image:</h3>
          <img src={uploadedImage} alt="Uploaded" className="uploaded-image" />
        </div>
      )}
      {isImageUploaded && isProcessingDone && !isWebcamActive && !isProcessing && !isFaceMatched && (
        <div className="button-container">
          {showPurgeButton && (
             <button onClick={handlePurge} className='btn'>Restart</button>
          )}
          <button className="btn" onClick={startWebcam}>{isFaceMatched === false ? "Retry" : "Start Webcam"}</button>
        </div>
      )}

      {!isFaceMatched && faceId && idId && (
            <div className="instruction-container">
              <p>1. Click retry to check with the same ID uploaded</p>
              <p>2. Click restart to try from scratch</p>
            </div>
          )}

      {isProcessing && (
        <div className="loading-animation">
          <img src="skull_grey.gif" alt="Loading..." className="centered-gif-container"/>
          {/* Or use a spinner */}
          {/* <div className="spinner"></div> */}
        </div>
      )}
      {isWebcamActive && warningDescription && (
      <div className="warning">
        <ul>
          {warningDescription.split('. ').map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    )}
      <div className="video-container" style={{ display: isWebcamActive ? 'block' : 'none' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          className="video-mirrored"
        />
        <div class="face-outline" />
      </div>
      
      {reloadState&& (
        <div className="refresh-button-container">
        <button className="btn" onClick={handleRefresh}>Restart</button>
      </div>
      )}


        {processingImg && processingImgId&&(<div className='matched-images'>
        <img src={`data:image/jpeg;base64,${processingImg}`}alt="ID Image"className="matched-image"/>
        <img src={`data:image/jpeg;base64,${processingImgId}`}alt="Face Image"className="matched-image"/>
        
        </div>)}
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