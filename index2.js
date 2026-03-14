// =============================================================================
// Base classes — identical to index.js
// =============================================================================

class GameInstance {
    constructor(config) {
        this.Q = config.Q;
        this.scenes = config.scenes;
        this.startScene = config.startScene || 'intro';
        this.currentScene = null;
        this.score = 0;
        this.telemedicineCount = 0;
        this.timerInterval = null;
        this.breakTimerInterval = null;
        this.startTime = null;
        this.onEnd = config.onEnd || null;
    }

    startTimer() {
        let startTime = Date.now();
        this.timerInterval = setInterval(() => {
            let elapsedTime = Date.now() - startTime;
            let seconds = Math.floor(elapsedTime / 1000);
            let minutes = Math.floor(seconds / 60);
            seconds = seconds % 60;
            document.getElementById('timer').textContent = 'Time: ' +
                (minutes < 10 ? '0' : '') + minutes + ':' +
                (seconds < 10 ? '0' : '') + seconds;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    startBreakTimer(duration, callback) {
        clearInterval(this.breakTimerInterval);
        let timer = duration;
        this.breakTimerInterval = setInterval(() => {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;
            document.getElementById('break-timer').textContent = "Break: " + minutes + ":" + seconds;
            if (--timer < 0) {
                clearInterval(this.breakTimerInterval);
                callback();
            }
        }, 1000);
    }

    stopBreakTimer() {
        clearInterval(this.breakTimerInterval);
        document.getElementById('break-timer').textContent = '';
    }

    handleActionItem(item) {
        switch (item.type) {
            case 'slider':
                this.setupSlider(item.correctValue, item.nextScene, item.hint);
                break;
            case 'breakTimer':
                this.startBreakTimer(item.duration, () => {
                    this.displayScene(item.expireScene);
                });
                break;
            case 'stopBreakTimer':
                this.stopBreakTimer();
                break;
            case 'incrementTelemedicine':
                this.telemedicineCount += 1;
                break;
            case 'endGame':
                this.stopTimer();
                this.storeGameData();
                document.getElementById('final-score').textContent = 'Final Score: ' + this.score;
                document.getElementById('telemedicine-count').textContent = 'Telemedicine Sessions: ' + this.telemedicineCount;
                document.getElementById('final-score').classList.remove('hidden');
                document.getElementById('telemedicine-count').classList.remove('hidden');
                let gameOverButton = document.createElement('button');
                gameOverButton.id = 'finish-game-btn';
                gameOverButton.textContent = 'Finish Game';
                gameOverButton.onclick = () => {
                    document.getElementById('game-view').classList.add('hidden');
                    document.getElementById('game-over').classList.remove('hidden');
                    this.Q.enableNextButton();
                };
                document.getElementById('scene-story').appendChild(gameOverButton);
                if (this.onEnd) this.onEnd(this.getStats());
                break;
        }
    }

    setupSlider(correctValue, nextSceneKey, questionPrompt) {
        document.getElementById('slider-container').classList.remove('hidden');

        let slider = document.getElementById('myRange');
        let output = document.getElementById('value');
        slider.min = 0;
        slider.max = 100;
        slider.value = 0;
        output.textContent = slider.value;

        slider.oninput = function() {
            output.textContent = this.value;
            let percentage = ((this.value - this.min) / (this.max - this.min)) * 100;
            this.style.background = `linear-gradient(90deg, #14284b ${percentage}%, #BCBCBC ${percentage}%)`;
        };

        let container = document.getElementById('choices');
        container.innerHTML = '';

        let submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit Answer';
        submitBtn.onclick = () => {
            if (parseInt(slider.value) === correctValue) {
                document.getElementById('scene-story').textContent = "Correct! The correct value is " + correctValue + ".";
                if (!submitBtn.alreadyCorrect) {
                    this.score++;
                    submitBtn.alreadyCorrect = true;
                    document.getElementById('score').textContent = 'Score: ' + this.score;
                }
                this.onSliderSubmit(true);
                document.getElementById('slider-container').classList.add('hidden');
                submitBtn.style.display = 'none';
                let nextButton = document.createElement('button');
                nextButton.textContent = 'Continue';
                nextButton.onclick = () => this.displayScene(nextSceneKey);
                container.appendChild(nextButton);
            } else {
                document.getElementById('scene-story').textContent = "Incorrect. Try again. " + questionPrompt;
                submitBtn.alreadyCorrect = false;
                this.onSliderSubmit(false);
            }
        };
        container.appendChild(submitBtn);
    }

    displayScene(sceneKey) {
        this.currentScene = sceneKey;
        let scene = this.scenes[sceneKey];

        document.getElementById('scene-title').textContent = scene.title;
        document.getElementById('scene-story').textContent = scene.story;
        document.getElementById('disease-chart').innerHTML = scene.chart || '';

        let choicesContainer = document.getElementById('choices');
        choicesContainer.innerHTML = '';

        if (scene.actionItems) {
            scene.actionItems.forEach(item => this.handleActionItem(item));
        }

        if (scene.choices) {
            scene.choices.forEach(choice => {
                let btn = document.createElement('button');
                btn.textContent = choice.text;
                btn.onclick = () => {
                    if (sceneKey.includes('Correct')) {
                        this.score += 1;
                        document.getElementById('score').textContent = 'Score: ' + this.score;
                    }
                    this.onChoiceMade(sceneKey, choice.next);
                    this.displayScene(choice.next);
                };
                choicesContainer.appendChild(btn);
            });
        }

        this.showGameView();
    }

    onChoiceMade(_fromKey, _toKey) {}  // hook — override in subclasses
    onSliderSubmit(_correct) {}        // hook — override in subclasses

    showGameView() {
        document.getElementById('game-view').classList.remove('hidden');
        document.getElementById('task-grid').classList.add('hidden');
    }

    storeGameData() {
        Qualtrics.SurveyEngine.setEmbeddedData('gameDuration', document.getElementById('timer').textContent);
        Qualtrics.SurveyEngine.setEmbeddedData('finalScore', this.score);
        Qualtrics.SurveyEngine.setEmbeddedData('telemedicineSessions', this.telemedicineCount);
    }

    getStats() {
        const duration = this.startTime ? Date.now() - this.startTime : 0;
        return { score: this.score, telemedicineCount: this.telemedicineCount, duration: duration };
    }

    start() {
        this.score = 0;
        this.telemedicineCount = 0;
        this.startTime = Date.now();
        document.getElementById('score').textContent = 'Score: 0';
        this.displayScene(this.startScene);
        this.startTimer();
    }
}

class TaskType {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.scenesUrl = config.scenesUrl || null;
        this.scenesData = config.scenesData || null;
        this.actionItemTypes = new Set();
    }

    async load() {
        if (!this.scenesData) {
            const response = await fetch(this.scenesUrl);
            this.scenesData = await response.json();
        }
        for (const scene of Object.values(this.scenesData.scenes)) {
            if (scene.choices && scene.choices.length > 0) this.actionItemTypes.add('choices');
            if (scene.actionItems) scene.actionItems.forEach(item => this.actionItemTypes.add(item.type));
        }
    }
}

class PerformanceTracker {
    constructor() {
        this.sessions = [];
    }

    record(taskId, stats) {
        this.sessions.push({
            taskId: taskId,
            score: stats.score,
            telemedicineCount: stats.telemedicineCount,
            duration: stats.duration,
            timestamp: Date.now()
        });
    }

    getHistory(taskId = null) {
        return taskId ? this.sessions.filter(s => s.taskId === taskId) : this.sessions.slice();
    }
}

class TaskManager {
    constructor(tracker) {
        this.tasks = {};
        this.tracker = tracker;
        this.activeGame = null;
        this.activeTaskId = null;
    }

    register(taskType) {
        this.tasks[taskType.id] = taskType;
    }

    similarityScore(taskIdA, taskIdB) {
        const a = this.tasks[taskIdA].actionItemTypes;
        const b = this.tasks[taskIdB].actionItemTypes;
        const intersection = Array.from(a).filter(t => b.has(t)).length;
        const union = new Set(Array.from(a).concat(Array.from(b))).size;
        return union === 0 ? 0 : intersection / union;
    }

    async switchTo(taskId, Q) {
        const task = this.tasks[taskId];
        if (!task) throw new Error('Unknown task: ' + taskId);
        if (!task.scenesData) await task.load();

        if (this.activeGame) {
            this.tracker.record(this.activeTaskId, this.activeGame.getStats());
        }

        this.activeTaskId = taskId;
        this.activeGame = new GameInstance({
            Q: Q,
            startScene: task.scenesData.startScene,
            scenes: task.scenesData.scenes,
            onEnd: (stats) => this.tracker.record(taskId, stats)
        });
        return this.activeGame;
    }
}


// =============================================================================
// Extensions — Main Job / Side Job mechanic
// =============================================================================

class SideJob {
    constructor(config) {
        this.name = config.name;
        this.actionItem = config.actionItem;   // action item type shared with the main job
        this.reward = config.reward;
        this.similarity = config.similarity || 0; // similarity score vs main job (0–1)
        this.startScene = config.startScene || null;        // fixed start scene key
        this.startSceneMap = config.startSceneMap || null;  // map returnScene → startScene
    }
}

class MainJobGameInstance extends GameInstance {
    constructor(config) {
        super(config);
        this.sideJobs = config.sideJobs || [];
        this.sideJobRewardsTotal = 0;
        this.continuousWorkTime = 0;
        this.continuousWorkInterval = null;
        this.onBreak = false;
        this.onSideJob = false;
        this.pendingReturnScene = null;
        this.activeSideJob = null;
        this.totalCorrect = 0;
        this.totalAttempts = 0;
        this.mainJobRewardRate = 10;
        this.mainJobRewardsTotal = 0;
        this.telemedicineReward = 7;
    }

    get totalReward() {
        return this.mainJobRewardsTotal + this.sideJobRewardsTotal;
    }

    startContinuousWorkTimer() {
        this.continuousWorkInterval = setInterval(() => {
            if (!this.onBreak && !this.onSideJob) {
                this.continuousWorkTime++;
                this.updateContinuousWorkDisplay();
            }
        }, 1000);
    }

    resetContinuousWorkTime() {
        this.continuousWorkTime = 0;
        this.updateContinuousWorkDisplay();
    }

    updateContinuousWorkDisplay() {
        const el = document.getElementById('continuous-work-time');
        if (!el) return;
        const minutes = Math.floor(this.continuousWorkTime / 60);
        const seconds = this.continuousWorkTime % 60;
        el.textContent = 'Continuous Work: ' +
            (minutes < 10 ? '0' : '') + minutes + ':' +
            (seconds < 10 ? '0' : '') + seconds;
    }

    get accuracy() {
        return this.totalAttempts === 0 ? 0 : Math.round((this.totalCorrect / this.totalAttempts) * 100);
    }

    updateTotalRewardDisplay() {
        const el = document.getElementById('total-reward');
        if (el) el.textContent = 'Total Reward: ' + this.totalReward;
    }

    updateAccuracyDisplay() {
        const el = document.getElementById('accuracy');
        if (el) el.textContent = 'Accuracy: ' + this.accuracy + '%';
    }

    onChoiceMade(_fromKey, toKey) {
        if (toKey.includes('Correct') || toKey.includes('Wrong')) {
            this.totalAttempts++;
            if (toKey.includes('Correct')) {
                this.totalCorrect++;
                if (this.onBreak) {
                    this.sideJobRewardsTotal += this.telemedicineReward;
                } else {
                    this.mainJobRewardsTotal += this.mainJobRewardRate;
                }
                this.updateTotalRewardDisplay();
            }
            this.updateAccuracyDisplay();
        }
    }

    onSliderSubmit(correct) {
        this.totalAttempts++;
        if (correct) {
            this.totalCorrect++;
            if (this.onSideJob && this.activeSideJob) {
                this.sideJobRewardsTotal += this.activeSideJob.reward || 0;
            } else {
                this.mainJobRewardsTotal += this.mainJobRewardRate;
            }
            this.updateTotalRewardDisplay();
        }
        this.updateAccuracyDisplay();
    }

    // Override: handle __return__ sentinel, manage onBreak/onSideJob state,
    // and inject the break choice after the scene renders
    displayScene(sceneKey) {
        if (sceneKey === '__return__') {
            sceneKey = this.pendingReturnScene;
            this.onSideJob = false;
            this.activeSideJob = null;
        }

        const scene = this.scenes[sceneKey];
        const breakItem = scene.actionItems && scene.actionItems.find(item => item.type === 'breakTimer');

        if (breakItem && !this.onBreak) {
            this.onBreak = true;
            this.resetContinuousWorkTime();
        } else if (!breakItem && this.onBreak && !this.onSideJob) {
            this.onBreak = false;
        }

        super.displayScene(sceneKey);
        this.updateTotalRewardDisplay();

        if (breakItem) {
            this.showBreakChoice(breakItem);
        }
    }

    // Appends side job buttons (sorted by similarity desc) and a Stay on Break button
    showBreakChoice(breakItem) {
        const container = document.getElementById('choices');

        const sorted = this.sideJobs.slice().sort((a, b) => b.similarity - a.similarity);
        sorted.forEach(job => {
            const btn = document.createElement('button');
            btn.textContent = job.name +
                ' — Reward: ' + job.reward +
                ' | Trains: ' + job.actionItem;
            btn.onclick = () => {
                this.resetContinuousWorkTime();
                container.innerHTML = '';
                this.runSideJobAction(job, breakItem.expireScene);
            };
            container.appendChild(btn);
        });

        const stayBtn = document.createElement('button');
        stayBtn.textContent = 'Stay on Break';
        stayBtn.onclick = () => {
            this.resetContinuousWorkTime();
            container.innerHTML = '';
        };
        container.appendChild(stayBtn);
    }

    // Navigates into the side job's scene flow; '__return__' in those scenes maps back to returnScene
    runSideJobAction(job, returnScene) {
        this.stopBreakTimer();
        this.pendingReturnScene = returnScene;
        this.onSideJob = true;
        this.activeSideJob = job;
        const startScene = job.startScene ||
            (job.startSceneMap && job.startSceneMap[returnScene]);
        this.displayScene(startScene);
    }

    // Also stop the continuousWorkTimer when the main timer stops
    stopTimer() {
        super.stopTimer();
        clearInterval(this.continuousWorkInterval);
    }

    storeGameData() {
        super.storeGameData();
        Qualtrics.SurveyEngine.setEmbeddedData('totalReward', this.totalReward);
        Qualtrics.SurveyEngine.setEmbeddedData('continuousWorkTime', this.continuousWorkTime);
        Qualtrics.SurveyEngine.setEmbeddedData('accuracy', this.accuracy);
    }

    getStats() {
        return {
            score: this.score,
            telemedicineCount: this.telemedicineCount,
            duration: this.startTime ? Date.now() - this.startTime : 0,
            totalReward: this.totalReward,
            continuousWorkTime: this.continuousWorkTime,
            accuracy: this.accuracy
        };
    }

    start() {
        this.mainJobRewardsTotal = 0;
        this.sideJobRewardsTotal = 0;
        this.continuousWorkTime = 0;
        this.onBreak = false;
        this.onSideJob = false;
        this.activeSideJob = null;
        this.totalCorrect = 0;
        this.totalAttempts = 0;

        // Inject persistent display elements into the sidebar, matching score/timer conventions
        const sidebar = document.getElementById('progress-sidebar');
        if (sidebar && !document.getElementById('total-reward')) {
            const rewardEl = document.createElement('p');
            rewardEl.id = 'total-reward';
            rewardEl.textContent = 'Total Reward: 0';
            sidebar.appendChild(rewardEl);
        }
        if (sidebar && !document.getElementById('continuous-work-time')) {
            const workEl = document.createElement('p');
            workEl.id = 'continuous-work-time';
            workEl.textContent = 'Continuous Work: 00:00';
            sidebar.appendChild(workEl);
        }
        if (sidebar && !document.getElementById('accuracy')) {
            const accEl = document.createElement('p');
            accEl.id = 'accuracy';
            accEl.textContent = 'Accuracy: 0%';
            sidebar.appendChild(accEl);
        }

        super.start();
        this.startContinuousWorkTimer();
    }
}

// Subclasses TaskManager to produce MainJobGameInstance instead of GameInstance
class MainJobTaskManager extends TaskManager {
    constructor(tracker, sideJobs) {
        super(tracker);
        this.sideJobs = sideJobs;
    }

    async switchTo(taskId, Q) {
        const task = this.tasks[taskId];
        if (!task) throw new Error('Unknown task: ' + taskId);
        if (!task.scenesData) await task.load();

        if (this.activeGame) {
            this.tracker.record(this.activeTaskId, this.activeGame.getStats());
        }

        this.activeTaskId = taskId;
        this.activeGame = new MainJobGameInstance({
            Q: Q,
            startScene: task.scenesData.startScene,
            scenes: task.scenesData.scenes,
            onEnd: (stats) => this.tracker.record(taskId, stats),
            sideJobs: this.sideJobs
        });
        return this.activeGame;
    }
}


// =============================================================================
// Qualtrics entry point
// =============================================================================

Qualtrics.SurveyEngine.addOnload(function() {
    let Q = this;
    Q.disableNextButton();

    const telemedicineJob = new SideJob({
        name: 'Telemedicine',
        actionItem: 'choices',
        reward: 7,
        similarity: 0.8,
        startSceneMap: { 'breakEnd': 'telemedicine1', 'breakEnd2': 'telemedicine2' }
    });
    const medSchoolJob = new SideJob({ name: 'Medical School', actionItem: 'knowledge', reward: 0, similarity: 0.5, startScene: 'medSchoolStart' });
    const uberJob = new SideJob({ name: 'Uber', actionItem: 'slider', reward: 5, similarity: 0.3, startScene: 'uberStart' });

    const tracker = new PerformanceTracker();
    const taskManager = new MainJobTaskManager(tracker, [telemedicineJob, medSchoolJob, uberJob]);

    taskManager.register(new TaskType({ id: 'telemedicine', name: 'Telemedicine', scenesData: TELEMEDICINE_SCENES }));

    taskManager.switchTo('telemedicine', Q)
        .then(() => { taskManager.activeGame.start(); })
        .catch(err => { console.error('Failed to load task:', err); });

    function hideEl(element) {
        element.hide();
    }

    var nb = $('NextButton');
    const regex = /^{"T":.*?"A":.*?]}$/;
    hideEl.defer(nb);
    $(this.questionId).down('.InputText').on('keyup', function() {
        if (taskManager.activeGame && taskManager.activeGame.currentScene === 'endScene') {
            return;
        }
        if (regex.test(this.value)) nb.show();
        else nb.hide();
    });
});


// =============================================================================
// Scene Data
// =============================================================================

const TELEMEDICINE_SCENES = {
    startScene: 'intro',
    scenes: {
        intro: {
            title: "Introduction",
            story: "Good morning. Let's begin your shift.",
            chart: `<table>
                <tr><th>Disease</th><th>Symptoms</th></tr>
                <tr><td>Pneumonia</td><td>Coughing, Fever, Chills, Shortness of breath</td></tr>
                <tr><td>Stroke</td><td>Weakness in one arm, Slurred speech</td></tr>
                <tr><td>Heart Attack</td><td>Chest pain, Shortness of breath</td></tr>
                <tr><td>Anxiety Attack</td><td>Rapid heart rate, Sweating, Trembling</td></tr>
            </table>`,
            choices: [{ text: "Yes, I'm ready!", next: 'patient1' }]
        },
        patient1: {
            title: "Patient 1",
            story: "John has a fever with coughing and shortness of breath. What is your diagnosis?",
            choices: [
                { text: "Stroke", next: 'patient1Wrong' },
                { text: "Pneumonia", next: 'patient1Correct' }
            ]
        },
        patient1Correct: {
            title: "Correct",
            story: "Symptoms of pneumonia include coughing, fever, chills, shortness of breath. What would you like to do next?",
            choices: [{ text: "Next patient", next: 'patient2' }]
        },
        patient1Wrong: {
            title: "Incorrect",
            story: "John does not exhibit symptoms of a stroke.",
            choices: [{ text: "Next patient", next: 'patient2' }]
        },
        patient2: {
            title: "Patient 2",
            story: "Jane has weakness in one of her arms and is slurring her words. What is your diagnosis?",
            choices: [
                { text: "Stroke", next: 'patient2Correct' },
                { text: "Allergic Reaction", next: 'patient2Wrong' }
            ]
        },
        patient2Correct: {
            title: "Correct",
            story: "Jane exhibits symptoms of a stroke. What would you like to do next?",
            choices: [{ text: "Next patient", next: 'patient3' }]
        },
        patient2Wrong: {
            title: "Incorrect",
            story: "Jane's symptoms do not suggest an allergic reaction.",
            choices: [{ text: "Next patient", next: 'patient3' }]
        },
        patient3: {
            title: "Patient 3",
            story: "Robert complains of chest pain and shortness of breath. Calculate the correct dose based on weight 80kg. Each kg requires 0.5 units.",
            actionItems: [
                { type: 'slider', correctValue: 40, nextScene: 'startBreak', hint: 'Remember to calculate the dose by multiplying the weight (80kg) by the dosage per kg (0.5 units).' }
            ]
        },
        startBreak: {
            title: "Break #1",
            story: "You may choose any side job to work on, or enjoy a break. Side jobs are listed by similarity to your main job.",
            actionItems: [{ type: 'breakTimer', duration: 20, expireScene: 'breakEnd' }]
        },
        breakRoom: {
            title: "Breakroom",
            story: "You've finished available telemedicine visits. Sit tight and enjoy yourself until your break is over!"
        },
        breakEnd: {
            title: "Break Over",
            story: "Your break is over. Time to get back to work!",
            actionItems: [{ type: 'stopBreakTimer' }],
            choices: [{ text: "Start Next Shift", next: 'patient4' }]
        },
        telemedicine1: {
            title: "Telemedicine Session 1",
            story: "Welcome to your first telemedicine session. Please log on to see your first patient.",
            choices: [{ text: "Log in", next: 'telePatient1_1' }]
        },
        telePatient1_1: {
            title: "Telemedicine Patient 1",
            story: "Zoe has had a headache for over an hour as well as sensitivity to light. What is your diagnosis?",
            choices: [
                { text: "Flu", next: 'telePatient1_1Wrong' },
                { text: "Migraine", next: 'telePatient1_1Correct' }
            ]
        },
        telePatient1_1Correct: {
            title: "Correct",
            story: "Zoe's symptoms are indicative of a migraine. Proceed to the next patient.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine patient", next: 'telePatient1_2' }]
        },
        telePatient1_1Wrong: {
            title: "Incorrect",
            story: "Zoe's symptoms do not suggest the flu.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine Patient", next: 'telePatient1_2' }]
        },
        telePatient1_2: {
            title: "Telemedicine Patient 2",
            story: "Jaime has a fever, cough, sore throat, and stuffy nose. What is your diagnosis?",
            choices: [
                { text: "Flu", next: 'telePatient1_2Correct' },
                { text: "Migraine", next: 'telePatient1_2Wrong' }
            ]
        },
        telePatient1_2Correct: {
            title: "Correct",
            story: "Jaime's symptoms suggest the flu.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        telePatient1_2Wrong: {
            title: "Incorrect",
            story: "Jaime's symptoms are not indicative of a migraine.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        patient4: {
            title: "Patient 4",
            story: "Ishan complains of chest pain and shortness of breath. What is your diagnosis?",
            choices: [
                { text: "Heart Attack", next: 'patient4Correct' },
                { text: "Anxiety Attack", next: 'patient4Wrong' }
            ]
        },
        patient4Correct: {
            title: "Correct",
            story: "Ishan is experiencing symptoms of a heart attack. What would you like to do next?",
            choices: [{ text: "Go on Break", next: 'startBreak2' }]
        },
        patient4Wrong: {
            title: "Incorrect",
            story: "Ishan's symptoms are indicative of a medical emergency.",
            choices: [{ text: "Go on Break", next: 'startBreak2' }]
        },
        startBreak2: {
            title: "Break #2",
            story: "You may choose any side job to work on, or enjoy a break. Side jobs are listed by similarity to your main job.",
            actionItems: [{ type: 'breakTimer', duration: 20, expireScene: 'breakEnd2' }]
        },
        breakEnd2z: {
            title: "Break Over",
            story: "Your break is over. Time to get back to work!",
            actionItems: [{ type: 'stopBreakTimer' }],
            choices: [{ text: "Start Next Shift", next: 'patient5' }]
        },
        telemedicine2: {
            title: "Telemedicine Session 2",
            story: "Welcome to your second telemedicine session. Please log on to see your next patients.",
            choices: [{ text: "Log in", next: 'telePatient2_1' }]
        },
        telePatient2_1: {
            title: "Telemedicine Patient 2.1",
            story: "Sam has been experiencing recurring headaches and sensitivity to light. What is your diagnosis?",
            choices: [
                { text: "Flu", next: 'telePatient2_1Wrong' },
                { text: "Migraine", next: 'telePatient2_1Correct' }
            ]
        },
        telePatient2_1Correct: {
            title: "Correct",
            story: "Sam's symptoms are indicative of a migraine. Proceed to the next patient.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine patient", next: 'telePatient2_2' }]
        },
        telePatient2_1Wrong: {
            title: "Incorrect",
            story: "Sam's symptoms do not suggest the flu.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine Patient", next: 'telePatient2_2' }]
        },
        telePatient2_2: {
            title: "Telemedicine Patient 2.2",
            story: "Linda has a fever, cough, sore throat, and a stuffy nose. What is your diagnosis?",
            choices: [
                { text: "Flu", next: 'telePatient2_2Correct' },
                { text: "Migraine", next: 'telePatient2_2Wrong' }
            ]
        },
        telePatient2_2Correct: {
            title: "Correct",
            story: "Linda's symptoms suggest the flu.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        telePatient2_2Wrong: {
            title: "Incorrect",
            story: "Linda's symptoms are not indicative of a migraine.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        patient5: {
            title: "Patient 5",
            story: "Alex complains of sudden chest pain and difficulty breathing. What is your diagnosis?",
            choices: [
                { text: "Heart Attack", next: 'patient5Correct' },
                { text: "Anxiety Attack", next: 'patient5Wrong' }
            ]
        },
        patient5Correct: {
            title: "Correct",
            story: "Alex is experiencing symptoms of a heart attack. What would you like to do next?",
            choices: [{ text: "Finish", next: 'endScene' }]
        },
        patient5Wrong: {
            title: "Incorrect",
            story: "Alex's symptoms are indicative of a medical emergency, but not an anxiety attack.",
            choices: [{ text: "Finish", next: 'endScene' }]
        },
        endScene: {
            title: "Day 1 Finished!",
            story: "Another day, another diagnosis...",
            actionItems: [{ type: 'endGame' }]
        },

        // ── Medical School placeholder scene ─────────────────────────────────
        medSchoolStart: {
            title: "Medical School",
            story: "Review the disease reference table below.",
            chart: `<table>
                <tr><th>Disease</th><th>Symptoms</th></tr>
                <tr><td>Pneumonia</td><td>Coughing, Fever, Chills, Shortness of breath</td></tr>
                <tr><td>Stroke</td><td>Weakness in one arm, Slurred speech</td></tr>
                <tr><td>Heart Attack</td><td>Chest pain, Shortness of breath</td></tr>
                <tr><td>Anxiety Attack</td><td>Rapid heart rate, Sweating, Trembling</td></tr>
            </table>`,
            choices: [{ text: "Return to break", next: '__return__' }]
        },

        // ── Uber placeholder scenes ───────────────────────────────────────────
        uberStart: {
            title: "Uber: New Shift",
            story: "You've accepted a driving shift. Complete 3 fare estimates to finish your session.",
            choices: [{ text: "Start driving", next: 'uberRide1' }]
        },
        uberRide1: {
            title: "Uber Ride 1",
            story: "Passenger A: short trip across town. Set the fare meter.",
            actionItems: [{ type: 'slider', correctValue: 0, nextScene: 'uberRide2', hint: 'Placeholder fare — just submit.' }]
        },
        uberRide2: {
            title: "Uber Ride 2",
            story: "Passenger B: medium trip to the airport. Set the fare meter.",
            actionItems: [{ type: 'slider', correctValue: 0, nextScene: 'uberRide3', hint: 'Placeholder fare — just submit.' }]
        },
        uberRide3: {
            title: "Uber Ride 3",
            story: "Passenger C: long trip across the city. Final fare of the session.",
            actionItems: [{ type: 'slider', correctValue: 0, nextScene: '__return__', hint: 'Placeholder fare — just submit.' }]
        }
    }
};
