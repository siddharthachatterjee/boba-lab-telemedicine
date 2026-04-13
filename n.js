// class GameInstance {
//     constructor(config) {
//         this.Q = config.Q;
//         this.scenes = config.scenes;
//         this.startScene = config.startScene || 'intro';
//         this.currentScene = null;
//         this.score = 0;
//         this.telemedicineCount = 0;
//         this.timerInterval = null;
//         this.breakTimerInterval = null;
//         this.startTime = null;
//         this.onEnd = config.onEnd || null;
//     }

//     startTimer() {
//         let startTime = Date.now();
//         this.timerInterval = setInterval(() => {
//             let elapsedTime = Date.now() - startTime;
//             let seconds = Math.floor(elapsedTime / 1000);
//             let minutes = Math.floor(seconds / 60);
//             seconds = seconds % 60;
//             document.getElementById('timer').textContent = 'Time: ' +
//                 (minutes < 10 ? '0' : '') + minutes + ':' +
//                 (seconds < 10 ? '0' : '') + seconds;
//         }, 1000);
//     }

//     stopTimer() {
//         clearInterval(this.timerInterval);
//     }

//     startBreakTimer(duration, callback) {
//         clearInterval(this.breakTimerInterval);
//         let timer = duration;
//         this.breakTimerInterval = setInterval(() => {
//             let minutes = parseInt(timer / 60, 10);
//             let seconds = parseInt(timer % 60, 10);
//             minutes = minutes < 10 ? "0" + minutes : minutes;
//             seconds = seconds < 10 ? "0" + seconds : seconds;
//             document.getElementById('break-timer').textContent = "Break: " + minutes + ":" + seconds;
//             if (--timer < 0) {
//                 clearInterval(this.breakTimerInterval);
//                 callback();
//             }
//         }, 1000);
//     }

//     stopBreakTimer() {
//         clearInterval(this.breakTimerInterval);
//         document.getElementById('break-timer').textContent = '';
//     }

//     handleActionItem(item) {
//         switch (item.type) {
//             case 'slider':
//                 this.setupSlider(item.correctValue, item.nextScene, item.hint);
//                 break;
//             case 'breakTimer':
//                 this.startBreakTimer(item.duration, () => {
//                     this.displayScene(item.expireScene);
//                 });
//                 break;
//             case 'stopBreakTimer':
//                 this.stopBreakTimer();
//                 break;
//             case 'incrementTelemedicine':
//                 this.telemedicineCount += 1;
//                 break;
//             case 'endGame':
//                 this.stopTimer();
//                 this.storeGameData();
//                 document.getElementById('final-score').textContent = 'Final Score: ' + this.score;
//                 document.getElementById('telemedicine-count').textContent = 'Telemedicine Sessions: ' + this.telemedicineCount;
//                 document.getElementById('final-score').classList.remove('hidden');
//                 document.getElementById('telemedicine-count').classList.remove('hidden');
//                 let gameOverButton = document.createElement('button');
//                 gameOverButton.id = 'finish-game-btn';
//                 gameOverButton.textContent = 'Finish Game';
//                 gameOverButton.onclick = () => {
//                     document.getElementById('game-view').classList.add('hidden');
//                     document.getElementById('game-over').classList.remove('hidden');
//                     this.Q.enableNextButton();
//                 };
//                 document.getElementById('scene-story').appendChild(gameOverButton);
//                 if (this.onEnd) this.onEnd(this.getStats());
//                 break;
//         }
//     }

//     setupSlider(correctValue, nextSceneKey, questionPrompt) {
//         document.getElementById('slider-container').classList.remove('hidden');

//         let slider = document.getElementById('myRange');
//         let output = document.getElementById('value');
//         slider.min = 0;
//         slider.max = 100;
//         slider.value = 0;
//         output.textContent = slider.value;

