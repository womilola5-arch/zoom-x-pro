// ===== Navigation Mobile Menu =====
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    }
}

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Navbar Scroll Effect =====
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.style.background = 'rgba(10, 14, 39, 0.95)';
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(10, 14, 39, 0.8)';
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards and sections
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.feature-card, .about-content, .pricing-card');
    elements.forEach(el => {
        observer.observe(el);
    });
});

// ===== Request Notification Permission =====
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
        Notification.requestPermission();
    }, 3000);
}

// ===== Utility Functions =====
function generateRandomRoomName() {
    const adjectives = ['swift', 'bright', 'cosmic', 'digital', 'quantum', 'stellar', 'neural', 'cyber'];
    const nouns = ['phoenix', 'nebula', 'matrix', 'vortex', 'nexus', 'horizon', 'pulse', 'spark'];
    const numbers = Math.floor(Math.random() * 1000);

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj}-${noun}-${numbers}`;
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '⚡',
            badge: '⚡'
        });
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showTemporaryMessage('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showTemporaryMessage('Copied to clipboard!');
    } catch (err) {
        console.error('Fallback: Failed to copy', err);
        showTemporaryMessage('Failed to copy');
    }

    document.body.removeChild(textArea);
}

function showTemporaryMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #FF6B35 0%, #F7B801 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 10px 40px rgba(255, 107, 53, 0.4);
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Meeting History Storage =====
function saveMeetingToHistory(meetingData) {
    let history = JSON.parse(localStorage.getItem('meetingHistory') || '[]');

    // Add timestamp
    meetingData.timestamp = new Date().toISOString();

    // Add to beginning of array
    history.unshift(meetingData);

    // Keep only last 20 meetings
    history = history.slice(0, 20);

    localStorage.setItem('meetingHistory', JSON.stringify(history));
}

function getMeetingHistory() {
    return JSON.parse(localStorage.getItem('meetingHistory') || '[]');
}

// ===== Password Storage =====
function saveRoomPassword(roomName, password) {
    if (!password) return;

    const passwords = JSON.parse(localStorage.getItem('roomPasswords') || '{}');
    passwords[roomName] = password;
    localStorage.setItem('roomPasswords', JSON.stringify(passwords));
}

function getRoomPassword(roomName) {
    const passwords = JSON.parse(localStorage.getItem('roomPasswords') || '{}');
    return passwords[roomName] || null;
}

function verifyRoomPassword(roomName, password) {
    const storedPassword = getRoomPassword(roomName);
    if (!storedPassword) return true; // No password set
    return storedPassword === password;
}
