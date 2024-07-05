document.addEventListener('DOMContentLoaded', function () {
  const ctx = document.getElementById('screenTimeChart').getContext('2d');
  const taskInput = document.getElementById('new-task');
  const categoryInput = document.getElementById('task-category');
  const deadlineInput = document.getElementById('task-deadline');
  const addTaskButton = document.getElementById('add-task');
  const taskList = document.getElementById('task-list');

  // Fetch and display tracked time data
  chrome.storage.sync.get('trackedTime', (result) => {
    const trackedTime = (result.trackedTime) || {};
    const today = getFormattedDate(new Date());
    const label1 = Object.keys(trackedTime[today] || {});
    const data = Object.values(trackedTime[today] || {});

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: label1,
        datasets: [{
          label: 'Time spent (min)',
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  });
 
  // Handle adding a new task
  addTaskButton.addEventListener('click', () => {
    const task = taskInput.value.trim();
    const category = categoryInput.value.trim();
    const deadline = deadlineInput.value;
    if (task) {
      addTask({ task, category, deadline });
      taskInput.value = '';
      categoryInput.value = '';
      deadlineInput.value = '';
    }
  });

  // Load tasks from storage
  chrome.storage.sync.get('tasks', (result) => {
    const tasks = result.tasks || [];
    tasks.forEach(task => addTaskToDOM(task));
  });

  // Add task to DOM and save it
  function addTask(task) {
    chrome.storage.sync.get('tasks', (result) => {
      const tasks = result.tasks || [];
      tasks.push(task);
      chrome.storage.sync.set({ tasks: tasks }, () => addTaskToDOM(task));
    });
  }

  // Add task to DOM
  function addTaskToDOM(task) {
    const li = document.createElement('li');
    li.textContent = `${task.task} [${task.category}] - ${task.deadline}`;
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      removeTask(task);
      taskList.removeChild(li);
    });
    li.appendChild(removeButton);
    taskList.appendChild(li);
  }

  // Remove task from storage
  function removeTask(task) {
    chrome.storage.sync.get('tasks', (result) => {
      const tasks = result.tasks || [];
      const updatedTasks = tasks.filter(t => t.task !== task.task || t.category !== task.category || t.deadline !== task.deadline);
      chrome.storage.sync.set({ tasks: updatedTasks });
    });
  }
});

function getFormattedDate(date) {
  return date.toISOString().slice(0, 10);
}
