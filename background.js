let activeTabId = null;
let trackedTime = {};
let activeTabs = {};
let lastMouseMoveTime = Date.now();
let updateInterval = 10 * 60; 

function updateTrackedTime(domain, timeSpent) {
  if (typeof domain !== 'string' || typeof timeSpent !== 'number' || timeSpent < 0) {
    console.error('Invalid input');
    return;
  }

  let today = new Date().toISOString().slice(0, 10);

  chrome.storage.sync.get(['trackedTime'], (result) => {
    let trackedTime = result.trackedTime || {};

    if (!trackedTime[today]) {
      trackedTime[today] = {};
    }

    if (!trackedTime[today][domain]) {
      trackedTime[today][domain] = 0;
    }

    trackedTime[today][domain] += timeSpent;

    chrome.storage.sync.set({ trackedTime: trackedTime }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving tracked time:', chrome.runtime.lastError);
      } else {
        console.log('Tracked time updated successfully');
      }
    });
  });
}


chrome.tabs.onActivated.addListener((activeInfo) => {
  let now = Date.now();
  
  if (activeTabId !== null && activeTabs[activeTabId]) {
    let prevDomain = activeTabs[activeTabId].domain;
    let timeSpent = (now - activeTabs[activeTabId].startTime) / 1000;
    updateTrackedTime(prevDomain, timeSpent);
  }

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      let url = new URL(tab.url);
      let domain = url.hostname;
      activeTabs[activeInfo.tabId] = { domain: domain, startTime: now };
      activeTabId = activeInfo.tabId;
    }
  });
});


chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTabs[tabId]) {
    let now = Date.now();
    let domain = activeTabs[tabId].domain;
    let timeSpent = (now - activeTabs[tabId].startTime) / 1000;
    updateTrackedTime(domain, timeSpent);
    delete activeTabs[tabId];

    if (tabId === activeTabId) {
      activeTabId = null;
    }
  }
});



chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'interactionUpdate') {
    const { timestamp } = message;

    // Example: Store interaction time
    chrome.storage.sync.get('interactionTime', function(result) {
      let interactionTime = result.interactionTime || 0;
      interactionTime += timestamp - interactionTime; // Update interaction time
      chrome.storage.sync.set({ interactionTime: interactionTime }, function() {
        console.log('Interaction time updated:', interactionTime);
      });
    });
  }
});



setInterval(() => {
  if (activeTabId !== null && activeTabs[activeTabId]) {
    let now = Date.now();
    let domain = activeTabs[activeTabId].domain;
    let timeSpent = (now - activeTabs[activeTabId].startTime) / 1000;
    updateTrackedTime(domain, timeSpent);
    activeTabs[activeTabId].startTime = now; // Reset the start time
  }
}, updateInterval);


function sendNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Screen Time Tracker',
    message: message,
    priority: 2
  });
}

let startTime = Date.now();
let totalActiveTime = parseInt(localStorage.getItem('totalActiveTime')) || 0;

function sendNotification(message) {
  console.log(message); // Replace with actual notification logic
}

function checkScreenTime() {
  let now = Date.now();
  let activeTime = now - startTime + totalActiveTime;

  if (activeTime > 3600000) { // 1 hour in milliseconds
    sendNotification('You have been using the screen for an hour. Consider taking a break.');
    startTime = now; // reset the timer
    totalActiveTime = 0; // reset active time
    localStorage.setItem('totalActiveTime', totalActiveTime); // reset stored active time
  } else {
    localStorage.setItem('totalActiveTime', activeTime); // update stored active time
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    // Pause timer
    totalActiveTime += Date.now() - startTime;
    localStorage.setItem('totalActiveTime', totalActiveTime); // store accumulated time
  } else {
    // Resume timer
    startTime = Date.now();
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

setInterval(checkScreenTime, 60000); // Check every minute

