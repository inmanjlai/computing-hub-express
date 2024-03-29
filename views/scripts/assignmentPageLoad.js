document.addEventListener('DOMContentLoaded', async(e) => {
    const questionList = document.querySelector('#question-list');
    const firstQuestion = questionList.children[0];
    firstQuestion.classList.add('active')

    const question = JSON.parse(firstQuestion.getAttribute('data-question'))
    localStorage.setItem('currentQuestion', firstQuestion.getAttribute('data-question'));

    const userid = getCookie('userid');

    const assignment_id = question.assignment_id
    const question_id = question.question_id

    const firstQuestionsCodedoc = await(await fetch(`/assignment_code/${userid}/${assignment_id}/${question_id}`)).json()

    if( firstQuestionsCodedoc.codedoc.code == '') {
        editor.session.setValue(firstQuestionsCodedoc.question.description)
    } else {
        editor.session.setValue(firstQuestionsCodedoc.codedoc.code)
    }
})
