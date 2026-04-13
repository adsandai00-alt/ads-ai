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
    project_type: (value) => {
        if (!value) return 'Selecteer een projecttype';
        return '';
    },
    background: (value) => {
        if (!value.trim()) return 'Achtergrond is verplicht';
        if (value.trim().length < 10) return 'Achtergrond moet minstens 10 karakters lang zijn';
        return '';
    },
    problem: (value) => {
        if (!value.trim()) return 'Probleemdefiniëring is verplicht';
        if (value.trim().length < 10) return 'Probleemdefiniëring moet minstens 10 karakters lang zijn';
        return '';
    },
    goals: (value) => {
        if (!value.trim()) return 'Doelen/Deliverables is verplicht';
        if (value.trim().length < 10) return 'Doelen moet minstens 10 karakters lang zijn';
        return '';
    },
    dataset: (value) => {
        if (!value.trim()) return 'Datasetbeschrijving is verplicht';
        if (value.trim().length < 10) return 'Datasetbeschrijving moet minstens 10 karakters lang zijn';
        return '';
    },
    techniques: (value) => {
        if (!value.trim()) return 'ML technieken is verplicht';
        if (value.trim().length < 5) return 'ML technieken beschrijving moet minstens 5 karakters lang zijn';
        return '';
    }
};

// Get all form fields
const formFields = {
    organization: document.querySelector('input[name="organization"]'),
    contact_name: document.querySelector('input[name="contact_name"]'),
    email: document.querySelector('input[name="email"]'),
    project_type: document.querySelector('select[name="project_type"]'),
    background: document.querySelector('textarea[name="background"]'),
    problem: document.querySelector('textarea[name="problem"]'),
    goals: document.querySelector('textarea[name="goals"]'),
    dataset: document.querySelector('textarea[name="dataset"]'),
    techniques: document.querySelector('textarea[name="techniques"]')
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
submissionForm.addEventListener('submit', (e) => {
    // Validate form
    if (!validateForm()) {
        e.preventDefault();
        
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

    // Formspree will handle the submission automatically
    // The form will be submitted normally with the method="POST" action
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
`;
document.head.appendChild(style);

// ===== Console message =====

console.log('%cADS & AI DataLabs', 'color: #3d4d5c; font-size: 20px; font-weight: bold;');
console.log('%cDe Haagse Hogeschool', 'color: #00bcd4; font-size: 14px;');
