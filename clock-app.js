// World Clock App with Multiple Time Zones
class WorldClockApp {
    constructor() {
        this.timezones = [];
        this.use24Hour = true;
        this.allTimezones = this.generateTimezoneList();
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.populateTimezoneSelect();
        this.render();
        this.updateClocks();
        setInterval(() => this.updateClocks(), 1000);
    }

    generateTimezoneList() {
        const timezones = [
            { name: 'New York', offset: 'America/New_York' },
            { name: 'Los Angeles', offset: 'America/Los_Angeles' },
            { name: 'Chicago', offset: 'America/Chicago' },
            { name: 'Denver', offset: 'America/Denver' },
            { name: 'London', offset: 'Europe/London' },
            { name: 'Paris', offset: 'Europe/Paris' },
            { name: 'Berlin', offset: 'Europe/Berlin' },
            { name: 'Tokyo', offset: 'Asia/Tokyo' },
            { name: 'Sydney', offset: 'Australia/Sydney' },
            { name: 'Dubai', offset: 'Asia/Dubai' },
            { name: 'Singapore', offset: 'Asia/Singapore' },
            { name: 'Hong Kong', offset: 'Asia/Hong_Kong' },
            { name: 'Bangkok', offset: 'Asia/Bangkok' },
            { name: 'India Standard Time', offset: 'Asia/Kolkata' },
            { name: 'Moscow', offset: 'Europe/Moscow' },
            { name: 'Istanbul', offset: 'Europe/Istanbul' },
            { name: 'São Paulo', offset: 'America/Sao_Paulo' },
            { name: 'Mexico City', offset: 'America/Mexico_City' },
            { name: 'Toronto', offset: 'America/Toronto' },
            { name: 'Vancouver', offset: 'America/Vancouver' },
            { name: 'Auckland', offset: 'Pacific/Auckland' },
            { name: 'Seoul', offset: 'Asia/Seoul' },
            { name: 'Cairo', offset: 'Africa/Cairo' },
            { name: 'Johannesburg', offset: 'Africa/Johannesburg' },
            { name: 'Jakarta', offset: 'Asia/Jakarta' },
            { name: 'Manila', offset: 'Asia/Manila' },
            { name: 'Kuala Lumpur', offset: 'Asia/Kuala_Lumpur' },
        ];
        return timezones;
    }