//         slider.oninput = function() {
//             output.textContent = this.value;
//             let percentage = ((this.value - this.min) / (this.max - this.min)) * 100;
//             this.style.background = `linear-gradient(90deg, #14284b ${percentage}%, #BCBCBC ${percentage}%)`;
//         };

//         let container = document.getElementById('choices');
//         container.innerHTML = '';

//         let submitBtn = document.createElement('button');
//         submitBtn.textContent = 'Submit Answer';
//         submitBtn.onclick = () => {
//             if (parseInt(slider.value) === correctValue) {
//                 document.getElementById('scene-story').textContent = "Correct! The correct value is " + correctValue + ".";
//                 if (!submitBtn.alreadyCorrect) {
//                     this.score++;
//                     submitBtn.alreadyCorrect = true;
//                     document.getElementById('score').textContent = 'Score: ' + this.score;
//                 }
//                 document.getElementById('slider-container').classList.add('hidden');
//                 submitBtn.style.display = 'none';
//                 let nextButton = document.createElement('button');
//                 nextButton.textContent = 'Continue';
//                 nextButton.onclick = () => this.displayScene(nextSceneKey);
//                 container.appendChild(nextButton);
//             } else {
//                 document.getElementById('scene-story').textContent = "Incorrect. Try again. " + questionPrompt;
//                 submitBtn.alreadyCorrect = false;
//             }
//         };
//         container.appendChild(submitBtn);
//     }

//     displayScene(sceneKey) {
//         this.currentScene = sceneKey;
//         let scene = this.scenes[sceneKey];

//         document.getElementById('scene-title').textContent = scene.title;
//         document.getElementById('scene-story').textContent = scene.story;
//         document.getElementById('disease-chart').innerHTML = scene.chart || '';

//         let choicesContainer = document.getElementById('choices');
//         choicesContainer.innerHTML = '';

//         if (scene.actionItems) {
//             scene.actionItems.forEach(item => this.handleActionItem(item));
//         }

//         if (scene.choices) {
//             scene.choices.forEach(choice => {
//                 let btn = document.createElement('button');
//                 btn.textContent = choice.text;
//                 btn.onclick = () => {
//                     if (sceneKey.includes('Correct')) {
//                         this.score += 1;
//                         document.getElementById('score').textContent = 'Score: ' + this.score;
//                     }
//                     this.displayScene(choice.next);
//                 };
//                 choicesContainer.appendChild(btn);
//             });
//         }

//         this.showGameView();
//     }

//     showGameView() {
//         document.getElementById('game-view').classList.remove('hidden');
//         document.getElementById('start-button').classList.add('hidden');
//     }

//     storeGameData() {
//         Qualtrics.SurveyEngine.setEmbeddedData('gameDuration', document.getElementById('timer').textContent);
//         Qualtrics.SurveyEngine.setEmbeddedData('finalScore', this.score);
//         Qualtrics.SurveyEngine.setEmbeddedData('telemedicineSessions', this.telemedicineCount);
//     }

//     getStats() {
//         const duration = this.startTime ? Date.now() - this.startTime : 0;
//         return { score: this.score, telemedicineCount: this.telemedicineCount, duration };
//     }

//     start() {
//         this.score = 0;
//         this.telemedicineCount = 0;
//         this.startTime = Date.now();
//         document.getElementById('score').textContent = 'Score: 0';
//         this.displayScene(this.startScene);
//         this.startTimer();
//     }
// }


// // Represents a loadable task type (e.g. telemedicine, uber driving)
// class TaskType {
//     constructor(config) {
//         this.id = config.id;
//         this.name = config.name;
//         this.scenesUrl = config.scenesUrl || null;
//         this.scenesData = config.scenesData || null;
//         this.actionItemTypes = new Set();
//     }

//     async load() {
//         if (!this.scenesData) {
//             const response = await fetch(this.scenesUrl);
//             this.scenesData = await response.json();
//         }
//         for (const scene of Object.values(this.scenesData.scenes)) {
//             if (scene.choices && scene.choices.length > 0) this.actionItemTypes.add('choices');
//             if (scene.actionItems) scene.actionItems.forEach(item => this.actionItemTypes.add(item.type));
//         }
//     }
// }

