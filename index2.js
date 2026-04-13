// =============================================================================
// Phase configuration — single source of truth for all structural parameters
// =============================================================================

const PHASE_CONFIG = {
    INACTIVITY_TIMEOUT_SECONDS: 30,        // seconds before inactive patient is auto-skipped
    TELELOGIN_ENABLED: false,              // bypass password login for telemedicine

    phaseOrder: [0, 1, 3],

    phases: {
        0: {
            id: 0,
            name: 'Tutorial',
            shiftsPerDay: 1,
            patientsPerShift: 0,           // tutorial uses scripted scenes, not queue
            daysCount: 1,
            sideJobMenu: [],
            patientPool: 'TUTORIAL_PATIENTS',
            startScene: 'tutorialIntro'
        },
        1: {
            id: 1,
            name: 'Phase 1',
            shiftsPerDay: 3,
            patientsPerShift: 2,
            daysCount: 5,
            sideJobMenu: ['telemedicine'],          // Phase 1: telemedicine + break only
            patientPool: 'PHASE1_PATIENTS',
            startScene: 'phase1Intro'
        },
        3: {
            id: 3,
            name: 'Phase 3',
            shiftsPerDay: 3,
            patientsPerShift: 2,
            daysCount: 5,
            sideJobMenu: ['telemedicine', 'medschool', 'uber'],
            patientPool: 'PHASE3_PATIENTS',
            startScene: 'phase3Intro'
        }
    }
};

const TUTORIAL_PATIENTS = [];   // tutorial flow is scripted; queue unused

const PHASE1_PATIENTS = [
    'patient1','patient2','patient3','patient4','patient5',
    'patient6','patient7','patient8','patient9','patient10',
    'patient11','patient12','patient13','patient14','patient15',
    'patient16','patient17','patient18','patient19','patient20',
    'alienPatient1','alienPatient2','alienPatient3','alienPatient4','alienPatient5',
    'alienPatient6','alienPatient7','alienPatient8','alienPatient9','alienPatient10'
];

const PHASE3_PATIENTS = [
    'patient2','patient22','patient23','patient24','patient25',
    'patient26','patient27','patient28','patient29','patient30',
    'alienPatient1','alienPatient2','alienPatient3','alienPatient4','alienPatient5',
    'alienPatient6','alienPatient7','alienPatient8','alienPatient9','alienPatient10',
    'patient1','patient2','patient4','patient6','patient8',
    'patient10','patient12','patient14','patient16','patient18'
];

const PATIENT_POOLS = {
    TUTORIAL_PATIENTS: TUTORIAL_PATIENTS,
    PHASE1_PATIENTS:   PHASE1_PATIENTS,
    PHASE3_PATIENTS:   PHASE3_PATIENTS
};


// Telemedicine scene pools for Phase 3 transferability conditions.
// Change entries here to swap which scenes each condition uses.
const TRANSFERABILITY_SCENES = {
    low:  ['telemedicine1', 'telemedicine2'],          // human diseases only
    high: ['telemedicine1_alien', 'telemedicine2_alien'] // alien diseases only
};


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
                    this.onChoiceMade(sceneKey, choice.next, choice);
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

// =============================================================================
// DataCollector — records granular trial-by-trial data for Qualtrics export
// =============================================================================

class DataCollector {
    constructor() {
        this.phaseId = null;
        this.phaseStartTime = null;
        this.trialSceneStartTime = null;

        // Parallel arrays — one entry per recorded trial
        this.trialPhase      = [];
        this.trialScene      = [];
        this.trialType       = [];   // 'choice' | 'slider' | 'break_decision'
        this.trialAnswer     = [];
        this.trialCorrect    = [];
        this.trialTimeMs     = [];
        this.trialTimestamp  = [];
        this.trialReward     = [];
        this.trialSliderVal  = [];
    }

    setPhase(phaseId) {
        this.phaseId = phaseId;
        this.phaseStartTime = Date.now();
    }

    startTrial(_sceneKey) {
        this.trialSceneStartTime = Date.now();
    }

    recordChoice(sceneKey, answerText, correct, rewardDelta) {
        const timeMs = this.trialSceneStartTime ? Date.now() - this.trialSceneStartTime : null;
        this.trialPhase.push(this.phaseId);
        this.trialScene.push(sceneKey);
        this.trialType.push('choice');
        this.trialAnswer.push(answerText);
        this.trialCorrect.push(correct !== undefined ? correct : null);
        this.trialTimeMs.push(timeMs);
        this.trialTimestamp.push(Date.now());
        this.trialReward.push(rewardDelta !== undefined ? rewardDelta : null);
        this.trialSliderVal.push(null);
    }

    recordSlider(sceneKey, sliderValue, correct, rewardDelta) {
        const timeMs = this.trialSceneStartTime ? Date.now() - this.trialSceneStartTime : null;
        this.trialPhase.push(this.phaseId);
        this.trialScene.push(sceneKey);
        this.trialType.push('slider');
        this.trialAnswer.push(sliderValue + ' mg');
        this.trialCorrect.push(correct);
        this.trialTimeMs.push(timeMs);
        this.trialTimestamp.push(Date.now());
        this.trialReward.push(rewardDelta !== undefined ? rewardDelta : null);
        this.trialSliderVal.push(sliderValue);
    }

    recordBreakDecision(decision) {
        const timeMs = this.trialSceneStartTime ? Date.now() - this.trialSceneStartTime : null;
        this.trialPhase.push(this.phaseId);
        this.trialScene.push('breakChoice');
        this.trialType.push('break_decision');
        this.trialAnswer.push(decision);
        this.trialCorrect.push(null);
        this.trialTimeMs.push(timeMs);
        this.trialTimestamp.push(Date.now());
        this.trialReward.push(null);
        this.trialSliderVal.push(null);
    }

    saveToQualtrics() {
        try {
            const QSE = Qualtrics.SurveyEngine;
            QSE.setEmbeddedData('dc_phase',        JSON.stringify(this.trialPhase));
            QSE.setEmbeddedData('dc_scene',        JSON.stringify(this.trialScene));
            QSE.setEmbeddedData('dc_type',         JSON.stringify(this.trialType));
            QSE.setEmbeddedData('dc_answer',       JSON.stringify(this.trialAnswer));
            QSE.setEmbeddedData('dc_correct',      JSON.stringify(this.trialCorrect));
            QSE.setEmbeddedData('dc_time_ms',      JSON.stringify(this.trialTimeMs));
            QSE.setEmbeddedData('dc_timestamp',    JSON.stringify(this.trialTimestamp));
            QSE.setEmbeddedData('dc_reward',       JSON.stringify(this.trialReward));
            QSE.setEmbeddedData('dc_slider_val',   JSON.stringify(this.trialSliderVal));
            QSE.setEmbeddedData('dc_total_trials', this.trialPhase.length);
        } catch(e) {
            console.warn('DataCollector.saveToQualtrics: Qualtrics not available', e);
        }
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
        this.id = config.id || config.name;
        this.name = config.name;
        this.actionItem = config.actionItem;   // action item type shared with the main job
        this.reward = config.reward;
        this.similarity = config.similarity || 0; // similarity score vs main job (0–1)
        this.startScene = config.startScene || null;        // fixed start scene key
        this.startScenes = config.startScenes || null;      // array of start scenes (picked randomly)
        this.startSceneMap = config.startSceneMap || null;  // map returnScene → startScene
    }
}

class MainJobGameInstance extends GameInstance {
    constructor(config) {
        super(config);
        this.sideJobs = config.sideJobs || [];
        this.phaseId = config.phaseId !== undefined ? config.phaseId : null;
        this.phaseCfg = config.phaseCfg || null;
        this.patientPool = config.patientPool || null;
        this.onPhaseEnd = config.onPhaseEnd || null;
        this.dataCollector = config.dataCollector || null;
        this.sideJobRewardsTotal = 0;
        this.continuousWorkTime = 0;
        this.continuousWorkInterval = null;
        this.onBreak = false;
        this.onSideJob = false;
        this.pendingReturnScene = null;
        this.activeSideJob = null;
        this.totalCorrect = 0;
        this.totalAttempts = 0;
        this.mainJobRewardRate = 15;
        this.mainJobPenalty = 5;
        this.mainJobRewardsTotal = 0;
        this.telemedicineReward = 5;
        this.patientQueue = [];
        this.patientsDone = 0;
        this.patientResults = [];    // { scene, answer, correct, skipped } per main-job patient
        this.sideJobSessions = [];   // { jobName, reward, correct, attempts } per side-job run
        this.currentSideJobSession = null;
        this.dayIndex = 0;           // 0-4 (Mon-Fri)
        this.shiftIndex = 0;         // 0-2 (shift 1-3 within day)
        this.patientsThisShift = 0;  // patients seen in current shift
        this.autoAdvanceTimeout = null;
        this.autoAdvanceCountdownInterval = null;
        this.inactivityTimeout = null;
        this._inactivityCountdownInterval = null;
        this.timerStartMs = null;
        this.sideJobStartTime = null;
        this.transferabilityMode = null;  // null unless phase 3: 0 = low, 1 = high
    }

    get totalReward() {
        return this.mainJobRewardsTotal + this.sideJobRewardsTotal;
    }

    startContinuousWorkTimer() {
        this.continuousWorkInterval = setInterval(() => {
            if (!this.onBreak) {  // counts during side jobs; stops only on explicit break
                this.continuousWorkTime++;
                this.updateContinuousWorkDisplay();
            }
        }, 1000);
    }

    resetContinuousWorkTime() {
        this.continuousWorkTime = 0;
        this.updateContinuousWorkDisplay();
    }

