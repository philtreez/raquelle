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

        // Lade die RNBO-Library, falls noch nicht verfügbar
        if (!window.RNBO) {
            console.log("Lade RNBO-Bibliothek...");
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

        // Erstelle das RNBO-Device
        device = await RNBO.createDevice({ context, patcher });
        console.log("RNBO-Device erfolgreich erstellt.");

        device.node.connect(outputNode);
        console.log("RNBO-Device an Audio-Ausgang angeschlossen.");

        // Initiale Werte für die Parameter setzen
        setInitialParameterValues(device);

        // ------ Slider Steuerung (c1 bis c5) ------
        for (let i = 1; i <= 5; i++) {
            const sliderDiv = document.getElementById(`c${i}-slider`);
            const sliderParam = device.parametersById.get(`c${i}`);

            if (sliderDiv && sliderParam) {
                // Klick-Event für die Steps hinzufügen
                const steps = sliderDiv.querySelectorAll(".step");
                steps.forEach((step, index) => {
                    step.addEventListener("click", () => {
                        sliderParam.value = index; // Setze den RNBO-Parameter auf den Index des angeklickten Steps
                        updateSliderVisual(sliderDiv, index);
                        console.log(`Slider c${i} set to value: ${index}`);
                    });
                });

                // Event für RNBO-Parameteränderungen abonnieren
                device.parameterChangeEvent.subscribe((param) => {
                    if (param.id === sliderParam.id) {
                        const frameIndex = Math.round(param.value); // Rundet auf Integer-Werte 0-12
                        updateSliderVisual(sliderDiv, frameIndex);
                        console.log(`Slider c${i} frame set to: ${frameIndex}`);
                    }
                });
            }
        }

        function updateSliderVisual(sliderDiv, frameIndex) {
            const steps = sliderDiv.querySelectorAll(".step");
            steps.forEach((step, index) => {
                step.style.backgroundColor = index === frameIndex ? "rgb(0, 255, 130)" : "transparent";
            });
        }        

    } catch (error) {
        console.error("Fehler beim Laden oder Erstellen des RNBO-Devices:", error);
        return;
    }

    // Aktiviert AudioContext bei Benutzerinteraktion
    document.body.addEventListener("click", () => {
        if (context.state === "suspended") {
            context.resume().then(() => console.log("AudioContext aktiviert."));
        }
    });

    console.log(`AudioContext state: ${context.state}`);
}

// Funktion zum Setzen initialer Werte für RNBO-Parameter
function setInitialParameterValues(device) {
    const paramsToInitialize = ["c1", "c2", "c3", "c4", "c5"];
    paramsToInitialize.forEach((paramId) => {
        const param = device.parametersById.get(paramId);
        if (param) param.value = 0;
    });
}

// Funktion zum Laden der RNBO-Library
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
