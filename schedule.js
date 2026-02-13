// ===== Generate Random Room Name Utility =====
function generateRandomRoomName() {
    const adjectives = ['swift', 'bright', 'cosmic', 'digital', 'quantum', 'stellar', 'neural', 'cyber', 'prime', 'ultra', 'mega', 'super'];
    const nouns = ['phoenix', 'nebula', 'matrix', 'vortex', 'nexus', 'horizon', 'pulse', 'spark', 'nova', 'fusion', 'titan', 'omega'];
    const numbers = Math.floor(Math.random() * 1000);
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}-${noun}-${numbers}`;
}

// ===== Generate Room Name for Schedule =====
function generateScheduleRoomName() {
    const roomInput = document.getElementById('scheduledRoomName');
    if (roomInput) {
        roomInput.value = generateRandomRoomName();
    }
}

// ===== Schedule Meeting Form =====
document.getElementById('scheduleForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const title = document.getElementById('meetingTitle').value.trim();
    const roomName = document.getElementById('scheduledRoomName').value.trim();
    const date = document.getElementById('meetingDate').value;
    const time = document.getElementById('meetingTime').value;
    const duration = document.getElementById('meetingDuration').value;
    const description = document.getElementById('meetingDescription').value.trim();
    const password = document.getElementById('schedulePassword').value.trim();
    
    const remind15 = document.getElementById('remind15').checked;
    const remind1hour = document.getElementById('remind1hour').checked;
    const remind1day = document.getElementById('remind1day').checked;
    
    if (!title || !roomName || !date || !time) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Combine date and time
    const meetingDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (meetingDateTime <= now) {
        alert('Please select a future date and time');
        return;
    }
    
    // Create meeting object
    const meeting = {
        id: Date.now().toString(),
        title: title,
        roomName: roomName,
        dateTime: meetingDateTime.toISOString(),
        duration: parseInt(duration),
        description: description,
        password: password,
        reminders: {
            remind15: remind15,
            remind1hour: remind1hour,
            remind1day: remind1day
        },
        link: `${window.location.origin}/meeting.html?room=${roomName}`,
        created: new Date().toISOString()
    };
    
    // Save password if provided
    if (password) {
        saveRoomPassword(roomName, password);
    }
    
    // Save meeting
    saveScheduledMeeting(meeting);
    
    // Set up reminders
    setupReminders(meeting);
    
    // Show success modal
    showSuccessModal(meeting);
    
    // Reset form
    e.target.reset();
    
    // Reload upcoming meetings
    loadUpcomingMeetings();
});

// ===== Save Scheduled Meeting =====
function saveScheduledMeeting(meeting) {
    let meetings = JSON.parse(localStorage.getItem('scheduledMeetings') || '[]');
    meetings.push(meeting);
    
    // Sort by date
    meetings.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    localStorage.setItem('scheduledMeetings', JSON.stringify(meetings));
}

// ===== Load Upcoming Meetings =====
function loadUpcomingMeetings() {
    const meetings = JSON.parse(localStorage.getItem('scheduledMeetings') || '[]');
    const now = new Date();
    
    // Filter out past meetings
    const upcomingMeetings = meetings.filter(meeting => {
        return new Date(meeting.dateTime) > now;
    });
    
    // Update storage with only upcoming meetings
    localStorage.setItem('scheduledMeetings', JSON.stringify(upcomingMeetings));
    
    const container = document.getElementById('upcomingMeetings');
    
    if (upcomingMeetings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>No upcoming meetings</p>
                <small>Schedule your first meeting to get started</small>
            </div>
        `;
    } else {
        container.innerHTML = upcomingMeetings.map(meeting => createMeetingCard(meeting)).join('');
    }
}

// ===== Create Meeting Card =====
function createMeetingCard(meeting) {
    const meetingDate = new Date(meeting.dateTime);
    const timeUntil = getTimeUntil(meetingDate);
    
    return `
        <div class="meeting-item" data-meeting-id="${meeting.id}">
            <div class="meeting-header">
                <div>
                    <div class="meeting-title">
                        ${meeting.title}
                        ${meeting.password ? '🔒' : ''}
                    </div>
                    <div class="meeting-time">
                        ${meetingDate.toLocaleDateString()} at ${meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <br>
                        <small>${timeUntil}</small>
                    </div>
                </div>
                <div class="meeting-actions">
                    <button onclick="joinScheduledMeeting('${meeting.id}')">Join</button>
                    <button onclick="copyMeetingInvite('${meeting.id}')">Copy</button>
                    <button onclick="deleteMeeting('${meeting.id}')">Delete</button>
                </div>
            </div>
            ${meeting.description ? `<p style="color: var(--text-secondary); margin-top: 8px; font-size: 14px;">${meeting.description}</p>` : ''}
        </div>
    `;
}

// ===== Get Time Until Meeting =====
function getTimeUntil(meetingDate) {
    const now = new Date();
    const diff = meetingDate - now;
    
    if (diff < 0) return 'Past';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'Starting soon';
}

