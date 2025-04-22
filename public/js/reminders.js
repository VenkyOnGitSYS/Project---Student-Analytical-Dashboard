document.addEventListener('DOMContentLoaded', function() {
    // Set minimum datetime for reminder to now
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - timezoneOffset).toISOString().slice(0, 16);
    document.getElementById('reminderDateTime').min = localISOTime;
    
    // Save new reminder
    const reminderForm = document.getElementById('reminderForm');
    if (reminderForm) {
        reminderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const taskId = document.getElementById('reminderTask').value;
            const reminderTime = document.getElementById('reminderDateTime').value;
            const message = document.getElementById('reminderMessage').value;
            
            fetch('/reminders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `task_id=${taskId}&reminder_time=${encodeURIComponent(reminderTime)}&message=${encodeURIComponent(message)}`
            })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error creating reminder');
            });
        });
    }
    
    // Mark reminder as completed
    // Modify the markReminderCompleted function to handle the response properly
function markReminderCompleted(reminderId, reminderElement) {
    fetch(`/reminders/${reminderId}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
            }
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Add strikethrough effect
        const contentElements = reminderElement.querySelectorAll('h5, p, small');
        contentElements.forEach(el => {
            el.classList.add('text-muted');
            const span = document.createElement('span');
            span.className = 'strikethrough';
            span.innerHTML = el.innerHTML;
            el.innerHTML = '';
            el.appendChild(span);
        });

        // Move to completed section
        setTimeout(() => {
            reminderElement.classList.add('reminder-completed');
            const completedList = document.getElementById('completed-reminders-list');
            if (completedList) {
                completedList.prepend(reminderElement);
            }
        }, 300);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to mark reminder as completed');
    });
}
    
    // Delete reminder
    document.querySelectorAll('.delete-reminder-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this reminder?')) {
                const reminderId = this.getAttribute('data-reminder-id');
                
                fetch(`/api/reminders/${reminderId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (response.ok) {
                        window.location.reload();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error deleting reminder');
                });
            }
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.mark-completed-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const reminderId = button.dataset.reminderId;
                const res = await fetch(`/reminders/complete/${reminderId}`, {
                    method: 'POST'
                });
    
                if (res.ok) {
                    button.closest('.list-group-item').classList.add('completed-reminder');
                    button.remove(); // remove the completed button
                }
            });
        });
    
        document.getElementById('toggle-history-btn')?.addEventListener('click', () => {
            const historySection = document.getElementById('reminder-history');
            historySection.classList.toggle('d-none');
        });
    });    
});