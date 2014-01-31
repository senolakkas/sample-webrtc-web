/*
 * QuickBlox WebRTC Sample
 * version 0.1
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};
 
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }
};
 
var localStream;
var pc;


/*
 * GetUserMedia 
 */
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
	    
	    // test
	    //var remoteVideoElement = document.getElementById("remoteVideo");
	    //remoteVideoElement.src = window.URL.createObjectURL(localMediaStream);
	    //remoteVideoElement.play();
	}

	function errorCallback(error){
	   console.log("navigator.getUserMedia error: ", error);
	}

    // Get User media
	navigator.getUserMedia(constraints, successCallback, errorCallback);
}

/*
 * RTCPeerConnection creation
 */
function createPeerConnection() {
  	try {
   		pc = new RTCPeerConnection(null);
   		pc.onicecandidate = handleIceCandidate;
   	 	pc.onaddstream = handleRemoteStreamAdded;
   	 	pc.onremovestream = handleRemoteStreamRemoved;
   	 	
   	 	pc.addStream(localStream);
   
   	 	console.log('Created RTCPeerConnnection');
  	} catch (e) {
   	 	console.log('Failed to create PeerConnection, exception: ' + e.message);
   	 	alert('Cannot create RTCPeerConnection object.');
      	return;
	}
}

function handleIceCandidate(event) {
  	console.log('handleIceCandidate event: ', event);
  	if (event.candidate) {
  	    // Send ICE candidates to opponent
   	 	sendMessage({
     		 type: 'candidate',
      		label: event.candidate.sdpMLineIndex,
      		id: event.candidate.sdpMid,
      		candidate: event.candidate.candidate});
  	} else {
   	 	console.log('End of candidates.');
  	}
}

function handleRemoteStreamAdded(event) {
 	 console.log('Remote stream added.');
 	 remoteVideo.src = window.URL.createObjectURL(event.stream);
  	 remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
  	console.log('Remote stream removed. Event: ', event);
}

/*
 * Offer/Answer 
 */ 
function doOffer() {
  	console.log('Sending offer to peer');
  	pc.createOffer(sessionDescriptionSuccessCallback, createOfferFailureCallback);
}

function doAnswer() {
  	console.log('Sending answer to peer.');
  	pc.createAnswer(sessionDescriptionSuccessCallback, createAnswerFailureCallback, sdpConstraints);
}

function sessionDescriptionSuccessCallback(sessionDescription) {
  	// Set Opus as the preferred codec in SDP if Opus is present.
  	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  	pc.setLocalDescription(sessionDescription);
 	
 	console.log('setLocalAndSendMessage sending message' , sessionDescription);
  	
  	sendMessage(sessionDescription);
}

function createOfferFailureCallback(event){
  	console.log('createOffer() error: ', event);
}

function createAnswerFailureCallback(event){
  	console.log('createAnswer() error: ', event);
}

function hangup() {
  	console.log("Ending call");
  	localPeerConnection.close();
  	remotePeerConnection.close();
}
