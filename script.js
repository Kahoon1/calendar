document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const inboxContainer = document.getElementById('external-events');
    const inboxInput = document.getElementById('inbox-input');
    const inboxBtn = document.getElementById('inbox-add-btn');
    
    // Keys for LocalStorage
    const TASK_KEY = 'OBSIDIAN_TASKS_v8'; 
    const ROUTINE_KEY = 'OBSIDIAN_ROUTINE_v8';
    const INBOX_KEY = 'OBSIDIAN_INBOX_v8';

    // Load Data
    let savedEvents = JSON.parse(localStorage.getItem(TASK_KEY)) || [];
    let routineEvents = JSON.parse(localStorage.getItem(ROUTINE_KEY)) || [];
    let inboxItems = JSON.parse(localStorage.getItem(INBOX_KEY)) || [];

    // --- 1. INBOX LOGIC ---

    function renderInbox() {
        inboxContainer.innerHTML = ''; // Clear current list
        
        if (inboxItems.length === 0) {
            inboxContainer.innerHTML = '<p id="empty-inbox-msg" style="font-size:11px; color:#a1a1aa; text-align:center; margin-top:10px;">Inbox empty.</p>';
            return;
        }

        inboxItems.forEach((itemText) => {
            let el = document.createElement('div');
            el.className = 'draggable-item';
            
            let titleSpan = document.createElement('span');
            titleSpan.innerText = itemText;
            el.appendChild(titleSpan);

            let delBtn = document.createElement('span');
            delBtn.innerText = '×';
            delBtn.className = 'delete-inbox-btn';
            delBtn.onclick = function(e) {
                e.preventDefault(); 
                e.stopPropagation(); 
                deleteInboxItem(itemText);
            };

            el.appendChild(delBtn);
            inboxContainer.appendChild(el);
        });
    }

    function addInboxItem() {
        const val = inboxInput.value.trim();
        if (!val) return;
        
        inboxItems.push(val);
        localStorage.setItem(INBOX_KEY, JSON.stringify(inboxItems));
        renderInbox();
        inboxInput.value = ''; 
    }

    function deleteInboxItem(text) {
        const index = inboxItems.indexOf(text);
        if (index > -1) {
            inboxItems.splice(index, 1);
            localStorage.setItem(INBOX_KEY, JSON.stringify(inboxItems));
            renderInbox();
        }
    }

    inboxBtn.onclick = addInboxItem;
    inboxInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addInboxItem();
    });

    new FullCalendar.Draggable(inboxContainer, {
        itemSelector: '.draggable-item',
        eventData: function(eventEl) {
            let title = eventEl.querySelector('span').innerText;
            return {
                title: title.trim(),
                extendedProps: { isRoutine: false }
            };
        }
    });

    renderInbox();


    // --- 2. CALENDAR CONFIGURATION ---
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        slotMinTime: '06:00:00', // Start at 6 AM
        slotMaxTime: '24:00:00', // End at Midnight
        allDaySlot: false,
        nowIndicator: true,
        height: '100%', // Fill the container height
        expandRows: true, // AUTO-FIT rows to screen (prevents scrolling)
        editable: true,
        selectable: true,
        droppable: true, 
        handleWindowResize: true,
        
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay' 
        },

        events: [...savedEvents, ...routineEvents],

        // --- TAGS & STATUS ---
        eventClassNames: function(arg) {
            let classes = [];
            let t = arg.event.title.toLowerCase();
            
            if (t.startsWith('!')) classes.push('priority-event');
            if (t.startsWith('x')) classes.push('done-event');
            
            if (t.includes('#work')) classes.push('tag-work');
            if (t.includes('#health') || t.includes('#gym')) classes.push('tag-health');
            if (t.includes('#study')) classes.push('tag-study');
            if (t.includes('#meet')) classes.push('tag-meet');
            
            return classes;
        },

        eventContent: function(arg) {
            let titleText = arg.event.title.replace(/^[!xX]\s*/, '');
            return { html: `<div class="fc-event-main-frame"><div class="fc-event-title">${titleText}</div></div>` };
        },

        // --- HANDLERS ---
        eventClick: function(info) {
            let lastClick = info.event.extendedProps.lastClick || 0;
            let now = Date.now();

            if (now - lastClick < 300) { 
                let currentTitle = info.event.title;
                if (currentTitle.startsWith('!')) {
                    info.event.setProp('title', 'x ' + currentTitle.substring(1).trim());
                } else if (currentTitle.startsWith('x')) {
                    info.event.setProp('title', currentTitle.substring(1).trim());
                } else {
                    info.event.setProp('title', '!' + currentTitle);
                }
                saveAll();
            }
            info.event.setExtendedProp('lastClick', now);
        },

        eventReceive: function(info) {
            deleteInboxItem(info.event.title);
            saveAll();
        },

        eventDidMount: function(info) {
            info.el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if(confirm(`Delete "${info.event.title}"?`)) {
                    info.event.remove();
                    saveAll();
                }
            });
        },

        eventDrop: saveAll,
        eventResize: saveAll,
        datesSet: updateProgressBar
    });

    calendar.render();
    updateProgressBar();


    // --- 3. INPUT LISTENERS ---
    document.getElementById('quick-task-name').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const name = this.value;
            const startTime = document.getElementById('quick-task-time').value;
            if (!name) return;

            const start = new Date();
            const timeParts = startTime.split(':');
            start.setHours(timeParts[0], timeParts[1], 0);
            const end = new Date(start.getTime() + 60 * 60 * 1000); 

            calendar.addEvent({
                title: name, start: start.toISOString(), end: end.toISOString(),
                extendedProps: { isRoutine: false }
            });
            this.value = ""; 
            saveAll();
        }
    });

    document.getElementById('add-routine').onclick = () => {
        const name = document.getElementById('rt-name').value;
        const start = document.getElementById('rt-start').value;
        const end = document.getElementById('rt-end').value;
        const days = Array.from(document.querySelectorAll('.day-selector input:checked')).map(el => parseInt(el.value));
        
        if (!name || !start || !end || days.length === 0) return alert("Missing Info");

        calendar.addEvent({
            title: name, daysOfWeek: days, startTime: start, endTime: end,
            extendedProps: { isRoutine: true }
        });
        saveAll();
    };

    document.getElementById('toggleEditor').onclick = () => {
        document.getElementById('side-panel').classList.toggle('hidden');
        setTimeout(() => calendar.updateSize(), 300);
    };
    
    document.getElementById('ghostToggle').onclick = function() {
        const active = document.body.classList.toggle('ghost-active');
        this.innerText = active ? "Show Completed" : "Hide Completed";
    };

    function saveAll() {
        const all = calendar.getEvents();
        const tasks = all.filter(e => !e.extendedProps.isRoutine).map(e => ({ 
            title: e.title, start: e.startStr, end: e.endStr, extendedProps: { isRoutine: false } 
        }));
        const routines = all.filter(e => e.extendedProps.isRoutine).map(e => ({
            title: e.title, extendedProps: { isRoutine: true },
            daysOfWeek: e.def.recurringDef?.typeData.daysOfWeek,
            startTime: e.def.recurringDef?.typeData.startTime.format(),
            endTime: e.def.recurringDef?.typeData.endTime.format()
        }));
        localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
        localStorage.setItem(ROUTINE_KEY, JSON.stringify(routines));
        updateProgressBar();
    }

    function updateProgressBar() {
        const events = calendar.getEvents();
        const tasks = events.filter(e => !e.extendedProps.isRoutine);
        if (tasks.length === 0) {
            document.getElementById('progress-bar').style.width = '0%';
            return;
        }
        const completed = tasks.filter(e => e.title.toLowerCase().startsWith('x')).length;
        const total = tasks.length;
        document.getElementById('progress-bar').style.width = Math.round((completed / total) * 100) + '%';
    }
});
