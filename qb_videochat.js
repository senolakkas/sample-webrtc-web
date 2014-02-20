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

// Video chat state
var VIDEOCHAT_STATE = {
                        INACTIVE      : 'INACTIVE',
                        ESTABLISHING  : 'ESTABLISHING',
                        ACTIVE        : 'ACTIVE'
};

/*
  Public methods:
  	- call(userID)
  	- accept(userID)
  	- reject(userID)
    - stop(userID)

  Public callbacks:
   	- onConnectionSuccess(user_id)
	- onConnectionFailed(error)
	- onConnectionDisconnected()
	- onCall(fromUserID, sessionDescription)
	- onAccept(fromUserID, sessionDescription)
	- onReject(fromUserID)
	- onCandidate(fromUserID, candidate)
	- onStop(fromUserID, reason)
 */

function QBVideoChat(localStreamElement, remoteStreamElement, constraints, signalingService){
 	traceVC("QBVideoChat INIT");
 	
 	this.state = VIDEOCHAT_STATE.INACTIVE;
 	
    // save local & remote <video> elements
    this.localStreamElement = localStreamElement;
    this.remoteStreamElement = remoteStreamElement;
    this.remoteStreamElement.loadedmetadata = function(e) {
  		traceVC("VideoChat loadedmetadata");
	};
	this.remoteStreamElement.oncanplay = function(e) {
  		traceVC("VideoChat oncanplay");
	};
	this.remoteStreamElement.onplaying = function(e) {
  		traceVC("VideoChat onplaying");
	};
	
	// candidates queue
	this.candidatesQueue = new Array();
	
    // Media constraints. Video & Audio always can be configured later
    this.constraints = constraints;
    
    // VideoChat session ID
    this.sessionID = new Date().getTime()/1000;
    traceVC("sessionID: " + this.sessionID);
        
    var self = this;
    
    traceVC("1");
    
    // Signalling callbacks
	this.onCall = function (fromUserID, sessionDescription, sessionID){
		traceVC("onCall");
	};
	traceVC("2");
	this.onAccept = function (fromUserID, sessionDescription, sessionID){
		traceVC("onAccept");
	};
	this.onCandidate = function (fromUserID, candidate){
		traceVC("onCandidate");
	};
	
	traceVC("3");
    
    // Set signaling service
    this.signalingService = signalingService;
    this.signalingService.addOnCallCallback(this.onCall);
	this.signalingService.addOnAcceptCallback(this.onAccept);
	this.signalingService.addOnCandidateCallback(this.onCandidate);
	
	traceVC("4");
    
    
    // MediaStream getUserMedia 
	this.getUserMedia = function () {
		traceVC("getUserMedia...");

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

		function successCallback(localMediaStream) {
			traceVC("getUserMedia successCallback");
	
			// save local stream
			self.localStream = localMediaStream;

			// play own stream
			self.localStreamElement.src = window.URL.createObjectURL(localMediaStream);
			self.localStreamElement.play();
			
			//
			// Create RTC peer connection
			self.createRTCPeerConnection();
		}

		function errorCallback(error){
		   traceVC("getUserMedia errorCallback: ", error);
		}

		// Get User media
		navigator.getUserMedia(this.constraints, successCallback, errorCallback);
	}
	//
	// Call getUserMedia
	this.getUserMedia();
	
	// RTCPeerConnection creation
	this.createRTCPeerConnection = function () {
		traceVC("createRTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(pc_config);
			this.pc.onicecandidate = this.onIceCandidateCallback;
			this.pc.onaddstream = this.onRemoteStreamAddedCallback;
			this.pc.onremovestream = this.onRemoteStreamRemovedCallback;
		
			this.pc.addStream(this.localStream);
   
			traceVC('Created RTCPeerConnnection');
		} catch (e) {
			traceVC('Failed to create RTCPeerConnection, exception: ' + e.message);
			alert('Cannot create RTCPeerConnection object.');
		}
	}
	
	// onIceCandidate callback
	this.onIceCandidateCallback = function(event) {  
		var candidate = event.candidate;	
	
		traceVC('iceGatheringState: ' + event.target.iceGatheringState);
	
		if (candidate) {
			var iceData = {sdpMLineIndex: candidate.sdpMLineIndex,
      					  		  sdpMid: candidate.sdpMid,
      				   		   candidate: candidate.candidate}
      				   		   
      		traceVC('onIceCandidateCallback: ' + JSON.stringify(iceData));
			
    		var iceDataAsmessage = self.signalingService.xmppDictionaryToText(iceData);
  	
  			if(self.state == VIDEOCHAT_STATE.INACTIVE){
  			    // save to queue
  			    traceVC('candidate queued');
  			    self.candidatesQueue.push(iceDataAsmessage);
  			}else{
  			    // Send ICE candidate to opponent
				self.signalingService.sendCandidate(self.opponentID, iceDataAsmessage, self.sessionID);
			}

		} else {
			traceVC('No candidates');
		}
	}

	// onRemoteStreamAdded callback
	this.onRemoteStreamAddedCallback = function(event) {
 		traceVC('Remote stream added: ' + event);
 	
 	 	// save remote stream
  		self.remoteStream = event.stream;
  		
  		// play remote stream
 		self.remoteStreamElement.src = window.URL.createObjectURL(event.stream);
 		self.remoteStreamElement.play();
	}

	// onRemoteStreamRemoved callback
	this.onRemoteStreamRemovedCallback = function(event) {
  		 traceVC('Remote stream removed: ' + event);
	}
	
	// set Remote description
	this.setRemoteDescription = function (descriptionSDP, descriptionType){
	  	this.state = VIDEOCHAT_STATE.ESTABLISHING;
	  	
		var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		traceVC('setRemoteDescription: ' + descriptionSDP + ', pc:' + this.pc);
	
		this.pc.setRemoteDescription(sessionDescription,
			function onSuccess(){
				if(sessionDescription.type === 'offer'){
  					traceVC('Creating answer to peer...');
  					self.pc.createAnswer(self.onGetSessionDescriptionSuccessCallback, self.onCreateAnswerFailureCallback, sdpConstraints);
  				}
			},function onError(error){
				traceVC('setRemoteDescription error: ' + error);
			}
		);
		
		// send candidates
		for (var i=0; i<this.candidatesQueue.length; i++) {
			var candidate = this.candidatesQueue.pop();
			self.signalingService.sendCandidate(self.opponentID, candidate, self.sessionID);
		}
	}
	
	this.onGetSessionDescriptionSuccessCallback = function(sessionDescription) {
		traceVC('sessionDescriptionSuccessCallback: ' + sessionDescription);
	    
		self.pc.setLocalDescription(sessionDescription, 
			function onSuccess(){
				traceVC('setLocalDescription onSuccess');
				
				// ICE gathering starts work here
				//
				
				// Send only string representation of sdp
				// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
				var sdpStringRepresentation = sessionDescription.sdp;

				if (sessionDescription.type === 'offer') {
					self.signalingService.call(self.opponentID, sdpStringRepresentation, self.sessionID);
				}else if (sessionDescription.type === 'answer') {
					self.signalingService.accept(self.opponentID, sdpStringRepresentation, self.sessionID);
				}
				
			},function onError(error){
				traceVC('setLocalDescription error: ' + error);
			}
		);
	}

	this.onCreateOfferFailureCallback = function(event){
		traceVC('createOffer() error: ', event);
	}

	this.onCreateAnswerFailureCallback = function(event){
		traceVC('createAnswer() error: ', event);
	}
	
	// Add ICE candidates 
	this.addCandidate = function (candidate){
		traceVC('addCandidate');
		self.pc.addIceCandidate(candidate);
	}

	// Cleanup 
	this.hangup = function () {
  		traceVC("Closed RTC");
  		self.pc.close();
  		self.pc = null;
	}
}
    
// Call to user  
QBVideoChat.prototype.call = function(userID) {
	traceVC("Call");
	
	this.opponentID = userID;
	
	traceVC('Creating offer to peer...' + this.pc);
  	this.pc.createOffer(this.onGetSessionDescriptionSuccessCallback, this.onCreateOfferFailureCallback);
}

// Accept call from user 
QBVideoChat.prototype.accept = function(userID) {
	traceVC("Accept");
	
	this.opponentID = userID;
	
	// set remote description here
	this.setRemoteDescription(this.potentialRemoteSessionDescription, "offer");
	
	this.state = VIDEOCHAT_STATE.ESTABLISHING;
}

// Reject call from user  
QBVideoChat.prototype.reject = function(userID) {
	this.signalingService.reject(userID, this.sessionID);
	
	this.state = VIDEOCHAT_STATE.INACTIVE;
}

// Stap call with user
QBVideoChat.prototype.stop = function(userID) {
	this.signalingService.stops(userID, "manual", this.sessionID);
	
	this.state = VIDEOCHAT_STATE.INACTIVE;
}

// Logger
function traceVC(text) {
	console.log("[qb_videochat]: " + text);
}