    setupEventListeners() {
        document.getElementById('addTimezoneBtn').addEventListener('click', () => this.addTimezone());
        document.getElementById('timezoneSelect').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTimezone();
        });
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('use24HourBtn').addEventListener('click', () => this.toggleTimeFormat());
    }

    populateTimezoneSelect() {
        const select = document.getElementById('timezoneSelect');
        this.allTimezones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.offset;
            option.textContent = `${tz.name} (${tz.offset})`;
            select.appendChild(option);
        });
    }

    addTimezone() {
        const select = document.getElementById('timezoneSelect');
        const value = select.value;

        if (!value) {
            alert('Please select a time zone!');
            return;
        }

        if (this.timezones.find(tz => tz.offset === value)) {
            alert('This time zone is already added!');
            return;
        }

        const tz = this.allTimezones.find(t => t.offset === value);
        this.timezones.push(tz);
        this.saveToLocalStorage();
        select.value = '';
        this.render();
    }

    removeTimezone(offset) {
        this.timezones = this.timezones.filter(tz => tz.offset !== offset);
        this.saveToLocalStorage();
        this.render();
    }

    clearAll() {
        if (this.timezones.length === 0) {
            alert('No time zones to clear!');
            return;
        }

        if (confirm('Clear all time zones?')) {
            this.timezones = [];
            this.saveToLocalStorage();
            this.render();
        }
    }

    toggleTimeFormat() {
        this.use24Hour = !this.use24Hour;
        const btn = document.getElementById('use24HourBtn');
        btn.classList.toggle('active', this.use24Hour);
        this.saveToLocalStorage();
    }

    formatTime(date, use24Hour = true) {
        if (use24Hour) {
            return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
            return date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }

    getTimeInTimezone(timezone) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const parts = formatter.formatToParts(new Date());
        const partValues = {};
        parts.forEach(part => {
            partValues[part.type] = part.value;
        });

        return {
            date: `${partValues.month}/${partValues.day}/${partValues.year}`,
            time: `${partValues.hour}:${partValues.minute}:${partValues.second}`
        };
    }

    getUTCOffset(timezone) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'short'
        });
        const parts = formatter.formatToParts(now);
        const tzName = parts.find(part => part.type === 'timeZoneName');
        return tzName ? tzName.value : 'UTC';
    }

    updateClocks() {
        // Update local time
        const now = new Date();
        const localTime = this.formatTime(now, this.use24Hour);
        const localDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const localTimezone = 'UTC' + (now.getTimezoneOffset() > 0 ? '-' : '+') + String(Math.abs(Math.floor(now.getTimezoneOffset() / 60))).padStart(2, '0');

        document.getElementById('localDigitalTime').textContent = localTime;
        document.getElementById('localDate').textContent = localDate;
        document.getElementById('localTimezone').textContent = localTimezone;

        // Update analog clock
        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const hours = now.getHours() % 12;

        document.querySelector('.hour-hand').style.transform = `rotate(${(hours * 30) + (minutes * 0.5)}deg)`;
        document.querySelector('.minute-hand').style.transform = `rotate(${(minutes * 6) + (seconds * 0.1)}deg)`;
        document.querySelector('.second-hand').style.transform = `rotate(${seconds * 6}deg)`;

        // Update timezone cards
        const cardsContainer = document.getElementById('timezonesGrid');
        const cards = cardsContainer.querySelectorAll('.timezone-card');
        
        this.timezones.forEach((tz, index) => {
            if (cards[index]) {
                const timeData = this.getTimeInTimezone(tz.offset);
                const displayTime = this.formatTimeDisplay(timeData.time, this.use24Hour);
                cards[index].querySelector('.card-time').textContent = displayTime;
                cards[index].querySelector('.card-date').textContent = timeData.date;
            }
        });
    }

    formatTimeDisplay(timeString, use24Hour) {
        const [hours, minutes, seconds] = timeString.split(':');
        if (use24Hour) {
            return `${hours}:${minutes}:${seconds}`;
        } else {
            const h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHours = h % 12 || 12;
            return `${String(displayHours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
        }
    }

    render() {
        const grid = document.getElementById('timezonesGrid');
        const emptyState = document.getElementById('emptyState');

        grid.innerHTML = '';

        if (this.timezones.length === 0) {
            emptyState.classList.add('show');
        } else {
            emptyState.classList.remove('show');
            this.timezones.forEach(tz => {
                const timeData = this.getTimeInTimezone(tz.offset);
                const displayTime = this.formatTimeDisplay(timeData.time, this.use24Hour);
                const utcOffset = this.getUTCOffset(tz.offset);

                const card = document.createElement('div');
                card.className = 'timezone-card';
                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-city">${tz.name}</div>
                        <button class="remove-btn" data-offset="${tz.offset}" title="Remove">✕</button>
                    </div>
                    <div class="card-time">${displayTime}</div>
                    <div class="card-timezone">${tz.offset}</div>
                    <div class="card-date">${timeData.date}</div>
                `;

                card.querySelector('.remove-btn').addEventListener('click', (e) => {
                    this.removeTimezone(e.target.dataset.offset);
                });

                grid.appendChild(card);
            });
        }

        // Update button states
        document.getElementById('clearAllBtn').disabled = this.timezones.length === 0;
        document.getElementById('use24HourBtn').classList.toggle('active', this.use24Hour);
    }

    saveToLocalStorage() {
        const data = {
            timezones: this.timezones,
            use24Hour: this.use24Hour
        };
        localStorage.setItem('worldClock', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('worldClock');
        if (saved) {
            const data = JSON.parse(saved);
            this.timezones = data.timezones || [];
            this.use24Hour = data.use24Hour !== false;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WorldClockApp();
});