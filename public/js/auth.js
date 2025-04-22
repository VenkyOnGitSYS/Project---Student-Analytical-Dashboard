document.addEventListener('DOMContentLoaded', function() {
    // Login form validation
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                e.preventDefault();
                alert('Please fill in all fields');
            }
        });
    }

    // middleware/auth.js

    function isAuthenticated(req, res, next) {
        if (req.session && req.session.user) {
            return next();
        }
        res.redirect('/login');
    }

    module.exports = isAuthenticated;

    // Register form validation
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const primarySkills = document.querySelectorAll('input[name="primarySkills"]:checked');
            const secondarySkills = document.querySelectorAll('input[name="secondarySkills"]:checked');
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match');
                return;
            }
            
            if (primarySkills.length !== 3) {
                e.preventDefault();
                alert('Please select exactly 3 primary skills');
                return;
            }
            
            if (secondarySkills.length !== 3) {
                e.preventDefault();
                alert('Please select exactly 3 secondary skills');
                return;
            }
        });
        
        // Skill selection handling
        const skillCheckboxes = document.querySelectorAll('input[type="checkbox"][name^="skill"]');
        skillCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const skillId = this.value;
                const skillCard = document.getElementById(`skill-${skillId}`);
                
                if (this.checked) {
                    skillCard.classList.add('selected-skill');
                } else {
                    skillCard.classList.remove('selected-skill');
                }
            });
        });
    }
});