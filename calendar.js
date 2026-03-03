let currentDate = new Date(2026, 0, 1);
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const typePriority = { holiday: 4, exam: 3, special: 2, default: 1 };

// Legend type filter: which event types to show (all checked by default)
let visibleTypes = { holiday: true, exam: true, special: true, default: true };

function toggleTypeFilter(type) {
    visibleTypes[type] = !visibleTypes[type];
    const wrap = document.getElementById('legend-' + type);
    if (wrap) wrap.classList.toggle('checked', visibleTypes[type]);
    renderCalendar();
}

function eventMatchesTypeFilter(event) {
    return visibleTypes[event.type] === true;
}

const YEAR_OPTIONS_PRIMARY = [
    { value: 'All', label: 'All Years' },
    { value: 'Year 1-3', label: 'Year 1-3' },
    { value: 'Year 4-6', label: 'Year 4-6' }
];
const YEAR_OPTIONS_SECONDARY = [
    { value: 'All', label: 'All Years' },
    { value: 'Year 7', label: 'Year 7' },
    { value: 'Year 8', label: 'Year 8' },
    { value: 'Year 9', label: 'Year 9' },
    { value: 'Year 10', label: 'Year 10' },
    { value: 'Year 11', label: 'Year 11' }
];

function getAcademicEvents() {
    return document.getElementById('schoolLevel').value === 'primary' ? ACADEMIC_EVENTS_PRIMARY : ACADEMIC_EVENTS_SECONDARY;
}

function formatDateForDisplay(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
}

function updateYearFilterOptions() {
    const sel = document.getElementById('yearFilter');
    const opts = document.getElementById('schoolLevel').value === 'primary' ? YEAR_OPTIONS_PRIMARY : YEAR_OPTIONS_SECONDARY;
    sel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
}

function getDominantEvent(events) {
    if (!events.length) return null;
    return [...events].sort((a, b) => (typePriority[b.type] || 0) - (typePriority[a.type] || 0))[0];
}

/** event.year가 "Year 10-11" 같은 범위인 경우, filter "Year 10" / "Year 11" 둘 다 매칭 */
function eventMatchesYearFilter(event, filter) {
    if (filter === 'All' || event.year === 'All') return true;
    if (event.year === filter) return true;
    const rangeMatch = event.year.match(/^Year (\d+)-(\d+)$/);
    if (rangeMatch) {
        const [, start, end] = rangeMatch.map(Number);
        const filterMatch = filter.match(/^Year (\d+)$/);
        if (filterMatch) {
            const yearNum = parseInt(filterMatch[1], 10);
            return yearNum >= start && yearNum <= end;
        }
    }
    return event.year.includes(filter);
}

// Multi-day events: hide on Sat/Sun. Single-day events: always show (even on weekend).
function shouldShowEventOnDay(event, dateStr) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const current = new Date(dateStr);
    if (current < start || current > end) return false;
    if (event.start === event.end) return true; // Single-day: show on any day including weekend
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Multi-day: hide on Sat/Sun
    return true;
}

// When holiday overlaps with multi-day events: hide multi-day, keep holiday + single-day
function filterEventsByHolidayPriority(events) {
    const hasHoliday = events.some(e => e.type === 'holiday');
    if (!hasHoliday) return events;
    return events.filter(e => e.type === 'holiday' || e.start === e.end);
}

// Would this event actually appear on the calendar this day? (weekend + holiday rules)
function wouldEventShowOnDay(event, dateStr, filter) {
    if (!shouldShowEventOnDay(event, dateStr)) return false;
    if (event.type === 'holiday' || event.start === event.end) return true;
    const dayEvents = getAcademicEvents().filter(e =>
        eventMatchesYearFilter(e, filter) && eventMatchesTypeFilter(e) && shouldShowEventOnDay(e, dateStr)
    );
    const hasHoliday = dayEvents.some(e => e.type === 'holiday');
    return !hasHoliday;
}

function getFirstVisibleDayInMonth(event, year, month, filter) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (dateStr < event.start || dateStr > event.end) continue;
        if (wouldEventShowOnDay(event, dateStr, filter)) return dateStr;
    }
    return null;
}