// // Tracks performance stats across sessions and task types
// class PerformanceTracker {
//     constructor() {
//         this.sessions = [];
//     }

//     record(taskId, stats) {
//         this.sessions.push({
//             taskId: taskId,
//             score: stats.score,
//             telemedicineCount: stats.telemedicineCount,
//             duration: stats.duration,
//             timestamp: Date.now()
//         });
//     }

//     getHistory(taskId = null) {
//         return taskId ? this.sessions.filter(s => s.taskId === taskId) : this.sessions.slice();
//     }
// }

// // Manages multiple TaskTypes, switching between them, and computing similarity
// class TaskManager {
//     constructor(tracker) {
//         this.tasks = {};
//         this.tracker = tracker;
//         this.activeGame = null;
//         this.activeTaskId = null;
//     }

//     register(taskType) {
//         this.tasks[taskType.id] = taskType;
//     }

//     // Jaccard similarity: |intersection| / |union| of action item types
//     similarityScore(taskIdA, taskIdB) {
//         const a = this.tasks[taskIdA].actionItemTypes;
//         const b = this.tasks[taskIdB].actionItemTypes;
//         const intersection = Array.from(a).filter(t => b.has(t)).length;
//         const union = new Set(Array.from(a).concat(Array.from(b))).size;
//         return union === 0 ? 0 : intersection / union;
//     }

//     async switchTo(taskId, Q) {
//         const task = this.tasks[taskId];
//         if (!task) throw new Error(`Unknown task: ${taskId}`);
//         if (!task.scenesData) await task.load();

//         if (this.activeGame) {
//             this.tracker.record(this.activeTaskId, this.activeGame.getStats());
//         }

//         this.activeTaskId = taskId;
//         this.activeGame = new GameInstance({
//             Q,
//             startScene: task.scenesData.startScene,
//             scenes: task.scenesData.scenes,
//             onEnd: (stats) => this.tracker.record(taskId, stats)
//         });
//         return this.activeGame;
//     }
// }


// Qualtrics.SurveyEngine.addOnload(function() {
//     let Q = this;
//     Q.disableNextButton();

//     const tracker = new PerformanceTracker();
//     const taskManager = new TaskManager(tracker);

//     taskManager.register(new TaskType({ id: 'telemedicine', name: 'Telemedicine', scenesData: TELEMEDICINE_SCENES }));
//     // Register additional task types here, e.g.:
//     // taskManager.register(new TaskType({ id: 'uber', name: 'Uber Driving', scenesData: UBER_SCENES }));

//     const startButton = document.getElementById('start-button');
//   //  startButton.disabled = true;

//     taskManager.switchTo('telemedicine', Q)
//         .then(() => { startButton.disabled = false; })
//         .catch(err => { console.error('Failed to load task:', err); });

//     startButton.addEventListener('click', function() {
//         if (!taskManager.activeGame) return;
//         console.log('Starting game...');
//         taskManager.activeGame.start();
//     });

//     function hideEl(element) {
//         element.hide();
//     }

//     var nb = $('NextButton');
//     const regex = /^{"T":.*?"A":.*?]}$/;
//     hideEl.defer(nb);
//     $(this.questionId).down('.InputText').on('keyup', function() {
//         if (taskManager.activeGame && taskManager.activeGame.currentScene === 'endScene') {
//             return;
//         }
//         if (regex.test(this.value)) nb.show();
//         else nb.hide();
//     });
// });


// // =============================================================================
// // Scene Data
// // =============================================================================

