// ===== Form Validation & Submission =====

const submissionForm = document.querySelector('.submission-form');
const successMessage = document.getElementById('success-message');

// Validation rules
const validators = {
    contact_name: (value) => {
        if (!value.trim()) return 'Contactpersoon naam is verplicht';
        if (value.trim().length < 2) return 'Naam moet minstens 2 karakters lang zijn';
        return '';
    },
    email: (value) => {
        if (!value.trim()) return 'E-mailadres is verplicht';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Voer een geldig e-mailadres in';
        return '';
    },
    background: (value) => {
        if (!value.trim()) return 'Beschrijving is verplicht';
        if (value.trim().length < 10) return 'Beschrijving moet minstens 10 karakters lang zijn';
        return '';
    },
    problem: (value) => {
        if (!value.trim()) return 'Probleemdefinitie is verplicht';
        if (value.trim().length < 10) return 'Probleemdefinitie moet minstens 10 karakters lang zijn';
        return '';
    },
    goals: (value) => {
        if (!value.trim()) return 'Doelen / deliverables is verplicht';
        if (value.trim().length < 10) return 'Doelen / deliverables moet minstens 10 karakters lang zijn';
        return '';
    }
};



// Get all form fields
const formFields = {
    organization: document.querySelector('input[name="organization"]'),
    contact_name: document.querySelector('input[name="contact_name"]'),
    email: document.querySelector('input[name="email"]'),
    background: document.querySelector('textarea[name="background"]'),
    problem: document.querySelector('textarea[name="problem"]'),
    goals: document.querySelector('textarea[name="goals"]'),
    dataset: document.querySelector('textarea[name="dataset"]')
};

// Validate single field
function validateField(fieldName) {
    const field = formFields[fieldName];
    const validator = validators[fieldName];
    
    if (validator && field) {
        const error = validator(field.value);
        
        // Show/hide error message
        let errorElement = field.parentElement.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            field.parentElement.appendChild(errorElement);
        }
        
        if (error) {
            errorElement.textContent = error;
            errorElement.style.display = 'block';
            field.style.borderColor = '#f44336';
            return false;
        } else {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            field.style.borderColor = '#cfd8dc';
            return true;
        }
    }
    return true;
}

// Validate all fields
function validateForm() {
    let isValid = true;
    for (const fieldName in validators) {
        if (!validateField(fieldName)) {
            isValid = false;
        }
    }
    return isValid;
}

// Add blur event listeners for validation
Object.keys(formFields).forEach(fieldName => {
    const field = formFields[fieldName];
    if (field) {
        field.addEventListener('blur', () => validateField(fieldName));
        
        // Clear error on input
        field.addEventListener('input', () => {
            const errorElement = field.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
                field.style.borderColor = '#cfd8dc'; // reset border
            }
        });
    }
});

