// ------ RNBO integration ------
async function setup() {
    console.log("Setup gestartet...");

    const patchExportURL = "https://raquelle-philtreezs-projects.vercel.app/export/patch.export.json"; // Passe die URL deines Patches an
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    let patcher, device;

    try {
        // Lade den RNBO-Patch
        const response = await fetch(patchExportURL);
        patcher = await response.json();

        if (!window.RNBO) {
            console.log("Lade RNBO-Bibliothek...");
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

        device = await RNBO.createDevice({ context, patcher });
        console.log("RNBO-Device erfolgreich erstellt.");

        device.node.connect(outputNode);
        console.log("RNBO-Device an Audio-Ausgang verbunden.");

        setupButtons(device, 'b'); // Buttons b1-b16 initialisieren
        setupButtons(device, 'e'); // Buttons e1-e16 initialisieren
        setupButtons(device, 'q'); // Buttons q1-q16 initialisieren
        setupButtons(device, 'r'); // Buttons r1-r16 initialisieren

        setInitialParameterValues(device); // Initiale Werte setzen
        setupOscilloscope(context, device, outputNode);
        setupLightVisualization(device);

    } catch (error) {
        console.error("Fehler beim Laden oder Erstellen des RNBO-Devices:", error);
        return;
    }

    document.body.addEventListener("click", () => {
        if (context.state === "suspended") {
            context.resume().then(() => console.log("AudioContext aktiviert."));
        }
    });

    console.log(`AudioContext state: ${context.state}`);
}

function setupButtons(device, prefix) {
    for (let i = 1; i <= 16; i++) {
        const buttonId = `${prefix}${i}`;
        const buttonDiv = document.getElementById(buttonId);
        const buttonParam = device.parametersById.get(buttonId);

        if (buttonDiv && buttonParam) {
            // Setze initialen Zustand des Buttons entsprechend des Parameterwertes
            updateButtonVisual(buttonDiv, Math.round(buttonParam.value));

            buttonDiv.addEventListener("click", () => {
                const newValue = buttonParam.value === 0 ? 1 : 0;
                buttonParam.value = newValue;
                updateButtonVisual(buttonDiv, newValue);
                console.log(`${buttonId} state set to: ${newValue}`);
            });

            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === buttonParam.id) {
                    const newValue = Math.round(param.value);
                    updateButtonVisual(buttonDiv, newValue);
                    console.log(`${buttonId} updated to: ${newValue}`);
                }
            });
        }
    }

    function updateButtonVisual(buttonDiv, value) {
        buttonDiv.style.backgroundColor = value === 1 ? "rgb(0, 255, 130)" : "transparent";
    }
}

function setupOscilloscope(context, device, outputNode) {
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 2048; // Auflösung des Oszilloskops
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    device.node.connect(analyserNode); // Verbinde Analyser mit dem Audio-Ausgang
    analyserNode.connect(outputNode);

    const oscilloscopeCanvas = document.getElementById('oscilloscope');
    oscilloscopeCanvas.width = oscilloscopeCanvas.offsetWidth;
    oscilloscopeCanvas.height = 230;
    const oscilloscopeContext = oscilloscopeCanvas.getContext("2d");

    function drawOscilloscope() {
        requestAnimationFrame(drawOscilloscope);
        analyserNode.getByteTimeDomainData(dataArray);

        oscilloscopeContext.clearRect(0, 0, oscilloscopeCanvas.width, oscilloscopeCanvas.height);
        oscilloscopeContext.lineWidth = 4;
        oscilloscopeContext.strokeStyle = "rgb(0, 255, 130)"; // Farbe der Wellenform
        oscilloscopeContext.beginPath();

        const sliceWidth = oscilloscopeCanvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * oscilloscopeCanvas.height) / 2;

            if (i === 0) {
                oscilloscopeContext.moveTo(x, y);
            } else {
                oscilloscopeContext.lineTo(x, y);
            }

            x += sliceWidth;
        }

        oscilloscopeContext.lineTo(oscilloscopeCanvas.width, oscilloscopeCanvas.height / 2);
        oscilloscopeContext.stroke();
    }

    drawOscilloscope(); // Zeichnen starten
}