// const TELEMEDICINE_SCENES = {
//     startScene: 'intro',
//     scenes: {
//         intro: {
//             title: "Introduction",
//             story: "Good morning. Let's begin your shift.",
//             chart: `<table>
//                 <tr><th>Disease</th><th>Symptoms</th></tr>
//                 <tr><td>Pneumonia</td><td>Coughing, Fever, Chills, Shortness of breath</td></tr>
//                 <tr><td>Stroke</td><td>Weakness in one arm, Slurred speech</td></tr>
//                 <tr><td>Heart Attack</td><td>Chest pain, Shortness of breath</td></tr>
//                 <tr><td>Anxiety Attack</td><td>Rapid heart rate, Sweating, Trembling</td></tr>
//             </table>`,
//             choices: [{ text: "Yes, I'm ready!", next: 'patient1' }]
//         },
//         patient1: {
//             title: "Patient 1",
//             story: "John has a fever with coughing and shortness of breath. What is your diagnosis?",
//             choices: [
//                 { text: "Stroke", next: 'patient1Wrong' },
//                 { text: "Pneumonia", next: 'patient1Correct' }
//             ]
//         },
//         patient1Correct: {
//             title: "Correct",
//             story: "Symptoms of pneumonia include coughing, fever, chills, shortness of breath. What would you like to do next?",
//             choices: [{ text: "Next patient", next: 'patient2' }]
//         },
//         patient1Wrong: {
//             title: "Incorrect",
//             story: "John does not exhibit symptoms of a stroke.",
//             choices: [{ text: "Next patient", next: 'patient2' }]
//         },
//         patient2: {
//             title: "Patient 2",
//             story: "Jane has weakness in one of her arms and is slurring her words. What is your diagnosis?",
//             choices: [
//                 { text: "Stroke", next: 'patient2Correct' },
//                 { text: "Allergic Reaction", next: 'patient2Wrong' }
//             ]
//         },
//         patient2Correct: {
//             title: "Correct",
//             story: "Jane exhibits symptoms of a stroke. What would you like to do next?",
//             choices: [{ text: "Next patient", next: 'patient3' }]
//         },
//         patient2Wrong: {
//             title: "Incorrect",
//             story: "Jane's symptoms do not suggest an allergic reaction.",
//             choices: [{ text: "Next patient", next: 'patient3' }]
//         },
//         patient3: {
//             title: "Patient 3",
//             story: "Robert complains of chest pain and shortness of breath. Calculate the correct dose based on weight 80kg. Each kg requires 0.5 units.",
//             actionItems: [
//                 { type: 'slider', correctValue: 40, nextScene: 'startBreak', hint: 'Remember to calculate the dose by multiplying the weight (80kg) by the dosage per kg (0.5 units).' }
//             ]
//         },
//         startBreak: {
//             title: "Break #1",
//             story: "You're back in the breakroom. You have two options: 1) Enjoy yourself      2) Work on telemedicine until your next rotation",
//             actionItems: [{ type: 'breakTimer', duration: 20, expireScene: 'breakEnd' }],
//             choices: [{ text: "Work on Telemedicine", next: 'telemedicine1' }]
//         },
//         breakRoom: {
//             title: "Breakroom",
//             story: "You've finished available telemedicine visits. Sit tight and enjoy yourself until your break is over!"
//         },
//         breakEnd: {
//             title: "Break Over",
//             story: "Your break is over. Time to get back to work!",
//             actionItems: [{ type: 'stopBreakTimer' }],
//             choices: [{ text: "Start Next Shift", next: 'patient4' }]
//         },
//         telemedicine1: {
//             title: "Telemedicine Session 1",
//             story: "Welcome to your first telemedicine session. Please log on to see your first patient.",
//             choices: [{ text: "Log in", next: 'telePatient1_1' }]
//         },
//         telePatient1_1: {
//             title: "Telemedicine Patient 1",
//             story: "Zoe has had a headache for over an hour as well as sensitivity to light. What is your diagnosis?",
//             choices: [
//                 { text: "Flu", next: 'telePatient1_1Wrong' },
//                 { text: "Migraine", next: 'telePatient1_1Correct' }
//             ]
//         },
//         telePatient1_1Correct: {
//             title: "Correct",
//             story: "Zoe's symptoms are indicative of a migraine. Proceed to the next patient.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Next Telemedicine patient", next: 'telePatient1_2' }]
//         },
//         telePatient1_1Wrong: {
//             title: "Incorrect",
//             story: "Zoe's symptoms do not suggest the flu.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Next Telemedicine Patient", next: 'telePatient1_2' }]
//         },
//         telePatient1_2: {
//             title: "Telemedicine Patient 2",
//             story: "Jaime has a fever, cough, sore throat, and stuffy nose. What is your diagnosis?",
//             choices: [
//                 { text: "Flu", next: 'telePatient1_2Correct' },
//                 { text: "Migraine", next: 'telePatient1_2Wrong' }
//             ]
//         },
//         telePatient1_2Correct: {
//             title: "Correct",
//             story: "Jaime's symptoms suggest the flu.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Return to Break room", next: 'breakRoom' }]
//         },
//         telePatient1_2Wrong: {
//             title: "Incorrect",
//             story: "Jaime's symptoms are not indicative of a migraine.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Return to Break room", next: 'breakRoom' }]
//         },
//         patient4: {
//             title: "Patient 4",
//             story: "Ishan complains of chest pain and shortness of breath. What is your diagnosis?",
//             choices: [
//                 { text: "Heart Attack", next: 'patient4Correct' },
//                 { text: "Anxiety Attack", next: 'patient4Wrong' }
//             ]
//         },
//         patient4Correct: {
//             title: "Correct",
//             story: "Ishan is experiencing symptoms of a heart attack. What would you like to do next?",
//             choices: [{ text: "Go on Break", next: 'startBreak2' }]
//         },
//         patient4Wrong: {
//             title: "Incorrect",
//             story: "Ishan's symptoms are indicative of a medical emergency.",
//             choices: [{ text: "Go on Break", next: 'startBreak2' }]
//         },
//         startBreak2: {
//             title: "Break #2",
//             story: "You're back in the breakroom. You have two options: 1) Enjoy yourself      2) Work on telemedicine until your next rotation",
//             actionItems: [{ type: 'breakTimer', duration: 20, expireScene: 'breakEnd2' }],
//             choices: [{ text: "Work on Telemedicine", next: 'telemedicine2' }]
//         },
//         breakEnd2: {
//             title: "Break Over",
//             story: "Your break is over. Time to get back to work!",
//             actionItems: [{ type: 'stopBreakTimer' }],
//             choices: [{ text: "Start Next Shift", next: 'patient5' }]
//         },
//         telemedicine2: {
//             title: "Telemedicine Session 2",
//             story: "Welcome to your second telemedicine session. Please log on to see your next patients.",
//             choices: [{ text: "Log in", next: 'telePatient2_1' }]
//         },
//         telePatient2_1: {
//             title: "Telemedicine Patient 2.1",
//             story: "Sam has been experiencing recurring headaches and sensitivity to light. What is your diagnosis?",
//             choices: [
//                 { text: "Flu", next: 'telePatient2_1Wrong' },
//                 { text: "Migraine", next: 'telePatient2_1Correct' }
//             ]
//         },
//         telePatient2_1Correct: {
//             title: "Correct",
//             story: "Sam's symptoms are indicative of a migraine. Proceed to the next patient.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Next Telemedicine patient", next: 'telePatient2_2' }]
//         },
//         telePatient2_1Wrong: {
//             title: "Incorrect",
//             story: "Sam's symptoms do not suggest the flu.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Next Telemedicine Patient", next: 'telePatient2_2' }]
//         },
//         telePatient2_2: {
//             title: "Telemedicine Patient 2.2",
//             story: "Linda has a fever, cough, sore throat, and a stuffy nose. What is your diagnosis?",
//             choices: [
//                 { text: "Flu", next: 'telePatient2_2Correct' },
//                 { text: "Migraine", next: 'telePatient2_2Wrong' }
//             ]
//         },
//         telePatient2_2Correct: {
//             title: "Correct",
//             story: "Linda's symptoms suggest the flu.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Return to Break room", next: 'breakRoom' }]
//         },
//         telePatient2_2Wrong: {
//             title: "Incorrect",
//             story: "Linda's symptoms are not indicative of a migraine.",
//             actionItems: [{ type: 'incrementTelemedicine' }],
//             choices: [{ text: "Return to Break room", next: 'breakRoom' }]
//         },
//         patient5: {
//             title: "Patient 5",
//             story: "Alex complains of sudden chest pain and difficulty breathing. What is your diagnosis?",
//             choices: [
//                 { text: "Heart Attack", next: 'patient5Correct' },
//                 { text: "Anxiety Attack", next: 'patient5Wrong' }
//             ]
//         },
//         patient5Correct: {
//             title: "Correct",
//             story: "Alex is experiencing symptoms of a heart attack. What would you like to do next?",
//             choices: [{ text: "Finish", next: 'endScene' }]
//         },
//         patient5Wrong: {
//             title: "Incorrect",
//             story: "Alex's symptoms are indicative of a medical emergency, but not an anxiety attack.",
//             choices: [{ text: "Finish", next: 'endScene' }]
//         },
//         endScene: {
//             title: "Day 1 Finished!",
//             story: "Another day, another diagnosis...",
//             actionItems: [{ type: 'endGame' }]
//         }
//     }
// };