// Handle form submission
submissionForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the default form submission (redirect)

    // Validate form
    if (!validateForm()) {
        // Scroll to first error
        const firstError = document.querySelector('.error-message');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Show loading state
    const submitBtn = submissionForm.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Verzenden...';

    // Prepare form data
    const formData = new FormData(submissionForm);
    const action = submissionForm.getAttribute('action');

    try {
        const response = await fetch(action, {
            method: 'POST',
            body: formData
        });

        // StaticForms returns 200 on success and 400 on error
        if (response.ok) {
            // Success!
            submissionForm.style.display = 'none';
            successMessage.style.display = 'block';
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Error from StaticForms
            const data = await response.json().catch(() => ({}));
            const errorMessage = data.message || 'Er was een probleem bij het verzenden van uw formulier.';
            alert('Oeps! ' + errorMessage);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    } catch (error) {
        // Network error
        console.error('Form submission error:', error);
        alert('Oeps! Er was een probleem bij het verzenden van uw formulier. Controleer uw internetverbinding.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// ===== Smooth Scroll for Navigation Links =====

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Don't prevent default for form submission
        if (href === '#' || this.closest('form')) {
            return;
        }
        
        e.preventDefault();
        
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Add animation on scroll =====

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

// Observe cards for animation
document.querySelectorAll('.about-card, .project-type, .contact-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s ease';
    observer.observe(card);
});

// ===== Add CSS for error messages =====

const style = document.createElement('style');
style.textContent = `
    .error-message {
        display: none;
        color: #f44336;
        font-size: 0.875rem;
        margin-top: 0.5rem;
        font-weight: 500;
    }
    
    .form-group input:invalid:not(:placeholder-shown),
    .form-group textarea:invalid:not(:placeholder-shown),
    .form-group select:invalid:not(:placeholder-shown) {
        border-color: #f44336;
    }
    
    .success-message {
        background-color: #e8f5e9;
        color: #2e7d32;
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        font-weight: 500;
        margin-top: 2rem;
        border: 1px solid #c8e6c9;
    }
`;
document.head.appendChild(style);

// ===== Console message =====

console.log('%cADS & AI DataLabs', 'color: #3d4d5c; font-size: 20px; font-weight: bold;');
console.log('%cDe Haagse Hogeschool', 'color: #00bcd4; font-size: 14px;');


// ===== Chatbot Widget =====

(function initChatWidget() {
    const API_BASE = (window.CHATBOT_API_BASE || 'http://localhost:8000').replace(/\/$/, '');

    const toggleBtn = document.getElementById('chat-toggle');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close');
    const messagesEl = document.getElementById('chat-messages');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const roleBtns = document.querySelectorAll('.chat-role-btn');

    if (!toggleBtn || !panel || !form) return; // widget not on this page

    // Session id persists for the browser tab
    let sessionId = sessionStorage.getItem('ads_ai_chat_session');
    if (!sessionId) {
        sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
                    ('s_' + Date.now() + '_' + Math.random().toString(36).slice(2));
        sessionStorage.setItem('ads_ai_chat_session', sessionId);
    }

    let userType = 'student';
    let greeted = false;

    function setOpen(open) {
        panel.hidden = !open;
        toggleBtn.classList.toggle('is-open', open);
        toggleBtn.setAttribute('aria-expanded', String(open));
        if (open) {
            if (!greeted) {
                appendBotMessage(
                    userType === 'student'
                        ? 'Hoi! Vraag me iets over de opleiding of de projecttypen.'
                        : 'Hallo! Vraag me wat een goede opdracht maakt of beschrijf je idee — ik denk graag mee.'
                );
                greeted = true;
            }
            setTimeout(() => input && input.focus(), 50);
        }
    }

    function appendUserMessage(text) {
        const el = document.createElement('div');
        el.className = 'chat-msg user';
        el.textContent = text;
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendBotMessage(text, sources) {
        const el = document.createElement('div');
        el.className = 'chat-msg bot';
        el.textContent = text;
        if (sources && sources.length) {
            const details = document.createElement('details');
            details.className = 'chat-sources';
            const summary = document.createElement('summary');
            summary.textContent = 'Bronnen';
            details.appendChild(summary);
            const ul = document.createElement('ul');
            sources.forEach(s => {
                const li = document.createElement('li');
                li.textContent = `${s.source} > ${s.heading}`;
                ul.appendChild(li);
            });
            details.appendChild(ul);
            el.appendChild(details);
        }
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return el;
    }

    function appendPendingMessage() {
        const el = document.createElement('div');
        el.className = 'chat-msg bot pending';
        el.textContent = '…';
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return el;
    }

    function appendErrorMessage(text) {
        const el = document.createElement('div');
        el.className = 'chat-msg error';
        el.textContent = text;
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    toggleBtn.addEventListener('click', () => setOpen(panel.hidden));
    closeBtn.addEventListener('click', () => setOpen(false));

    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roleBtns.forEach(b => {
                b.classList.toggle('active', b === btn);
                b.setAttribute('aria-selected', String(b === btn));
            });
            userType = btn.dataset.role;
            // Reset the session so the assistant talks to the new role cleanly
            fetch(`${API_BASE}/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
            }).catch(() => {});
            messagesEl.innerHTML = '';
            greeted = false;
            appendBotMessage(
                userType === 'student'
                    ? 'Hoi student! Vraag me iets over de opleiding of de projecttypen.'
                    : 'Hallo! Vraag me wat een goede opdracht maakt of beschrijf je idee — ik denk graag mee.'
            );
            greeted = true;
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;

        appendUserMessage(message);
        input.value = '';
        const pending = appendPendingMessage();
        sendBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    user_type: userType,
                    session_id: sessionId,
                }),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            pending.remove();
            appendBotMessage(data.reply || '(geen antwoord)', data.sources);
        } catch (err) {
            pending.remove();
            appendErrorMessage(
                'Kon de chatbot niet bereiken. Draait de backend op ' + API_BASE + '?'
            );
            console.error('chat error:', err);
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    });
})();