function getEventsForMonth(year, month, filter) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const events = getAcademicEvents().filter(event => {
        if (!eventMatchesYearFilter(event, filter)) return false;
        const start = new Date(event.start);
        const end = new Date(event.end);
        return start <= monthEnd && end >= monthStart;
    });
    return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function renderCalendar() {
    const viewMode = document.getElementById('viewMode').value;
    document.getElementById('monthlyView').classList.toggle('hidden', viewMode === 'yearly');
    document.getElementById('yearlyView').classList.toggle('hidden', viewMode === 'monthly');
    document.getElementById('monthNav').classList.toggle('hidden', viewMode === 'yearly');

    if (viewMode === 'monthly') {
        renderMonthly();
    } else {
        renderYearly();
    }
}

function renderMonthly() {
    const calendarDays = document.getElementById('calendarDays');
    const monthDisplay = document.getElementById('currentMonthDisplay');
    const filter = document.getElementById('yearFilter').value;

    calendarDays.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    monthDisplay.innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'day-cell bg-slate-50/50';
        calendarDays.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-cell p-2 flex flex-col hover:bg-slate-50 transition cursor-default';

        const dateSpan = document.createElement('span');
        dateSpan.innerText = day;
        const dayOfWeek = (firstDay + day - 1) % 7;
        dateSpan.className = 'text-sm font-bold mb-2 ' + (dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-slate-400');
        dayDiv.appendChild(dateSpan);

        let dayEvents = getAcademicEvents().filter(event => {
            return eventMatchesYearFilter(event, filter) && eventMatchesTypeFilter(event) && shouldShowEventOnDay(event, dateStr);
        });
        dayEvents = filterEventsByHolidayPriority(dayEvents);

        dayEvents.forEach(event => {
            const firstVisibleDay = getFirstVisibleDayInMonth(event, year, month, filter);
            const isFirstDay = firstVisibleDay !== null && dateStr === firstVisibleDay;
            const eventDiv = document.createElement('div');

            if (isFirstDay) {
                const isOneDay = event.start === event.end;
                const endText = isOneDay ? "" : ` (~${formatDateForDisplay(event.end)})`;

                eventDiv.className = `event-tag event-${event.type}`;
                eventDiv.innerText = `${event.title}${endText}`;
                eventDiv.onclick = () => showDetail(event);
            } else {
                eventDiv.className = `event-duration-bg bg-${event.type}-dim`;
                eventDiv.title = event.title;
                eventDiv.onclick = () => showDetail(event);
            }

            dayDiv.appendChild(eventDiv);
        });

        calendarDays.appendChild(dayDiv);
    }
}

function buildYearlyCalendarBlock(year, m, filter) {
    const monthBlock = document.createElement('div');
    monthBlock.className = 'yearly-month';
    monthBlock.style.setProperty('--month-index', m);

    const monthTitle = document.createElement('div');
    monthTitle.className = 'py-2 px-2 text-center font-bold text-slate-700 text-sm border-b border-slate-200 bg-slate-50';
    monthTitle.innerText = monthNames[m];
    monthBlock.appendChild(monthTitle);

    const monthGrid = document.createElement('div');
    monthGrid.className = 'yearly-month-grid';

    ['S','M','T','W','T','F','S'].forEach((d, i) => {
        const h = document.createElement('div');
        h.className = 'py-1 text-center text-[0.6rem] font-semibold ' + (i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400');
        h.innerText = d;
        monthGrid.appendChild(h);
    });

    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'yearly-day-cell bg-slate-50/50';
        monthGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let dayEvents = getAcademicEvents().filter(event => {
            return eventMatchesYearFilter(event, filter) && eventMatchesTypeFilter(event) && shouldShowEventOnDay(event, dateStr);
        });
        dayEvents = filterEventsByHolidayPriority(dayEvents);

        const cell = document.createElement('div');
        cell.className = 'yearly-day-cell';
        const uniqueTypes = [...new Set(dayEvents.map(e => e.type))].sort((a, b) => (typePriority[b] || 0) - (typePriority[a] || 0));

        const tooltipText = dayEvents.map(e => e.title).join('\n');
        if (tooltipText) cell.title = tooltipText;

        const dayOfWeek = (firstDay + day - 1) % 7;
        const numSpan = document.createElement('span');
        numSpan.className = 'day-num ' + (dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : '');
        numSpan.innerText = day;
        cell.appendChild(numSpan);

        if (uniqueTypes.length > 0) {
            cell.classList.add('has-event');
            const barsContainer = document.createElement('div');
            barsContainer.className = 'color-bars';
            uniqueTypes.forEach(type => {
                const bar = document.createElement('div');
                bar.className = `color-bar ${type}`;
                barsContainer.appendChild(bar);
            });
            cell.appendChild(barsContainer);
            const firstEvent = getDominantEvent(dayEvents);
            cell.onclick = () => showDetail(firstEvent);
        }

        monthGrid.appendChild(cell);
    }

    monthBlock.appendChild(monthGrid);
    return monthBlock;
}

