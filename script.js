// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// FAQ Accordion
document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
        const answer = item.querySelector('.faq-answer');
        const isVisible = answer.style.display === 'block';
        
        // Close all answers
        document.querySelectorAll('.faq-answer').forEach(ans => {
            ans.style.display = 'none';
        });

        // Toggle clicked
        if (!isVisible) {
            answer.style.display = 'block';
        }
    });
});

// Chat Widget WebSockets
const chatToggle = document.getElementById('chat-toggle');
const chatWidget = document.getElementById('chat-widget');
const closeChat = document.querySelector('.close-chat');
const sendChat = document.getElementById('send-chat');
const chatInput = document.getElementById('chat-input');
const chatBody = document.getElementById('chat-body');

let ws;
let sessionId;

function initWebSocket() {
    if (!sessionId) {
        sessionId = 'client-' + Math.floor(Math.random() * 10000);
    }
    // Connect to the local FastAPI WebSocket endpoint with session ID
    ws = new WebSocket(`ws://${window.location.host}/ws/${sessionId}`);
    
    ws.onmessage = function(event) {
        const botMsg = document.createElement('div');
        botMsg.className = 'message bot';
        botMsg.innerHTML = event.data.replace(/\n/g, '<br>');
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
    };
    
    ws.onclose = function() {
        console.log("WebSocket disconnected. Retrying...");
        setTimeout(initWebSocket, 3000);
    };
}

chatToggle.addEventListener('click', () => {
    chatWidget.style.display = chatWidget.style.display === 'flex' ? 'none' : 'flex';
    // Initialize WS when they open the chat
    if (chatWidget.style.display === 'flex' && (!ws || ws.readyState !== WebSocket.OPEN)) {
        initWebSocket();
    }
});

closeChat.addEventListener('click', () => {
    chatWidget.style.display = 'none';
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
        // Display user message locally
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
            const errorMsg = document.createElement('div');
            errorMsg.className = 'message bot';
            errorMsg.style.color = 'red';
            errorMsg.textContent = "Error: Not connected to the Live Server.";
            chatBody.appendChild(errorMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }
}

sendChat.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