    // Override: 1 real second = 1 game minute, starting 9:00 AM; resettable via resetDayClock()
    startTimer() {
        this.timerStartMs = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.timerStartMs) / 1000);
            const totalMin = 9 * 60 + elapsed;          // 9:00 AM base + elapsed minutes
            const h24 = Math.floor(totalMin / 60) % 24;
            const m   = totalMin % 60;
            const ampm = h24 >= 12 ? 'PM' : 'AM';
            const h12  = h24 > 12 ? h24 - 12 : (h24 === 0 ? 12 : h24);
            const el = document.getElementById('timer');
            if (el) el.textContent = h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
        }, 1000);
    }

    resetDayClock() {
        this.timerStartMs = Date.now();
    }

    setInactivityTimer(callback) {
        clearTimeout(this.inactivityTimeout);
        clearInterval(this._inactivityCountdownInterval);
        const el = document.getElementById('break-timer');
        const effectiveSeconds = PHASE_CONFIG.INACTIVITY_TIMEOUT_SECONDS;
        let remaining = effectiveSeconds;
        if (el) el.textContent = 'Time remaining: ' + remaining + 's';
        this._inactivityCountdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this._inactivityCountdownInterval);
                if (el) el.textContent = '';
            } else {
                if (el) el.textContent = 'Time remaining: ' + remaining + 's';
            }
        }, 1000);
        this.inactivityTimeout = setTimeout(() => {
            clearInterval(this._inactivityCountdownInterval);
            if (el) el.textContent = '';
            callback();
        }, effectiveSeconds * 1000);
    }

    clearInactivityTimer() {
        clearTimeout(this.inactivityTimeout);
        clearInterval(this._inactivityCountdownInterval);
        this.inactivityTimeout = null;
        this._inactivityCountdownInterval = null;
        const el = document.getElementById('break-timer');
        if (el && el.textContent.startsWith('Time remaining:')) el.textContent = '';
    }

    updateContinuousWorkDisplay() {
        const el = document.getElementById('continuous-work-time');
        if (!el) return;
        const minutes = Math.floor(this.continuousWorkTime / 60);
        const seconds = this.continuousWorkTime % 60;
        el.textContent = (minutes < 10 ? '0' : '') + minutes + ':' +
            (seconds < 10 ? '0' : '') + seconds;
    }

    get accuracy() {
        return this.totalAttempts === 0 ? 0 : Math.round((this.totalCorrect / this.totalAttempts) * 100);
    }

    updateTotalRewardDisplay() {
        const el = document.getElementById('total-reward');
        if (el) el.textContent = '$' + this.totalReward;
    }

    updateAccuracyDisplay() {
        const el = document.getElementById('accuracy');
        if (el) el.textContent = this.accuracy + '%';
    }

    updateCurrentJobDisplay() {
        const JOB_META = {
            'Hospital':      { icon: '🏥', label: 'Hospital'       },
            'Telemedicine':  { icon: '💻', label: 'Telemedicine'   },
            'Ride Sharing':  { icon: '🚗', label: 'Ride Sharing'   },
            'Medical School':{ icon: '📚', label: 'Medical School' },
            'On Break':      { icon: '☕', label: 'On Break'       }
        };
        let jobKey;
        if (this.onBreak) {
            jobKey = 'On Break';
        } else if (this.onSideJob && this.activeSideJob) {
            jobKey = this.activeSideJob.name;
        } else {
            jobKey = 'Hospital';
        }
        const meta = JOB_META[jobKey] || { icon: '🏥', label: jobKey };

        const el    = document.getElementById('current-job');
        const icon  = document.getElementById('job-icon');
        const lbl   = document.getElementById('job-label');
        if (el)   el.textContent   = meta.label;
        if (icon) icon.textContent = meta.icon;
        if (lbl)  lbl.textContent  = meta.label;
    }

    handleActionItem(item) {
        if (item.type === 'uberGame') {
            this.startUberGame(item);
        } else if (item.type === 'breakTimer') {
            // Handled by showBreakChoice — do nothing here
        } else if (item.type === 'teleLogin') {
            this.handleTeleLogin(item);
        } else if (item.type === 'endGame') {
            this.renderPatientSummary();
            super.handleActionItem(item);
        } else {
            super.handleActionItem(item);
        }
    }

    handleTeleLogin(item) {
        if (!PHASE_CONFIG.TELELOGIN_ENABLED) {
            this.displayScene(item.nextScene);
            return;
        }

        const container = document.getElementById('choices');
        container.innerHTML = '';

        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
        let password = '';
        for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)];

        const banner = document.createElement('p');
        banner.style.cssText = 'font-family:monospace;font-size:1.1em;background:#222;color:#7fff7f;padding:8px 12px;border-radius:4px;display:inline-block';
        banner.textContent = 'Session password: ' + password;
        container.appendChild(banner);

        const hint = document.createElement('p');
        hint.textContent = 'Enter the password above to log in.';
        hint.style.color = '#aaa';
        container.appendChild(hint);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type password here';
        input.style.cssText = 'margin-top:8px;padding:6px;font-size:1em;width:200px';
        container.appendChild(input);

        const err = document.createElement('p');
        err.style.color = 'red';
        err.style.display = 'none';
        err.textContent = 'Incorrect password. Try again.';
        container.appendChild(err);

        const btn = document.createElement('button');
        btn.textContent = 'Log In';
        btn.style.marginLeft = '8px';
        btn.onclick = () => {
            this.clearInactivityTimer();
            if (input.value === password) {
                container.innerHTML = '';
                this.displayScene(item.nextScene);
            } else {
                container.innerHTML = '';
                const msgEl = document.createElement('p');
                msgEl.style.color = '#c53030';
                msgEl.textContent = 'Incorrect password — returning to shift.';
                container.appendChild(msgEl);
                setTimeout(() => this.displayScene('__return__'), 1000);
            }
        };
        container.appendChild(btn);
    }

    renderPatientSummary() {
        const LABELS = {
            patient1:'John', patient2:'Jane', patient3:'Robert', patient4:'Ishan', patient5:'Alex',
            patient6:'Maria', patient7:'Carlos', patient8:'Sarah', patient9:'David', patient10:'Lisa',
            patient11:'Tom', patient12:'Emma', patient13:'James', patient14:'Sophie', patient15:'Michael',
            patient16:'Hannah', patient17:'Chris', patient18:'Priya', patient19:'Kevin', patient20:'Amy',
            patient21:'Elena', patient22:'Marcus', patient23:'Yuki', patient24:'Luca', patient25:'Fatima',
            patient26:'Ravi', patient27:'Nadia', patient28:'Owen', patient29:'Sera', patient30:'Jin',
            alienPatient1:'Patient ZX-9', alienPatient2:'Patient QT-3',
            alienPatient3:'Patient RX-5', alienPatient4:'Patient QK-7',
            alienPatient5:'Patient ZT-2', alienPatient6:'Patient BM-4',
            alienPatient7:'Patient YP-9', alienPatient8:'Patient LX-3',
            alienPatient9:'Patient WZ-6', alienPatient10:'Patient FC-8'
        };
        const CORRECT_DX = {
            // Diagnosis patients
            patient1:'Pneumonia', patient2:'Stroke', patient4:'Heart Attack',
            patient6:'Flu', patient8:'Anxiety Attack', patient10:'Migraine',
            patient12:'Anxiety Attack', patient14:'Migraine', patient16:'Flu',
            patient18:'Anxiety Attack',
            // Dosage patients (correct dose in mg)
            patient3:'40 mg', patient5:'35 mg', patient7:'45 mg',
            patient9:'50 mg', patient11:'55 mg', patient13:'60 mg',
            patient15:'70 mg', patient17:'75 mg', patient19:'80 mg', patient20:'90 mg',
            // Phase 3 patients
            patient21:'Pneumonia', patient23:'Stroke', patient25:'Heart Attack',
            patient27:'Anxiety Attack', patient29:'Migraine',
            patient22:'40 mg', patient24:'60 mg', patient26:'65 mg',
            patient28:'85 mg', patient30:'77 mg',
            alienPatient1:'Vorpal Syndrome', alienPatient2:'Null-Field Exposure',
            alienPatient3:'Vorpal Syndrome', alienPatient4:'Null-Field Exposure',
            alienPatient5:'Vorpal Syndrome', alienPatient6:'Null-Field Exposure',
            alienPatient7:'Vorpal Syndrome', alienPatient8:'Null-Field Exposure',
            alienPatient9:'Vorpal Syndrome', alienPatient10:'Null-Field Exposure'
        };

        const th = 'style="padding:9px 14px;background:#2b6cb0;color:#fff;text-align:left;font-weight:600"';
        const td = 'style="padding:8px 14px;border-bottom:1px solid #e2e8f0;color:#2d3748"';
        const tableStyle = 'style="border-collapse:collapse;width:100%;font-size:0.88em;box-shadow:0 1px 4px rgba(0,0,0,0.06)"';

        // ── Hospital patients ──
        let html = '<h3 style="margin-bottom:10px;color:#1a365d;font-size:1.1em">Hospital Patients</h3>';
        html += '<table ' + tableStyle + '>';
        html += '<tr><th ' + th + '>Patient</th><th ' + th + '>Your Answer</th>' +
                '<th ' + th + '>Correct Answer</th><th ' + th + '>Result</th></tr>';

        this.patientResults.forEach(r => {
            const label   = LABELS[r.scene] || r.scene;
            const correct = CORRECT_DX[r.scene] || '?';
            let result, color;
            if (r.skipped) {
                result = 'Skipped (+0)'; color = '#718096';
            } else if (r.correct === true) {
                result = '+$' + this.mainJobRewardRate; color = '#276749';
            } else {
                result = '-$' + this.mainJobPenalty; color = '#c53030';
            }
            html += '<tr><td ' + td + '>' + label + '</td>' +
                '<td ' + td + '>' + (r.answer || '—') + '</td>' +
                '<td ' + td + '>' + correct + '</td>' +
                '<td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:' + color + '">' + result + '</td></tr>';
        });
        html += '</table>';

        // ── Side-job sessions ──
        if (this.sideJobSessions.length > 0) {
            html += '<h3 style="margin:20px 0 10px;color:#1a365d;font-size:1.1em">Side Job Sessions</h3>';
            html += '<table ' + tableStyle + '>';
            html += '<tr><th ' + th + '>Job</th><th ' + th + '>Questions</th>' +
                    '<th ' + th + '>Correct</th><th ' + th + '>Reward Earned</th></tr>';

            this.sideJobSessions.forEach(s => {
                const acc = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) + '%' : '—';
                html += '<tr><td ' + td + '>' + s.jobName + '</td>' +
                    '<td ' + td + '>' + s.attempts + '</td>' +
                    '<td ' + td + '>' + s.correct + ' (' + acc + ')</td>' +
                    '<td ' + td + '>+$' + s.reward + '</td></tr>';
            });
            html += '</table>';
        } else {
            html += '<p style="margin-top:16px;color:#718096;font-style:italic">No side jobs completed this shift.</p>';
        }

        const chartEl = document.getElementById('disease-chart');
        if (chartEl) chartEl.innerHTML = html;
    }

    startUberGame(item) {
        const GRID         = 10;
        const CELL         = 40;
        const STREET       = 5;
        const DURATION     = 60000;   // ms
        const SPAWN_EVERY  = 2000;    // ms between new customers
        const CUSTOMER_TTL = 5000;    // ms before a customer vanishes
        const SPEED        = CELL * 2.8; // pixels per second
        const SNAP         = CELL * 0.42; // px threshold to detect intersection

        const W      = GRID * CELL;
        const H      = GRID * CELL;

        const PARKS  = new Set(['0,0','1,0','0,1','9,0','9,1','4,3','5,3','4,4','6,7','3,8']);
        const CAMPUS = new Set(['3,3','5,4','6,3','3,4']);

        const container = document.getElementById('choices');
        container.innerHTML = '';

        const infoEl = document.createElement('p');
        infoEl.style.cssText = 'font-family:monospace; font-size:0.85em; margin:4px 0;';
        infoEl.textContent = 'Time: 60s  |  Pickups: 0  |  Arrow keys to steer';

        const canvas = document.createElement('canvas');
        canvas.width  = GRID * CELL;
        canvas.height = GRID * CELL;
        canvas.style.cssText = 'display:block; margin:6px 0; border-radius:3px;';

        container.appendChild(infoEl);
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Car starts on an intersection
        let px = 4 * CELL, py = 5 * CELL;
        let dir     = { x: 1, y: 0 };
        let nextDir = { x: 1, y: 0 };  // queued turn, applied at next intersection

        // customers: array of { cx, cy, born } where cx/cy are pixel centers
        let customers = [];
        let pickups   = 0;
        let gameActive  = true;
        let startTs     = null;
        let lastTs      = null;
        let lastSpawn   = null;

        function drawMap() {
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(0, 0, W, H);
            for (let x = 0; x < GRID; x++) {
                for (let y = 0; y < GRID; y++) {
                    const key = x + ',' + y;
                    ctx.fillStyle = PARKS.has(key) ? '#3d6b3a' : CAMPUS.has(key) ? '#7a6a3a' : '#545464';
                    ctx.fillRect(x * CELL + STREET, y * CELL + STREET, CELL - STREET * 2, CELL - STREET * 2);
                }
            }
            ctx.strokeStyle = 'rgba(220,190,0,0.45)';
            ctx.setLineDash([3, 6]);
            ctx.lineWidth = 1;
            for (let i = 1; i < GRID; i++) {
                ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        const ICON = Math.floor(CELL * 0.62) + 'px serif';

        function gameLoop(ts) {
            if (!gameActive) return;
            if (startTs === null) { startTs = ts; lastSpawn = ts; }

            const elapsed = ts - startTs;
            const dt = lastTs !== null ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
            lastTs = ts;

            // ── Movement: Pac-Man style, roads only ──────────────────────────
            // Lock the perpendicular axis so car stays on its road line
            if (dir.x !== 0) py = Math.round(py / CELL) * CELL;
            if (dir.y !== 0) px = Math.round(px / CELL) * CELL;

            px += dir.x * SPEED * dt;
            py += dir.y * SPEED * dt;
            px = ((px % W) + W) % W;
            py = ((py % H) + H) % H;

            // Nearest intersection
            const ix = (Math.round(px / CELL) * CELL) % W;
            const iy = (Math.round(py / CELL) * CELL) % H;

            // 180° reversal allowed anywhere on the current road
            const is180 = (nextDir.x === -dir.x && nextDir.y === 0 && dir.y === 0) ||
                          (nextDir.y === -dir.y && nextDir.x === 0 && dir.x === 0);
            if (is180) {
                dir = { x: nextDir.x, y: nextDir.y };
            } else if ((nextDir.x !== dir.x || nextDir.y !== dir.y) &&
                       Math.abs(px - ix) < SNAP && Math.abs(py - iy) < SNAP) {
                // Perpendicular turn: only at intersections
                dir = { x: nextDir.x, y: nextDir.y };
                px = ix;
                py = iy;
            }

            // ── Spawn customers at road intersections ─────────────────────────
            if (ts - lastSpawn >= SPAWN_EVERY) {
                customers.push({
                    cx: Math.floor(Math.random() * GRID) * CELL,
                    cy: Math.floor(Math.random() * GRID) * CELL,
                    born: ts
                });
                lastSpawn = ts;
            }

            // Expire and pickup
            const pickupR = CELL * 0.55;
            const alive = [];
            for (let i = 0; i < customers.length; i++) {
                const c = customers[i];
                if (ts - c.born >= CUSTOMER_TTL) continue;          // expired
                if (Math.hypot(px - c.cx, py - c.cy) < pickupR) {  // picked up
                    pickups++;
                    continue;
                }
                alive.push(c);
            }
            customers = alive;

            // Update HUD
            const secsLeft = Math.max(0, Math.ceil((DURATION - elapsed) / 1000));
            infoEl.textContent = 'Time: ' + secsLeft + 's  |  Pickups: ' + pickups;

            // Draw
            drawMap();
            ctx.font = ICON;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Customers — fade out in last second of life
            for (let i = 0; i < customers.length; i++) {
                const c = customers[i];
                const age = ts - c.born;
                ctx.globalAlpha = age > CUSTOMER_TTL - 1000
                    ? Math.max(0, (CUSTOMER_TTL - age) / 1000)
                    : 1;
                ctx.fillText('🧍', c.cx, c.cy);
            }
            ctx.globalAlpha = 1;
            ctx.fillText('🚗', px, py);

            if (elapsed >= DURATION) {
                gameActive = false;
                document.removeEventListener('keydown', keyHandler);

                const earned = pickups * (this.activeSideJob ? this.activeSideJob.reward : 0);
                this.sideJobRewardsTotal += earned;
                this.updateTotalRewardDisplay();

                canvas.style.opacity = '0.5';
                infoEl.textContent = 'Shift complete! Pickups: ' + pickups + '  |  Earned: $' + earned;

                const continueBtn = document.createElement('button');
                continueBtn.textContent = 'Continue';
                continueBtn.onclick = () => this.displayScene(item.nextScene || '__return__');
                container.appendChild(continueBtn);
                return;
            }

            requestAnimationFrame(gameLoop.bind(this));
        }

        const keyHandler = (e) => {
            if (!gameActive) return;
            const map = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
            const m = map[e.key];
            if (!m) return;
            e.preventDefault();
            nextDir = { x: m[0], y: m[1] };
        };
        document.addEventListener('keydown', keyHandler);

        requestAnimationFrame(gameLoop.bind(this));
    }

    onChoiceMade(fromKey, toKey, choice) {
        // Main-job patient choices carry explicit correct/skip flags — no immediate feedback
        if (choice && (choice.hasOwnProperty('correct') || choice.skip)) {
            this.totalAttempts++;
            let rewardDelta = 0;
            if (choice.correct === true) {
                this.totalCorrect++;
                this.mainJobRewardsTotal += this.mainJobRewardRate;
                rewardDelta = this.mainJobRewardRate;
            } else if (choice.correct === false) {
                this.mainJobRewardsTotal -= this.mainJobPenalty;
                rewardDelta = -this.mainJobPenalty;
            }
            // skip: +0, no change
            this.patientResults.push({
                scene: fromKey,
                answer: choice.text,
                correct: choice.correct,
                skipped: !!choice.skip
            });
            if (this.dataCollector) {
                this.dataCollector.recordChoice(fromKey, choice.text || '', choice.correct, rewardDelta);
            }
            this.updateTotalRewardDisplay();
            return;
        }
        // Telemedicine: uses Correct/Wrong in destination key
        if (toKey.includes('Correct') || toKey.includes('Wrong')) {
            this.totalAttempts++;
            const isCorrect = toKey.includes('Correct');
            let rewardDelta = 0;
            if (isCorrect) {
                this.totalCorrect++;
                if (this.onSideJob) {
                    this.sideJobRewardsTotal += this.telemedicineReward;
                    rewardDelta = this.telemedicineReward;
                } else {
                    this.mainJobRewardsTotal += this.mainJobRewardRate;
                    rewardDelta = this.mainJobRewardRate;
                }
                this.updateTotalRewardDisplay();
            }
            if (this.dataCollector) {
                this.dataCollector.recordChoice(fromKey, choice ? (choice.text || '') : '', isCorrect, rewardDelta);
            }
            this.updateAccuracyDisplay();
        }
    }

    onSliderSubmit(correct, sliderValue) {
        this.totalAttempts++;
        let rewardDelta = 0;
        if (correct) {
            this.totalCorrect++;
            if (this.onSideJob && this.activeSideJob) {
                this.sideJobRewardsTotal += this.activeSideJob.reward || 0;
                rewardDelta = this.activeSideJob.reward || 0;
            } else {
                this.mainJobRewardsTotal += this.mainJobRewardRate;
                rewardDelta = this.mainJobRewardRate;
            }
            this.updateTotalRewardDisplay();
            // Track correct dosage result for hospital patients (once per patient)
            if (!this.onSideJob && /^(patient|alienPatient)/.test(this.currentScene)) {
                if (!this.patientResults.some(r => r.scene === this.currentScene)) {
                    this.patientResults.push({
                        scene: this.currentScene,
                        answer: 'Correct dose',
                        correct: true,
                        skipped: false
                    });
                }
            }
        }
        if (this.dataCollector && sliderValue !== undefined) {
            this.dataCollector.recordSlider(this.currentScene, sliderValue, correct, rewardDelta);
        }
        this.updateAccuracyDisplay();
    }

    // Override: sentinels, week structure, auto-advance, break choices, reference button
    displayScene(sceneKey) {
        // Cancel any pending auto-advance or inactivity timer from previous scene
        clearTimeout(this.autoAdvanceTimeout);
        clearInterval(this.autoAdvanceCountdownInterval);
        clearTimeout(this.inactivityTimeout);
        clearInterval(this._inactivityCountdownInterval);
        this.inactivityTimeout = null;
        this._inactivityCountdownInterval = null;
        const breakTimerEl = document.getElementById('break-timer');
        if (breakTimerEl) breakTimerEl.textContent = '';

        // Phase end sentinel — show summary and hand off to orchestrator
        if (sceneKey === '__phaseEnd__') {
            this.stopTimer();
            clearInterval(this.continuousWorkInterval);
            // Store phase data immediately (captures accurate elapsed time)
            this.storeGameData();
            const titleEl = document.getElementById('scene-title');
            const storyEl = document.getElementById('scene-story');
            const chartEl = document.getElementById('disease-chart');
            const choicesEl = document.getElementById('choices');
            const phaseName = this.phaseCfg ? this.phaseCfg.name : 'Phase';
            if (titleEl) titleEl.textContent = phaseName + ' Complete!';
            if (storyEl) storyEl.textContent = this.phaseCfg && this.phaseCfg.id === 0
                ? 'Tutorial complete — you are ready to begin!'
                : 'Review your results below.';
            if (chartEl) chartEl.innerHTML = '';
            if (choicesEl) choicesEl.innerHTML = '';
            if (this.phaseCfg && this.phaseCfg.id !== 0) this.renderPatientSummary();
            const continueBtn = document.createElement('button');
            continueBtn.textContent = this.onPhaseEnd ? 'Continue to Next Phase' : 'Finish';
            continueBtn.onclick = () => {
                if (this.dataCollector) this.dataCollector.saveToQualtrics();
                if (this.onPhaseEnd) {
                    this.onPhaseEnd(this.getStats());
                } else {
                    if (this.Q) this.Q.enableNextButton();
                }
            };
            if (choicesEl) choicesEl.appendChild(continueBtn);
            this.showGameView();
            return;
        }

        // Record trial start time for DataCollector
        if (this.dataCollector) this.dataCollector.startTrial(sceneKey);

        // Intercept intro: show styled hero screen
        if (sceneKey === 'intro') { this.showIntroScreen(); return; }

        if (sceneKey === '__return__') {
            // Finalise side-job session tracking
            if (this.currentSideJobSession) {
                const s = this.currentSideJobSession;
                this.sideJobSessions.push({
                    jobName:  s.jobName,
                    reward:   this.sideJobRewardsTotal - s.startReward,
                    correct:  this.totalCorrect   - s.startCorrect,
                    attempts: this.totalAttempts  - s.startAttempts
                });
                this.currentSideJobSession = null;
            }
            this.onSideJob = false;
            this.activeSideJob = null;
            this.updateCurrentJobDisplay();
            sceneKey = this.pendingReturnScene;
        }

        if (sceneKey === '__nextPatient__') {
            sceneKey = this.resolveNextPatient();
            if (sceneKey === '__phaseEnd__') { this.displayScene('__phaseEnd__'); return; }
        }

        // Day transition: update dynamic title/story and reset clock
        if (sceneKey === 'dayTransition') {
            const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
            const done = this.dayIndex - 1;
            const next = this.dayIndex;
            this.scenes.dayTransition.title = DAY_NAMES[done] + ' Complete!';
            this.scenes.dayTransition.story = 'Great work today. Starting ' + DAY_NAMES[next] + ' tomorrow.';
            this.resetDayClock();
            this.updateDayDisplay();
        }

        // Shift display update on any patient scene or break
        if (/^(patient|alienPatient|startBreak)/.test(sceneKey)) {
            this.updateDayDisplay();
        }

        const scene = this.scenes[sceneKey];
        const breakItem = scene.actionItems && scene.actionItems.find(i => i.type === 'breakTimer');

        // Shuffle choices for diagnosis/telemedicine scenes (any scene where choices carry correct flags)
        let savedChoices = null;
        if (scene.choices && scene.choices.some(c => c.hasOwnProperty('correct'))) {
            savedChoices = scene.choices;
            const shuffled = scene.choices.slice();
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
            }
            scene.choices = shuffled;
        }

        super.displayScene(sceneKey);

        if (savedChoices) scene.choices = savedChoices;   // restore original order
        this.updateTotalRewardDisplay();

        // Inactivity timer for interactive pages that don't have their own autoAdvance
        // teleLogin gets 15s; slider gets 30s; all other interactive scenes get 5s
        if (!scene.autoAdvance) {
            const hasChoices = scene.choices && scene.choices.length > 0;
            const hasInteractiveItems = scene.actionItems && scene.actionItems.some(
                i => i.type === 'slider' || i.type === 'teleLogin'
            );
            if (hasChoices || hasInteractiveItems) {
                this.setInactivityTimer(() => {
                    const storyEl = document.getElementById('scene-story');
                    if (this.onSideJob) {
                        const elapsed = this.sideJobStartTime
                            ? Math.floor((Date.now() - this.sideJobStartTime) / 1000)
                            : 60;
                        const remaining = Math.max(0, 60 - elapsed);
                        if (storyEl) storyEl.textContent = remaining > 0
                            ? 'Inactive — returning to break (' + remaining + 's remaining).'
                            : 'Inactive — returning to shift.';
                        // Finalise side-job session
                        if (this.currentSideJobSession) {
                            const s = this.currentSideJobSession;
                            this.sideJobSessions.push({
                                jobName:  s.jobName,
                                reward:   this.sideJobRewardsTotal - s.startReward,
                                correct:  this.totalCorrect   - s.startCorrect,
                                attempts: this.totalAttempts  - s.startAttempts
                            });
                            this.currentSideJobSession = null;
                        }
                        this.onSideJob = false;
                        this.activeSideJob = null;
                        this.sideJobStartTime = null;
                        this.updateCurrentJobDisplay();
                        setTimeout(() => {
                            if (remaining > 0) {
                                this.startActualBreak(null, remaining);
                            } else {
                                this.displayScene('__nextPatient__');
                            }
                        }, 800);
                    } else if (/^(patient|alienPatient)/.test(sceneKey)) {
                        this.patientResults.push({ scene: sceneKey, answer: 'Inactive', correct: undefined, skipped: true });
                        this.totalAttempts++;
                        if (storyEl) storyEl.textContent = 'Inactive — skipping to next patient.';
                        setTimeout(() => this.displayScene('__nextPatient__'), 800);
                    }
                });
            }
        }

        if (breakItem) { this.showBreakChoice(breakItem); }

        if (/^(patient|alienPatient)/.test(sceneKey)) { this.addReferenceButton(); }

        // Schedule auto-advance if scene declares one
        if (scene.autoAdvance) {
            this.autoAdvanceTimeout = setTimeout(() => {
                this.displayScene(scene.autoAdvance.next);
            }, scene.autoAdvance.delay);
            this.startAutoAdvanceCountdown(Math.round(scene.autoAdvance.delay / 1000));
        }
    }

    resolveNextPatient() {
        const patientsPerShift = this.phaseCfg ? this.phaseCfg.patientsPerShift : 2;
        const shiftsPerDay     = this.phaseCfg ? this.phaseCfg.shiftsPerDay     : 3;
        const daysCount        = this.phaseCfg ? this.phaseCfg.daysCount        : 5;

        if (this.patientsThisShift < patientsPerShift) {
            this.patientsThisShift++;
            return this.patientQueue.shift();
        }

        // Shift done
        this.patientsThisShift = 0;
        this.shiftIndex++;

        if (this.shiftIndex < shiftsPerDay) {
            return 'startBreak';
        }

        // Day done
        this.shiftIndex = 0;
        this.dayIndex++;

        if (this.dayIndex < daysCount) {
            return 'dayTransition';
        }
        return '__phaseEnd__';
    }

    updateDayDisplay() {
        const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
        const dayEl   = document.getElementById('day-display');
        const shiftEl = document.getElementById('shift-display');
        if (dayEl)   dayEl.textContent   = DAY_NAMES[this.dayIndex] || 'Friday';
        if (shiftEl) shiftEl.textContent = 'Shift ' + (this.shiftIndex + 1) + ' of 3';
    }

    updateTransferabilityDisplay() {
        const el = document.getElementById('transferability-display');
        if (!el) return;
        if (this.transferabilityMode === null) {
            el.textContent = '';
            el.style.display = 'none';
        } else {
            const label = this.transferabilityMode === 1 ? 'High Transferability' : 'Low Transferability';
            el.textContent = label;
            el.style.display = '';
        }
    }

    startAutoAdvanceCountdown(seconds) {
        clearInterval(this.autoAdvanceCountdownInterval);
        const el = document.getElementById('break-timer');
        if (!el) return;
        let remaining = seconds;
        el.textContent = 'Continuing in ' + remaining + 's…';
        this.autoAdvanceCountdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this.autoAdvanceCountdownInterval);
                el.textContent = '';
            } else {
                el.textContent = 'Continuing in ' + remaining + 's…';
            }
        }, 1000);
    }

    // Override: render slider inline inside #choices instead of the separate #slider-container
    setupSlider(correctValue, nextSceneKey, questionPrompt) {
        const container = document.getElementById('choices');
        container.innerHTML = '';

        const sliderWrap = document.createElement('div');
        sliderWrap.style.cssText = 'margin:0 0 8px';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 100;
        slider.value = 0;
        slider.style.cssText = 'width:100%;accent-color:#2b6cb0;margin-bottom:4px';

        const valLabel = document.createElement('p');
        valLabel.style.cssText = 'font-size:0.9em;color:#4a5568;margin:0 0 10px';
        valLabel.textContent = 'Value: 0';

        slider.oninput = () => {
            valLabel.textContent = 'Value: ' + slider.value;
            this.clearInactivityTimer();
        };

        sliderWrap.appendChild(slider);
        sliderWrap.appendChild(valLabel);
        container.appendChild(sliderWrap);

        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit Answer';
        submitBtn.onclick = () => {
            this.clearInactivityTimer();
            const val = parseInt(slider.value);
            if (val === correctValue) {
                const storyEl = document.getElementById('scene-story');
                if (storyEl) storyEl.textContent = 'Correct! The value is ' + correctValue + '.';
                this.onSliderSubmit(true, val);
                container.innerHTML = '';
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Continue';
                nextBtn.onclick = () => this.displayScene(nextSceneKey);
                container.appendChild(nextBtn);
            } else {
                const storyEl = document.getElementById('scene-story');
                if (storyEl) storyEl.textContent = 'Incorrect. Try again. ' + (questionPrompt || '');
                this.onSliderSubmit(false, val);
            }
        };
        container.appendChild(submitBtn);
    }

    addReferenceButton() {
        const container = document.getElementById('choices');
        const refBtn = document.createElement('button');
        refBtn.textContent = '📋 Reference Chart';
        refBtn.style.cssText = 'margin-top:12px;background:#2a3a4a;color:#ccc;border:1px solid #555';
        let panel = null;
        refBtn.onclick = () => {
            if (panel && panel.parentNode) {
                panel.parentNode.removeChild(panel);
                panel = null;
                refBtn.textContent = '📋 Reference Chart';
            } else {
                panel = document.createElement('div');
                panel.style.cssText = 'margin-top:8px;padding:10px;background:#1a2a3a;border-radius:4px;font-size:0.9em';
                panel.innerHTML = `<strong>Hospital Reference — Known Diseases</strong>
                    <table style="margin-top:6px;border-collapse:collapse">
                    <tr><th style="text-align:left;padding:3px 10px">Disease</th><th style="text-align:left;padding:3px 10px">Symptoms</th></tr>
                    <tr><td style="padding:3px 10px">Pneumonia</td><td style="padding:3px 10px">Coughing, Fever, Chills, Shortness of breath</td></tr>
                    <tr><td style="padding:3px 10px">Stroke</td><td style="padding:3px 10px">Weakness in one arm, Slurred speech</td></tr>
                    <tr><td style="padding:3px 10px">Heart Attack</td><td style="padding:3px 10px">Chest pain, Shortness of breath</td></tr>
                    <tr><td style="padding:3px 10px">Anxiety Attack</td><td style="padding:3px 10px">Rapid heart rate, Sweating, Trembling</td></tr>
                    </table>
                    <p style="margin-top:8px;color:#888;font-style:italic">Some diseases are not listed here. Consult Medical School or Telemedicine for additional training.</p>`;
                container.appendChild(panel);
                refBtn.textContent = '📋 Hide Reference';
            }
        };
        container.appendChild(refBtn);
    }

    showIntroScreen() {
        const sidebar  = document.getElementById('progress-sidebar');
        const gameView = document.getElementById('game-view');
        const overlay  = document.getElementById('intro-overlay');
        if (sidebar)  sidebar.classList.add('hidden');
        if (gameView) { gameView.classList.remove('active'); gameView.classList.add('hidden'); }
        if (!overlay) return;

        overlay.innerHTML =
            '<div style="font-size:4.5em;margin-bottom:16px;line-height:1">🏥</div>' +
            '<h2 style="font-size:2em;font-weight:700;color:#1a365d;margin:0 0 14px">Doctor Game</h2>' +
            '<p style="font-size:1.05em;color:#4a5568;line-height:1.7;max-width:380px;margin:0 auto 36px">Welcome to the Work Simulator. Are you ready to check in for the day?</p>';

        const btn = document.createElement('button');
        btn.textContent = 'Begin Work Day';
        btn.onclick = () => {
            overlay.classList.remove('active');
            if (sidebar)  sidebar.classList.remove('hidden');
            if (gameView) { gameView.classList.add('active'); gameView.classList.remove('hidden'); }
            delete this.showGameView;   // restore base-class showGameView
            this.updateDayDisplay();
            this.displayScene('__nextPatient__');
        };
        overlay.appendChild(btn);

        const refBtn = document.createElement('button');
        refBtn.textContent = '📋 Reference Chart';
        refBtn.style.cssText = 'margin-top:14px;background:#e8f4fd;color:#2b6cb0;border:1.5px solid #bee3f8;border-radius:7px;padding:8px 20px;cursor:pointer;font-size:0.95em';
        let refPanel = null;
        refBtn.onclick = () => {
            if (refPanel && refPanel.parentNode) {
                refPanel.parentNode.removeChild(refPanel);
                refPanel = null;
                refBtn.textContent = '📋 Reference Chart';
            } else {
                refPanel = document.createElement('div');
                refPanel.style.cssText = 'margin-top:10px;padding:12px;background:#f0f4f8;border-radius:6px;font-size:0.88em;text-align:left;max-width:420px;margin-left:auto;margin-right:auto';
                refPanel.innerHTML = '<strong style="color:#1a365d">Hospital Reference — Known Diseases</strong>' +
                    '<table style="margin-top:8px;border-collapse:collapse;width:100%">' +
                    '<tr><th style="text-align:left;padding:4px 10px;color:#2b6cb0">Disease</th><th style="text-align:left;padding:4px 10px;color:#2b6cb0">Symptoms</th></tr>' +
                    '<tr><td style="padding:4px 10px">Pneumonia</td><td style="padding:4px 10px">Coughing, Fever, Chills, Shortness of breath</td></tr>' +
                    '<tr><td style="padding:4px 10px">Stroke</td><td style="padding:4px 10px">Weakness in one arm, Slurred speech</td></tr>' +
                    '<tr><td style="padding:4px 10px">Heart Attack</td><td style="padding:4px 10px">Chest pain, Shortness of breath</td></tr>' +
                    '<tr><td style="padding:4px 10px">Anxiety Attack</td><td style="padding:4px 10px">Rapid heart rate, Sweating, Trembling</td></tr>' +
                    '</table>';
                overlay.appendChild(refPanel);
                refBtn.textContent = '📋 Hide Reference';
            }
        };
        overlay.appendChild(refBtn);

        overlay.classList.add('active');
        this.showGameView = () => {};   // suppress base-class during intro
    }

    // Shows a 10-second choice window: side jobs keep continuousWork running; "Take a Break" resets it and starts 1-min break
    showBreakChoice(breakItem) {
        const container = document.getElementById('choices');

        // Countdown shown in the main panel #break-timer
        const breakTimerEl = document.getElementById('break-timer');
        let remaining = 10;
        if (breakTimerEl) breakTimerEl.textContent = 'Choose within ' + remaining + 's or break starts automatically.';

        const countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                if (breakTimerEl) breakTimerEl.textContent = 'Choose within ' + remaining + 's or break starts automatically.';
            } else {
                clearInterval(countdownInterval);
                if (breakTimerEl) breakTimerEl.textContent = '';
                cleanup();
                if (this.dataCollector) this.dataCollector.recordBreakDecision('Auto-Break');
                this.startActualBreak(breakItem);
            }
        }, 1000);

        const cleanup = () => {
            clearInterval(countdownInterval);
            if (breakTimerEl) breakTimerEl.textContent = '';
            container.innerHTML = '';
        };

        const sorted = this.sideJobs.slice().sort((a, b) => b.similarity - a.similarity);
        sorted.forEach(job => {
            const btn = document.createElement('button');
            btn.textContent = job.name +
                ' — Reward: ' + job.reward +
                ' | Trains: ' + job.actionItem;
            btn.onclick = () => {
                cleanup();
                if (this.dataCollector) this.dataCollector.recordBreakDecision(job.name);
                // continuousWork keeps counting — no reset, no onBreak
                this.runSideJobAction(job, '__nextPatient__', breakItem.expireScene);
            };
            container.appendChild(btn);
        });

        const breakBtn = document.createElement('button');
        breakBtn.textContent = 'Take a Break';
        breakBtn.onclick = () => {
            cleanup();
            if (this.dataCollector) this.dataCollector.recordBreakDecision('Take a Break');
            this.startActualBreak(breakItem);
        };
        container.appendChild(breakBtn);
    }

    // Starts the real break: resets continuousWork, shows coffee screen, returns to main job when done.
    // duration defaults to 60s; pass a shorter value when resuming after side-job inactivity.
    startActualBreak(_breakItem, duration = 60) {
        this.onBreak = true;
        this.continuousWorkTime = 0;
        this.updateContinuousWorkDisplay();
        this.updateCurrentJobDisplay();

        // Clear the break-scene story text so it doesn't linger during the actual break
        const storyEl = document.getElementById('scene-story');
        if (storyEl) storyEl.textContent = '';
        const titleEl = document.getElementById('scene-title');
        if (titleEl) titleEl.textContent = 'Break Time';

        // Replace choices area with coffee image for the duration of the break
        const container = document.getElementById('choices');
        container.innerHTML = '';
        const coffeeDiv = document.createElement('div');
        coffeeDiv.style.cssText = 'text-align:center;padding:24px';
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const durationStr = mins > 0
            ? mins + ' minute' + (mins > 1 ? 's' : '') + (secs > 0 ? ' ' + secs + 's' : '')
            : secs + ' seconds';
        coffeeDiv.innerHTML =
            '<div style="font-size:6em;line-height:1">☕</div>' +
            '<p style="margin-top:8px;color:#aaa;font-style:italic">Enjoy your break — back in ' + durationStr + '.</p>';
        container.appendChild(coffeeDiv);

        this.startBreakTimer(duration, () => {
            this.onBreak = false;
            this.stopBreakTimer();       // clears the "Break: 00:00" display text
            container.innerHTML = '';
            this.updateCurrentJobDisplay();
            this.displayScene('__nextPatient__');
        });
    }

    // Navigates into the side job's scene flow; '__return__' in those scenes maps back to returnScene.
    // sceneLookupKey is used to look up startSceneMap (defaults to returnScene if not provided).
    runSideJobAction(job, returnScene, sceneLookupKey) {
        this.stopBreakTimer();
        this.sideJobStartTime = Date.now();
        // Always show "Starting Next Shift" transition after side job completes
        this.pendingReturnScene = 'shiftTransition';
        this.onSideJob = true;
        this.activeSideJob = job;
        this.currentSideJobSession = {
            jobName:       job.name,
            startReward:   this.sideJobRewardsTotal,
            startCorrect:  this.totalCorrect,
            startAttempts: this.totalAttempts
        };
        this.updateCurrentJobDisplay();
        const lookupKey = sceneLookupKey || returnScene;
        let startScene;
        // For telemedicine in phase 3, route to transferability-specific scenes
        if (job.id === 'telemedicine' && this.phaseId === 3 && this.transferabilityMode !== null) {
            const pool = this.transferabilityMode === 1
                ? TRANSFERABILITY_SCENES.high
                : TRANSFERABILITY_SCENES.low;
            startScene = pool[Math.floor(Math.random() * pool.length)];
        } else if (job.startScenes && job.startScenes.length > 0) {
            startScene = job.startScenes[Math.floor(Math.random() * job.startScenes.length)];
        } else {
            startScene = job.startScene ||
                (job.startSceneMap && job.startSceneMap[lookupKey]);
        }
        this.displayScene(startScene);
    }

    // Also stop the continuousWorkTimer and any pending auto-advance when the main timer stops
    stopTimer() {
        super.stopTimer();
        clearInterval(this.continuousWorkInterval);
        clearTimeout(this.autoAdvanceTimeout);
        clearInterval(this.autoAdvanceCountdownInterval);
        clearTimeout(this.inactivityTimeout);
        clearInterval(this._inactivityCountdownInterval);
    }

    storeGameData() {
        // Phase 0 (tutorial) data is not stored
        if (this.phaseId === 0) return;
        const prefix = 'p' + this.phaseId + '_';
        const elapsedSec = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
        try {
            const QSE = Qualtrics.SurveyEngine;
            QSE.setEmbeddedData(prefix + 'gameDuration',         elapsedSec);
            QSE.setEmbeddedData(prefix + 'finalScore',           this.score);
            QSE.setEmbeddedData(prefix + 'telemedicineSessions', this.telemedicineCount);
            QSE.setEmbeddedData(prefix + 'totalReward',          this.totalReward);
            QSE.setEmbeddedData(prefix + 'continuousWorkTime',   this.continuousWorkTime);
            QSE.setEmbeddedData(prefix + 'patientResults',       JSON.stringify(this.patientResults));
            QSE.setEmbeddedData(prefix + 'sideJobSessions',      JSON.stringify(this.sideJobSessions));
            if (this.transferabilityMode !== null) {
                QSE.setEmbeddedData('transferability', this.transferabilityMode);
            }
        } catch(e) {
            console.warn('storeGameData: Qualtrics not available', e);
        }
    }

    getStats() {
        return {
            score: this.score,
            telemedicineCount: this.telemedicineCount,
            duration: this.startTime ? Date.now() - this.startTime : 0,
            totalReward: this.totalReward,
            continuousWorkTime: this.continuousWorkTime,
            accuracy: this.accuracy,
            patientResults: this.patientResults,
            sideJobSessions: this.sideJobSessions
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
        this.patientResults = [];
        this.sideJobSessions = [];
        this.currentSideJobSession = null;
        this.dayIndex = 0;
        this.shiftIndex = 0;
        this.patientsThisShift = 0;

        // Build and shuffle patient queue from phase pool or fall back to Phase 1 default
        const pool = (this.patientPool && this.patientPool.length > 0)
            ? this.patientPool.slice()
            : PHASE1_PATIENTS.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        this.patientQueue = pool;

        // Show sidebar immediately (PhaseOrchestrator flow doesn't use showIntroScreen overlay)
        const sidebar = document.getElementById('progress-sidebar');
        if (sidebar) sidebar.classList.remove('hidden');
        const gameView = document.getElementById('game-view');
        if (gameView) { gameView.classList.add('active'); gameView.classList.remove('hidden'); }
        const overlay = document.getElementById('intro-overlay');
        if (overlay) overlay.classList.remove('active');

        // Restore showGameView (may have been suppressed by showIntroScreen)
        delete this.showGameView;

        // Assign transferability mode for Phase 3 only
        if (this.phaseId === 3) {
            this.transferabilityMode = Math.random() < 0.5 ? 0 : 1;
        } else {
            this.transferabilityMode = null;
        }

        this.updateDayDisplay();
        this.updateTransferabilityDisplay();
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
// Side-job factory
// =============================================================================

function buildAllSideJobs() {
    return {
        telemedicine: new SideJob({
            id: 'telemedicine',
            name: 'Telemedicine',
            actionItem: 'choices',
            reward: 5,
            similarity: 0.8,
            startScenes: ['telemedicine1', 'telemedicine2']
        }),
        medschool: new SideJob({
            id: 'medschool',
            name: 'Medical School',
            actionItem: 'knowledge',
            reward: 0,
            similarity: 0.5,
            startScene: 'medSchoolStart'
        }),
        uber: new SideJob({
            id: 'uber',
            name: 'Ride Sharing',
            actionItem: 'driving',
            reward: .5,
            similarity: 0.3,
            startScene: 'uberStart'
        })
    };
}


// =============================================================================
// PhaseOrchestrator — sequences phases and owns the DataCollector
// =============================================================================

class PhaseOrchestrator {
    constructor(config) {
        this.Q             = config.Q;
        this.scenes        = config.scenes;
        this.allSideJobs   = config.allSideJobs;
        this.dataCollector = config.dataCollector;
        this.onComplete    = config.onComplete || null;
        this.phaseOrder    = PHASE_CONFIG.phaseOrder;
        this.phaseIndex    = 0;
        this.currentInstance = null;
    }

    start() {
        this.phaseIndex = 0;
        this._launchPhase(this.phaseOrder[0]);
    }

    _launchPhase(phaseId) {
        const phaseCfg  = PHASE_CONFIG.phases[phaseId];
        this.dataCollector.setPhase(phaseId);

        const sideJobs  = (phaseCfg.sideJobMenu || [])
            .map(id => this.allSideJobs[id])
            .filter(Boolean);

        const patientPool = PATIENT_POOLS[phaseCfg.patientPool] || [];

        this.currentInstance = new MainJobGameInstance({
            Q:             this.Q,
            scenes:        this.scenes,
            startScene:    phaseCfg.startScene,
            sideJobs:      sideJobs,
            phaseId:       phaseId,
            phaseCfg:      phaseCfg,
            patientPool:   patientPool,
            dataCollector: this.dataCollector,
            onPhaseEnd:    (stats) => {
                this.dataCollector.saveToQualtrics();
                this.phaseIndex++;
                if (this.phaseIndex < this.phaseOrder.length) {
                    this._launchPhase(this.phaseOrder[this.phaseIndex]);
                } else if (this.onComplete) {
                    this.onComplete(stats);
                }
            }
        });

        this.currentInstance.start();
    }
}


// =============================================================================
// Qualtrics entry point
// =============================================================================

Qualtrics.SurveyEngine.addOnload(function() {
    const Q = this;
    Q.disableNextButton();

    const dataCollector = new DataCollector();
    const allSideJobs   = buildAllSideJobs();

    const orchestrator = new PhaseOrchestrator({
        Q:             Q,
        scenes:        ALL_SCENES.scenes,
        allSideJobs:   allSideJobs,
        dataCollector: dataCollector,
        onComplete:    () => { Q.enableNextButton(); }
    });

    orchestrator.start();
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
            choices: [{ text: "Yes, I'm ready!", next: '__nextPatient__' }]
        },
        patient1: {
            title: "Patient ID: 1",
            story: "John presents with fever, persistent coughing, and shortness of breath. What is your diagnosis?",
            choices: [
                { text: "Pneumonia",    next: '__nextPatient__', correct: true  },
                { text: "Flu",          next: '__nextPatient__', correct: false },
                { text: "Stroke",       next: '__nextPatient__', correct: false },
                { text: "Heart Attack", next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient2: {
            title: "Patient ID: 2",
            story: "Jane has sudden weakness in her left arm and is having difficulty speaking clearly. What is your diagnosis?",
            choices: [
                { text: "Stroke",         next: '__nextPatient__', correct: true  },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient3: {
            title: "Patient ID: 3",
            story: "Robert is a 52-year-old male with a heart condition. Calculate the correct medication dose based on his weight of 80kg. Each kg requires 0.5 units.",
            actionItems: [
                { type: 'slider', correctValue: 40, nextScene: '__nextPatient__', hint: 'Multiply the weight (80kg) by the dosage per kg (0.5 units).' }
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
            choices: [{ text: "Start Next Shift", next: '__nextPatient__' }]
        },
        telemedicine1: {
            title: "Telemedicine Session 1",
            story: "Welcome to your first telemedicine session. Enter your session password to access the portal.",
            actionItems: [{ type: 'teleLogin', nextScene: 'telePatient1_1' }]
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
            title: "Patient ID: 4",
            story: "Ishan is a 45-year-old male reporting acute chest pressure and sudden shortness of breath. He is sweating and pale. What is your diagnosis?",
            choices: [
                { text: "Heart Attack",   next: '__nextPatient__', correct: true  },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
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
            choices: [{ text: "Start Next Shift", next: '__nextPatient__' }]
        },
        telemedicine2: {
            title: "Telemedicine Session 2",
            story: "Welcome back to the telemedicine portal. Enter your session password to continue.",
            actionItems: [{ type: 'teleLogin', nextScene: 'telePatient2_1' }]
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

        // ── High-transferability telemedicine (alien diseases only) ─────────
        telemedicine1_alien: {
            title: "Telemedicine Session 1",
            story: "Welcome to your first telemedicine session. Enter your session password to access the portal.",
            actionItems: [{ type: 'teleLogin', nextScene: 'teleAlien1_1' }]
        },
        teleAlien1_1: {
            title: "Telemedicine Patient 1",
            story: "A patient reports patches of glowing blue skin and hears a constant low-frequency hum. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",    next: 'teleAlien1_1Correct' },
                { text: "Null-Field Exposure", next: 'teleAlien1_1Wrong'   }
            ]
        },
        teleAlien1_1Correct: {
            title: "Correct",
            story: "The glowing blue skin patches and low-frequency humming are classic signs of Vorpal Syndrome. Proceed to the next patient.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine patient", next: 'teleAlien1_2' }]
        },
        teleAlien1_1Wrong: {
            title: "Incorrect",
            story: "Those symptoms point to Vorpal Syndrome, not Null-Field Exposure.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine Patient", next: 'teleAlien1_2' }]
        },
        teleAlien1_2: {
            title: "Telemedicine Patient 2",
            story: "A patient is spontaneously levitating and reports hearing colors. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure", next: 'teleAlien1_2Correct' },
                { text: "Vorpal Syndrome",      next: 'teleAlien1_2Wrong'   }
            ]
        },
        teleAlien1_2Correct: {
            title: "Correct",
            story: "Spontaneous levitation and cross-sensory perception (hearing colors) indicate Null-Field Exposure.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        teleAlien1_2Wrong: {
            title: "Incorrect",
            story: "Those symptoms indicate Null-Field Exposure, not Vorpal Syndrome.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        telemedicine2_alien: {
            title: "Telemedicine Session 2",
            story: "Welcome back to the telemedicine portal. Enter your session password to continue.",
            actionItems: [{ type: 'teleLogin', nextScene: 'teleAlien2_1' }]
        },
        teleAlien2_1: {
            title: "Telemedicine Patient 2.1",
            story: "A patient has vivid glowing patches spreading across their skin and complains of a persistent low hum they can feel in their bones. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",    next: 'teleAlien2_1Correct' },
                { text: "Null-Field Exposure", next: 'teleAlien2_1Wrong'   }
            ]
        },
        teleAlien2_1Correct: {
            title: "Correct",
            story: "Glowing skin patches and low-frequency humming confirm Vorpal Syndrome. Proceed to the next patient.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine patient", next: 'teleAlien2_2' }]
        },
        teleAlien2_1Wrong: {
            title: "Incorrect",
            story: "Those symptoms point to Vorpal Syndrome, not Null-Field Exposure.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Next Telemedicine Patient", next: 'teleAlien2_2' }]
        },
        teleAlien2_2: {
            title: "Telemedicine Patient 2.2",
            story: "A patient calls in claiming they just floated off their chair and are now experiencing visual sounds. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure", next: 'teleAlien2_2Correct' },
                { text: "Vorpal Syndrome",      next: 'teleAlien2_2Wrong'   }
            ]
        },
        teleAlien2_2Correct: {
            title: "Correct",
            story: "Spontaneous levitation and synesthetic perception are hallmarks of Null-Field Exposure.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },
        teleAlien2_2Wrong: {
            title: "Incorrect",
            story: "Those symptoms indicate Null-Field Exposure, not Vorpal Syndrome.",
            actionItems: [{ type: 'incrementTelemedicine' }],
            choices: [{ text: "Return to Break room", next: '__return__' }]
        },

        patient5: {
            title: "Patient ID: 5",
            story: "Alex, 38, requires a beta-blocker for a cardiac arrhythmia. His weight is 70 kg and the prescribed dose is 0.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 35, nextScene: '__nextPatient__', hint: 'Multiply 70 kg × 0.5 mg/kg.' }
            ]
        },
        endScene: {
            title: "Week Complete!",
            story: "Your week is over. Review your patient diagnoses below.",
            actionItems: [{ type: 'endGame' }]
        },

        patient6: {
            title: "Patient ID: 6",
            story: "Maria, 28, presents with fever, cough, sore throat, and a congested nose. What is your diagnosis?",
            choices: [
                { text: "Flu",            next: '__nextPatient__', correct: true  },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Migraine",       next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient7: {
            title: "Patient ID: 7",
            story: "Carlos, 65, needs an anticoagulant before surgery. His weight is 90 kg and the prescribed dose is 0.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 45, nextScene: '__nextPatient__', hint: 'Multiply 90 kg × 0.5 mg/kg.' }
            ]
        },
        patient8: {
            title: "Patient ID: 8",
            story: "Sarah, 40, reports a sudden racing heart, profuse sweating, and uncontrollable trembling. She says it came on out of nowhere. What is your diagnosis?",
            choices: [
                { text: "Anxiety Attack", next: '__nextPatient__', correct: true  },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient9: {
            title: "Patient ID: 9",
            story: "David, 72, requires a diuretic for fluid retention. His weight is 100 kg and the prescribed dose is 0.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 50, nextScene: '__nextPatient__', hint: 'Multiply 100 kg × 0.5 mg/kg.' }
            ]
        },
        patient10: {
            title: "Patient ID: 10",
            story: "Lisa, 35, has had a throbbing headache for two hours and cannot tolerate bright light. What is your diagnosis?",
            choices: [
                { text: "Migraine",       next: '__nextPatient__', correct: true  },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient11: {
            title: "Patient ID: 11",
            story: "Tom, 52, needs a post-operative painkiller. His weight is 110 kg and the prescribed dose is 0.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 55, nextScene: '__nextPatient__', hint: 'Multiply 110 kg × 0.5 mg/kg.' }
            ]
        },
        patient12: {
            title: "Patient ID: 12",
            story: "Emma, 33, is shaking, sweating, and feels her heart pounding. She just received unexpected news. What is your diagnosis?",
            choices: [
                { text: "Anxiety Attack", next: '__nextPatient__', correct: true  },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient13: {
            title: "Patient ID: 13",
            story: "James, 47, needs an antibiotic for a bacterial infection. His weight is 60 kg and the prescribed dose is 1 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 60, nextScene: '__nextPatient__', hint: 'Multiply 60 kg × 1 mg/kg.' }
            ]
        },
        patient14: {
            title: "Patient ID: 14",
            story: "Sophie, 26, has a severe one-sided headache lasting three hours, worsened by any light. What is your diagnosis?",
            choices: [
                { text: "Migraine",       next: '__nextPatient__', correct: true  },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient15: {
            title: "Patient ID: 15",
            story: "Michael, 60, requires an anti-inflammatory after a joint procedure. His weight is 70 kg and the prescribed dose is 1 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 70, nextScene: '__nextPatient__', hint: 'Multiply 70 kg × 1 mg/kg.' }
            ]
        },
        patient16: {
            title: "Patient ID: 16",
            story: "Hannah, 43, has had a sore throat, runny nose, mild fever, and a dry cough for two days. What is your diagnosis?",
            choices: [
                { text: "Flu",            next: '__nextPatient__', correct: true  },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Migraine",       next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient17: {
            title: "Patient ID: 17",
            story: "Chris, 57, needs a sedative before a procedure. His weight is 75 kg and the prescribed dose is 1 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 75, nextScene: '__nextPatient__', hint: 'Multiply 75 kg × 1 mg/kg.' }
            ]
        },
        patient18: {
            title: "Patient ID: 18",
            story: "Priya, 34, is trembling and hyperventilating. She says her heart is racing and she feels a sense of dread. What is your diagnosis?",
            choices: [
                { text: "Anxiety Attack", next: '__nextPatient__', correct: true  },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient19: {
            title: "Patient ID: 19",
            story: "Kevin, 68, needs an analgesic after surgery. His weight is 40 kg and the prescribed dose is 2 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 80, nextScene: '__nextPatient__', hint: 'Multiply 40 kg × 2 mg/kg.' }
            ]
        },
        patient20: {
            title: "Patient ID: 20",
            story: "Amy, 41, requires an anticoagulant for a blood clot. Her weight is 60 kg and the prescribed dose is 1.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 90, nextScene: '__nextPatient__', hint: 'Multiply 60 kg × 1.5 mg/kg.' }
            ]
        },

        // ── Alien disease scenes ──────────────────────────────────────────────
        alienPatient1: {
            title: "Unknown Patient",
            story: "Patient ZX-9 presents with glowing blue skin patches and emits a low-frequency hum. This condition does not appear in your standard reference materials. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",    next: '__nextPatient__', correct: true  },
                { text: "Null-Field Exposure", next: '__nextPatient__', correct: false },
                { text: "Pneumonia",           next: '__nextPatient__', correct: false },
                { text: "Heart Attack",        next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient2: {
            title: "Unknown Patient",
            story: "Patient QT-3 experiences brief spontaneous levitation and reports that they can 'hear' colors. This condition is not in your reference table. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure", next: '__nextPatient__', correct: true  },
                { text: "Vorpal Syndrome",      next: '__nextPatient__', correct: false },
                { text: "Stroke",               next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack",        next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },

        alienPatient3: {
            title: "Unknown Patient",
            story: "Patient RX-5 has faintly glowing patches along their neck and arms that pulse with a soft hum. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",     next: '__nextPatient__', correct: true  },
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: false },
                { text: "Flu",                  next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack",        next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient4: {
            title: "Unknown Patient",
            story: "Patient QK-7 floated twelve inches off the exam table and claims everything they see has a sound. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: true  },
                { text: "Vorpal Syndrome",       next: '__nextPatient__', correct: false },
                { text: "Stroke",                next: '__nextPatient__', correct: false },
                { text: "Pneumonia",             next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient5: {
            title: "Unknown Patient",
            story: "Patient ZT-2 emits a steady low harmonic tone and has bioluminescent streaks across their torso. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",     next: '__nextPatient__', correct: true  },
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: false },
                { text: "Heart Attack",          next: '__nextPatient__', correct: false },
                { text: "Migraine",              next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient6: {
            title: "Unknown Patient",
            story: "Patient BM-4 drifts upward when standing and describes tasting music. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: true  },
                { text: "Vorpal Syndrome",       next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack",         next: '__nextPatient__', correct: false },
                { text: "Stroke",                 next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient7: {
            title: "Unknown Patient",
            story: "Patient YP-9 appears to glow softly in dim light and makes a vibrating hum with each exhale. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",     next: '__nextPatient__', correct: true  },
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: false },
                { text: "Pneumonia",             next: '__nextPatient__', correct: false },
                { text: "Heart Attack",          next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient8: {
            title: "Unknown Patient",
            story: "Patient LX-3 rose to the ceiling spontaneously and can identify colors by their smell. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: true  },
                { text: "Vorpal Syndrome",       next: '__nextPatient__', correct: false },
                { text: "Flu",                   next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack",         next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient9: {
            title: "Unknown Patient",
            story: "Patient WZ-6 has luminous blue patterns spreading across their skin and a constant resonant hum. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Vorpal Syndrome",     next: '__nextPatient__', correct: true  },
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: false },
                { text: "Stroke",               next: '__nextPatient__', correct: false },
                { text: "Migraine",             next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        alienPatient10: {
            title: "Unknown Patient",
            story: "Patient FC-8 keeps briefly levitating and insists they can hear the color red. Your reference materials have no record of this. What is your diagnosis?",
            choices: [
                { text: "Null-Field Exposure",  next: '__nextPatient__', correct: true  },
                { text: "Vorpal Syndrome",       next: '__nextPatient__', correct: false },
                { text: "Pneumonia",             next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack",         next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },

        // ── Medical School scenes ─────────────────────────────────────────────
        medSchoolStart: {
            title: "Medical School — Full Reference",
            story: "Study the complete disease reference table. You will return to your shift automatically in 30 seconds.",
            chart: `<table>
                <tr><th>Disease</th><th>Symptoms</th></tr>
                <tr><td>Pneumonia</td><td>Coughing, Fever, Chills, Shortness of breath</td></tr>
                <tr><td>Stroke</td><td>Weakness in one arm, Slurred speech</td></tr>
                <tr><td>Heart Attack</td><td>Chest pain, Shortness of breath</td></tr>
                <tr><td>Anxiety Attack</td><td>Rapid heart rate, Sweating, Trembling</td></tr>
                <tr><td>Migraine</td><td>Throbbing one-sided headache, Light sensitivity</td></tr>
                <tr><td>Flu</td><td>Fever, Sore throat, Runny nose, Dry cough</td></tr>
                <tr><td colspan="2" style="padding-top:8px;font-style:italic;color:#888">Alien Diseases</td></tr>
                <tr><td>Vorpal Syndrome</td><td>Glowing blue skin patches, Low-frequency humming</td></tr>
                <tr><td>Null-Field Exposure</td><td>Spontaneous levitation, Hearing colors (cross-sensory)</td></tr>
            </table>`,
            choices: [{ text: "Return to shift early", next: '__return__' }],
            autoAdvance: { delay: 30000, next: '__return__' }
        },
        medSchool_alien: {
            title: "Medical School — Alien Diseases",
            story: "Review the alien disease reference table below.",
            chart: `<table>
                <tr><th>Disease</th><th>Symptoms</th></tr>
                <tr><td>Vorpal Syndrome</td><td>Glowing blue skin patches, Low-frequency humming</td></tr>
                <tr><td>Null-Field Exposure</td><td>Spontaneous levitation, Hearing colors (cross-sensory)</td></tr>
            </table>`,
            choices: [{ text: "Return to break", next: '__return__' }]
        },
        medSchool_dose1: {
            title: "Medical School: Dosage Calculation",
            story: "A patient weighs 60 kg. The prescribed medication requires 0.5 mg per kg. What is the correct total dose in mg? (Hint: 60 × 0.5)",
            actionItems: [{ type: 'slider', correctValue: 30, nextScene: '__return__', hint: 'Multiply the weight (60 kg) by the dose per kg (0.5 mg).' }]
        },
        medSchool_dose2: {
            title: "Medical School: Dosage Calculation",
            story: "A patient weighs 70 kg. The prescribed medication requires 0.5 mg per kg. What is the correct total dose in mg? (Hint: 70 × 0.5)",
            actionItems: [{ type: 'slider', correctValue: 35, nextScene: '__return__', hint: 'Multiply the weight (70 kg) by the dose per kg (0.5 mg).' }]
        },

        // ── Ride Sharing scenes ───────────────────────────────────────────────
        uberStart: {
            title: "Ride Sharing: New Shift",
            story: "Drive your car (🚗) to pick up customers (🧍). A new customer appears every 5 seconds. You have 60 seconds — pick up as many as you can!",
            choices: [{ text: "Start driving", next: 'uberDrive' }],
            autoAdvance: { delay: 5000, next: 'uberDrive' }
        },
        uberDrive: {
            title: "Ride Sharing: On the Road",
            story: "Use arrow keys to move.",
            actionItems: [{ type: 'uberGame', nextScene: '__return__' }]
        },
        shiftTransition: {
            title: "Starting Next Shift",
            story: "Get ready — your next patients are waiting.",
            autoAdvance: { delay: 5000, next: '__nextPatient__' }
        },
        dayTransition: {
            title: "Day Complete!",
            story: "Rest up. Tomorrow starts soon.",
            autoAdvance: { delay: 5000, next: '__nextPatient__' }
        },

        // ── Phase 3 new patients (patient21–patient30) ────────────────────────
        patient21: {
            title: "Patient ID: 21",
            story: "Elena, 55, has had a high fever, productive cough, and chills for three days. She is short of breath. What is your diagnosis?",
            choices: [
                { text: "Pneumonia",      next: '__nextPatient__', correct: true  },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Migraine",       next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient22: {
            title: "Patient ID: 22",
            story: "Marcus, 44, requires a blood thinner before hip surgery. His weight is 80 kg and the prescribed dose is 0.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 40, nextScene: '__nextPatient__', hint: 'Multiply 80 kg × 0.5 mg/kg.' }
            ]
        },
        patient23: {
            title: "Patient ID: 23",
            story: "Yuki, 68, suddenly cannot move her right arm and is slurring her words. What is your diagnosis?",
            choices: [
                { text: "Stroke",         next: '__nextPatient__', correct: true  },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient24: {
            title: "Patient ID: 24",
            story: "Luca, 61, needs a diuretic for congestive heart failure. His weight is 120 kg and the prescribed dose is 0.5 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 60, nextScene: '__nextPatient__', hint: 'Multiply 120 kg × 0.5 mg/kg.' }
            ]
        },
        patient25: {
            title: "Patient ID: 25",
            story: "Fatima, 50, has crushing chest pain radiating to her left arm and is pale and sweaty. What is your diagnosis?",
            choices: [
                { text: "Heart Attack",   next: '__nextPatient__', correct: true  },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient26: {
            title: "Patient ID: 26",
            story: "Ravi, 36, needs a sedative before an MRI. His weight is 65 kg and the prescribed dose is 1 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 65, nextScene: '__nextPatient__', hint: 'Multiply 65 kg × 1 mg/kg.' }
            ]
        },
        patient27: {
            title: "Patient ID: 27",
            story: "Nadia, 29, is shaking, sweating, and her heart is racing. She says the feeling came on suddenly with no clear cause. What is your diagnosis?",
            choices: [
                { text: "Anxiety Attack", next: '__nextPatient__', correct: true  },
                { text: "Heart Attack",   next: '__nextPatient__', correct: false },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient28: {
            title: "Patient ID: 28",
            story: "Owen, 73, needs an analgesic infusion after knee replacement. His weight is 85 kg and the prescribed dose is 1 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 85, nextScene: '__nextPatient__', hint: 'Multiply 85 kg × 1 mg/kg.' }
            ]
        },
        patient29: {
            title: "Patient ID: 29",
            story: "Sera, 31, has a severe one-sided headache with nausea and cannot tolerate any light or sound. What is your diagnosis?",
            choices: [
                { text: "Migraine",       next: '__nextPatient__', correct: true  },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Flu",            next: '__nextPatient__', correct: false },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        patient30: {
            title: "Patient ID: 30",
            story: "Jin, 58, requires an anticoagulant after a cardiac procedure. His weight is 70 kg and the prescribed dose is 1.1 mg per kg. Calculate the correct total dose in mg.",
            actionItems: [
                { type: 'slider', correctValue: 77, nextScene: '__nextPatient__', hint: 'Multiply 70 kg × 1.1 mg/kg.' }
            ]
        },

        // ── Tutorial scenes ───────────────────────────────────────────────────
        tutorialIntro: {
            title: "Welcome to the Work Simulator",
            story: "You are a hospital doctor working a 5-day week. Each shift you will see patients, diagnose illnesses, and calculate medication doses. During breaks you can earn extra money through side jobs. Let's walk through each mechanic now.",
            choices: [{ text: "Let's begin the tutorial →", next: 'tutorial_hospital_intro' }]
        },
        tutorial_hospital_intro: {
            title: "Your Main Job: Hospital Doctor",
            story: "At the hospital you will see a series of patients. For each patient, read their symptoms carefully and choose the correct diagnosis. A correct diagnosis earns you $15. An incorrect one costs you $5. You may also skip for no reward or penalty.",
            choices: [{ text: "Try a diagnosis now →", next: 'tutorial_hospital_patient' }]
        },
        tutorial_hospital_patient: {
            title: "Practice: Diagnose a Patient",
            story: "John presents with fever, persistent coughing, and shortness of breath. What is your diagnosis?",
            choices: [
                { text: "Pneumonia (correct)", next: 'tutorial_hospital_dose_intro' },
                { text: "Flu",                 next: 'tutorial_hospital_dose_intro' },
                { text: "Stroke",              next: 'tutorial_hospital_dose_intro' },
                { text: "Heart Attack",        next: 'tutorial_hospital_dose_intro' }
            ]
        },
        tutorial_hospital_dose_intro: {
            title: "Dosage Calculation Tasks",
            story: "Some patients require a medication dose calculated from their body weight. You will use a slider to select the dose in milligrams. The formula is always: weight (kg) × dose per kg (mg/kg) = total dose (mg).",
            choices: [{ text: "Try a dosage calculation →", next: 'tutorial_hospital_dose' }]
        },
        tutorial_hospital_dose: {
            title: "Practice: Calculate a Dose",
            story: "A patient weighs 80 kg. The prescribed medication requires 0.5 mg per kg. Move the slider to the correct total dose in mg. (Hint: 80 × 0.5 = 40)",
            actionItems: [
                { type: 'slider', correctValue: 40, nextScene: 'tutorial_tele_intro', hint: 'Multiply 80 kg × 0.5 mg/kg.' }
            ]
        },
        tutorial_tele_intro: {
            title: "Side Job: Telemedicine",
            story: "Between shifts you can take side jobs. Telemedicine lets you consult with remote patients and earn $5 per session. It is the most similar to your hospital work. Try a telemedicine case now.",
            choices: [{ text: "Open a telemedicine case →", next: 'tutorial_tele_case' }]
        },
        tutorial_tele_case: {
            title: "Telemedicine Practice",
            story: "A remote patient reports a sudden throbbing headache on one side that worsens with light. What is your diagnosis?",
            choices: [
                { text: "Migraine", next: 'tutorial_tele_correct' },
                { text: "Flu",      next: 'tutorial_tele_wrong'   }
            ]
        },
        tutorial_tele_correct: {
            title: "Correct!",
            story: "Great — Migraine is right. The one-sided throbbing headache and light sensitivity are classic signs. You've earned your telemedicine bonus.",
            choices: [{ text: "Next →", next: 'tutorial_uber_intro' }]
        },
        tutorial_tele_wrong: {
            title: "Incorrect",
            story: "Not quite — the correct answer is Migraine (one-sided throbbing headache, light sensitivity). Keep the reference chart in mind! Moving on.",
            choices: [{ text: "Next →", next: 'tutorial_uber_intro' }]
        },
        tutorial_uber_intro: {
            title: "Side Job: Ride Sharing",
            story: "Ride Sharing lets you drive (🚗) and pick up customers (🧍) on a city grid using the arrow keys. Each pickup earns you money. You have 60 seconds per shift. Let's do a quick drive.",
            choices: [{ text: "Start driving →", next: 'tutorial_uber_drive' }],
            autoAdvance: { delay: 6000, next: 'tutorial_uber_drive' }
        },
        tutorial_uber_drive: {
            title: "Ride Sharing: Practice Drive",
            story: "Use arrow keys to steer. Pick up as many customers as you can!",
            actionItems: [{ type: 'uberGame', nextScene: 'tutorial_medschool_intro' }]
        },
        tutorial_medschool_intro: {
            title: "Side Job: Medical School",
            story: "Medical School gives you free access to the full disease reference table — useful when you encounter unfamiliar conditions. There is no monetary reward, but the knowledge pays off. Let's take a quick look.",
            choices: [{ text: "Open the reference table →", next: 'tutorial_medschool' }]
        },
        tutorial_medschool: {
            title: "Medical School — Full Reference",
            story: "Study the disease reference below. It will disappear in 15 seconds, or you can continue early.",
            chart: `<table>
                <tr><th>Disease</th><th>Symptoms</th></tr>
                <tr><td>Pneumonia</td><td>Coughing, Fever, Chills, Shortness of breath</td></tr>
                <tr><td>Stroke</td><td>Weakness in one arm, Slurred speech</td></tr>
                <tr><td>Heart Attack</td><td>Chest pain, Shortness of breath</td></tr>
                <tr><td>Anxiety Attack</td><td>Rapid heart rate, Sweating, Trembling</td></tr>
                <tr><td>Migraine</td><td>Throbbing one-sided headache, Light sensitivity</td></tr>
                <tr><td>Flu</td><td>Fever, Sore throat, Runny nose, Dry cough</td></tr>
            </table>`,
            choices: [{ text: "Continue →", next: 'tutorial_pay_explain' }],
            autoAdvance: { delay: 15000, next: 'tutorial_pay_explain' }
        },
        tutorial_pay_explain: {
            title: "How Pay Works",
            story: "Here is a summary of your earnings: Correct hospital diagnosis = +$15 | Wrong diagnosis = -$5 | Skip = $0 | Correct telemedicine = +$5 | Ride Sharing pickups = variable | Medical School = $0 (knowledge only). Your total reward is shown in the sidebar at all times.",
            choices: [{ text: "I'm ready — begin Phase 1 →", next: '__phaseEnd__' }]
        },

        // ── Phase intro / transition scenes ───────────────────────────────────
        phase1Intro: {
            title: "Phase 1 — Begin Your Week",
            story: "Welcome to Phase 1. You will work 5 days, 3 shifts per day, seeing 2 patients per shift (30 patients total). During each break you can choose a side job or rest. Good luck!",
            choices: [{ text: "Start my first shift →", next: '__nextPatient__' }]
        },
        phase3Intro: {
            title: "Phase 3 — New Patient Cohort",
            story: "Welcome to Phase 3. You will see a fresh set of patients over another 5-day week. Side jobs are available during breaks as before. This phase introduces a transferability condition: you have been randomly assigned to either High Transferability (your Telemedicine cases will feature a different type of patient) or Low Transferability (Telemedicine cases match your hospital patients). Your assigned condition is shown at the top of the screen.",
            choices: [{ text: "Start Phase 3 →", next: '__nextPatient__' }]
        }
    }
};

// Single merged scene object used by PhaseOrchestrator
const ALL_SCENES = TELEMEDICINE_SCENES;
