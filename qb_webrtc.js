var localStream, localPeerConnection, remotePeerConnection;

var remoteVideo = document.getElementById("recipientVideo");

function webrtcGetUserMedia(localVideoElement) {
    console.log("webrtcGetUserMedia....");

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Video & Audio always
    // Can be configured later
	var constraints = {video: true, audio: true};

	function successCallback(localMediaStream) {
	    console.log("navigator.getUserMedia success");
	
	    // save local stream
	    localStream = localMediaStream;

        // play own stream
	    localVideoElement.src = window.URL.createObjectURL(localMediaStream);
	    localVideoElement.play();
	}

	function errorCallback(error){
	   console.log("navigator.getUserMedia error: ", error);
	}

    // Get User media
	navigator.getUserMedia(constraints, successCallback, errorCallback);
}

function webrtcSetupPeerConnection() {

  if (localStream.getVideoTracks().length > 0) {
    console.log('Using video device: ' + localStream.getVideoTracks()[0].label);
  }
  
  if (localStream.getAudioTracks().length > 0) {
    console.log('Using audio device: ' + localStream.getAudioTracks()[0].label);
  }
  
  var servers = null;

  localPeerConnection = new webkitRTCPeerConnection(servers);
  console.log("Created local peer connection object localPeerConnection");
  localPeerConnection.onicecandidate = gotLocalIceCandidate;

  remotePeerConnection = new webkitRTCPeerConnection(servers);
  console.log("Created remote peer connection object remotePeerConnection");
  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.onaddstream = gotRemoteStream;

  localPeerConnection.addStream(localStream);
  console.log("Added localStream to localPeerConnection");
  localPeerConnection.createOffer(gotLocalDescription);
}

function gotLocalDescription(description){
  localPeerConnection.setLocalDescription(description);
  console.log("Offer from localPeerConnection: \n" + description.sdp);
  remotePeerConnection.setRemoteDescription(description);
  remotePeerConnection.createAnswer(gotRemoteDescription);
}

function gotRemoteDescription(description){
  remotePeerConnection.setLocalDescription(description);
  console.log("Answer from remotePeerConnection: \n" + description.sdp);
  localPeerConnection.setRemoteDescription(description);
}

function gotRemoteStream(event){
  remoteVideo.src = URL.createObjectURL(event.stream);
  console.log("Received remote stream");
}

function gotLocalIceCandidate(event){
  if (event.candidate) {
    remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    console.log("Local ICE candidate: \n" + event.candidate.candidate);
  }
}

function gotRemoteIceCandidate(event){
  if (event.candidate) {
    localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    console.log("Remote ICE candidate: \n " + event.candidate.candidate);
  }
}

function hangup() {
  console.log("Ending call");
  localPeerConnection.close();
  remotePeerConnection.close();
}
