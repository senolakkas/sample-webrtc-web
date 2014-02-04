/*
 * QuickBlox VideoChat WebRTC library
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

// STUN/TURN servers
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}, 
								{'url': 'turn:turnserver.quickblox.com:3478?transport=udp'},
								{'url': 'turn:turnserver.quickblox.com:3478?transport=tcp'}]};

// SDP constraints 
var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio':true,
	'OfferToReceiveVideo':true }
};

function QBVideoChat(localStreamElement, remoteStreamElement, constraints){

    // save local & remote <video> elements
    this.localStreamElement = localStreamElement;
    this.remoteStreamElement = remoteStreamElement;
    
    // Media constraints. Video & Audio always can be configured later
    this.constraints = constraints;
    
    // VideoChat session ID
    this.sessionID = new Date().getTime()/1000;
    traceVC("QBVideoChat INIT, sessionID: " + this.sessionID);
    
    
    // Logger
    function traceVC(text) {
 		console.log("[qb_videochat]: " + text);
	}
    
    // MediaStream getUserMedia 
	var getUserMedia = function () {
		traceVC("getUserMedia...");

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

		function successCallback(localMediaStream) {
			traceVC("getUserMedia successCallback");
	
			// save local stream
			this.localStream = localMediaStream;

			// play own stream
			this.localStreamElement.src = window.URL.createObjectURL(localMediaStream);
			this.localStreamElement.play();
		}

		function errorCallback(error){
		   traceVC("getUserMedia errorCallback: ", error);
		}

		// Get User media
		navigator.getUserMedia(this.constraints, successCallback, errorCallback);
	}
	
	// RTCPeerConnection creation
	var createRTCPeerConnection = function () {
		traceVC("createRTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(pc_config);
			this.pc.onicecandidate = onIceCandidateCallback;
			this.pc.onaddstream = onRemoteStreamAddedCallback;
			this.pc.onremovestream = onRemoteStreamRemovedCallback;
		
			this.pc.addStream(this.localStream);
   
			traceVC('Created RTCPeerConnnection');
		} catch (e) {
			traceVC('Failed to create RTCPeerConnection, exception: ' + e.message);
			alert('Cannot create RTCPeerConnection object.');
		}
	}
	
	
	// onIceCandidate callback
	function onIceCandidateCallback(event) {  
		var candidate = event.candidate;	
	
		traceVC('iceGatheringState: ' + event.target.iceGatheringState);
	
		if (candidate) {
			traceVC('onIceCandidateCallback, candidate: ' + candidate.candidate + 
				', sdpMLineIndex: ' + candidate.sdpMLineIndex + ', sdpMid: ' + candidate.sdpMid);
			
			//onIceCandidate(candidate);
		} else {
			traceVC('No candidates');
		}
	}

	// onRemoteStreamAdded callback
	function onRemoteStreamAddedCallback(event) {
 		traceVC('Remote stream added: ' + event);
 	
 	 	// save remote stream
  		this.remoteStream = event.stream;
  		
  		// play remote stream
 		this.remoteStreamElement.src = window.URL.createObjectURL(event.stream);
 		this.remoteStreamElement.play();
	}

	// onRemoteStreamRemoved callback
	function onRemoteStreamRemovedCallback(event) {
  		 traceVC('Remote stream removed: ' + event);
	}
	
	// set Remote description
	var setRemoteDescription = function (descriptionSDP, descriptionType){
		var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		traceVC('setRemoteDescription: ' + descriptionSDP + ', pc:' + pc);
	
		this.pc.setRemoteDescription(sessionDescription,
			function onSuccess(){
				//onAddedRemoteDescription(sessionDescription);
			},function onError(error){
				traceVC('setRemoteDescription error: ' + error);
			}
		);
	}
	
	function onGetSessionDescriptionSuccessCallback(sessionDescription) {
		traceVC('sessionDescriptionSuccessCallback: ' + sessionDescription);
	
		this.pc.setLocalDescription(sessionDescription, 
			function onSuccess(){
				
				// Send only string representation of sdp
				// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
				var sdpStringRepresentation = sessionDescription.sdp;

				if (sessionDescription.type === 'offer') {
					call(opponentID, sdpStringRepresentation, this.sessionID); // qb_videochat_signaling.js
				}else if (sessionDescription.type === 'answer') {
					accept(opponentID, sdpStringRepresentation, this.sessionID); // qb_videochat_signaling.js
				}
				
			},function onError(error){
				traceVC('setLocalDescription error: ' + error);
			}
		);
	}

	function onCreateOfferFailureCallback(event){
		traceVC('createOffer() error: ', event);
	}

	function onCreateAnswerFailureCallback(event){
		traceVC('createAnswer() error: ', event);
	}
	
	// Add ICE candidates 
	this.addCandidate = function (candidateRawData){
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: candidateRawData.sdpMLineIndex,
				candidate: candidateRawData.candidate,
				   sdpMid: candidateRawData.sdpMid
		});
		this.pc.addIceCandidate(candidate);
	}

	// Cleanup 
	this.hangup = function () {
  		traceVC("Closed RTC");
  		this.pc.close();
  		this.pc = null;
	}
	
	// Logger
	this.traceW = function (text) {
 	 	console.log("[qb_webrtc]: " + text);
	}
}
    
// Call to user  
QBVideoChat.prototype.call = function(userID) {
	traceVC("Call");
	
	traceVC('Creating offer to peer...');
  	this.pc.createOffer(onGetSessionDescriptionSuccessCallback, onCreateOfferFailureCallback);
}

// Accept call from user 
QBVideoChat.prototype.accept = function(userID) {
	traceVC("Accept");

  	traceVC('Creating answer to peer...');
  	this.pc.createAnswer(onGetSessionDescriptionSuccessCallback, onCreateAnswerFailureCallback, sdpConstraints);
}

// Reject call from user  
QBVideoChat.prototype.reject = function(userID) {

}

// Stap call with user
QBVideoChat.prototype.stop = function(userID) {

}