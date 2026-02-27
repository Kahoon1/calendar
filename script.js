document.addEventListener('DOMContentLoaded', function() {
  const calendarEl = document.getElementById('calendar');

  // Load saved data
  let savedEvents = JSON.parse(localStorage.getItem('tacticalCalendarEvents')) || [];

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    
    // THE TIME RANGE (7 AM - 2 AM)
    slotMinTime: '07:00:00', 
    slotMaxTime: '26:00:00', 

    // LAYOUT & SNAPPING
    allDaySlot: false,
    expandRows: true,
    stickyHeaderDates: true,
    handleWindowResize: true,
    snapDuration: '00:15:00', // Snap to 15 min increments
    slotDuration: '00:30:00', // Visual lines every 30 mins
    
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },

    editable: true,
    selectable: true,
    events: savedEvents,

    // Create Event
    select: function(info) {
      let title = prompt('System Entry - Task Name:');
      if (title) {
        calendar.addEvent({
          title: title,
          start: info.startStr,
          end: info.endStr
        });
        saveToStorage();
      }
      calendar.unselect();
    },

    // Save on Move
    eventDrop: function() { saveToStorage(); },

    // Save on Resize
    eventResize: function() { saveToStorage(); },

    // Delete on Click
    eventClick: function(info) {
      if (confirm(`Purge entry "${info.event.title}"?`)) {
        info.event.remove();
        saveToStorage();
      }
    }
  });

  function saveToStorage() {
    const allEvents = calendar.getEvents().map(event => ({
      title: event.title,
      start: event.startStr,
      end: event.endStr
    }));
    localStorage.setItem('tacticalCalendarEvents', JSON.stringify(allEvents));
  }

  calendar.render();
});