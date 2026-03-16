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
        this.mainJobRewardRate = 15;
        this.mainJobPenalty = 5;
        this.mainJobRewardsTotal = 0;
        this.telemedicineReward = 5;
        this.patientQueue = [];
        this.patientsDone = 0;
        this.patientResults = [];  // { scene, answer, correct, skipped } per main-job patient
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

    updateCurrentJobDisplay() {
        const el = document.getElementById('current-job');
        if (!el) return;
        let label;
        if (this.onBreak) {
            label = 'On Break';
        } else if (this.onSideJob && this.activeSideJob) {
            label = this.activeSideJob.name;
        } else {
            label = 'Hospital';
        }
        el.textContent = 'Current Job: ' + label;
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
            if (input.value === password) {
                container.innerHTML = '';
                this.displayScene(item.nextScene);
            } else {
                input.value = '';
                err.style.display = '';
            }
        };
        container.appendChild(btn);
    }

    renderPatientSummary() {
        const LABELS = {
            patient1: 'John', patient2: 'Jane', patient3: 'Robert',
            patient4: 'Ishan', patient5: 'Alex',
            alienPatient1: 'Patient ZX-9', alienPatient2: 'Patient QT-3'
        };
        const CORRECT_DX = {
            patient1: 'Pneumonia', patient2: 'Stroke', patient3: 'Heart Attack',
            patient4: 'Heart Attack', patient5: 'Heart Attack',
            alienPatient1: 'Vorpal Syndrome', alienPatient2: 'Null-Field Exposure'
        };

        const chartEl = document.getElementById('disease-chart');
        let html = '<h3>Patient Results</h3><table style="border-collapse:collapse;width:100%">';
        html += '<tr><th>Patient</th><th>Your Diagnosis</th><th>Correct Diagnosis</th><th>Result</th></tr>';

        this.patientResults.forEach(r => {
            const label = LABELS[r.scene] || r.scene;
            const correct = CORRECT_DX[r.scene] || '?';
            let result, color;
            if (r.skipped) {
                result = 'Skipped (0)'; color = '#888';
            } else if (r.correct === true) {
                result = '+' + this.mainJobRewardRate; color = '#2ecc71';
            } else {
                result = '-' + this.mainJobPenalty; color = '#e74c3c';
            }
            html += '<tr style="border-bottom:1px solid #444">' +
                '<td style="padding:4px 8px">' + label + '</td>' +
                '<td style="padding:4px 8px">' + (r.answer || '—') + '</td>' +
                '<td style="padding:4px 8px">' + correct + '</td>' +
                '<td style="padding:4px 8px;color:' + color + '">' + result + '</td>' +
                '</tr>';
        });
        html += '</table>';
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
        const W = canvas.width, H = canvas.height;

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
            if (choice.correct === true) {
                this.totalCorrect++;
                this.mainJobRewardsTotal += this.mainJobRewardRate;
            } else if (choice.correct === false) {
                this.mainJobRewardsTotal -= this.mainJobPenalty;
            }
            // skip: +0, no change
            this.patientResults.push({
                scene: fromKey,
                answer: choice.text,
                correct: choice.correct,
                skipped: !!choice.skip
            });
            this.updateTotalRewardDisplay();
            return;
        }
        // Telemedicine: uses Correct/Wrong in destination key
        if (toKey.includes('Correct') || toKey.includes('Wrong')) {
            this.totalAttempts++;
            if (toKey.includes('Correct')) {
                this.totalCorrect++;
                if (this.onSideJob) {
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
            this.updateCurrentJobDisplay();
        }

        if (sceneKey === '__nextPatient__') {
            const n = this.patientsDone;
            this.patientsDone++;
            if      (n === 3) sceneKey = 'startBreak';
            else if (n === 6) sceneKey = 'startBreak2';
            else if (n === 9) sceneKey = 'endScene';
            else              sceneKey = this.patientQueue.shift();
        }

        const scene = this.scenes[sceneKey];
        const breakItem = scene.actionItems && scene.actionItems.find(item => item.type === 'breakTimer');

        super.displayScene(sceneKey);
        this.updateTotalRewardDisplay();

        if (breakItem) {
            this.showBreakChoice(breakItem);
        }

        // Add reference-chart toggle button for main-job patient scenes
        if (/^(patient|alienPatient)/.test(sceneKey)) {
            this.addReferenceButton();
        }
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

    // Shows a 10-second choice window: side jobs keep continuousWork running; "Take a Break" resets it and starts 1-min break
    showBreakChoice(breakItem) {
        const container = document.getElementById('choices');

        // Countdown display
        const countdown = document.createElement('p');
        let remaining = 10;
        countdown.textContent = 'Choose within ' + remaining + 's or break starts automatically.';
        container.appendChild(countdown);

        const countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                countdown.textContent = 'Choose within ' + remaining + 's or break starts automatically.';
            } else {
                clearInterval(countdownInterval);
                cleanup();
                this.startActualBreak(breakItem);
            }
        }, 1000);

        const cleanup = () => {
            clearInterval(countdownInterval);
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
                // continuousWork keeps counting — no reset, no onBreak
                this.runSideJobAction(job, '__nextPatient__', breakItem.expireScene);
            };
            container.appendChild(btn);
        });

        const breakBtn = document.createElement('button');
        breakBtn.textContent = 'Take a Break';
        breakBtn.onclick = () => {
            cleanup();
            this.startActualBreak(breakItem);
        };
        container.appendChild(breakBtn);
    }

    // Starts the real 1-minute break: resets continuousWork, shows coffee screen, returns to main job when done
    startActualBreak(_breakItem) {
        this.onBreak = true;
        this.continuousWorkTime = 0;
        this.updateContinuousWorkDisplay();
        this.updateCurrentJobDisplay();

        // Replace choices area with coffee image for the duration of the break
        const container = document.getElementById('choices');
        container.innerHTML = '';
        const coffeeDiv = document.createElement('div');
        coffeeDiv.style.cssText = 'text-align:center;padding:24px';
        coffeeDiv.innerHTML =
            '<div style="font-size:6em;line-height:1">☕</div>' +
            '<p style="margin-top:8px;color:#aaa;font-style:italic">Enjoy your break — back in 1 minute.</p>';
        container.appendChild(coffeeDiv);

        this.startBreakTimer(60, () => {
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
        this.pendingReturnScene = returnScene;
        this.onSideJob = true;
        this.activeSideJob = job;
        this.updateCurrentJobDisplay();
        const lookupKey = sceneLookupKey || returnScene;
        const startScene = job.startScene ||
            (job.startSceneMap && job.startSceneMap[lookupKey]);
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

        // Build and shuffle patient queue (7 patients: 5 known + 2 alien ≈ 1/3 alien)
        const pool = ['patient1', 'patient2', 'patient3', 'patient4', 'patient5',
                      'alienPatient1', 'alienPatient2'];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        this.patientQueue = pool;
        this.patientsDone = 0;

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
        reward: 5,
        similarity: 0.8,
        startSceneMap: { 'breakEnd': 'telemedicine1', 'breakEnd2': 'telemedicine2' }
    });
    const medSchoolJob = new SideJob({ name: 'Medical School', actionItem: 'knowledge', reward: 0, similarity: 0.5, startScene: 'medSchoolStart' });
    const uberJob = new SideJob({ name: 'Ride Sharing', actionItem: 'driving', reward: 5, similarity: 0.3, startScene: 'uberStart' });

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
            story: "Robert is a 52-year-old male who presents with sudden crushing chest pain radiating to his left arm, and shortness of breath. What is your diagnosis?",
            choices: [
                { text: "Heart Attack",   next: '__nextPatient__', correct: true  },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Stroke",         next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
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
        patient5: {
            title: "Patient ID: 5",
            story: "Alex, 38, has sudden onset severe chest pain, difficulty breathing, and left-arm numbness. He says it came out of nowhere. What is your diagnosis?",
            choices: [
                { text: "Heart Attack",   next: '__nextPatient__', correct: true  },
                { text: "Anxiety Attack", next: '__nextPatient__', correct: false },
                { text: "Pneumonia",      next: '__nextPatient__', correct: false },
                { text: "Migraine",       next: '__nextPatient__', correct: false },
                { text: "Skip (no reward / no penalty)", next: '__nextPatient__', skip: true }
            ]
        },
        endScene: {
            title: "Day 1 Finished!",
            story: "Your shift is over. Review your patient diagnoses below.",
            actionItems: [{ type: 'endGame' }]
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
                <tr><td colspan="2" style="padding-top:8px;font-style:italic;color:#888">Alien Diseases</td></tr>
                <tr><td>Vorpal Syndrome</td><td>Glowing blue skin patches, Low-frequency humming</td></tr>
                <tr><td>Null-Field Exposure</td><td>Spontaneous levitation, Hearing colors (cross-sensory)</td></tr>
            </table>`,
            choices: [{ text: "Return to break", next: '__return__' }]
        },

        // ── Ride Sharing scenes ───────────────────────────────────────────────
        uberStart: {
            title: "Ride Sharing: New Shift",
            story: "Drive your car (🚗) to pick up customers (🧍). A new customer appears every 5 seconds. You have 60 seconds — pick up as many as you can!",
            choices: [{ text: "Start driving", next: 'uberDrive' }]
        },
        uberDrive: {
            title: "Ride Sharing: On the Road",
            story: "Use arrow keys to move.",
            actionItems: [{ type: 'uberGame', nextScene: '__return__' }]
        }
    }
};
