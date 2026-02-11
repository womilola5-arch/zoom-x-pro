// ===== Meeting Variables =====
let jitsiApi = null;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let participantCount = 0;
let meetingStartTime = null;
let currentRoomName = null;

// ===== Generate Room Name =====
function generateRoomName() {
    const roomInput = document.getElementById('roomName');
    if (roomInput) {
        roomInput.value = generateRandomRoomName();
    }
}

// ===== Join Meeting =====
function joinMeeting() {
    const roomName = document.getElementById('roomName').value.trim();
    const displayName = document.getElementById('displayName').value.trim() || 'Guest';
    const password = document.getElementById('password').value.trim();
    const enableWaitingRoom = document.getElementById('enableWaitingRoom')?.checked || false;
    const muteOnEntry = document.getElementById('muteOnEntry')?.checked || false;
    const disableVideo = document.getElementById('disableVideo')?.checked || false;

    if (!roomName) {
        alert('Please enter a room name');
        return;
    }

    // Check password if room has one
    const storedPassword = getRoomPassword(roomName);
    if (storedPassword && storedPassword !== password) {
        alert('Incorrect password!');
        return;
    }

    // Save password if this is first time
    if (password && !storedPassword) {
        saveRoomPassword(roomName, password);
    }

    // Save to history
    saveMeetingToHistory({
        roomName: roomName,
        displayName: displayName,
        hasPassword: !!password
    });

    // Initialize meeting
    currentRoomName = roomName;
    startJitsiMeeting(roomName, displayName, {
        enableWaitingRoom,
        muteOnEntry,
        disableVideo
    });
}

// ===== Start Jitsi Meeting =====
function startJitsiMeeting(roomName, displayName, options = {}) {
    const domain = 'meet.jit.si';

    const jitsiOptions = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('#meet'),
        userInfo: {
            displayName: displayName
        },
        configOverwrite: {
            startWithAudioMuted: options.muteOnEntry || false,
            startWithVideoMuted: options.disableVideo || false,
            enableWelcomePage: false,
            prejoinPageEnabled: options.enableWaitingRoom || false,
            enableNoisyMicDetection: true,
            enableLobbyChat: true,
            disableDeepLinking: true,
            enableClosePage: false,
            toolbarButtons: [
                'microphone',
                'camera',
                'closedcaptions',
                'desktop',
                'fullscreen',
                'fodeviceselection',
                'hangup',
                'profile',
                'chat',
                'recording',
                'livestreaming',
                'etherpad',
                'sharedvideo',
                'shareaudio',
                'settings',
                'raisehand',
                'videoquality',
                'filmstrip',
                'invite',
                'feedback',
                'stats',
                'shortcuts',
                'tileview',
                'select-background',
                'help',
                'mute-everyone',
                'security'
            ],
            remoteVideoMenu: {
                disableKick: false,
                disableGrantModerator: false
            }
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DISABLE_VIDEO_BACKGROUND: false,
            DEFAULT_BACKGROUND: '#0A0E27',
            TOOLBAR_ALWAYS_VISIBLE: false,
            MOBILE_APP_PROMO: false
        }
    };

    jitsiApi = new JitsiMeetExternalAPI(domain, jitsiOptions);

    // Hide setup, show meeting room
    document.getElementById('meetingSetup').style.display = 'none';
    document.getElementById('meetingRoom').style.display = 'block';

    // Track meeting start
    meetingStartTime = Date.now();

    // Event Listeners
    setupJitsiEventListeners();
}

// ===== Setup Event Listeners =====
function setupJitsiEventListeners() {
    if (!jitsiApi) return;

    // Meeting joined
    jitsiApi.addEventListener('videoConferenceJoined', (event) => {
        console.log('Meeting joined:', event);
        participantCount = 1;

        // Show notification
        showNotification('Meeting Started', `You've joined ${currentRoomName}`);

        // Track analytics
        trackEvent('meeting_joined', {
            room: currentRoomName,
            timestamp: new Date().toISOString()
        });
    });

    // Meeting left
    jitsiApi.addEventListener('videoConferenceLeft', (event) => {
        console.log('Meeting left:', event);

        const duration = Math.floor((Date.now() - meetingStartTime) / 1000);

        // Track analytics
        trackEvent('meeting_ended', {
            room: currentRoomName,
            duration: duration
        });

        // Clean up
        leaveMeeting();
    });

    // Participant joined
    jitsiApi.addEventListener('participantJoined', (event) => {
        participantCount++;
        console.log('Participant joined:', event);
        showTemporaryMessage(`${event.displayName || 'Someone'} joined the meeting`);
    });

    // Participant left
    jitsiApi.addEventListener('participantLeft', (event) => {
        participantCount--;
        console.log('Participant left:', event);
        showTemporaryMessage(`${event.displayName || 'Someone'} left the meeting`);
    });

    // Ready to close
    jitsiApi.addEventListener('readyToClose', () => {
        leaveMeeting();
    });

    // Chat messages
    jitsiApi.addEventListener('incomingMessage', (event) => {
        // Save chat to local storage
        saveChatMessage(currentRoomName, {
            from: event.from,
            message: event.message,
            timestamp: new Date().toISOString()
        });
    });

    // Recording status
    jitsiApi.addEventListener('recordingStatusChanged', (event) => {
        console.log('Recording status:', event);
        if (event.on) {
            isRecording = true;
            updateRecordButton(true);
        } else {
            isRecording = false;
            updateRecordButton(false);
        }
    });
}

