// NASA API Config
const API_BASE_URL = '/.netlify/functions/apod';

// Spinner Elements
const monthUpBtn = document.getElementById('month-up');
const monthDownBtn = document.getElementById('month-down');
const dayUpBtn = document.getElementById('day-up');
const dayDownBtn = document.getElementById('day-down');
const yearUpBtn = document.getElementById('year-up');
const yearDownBtn = document.getElementById('year-down');

const spinMonth = document.querySelector('#spin-month span');
const spinDay = document.querySelector('#spin-day span');
const spinYear = document.querySelector('#spin-year span');

const launchBtn = document.getElementById('launch-btn');
const todayBtn = document.getElementById('today-btn');
const randomBtn = document.getElementById('random-btn');
const hdBtn = document.getElementById('hd-btn');
const resetBtn = document.getElementById('reset-btn');

const loadingContainer = document.getElementById('loading');
const resultsPanel = document.getElementById('results');
const datePanel = document.getElementById('date-panel');

const apodImage = document.getElementById('apod-image');
const apodVideo = document.getElementById('apod-video');
const imageTitle = document.getElementById('image-title');
const imageDate = document.getElementById('image-date');
const dataTitle = document.getElementById('data-title');
const dataDate = document.getElementById('data-date');
const dataDescription = document.getElementById('data-description');

// Constants
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const APOD_START = new Date(1995, 5, 16); 

// Today
const now = new Date();
const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

// Selected date state
let selectedDate = new Date(todayDate);

// Store current APOD data
let currentAPODData = null;

function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function clampSelectedDate() {
    if (selectedDate < APOD_START) {
        selectedDate = new Date(APOD_START);
    }

    if (selectedDate > todayDate) {
        selectedDate = new Date(todayDate);
    }

    const maxDay = daysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    if (selectedDate.getDate() > maxDay) {
        selectedDate.setDate(maxDay);
    }
}

function updateSpinnerButtonStates() {
    const upYearTest = new Date(selectedDate);
    upYearTest.setFullYear(upYearTest.getFullYear() + 1);

    const downYearTest = new Date(selectedDate);
    downYearTest.setFullYear(downYearTest.getFullYear() - 1);

    yearUpBtn.disabled = upYearTest > todayDate;
    yearDownBtn.disabled = downYearTest < APOD_START;
}

function updateSpinnerDisplay() {
    clampSelectedDate();

    spinMonth.textContent = MONTH_NAMES[selectedDate.getMonth()];
    spinDay.textContent = String(selectedDate.getDate()).padStart(2, '0');
    spinYear.textContent = String(selectedDate.getFullYear());

    updateSpinnerButtonStates();
}

function incrementMonth(delta) {
    const originalDay = selectedDate.getDate();

    selectedDate.setDate(1);
    selectedDate.setMonth(selectedDate.getMonth() + delta);

    const maxDay = daysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    selectedDate.setDate(Math.min(originalDay, maxDay));

    clampSelectedDate();
    updateSpinnerDisplay();
}

function incrementDay(delta) {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + delta);

    if (nextDate >= APOD_START && nextDate <= todayDate) {
        selectedDate = nextDate;
        updateSpinnerDisplay();
    }
}

function incrementYear(delta) {
    const originalMonth = selectedDate.getMonth();
    const originalDay = selectedDate.getDate();

    const nextDate = new Date(selectedDate);
    nextDate.setDate(1);
    nextDate.setFullYear(nextDate.getFullYear() + delta);
    nextDate.setMonth(originalMonth);

    const maxDay = daysInMonth(nextDate.getFullYear(), nextDate.getMonth());
    nextDate.setDate(Math.min(originalDay, maxDay));

    if (nextDate >= APOD_START && nextDate <= todayDate) {
        selectedDate = nextDate;
        updateSpinnerDisplay();
    }
}

function addButtonFeedback(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

function setToday() {
    selectedDate = new Date(todayDate);
    updateSpinnerDisplay();
    addButtonFeedback(todayBtn);
}

function setRandomDate() {
    const randomTime =
        APOD_START.getTime() +
        Math.random() * (todayDate.getTime() - APOD_START.getTime());

    const randomDate = new Date(randomTime);

    selectedDate = new Date(
        randomDate.getFullYear(),
        randomDate.getMonth(),
        randomDate.getDate()
    );

    updateSpinnerDisplay();
    addButtonFeedback(randomBtn);
}

async function fetchAPOD() {
    const selectedDateString = formatDateForAPI(selectedDate);

    if (selectedDate > todayDate) {
        showError('Cannot retrieve data from the future. Please select today or an earlier date.');
        return;
    }

    showLoading();
    hideResults();

    const url = `${API_BASE_URL}?date=${selectedDateString}`;

    try {
        const response = await fetch(url);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.error || 'Unable to retrieve this picture from NASA right now.'
            );
        }

        if (!data?.date || !data?.title || !data?.explanation || !data?.url) {
            throw new Error('NASA returned incomplete picture data. Please try another date.');
        }

        currentAPODData = data;
        displayAPOD(data);
    } catch (error) {
        console.error('Error fetching APOD:', error);
        showError(error.message || 'Mission failed! Unable to retrieve data. Please try again.');
    } finally {
        hideLoading();
    }
}