// ===== Setup Reminders =====
function setupReminders(meeting) {
    const meetingDate = new Date(meeting.dateTime);
    const now = new Date();
    
    // 15 minutes reminder
    if (meeting.reminders.remind15) {
        const reminderTime = new Date(meetingDate.getTime() - 15 * 60000);
        const timeUntil = reminderTime - now;
        
        if (timeUntil > 0) {
            setTimeout(() => {
                showNotification(
                    'Meeting Reminder',
                    `"${meeting.title}" starts in 15 minutes!`
                );
            }, timeUntil);
        }
    }
    
    // 1 hour reminder
    if (meeting.reminders.remind1hour) {
        const reminderTime = new Date(meetingDate.getTime() - 60 * 60000);
        const timeUntil = reminderTime - now;
        
        if (timeUntil > 0) {
            setTimeout(() => {
                showNotification(
                    'Meeting Reminder',
                    `"${meeting.title}" starts in 1 hour!`
                );
            }, timeUntil);
        }
    }
    
    // 1 day reminder
    if (meeting.reminders.remind1day) {
        const reminderTime = new Date(meetingDate.getTime() - 24 * 60 * 60000);
        const timeUntil = reminderTime - now;
        
        if (timeUntil > 0) {
            setTimeout(() => {
                showNotification(
                    'Meeting Reminder',
                    `"${meeting.title}" is tomorrow!`
                );
            }, timeUntil);
        }
    }
}

// ===== Join Scheduled Meeting =====
function joinScheduledMeeting(meetingId) {
    const meetings = JSON.parse(localStorage.getItem('scheduledMeetings') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);
    
    if (meeting) {
        window.location.href = meeting.link;
    }
}

// ===== Copy Meeting Invite =====
function copyMeetingInvite(meetingId) {
    const meetings = JSON.parse(localStorage.getItem('scheduledMeetings') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);
    
    if (meeting) {
        const meetingDate = new Date(meeting.dateTime);
        let inviteText = `You're invited to: ${meeting.title}\n\n`;
        inviteText += `📅 Date: ${meetingDate.toLocaleDateString()}\n`;
        inviteText += `⏰ Time: ${meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
        inviteText += `⏱️ Duration: ${meeting.duration} minutes\n\n`;
        inviteText += `Join Link: ${meeting.link}\n`;
        inviteText += `Room Name: ${meeting.roomName}\n`;
        
        if (meeting.password) {
            inviteText += `Password: ${meeting.password}\n`;
        }
        
        if (meeting.description) {
            inviteText += `\nDescription: ${meeting.description}\n`;
        }
        
        inviteText += `\n---\nPowered by ZoomX Pro - Free Video Conferencing`;
        
        copyToClipboard(inviteText);
    }
}

// ===== Delete Meeting =====
function deleteMeeting(meetingId) {
    if (confirm('Are you sure you want to delete this meeting?')) {
        let meetings = JSON.parse(localStorage.getItem('scheduledMeetings') || '[]');
        meetings = meetings.filter(m => m.id !== meetingId);
        localStorage.setItem('scheduledMeetings', JSON.stringify(meetings));
        
        loadUpcomingMeetings();
        showTemporaryMessage('Meeting deleted');
    }
}

// ===== Show Success Modal =====
function showSuccessModal(meeting) {
    const modal = document.getElementById('successModal');
    const messageEl = document.getElementById('successMessage');
    const detailsEl = document.getElementById('successDetails');
    
    const meetingDate = new Date(meeting.dateTime);
    
    messageEl.textContent = `Your meeting "${meeting.title}" has been scheduled!`;
    
    detailsEl.innerHTML = `
        <div style="margin-bottom: 12px;">
            <strong>Date:</strong> ${meetingDate.toLocaleDateString()}
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Time:</strong> ${meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Room:</strong> ${meeting.roomName}
        </div>
        ${meeting.password ? `<div style="margin-bottom: 12px;"><strong>Password:</strong> ${meeting.password}</div>` : ''}
        <div>
            <strong>Link:</strong><br>
            <code style="word-break: break-all; font-size: 12px;">${meeting.link}</code>
        </div>
    `;
    
    // Store current meeting for copy function
    window.currentScheduledMeeting = meeting;
    
    modal.classList.add('show');
}

// ===== Close Success Modal =====
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('show');
    window.currentScheduledMeeting = null;
}

// ===== Copy Meeting Link from Success Modal =====
function copyMeetingLink() {
    if (window.currentScheduledMeeting) {
        const meeting = window.currentScheduledMeeting;
        const meetingDate = new Date(meeting.dateTime);
        
        let inviteText = `You're invited to: ${meeting.title}\n\n`;
        inviteText += `📅 Date: ${meetingDate.toLocaleDateString()}\n`;
        inviteText += `⏰ Time: ${meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n`;
        inviteText += `Join Link: ${meeting.link}\n`;
        inviteText += `Room Name: ${meeting.roomName}\n`;
        
        if (meeting.password) {
            inviteText += `Password: ${meeting.password}\n`;
        }
        
        copyToClipboard(inviteText);
    }
}

// ===== Close modal when clicking outside =====
window.addEventListener('click', (event) => {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        closeSuccessModal();
    }
});

// ===== Set minimum date to today =====
window.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('meetingDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Load upcoming meetings
    loadUpcomingMeetings();
    
    // Refresh every minute to update "time until" displays
    setInterval(() => {
        loadUpcomingMeetings();
    }, 60000);
});
