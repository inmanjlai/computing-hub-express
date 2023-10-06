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

function openSubmitDialog() {
    const dialog = document.querySelector('#submit-assignment');
    dialog.showModal();
}

function closeSubmitDialog() {
    const dialog = document.querySelector('#submit-assignment');
    dialog.close();
}

function openCreateAssignmentDialog() {
    const dialog = document.querySelector('#create-assignment');

    dialog.showModal();
}

function openCreateQuestionDialog() {
    const dialog = document.querySelector('#create-question');

    dialog.showModal();
}

function openDeleteAssignmentModal(id) {
    const dialog = document.querySelector('#delete-assignment');
    const hiddenInput = document.querySelector("#delete-assignment input")

    hiddenInput.value = id

    dialog.showModal();
}

function openDeleteQuestionModal(id) {
    const dialog = document.querySelector('#delete-question');
    const hiddenInput = document.querySelector("#delete-question input")

    hiddenInput.value = id

    dialog.showModal();
}


async function openViewSubmissionModal(data) {
    const dialog = document.querySelector('#view-submission');
    dialog.showModal()

    const output = document.querySelector('#output');
    output.innerHTML = ''

    // get all questions for assignment_id
    const questions = await (await fetch(`/questions/${data.assignment_id}`)).json()

    // populate the list of submision questions with questions from the assignment
    const listOfQuestions = document.querySelector('#list-of-submission-questions')

    listOfQuestions.innerHTML = ''

    for(let question of questions) {
        let p = document.createElement('p')
        p.innerHTML = question.questions.title
        listOfQuestions.append(p)
    }

    // set the first quesion in the list of questions to active
    listOfQuestions.children[0].classList.add('active')

    const submissionQuestions = document.querySelectorAll('#list-of-submission-questions p')
    submissionQuestions.forEach((question) => {
        question.addEventListener('click', (e) => {

            // set the current question to active class and remove from all others
            submissionQuestions.forEach((q) => {
                q.classList.remove('active')
            })

            question.classList.add('active')

            // find the question in questions[] where the question.title == question.value
            let currentQuestion;
            for(let ele of questions) {
                if (ele.questions.title == question.innerHTML) currentQuestion = ele
            }

            code.innerHTML = currentQuestion.codedoc.code
            output.innerHTML = ''
        })
    })

    // set the first pre value to the code related to that question
    const codePre = document.querySelector('#code')
    code.innerHTML = questions[0].codedoc.code
}

function outfAdmin(text) {
    var mypre = document.getElementById("output");
    mypre.innerHTML = mypre.innerHTML + text;
}

function builtinReadAdmin(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

function sInputAdmin(prompt){
    let output = document.querySelector('#output');
    output.innerText += `${prompt} `;

    return new Promise((resolve, reject) => {
        let input = document.querySelector('#input')
        input.value = ""

        const handleInput = (e) => {
            if (e.key === "Enter") {
                e.preventDefault()
                var inputLines = document.querySelector("#input").value
                output.innerText += `${input.value}\n`
                resolve(inputLines);
                input.removeEventListener('keydown', handleInput)
                input.value = ""
                }
        }
        input.addEventListener('keydown', handleInput)

    });
}

function runitAdmin() {
    var prog = document.querySelector('#code').innerHTML;
    var mypre = document.getElementById("output");
    mypre.innerHTML = '';

    Sk.pre = "output";
    if (prog.includes("turtle"))
    {
        // Sk.configure({output:outfAdmin, read:builtinReadAdmin});
        Sk.configure({output:outfAdmin, read:builtinReadAdmin, inputfun:sInputAdmin, inputfunTakesPrompt: true});
        //(Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'system-output';
        (Sk.TurtleGraphics || (Sk.TurtleGraphics = {'width':1000, 'target':'output'}));//.target = 'system-output';
        var myPromise = Sk.misceval.asyncToPromise(function() {
            return Sk.importMainWithBody("<stdin>", false, prog, true);
        });
        myPromise.then(function (mod) {
            console.log('success');
        },
            function (err) {
                console.log(err.toString());
                mypre.innerHTML = err.toString()
            });
    }

    else
    {
        // Sk.configure({ output: outfAdmin, read: builtinReadAdmin });
        Sk.configure({output:outfAdmin, read:builtinReadAdmin, inputfun:sInputAdmin, inputfunTakesPrompt: true});
        var myPromise = Sk.misceval.asyncToPromise(function () {
            return Sk.importMainWithBody("<stdin>", false, prog, true);
        });
        myPromise.then(function (mod) {
            console.log('success');
        },
            function (err) {
                mypre.innerHTML = err.toString()
            });
    }
}

function closeSubmissionModal() {
    const dialog = document.querySelector('#view-submission');
    dialog.close()
}
