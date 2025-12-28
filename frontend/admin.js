// Check if user is logged in as admin
document.addEventListener('DOMContentLoaded', function() {
  // Authentication check
  const isAdmin = sessionStorage.getItem('role') === 'admin';
  const token = sessionStorage.getItem('token');
  
  if (!isAdmin || !token) {
    alert('You must be logged in as an admin to access this page');
    window.location.href = 'login.html';
    return;
  }

  // Initialize the dashboard
  loadNotices();

  // Event listeners
  document.getElementById('noticeForm').addEventListener('submit', handleNoticeSubmit);
  document.getElementById('resetBtn').addEventListener('click', resetForm);
  document.getElementById('searchNotices').addEventListener('input', filterNotices);
  document.getElementById('filterCategory').addEventListener('change', filterNotices);
  document.getElementById('saveEditBtn').addEventListener('click', saveEditedNotice);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  

});

// Global variables
let allNotices = [];
const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let currentView = 'active';

// Load all notices from the server (Admin only sees active notices)
async function loadNotices() {
  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch('/api/notices', {
      headers: { 'x-auth-token': token }
    });
    allNotices = await res.json();
    
    updateDashboardStats();
    displayNotices();
  } catch (err) {
    console.error('❌ Error loading notices:', err);
    document.getElementById('notices').innerHTML = '<p class="text-danger">Failed to load notices. Please try again.</p>';
  }
}

// Update dashboard statistics
async function updateDashboardStats() {
  if (!Array.isArray(allNotices)) return;
  
  // We need all notices for accurate stats, but for now we'll use what's loaded
  document.getElementById('totalNotices').textContent = allNotices.length;
  
  const today = new Date().toDateString();
  const todayCount = allNotices.filter(notice => 
    new Date(notice.createdAt).toDateString() === today
  ).length;
  document.getElementById('todayNotices').textContent = todayCount;
  
  const uniqueCategories = new Set(allNotices.map(notice => notice.category));
  document.getElementById('categories').textContent = uniqueCategories.size;
}

