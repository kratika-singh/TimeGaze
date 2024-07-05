let activeTabs = {};
let trackedTime = {};
let lastMouseMoveTime = Date.now();
let lastActiveTabId = null;

chrome.storage.sync.get('totalActiveTime', function (data) {
  let totalActiveTime = data.totalActiveTime || 0;
});

// Helper function to update tracked time for a given domain
function updateTrackedTime(domain, timeSpent) {
  let today = new Date().toISOString().slice(0, 10);
  chrome.storage.sync.get(['trackedTime'], (result) => {
    trackedTime = result.trackedTime || {};

    if (!trackedTime[today]) {
      trackedTime[today] = {};
    }

    if (!trackedTime[today][domain]) {
      trackedTime[today][domain] = 0;
    }

    trackedTime[today][domain] += timeSpent;
    chrome.storage.sync.set({ trackedTime: trackedTime });
  });
}

// Handle tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  let now = Date.now();

  if (lastActiveTabId !== null && activeTabs[lastActiveTabId]) {
    let prevDomain = activeTabs[lastActiveTabId].domain;
    let timeSpent = (now - activeTabs[lastActiveTabId].startTime) / 1000;
    updateTrackedTime(prevDomain, timeSpent);
  }

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      let url = new URL(tab.url);
      let domain = url.hostname;
      activeTabs[activeInfo.tabId] = { domain: domain, startTime: now };
      lastActiveTabId = activeInfo.tabId;
    }
  });
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  let now = Date.now();

  if (lastActiveTabId !== null && activeTabs[lastActiveTabId]) {
    let prevDomain = activeTabs[lastActiveTabId].domain;
    let timeSpent = (now - activeTabs[lastActiveTabId].startTime) / 1000;
    updateTrackedTime(prevDomain, timeSpent);
  }

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    lastActiveTabId = null;
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        let tab = tabs[0];
        let url = new URL(tab.url);
        let domain = url.hostname;
        activeTabs[tab.id] = { domain: domain, startTime: now };
        lastActiveTabId = tab.id;
      }
    });
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  let now = Date.now();

  if (activeTabs[tabId]) {
    let domain = activeTabs[tabId].domain;
    let timeSpent = (now - activeTabs[tabId].startTime) / 1000;
    updateTrackedTime(domain, timeSpent);
    delete activeTabs[tabId];
  }
});

// Handle user interaction messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'interactionUpdate') {
    lastMouseMoveTime = Date.now();
    chrome.storage.sync.get('totalActiveTime', function (data) {
      let totalActiveTime = data.totalActiveTime || 0;
      totalActiveTime += message.timestamp - lastMouseMoveTime;
      chrome.storage.sync.set({ totalActiveTime: totalActiveTime });
    });
  }
});

// Send notification
function sendNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Screen Time Tracker',
    message: message,
    priority: 2
  });
}

// Check for mouse inactivity
function checkMouseInactivity() {
  let now = Date.now();
  if (now - lastMouseMoveTime > 3600000) { // 1 hour
    sendNotification('You have been active for an hour. Consider taking a break.');
    lastMouseMoveTime = now; // reset the timer
  }
}

setInterval(checkMouseInactivity, 60000); // check every minute
