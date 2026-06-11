// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return; // Skip dead links
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// FAQ Accordion
document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
        const answer = item.querySelector('.faq-answer');
        if (!answer) return;
        const isVisible = answer.style.display === 'block';

        // Close all open answers first
        document.querySelectorAll('.faq-answer').forEach(ans => {
            ans.style.display = 'none';
        });
        document.querySelectorAll('.faq-item').forEach(i => {
            i.classList.remove('faq-open');
        });

        // Toggle the clicked one
        if (!isVisible) {
            answer.style.display = 'block';
            item.classList.add('faq-open');
        }
    });
});

// ============================================================
// Chat Widget — WebSocket with smart auto-reconnect
// ============================================================
const chatToggle = document.getElementById('chat-toggle');
const chatWidget = document.getElementById('chat-widget');
const closeChat = document.querySelector('.close-chat');
const sendChatBtn = document.getElementById('send-chat');
const chatInput = document.getElementById('chat-input');
const chatBody = document.getElementById('chat-body');

// Only initialise chat logic if the chat widget exists on this page
if (chatToggle && chatWidget && closeChat && sendChatBtn && chatInput && chatBody) {

    let ws = null;
    let sessionId = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let shouldReconnect = true; // Set to false when user deliberately closes chat

    function initWebSocket() {
        if (!shouldReconnect || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                appendBotMessage("⚠️ Could not connect to our live chat. Please email us at hello@zoydesigns.com.");
            }
            return;
        }

        if (!sessionId) {
            sessionId = 'client-' + Math.random().toString(36).substring(2, 9);
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/${sessionId}`);

        ws.onopen = () => {
            reconnectAttempts = 0; // Reset on successful connection
        };

        ws.onmessage = (event) => {
            appendBotMessage(event.data.replace(/\n/g, '<br>'));
        };

        ws.onerror = () => {
            // onclose will fire after onerror, so handle reconnect there
        };

        ws.onclose = () => {
            if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = Math.min(3000 * reconnectAttempts, 15000);
                console.log(`WebSocket disconnected. Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
                setTimeout(initWebSocket, delay);
            }
        };
    }

    function appendBotMessage(html) {
        const botMsg = document.createElement('div');
        botMsg.className = 'message bot';
        botMsg.innerHTML = html;
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    chatToggle.addEventListener('click', () => {
        const isOpen = chatWidget.style.display === 'flex';
        if (isOpen) {
            chatWidget.style.display = 'none';
        } else {
            shouldReconnect = true;
            chatWidget.style.display = 'flex';
            // Only connect if not already open/connecting
            if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                reconnectAttempts = 0;
                initWebSocket();
            }
        }
    });

    closeChat.addEventListener('click', () => {
        shouldReconnect = false; // Don't reconnect when user deliberately closes
        chatWidget.style.display = 'none';
    });

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Show user's message
        const userMsg = document.createElement('div');
        userMsg.className = 'message user';
        userMsg.textContent = text;
        chatBody.appendChild(userMsg);
        chatInput.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

        // Send to backend via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(text);
        } else {
            const errMsg = document.createElement('div');
            errMsg.className = 'message bot';
            errMsg.style.color = '#c0392b';
            errMsg.textContent = "Not connected. Please try again in a moment.";
            chatBody.appendChild(errMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}