// Display notices with pagination
function displayNotices(filteredNotices = null) {
  const notices = filteredNotices || allNotices;
  const container = document.getElementById('notices');
  
  if (!Array.isArray(notices)) {
    container.innerHTML = '<p class="text-danger">No notices available</p>';
    return;
  }
  
  const totalPages = Math.ceil(notices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedNotices = notices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  if (paginatedNotices.length === 0) {
    container.innerHTML = '<div class="col-12 text-center"><p>No notices found</p></div>';
  } else {
    container.innerHTML = '';
    paginatedNotices.forEach(notice => {
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4 mb-4';
      card.innerHTML = `
        <div class="card notice-card h-100 ${notice.isNew ? 'border-primary' : ''}">
          ${notice.isNew ? '<span class="badge bg-primary position-absolute top-0 end-0 m-2">New</span>' : ''}
          ${notice.imageUrl ? `<img src="${notice.imageUrl}" class="card-img-top" alt="Notice Image">` : ''}
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${notice.title}</h5>
            <p class="card-text text-truncate">${notice.description}</p>
            <p class="text-muted mt-auto"><small>${notice.category} | ${new Date(notice.createdAt).toLocaleDateString()}</small></p>
            <p class="mb-2"><strong>By: ${notice.postedBy}</strong></p>
            <div class="btn-group mt-auto">
              <button class="btn btn-sm btn-outline-primary" onclick="viewNotice('${notice._id}')">
                <i class="bi bi-eye"></i> View
              </button>
              <button class="btn btn-sm btn-outline-warning" onclick="editNotice('${notice._id}')">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteNotice('${notice._id}')">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }
  
  updatePagination(totalPages);
}

// Update pagination controls
function updatePagination(totalPages) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  if (totalPages <= 1) return;
  
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" ${currentPage > 1 ? `onclick="changePage(${currentPage - 1}); return false;"` : ''}>
    <span aria-hidden="true">&laquo;</span>
  </a>`;
  pagination.appendChild(prevLi);
  
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>`;
    pagination.appendChild(li);
  }
  
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" ${currentPage < totalPages ? `onclick="changePage(${currentPage + 1}); return false;"` : ''}>
    <span aria-hidden="true">&raquo;</span>
  </a>`;
  pagination.appendChild(nextLi);
}

function changePage(page) {
  currentPage = page;
  displayNotices();
  window.scrollTo(0, document.getElementById('notices').offsetTop - 100);
}

function filterNotices() {
  const searchTerm = document.getElementById('searchNotices').value.toLowerCase();
  const categoryFilter = document.getElementById('filterCategory').value;
  
  const filtered = allNotices.filter(notice => {
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchTerm) || 
      notice.description.toLowerCase().includes(searchTerm) ||
      notice.postedBy.toLowerCase().includes(searchTerm);
    const matchesCategory = categoryFilter === '' || notice.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  currentPage = 1;
  displayNotices(filtered);
}

async function handleNoticeSubmit(e) {
  e.preventDefault();
  const token = sessionStorage.getItem('token');
  const form = e.target;
  const formData = new FormData(form);
  const noticeId = document.getElementById('noticeId').value;
  
  try {
    let url = '/api/notices';
    let method = 'POST';
    
    if (noticeId) {
      url = `/api/notices/${noticeId}`;
      method = 'PUT';
    }
    
    const res = await fetch(url, {
      method: method,
      headers: { 'x-auth-token': token },
      body: formData,
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Success');
      resetForm();
      loadNotices();
    } else {
      alert(data.message || 'Error occurred');
    }
  } catch (err) {
    console.error('❌ Error saving notice:', err);
    alert('Failed to save notice. Please try again.');
  }
}

function resetForm() {
  document.getElementById('noticeForm').reset();
  document.getElementById('noticeId').value = '';
  document.getElementById('submitBtn').textContent = 'Post Notice';
}

function viewNotice(id) {
  const notice = allNotices.find(n => n._id === id);
  if (!notice) return;
  
  document.getElementById('viewTitle').textContent = notice.title;
  document.getElementById('viewContent').textContent = notice.description;
  document.getElementById('viewCategory').textContent = notice.category;
  document.getElementById('viewDate').textContent = new Date(notice.createdAt).toLocaleString();
  document.getElementById('viewPostedBy').textContent = notice.postedBy;
  
  const imageContainer = document.getElementById('viewImageContainer');
  const image = document.getElementById('viewImage');
  
  if (notice.imageUrl) {
    image.src = notice.imageUrl;
    imageContainer.classList.remove('d-none');
  } else {
    imageContainer.classList.add('d-none');
  }
  
  const modal = new bootstrap.Modal(document.getElementById('viewNoticeModal'));
  modal.show();

  // If it's new, mark it as viewed
  if (notice.isNew) {
    markAsViewed(id);
  }
}

async function markAsViewed(id) {
  try {
    const token = sessionStorage.getItem('token');
    await fetch(`/api/notices/${id}/view`, {
      method: 'PATCH',
      headers: { 'x-auth-token': token }
    });
    // Update local state
    const notice = allNotices.find(n => n._id === id);
    if (notice) notice.isNew = false;
  } catch (err) {
    console.error('Error marking as viewed:', err);
  }
}

function editNotice(id) {
  const notice = allNotices.find(n => n._id === id);
  if (!notice) return;
  
  document.getElementById('editNoticeId').value = notice._id;
  document.getElementById('editTitle').value = notice.title;
  document.getElementById('editContent').value = notice.description;
  document.getElementById('editCategory').value = notice.category;
  document.getElementById('editPostedBy').value = notice.postedBy;
  
  const imageContainer = document.getElementById('currentImageContainer');
  const image = document.getElementById('currentImage');
  
  if (notice.imageUrl) {
    image.src = notice.imageUrl;
    imageContainer.classList.remove('d-none');
  } else {
    imageContainer.classList.add('d-none');
  }
  
  const modal = new bootstrap.Modal(document.getElementById('editNoticeModal'));
  modal.show();
}

async function saveEditedNotice() {
  const token = sessionStorage.getItem('token');
  const form = document.getElementById('editNoticeForm');
  const formData = new FormData(form);
  const noticeId = document.getElementById('editNoticeId').value;
  
  try {
    const res = await fetch(`/api/notices/${noticeId}`, {
      method: 'PUT',
      headers: { 'x-auth-token': token },
      body: formData,
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Notice updated');
      const modal = bootstrap.Modal.getInstance(document.getElementById('editNoticeModal'));
      modal.hide();
      loadNotices();
    } else {
      alert(data.message || 'Error occurred');
    }
  } catch (err) {
    console.error('❌ Error updating notice:', err);
    alert('Failed to update notice. Please try again.');
  }
}



async function deleteNotice(id) {
  if (!confirm('Are you sure you want to delete this notice?')) return;
  const token = sessionStorage.getItem('token');
  try {
    const res = await fetch(`/api/notices/${id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Notice deleted');
      loadNotices();
    } else {
      alert(data.message || 'Error occurred');
    }
  } catch (err) {
    console.error('❌ Delete error:', err);
    alert('Failed to delete notice.');
  }
}

function logout() {
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('token');
  window.location.href = 'login.html';
}
