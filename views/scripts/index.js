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
    const fileList = document.querySelectorAll('#file-list p');
    fileList.forEach((child) => {
        if (child.innerHTML == file.filename) child.classList.add('active')
        else child.classList.remove('active')
    })

    localStorage.setItem('currentFile', JSON.stringify(file))
    codePreview.innerText = file.code
}

async function updateAssignmentRepl(question) {
    const userid = getCookie('userid')

    const response = await (await fetch(`/assignment_code/${userid}/${question.assignment_id}/${question.question_id}`)).json();

    localStorage.setItem('currentQuestion', JSON.stringify(question))

    document.querySelector('#question.active').classList.remove('active')

    let selectedQuestion;
    const allQuestions = document.querySelectorAll('#question');
    allQuestions.forEach((child) => {
        let childsQuestion = JSON.parse(child.getAttribute('data-question'))
        if (childsQuestion.id == question.id) {
            selectedQuestion = child
        }
    })

    selectedQuestion.classList.add('active')

    if (response.codedoc.code == '') {
        editor.session.setValue(`# ${response.question.description}\n`)
    } else {
        editor.session.setValue(response.codedoc.code)
    }
}
