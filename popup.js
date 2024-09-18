const renderTabGroups = async () => {
    const tabGroup = await chrome.storage.local.get();
    const tabContainer = document.getElementById('tab-container');
    tabContainer.innerHTML = "";
    for (const groupKey in tabGroup) {
      const group = tabGroup[groupKey];
      const groupContainer = document.createElement("div");
      groupContainer.classList.add("group-container")
      const titleContainer = document.createElement("input");
      titleContainer.id = groupKey;
      titleContainer.value = group['title'];
      titleContainer.readOnly = true;
      titleContainer.classList.add("title-container")

      titleContainer.onclick = (e) => {
        e.target.classList.add("active");
        e.target.readOnly = false;
        e.target.select();
      }

      const updateGroupName = (e) => {
        e.target.classList.remove("active");
        e.target.readOnly = true;
        renameGroup(e.target.id, e.target.value);
      }

      titleContainer.onblur = updateGroupName;
      groupContainer.append(titleContainer);
      titleContainer.onkeydown = (e) => {
        if (e.key === 'Enter') {
          updateGroupName(e);
        }
      }

      const textContainer = document.createElement("p");
      textContainer.classList.add("tab-count");
      textContainer.innerText = `${group["tabs"].length} Tabs`;
      groupContainer.append(textContainer);

      const tabList = document.createElement('ul');
      group["tabs"]?.forEach(tab=>{
        const tabElement = document.createElement("li");
        tabElement.innerHTML = `<a class='tab-item' href='${tab.url}' target='_blank'><img src='${tab.favicon}' class='favicon'></img>: ${tab.title}</a>`;
        tabList.append(tabElement);
      });

      groupContainer.append(tabList);

      const openGroupButton = document.createElement('button');
      openGroupButton.innerText = "Open";
      openGroupButton.addEventListener('click', ()=>openGroup(groupKey));
      groupContainer.append(openGroupButton);

      const removeGroupButton = document.createElement('button');
      removeGroupButton.innerText = "Clear";
      removeGroupButton.id = groupKey;
      removeGroupButton.addEventListener('click', async ()=>{
        await chrome.storage.local.remove(groupKey, () => {
          renderTabGroups();
          alert('Cleared group');
        })
      });
      groupContainer.append(removeGroupButton);

      tabContainer.append(groupContainer);
    }
}

const openGroup = (groupName) => {
    chrome.storage.local.get(groupName, (tabGroup) => {
        chrome.windows.create({}, (window) => {
          tabGroup[groupName]['tabs'].forEach(tab => chrome.tabs.create({ url: tab.url, windowId: window.id }));
        });
    });
}

const renameGroup = (groupId, newName) => {
  chrome.storage.local.get(groupId, (tabGroup) => {
    tabGroup[groupId].title = newName;
    chrome.storage.local.set(tabGroup);
  });
}

document.getElementById('stash').addEventListener('click', async () => {
  try {
    const activeTabs = await chrome.tabs.query({ currentWindow: true });
    const tabList = [];
    activeTabs.forEach(tab=>{
      if(!tab.url.includes("chrome://")){
        tabList.push({
          title: tab.title,
          url: tab.url,
          favicon: tab.favIconUrl
        });
      }
    })
    const currentTime = new Date();
    const timeString = `${currentTime.getDay()}-${currentTime.getMonth()+1}-${currentTime.getFullYear()}, ${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}`;
    const groupId = Date.now();
    const tabGroup = {
      created_at: timeString,
      tabs: tabList,
      title: `Created at: ${timeString}`,
      id: groupId
    };

    await chrome.storage.local.set({ [groupId]: tabGroup });
    renderTabGroups();
    alert(`Stored ${activeTabs.length} tabs`);
  } catch (error) {
    console.log("error in stashing tabs", error);
    alert(error);
  }
});


document.getElementById('clear').addEventListener('click', async ()=>{
  try {
    const result = confirm("Are you sure you want to clear the entire stash.");
    if(result){
      chrome.storage.local.clear(()=>{
        renderTabGroups();
        alert('Cleared stash');
      });
    }
  } catch (error) {
    console.log('error in clearing stash', error);
  }
});

renderTabGroups();