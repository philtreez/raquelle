// ------ RNBO integration ------
async function setup() {
    console.log("Setup gestartet...");

    const patchExportURL = "https://raquelle-philtreezs-projects.vercel.app/export/patch.export.json"; 
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

        // Setup-Funktionen aufrufen
        setupButtons(device, 'b'); 
        setupButtons(device, 'e'); 
        setupButtons(device, 'q'); 
        setupButtons(device, 'r'); 
        setupButtons(device, 't'); 


        setupSliders(device); // WICHTIG! Sliders aufrufen
        setupOscilloscope(context, device, outputNode);

        setInitialParameterValues(device); 

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

// ------ Button Steuerung ------
function setupButtons(device, prefix) {
    for (let i = 1; i <= 16; i++) {
        const buttonId = `${prefix}${i}`;
        const buttonDiv = document.getElementById(buttonId);
        const buttonParam = device.parametersById.get(buttonId);

        if (buttonDiv && buttonParam) {
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
}

function updateButtonVisual(buttonDiv, value) {
    buttonDiv.style.backgroundColor = value === 1 ? "rgb(0, 255, 130)" : "transparent";
}

// ------ Slider Steuerung ------
async function setupSliders(device) {
    const sliderIds = ['sli', 'sli2', 'sli3', 'sli4', 'sli5', 'sli10', 'sli11', 'sli12', 'sli13', 'sli14', 'sli15', 'sli16', 'sli17', 'sli18', 'sli19', 'sli20', 'sli21', 'sli22', 'sli23', 'sli24', 'sli25', 'sli26', 'sli27', 'sli28', 'sli29', 'sli30', 'sli31', 'sli32', 'sli33', 'sli34', 'sli35', 'sli36', 'sli37', 'sli38'];
    const sliderHeight = 120;
    const knobHeight = 18.84;

    sliderIds.forEach((sliderId) => {
        const sliderParam = device.parametersById.get(sliderId);
        const sliderSvg = document.getElementById(`${sliderId}-slider`);
        const sliderKnob = sliderSvg ? sliderSvg.querySelector('#Ebene_2 rect') : null;

        if (sliderParam && sliderSvg && sliderKnob) {
            updateSliderVisual(sliderKnob, sliderParam.value);

            let isDragging = false;
            sliderSvg.addEventListener('mousedown', (event) => {
                isDragging = true;
                handleSliderMove(event, sliderKnob, sliderParam);
            });

            window.addEventListener('mousemove', (event) => {
                if (isDragging) {
                    handleSliderMove(event, sliderKnob, sliderParam);
                }
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
            });

            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === sliderParam.id) {
                    updateSliderVisual(sliderKnob, param.value);
                    console.log(`${sliderId} updated to: ${param.value}`);
                }
            });
        }
    });

    function handleSliderMove(event, sliderKnob, sliderParam) {
        const rect = sliderKnob.closest('svg').getBoundingClientRect();
        const y = event.clientY - rect.top;
        let value = 1 - y / sliderHeight;
        value = Math.max(0, Math.min(1, value));

        sliderParam.value = value;
        updateSliderVisual(sliderKnob, value);
        console.log(`Slider set to value: ${value}`);
    }

    function updateSliderVisual(sliderKnob, value) {
        const knobY = (1 - value) * (sliderHeight - knobHeight);
        sliderKnob.setAttribute('y', knobY);
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

            // ------ Intro2 PNG-Strip Steuerung ------
            const intro2Div = document.getElementById("intro2");
            const intro2Param = device.parametersById.get("intro2");
            const intro2Container = document.getElementById("intro2-container");
    
            if (intro2Div && intro2Param) {
                device.parameterChangeEvent.subscribe((param) => {
                    if (param.id === intro2Param.id) {
                        const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                        const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                        intro2Div.style.backgroundPosition = `0 -${yOffset}`;
                        intro2Container.style.display = (frameIndex === 0) ? "none" : "block";
                        console.log(`Intro2 frame set to: ${frameIndex}`);
                    }
                });
            }

                    // ------ lu-Visualisierung ------
        const maxLu = 16; // Anzahl der Lichter (1-16)
        const luClassPrefix = "lu"; // Klassenname-Präfix

        const luParam = device.parametersById.get("lu");

        if (luParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === luParam.id) {
                    const luValue = Math.round(param.value); // Wert zwischen 1 und 16
                    updateLuVisual(luValue);
                    console.log(`Lu visual set to: ${luValue}`);
                }
            });
        }

        function updateLuVisual(activeLu) {
            for (let i = 1; i <= maxLu; i++) {
                const luElement = document.querySelector(`.${luClassPrefix}${i}`);
                if (luElement) {
                    // Sichtbarkeit steuern: nur das aktive Licht sichtbar machen
                    luElement.style.visibility = i === activeLu ? "visible" : "hidden";
                }
            }
        }

        // ------ lo-Visualisierung ------
        const maxLo = 16; // Anzahl der Lichter (1-16)
        const loClassPrefix = "lo"; // Klassenname-Präfix

        const loParam = device.parametersById.get("lo");

        if (loParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === loParam.id) {
                    const loValue = Math.round(param.value); // Wert zwischen 1 und 16
                    updateLoVisual(loValue);
                    console.log(`Lo visual set to: ${loValue}`);
                }
            });
        }

        function updateLoVisual(activeLo) {
            for (let i = 1; i <= maxLo; i++) {
                const loElement = document.querySelector(`.${loClassPrefix}${i}`);
                if (loElement) {
                    // Sichtbarkeit steuern: nur das aktive Licht sichtbar machen
                    loElement.style.visibility = i === activeLo ? "visible" : "hidden";
                }
            }
        }

        // ------ Li-Visualisierung ------
        const maxLi = 16; // Anzahl der Lichter (1-16)
        const liClassPrefix = "li"; // Klassenname-Präfix

        const liParam = device.parametersById.get("li");

        if (liParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === liParam.id) {
                    const liValue = Math.round(param.value); // Wert zwischen 1 und 16
                    updateLiVisual(liValue);
                    console.log(`Li visual set to: ${liValue}`);
                }
            });
        }

        function updateLiVisual(activeLi) {
            for (let i = 1; i <= maxLi; i++) {
                const liElement = document.querySelector(`.${liClassPrefix}${i}`);
                if (liElement) {
                    // Sichtbarkeit steuern: nur das aktive Licht sichtbar machen
                    liElement.style.visibility = i === activeLi ? "visible" : "hidden";
                }
            }
        }


        // ------ spiel-Button Steuerung ------
        const spielButton = document.getElementById("spiel");
        const spielParam = device.parametersById.get("spiel");

        if (spielButton && spielParam) {
            spielButton.addEventListener("click", () => {
                const newValue = spielParam.value === 0 ? 1 : 0;
                spielParam.value = newValue;
                console.log(`spiel state set to: ${newValue}`);
            });
        }

        // ------ tel-Button Steuerung ------
        const telButton = document.getElementById("tel");
        const telParam = device.parametersById.get("tel");

        if (telButton && telParam) {
            telButton.addEventListener("click", () => {
                const newValue = telParam.value === 0 ? 1 : 0;
                telParam.value = newValue;
                console.log(`tel state set to: ${newValue}`);
            });
        }

        // ------ seqon-Button Steuerung ------
        const seqonButton = document.getElementById("seqon");
        const seqonParam = device.parametersById.get("seqon");

        if (seqonButton && seqonParam) {
            seqonButton.addEventListener("click", () => {
                const newValue = seqonParam.value === 0 ? 1 : 0;
                seqonParam.value = newValue;
                console.log(`seqon state set to: ${newValue}`);
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

        // ------ trump-Button Steuerung ------
        const trumpButton = document.getElementById("trump");
        const trumpParam = device.parametersById.get("trump");

        if (trumpButton && trumpParam) {
            trumpButton.addEventListener("click", () => {
                const newValue = trumpParam.value === 0 ? 1 : 0;
                trumpParam.value = newValue;
                console.log(`trump state set to: ${newValue}`);
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

        // ------ rndmb-Button Steuerung ------
        const rndmbButton = document.getElementById("rndmb");
        const rndmbParam = device.parametersById.get("rndmb");

        if (rndmbButton && rndmbParam) {
            rndmbButton.addEventListener("click", () => {
                const newValue = rndmbParam.value === 0 ? 1 : 0;
                rndmbParam.value = newValue;
                console.log(`rndmb state set to: ${newValue}`);
            });
        }


        // ------ kick PNG-Strip Steuerung ------
        const kickDiv = document.getElementById("kick");
        const kickParam = device.parametersById.get("kick");

        if (kickDiv && kickParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === kickParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    kickDiv.style.backgroundPosition = `0 -${yOffset}`;
                    console.log(`Kick frame set to: ${frameIndex}`);
                }
            });
        }

        // GIF-Container-Steuerung basierend auf RNBO-Parameter

        function setupGifControl(device) {
            if (!device || !device.node) {
                console.error("RNBO device nicht initialisiert");
                return;
            }

            const gifParam = device.parametersById.get("gifControl"); // Parameter-Name in RNBO
            if (!gifParam) {
                console.error("RNBO-Parameter 'gifControl' nicht gefunden");
                return;
            }

            function updateGifVisibility(value) {
                for (let i = 0; i < 4; i++) {
                    const gif = document.querySelector(`.gif${i}`);
                    if (gif) {
                        gif.style.visibility = i === value ? "visible" : "hidden";
                    }
                }
            }

            // Initial setzen
            updateGifVisibility(Math.round(gifParam.value));
            
            // Listener für RNBO-Parameteränderung
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === gifParam.id) {
                    updateGifVisibility(Math.round(param.value));
                }
            });
        }

        // Direktes Aufrufen, ohne .then()
        if (typeof device !== "undefined" && device) {
            setupGifControl(device);
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

        // ------ snare PNG-Strip Steuerung ------
        const snareDiv = document.getElementById("snare");
        const snareParam = device.parametersById.get("snare");
        const snareContainer = document.getElementById("snare-container");

        if (snareDiv && snareParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === snareParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 340}px`; // Berechnet die Y-Position des aktuellen Frames
                    snareDiv.style.backgroundPosition = `0 -${yOffset}`;
                    snareContainer.style.display = (frameIndex === 0) ? "none" : "block";
                    console.log(`snare frame set to: ${frameIndex}`);
                }
            });
        }


        // ------ vowy PNG-Strip Steuerung ------
        const vowyDiv = document.getElementById("vowy");
        const vowyParam = device.parametersById.get("vowy");

        if (vowyDiv && vowyParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === vowyParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 500}px`; // Berechnet die Y-Position des aktuellen Frames
                    vowyDiv.style.backgroundPosition = `0 -${yOffset}`;
                    console.log(`vowy frame set to: ${frameIndex}`);
                }
            });
        }

        // ------ inti PNG-Strip Steuerung ------
        const intiDiv = document.getElementById("inti");
        const intiParam = device.parametersById.get("inti");

        if (intiDiv && intiParam) {
            device.parameterChangeEvent.subscribe((param) => {
                if (param.id === intiParam.id) {
                    const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-23
                    const yOffset = `${frameIndex * 400}px`; // Berechnet die Y-Position des aktuellen Frames
                    intiDiv.style.backgroundPosition = `0 -${yOffset}`;
                    console.log(`inti frame set to: ${frameIndex}`);
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

            setInitialParameterValues(device); // Initiale Werte setzen
    

        document.body.addEventListener("click", () => {
            if (context.state === "suspended") {
                context.resume().then(() => console.log("AudioContext aktiviert."));
            }
        });
    }


// ------ Hilfsfunktionen ------
function setInitialParameterValues(device) {
    const initialValues = { sli37: 1, b1: 1, b7: 1, r5: 1, r13: 1, sli26: 0.9, hi: 1 };
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

// Starte das Setup
setup();
