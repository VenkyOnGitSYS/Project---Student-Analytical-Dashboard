document.addEventListener('DOMContentLoaded', function() {
    // Schedule task button click handler
    document.querySelectorAll('.schedule-btn').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = this.getAttribute('data-task-id');
            document.getElementById('taskId').value = taskId;
            
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dueDate').min = today;
            
            // Show modal
            const modal = document.getElementById('scheduleTaskModal');
            modal.style.display = 'block';
        });
    });

    // Close modal when clicking the close button or outside the modal
    document.querySelectorAll('.btn-close, .modal').forEach(element => {
        element.addEventListener('click', function(event) {
            if (event.target.classList.contains('btn-close') || event.target.classList.contains('modal')) {
                const modal = document.getElementById('scheduleTaskModal');
                modal.style.display = 'none';
            }
        });
    });

    // Prevent modal content click from closing the modal
    document.querySelector('.modal-dialog').addEventListener('click', function(event) {
        event.stopPropagation();
    });

    // Toggle reminder fields
    document.getElementById('setReminder').addEventListener('change', function() {
        const reminderFields = document.getElementById('reminderFields');
        reminderFields.style.display = this.checked ? 'block' : 'none';
    });

    // Save scheduled task
    document.getElementById('saveTaskBtn').addEventListener('click', function() {
        const taskId = document.getElementById('taskId').value;
        const dueDate = document.getElementById('dueDate').value;
        const setReminder = document.getElementById('setReminder').checked;
        const reminderDate = document.getElementById('reminderDate').value;
        const reminderMessage = document.getElementById('reminderMessage').value;

        // Validate required fields
        if (!dueDate) {
            alert('Please select a due date.');
            return;
        }
        if (setReminder && (!reminderDate || !reminderMessage)) {
            alert('Please fill in all reminder fields.');
            return;
        }
        
        // Save task to user's calendar
        fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_id: taskId,
                due_date: dueDate
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save task.');
            }
            return response.json();
        })
        .then(data => {
            if (setReminder) {
                // Save reminder
                return fetch('/reminders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `task_id=${encodeURIComponent(data.id)}&reminder_time=${encodeURIComponent(reminderDate)}&message=${encodeURIComponent(reminderMessage)}`
                });
            }
            return Promise.resolve();
        })
        .then(response => {
            if (response && !response.ok) {
                throw new Error('Failed to save reminder.');
            }
            // Close modal and refresh calendar
            const modal = document.getElementById('scheduleTaskModal');
            modal.style.display = 'none';
            
            // Show success message
            alert('Task scheduled successfully!');
            
            // Refresh calendar if on the page
            if (typeof calendar !== 'undefined') {
                calendar.refetchEvents();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error scheduling task: ' + error.message);
        });
    });
});