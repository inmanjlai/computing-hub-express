// GLOBAL SCRIPTING TO BE DONE HERE

function displayNotification (message, type) {

    const notification = document.querySelector('#notification')
    notification.innerHTML = message

    if (type == 'error') notification.classList.add('error')
    else notification.classList.add('alert')

    notification.classList.add('show')
        
    setTimeout(() => {
        notification.classList.remove('show')
        if (type == 'error') { 
            notification.classList.remove('alert')
            notification.classList.remove('error')
        }
        else { 
            notification.classList.remove('error')
            notification.classList.remove('alert')
        }
    }, 3500);
}

function updatePreview(file) {
    const codePreview = document.querySelector('#file-preview-code')

    // find the current active file and make it not active
    const currentActiveFile = document.querySelector('#file-list .active')
    currentActiveFile.classList.remove('active')

    // make the clicked on file active
    

    localStorage.setItem('currentFile', file)
    codePreview.innerText = file.code
}