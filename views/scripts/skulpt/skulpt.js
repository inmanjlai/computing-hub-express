function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function outf(text) {
    var mypre = document.getElementById("output");
    mypre.innerHTML = mypre.innerHTML + text;
}

function builtinRead(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

function sInput(prompt){
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

const events = [];
generateEvent("start",true);

async function generateEvent(type, code) {
    // log all the  events in the database
    // clear out the events.
    logevent();

    const userid = getCookie('userid');
    const prog = editor.getValue();

    const timestamp = Date.now();

    const evt = {"code":prog,"timestamp":timestamp};

    // create data with event and user id
    const data = {
        "whichevent": type,
        "userid": userid,
        "eventtype": JSON.stringify(evt)
    };

    // Make a request to server to save this event in the db
        // this endpoint can be found in server.js
    await fetch('/events', {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(data)
    });
}

async function logevent() {
    var userid = getCookie('userid');
    // process all events and clear our the array
    while(events.length > 0) {
        // get each event
        let evt = events.shift();

        // create data with event and user id
        const data = {
            "eventtype": JSON.stringify(evt),
            "userid": userid,
            "whichevent": "key"
        };

        await fetch('/events', {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }
}

editor.getSession().on("change",function(a,e) {
    //debugger;

    e.timestamp = Date.now();;

    events.push(e);
    if(events.length > 10) logevent();

});


function runit() {
    var prog = editor.getValue();
    var mypre = document.getElementById("output");
    mypre.innerHTML = '';

    Sk.pre = "output";
    if (prog.includes("turtle"))
    {
        // Sk.configure({output:outf, read:builtinRead});
        Sk.configure({output:outf, read:builtinRead, inputfun:sInput, inputfunTakesPrompt: true});
        //(Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'system-output';
        (Sk.TurtleGraphics || (Sk.TurtleGraphics = {'width':1000, 'target':'output'}));//.target = 'system-output';
        var myPromise = Sk.misceval.asyncToPromise(function() {
            return Sk.importMainWithBody("<stdin>", false, prog, true);
        });
    }

    else
    {
        // Sk.configure({ output: outf, read: builtinRead });
        Sk.configure({output:outf, read:builtinRead, inputfun:sInput, inputfunTakesPrompt: true});
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
    generateEvent("execute",true)
}

async function save()
{
    const file = document.getElementById('filename').value;
    const code = editor.getValue();
    const userid = getCookie('userid');

    if (file == '') {
        displayNotification('Please enter a filename before saving', 'error')
    } else {
        const data = {
            "filename":file,
            "code": code,
            "userid": userid,
            "user": userid
        };

        let response = await fetch('/codedocs', {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(data)
        });

        let responseJson = await response.json();

        // replace files under #file-list
        const fileList = document.querySelector('#file-list');
        fileList.innerHTML = ''

        responseJson.files.forEach((file) => {

            let p = document.createElement("p");
            p.innerHTML = file.filename
            p.addEventListener('click', (e) => {
                updatePreview(file);
            })

            fileList.append(p)

        })

        localStorage.setItem('currentFile', JSON.stringify(responseJson.savedFile))
        const codePreview = document.querySelector('#file-preview-code')

        codePreview.innerHTML = responseJson.savedFile.code

        displayNotification(responseJson.message, 'alert')
    }

}

async function loadModal() {
    const dialog = document.querySelector('#load-file');
    const firstFilename = document.querySelector('#file-list p:first-child')
    const fileList = document.querySelectorAll('#file-list p');

    let alreadyActiveFile = false

    fileList.forEach((child) => {
        if (child.classList.contains('active')) alreadyActiveFile = true;
    })

    if (!alreadyActiveFile) {
        fileList.forEach((child) => {
            child.classList.remove('active')
        })

        firstFilename.classList.add('active')
    }

    dialog.showModal()
}

function closeLoadModal() {
    const dialog = document.querySelector('#load-file');

    dialog.close()
}

async function loadFile() {
    const currentFile = localStorage.getItem('currentFile')

    const filenameInput = document.querySelector('#filename');

    filenameInput.value = JSON.parse(currentFile).filename
    editor.session.setValue(JSON.parse(currentFile).code)

    const dialog = document.querySelector('#load-file');
    dialog.close()
}

async function saveQuestionForAssignment() {
    const userid = getCookie('userid');
    const code = editor.session.getValue();

    const currentQuestion = JSON.parse(localStorage.getItem('currentQuestion'))

    const data = {
        userid,
        question_id: currentQuestion.question_id,
        assignment_id: currentQuestion.assignment_id,
        code
    }

    let response = await (await fetch('/assignments', {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
    })).json()

    displayNotification(response.message, 'alert')
}