function setupLightVisualization(device) {
    const maxLights = 16; // Anzahl der Lichter (1-16)
    const lightClassPrefix = "lighty"; // Klassenname-Präfix

    const lightParam = device.parametersById.get("light");

    if (lightParam) {
        device.parameterChangeEvent.subscribe((param) => {
            if (param.id === lightParam.id) {
                const lightValue = Math.round(param.value); // Wert zwischen 1 und 16
                updateLightVisual(lightValue);
                console.log(`Light visual set to: ${lightValue}`);
            }
        });
    }

    function updateLightVisual(activeLight) {
        for (let i = 1; i <= maxLights; i++) {
            const lightElement = document.querySelector(`.${lightClassPrefix}${i}`);
            if (lightElement) {
                // Sichtbarkeit steuern: nur das aktive Licht sichtbar machen
                lightElement.style.visibility = i === activeLight ? "visible" : "hidden";
            }
        }
    }
}


    function setupOscilloscope(context, device, outputNode) {
        const analyserNode = context.createAnalyser();
        analyserNode.fftSize = 2048; // Auflösung des Oszilloskops
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        device.node.connect(analyserNode); // Verbinde Analyser mit dem Audio-Ausgang
        analyserNode.connect(outputNode);

        const oscilloscopeCanvas = document.getElementById('oscilloscope');
        oscilloscopeCanvas.width = oscilloscopeCanvas.offsetWidth;
        oscilloscopeCanvas.height = 230;
        const oscilloscopeContext = oscilloscopeCanvas.getContext("2d");

        function drawOscilloscope() {
            requestAnimationFrame(drawOscilloscope);
            analyserNode.getByteTimeDomainData(dataArray);

            oscilloscopeContext.clearRect(0, 0, oscilloscopeCanvas.width, oscilloscopeCanvas.height);
            oscilloscopeContext.lineWidth = 4;
            oscilloscopeContext.strokeStyle = "rgb(0, 255, 130)"; // Farbe der Wellenform
            oscilloscopeContext.beginPath();

            const sliceWidth = oscilloscopeCanvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * oscilloscopeCanvas.height) / 2;

                if (i === 0) {
                    oscilloscopeContext.moveTo(x, y);
                } else {
                    oscilloscopeContext.lineTo(x, y);
                }

                x += sliceWidth;
            }

            oscilloscopeContext.lineTo(oscilloscopeCanvas.width, oscilloscopeCanvas.height / 2);
            oscilloscopeContext.stroke();
        }

        drawOscilloscope(); // Zeichnen starten
    

        // Parameter zur Steuerung der Sichtbarkeit abonnieren
        const chorderParam = device.parametersById.get("chorder"); // Name des RNBO-Parameters
        if (chorderParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === chorderParam.id) {
                    const value = Math.round(param.value); // Rundet auf ganze Zahlen
                    updateChorderVisibility(value);
                    console.log(`Chorder visibility set to: ${value}`);
                }
            });
        }

        function updateChorderVisibility(value) {
            for (let i = 1; i <= 3; i++) {
                const chorderDiv = document.getElementById(`chorder${i}`);
                if (chorderDiv) {
                    chorderDiv.style.display = (value === i) ? "block" : "none";
                }
            }
        }

        updateChorderVisibility(0); // Setze initial alle Chorder auf unsichtbar

        // ------ Steuerung für slicont (0-5) ------
        const slicontParam = device.parametersById.get("slicont");

        if (slicontParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === slicontParam.id) {
                    const value = Math.round(param.value); // Rundet auf Integer-Werte 0-5
                    updateSlicontBackground(value);
                    console.log(`slicont parameter set to: ${value}`);
                }
            });
        }

        function updateSlicontBackground(value) {
            for (let i = 1; i <= 5; i++) {
                const slicontDiv = document.getElementById(`slicont${i}`);
                if (slicontDiv) {
                    slicontDiv.style.backgroundColor = (value === i) ? "rgba(0, 255, 130, 0.5)" : "transparent";
                }
            }
        }

        // ------ Intro PNG-Strip Steuerung ------
        const introDiv = document.getElementById("intro");
        const introParam = device.parametersById.get("intro");
        const introContainer = document.getElementById("intro-container");

        if (introDiv && introParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === introParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    introDiv.style.backgroundPosition = `0 -${yOffset}`;
                    introContainer.style.display = (frameIndex === 0) ? "none" : "block";
                    console.log(`Intro frame set to: ${frameIndex}`);
                }
            });
        }

                // ------ Light-Visualisierung ------
        const maxLights = 16; // Anzahl der Lichter (1-16)
        const lightClassPrefix = "lighty"; // Klassenname-Präfix

        const lightParam = device.parametersById.get("light");

        if (lightParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === lightParam.id) {
                    const lightValue = Math.round(param.value); // Wert zwischen 1 und 16
                    updateLightVisual(lightValue);
                    console.log(`Light visual set to: ${lightValue}`);
                }
            });
        }

        function updateLightVisual(activeLight) {
            for (let i = 1; i <= maxLights; i++) {
                const lightElement = document.querySelector(`.${lightClassPrefix}${i}`);
                if (lightElement) {
                    // Sichtbarkeit steuern: nur das aktive Licht sichtbar machen
                    lightElement.style.visibility = i === activeLight ? "visible" : "hidden";
                }
            }
        }


        // ------ ki-Button Steuerung ------
        const kiButton = document.getElementById("ki");
        const kiParam = device.parametersById.get("ki");

        if (kiButton && kiParam) {
            kiButton.addEventListener("click", () => {
                const newValue = kiParam.value === 0 ? 1 : 0;
                kiParam.value = newValue;
                console.log(`ki state set to: ${newValue}`);
            });
        }

        // ------ sn-Button Steuerung ------
        const snButton = document.getElementById("sn");
        const snParam = device.parametersById.get("sn");

        if (snButton && snParam) {
            snButton.addEventListener("click", () => {
                const newValue = snParam.value === 0 ? 1 : 0;
                snParam.value = newValue;
                console.log(`sn state set to: ${newValue}`);
            });
        }

        // ------ clp-Button Steuerung ------
        const clpButton = document.getElementById("clp");
        const clpParam = device.parametersById.get("clp");

        if (clpButton && clpParam) {
            clpButton.addEventListener("click", () => {
                const newValue = clpParam.value === 0 ? 1 : 0;
                clpParam.value = newValue;
                console.log(`clp state set to: ${newValue}`);
            });
        }

        // ------ hi-Button Steuerung ------
        const hiButton = document.getElementById("hi");
        const hiParam = device.parametersById.get("hi");

        if (hiButton && hiParam) {
            hiButton.addEventListener("click", () => {
                const newValue = hiParam.value === 0 ? 1 : 0;
                hiParam.value = newValue;
                console.log(`hi state set to: ${newValue}`);
            });
        }

        // ------ drumt-Button Steuerung ------
        const drumtButton = document.getElementById("drumt");
        const drumtParam = device.parametersById.get("drumt");

        if (drumtButton && drumtParam) {
            drumtButton.addEventListener("click", () => {
                const newValue = drumtParam.value === 0 ? 1 : 0;
                drumtParam.value = newValue;
                console.log(`drumt state set to: ${newValue}`);
            });
        }


        // ------ kick PNG-Strip Steuerung ------
        const kickDiv = document.getElementById("kick");
        const kickParam = device.parametersById.get("kick");
        const kickContainer = document.getElementById("kick-container");

        if (kickDiv && kickParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === kickParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    kickDiv.style.backgroundPosition = `0 -${yOffset}`;
                    kickContainer.style.display = (frameIndex === 0) ? "none" : "block";
                    console.log(`Kick frame set to: ${frameIndex}`);
                }
            });
        }

        // ------ hat PNG-Strip Steuerung ------
        const hatDiv = document.getElementById("hat");
        const hatParam = device.parametersById.get("hat");
        const hatContainer = document.getElementById("hat-container");

        if (hatDiv && hatParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === hatParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    hatDiv.style.backgroundPosition = `0 -${yOffset}`;
                    hatContainer.style.display = (frameIndex === 0) ? "none" : "block";
                    console.log(`hat frame set to: ${frameIndex}`);
                }
            });
        }

        // ------ snr PNG-Strip Steuerung ------
        const snrDiv = document.getElementById("snr");
        const snrParam = device.parametersById.get("snr");
        const snrContainer = document.getElementById("snr-container");

        if (snrDiv && snrParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === snrParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    snrDiv.style.backgroundPosition = `0 -${yOffset}`;
                    snrContainer.style.display = (frameIndex === 0) ? "none" : "block";
                    console.log(`snr frame set to: ${frameIndex}`);
                }
            });
        }

        // ------ clap PNG-Strip Steuerung ------
        const clapDiv = document.getElementById("clap");
        const clapParam = device.parametersById.get("clap");
        const clapContainer = document.getElementById("clap-container");

        if (clapDiv && clapParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === clapParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    clapDiv.style.backgroundPosition = `0 -${yOffset}`;
                    clapContainer.style.display = (frameIndex === 0) ? "none" : "block";
                    console.log(`clap frame set to: ${frameIndex}`);
                }
            });
        }


        // ------ Slider Steuerung mit Drag-Funktion (c1 bis c5) ------
        for (let i = 1; i <= 5; i++) {
            const sliderDiv = document.getElementById(`c${i}-slider`);
            const sliderParam = device.parametersById.get(`c${i}`);

            if (sliderDiv && sliderParam) {
                const steps = sliderDiv.querySelectorAll(".step");

                // Setze initialen Zustand der Slider entsprechend der Parameterwerte
                updateSliderVisual(sliderDiv, Math.round(sliderParam.value));

                sliderDiv.addEventListener("mousedown", (event) => {
                    isDragging = true;
                    currentSliderIndex = i;
                    handleStepSelection(event, sliderDiv, steps, sliderParam);
                });

                sliderDiv.addEventListener("mousemove", (event) => {
                    if (isDragging && currentSliderIndex === i) {
                        handleStepSelection(event, sliderDiv, steps, sliderParam);
                    }
                });

                sliderDiv.addEventListener("mouseup", () => {
                    isDragging = false;
                    currentSliderIndex = -1;
                });

                sliderDiv.addEventListener("mouseleave", () => {
                    isDragging = false;
                    currentSliderIndex = -1;
                });

                device.parameterChangeEvent.subscribe((param) => {
                    if (param.id === sliderParam.id) {
                        const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-12
                        updateSliderVisual(sliderDiv, frameIndex);
                        console.log(`Slider c${i} frame set to: ${frameIndex}`);
                    }
                });
            }
        }

            function handleStepSelection(event, sliderDiv, steps, sliderParam) {
                const rect = sliderDiv.getBoundingClientRect();
                const y = event.clientY - rect.top;
                const stepHeight = rect.height / steps.length;
                const selectedIndex = Math.floor(y / stepHeight);

                if (selectedIndex >= 0 && selectedIndex < steps.length) {
                    sliderParam.value = selectedIndex;
                    updateSliderVisual(sliderDiv, selectedIndex);
                    console.log(`Slider ${sliderDiv.id} set to value: ${selectedIndex}`);
                }
            }

            function updateSliderVisual(sliderDiv, frameIndex) {
                const steps = sliderDiv.querySelectorAll(".step");
                steps.forEach((step, index) => {
                    step.style.backgroundColor = index === frameIndex ? "rgb(0, 255, 130)" : "transparent";
                });
            }

            setInitialParameterValues(device); // Initiale Werte setzen
    

        document.body.addEventListener("click", () => {
            if (context.state === "suspended") {
                context.resume().then(() => console.log("AudioContext aktiviert."));
            }
        });
    }


function setInitialParameterValues(device) {
    const initialValues = { c1: 4, c2: 5, c3: 5, c4: 5, c5: 6, slicont: 0 };
    Object.keys(initialValues).forEach((paramId) => {
        const param = device.parametersById.get(paramId);
        if (param) param.value = initialValues[paramId];
    });
}

function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://js.cdn.cycling74.com/rnbo/${encodeURIComponent(version)}/rnbo.min.js`;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load RNBO library version ${version}`));
        document.body.appendChild(script);
    });
}

setup();