// <style>
//     #app-layout {
//         display: flex;
//         gap: 24px;
//         padding: 16px;
//     }

//     #main-content {
//         flex: 1;
//         min-width: 0;
//     }

//     #progress-sidebar {
//         width: 200px;
//         flex-shrink: 0;
//         border-left: 1px solid #ccc;
//         padding-left: 16px;
//     }

//     #task-grid {
//         display: grid;
//         grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
//         gap: 16px;
//     }

//     .task-card {
//         border: 1px solid #ccc;
//         border-radius: 8px;
//         padding: 16px;
//     }

//     /* Hide task grid once the game view is active */
//     #game-view:not(.hidden) ~ #task-grid {
//         display: none;
//     }
// </style>

// <header>
//     <h1>FOW Crowdsourcing Game</h1>
//     <p id="intro-text">Welcome to the Future of Work Crowdsourcing simulator! Pick from any of the available tasks below.</p>
// </header>

// <div id="app-layout">

//     <main id="main-content">
        
//         <div id="game-view" class="game-view hidden">
//             <h2 id="scene-title">Introduction</h2>
//             <div id="break-timer" class="break-timer">&nbsp;</div>
//             <p id="telemedicine-count" class="hidden">Telemedicine Sessions: 0</p>
//             <p id="final-score" class="hidden">Final Score: 0</p>
//             <p id="scene-story">&nbsp;</p>
//             <div id="disease-chart" class="disease-chart">&nbsp;</div>
//             <div id="choices" class="choices">&nbsp;</div>
//         </div>

        
//         <div id="task-grid">
//             <div class="task-card">
//                 <h3>Telemedicine</h3>
//                 <p>Diagnose patients and manage telemedicine sessions as a virtual doctor.</p>
//                 <button id="start-button">Start Task</button>
//             </div>
//         </div>
//     </main>

//     <aside id="progress-sidebar">
//         <h3>Progress</h3>
//         <p id="score">Score: 0</p>
//         <p id="timer">Time: 00:00</p>
//     </aside>

// </div>

// <div id="game-over" class="game-over hidden">
//     <div class="game-over-card">
//         <h2>Game Over!</h2>
//         <p id="final-message">Thank you for playing.</p>
//         <button id="restart-game-btn" class="hidden">Restart</button>
//     </div>
// </div>

// <div id="slider-container" class="slideContainer hidden">
//     <input value="0" type="range" min="0" max="100" id="myRange" class="slider">
//     <p>Calculated Value: <span id="value">50</span></p>
// </div>
