Qualtrics.SurveyEngine.addOnload(function() {
    let Q = this;
    Q.disableNextButton();

    let score = 0; // Initialize score
    let timerInterval; // Variable to hold timer interval
	let breakTimerInterval; // Variable to hold timer interval for breaks
	let telemedicineCount = 0; // Initialize at the top with other variables


function startBreakTimer(duration, callback) {
    clearInterval(breakTimerInterval); // Clear any existing interval to prevent duplicates
    let timer = duration, minutes, seconds;
    breakTimerInterval = setInterval(function() {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        document.getElementById('break-timer').textContent = "Break: " + minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(breakTimerInterval);
            callback();
        }
    }, 1000);
}



    function stopBreakTimer() {
        clearInterval(breakTimerInterval);
        document.getElementById('break-timer').textContent = ''; // Clear timer text
    }

function startTimer() {
    let startTime = Date.now();
    timerInterval = setInterval(function() {
        let elapsedTime = Date.now() - startTime;
        let seconds = Math.floor(elapsedTime / 1000);
        let minutes = Math.floor(seconds / 60);
        seconds = seconds % 60; // Remainder gives seconds past the last full minute
        document.getElementById('timer').textContent = 'Time: ' +
            (minutes < 10 ? '0' : '') + minutes + ':' +
            (seconds < 10 ? '0' : '') + seconds;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}


let gameState = {
    currentScene: 'intro',
    scenes: {
        intro: {
            title: "Introduction",
            story: `Good morning. Let's begin your shift.`,
            chart: `
                <table>
                    <tr><th>Disease</th><th>Symptoms</th></tr>
                    <tr><td>Pneumonia</td><td>Coughing, Fever, Chills, Shortness of breath</td></tr>
                    <tr><td>Stroke</td><td>Weakness in one arm, Slurred speech</td></tr>
                    <tr><td>Heart Attack</td><td>Chest pain, Shortness of breath</td></tr>
                    <tr><td>Anxiety Attack</td><td>Rapid heart rate, Sweating, Trembling</td></tr>
                </table>`,
            choices: [
                { text: "Yes, I'm ready!", next: 'patient1' }
            ]
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
			chart: "",
			choices: [],
			onEnter: function() {
				let correctDose = 80 * 0.5; // Simple calculation for dose
				let questionPrompt = "Remember to calculate the dose by multiplying the weight (80kg) by the dosage per kg (0.5 units)."; // Provide a helpful hint
				setupSlider(correctDose, 'startBreak', questionPrompt); // Call the generalized function with the prompt
			}
		},

		startBreak: {
			title: "Break #1",
			story: "You're back in the breakroom. You have two options: 1) Enjoy yourself      2) Work on telemedicine until your next rotation",
			choices: [
				{ text: "Work on Telemedicine", next: 'telemedicine1' }
			],
			onEnter: function() {
				startBreakTimer(20, function() {
					gameState.displayScene('breakEnd');
				});
			}
		},
        breakRoom: {
            title: "Breakroom",
            story: "You've finished avaliable telemedicine visits. Sit tight and enjoy yourself until your break is over!",
        },
		breakEnd: {
			title: "Break Over",
			story: "Your break is over. Time to get back to work!",
			choices: [
				{ text: "Start Next Shift", next: 'patient4' }
			],
			 onEnter: function() {
					stopBreakTimer();
				}
		},
        telemedicine1: {
            title: "Telemedicine Session 1",
            story: "Welcome to your first telemedicine session. Please log on to see your first patient.",
            choices: [
                { text: "Log in", next: 'telePatient1_1' }
            ]
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
            choices: [{ text: "Next Telemedicine patient", next: 'telePatient1_2' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
        },
        telePatient1_1Wrong: {
            title: "Incorrect",
            story: "Zoe's symptoms do not suggest the flu.",
            choices: [{ text: "Next Telemedicine Patient", next: 'telePatient1_2' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
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
            choices: [{ text: "Return to Break room", next: 'breakRoom' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
        },
        telePatient1_2Wrong: {
            title: "Incorrect",
            story: "Jaime's symptoms are not indicative of a migraine.",
            choices: [{ text: "Return to Break room", next: 'breakRoom' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
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
            story: "You're back in the breakroom. You have two options: 1) Enjoy yourself      2) Work on telemedicine until your next rotation",
            choices: [
                { text: "Work on Telemedicine", next: 'telemedicine2' }
            ],
            onEnter: function() {
                startBreakTimer(20, function() {
                    gameState.displayScene('breakEnd2');
                });
            }
        },
        breakEnd2: {
            title: "Break Over",
            story: "Your break is over. Time to get back to work!",
            choices: [
                { text: "Start Next Shift", next: 'patient5' }
            ],
            onEnter: function() {
                stopBreakTimer();
            }
        },
        telemedicine2: {
            title: "Telemedicine Session 2",
            story: "Welcome to your second telemedicine session. Please log on to see your next patients.",
            choices: [
                { text: "Log in", next: 'telePatient2_1' }
            ]
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
            choices: [{ text: "Next Telemedicine patient", next: 'telePatient2_2' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
        },
        telePatient2_1Wrong: {
            title: "Incorrect",
            story: "Sam's symptoms do not suggest the flu.",
            choices: [{ text: "Next Telemedicine Patient", next: 'telePatient2_2' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
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
            choices: [{ text: "Return to Break room", next: 'breakRoom' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
        },
        telePatient2_2Wrong: {
            title: "Incorrect",
            story: "Linda's symptoms are not indicative of a migraine.",
            choices: [{ text: "Return to Break room", next: 'breakRoom' }],
			onEnter: function() {
                  telemedicineCount += 1;
            }
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
			onEnter: function() {
				stopTimer();
				storeGameData(); // This captures and stores all game-related data
				document.getElementById('final-score').textContent = 'Final Score: ' + score;
				document.getElementById('telemedicine-count').textContent = 'Telemedicine Sessions: ' + telemedicineCount;
				document.getElementById('final-score').classList.remove('hidden');
				document.getElementById('telemedicine-count').classList.remove('hidden');

				var gameOverButton = document.createElement('button');
				gameOverButton.id = 'finish-game-btn'; // Assign the ID for CSS styling
				gameOverButton.textContent = 'Finish Game';
				gameOverButton.onclick = function() {
					document.getElementById('game-view').classList.add('hidden');
					document.getElementById('game-over').classList.remove('hidden');
					Q.enableNextButton(); // Explicitly enable the Next button here
				};

				var container = document.getElementById('scene-story');
				container.appendChild(gameOverButton);
			}

        },

    },
   displayScene: function(sceneKey) {
            let scene = this.scenes[sceneKey];
            document.getElementById('scene-title').textContent = scene.title;
            document.getElementById('scene-story').textContent = scene.story;
	         document.getElementById('disease-chart').innerHTML = scene.chart || ''; // Include the chart if available

            let choicesContainer = document.getElementById('choices');
            choicesContainer.innerHTML = ''; // Clear previous choices
	  		 if(scene.onEnter) scene.onEnter(); // If the scene has an onEnter function, execute it
            scene.choices.forEach(choice => {
                let btn = document.createElement('button');
                btn.textContent = choice.text;
                btn.onclick = () => {
                    if (sceneKey.includes("Correct")) {
                        score += 1; // Increment score if the scene is a correct diagnosis
                        document.getElementById('score').textContent = 'Score: ' + score;
                    }
                    this.displayScene(choice.next);
                };
                choicesContainer.appendChild(btn);
            });
            this.showGameView();
        },
    showGameView: function() {
        document.getElementById('game-view').classList.remove('hidden');
        document.getElementById('start-button').classList.add('hidden');
    }
};


document.getElementById('start-button').addEventListener('click', function() {
    console.log('Starting game...');
    score = 0; // Reset score if restarting
    document.getElementById('score').textContent = 'Score: 0'; // Reset score display
    gameState.displayScene('intro');
    startTimer(); // Ensure the timer starts fresh with the game
});

// When implementing game over or restart:
gameState.scenes.startBreak.choices[0].action = function() {
    stopTimer(); // Stop the timer when the game breaks or ends
    gameState.displayScene('intro');
};
	function storeGameData() {
    Qualtrics.SurveyEngine.setEmbeddedData('gameDuration', document.getElementById('timer').textContent);
    Qualtrics.SurveyEngine.setEmbeddedData('finalScore', score);
    Qualtrics.SurveyEngine.setEmbeddedData('telemedicineSessions', telemedicineCount);
}

    function hideEl(element) {
        element.hide();
    }   
	
    var nb = $('NextButton');
	const regex = /^{"T":.*?"A":.*?]}$/;
    hideEl.defer(nb);
	$(this.questionId).down('.InputText').on('keyup', function(event) {
    if (gameState.currentScene === 'endScene') {
        // Do not manipulate the Next button visibility in the Game Over scene
        return;
    }
    if (regex.test(this.value)) nb.show();
    else nb.hide();
});
	
function setupSlider(correctValue, nextSceneKey, questionPrompt) {
    document.getElementById('slider-container').classList.remove('hidden'); // Show slider

    let slider = document.getElementById('myRange');
    let output = document.getElementById('value');
    slider.min = 0; // Set minimum value
    slider.max = 100; // Maximum can be adjusted as needed
    slider.value = 0; // Start at 0
    output.textContent = slider.value; // Display initial value

    slider.oninput = function() {
        output.textContent = this.value; // Update the displayed value
        let percentage = ((this.value - this.min) / (this.max - this.min)) * 100;
        this.style.background = `linear-gradient(90deg, #14284b ${percentage}%, #BCBCBC ${percentage}%)`;
    };

    let container = document.getElementById('choices');
    container.innerHTML = ''; // Clear previous choices

    let submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit Answer';
    submitBtn.onclick = function() {
        if (parseInt(slider.value) === correctValue) {
            document.getElementById('scene-story').textContent = "Correct! The correct value is " + correctValue + ".";
            if (!this.alreadyCorrect) {
                score++; // Increment score only the first time
                this.alreadyCorrect = true;
                document.getElementById('score').textContent = 'Score: ' + score;
            }
            document.getElementById('slider-container').classList.add('hidden'); // Hide slider after submission
            submitBtn.style.display = 'none'; // Hide the submit button

            // Create a button for proceeding to the next scene
            let nextButton = document.createElement('button');
            nextButton.textContent = 'Continue';
            nextButton.onclick = function() {
                gameState.displayScene(nextSceneKey);
            };
            container.appendChild(nextButton); // Append the continue button to the container
        } else {
            document.getElementById('scene-story').textContent = "Incorrect. Try again. " + questionPrompt; // Show the question prompt on incorrect answer
            this.alreadyCorrect = false; // Allow for reevaluation
        }
    };
    container.appendChild(submitBtn);
}

	
});