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
  Public methods:
  	- getUserMedia(localVideoElement)
  	- createPeerConnection()
  	- createOffer()
  	- createAnswer()
  	- addCandidate(candidateRawData)
  	- setRemoteDescription(descriptionSDP, descriptionType)

  Public callbacks:
	- onLocalSessionDescription(description)
	- onCandidate(candidate)
 */


/*
 * GetUserMedia 
 */
function getUserMedia(localVideoElement) {
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
  		onCandidate(event.candidate);
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

function setRemoteDescription(descriptionSDP, descriptionType){
	var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
	console.log('setRemoteDescription: ', sessionDescription);
	
   	pc.setRemoteDescription(sessionDescription);
}

/*
 * Offer/Answer 
 */ 
function createOffer() {
  	console.log('Creating offer to peer...');
  	pc.createOffer(sessionDescriptionSuccessCallback, createOfferFailureCallback);
}

function createAnswer() {
  	console.log('Creating answer to peer...');
  	pc.createAnswer(sessionDescriptionSuccessCallback, createAnswerFailureCallback, sdpConstraints);
}

function sessionDescriptionSuccessCallback(sessionDescription) {
  	// Set Opus as the preferred codec in SDP if Opus is present.
  	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  	
  	pc.setLocalDescription(sessionDescription);
 	
 	console.log('sessionDescriptionSuccessCallback: ' + sessionDescription);
  	
  	onLocalSessionDescription(sessionDescription);
}

function createOfferFailureCallback(event){
  	console.log('createOffer() error: ', event);
}

function createAnswerFailureCallback(event){
  	console.log('createAnswer() error: ', event);
}

/*
 * ICE 
 */ 
function addCandidate(candidateRawData){
	var candidate = new RTCIceCandidate({
     	sdpMLineIndex: candidateRawData.label,
      		candidate: candidateRawData.candidate
    });
    pc.addIceCandidate(candidate);
}

/*
 * Cleanup 
 */ 
function hangup() {
  	console.log("Closed RTC");
  	pc.close();
  	pc = null;
}


/*
 * Helpers 
 */ 
 
// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}
