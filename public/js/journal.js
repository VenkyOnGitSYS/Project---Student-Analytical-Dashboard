document.addEventListener('DOMContentLoaded', function() {
    const journalForm = document.getElementById('journalForm');
    if (journalForm) {
        journalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const content = document.getElementById('journalContent').value;
            
            fetch('/journal/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `content=${encodeURIComponent(content)}`
            })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                }
            });
        });
    }
});