function buildYearlyEventsBlock(year, m, filter) {
    const colorMap = { holiday: '#ef4444', exam: '#3b82f6', special: '#f59e0b', default: '#94a3b8' };
    const monthEvents = getEventsForMonth(year, m, filter).filter(eventMatchesTypeFilter);
    const eventsPanel = document.createElement('div');
    eventsPanel.className = 'yearly-month-events';
    eventsPanel.style.setProperty('--month-index', m);
    monthEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.onclick = () => showDetail(event);
        const dateStr = event.start === event.end
            ? formatDateForDisplay(event.start)
            : `${formatDateForDisplay(event.start)} - ${formatDateForDisplay(event.end)}`;
        const color = colorMap[event.type] || '#94a3b8';
        item.innerHTML = `
            <span class="event-color" style="background:${color}"></span>
            <div class="event-text">
                <div class="event-date">${dateStr}</div>
                <div class="font-semibold text-slate-700">${event.title}</div>
            </div>
        `;
        eventsPanel.appendChild(item);
    });
    return eventsPanel;
}

function renderYearly() {
    const grid = document.getElementById('yearlyCombinedGrid');
    const filter = document.getElementById('yearFilter').value;
    const year = currentDate.getFullYear();

    grid.innerHTML = '';

    for (let quarter = 0; quarter < 3; quarter++) {
        for (let i = 0; i < 4; i++) {
            const m = quarter * 4 + i;
            grid.appendChild(buildYearlyCalendarBlock(year, m, filter));
        }
        for (let i = 0; i < 4; i++) {
            const m = quarter * 4 + i;
            grid.appendChild(buildYearlyEventsBlock(year, m, filter));
        }
    }
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
}

function showDetail(event) {
    document.getElementById('modalTitle').innerText = event.title;
    const startStr = formatDateForDisplay(event.start);
    const endStr = formatDateForDisplay(event.end);
    document.getElementById('modalDate').innerText = startStr === endStr ? startStr : `${startStr} - ${endStr}`;

    document.getElementById('modalDesc').innerHTML = `
        <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-slate-400 font-semibold text-sm">Target Year(s)</span>
            <span class="text-slate-800 font-bold">${event.year}</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-slate-100">
            <span class="text-slate-400 font-semibold text-sm">Type</span>
            <span class="text-slate-800 font-bold capitalize">${event.type}</span>
        </div>
    `;
    document.getElementById('eventModal').classList.remove('hidden');
    document.getElementById('eventModal').classList.add('flex');
}

function closeModal() {
    document.getElementById('eventModal').classList.add('hidden');
    document.getElementById('eventModal').classList.remove('flex');
}

document.getElementById('schoolLevel').addEventListener('change', () => {
    updateYearFilterOptions();
    renderCalendar();
});
document.getElementById('viewMode').addEventListener('change', renderCalendar);
document.getElementById('yearFilter').addEventListener('change', renderCalendar);
window.onload = () => {
    updateYearFilterOptions();
    renderCalendar();
};
