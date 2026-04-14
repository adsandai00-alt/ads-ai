// ===== Form Validation & Submission =====

const submissionForm = document.querySelector('.submission-form');
const successMessage = document.getElementById('success-message');

// Validation rules
const validators = {
    organization: (value) => {
        if (!value.trim()) return 'Organisatienaam is verplicht';
        return '';
    },
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
    }
};

// Get all form fields
const formFields = {
    organization: document.querySelector('input[name="organization"]'),
    contact_name: document.querySelector('input[name="contact_name"]'),
    email: document.querySelector('input[name="email"]'),
    background: document.querySelector('textarea[name="background"]')
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
            if (field.parentElement.querySelector('.error-message')?.textContent) {
                validateField(fieldName);
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
