let allNotices = [];

window.onload = () => {
  loadNotices();
};

async function loadNotices() {
  try {
    const token = sessionStorage.getItem('token');
    const endpoint = '/api/notices';
    
    const headers = {};
    if (token) headers['x-auth-token'] = token;
    
    const res = await fetch(endpoint, { headers });
    allNotices = await res.json();

    if (!Array.isArray(allNotices)) {
      allNotices = [];
    }

    displayNotices();
    updateNotificationBadge();
  } catch (err) {
    console.error('❌ Error loading notices:', err);
    const container = document.getElementById('notices');
    if (container) container.innerHTML = '<p style="color:red;">❌ Failed to load notices</p>';
  }
}

function displayNotices() {
  const container = document.getElementById('notices');
  if (!container || !Array.isArray(allNotices)) return;

  if (allNotices.length === 0) {
    container.innerHTML = '<div class="col-12 text-center"><p>No notices available</p></div>';
    return;
  }

  container.innerHTML = '';
  allNotices.forEach(notice => {
    const isNew = notice.isNewForUser !== undefined ? notice.isNewForUser : notice.isNew;
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    card.innerHTML = `
      <div class="card notice-card shadow-sm h-100 position-relative">
        ${isNew ? '<span class="badge bg-danger position-absolute top-0 end-0 m-2">New</span>' : ''}
        ${notice.imageUrl ? `<img src="${notice.imageUrl}" class="card-img-top" alt="Notice Image">` : ''}
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${notice.title}</h5>
          <p class="card-text text-truncate">${notice.description}</p>
          <p class="text-muted"><small>${notice.category} | ${new Date(notice.createdAt).toLocaleDateString()}</small></p>
          <p class="mb-2"><strong>By: ${notice.postedBy}</strong></p>
          <div class="mt-auto">
            <button class="btn btn-primary btn-sm" onclick="viewNoticeDetail('${notice._id}')">
              <i class="fas fa-eye"></i> View Details
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateNotificationBadge() {
  const token = sessionStorage.getItem('token');
  if (!token) return;
  
  const newNoticesCount = allNotices.filter(n => n.isNewForUser !== undefined ? n.isNewForUser : n.isNew).length;
  const badge = document.querySelector('.notification-badge');
  
  if (badge) {
    const existingBadge = badge.querySelector('.badge');
    if (newNoticesCount > 0) {
      if (existingBadge) {
        existingBadge.textContent = newNoticesCount;
      } else {
        const badgeEl = document.createElement('span');
        badgeEl.className = 'badge bg-danger rounded-pill position-absolute top-0 end-0';
        badgeEl.textContent = newNoticesCount;
        badge.style.position = 'relative';
        badge.appendChild(badgeEl);
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }
  }
}

function viewNoticeDetail(id) {
  const notice = allNotices.find(n => n._id === id);
  if (!notice) return;

  const token = sessionStorage.getItem('token');
  
  const modalHTML = `
    <div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${notice.title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${notice.imageUrl ? `<img src="${notice.imageUrl}" class="img-fluid mb-3 rounded" alt="Notice">` : ''}
            <p>${notice.description}</p>
            <hr>
            <p><strong>Category:</strong> ${notice.category}</p>
            <p><strong>Posted By:</strong> ${notice.postedBy}</p>
            <p><strong>Date:</strong> ${new Date(notice.createdAt).toLocaleString()}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  let modal = document.getElementById('detailModal');
  if (modal) modal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  modal = new bootstrap.Modal(document.getElementById('detailModal'));
  modal.show();

  if (token) {
    markNoticeAsViewed(id);
  }
}

async function markNoticeAsViewed(id) {
  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`/api/notices/${id}/view`, {
      method: 'PATCH',
      headers: { 'x-auth-token': token }
    });

    if (res.ok) {
      const notice = allNotices.find(n => n._id === id);
      if (notice) {
        notice.isNewForUser = false;
        displayNotices();
        updateNotificationBadge();
      }
    }
  } catch (err) {
    console.error('Error marking as viewed:', err);
  }
}