// ===== Recording Functions =====
function toggleRecording() {
    if (!isRecording) {
        startLocalRecording();
    } else {
        stopLocalRecording();
    }
}

function startLocalRecording() {
    // Request screen capture
    navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
    }).then(stream => {
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `meeting-${currentRoomName}-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            showTemporaryMessage('Recording saved!');
            recordedChunks = [];
        };

        mediaRecorder.start();
        isRecording = true;
        updateRecordButton(true);
        showTemporaryMessage('Recording started');

        // Stop recording when stream ends
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            stopLocalRecording();
        });

    }).catch(error => {
        console.error('Error starting recording:', error);
        alert('Could not start recording. Please allow screen sharing.');
    });
}

function stopLocalRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        updateRecordButton(false);
        showTemporaryMessage('Recording stopped');
    }
}

function updateRecordButton(recording) {
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        if (recording) {
            recordBtn.classList.add('recording');
            recordBtn.querySelector('span').textContent = 'Stop Recording';
        } else {
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('span').textContent = 'Record';
        }
    }
}

// ===== Copy Invite Link =====
function copyInviteLink() {
    const meetingUrl = `${window.location.origin}/meeting.html?room=${currentRoomName}`;
    const password = getRoomPassword(currentRoomName);

    let inviteText = `Join my ZoomX Pro meeting!\n\nMeeting Link: ${meetingUrl}\nRoom Name: ${currentRoomName}`;

    if (password) {
        inviteText += `\nPassword: ${password}`;
    }

    copyToClipboard(inviteText);
}

// ===== Leave Meeting =====
function leaveMeeting() {
    // Stop recording if active
    if (isRecording) {
        stopLocalRecording();
    }

    // Dispose Jitsi
    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }

    // Reset UI
    document.getElementById('meetingSetup').style.display = 'block';
    document.getElementById('meetingRoom').style.display = 'none';

    // Clear form
    document.getElementById('roomName').value = '';
    document.getElementById('displayName').value = '';
    document.getElementById('password').value = '';

    // Reset counters
    participantCount = 0;
    meetingStartTime = null;
    currentRoomName = null;
}

// ===== Chat Storage =====
function saveChatMessage(roomName, message) {
    let chats = JSON.parse(localStorage.getItem(`chat-${roomName}`) || '[]');
    chats.push(message);

    // Keep only last 100 messages
    if (chats.length > 100) {
        chats = chats.slice(-100);
    }

    localStorage.setItem(`chat-${roomName}`, JSON.stringify(chats));
}

// ===== Meeting History Modal =====
function showMeetingHistory() {
    const history = getMeetingHistory();
    const modal = document.getElementById('historyModal');
    const listContainer = document.getElementById('historyList');

    if (history.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>No meeting history</p>
                <small>Your recent meetings will appear here</small>
            </div>
        `;
    } else {
        listContainer.innerHTML = history.map(meeting => `
            <div class="meeting-item">
                <div class="meeting-header">
                    <div>
                        <div class="meeting-title">${meeting.roomName}</div>
                        <div class="meeting-time">
                            ${new Date(meeting.timestamp).toLocaleString()}
                            ${meeting.hasPassword ? '🔒' : ''}
                        </div>
                    </div>
                    <div class="meeting-actions">
                        <button onclick="rejoinMeeting('${meeting.roomName}')">Rejoin</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    modal.classList.add('show');
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.remove('show');
}

function rejoinMeeting(roomName) {
    document.getElementById('roomName').value = roomName;
    closeHistoryModal();

    // Scroll to form
    document.getElementById('roomName').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('roomName').focus();
}

// ===== Analytics Tracking =====
function trackEvent(eventName, data) {
    console.log('Event tracked:', eventName, data);

    // Store events locally
    let events = JSON.parse(localStorage.getItem('analytics') || '[]');
    events.push({
        event: eventName,
        data: data,
        timestamp: new Date().toISOString()
    });

    // Keep only last 100 events
    if (events.length > 100) {
        events = events.slice(-100);
    }

    localStorage.setItem('analytics', JSON.stringify(events));
}

// ===== Auto-join from URL =====
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    const nameFromUrl = urlParams.get('name');

    if (roomFromUrl) {
        document.getElementById('roomName').value = roomFromUrl;
        if (nameFromUrl) {
            document.getElementById('displayName').value = decodeURIComponent(nameFromUrl);
        }

        // Auto-focus on password or join button
        const passwordInput = document.getElementById('password');
        if (getRoomPassword(roomFromUrl)) {
            passwordInput.focus();
        }
    }
});

// ===== Close modal when clicking outside =====
window.addEventListener('click', (event) => {
    const modal = document.getElementById('historyModal');
    if (event.target === modal) {
        closeHistoryModal();
    }
});
