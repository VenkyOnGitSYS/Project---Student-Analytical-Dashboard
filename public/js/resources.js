document.addEventListener('DOMContentLoaded', function () {
    const applyFilters = document.getElementById('applyFilters');
    const resourcesList = document.getElementById('resourcesList');

    // Function to fetch and render resources
    function fetchResources(skill = '', level = '', type = '') {
        const url = `/api/resources?skill=${encodeURIComponent(skill)}&level=${encodeURIComponent(level)}&type=${encodeURIComponent(type)}`;

        fetch(url, {
            credentials: 'include'
        })
            .then(response => {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                if (!response.ok) {
                    throw new Error('Failed to fetch resources');
                }
                return response.json();
            })
            .then(resources => {
                resourcesList.innerHTML = '';

                if (!resources || resources.length === 0) {
                    resourcesList.innerHTML = `
                        <div class="alert alert-info">No resources found matching your filters.</div>
                    `;
                    return;
                }

                resources.forEach(resource => {
                    const resourceCard = document.createElement('div');
                    resourceCard.className = 'card mb-3 resource-card';
                    resourceCard.innerHTML = `
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h4>${resource.title}</h4>
                                    <span class="badge bg-info me-2">${resource.skill_name}</span>
                                    <span class="badge bg-${getLevelBadgeColor(resource.level)} me-2">
                                        ${resource.level}
                                    </span>
                                    <span class="badge bg-secondary">${resource.type}</span>
                                </div>
                                <a href="${resource.url}" target="_blank" class="btn btn-sm btn-primary align-self-start">
                                    Visit Resource
                                </a>
                            </div>
                            <hr>
                            <p class="mb-0">
                                <a href="${resource.url}" target="_blank">${resource.url}</a>
                            </p>
                        </div>
                    `;
                    resourcesList.appendChild(resourceCard);
                });
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error filtering resources. Please try again.');
            });
    }

    // On filter button click
    if (applyFilters) {
        applyFilters.addEventListener('click', function () {
            const skillFilter = document.getElementById('skillFilter').value;
            const levelFilter = document.getElementById('levelFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;
            fetchResources(skillFilter, levelFilter, typeFilter);
        });
    }

    // Load all on page load
    fetchResources();

    // Helper function for badge colors
    function getLevelBadgeColor(level) {
        switch (level.toLowerCase()) {
            case 'beginner': return 'success';
            case 'intermediate': return 'warning';
            case 'advanced': return 'danger';
            default: return 'secondary';
        }
    }
});