function displayAPOD(data) {
    apodImage.style.display = 'none';
    apodVideo.style.display = 'none';
    apodVideo.src = '';

    if (data.media_type === 'image') {
        apodImage.src = data.url;
        apodImage.alt = data.title;
        apodImage.style.display = 'block';
    } else if (data.media_type === 'video' || data.media_type === 'other') {
        apodVideo.src = data.url;
        apodVideo.style.display = 'block';
    } else {
        showError('Unknown media type. Please select a different date.');
        return;
    }

    imageTitle.textContent = data.title.toUpperCase();
    imageDate.textContent = formatDate(data.date);
    dataTitle.textContent = data.title;
    dataDate.textContent = formatDate(data.date);
    dataDescription.textContent = data.explanation;

    showResults();
}

function openHDImage() {
    if (currentAPODData && currentAPODData.hdurl) {
        window.open(currentAPODData.hdurl, '_blank');
        addButtonFeedback(hdBtn);
    } else if (currentAPODData && currentAPODData.url) {
        window.open(currentAPODData.url, '_blank');
        addButtonFeedback(hdBtn);
    } else {
        showError('No HD image available.');
    }
}

function clearResultsContent() {
    currentAPODData = null;

    apodImage.src = '';
    apodImage.alt = 'NASA APOD';
    apodImage.style.display = 'none';

    apodVideo.src = '';
    apodVideo.style.display = 'none';

    imageTitle.textContent = 'MEDIA DATA';
    imageDate.textContent = '';
    dataTitle.textContent = '—';
    dataDate.textContent = '—';
    dataDescription.textContent = 'Awaiting data retrieval...';
}

function startOver() {
    selectedDate = new Date(todayDate);
    updateSpinnerDisplay();
    clearResultsContent();
    hideResults();
    hideLoading();

    if (resetBtn) {
        addButtonFeedback(resetBtn);
    }

    if (datePanel) {
        datePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showLoading() {
    loadingContainer.classList.add('active');
}

function hideLoading() {
    loadingContainer.classList.remove('active');
}

function showResults() {
    resultsPanel.classList.add('active');
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResults() {
    resultsPanel.classList.remove('active');
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(20, 30, 50, 0.95);
        border: 2px solid #ff4fd8;
        border-radius: 10px;
        padding: 30px;
        max-width: 500px;
        z-index: 1000;
        box-shadow: 0 0 30px rgba(255, 79, 216, 0.35);
    `;

    errorDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4fd8; font-family: 'Orbitron', sans-serif; margin-bottom: 15px; letter-spacing: 1px;">
                SYSTEM ALERT
            </h3>
            <p class="error-message" style="color: #e0e6ed; line-height: 1.6; margin-bottom: 20px;"></p>
            <button type="button" style="
                padding: 10px 30px;
                background: #9b5cff;
                border: none;
                border-radius: 5px;
                color: white;
                font-family: 'Orbitron', sans-serif;
                font-weight: 600;
                cursor: pointer;
                letter-spacing: 1px;
            ">
                ACKNOWLEDGE
            </button>
        </div>
    `;

    errorDiv.querySelector('.error-message').textContent = message;
    errorDiv.querySelector('button').addEventListener('click', () => errorDiv.remove());

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// Event listeners
monthUpBtn.addEventListener('click', () => incrementMonth(1));
monthDownBtn.addEventListener('click', () => incrementMonth(-1));
dayUpBtn.addEventListener('click', () => incrementDay(1));
dayDownBtn.addEventListener('click', () => incrementDay(-1));
yearUpBtn.addEventListener('click', () => incrementYear(1));
yearDownBtn.addEventListener('click', () => incrementYear(-1));

launchBtn.addEventListener('click', fetchAPOD);
todayBtn.addEventListener('click', setToday);
randomBtn.addEventListener('click', setRandomDate);
hdBtn.addEventListener('click', openHDImage);

if (resetBtn) {
    resetBtn.addEventListener('click', startOver);
}

// Initialize
window.addEventListener('load', () => {
    updateSpinnerDisplay();
    // fetchAPOD(); // Uncomment to auto-load today's APOD

    
});
